import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    FilesetResolver,
    FaceLandmarker,
    DrawingUtils
} from "@mediapipe/tasks-vision";
import { motion, AnimatePresence } from "motion/react";
import { useCamera } from "./CameraProvider";

interface FaceTrackingManagerProps {
    onHeadMove?: (position: { x: number; y: number; z: number }) => void;
    onEyeGaze?: (gaze: { x: number; y: number }) => void;
    // Settings Props supplied from parent
    isTracking: boolean;
    showDebugView: boolean;
}

export const FaceTrackingManager: React.FC<FaceTrackingManagerProps> = ({
    onHeadMove,
    onEyeGaze,
    isTracking,
    showDebugView
}) => {
    // Shared Camera
    const { videoRef, isVideoReady, isLoading, error } = useCamera();

    const requestRef = useRef<number>();

    // Debug View refs (visible)
    const debugCanvasRef = useRef<HTMLCanvasElement>(null);

    const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);

    // Initialize FaceLandmarker
    useEffect(() => {
        const initLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );

                const landmarker = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "/models/face_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numFaces: 1,
                    minFaceDetectionConfidence: 0.5,
                    minFacePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                    outputFaceBlendshapes: true
                });

                setFaceLandmarker(landmarker);
                console.log("FaceLandmarker initialized");
            } catch (error) {
                console.error("Error initializing FaceLandmarker:", error);
            }
        };

        initLandmarker();

        return () => {
            if (faceLandmarker) {
                faceLandmarker.close();
            }
        };
    }, []);


    const predict = useCallback(() => {
        if (!faceLandmarker || !videoRef.current || !isVideoReady || isLoading) {
            requestRef.current = requestAnimationFrame(predict);
            return;
        }

        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            requestRef.current = requestAnimationFrame(predict);
            return;
        }

        // Ensure debug canvas size matches video
        if (showDebugView && debugCanvasRef.current) {
             if (debugCanvasRef.current.width !== videoRef.current.videoWidth) {
                 debugCanvasRef.current.width = videoRef.current.videoWidth;
                 debugCanvasRef.current.height = videoRef.current.videoHeight;
             }
        }

        if (!isTracking) {
             // If debugging but not tracking, just show video?
             if (showDebugView && debugCanvasRef.current) {
                const ctx = debugCanvasRef.current.getContext("2d");
                if (ctx) {
                    ctx.save();
                    ctx.scale(-1, 1);
                    ctx.translate(-debugCanvasRef.current.width, 0);
                    ctx.drawImage(videoRef.current, 0, 0, debugCanvasRef.current.width, debugCanvasRef.current.height);
                    ctx.restore();
                }
             }

            requestRef.current = requestAnimationFrame(predict);
            return;
        }

        const startTimeMs = performance.now();
        const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);

        // 1. Logic (Head & Eye)
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            const noseTip = landmarks[1];
            const leftCheek = landmarks[234];
            const rightCheek = landmarks[454];
            const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
            const x = (noseTip.x - 0.5) * 2;
            const y = (noseTip.y - 0.5) * 2;
            const zFromFaceWidth = (faceWidth - 0.25) * 4.0;

            if (onHeadMove) {
                onHeadMove({ x, y, z: zFromFaceWidth });
            }

            if (onEyeGaze) {
                if (landmarks.length > 473) {
                    const leftIris = landmarks[468];
                    const rightIris = landmarks[473];
                    const irisX = (leftIris.x + rightIris.x) / 2;
                    const irisY = (leftIris.y + rightIris.y) / 2;
                    const gazeX = (irisX - 0.5) * 2;
                    const gazeY = (irisY - 0.5) * 2;
                    const sensitivity = 2.5;
                    const screenX = (window.innerWidth / 2) - (gazeX * (window.innerWidth / 2) * sensitivity);
                    const screenY = (window.innerHeight / 2) + (gazeY * (window.innerHeight / 2) * sensitivity);

                    onEyeGaze({ x: screenX, y: screenY });
                }
            }
        }

        // 2. Debug Drawing
        if (showDebugView && debugCanvasRef.current) {
            const canvasCtx = debugCanvasRef.current.getContext("2d");
            if (canvasCtx) {
                canvasCtx.save();

                // Draw Video Frame (Mirrored)
                canvasCtx.scale(-1, 1);
                canvasCtx.translate(-debugCanvasRef.current.width, 0);
                canvasCtx.drawImage(videoRef.current, 0, 0, debugCanvasRef.current.width, debugCanvasRef.current.height);

                // Draw Landmarks (Already normalized, usually need flipping if we flipped video?
                // MediaPipe drawing utils work on the canvas context.
                // If we flipped the context, drawing utils will draw flipped.
                // This is correct because landmarks match the original image.

                if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                    const landmarks = results.faceLandmarks[0];
                    const drawingUtils = new DrawingUtils(canvasCtx);
                    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
                        color: "#C0C0C070",
                        lineWidth: 1
                    });
                    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
                        color: "#FF3030",
                        lineWidth: 1
                    });
                    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
                        color: "#30FF30",
                        lineWidth: 1
                    });
                }
                canvasCtx.restore();
            }
        }

        requestRef.current = requestAnimationFrame(predict);
    }, [faceLandmarker, isVideoReady, isTracking, showDebugView, onHeadMove, onEyeGaze]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(predict);
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [predict]);

    return (
        <div className="pointer-events-none">
            {/* Debug Video Feed (Visible if enabled) */}
            <AnimatePresence>
                {showDebugView && (
                    <motion.div
                        className="fixed bottom-36 right-4 z-[90] rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black/50 backdrop-blur-sm pointer-events-auto"
                        initial={{ opacity: 0, height: 0, scale: 0.8 }}
                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.8 }}
                    >
                        <div className="relative w-64 h-48">
                            <canvas
                                ref={debugCanvasRef}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {error && (
                <div className="fixed top-0 left-0 w-full p-2 bg-red-500/20 text-red-200 text-xs text-center z-[200]">
                    Face Tracking Error: {error}
                </div>
            )}
        </div>
    );
};
