import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, Hand, Smile, Eye, X, Copy } from "lucide-react";

interface SettingsPanelProps {
    handTrackingEnabled: boolean;
    setHandTrackingEnabled: (v: boolean) => void;
    handDominantHand: "Left" | "Right";
    setHandDominantHand: (v: "Left" | "Right") => void;
    handTrackingMode: "Center" | "Relative";
    setHandTrackingMode: (v: "Center" | "Relative") => void;
    handSensitivity: number;
    setHandSensitivity: (v: number) => void;
    showHandCamera: boolean;
    setShowHandCamera: (v: boolean) => void;

    faceTrackingEnabled: boolean;
    setFaceTrackingEnabled: (v: boolean) => void;
    headTrackingSmoothing: boolean;
    setHeadTrackingSmoothing: (v: boolean) => void;
    showFaceDebug: boolean;
    setShowFaceDebug: (v: boolean) => void;

    onCopyParams: () => void;
    cameraDebugInfo: string;
    eyeTrackingEnabled: boolean;
    setEyeTrackingEnabled: (v: boolean) => void;
    onCalibrateEye: () => void;
    foveatedRenderingEnabled: boolean;
    setFoveatedRenderingEnabled: (v: boolean) => void;
    foveatedRadius: number;
    setFoveatedRadius: (v: number) => void;
}

type Tab = "hand" | "face" | "eye";

const tabOptions: { label: string; value: Tab; icon: React.ReactNode }[] = [
    { label: "Hand", value: "hand", icon: <Hand size={14} /> },
    { label: "Face", value: "face", icon: <Smile size={14} /> },
    { label: "Eye", value: "eye", icon: <Eye size={14} /> },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    handTrackingEnabled,
    setHandTrackingEnabled,
    handDominantHand,
    setHandDominantHand,
    handTrackingMode,
    setHandTrackingMode,
    handSensitivity,
    setHandSensitivity,
    showHandCamera,
    setShowHandCamera,
    faceTrackingEnabled,
    setFaceTrackingEnabled,
    headTrackingSmoothing,
    setHeadTrackingSmoothing,
    showFaceDebug,
    setShowFaceDebug,
    onCopyParams,
    cameraDebugInfo,
eyeTrackingEnabled, setEyeTrackingEnabled, onCalibrateEye , foveatedRenderingEnabled, setFoveatedRenderingEnabled , foveatedRadius, setFoveatedRadius }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("hand");

    return (
        <>
            {/* Toggle Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-4 right-4 z-[100] p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white/80 hover:bg-white/20 transition-all shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {isOpen ? <X size={20} /> : <Settings size={20} />}
            </motion.button>

            {/* Main Panel - Top Right, Narrower */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed top-16 right-4 w-80 bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg rounded-2xl overflow-hidden z-[100] flex flex-col"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Header: "Look to Select, Speak to Refine" */}
                        <div className="p-5 border-b border-white/10">
                            <h3 className="text-lg font-light text-white/90 mb-3">
                                Look to Select, Speak to Refine
                            </h3>
                            <p className="text-sm text-white/70 font-light mb-4">
                                This prototype demonstrates a new paradigm for text input in spatial computing that combines:
                            </p>
                            <ul className="text-sm space-y-3">
                                <li className="flex items-start">
                                    <span className="inline-block w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/50 mr-3 flex-shrink-0 mt-0.5 shadow-[0_0_8px_rgba(59,130,246,0.2)]"></span>
                                    <span className="text-white/80 font-light">
                                        <strong className="font-normal">Eye tracking</strong> (simulated with mouse hover)
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="inline-block w-5 h-5 rounded-full bg-green-500/20 border border-green-400/50 mr-3 flex-shrink-0 mt-0.5 shadow-[0_0_8px_rgba(74,222,128,0.2)]"></span>
                                    <span className="text-white/80 font-light">
                                        <strong className="font-normal">Voice commands</strong> (press space to activate)
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="inline-block w-5 h-5 rounded-full bg-purple-500/20 border border-purple-400/50 mr-3 flex-shrink-0 mt-0.5 shadow-[0_0_8px_rgba(168,85,247,0.2)]"></span>
                                    <span className="text-white/80 font-light">
                                        <strong className="font-normal">Contextual understanding</strong> (grammar correction)
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Tabs - Exact same as BackgroundToggle */}
                        <div className="px-5 pt-5">
                            <div className="flex p-1 bg-white/10 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl relative overflow-hidden">
                                {tabOptions.map((option) => {
                                    const isActive = activeTab === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() => setActiveTab(option.value)}
                                            className={`relative px-4 py-1.5 text-sm font-medium transition-colors duration-200 rounded-full whitespace-nowrap outline-none flex-1
                                                ${isActive ? "text-white" : "text-white/50 hover:text-white/80"}`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="settings-tab-pill"
                                                    className="absolute inset-0 bg-white/20 backdrop-blur-md rounded-full border border-white/20 shadow-sm"
                                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                />
                                            )}
                                            <span className="relative z-10 flex items-center justify-center gap-1.5">
                                                {option.icon}
                                                {option.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                                                {/* Global Settings */}


                        {/* Content Area */}
                        <div className="p-5 space-y-5 max-h-[40vh] overflow-y-auto pt-2">
                            <AnimatePresence mode="wait">
                                {activeTab === "hand" && (
                                    <motion.div
                                        key="hand"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.15 }}
                                        className="space-y-5"
                                    >
                                        <ControlRow label="Enable Tracking" value={handTrackingEnabled} onChange={setHandTrackingEnabled} />

                                        <div className="space-y-2">
                                            <Label>Dominant Hand</Label>
                                            <SegmentedControl options={["Left", "Right"]} value={handDominantHand} onChange={(v) => setHandDominantHand(v as any)} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Tracking Mode</Label>
                                            <SegmentedControl options={["Center", "Relative"]} value={handTrackingMode} onChange={(v) => setHandTrackingMode(v as any)} />
                                            <p className="text-xs text-white/40 font-light">
                                                {handTrackingMode === "Center" ? "Cursor starts at center." : "Maps hand position 1:1 to screen."}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label>Sensitivity</Label>
                                                <span className="text-xs text-white/50 font-mono">{handSensitivity}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="100"
                                                value={handSensitivity}
                                                onChange={(e) => setHandSensitivity(Number(e.target.value))}
                                                className="w-full accent-white/80 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        <ControlRow label="Show Camera Feed" value={showHandCamera} onChange={setShowHandCamera} />
                                    </motion.div>
                                )}

                                {activeTab === "face" && (
                                    <motion.div
                                        key="face"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.15 }}
                                        className="space-y-5"
                                    >
                                        <ControlRow label="Enable Tracking" value={faceTrackingEnabled} onChange={setFaceTrackingEnabled} />
                                        <ControlRow label="Smoothing" value={headTrackingSmoothing} onChange={setHeadTrackingSmoothing} />
                                        <p className="text-xs text-white/40 font-light -mt-3 mb-2">
                                            Reduces jitter but may add slight latency.
                                        </p>
                                        <div className="h-px bg-white/10 w-full" />
                                        <ControlRow label="Show Debug View" value={showFaceDebug} onChange={setShowFaceDebug} />
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                                            <p className="text-xs text-white/60 leading-relaxed">Face tracking enables the parallax effect.</p>
                                        </div>

                                        <div className="h-px bg-white/10 w-full" />

                                        <div className="space-y-2">
                                            <Label>Camera Parameters</Label>
                                            <div className="bg-black/30 p-2 rounded-lg border border-white/5 font-mono text-[10px] text-white/70 whitespace-pre-wrap">
                                                {cameraDebugInfo || "Waiting for camera data..."}
                                            </div>
                                            <button
                                                onClick={onCopyParams}
                                                className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 text-sm font-medium transition-all flex items-center justify-center gap-2"
                                            >
                                                <Copy size={14} /> Copy to Clipboard
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === "eye" && (
                                    <motion.div
                                        key="eye"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.15 }}
                                        className="space-y-5"
                                    >
                                        <ControlRow label="Enable Eye Tracking" value={eyeTrackingEnabled} onChange={setEyeTrackingEnabled} />
                                        <ControlRow label="Foveated Rendering" value={foveatedRenderingEnabled} onChange={setFoveatedRenderingEnabled} />
                                        <p className="text-xs text-white/40 font-light -mt-3">Blurs peripheral vision.</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <Label>Foveal Diameter</Label>
                                                <span className="text-xs text-white/50 font-mono">{Math.round(foveatedRadius)}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="150"
                                                max="600"
                                                step="10"
                                                value={foveatedRadius}
                                                onChange={(e) => setFoveatedRadius(Number(e.target.value))}
                                                className="w-full accent-white/80 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                                disabled={!foveatedRenderingEnabled}
                                            />
                                        </div>



                                        <div className="h-px bg-white/10 w-full" />

                                        <div className="space-y-2">
                                            <Label>Calibration</Label>
                                            <button
                                                onClick={onCalibrateEye}
                                                className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white/90 text-sm font-medium transition-all flex items-center justify-center gap-2"
                                            >
                                                <Eye size={14} /> Start Calibration
                                            </button>
                                            <p className="text-xs text-white/40 font-light">
                                                Required for accurate eye tracking.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

// Reusable Sub-components

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-sm font-light text-white/80">{children}</h3>
);

const ControlRow: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
            onClick={() => onChange(!value)}
            className={`w-11 h-6 rounded-full transition-colors duration-200 relative ${value ? "bg-green-500/80" : "bg-white/10"}`}
        >
            <motion.div
                className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                animate={{ x: value ? 18 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
        </button>
    </div>
);

const SegmentedControl: React.FC<{ options: string[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
    <div className="flex p-1 bg-white/10 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl relative overflow-hidden">
        {options.map((option) => {
            const isActive = value === option;
            return (
                <button
                    key={option}
                    onClick={() => onChange(option)}
                    className={`relative flex-1 px-3 py-1 text-xs font-medium transition-colors duration-200 rounded-full whitespace-nowrap outline-none
                        ${isActive ? "text-white" : "text-white/50 hover:text-white/80"}`}
                >
                    {isActive && (
                        <motion.div
                            layoutId={`segment-${options.join("-")}`}
                            className="absolute inset-0 bg-white/20 backdrop-blur-md rounded-full border border-white/20 shadow-sm"
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10">{option}</span>
                </button>
            );
        })}
    </div>
);
