import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    FilesetResolver,
    HandLandmarker,
    DrawingUtils,
    HandLandmarkerResult,
    NormalizedLandmark
} from "@mediapipe/tasks-vision";
import { motion, AnimatePresence } from "motion/react";
import { Settings, Eye, EyeOff, Hand, MousePointer2, Monitor, Check } from "lucide-react";

// Types
interface HandTrackingManagerProps {
    onHandActiveChange?: (isActive: boolean) => void;
}

export const HandTrackingManager: React.FC<HandTrackingManagerProps> = ({
    onHandActiveChange
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();

    const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Cursor State
    const [cursorPosition, setCursorPosition] = useState<{ x: number, y: number } | null>(null);
    const [isPinching, setIsPinching] = useState(false);

    // Settings
    const [showCamera, setShowCamera] = useState(true);
    const [isTracking, setIsTracking] = useState(true);
    const [targetHand, setTargetHand] = useState<"Right" | "Left">("Left");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Smoothing refs
    const cursorRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const smoothingFactor = 0.2;

    // Interaction State Refs
    const pinchStateRef = useRef({
        isPinching: false,
        startTime: 0,
        isHolding: false
    });
    const lastHoveredElement = useRef<Element | null>(null);

    // Sync prop
    useEffect(() => {
        if (onHandActiveChange) {
            onHandActiveChange(isTracking);
        }
    }, [isTracking, onHandActiveChange]);

    // Initialize HandLandmarker
    useEffect(() => {
        const initLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );

                const landmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "/models/hand_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 2, // Track both to filter efficiently
                    minHandDetectionConfidence: 0.5,
                    minHandPresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

<<<<<<< Updated upstream
        setHandLandmarker(landmarker);
        console.log("HandLandmarker initialized");
      } catch (error) {
        console.error("Error initializing HandLandmarker:", error);
      }
    };

    initLandmarker();

    return () => {
       if (handLandmarker) {
           handLandmarker.close();
       }
    };
  }, []);

  // Initialize Camera
  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
        console.log("Requesting camera access...");
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 1280,
                height: 720,
                facingMode: "user"
            }
        });

        console.log("Camera access granted, setting stream...");
        videoRef.current.srcObject = stream;

        // Explicitly play and handle promise
        videoRef.current.oncanplay = () => {
            console.log("Video can play, starting playback...");
            videoRef.current?.play().then(() => {
                console.log("Video playing successfully");
                setIsCameraActive(true);
                setCameraError(null);
            }).catch(e => {
                console.error("Error playing video:", e);
                setCameraError("Error starting video stream.");
            });
        };

    } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraError("Camera permission denied.");
    }
  };
=======
                setHandLandmarker(landmarker);
                console.log("HandLandmarker initialized");
            } catch (error) {
                console.error("Error initializing HandLandmarker:", error);
            }
        };
>>>>>>> Stashed changes

        initLandmarker();

        return () => {
            if (handLandmarker) {
                handLandmarker.close();
            }
        };
    }, []);

    // Standalone media request function for portability
    const requestMediaAccess = async () => {
        try {
            return await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 1280,
                    height: 720,
                    facingMode: "user"
                },
                audio: true // Request microphone access
            });
        } catch (err) {
            throw err;
        }
    };

    // Initialize Camera
    const startCamera = async () => {
        if (!videoRef.current) return;

        try {
            const stream = await requestMediaAccess();

            videoRef.current.srcObject = stream;
            videoRef.current.onloadeddata = () => {
                setIsCameraActive(true);
                setCameraError(null);
            };
        } catch (err) {
            console.error("Error accessing camera/microphone:", err);
            setCameraError("Camera or Microphone permission denied.");
        }
    };

    useEffect(() => {
        if (handLandmarker && !isCameraActive) {
            startCamera();
        }
    }, [handLandmarker]);

    // Detection Loop
    const predict = useCallback(() => {
        if (!handLandmarker || !videoRef.current || !canvasRef.current) return;

        // Resume loop even if not tracking, to keep video fresh/ready?
        // Or just pause detection.
        if (!isTracking) {
            // Clear canvas
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            requestRef.current = requestAnimationFrame(predict);
            return;
        }

        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            requestRef.current = requestAnimationFrame(predict);
            return;
        }

        if (canvasRef.current.width !== videoRef.current.videoWidth) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
        }

        const startTimeMs = performance.now();
        const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

        const canvasCtx = canvasRef.current.getContext("2d");
        if (!canvasCtx) return;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.landmarks && results.landmarks.length > 0) {
            // Find the correct hand
            let targetIndex = -1;

            // MediaPipe handedness labels are often inverse of reality in selfie mode due to mirroring.
            // "Left" usually corresponds to the user's Right hand in the image if standard selfie logic applies?
            // Actually, MediaPipe returns "Left" for the hand that appears on the left of the image (which is user's right in mirror).
            // BUT, the label "Left" usually means "Left Hand".
            // Let's rely on testing or common behavior: The model predicts "Left" or "Right".
            // If I raise my Right hand, and it's mirrored, it looks like a Left hand?
            // Actually, MediaPipe is trained to recognize "Right Hand" regardless of position?
            // Let's assume standard behavior: we look for the label matching our target.
            // If it feels wrong, we can swap.

            // Note: For now, I will match exact label.
            for (let i = 0; i < results.handedness.length; i++) {
                if (results.handedness[i][0].categoryName === targetHand) {
                    targetIndex = i;
                    break;
                }
            }

            // Fallback: If "Right" is requested but only 1 hand is there and it's labeled "Left" (maybe misclassified),
            // we might want to just take it? No, user wants accuracy.
            // If detection is robust, we stick to targetIndex.

            if (targetIndex !== -1) {
                const landmarks = results.landmarks[targetIndex];

                // Draw
                const drawingUtils = new DrawingUtils(canvasCtx);
                drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
                    color: "#00FF00",
                    lineWidth: 5
                });
                drawingUtils.drawLandmarks(landmarks, {
                    color: "#FF0000",
                    lineWidth: 2
                });

                if (landmarks.length >= 9) {
                    const wrist = landmarks[0];  // Use wrist for cursor position (stable during pinch)
                    const indexTip = landmarks[8];  // Still used for pinch detection
                    const thumbTip = landmarks[4];

                    const targetX = (1 - wrist.x) * window.innerWidth;
                    const targetY = wrist.y * window.innerHeight;

                    cursorRef.current.x += (targetX - cursorRef.current.x) * smoothingFactor;
                    cursorRef.current.y += (targetY - cursorRef.current.y) * smoothingFactor;

                    setCursorPosition({ ...cursorRef.current });

                    const dx = indexTip.x - thumbTip.x;
                    const dy = indexTip.y - thumbTip.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const PINCH_THRESHOLD = 0.05;
                    const currentPinching = distance < PINCH_THRESHOLD;

                    setIsPinching(currentPinching);

                    const now = performance.now();
                    const { isPinching: wasPinching, startTime, isHolding } = pinchStateRef.current;

                    const targetElement = document.elementFromPoint(cursorRef.current.x, cursorRef.current.y);

                    if (targetElement) {
                        targetElement.dispatchEvent(new MouseEvent("mousemove", {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            clientX: cursorRef.current.x,
                            clientY: cursorRef.current.y
                        }));
                    }

                    if (targetElement !== lastHoveredElement.current) {
                        if (lastHoveredElement.current) {
                            lastHoveredElement.current.dispatchEvent(new MouseEvent("mouseout", {
                                bubbles: true,
                                view: window,
                                relatedTarget: targetElement,
                                clientX: cursorRef.current.x,
                                clientY: cursorRef.current.y
                            }));
                            lastHoveredElement.current.dispatchEvent(new MouseEvent("mouseleave", {
                                bubbles: false,
                                view: window,
                                relatedTarget: targetElement,
                                clientX: cursorRef.current.x,
                                clientY: cursorRef.current.y
                            }));
                        }

                        if (targetElement) {
                            targetElement.dispatchEvent(new MouseEvent("mouseover", {
                                bubbles: true,
                                view: window,
                                relatedTarget: lastHoveredElement.current,
                                clientX: cursorRef.current.x,
                                clientY: cursorRef.current.y
                            }));
                            targetElement.dispatchEvent(new MouseEvent("mouseenter", {
                                bubbles: false,
                                view: window,
                                relatedTarget: lastHoveredElement.current,
                                clientX: cursorRef.current.x,
                                clientY: cursorRef.current.y
                            }));
                        }
                        lastHoveredElement.current = targetElement;
                    }

                    if (currentPinching) {
                        if (!wasPinching) {
                            pinchStateRef.current.isPinching = true;
                            pinchStateRef.current.startTime = now;
                            pinchStateRef.current.isHolding = false;

                            if (targetElement) {
                                targetElement.dispatchEvent(new MouseEvent("mousedown", {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window,
                                    clientX: cursorRef.current.x,
                                    clientY: cursorRef.current.y
                                }));
                            }
                        } else {
                            const duration = now - startTime;
                            if (duration > 400 && !isHolding) {
                                console.log("Hand Tracking: Triggering Spacebar Down (Hold)");
                                window.dispatchEvent(new KeyboardEvent("keydown", {
                                    code: "Space",
                                    key: " ",
                                    bubbles: true,
                                    repeat: false
                                }));
                                pinchStateRef.current.isHolding = true;
                            }
                        }
                    } else {
                        if (wasPinching) {
                            if (targetElement) {
                                targetElement.dispatchEvent(new MouseEvent("mouseup", {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window,
                                    clientX: cursorRef.current.x,
                                    clientY: cursorRef.current.y
                                }));
                            }

                            if (isHolding) {
                                console.log("Hand Tracking: Triggering Spacebar Up (Release)");
                                window.dispatchEvent(new KeyboardEvent("keyup", {
                                    code: "Space",
                                    key: " ",
                                    bubbles: true
                                }));
                            } else {
                                if (targetElement) {
                                    targetElement.dispatchEvent(new MouseEvent("click", {
                                        bubbles: true,
                                        cancelable: true,
                                        view: window,
                                        clientX: cursorRef.current.x,
                                        clientY: cursorRef.current.y
                                    }));
                                }
                            }

                            pinchStateRef.current.isPinching = false;
                            pinchStateRef.current.isHolding = false;
                        }
                    }
                }
            } else {
                // Hand lost or wrong hand
                // Optionally reset pinching state to avoid stuck holds
                // But be careful not to trigger clicks if hand just flickered

                // For now, do nothing.
            }
        }

        canvasCtx.restore();

        requestRef.current = requestAnimationFrame(predict);
    }, [handLandmarker, isTracking, targetHand]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(predict);
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [predict]);

    return (
        <>
            {/* Controls & Video Container */}
            <motion.div
                className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {/* Toggle Button */}
                <button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg hover:bg-white/20 transition-all"
                >
                    <Settings size={20} />
                </button>

                {/* Settings Panel */}
                <AnimatePresence>
                    {isSettingsOpen && (
                        <motion.div
                            className="mb-2 p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white w-64 shadow-2xl"
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        >
                            <h3 className="text-sm font-semibold mb-4 text-white/80 uppercase tracking-wider">Hand Tracking</h3>

                            <div className="space-y-4">
                                {/* Toggle Tracking */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-light flex items-center gap-2">
                                        <MousePointer2 size={14} /> Tracking
                                    </span>
                                    <button
                                        onClick={() => setIsTracking(!isTracking)}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${isTracking ? "bg-blue-500" : "bg-white/20"}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isTracking ? "translate-x-4" : ""}`} />
                                    </button>
                                </div>

                                {/* Handedness */}
                                <div className="space-y-2">
                                    <span className="text-sm font-light flex items-center gap-2">
                                        <Hand size={14} /> Dominant Hand
                                    </span>
                                    <div className="flex bg-white/10 rounded-lg p-1">
                                        <button
                                            onClick={() => setTargetHand("Left")}
                                            className={`flex-1 py-1.5 text-xs rounded-md transition-all ${targetHand === "Left" ? "bg-white/20 shadow-sm" : "text-white/40 hover:text-white/60"}`}
                                        >
                                            Left
                                        </button>
                                        <button
                                            onClick={() => setTargetHand("Right")}
                                            className={`flex-1 py-1.5 text-xs rounded-md transition-all ${targetHand === "Right" ? "bg-white/20 shadow-sm" : "text-white/40 hover:text-white/60"}`}
                                        >
                                            Right
                                        </button>
                                    </div>
                                </div>

                                {/* Show Camera */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-light flex items-center gap-2">
                                        {showCamera ? <Eye size={14} /> : <EyeOff size={14} />} Camera Feed
                                    </span>
                                    <button
                                        onClick={() => setShowCamera(!showCamera)}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${showCamera ? "bg-blue-500" : "bg-white/20"}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showCamera ? "translate-x-4" : ""}`} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Video Feed */}
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
                                    ref={videoRef}
                                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                                    autoPlay
                                    playsInline
                                    muted
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                                />
                                {/* Status Indicator */}
                                <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${isTracking && handLandmarker ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"}`} />

                                {cameraError && (
                                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-red-400 text-sm bg-black/80">
                                        {cameraError}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hidden elements when camera is hidden but tracking is on */}
                <div className="fixed opacity-0 pointer-events-none">
                    {!showCamera && (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted />
                            <canvas ref={canvasRef} />
                        </>
                    )}
                </div>
            </motion.div>

            {/* Virtual Cursor */}
            {isTracking && cursorPosition && (
                <motion.div
                    className="fixed pointer-events-none z-[9999]"
                    style={{
                        left: 0,
                        top: 0,
                        x: cursorPosition.x,
                        y: cursorPosition.y,
                    }}
                >
                    <div className="relative -translate-x-1/2 -translate-y-1/2">
                        <motion.div
                            className={`w-6 h-6 rounded-full border-2 shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-colors duration-200
                    ${isPinching ? 'bg-white border-blue-400 scale-75' : 'bg-white/10 border-white/80'}`}
                            animate={{
                                scale: isPinching ? 0.8 : 1,
                                backgroundColor: isPinching ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.1)"
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </>
    );
};
