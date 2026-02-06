import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    FilesetResolver,
    HandLandmarker,
    DrawingUtils,
    HandLandmarkerResult,
    NormalizedLandmark
} from "@mediapipe/tasks-vision";
import { motion, AnimatePresence } from "motion/react";

// Types
interface HandTrackingManagerProps {
    overrideCursorPosRef?: React.MutableRefObject<{ x: number; y: number } | null>;
    onHandActiveChange?: (isActive: boolean) => void;
    // Settings Props
    isTracking: boolean;
    targetHand: "Right" | "Left";
    trackingMode: "Center" | "Relative";
    sensitivity: number;
    showCamera: boolean;
}

export const HandTrackingManager: React.FC<HandTrackingManagerProps> = ({
    overrideCursorPosRef,
    onHandActiveChange,
    isTracking,
    targetHand,
    trackingMode,
    sensitivity,
    showCamera
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

    // Tracking Logic Refs
    const handStartPosRef = useRef<{ x: number, y: number } | null>(null);
    const wasTrackingRef = useRef(false);

    // Smoothing refs
    const cursorRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const smoothingFactor = 0.2;

    // Interaction State Refs
    const pinchStateRef = useRef({
        isPinching: false,
        startTime: 0,
        isHolding: false,
        lastPinchTime: 0,  // Track when pinch was last detected
        justReleasedHold: false,  // Track if we just released a hold gesture
        holdReleaseTime: 0  // Track when hold was released
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
            console.log("Requesting camera/mic access...");
            const stream = await requestMediaAccess();

            console.log("Media access granted");
            videoRef.current.srcObject = stream;

            // Explicitly play and handle promise
            videoRef.current.oncanplay = () => {
                console.log("Video can play, starting playback...");
                videoRef.current?.play().then(() => {
                    console.log("Video playing successfully");
                    setIsCameraActive(true);
                    setCameraError(null);
                }).catch(e => console.error("Play error:", e));
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
            setCursorPosition(null); // Clear cursor when not tracking
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

                // Draw component handles debug drawing internally if needed, but we draw here for the camera feed
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

                    // Apply sensitivity scaling (1-100 slider → 0.2x to 10x multiplier)
                    // Lower = precise but slow, Higher = fast but less precise
                    // Default 70 = 5x multiplier for comfortable use with minimal arm movement
                    const sensitivityMultiplier = 0.2 + (sensitivity / 100) * 9.8;

                    let targetX, targetY;

                    if (trackingMode === "Relative") {
                        // Relative mode: direct mapping with padding
                        const padding = 0.25;
                        const effectiveX = (wrist.x - padding) / (1 - 2 * padding);
                        const effectiveY = (wrist.y - padding) / (1 - 2 * padding);

                        targetX = (1 - Math.max(0, Math.min(1, effectiveX))) * window.innerWidth;
                        targetY = Math.max(0, Math.min(1, effectiveY)) * window.innerHeight;

                        // Reset handStartPos when switching to relative
                        handStartPosRef.current = null;
                    } else {
                        // Center mode: Start at center, then track delta
                        if (!wasTrackingRef.current || !handStartPosRef.current) {
                            // Just detected hand - initialize
                            handStartPosRef.current = { x: wrist.x, y: wrist.y };
                            cursorRef.current = {
                                x: window.innerWidth / 2,
                                y: window.innerHeight / 2
                            };
                            wasTrackingRef.current = true;
                        }

                        // Calculate delta from start position
                        const dx = (wrist.x - handStartPosRef.current.x) * window.innerWidth;
                        const dy = (wrist.y - handStartPosRef.current.y) * window.innerHeight;

                        // Apply delta with sensitivity
                        targetX = (window.innerWidth / 2) - dx * sensitivityMultiplier;
                        targetY = (window.innerHeight / 2) + dy * sensitivityMultiplier;
                    }

                    cursorRef.current.x += (targetX - cursorRef.current.x) * smoothingFactor;
                    cursorRef.current.y += (targetY - cursorRef.current.y) * smoothingFactor;

                    if (overrideCursorPosRef?.current) { cursorRef.current = overrideCursorPosRef.current; } setCursorPosition({ ...cursorRef.current });

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
                        // Update last pinch time
                        pinchStateRef.current.lastPinchTime = now;

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
                            if (duration > 300 && !isHolding) {
                                // Check if hovering over text editor area (for both word editing and pure dictation)
                                const isOverTextContainer = targetElement?.closest('.text-editor-container') !== null ||
                                    targetElement?.classList.contains('text-editor-container');

                                console.log(`Hold detected - over text container: ${isOverTextContainer}, element:`, targetElement?.className);

                                if (isOverTextContainer) {
                                    console.log("Hand Tracking: Spacebar Down (Hold Detected)");
                                    window.dispatchEvent(new KeyboardEvent("keydown", {
                                        code: "Space",
                                        key: " ",
                                        bubbles: true,
                                        repeat: false
                                    }));
                                    pinchStateRef.current.isHolding = true;
                                } else {
                                    console.log("Hand Tracking: Hold detected but not over text area - ignoring");
                                }
                            }
                        }
                    } else {
                        // Not currently pinching - check if enough time has passed since last pinch
                        const timeSinceLastPinch = now - pinchStateRef.current.lastPinchTime;

                        if (wasPinching && timeSinceLastPinch > 200) {
                            // Pinch has been absent for 200ms - confirm release
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
                                console.log("Hand Tracking: Spacebar Up (Hold Released)");
                                window.dispatchEvent(new KeyboardEvent("keyup", {
                                    code: "Space",
                                    key: " ",
                                    bubbles: true
                                }));

                                // Mark that we just released a hold gesture
                                pinchStateRef.current.justReleasedHold = true;
                                pinchStateRef.current.holdReleaseTime = now;
                            } else {
                                // Check if we recently released a hold gesture
                                const timeSinceHoldRelease = now - pinchStateRef.current.holdReleaseTime;

                                // Only fire click if we didn't just release a hold (within 300ms)
                                if (!pinchStateRef.current.justReleasedHold || timeSinceHoldRelease > 300) {
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
                            }

                            pinchStateRef.current.isPinching = false;
                            pinchStateRef.current.isHolding = false;

                            // Clear the hold release flag after a delay
                            if (pinchStateRef.current.justReleasedHold) {
                                setTimeout(() => {
                                    pinchStateRef.current.justReleasedHold = false;
                                }, 300);
                            }
                        }
                    }
                }
            } else {
                // Hand lost or wrong hand
                wasTrackingRef.current = false;
                handStartPosRef.current = null;
            }
        }

        canvasCtx.restore();

        requestRef.current = requestAnimationFrame(predict);
    }, [handLandmarker, isTracking, targetHand, trackingMode, sensitivity]);

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
            {/* Video Feed (Visible if enabled) */}
            <AnimatePresence>
                {showCamera && (
                    <motion.div
                        className="fixed bottom-4 left-4 z-[90] pointer-events-none rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black/50 backdrop-blur-sm"
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
