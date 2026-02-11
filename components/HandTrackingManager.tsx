import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    FilesetResolver,
    HandLandmarker,
    DrawingUtils,
} from "@mediapipe/tasks-vision";
import { motion, AnimatePresence } from "motion/react";
import { useCamera } from "./CameraProvider";

// Types
interface HandTrackingManagerProps {
    overrideCursorPosRef?: React.MutableRefObject<{ x: number; y: number } | null>;
    onHandActiveChange?: (isActive: boolean) => void;
    disableHandCursor?: boolean;
    // Settings Props
    isTracking: boolean;
    targetHand: "Right" | "Left";
    trackingMode: "Center" | "Relative";
    sensitivity: number;
    trackingLossThreshold?: number;
    showCamera: boolean;
}

export const HandTrackingManager: React.FC<HandTrackingManagerProps> = ({
    overrideCursorPosRef,
    onHandActiveChange,
    disableHandCursor,
    isTracking,
    targetHand,
    trackingMode,
    sensitivity,
    trackingLossThreshold = 300,
    showCamera
}) => {
    // Shared camera resources
    const { videoRef, isVideoReady, isLoading, error } = useCamera();

    // Local refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);

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
        lastPinchTime: 0,
        justReleasedHold: false,
        holdReleaseTime: 0
    });
    const lastHoveredElement = useRef<Element | null>(null);
    const trackingLossTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
                    numHands: 2,
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

    // Detection Loop
    const predict = useCallback(() => {
        // Wait for shared video readiness
        if (!handLandmarker || !videoRef.current || !isVideoReady || isLoading) {
            requestRef.current = requestAnimationFrame(predict);
            return;
        }

        // Resume loop even if not tracking, to keep canvas fresh if showing camera
        if (!isTracking) {
             if (showCamera && canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d");
                if (ctx) {
                    ctx.save();
                    ctx.scale(-1, 1);
                    ctx.translate(-canvasRef.current.width, 0);
                    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                    ctx.restore();
                }
             }

            requestRef.current = requestAnimationFrame(predict);
            setCursorPosition(null);
            return;
        }

        const startTimeMs = performance.now();
        const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

        // Debug Drawing / Camera Feed
        if (showCamera && canvasRef.current) {
            if (canvasRef.current.width !== videoRef.current.videoWidth) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
            }

            const canvasCtx = canvasRef.current.getContext("2d");
            if (canvasCtx) {
                canvasCtx.save();
                // Draw video frame first (mirrored)
                canvasCtx.scale(-1, 1);
                canvasCtx.translate(-canvasRef.current.width, 0);
                canvasCtx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                canvasCtx.restore(); // Restore to draw landmarks normally (since landmarks are already normalized/mirrored by model?)
                // Actually MediaPipe returns coordinates normalized [0,1].
                // If we draw them on a canvas, we need to scale them.
                // AND since we flipped the video draw, we need to flip the landmark draw OR just draw landmarks on top of the flipped video.
                // Usually DrawingUtils expects the canvas context to be in a state where it can draw.
                // If the video is flipped, we want landmarks to match.
                // Let's assume DrawingUtils handles coordinates in standard way.
                // If I flipped the video, the user sees themselves as a mirror.
                // The landmarks from MediaPipe usually match the input image.
                // So if I flip the video draw, I should probably flip the landmark draw too, OR
                // MediaPipe returns coordinates relative to the input image.
                // If I draw the input image flipped, I need to flip the coordinates when drawing.

                canvasCtx.save();
                canvasCtx.scale(-1, 1);
                canvasCtx.translate(-canvasRef.current.width, 0);

                if (results.landmarks) {
                   for (const landmarks of results.landmarks) {
                        const drawingUtils = new DrawingUtils(canvasCtx);
                        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
                            color: "#00FF00",
                            lineWidth: 5
                        });
                        drawingUtils.drawLandmarks(landmarks, {
                            color: "#FF0000",
                            lineWidth: 2
                        });
                   }
                }
                canvasCtx.restore();
            }
        }

        // Logic (Position, Pinch, etc.)
        if (results.landmarks && results.landmarks.length > 0) {
             let targetIndex = -1;
             for (let i = 0; i < results.handedness.length; i++) {
                if (results.handedness[i][0].categoryName === targetHand) {
                    targetIndex = i;
                    break;
                }
            }

            if (targetIndex !== -1) {
                // Tracking confirmed
                if (trackingLossTimeoutRef.current) {
                    clearTimeout(trackingLossTimeoutRef.current);
                    trackingLossTimeoutRef.current = null;
                }

                const landmarks = results.landmarks[targetIndex];
                const wrist = landmarks[0];
                const indexTip = landmarks[8];
                const thumbTip = landmarks[4];
                const sensitivityMultiplier = 0.2 + (sensitivity / 100) * 9.8;

                let targetX, targetY;

                if (trackingMode === "Relative") {
                    const padding = 0.25;
                    const effectiveX = (wrist.x - padding) / (1 - 2 * padding);
                    const effectiveY = (wrist.y - padding) / (1 - 2 * padding);
                    targetX = (1 - Math.max(0, Math.min(1, effectiveX))) * window.innerWidth;
                    targetY = Math.max(0, Math.min(1, effectiveY)) * window.innerHeight;
                    handStartPosRef.current = null;
                } else {
                    if (!wasTrackingRef.current || !handStartPosRef.current) {
                        handStartPosRef.current = { x: wrist.x, y: wrist.y };
                        cursorRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                        wasTrackingRef.current = true;
                    }
                    const dx = (wrist.x - handStartPosRef.current.x) * window.innerWidth;
                    const dy = (wrist.y - handStartPosRef.current.y) * window.innerHeight;
                    targetX = (window.innerWidth / 2) - dx * sensitivityMultiplier;
                    targetY = (window.innerHeight / 2) + dy * sensitivityMultiplier;
                }

                if (!disableHandCursor) { cursorRef.current.x += (targetX - cursorRef.current.x) * smoothingFactor; }
                if (!disableHandCursor) { cursorRef.current.y += (targetY - cursorRef.current.y) * smoothingFactor; }

                if (overrideCursorPosRef?.current) { cursorRef.current = overrideCursorPosRef.current; }
                setCursorPosition({ ...cursorRef.current });

                // Pinch Logic
                const dx = indexTip.x - thumbTip.x;
                const dy = indexTip.y - thumbTip.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const currentPinching = distance < 0.05;

                setIsPinching(currentPinching);
                handlePinchInteraction(currentPinching, cursorRef.current.x, cursorRef.current.y);
            } else {
                handleTrackingLoss();
            }
        } else {
            handleTrackingLoss();
        }

        // Always update cursor from override ref
        if (overrideCursorPosRef?.current) {
             cursorRef.current = overrideCursorPosRef.current;
             setCursorPosition({ ...cursorRef.current });
             if (!handLandmarker || results.landmarks.length === 0) { setIsPinching(false); }
        }

        requestRef.current = requestAnimationFrame(predict);
    }, [handLandmarker, isVideoReady, isTracking, targetHand, trackingMode, sensitivity, disableHandCursor, trackingLossThreshold, showCamera]);

    const handlePinchInteraction = (currentPinching: boolean, x: number, y: number) => {
        const now = performance.now();
        const { isPinching: wasPinching, startTime, isHolding } = pinchStateRef.current;
        const targetElement = document.elementFromPoint(x, y);

        // Hover Simulation
        if (targetElement) {
             targetElement.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
        }
        if (targetElement !== lastHoveredElement.current) {
             if (lastHoveredElement.current) {
                 lastHoveredElement.current.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, view: window, relatedTarget: targetElement, clientX: x, clientY: y }));
                 lastHoveredElement.current.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false, view: window, relatedTarget: targetElement, clientX: x, clientY: y }));
             }
             if (targetElement) {
                 targetElement.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, view: window, relatedTarget: lastHoveredElement.current, clientX: x, clientY: y }));
                 targetElement.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false, view: window, relatedTarget: lastHoveredElement.current, clientX: x, clientY: y }));
             }
             lastHoveredElement.current = targetElement;
        }

        // Click/Hold Logic
        if (currentPinching) {
            pinchStateRef.current.lastPinchTime = now;
            if (!wasPinching) {
                pinchStateRef.current.isPinching = true;
                pinchStateRef.current.startTime = now;
                pinchStateRef.current.isHolding = false;
                if (targetElement) {
                    targetElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
                }
            } else {
                if (now - startTime > 300 && !isHolding) {
                    const isOverTextContainer = targetElement?.closest('.text-editor-container') !== null || targetElement?.classList.contains('text-editor-container');
                    if (isOverTextContainer) {
                        window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true, repeat: false }));
                        pinchStateRef.current.isHolding = true;
                    }
                }
            }
        } else {
            const timeSinceLastPinch = now - pinchStateRef.current.lastPinchTime;
            if (wasPinching && timeSinceLastPinch > 200) {
                if (targetElement) {
                     targetElement.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
                }
                if (isHolding) {
                    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space", key: " ", bubbles: true }));
                    pinchStateRef.current.justReleasedHold = true;
                    pinchStateRef.current.holdReleaseTime = now;
                } else {
                    const timeSinceHoldRelease = now - pinchStateRef.current.holdReleaseTime;
                    if (!pinchStateRef.current.justReleasedHold || timeSinceHoldRelease > 300) {
                        if (targetElement) {
                            targetElement.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
                        }
                    }
                }
                pinchStateRef.current.isPinching = false;
                pinchStateRef.current.isHolding = false;
                if (pinchStateRef.current.justReleasedHold) {
                    setTimeout(() => { pinchStateRef.current.justReleasedHold = false; }, 300);
                }
            }
        }
    };

    const handleTrackingLoss = () => {
        if (!trackingLossTimeoutRef.current) {
            trackingLossTimeoutRef.current = setTimeout(() => {
                window.dispatchEvent(new CustomEvent("hand-tracking-lost"));
                if (pinchStateRef.current.isHolding) {
                    setTimeout(() => { window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space", key: " ", bubbles: true })); }, 10);
                    pinchStateRef.current.isHolding = false;
                    pinchStateRef.current.isPinching = false;
                    pinchStateRef.current.justReleasedHold = true;
                    setTimeout(() => { pinchStateRef.current.justReleasedHold = false; }, 300);
                }
                if (lastHoveredElement.current) {
                    lastHoveredElement.current.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, view: window, clientX: cursorRef.current.x, clientY: cursorRef.current.y }));
                    lastHoveredElement.current.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false, view: window, clientX: cursorRef.current.x, clientY: cursorRef.current.y }));
                    lastHoveredElement.current = null;
                }
                wasTrackingRef.current = false;
                handStartPosRef.current = null;
                if (!overrideCursorPosRef?.current) { setCursorPosition(null); }
                trackingLossTimeoutRef.current = null;
            }, trackingLossThreshold);
        }
    };

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
            {/* Debug Video Feed (Replaced by Canvas rendering of shared stream) */}
            <AnimatePresence>
                {showCamera && (
                    <motion.div
                        className="fixed bottom-4 left-4 z-[90] pointer-events-none rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black/50 backdrop-blur-sm"
                        initial={{ opacity: 0, height: 0, scale: 0.8 }}
                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.8 }}
                    >
                        <div className="relative w-64 h-48">
                            <canvas
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            {/* Status Indicator */}
                            <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${isTracking && handLandmarker ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"}`} />

                            {error && (
                                <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-red-400 text-sm bg-black/80">
                                    {error}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
