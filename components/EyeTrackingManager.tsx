import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCamera } from "./CameraProvider";

interface EyeTrackingManagerProps {
    onGazeMove?: (pos: { x: number; y: number }) => void;
    isCalibrationActive: boolean;
    onCalibrationComplete: () => void;
}

// Global style to force hide WebGazer elements
const GLOBAL_STYLE = `
#webgazerVideoFeed, #webgazerFaceOverlay, #webgazerVideoCanvas {
    display: none !important;
    opacity: 0 !important;
    position: fixed !important;
    top: -9999px !important;
    left: -9999px !important;
    pointer-events: none !important;
    z-index: -1 !important;
}
`;

export const EyeTrackingManager: React.FC<EyeTrackingManagerProps> = ({
    onGazeMove,
    isCalibrationActive,
    onCalibrationComplete
}) => {
    const { isReady, isVideoReady } = useCamera(); // Use isVideoReady to ensure stream is playing
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [isWebGazerReady, setIsWebGazerReady] = useState(false);
    const [calibrationPoints, setCalibrationPoints] = useState<number[]>(new Array(9).fill(0));
    const [activePointIndex, setActivePointIndex] = useState(0);

    // Inject global styles once
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = GLOBAL_STYLE;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Load WebGazer
    useEffect(() => {
        if (window.webgazer) {
            setScriptLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
        script.async = true;
        script.onload = () => {
            setScriptLoaded(true);
        };
        document.body.appendChild(script);
    }, []);

    // Initialize WebGazer
    useEffect(() => {
        // Wait for script, stream (isReady), and video element (isVideoReady)
        if (!scriptLoaded || !window.webgazer || !isReady || !isVideoReady) return;

        const initWebGazer = async () => {
            try {
                // Clear any previous data
                await window.webgazer.clearData();

                // Setup listener
                window.webgazer.setGazeListener((data: any, clock: number) => {
                    if (data && onGazeMove) {
                        onGazeMove({ x: data.x, y: data.y });
                    }
                });

                // Start
                await window.webgazer.setRegression('ridge')
                    .setTracker('TFFacemesh')
                    .begin();

                // Ensure UI is hidden
                window.webgazer.showVideoPreview(false)
                    .showPredictionPoints(false) // Only show points during calibration if needed
                    .applyKalmanFilter(true);

                console.log("WebGazer initialized");
                setIsWebGazerReady(true);
            } catch (e) {
                console.error("WebGazer failed to init:", e);
            }
        };

        initWebGazer();

        return () => {
            if (window.webgazer) {
                try {
                    window.webgazer.end();
                } catch (e) {
                    console.error("WebGazer failed to end:", e);
                }
            }
            setIsWebGazerReady(false);
        };
    }, [scriptLoaded, isReady, isVideoReady]); // Add isVideoReady dependency

    // Calibration Logic
    useEffect(() => {
        if (isCalibrationActive) {
            setCalibrationPoints(new Array(9).fill(0));
            setActivePointIndex(0);
            if (window.webgazer) {
                window.webgazer.showPredictionPoints(true);
            }
        } else {
             if (window.webgazer) {
                window.webgazer.showPredictionPoints(false);
            }
        }
    }, [isCalibrationActive]);

    const handlePointClick = (index: number, e: React.MouseEvent) => {
        if (!isWebGazerReady || !window.webgazer) return;

        // Record the calibration point!
        // WebGazer records on click automatically if listening, but explicit recording is safer for custom UI
        const x = e.clientX;
        const y = e.clientY;
        window.webgazer.recordScreenPosition(x, y, 'click');

        const newPoints = [...calibrationPoints];
        newPoints[index] += 1;
        setCalibrationPoints(newPoints);

        if (newPoints[index] >= 5) {
            // Move to next point
            if (index < 8) {
                setActivePointIndex(index + 1);
            } else {
                // Done
                window.webgazer.showPredictionPoints(false);
                onCalibrationComplete();
            }
        }
    };

    // Calibration Grid Positions
    const getPosition = (index: number) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        return {
            top: `${10 + row * 40}%`,
            left: `${10 + col * 40}%`
        };
    };

    return (
        <>
            <AnimatePresence>
                {isCalibrationActive && (
                    <motion.div
                        className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center pointer-events-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {!isWebGazerReady && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white">
                                Initializing Eye Tracking...
                            </div>
                        )}

                        {isWebGazerReady && (
                            <>
                                <div className="absolute top-10 text-white text-xl font-light text-center w-full">
                                    Click each red dot 5 times while looking at it.
                                    <br/>
                                    <span className="text-sm opacity-50">Head steady, eyes moving.</span>
                                </div>

                                {calibrationPoints.map((clicks, index) => {
                                    const isCurrent = index === activePointIndex;
                                    const isDone = clicks >= 5;

                                    return (
                                        <motion.button
                                            key={index}
                                            className={`absolute w-8 h-8 rounded-full border-2
                                                ${isDone ? 'bg-green-500 border-green-300 opacity-50' :
                                                  isCurrent ? 'bg-red-500 border-red-300 cursor-pointer animate-pulse' :
                                                  'bg-gray-500 border-gray-400 opacity-30 cursor-not-allowed'}`}
                                            style={getPosition(index)}
                                            onClick={(e) => isCurrent && handlePointClick(index, e)}
                                            disabled={!isCurrent && !isDone}
                                            whileHover={isCurrent ? { scale: 1.2 } : {}}
                                            whileTap={isCurrent ? { scale: 0.9 } : {}}
                                        >
                                            {isCurrent && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-white text-xs">{5 - clicks}</span>}
                                        </motion.button>
                                    );
                                })}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
