import React, { useEffect, useRef, useCallback } from 'react';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import { MotionValue } from 'motion/react';

interface StandaloneSplatViewerProps {
    url: string;
    className?: string;
    headX?: MotionValue<number>;
    headY?: MotionValue<number>;
    smoothingEnabled?: boolean;
    onCameraUpdate?: (cam: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) => void;
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
    smoothingEnabled = false,
    onCameraUpdate,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    // User-verified camera defaults for head tracking base position
    const baseCameraRef = useRef({ x: 0.46, y: 0.40, z: 0.35 });
    const baseTargetRef = useRef({ x: 0.76, y: 0.58, z: -0.29 });

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
            'cameraUp': [0, -1, 0], // Flip camera up vector to fix upside-down model
            'initialCameraPosition': [0.46, 0.40, 0.35],
            'initialCameraLookAt': [0.76, 0.58, -0.29],
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

                // Store initial camera position as base for head tracking
                if (viewer.camera) {
                    baseCameraRef.current = {
                        x: viewer.camera.position.x,
                        y: viewer.camera.position.y,
                        z: viewer.camera.position.z,
                    };
                }
                if (viewer.controls?.target) {
                    baseTargetRef.current = {
                        x: viewer.controls.target.x,
                        y: viewer.controls.target.y,
                        z: viewer.controls.target.z,
                    };
                }
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
    }, [url]);

    // Head tracking effect - apply head position to camera
    useEffect(() => {
        if (!headX || !headY) return;

        const parallaxStrength = 0.3; // Movement range
        let animationId: number;

        const updateCamera = () => {
            const viewer = viewerRef.current;
            if (!viewer || !viewer.camera) {
                animationId = requestAnimationFrame(updateCamera);
                return;
            }

            // Get head position
            const hx = headX.get();
            const hy = headY.get();

            // Apply parallax offset to camera and target
            const offsetX = hx * parallaxStrength;
            const offsetY = hy * parallaxStrength;

            viewer.camera.position.x = baseCameraRef.current.x + offsetX;
            viewer.camera.position.y = baseCameraRef.current.y + offsetY;

            if (viewer.controls?.target) {
                viewer.controls.target.x = baseTargetRef.current.x + offsetX;
                viewer.controls.target.y = baseTargetRef.current.y + offsetY;
            }

            // Report camera position for UI display
            if (onCameraUpdate && viewer.camera) {
                const p = viewer.camera.position;
                const t = viewer.controls?.target || { x: 0, y: 0, z: 0 };
                onCameraUpdate(
                    { x: p.x, y: p.y, z: p.z },
                    { x: t.x, y: t.y, z: t.z }
                );
            }

            animationId = requestAnimationFrame(updateCamera);
        };

        animationId = requestAnimationFrame(updateCamera);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [headX, headY, onCameraUpdate]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
            }}
        />
    );
};
