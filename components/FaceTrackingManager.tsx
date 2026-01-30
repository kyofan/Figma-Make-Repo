import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    FilesetResolver,
    FaceLandmarker,
    DrawingUtils
} from "@mediapipe/tasks-vision";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, User, ScanFace } from "lucide-react";

interface FaceTrackingManagerProps {
    onHeadMove?: (position: { x: number; y: number; z: number }) => void;
    onEyeGaze?: (gaze: { x: number; y: number }) => void;
}

export const FaceTrackingManager: React.FC<FaceTrackingManagerProps> = ({
    onHeadMove,
    onEyeGaze
}) => {
    // Tracking refs (hidden)
    const videoRef = useRef<HTMLVideoElement>(null);
    const requestRef = useRef<number>();
    const streamRef = useRef<MediaStream | null>(null);

    // Debug View refs (visible)
    const debugVideoRef = useRef<HTMLVideoElement>(null);
    const debugCanvasRef = useRef<HTMLCanvasElement>(null);

    const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false); // Hidden by default
    const [isTracking, setIsTracking] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

    // Request Camera Access
    const startCamera = async () => {
        if (!videoRef.current) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 1280,
                    height: 720,
                    facingMode: "user"
                },
                audio: false
            });

            streamRef.current = stream;
            videoRef.current.srcObject = stream;

            videoRef.current.oncanplay = () => {
                videoRef.current?.play().then(() => {
                    setIsCameraActive(true);
                    setCameraError(null);
                }).catch(e => console.error("Play error:", e));
            };
        } catch (err) {
            console.error("Error accessing camera:", err);
            setCameraError("Camera permission denied.");
        }
    };

    useEffect(() => {
        if (faceLandmarker && !isCameraActive) {
            startCamera();
        }

        // Cleanup stream on unmount
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [faceLandmarker]);

    // Sync stream to debug video
    useEffect(() => {
        if (showCamera && isCameraActive && videoRef.current && debugVideoRef.current) {
            // Check if stream is already assigned to avoid flickering
            if (debugVideoRef.current.srcObject !== videoRef.current.srcObject) {
                debugVideoRef.current.srcObject = videoRef.current.srcObject;
                debugVideoRef.current.oncanplay = () => {
                    debugVideoRef.current?.play().catch(e => console.error("Debug play error:", e));
                };
            }
        }
    }, [showCamera, isCameraActive]);

    const predict = useCallback(() => {
        if (!faceLandmarker || !videoRef.current) return;

        if (!isTracking) {
            requestRef.current = requestAnimationFrame(predict);
            return;
        }

        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            requestRef.current = requestAnimationFrame(predict);
            return;
        }

        // Use the hidden video element for detection
        const startTimeMs = performance.now();
        const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);

        // 1. Head Position (Parallax) & Eye Gaze
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            const noseTip = landmarks[1];

            const rawX = noseTip.x;
            const rawY = noseTip.y;
            const rawZ = noseTip.z;

            const x = (rawX - 0.5) * 2; // -1 to 1
            const y = (rawY - 0.5) * 2; // -1 to 1

            if (onHeadMove) {
                onHeadMove({ x, y, z: rawZ });
            }

            // Eye Tracking (Simple Gaze based on Iris center)
            if (onEyeGaze) {
                 if (landmarks.length > 473) {
                     const leftIris = landmarks[468];
                     const rightIris = landmarks[473];

                     // Average
                     const irisX = (leftIris.x + rightIris.x) / 2;
                     const irisY = (leftIris.y + rightIris.y) / 2;

                     const gazeX = (irisX - 0.5) * 2;
                     const gazeY = (irisY - 0.5) * 2;

                     onEyeGaze({ x: gazeX, y: gazeY });
                 }
            }
        }

        // 2. Debug Drawing
        if (showCamera && debugCanvasRef.current && debugVideoRef.current) {
             const canvasCtx = debugCanvasRef.current.getContext("2d");
             if (canvasCtx) {
                 // Match dimensions
                 if (debugCanvasRef.current.width !== debugVideoRef.current.videoWidth) {
                    debugCanvasRef.current.width = debugVideoRef.current.videoWidth;
                    debugCanvasRef.current.height = debugVideoRef.current.videoHeight;
                }

                 canvasCtx.save();
                 canvasCtx.clearRect(0, 0, debugCanvasRef.current.width, debugCanvasRef.current.height);

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
    }, [faceLandmarker, isTracking, showCamera, onHeadMove, onEyeGaze]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(predict);
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [predict]);

    return (
        <motion.div
            className="fixed bottom-20 right-4 z-[100] flex flex-col items-end gap-2 pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
             {/* Toggle Button for Face Settings */}
             <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg hover:bg-white/20 transition-all"
                title="Face Tracking Settings"
            >
                <ScanFace size={20} />
            </button>

            <AnimatePresence>
                {isSettingsOpen && (
                     <motion.div
                        className="mb-2 p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white w-64 shadow-2xl"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    >
                        <h3 className="text-sm font-semibold mb-4 text-white/80 uppercase tracking-wider">Face Tracking</h3>

                         {/* Toggle Tracking */}
                         <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-light flex items-center gap-2">
                                <User size={14} /> Tracking
                            </span>
                            <button
                                onClick={() => setIsTracking(!isTracking)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors ${isTracking ? "bg-blue-500" : "bg-white/20"}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isTracking ? "translate-x-4" : ""}`} />
                            </button>
                        </div>

                         {/* Show Camera */}
                         <div className="flex items-center justify-between">
                            <span className="text-sm font-light flex items-center gap-2">
                                {showCamera ? <Eye size={14} /> : <EyeOff size={14} />} Debug View
                            </span>
                            <button
                                onClick={() => setShowCamera(!showCamera)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors ${showCamera ? "bg-blue-500" : "bg-white/20"}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showCamera ? "translate-x-4" : ""}`} />
                            </button>
                        </div>

                        {cameraError && (
                            <div className="mt-4 p-2 bg-red-500/20 text-red-200 text-xs rounded">
                                {cameraError}
                            </div>
                        )}

                    </motion.div>
                )}
            </AnimatePresence>

             {/* Debug Video Feed */}
             <div className="relative">
                 <AnimatePresence>
                    {showCamera && (
                        <motion.div
                            className="relative rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black/50 backdrop-blur-sm"
                            initial={{ opacity: 0, height: 0, scale: 0.8 }}
                            animate={{ opacity: 1, height: "auto", scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.8 }}
                        >
                             <div className="relative w-64 h-48">
                                <video
                                    ref={debugVideoRef}
                                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                                    autoPlay
                                    playsInline
                                    muted
                                />
                                <canvas
                                    ref={debugCanvasRef}
                                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Always render hidden tracking video to maintain stream and detection */}
                <div className="fixed opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline muted />
                </div>
             </div>
        </motion.div>
    );
};
