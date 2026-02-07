import React, { useEffect, useRef, useCallback } from 'react';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import { MotionValue } from 'motion/react';

interface StandaloneSplatViewerProps {
    url: string;
    className?: string;
    headX?: MotionValue<number>;
    headY?: MotionValue<number>;
    headZ?: MotionValue<number>;
    smoothingEnabled?: boolean;
    onCameraUpdate?: (cam: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) => void;
    debugCameraControls?: boolean;
}

/**
 * Standalone Gaussian Splat Viewer with Head Tracking Support.
 * 
 * Uses the EXACT same approach as the working splat-test.html Safe Mode.
 * Creates its own canvas and render loop - does NOT integrate with R3F.
 */
export const StandaloneSplatViewer: React.FC<StandaloneSplatViewerProps> = ({
    url,
    className = '',
    headX,
    headY,
    headZ,
    smoothingEnabled = false,
    onCameraUpdate,
    debugCameraControls = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    // User-verified camera defaults for head tracking base position
    const baseCameraRef = useRef({ x: 0.72, y: 0.31, z: 0.05 });
    const baseTargetRef = useRef({ x: 1.61, y: 1.02, z: -2.87 });

    // Debug state for current Z tracking value
    const [currentHeadZ, setCurrentHeadZ] = React.useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clear any previous viewer
        if (viewerRef.current) {
            viewerRef.current.dispose();
            viewerRef.current = null;
        }

        console.log('[StandaloneSplatViewer] Initializing with Safe Mode...');

        // EXACT settings from working splat-test.html Safe Mode
        const viewer = new GaussianSplats3D.Viewer({
            // Camera - user verified coordinates, flipped to fix upside-down
            'cameraUp': [0, -1, 0],
            'useBuiltInControls': debugCameraControls, // Flip camera up vector to fix upside-down model
            // Start at Calibration Target z=0.05 directly
            'initialCameraPosition': [0.72, 0.31, 0.05],
            'initialCameraLookAt': [1.61, 1.02, -2.87],
            // Safe Mode settings - CRITICAL for localhost without COOP/COEP
            'useWorker': false,
            'gpuAcceleratedSort': false,
            'sharedMemoryForWorkers': false,
            // Mount to our container
            'rootElement': containerRef.current,
        });

        viewerRef.current = viewer;

        // Load the splat file
        viewer.addSplatScene(url, {
            'splatAlphaRemovalThreshold': 1, // Matches Safe Mode
            'showLoadingUI': true,
        })
            .then(() => {
                console.log('[StandaloneSplatViewer] Loaded successfully!');
                viewer.start();

                // Force camera to our calculated initial position just in case
                // But DO NOT overwrite baseCameraRef - we need that to stay fixed at 0.02
            })
            .catch((err: any) => {
                console.error('[StandaloneSplatViewer] Load failed:', err);
            });

        // Cleanup on unmount
        return () => {
            console.log('[StandaloneSplatViewer] Disposing...');
            if (viewerRef.current) {
                viewerRef.current.dispose();
                viewerRef.current = null;
            }
        };
    }, [url, debugCameraControls]);

    // Head tracking effect - apply head position to camera
    // VisionOS-like "window into virtual world" approach
    // Face position = Camera position (1:1 mapping)
    useEffect(() => {
        if (!headX || !headY) return;

        // Base response scales
        const XY_RESPONSE_BASE = 0.6;  // Reduced: less aggressive left/right
        const DEPTH_SCALE = 1.5;       // Increased: more responsive Z-axis

        let animationId: number;

        const updateCamera = () => {
            const viewer = viewerRef.current;
            if (!viewer || !viewer.camera) {
                animationId = requestAnimationFrame(updateCamera);
                return;
            }

            // Get head position (X, Y, Z) - already normalized -1 to 1
            const hx = headX.get();
            const hy = headY.get();
            const hz = headZ?.get() || 0;  // From face width: positive = closer

            // Distance-aware X/Y response:
            // When closer (hz > 0), reduce X/Y effect (you're "inside" the scene)
            // When further (hz < 0), increase X/Y effect (normal window parallax)
            // Range: 0.3 (very close) to 1.0 (normal distance)
            const distanceFactor = Math.max(0.3, 1.0 - hz * 0.5);
            const xyResponse = XY_RESPONSE_BASE * distanceFactor;

            // 1:1 Head-Coupled Perspective
            // Camera follows head position, target stays FIXED at base
            // This creates the "window into virtual world" parallax effect

            // Calculate target camera position
            const targetX = baseCameraRef.current.x + hx * xyResponse;
            const targetY = baseCameraRef.current.y + hy * xyResponse; // Fixed: Sign flipped physically match head movement

            // Absolute Z calibration: Force 0.05 when HeadZ is -0.366
            // Ignore baseCameraRef.z because viewer seems to overwrite it
            const CALIBRATED_CAM_Z = 0.05;
            const CALIBRATED_HEAD_Z = -0.366;
            // Diff from calibration point
            const headZDiff = hz - CALIBRATED_HEAD_Z;
            // Apply scale (negative because closer head (positive diff) means closer camera (negative Z change))
            const targetZ = CALIBRATED_CAM_Z - headZDiff * DEPTH_SCALE;

            // SMART SMOOTHING (Adaptive Lerp)
            // Calculate distance between current camera and target
            const dx = targetX - viewer.camera.position.x;
            const dy = targetY - viewer.camera.position.y;
            const dz = targetZ - viewer.camera.position.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            // If movement is large, be fast (0.6). If small (jitter), be smooth (0.1).
            // Thresholds: jitter usually < 0.0001 distance. Head move > 0.01.
            // Interpolate lerp factor based on distance
            const lerpFactor = Math.min(0.6, Math.max(0.1, distSq * 50.0));

            // Smooth interpolation - higher lerp = lower latency
            viewer.camera.position.x += (targetX - viewer.camera.position.x) * lerpFactor;
            viewer.camera.position.y += (targetY - viewer.camera.position.y) * lerpFactor;
            // Z-axis uses slightly higher lerp (max 1.0) for instant depth
            viewer.camera.position.z += (targetZ - viewer.camera.position.z) * Math.min(1.0, lerpFactor * 1.5);

            // KEY DIFFERENCE: Target stays FIXED at base position
            // This is what creates the parallax "window" effect
            // When you move left, scene shifts right (like peering through a window)

            // Report camera position for UI display
            if (onCameraUpdate && viewer.camera) {
                const p = viewer.camera.position;
                const t = viewer.controls?.target || { x: 0, y: 0, z: 0 };
                onCameraUpdate(
                    { x: p.x, y: p.y, z: p.z },
                    { x: t.x, y: t.y, z: t.z }
                );
            }

            // Update debug Z state (throttled visually, but here we just set it)
            // In a real app we'd throttle this, but for debug it's fine
            setCurrentHeadZ(hz);

            animationId = requestAnimationFrame(updateCamera);
        };

        animationId = requestAnimationFrame(updateCamera);

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [headX, headY, onCameraUpdate,
    currentHeadZ]);



    return (
        <div ref={containerRef} className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>

        </div>
    );
};
