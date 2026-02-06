import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface EyeTrackingManagerProps {
    onGazeMove?: (pos: { x: number; y: number }) => void;
    isCalibrationActive: boolean;
    onCalibrationComplete: () => void;
}

export const EyeTrackingManager: React.FC<EyeTrackingManagerProps> = ({
    onGazeMove,
    isCalibrationActive,
    onCalibrationComplete
}) => {
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [isWebGazerReady, setIsWebGazerReady] = useState(false);
    const [calibrationPoints, setCalibrationPoints] = useState<number[]>(new Array(9).fill(0));
    const [activePointIndex, setActivePointIndex] = useState(0);

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
        if (!scriptLoaded || !window.webgazer) return;

        const initWebGazer = async () => {
            try {
                // Clear any previous data to ensure fresh start
                await window.webgazer.clearData();

                await window.webgazer.setRegression('ridge')
                    .setTracker('TFFacemesh')
                    .begin();

                // IMPORTANT: Hide the video feed to prevent duplicate/ugly UI
                window.webgazer.showVideoPreview(false)
                    .showPredictionPoints(true)
                    .applyKalmanFilter(true);

                // Setup listener
                window.webgazer.setGazeListener((data: any, clock: number) => {
                    if (data && onGazeMove) {
                        onGazeMove({ x: data.x, y: data.y });
                    }
                });

                console.log("WebGazer initialized");
                setIsWebGazerReady(true);
            } catch (e) {
                console.error("WebGazer failed to init:", e);
            }
        };

        initWebGazer();

        return () => {
            if (window.webgazer) {
                window.webgazer.end();
            }
        };
    }, [scriptLoaded]);

    // Calibration Logic
    useEffect(() => {
        if (isCalibrationActive) {
            // Reset calibration state when activation happens
            setCalibrationPoints(new Array(9).fill(0));
            setActivePointIndex(0);
            if (window.webgazer) {
                window.webgazer.showPredictionPoints(true);
            }
        }
    }, [isCalibrationActive]);

    const handlePointClick = (index: number) => {
        if (!isWebGazerReady) return;

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
                                            onClick={() => isCurrent && handlePointClick(index)}
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
