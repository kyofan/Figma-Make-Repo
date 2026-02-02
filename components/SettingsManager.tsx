import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Settings2,
    Layers,
    Zap,
    Box,
    Cuboid,
    Hand,
    MousePointer2,
    Crosshair,
    Sliders,
    Eye,
    EyeOff,
    User,
    Mic,
    ScanFace
} from "lucide-react";

// Define prop types for all settings
export interface SettingsManagerProps {
    // Parallax Settings
    parallaxSmoothing: boolean;
    setParallaxSmoothing: (val: boolean) => void;
    parallaxIntensity: number;
    setParallaxIntensity: (val: number) => void;
    renderMode: "gltf" | "splat";
    setRenderMode: (val: "gltf" | "splat") => void;

    // Hand Tracking Settings
    handTrackingEnabled: boolean;
    setHandTrackingEnabled: (val: boolean) => void;
    targetHand: "Right" | "Left";
    setTargetHand: (val: "Right" | "Left") => void;
    trackingMode: "Center" | "Relative";
    setTrackingMode: (val: "Center" | "Relative") => void;
    sensitivity: number;
    setSensitivity: (val: number) => void;
    showHandCamera: boolean;
    setShowHandCamera: (val: boolean) => void;

    // Face Tracking Settings
    faceTrackingEnabled: boolean;
    setFaceTrackingEnabled: (val: boolean) => void;
    showFaceDebug: boolean;
    setShowFaceDebug: (val: boolean) => void;

    // Voice Settings
    simulateVoiceConfig: boolean;
    setSimulateVoiceConfig: (val: boolean) => void;
    onSimulateVoiceCommand: (text: string) => void;
}

type Tab = "parallax" | "hand" | "face" | "voice";

export const SettingsManager: React.FC<SettingsManagerProps> = ({
    parallaxSmoothing,
    setParallaxSmoothing,
    parallaxIntensity,
    setParallaxIntensity,
    renderMode,
    setRenderMode,
    handTrackingEnabled,
    setHandTrackingEnabled,
    targetHand,
    setTargetHand,
    trackingMode,
    setTrackingMode,
    sensitivity,
    setSensitivity,
    showHandCamera,
    setShowHandCamera,
    faceTrackingEnabled,
    setFaceTrackingEnabled,
    showFaceDebug,
    setShowFaceDebug,
    simulateVoiceConfig,
    setSimulateVoiceConfig,
    onSimulateVoiceCommand,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("parallax");

    const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
        { id: "parallax", icon: <Layers size={14} />, label: "Parallax" },
        { id: "hand", icon: <Hand size={14} />, label: "Hand" },
        { id: "face", icon: <ScanFace size={14} />, label: "Face" },
        { id: "voice", icon: <Mic size={14} />, label: "Voice" },
    ];

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg hover:bg-white/20 transition-all"
                title="Settings"
            >
                <Settings2 size={20} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="mb-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white w-80 shadow-2xl overflow-hidden"
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    >
                        {/* Header / Tabs */}
                        <div className="flex border-b border-white/10">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-3 px-2 flex flex-col items-center gap-1 transition-colors text-[10px] uppercase tracking-wider font-medium ${activeTab === tab.id
                                        ? "bg-white/10 text-white border-b-2 border-blue-500"
                                        : "text-white/40 hover:bg-white/5 hover:text-white/70"
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="p-5 min-h-[250px]">
                            {activeTab === "parallax" && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                    <h3 className="text-sm font-semibold mb-2 text-white/80">PARALLAX CONFIG</h3>

                                    {/* Smoothing Toggle */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-light flex items-center gap-2">
                                            <Zap size={14} /> Smoothing
                                        </span>
                                        <Toggle
                                            value={parallaxSmoothing}
                                            onChange={setParallaxSmoothing}
                                        />
                                    </div>

                                    {/* Intensity Slider */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm font-light">
                                            <span className="flex items-center gap-2">Intensity</span>
                                            <span className="text-xs text-white/60">{parallaxIntensity}</span>
                                        </div>
                                        <Slider
                                            value={parallaxIntensity}
                                            min={0}
                                            max={200}
                                            onChange={setParallaxIntensity}
                                        />
                                    </div>

                                    <div className="h-px bg-white/10" />

                                    {/* Render Mode Toggle */}
                                    <div className="space-y-2">
                                        <span className="text-sm font-light flex items-center gap-2">
                                            <Box size={14} /> 3D Render Mode
                                        </span>
                                        <SegmentedControl
                                            options={[
                                                { value: "gltf", label: "GLTF", icon: <Cuboid size={12} /> },
                                                { value: "splat", label: "Splat", icon: <Box size={12} /> }
                                            ]}
                                            value={renderMode}
                                            onChange={(val) => setRenderMode(val as "gltf" | "splat")}
                                        />
                                        <p className="text-[10px] text-white/30 leading-tight">
                                            GLTF: Standard 3D Model<br />
                                            Splat: Gaussian Splatting (Photo-real)
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === "hand" && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                    <h3 className="text-sm font-semibold mb-2 text-white/80">HAND TRACKING</h3>

                                    {/* Toggle Tracking */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-light flex items-center gap-2">
                                            <MousePointer2 size={14} /> Tracking
                                        </span>
                                        <Toggle
                                            value={handTrackingEnabled}
                                            onChange={setHandTrackingEnabled}
                                        />
                                    </div>

                                    {/* Handedness */}
                                    <div className="space-y-2">
                                        <span className="text-sm font-light flex items-center gap-2">
                                            <Hand size={14} /> Dominant Hand
                                        </span>
                                        <SegmentedControl
                                            options={[
                                                { value: "Left", label: "Left" },
                                                { value: "Right", label: "Right" }
                                            ]}
                                            value={targetHand}
                                            onChange={(val) => setTargetHand(val as "Left" | "Right")}
                                        />
                                    </div>

                                    <div className="h-px bg-white/10" />

                                    {/* Tracking Mode */}
                                    <div className="space-y-2">
                                        <span className="text-sm font-light flex items-center gap-2">
                                            <Crosshair size={14} /> Orientation
                                        </span>
                                        <SegmentedControl
                                            options={[
                                                { value: "Center", label: "Center" },
                                                { value: "Relative", label: "Relative" }
                                            ]}
                                            value={trackingMode}
                                            onChange={(val) => setTrackingMode(val as "Center" | "Relative")}
                                        />
                                    </div>

                                    {/* Sensitivity Slider */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm font-light">
                                            <span className="flex items-center gap-2"><Sliders size={14} /> Speed</span>
                                            <span className="text-xs text-white/60">{sensitivity}%</span>
                                        </div>
                                        <Slider
                                            value={sensitivity}
                                            min={1}
                                            max={100}
                                            onChange={setSensitivity}
                                        />
                                    </div>

                                    {/* Show Camera */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-light flex items-center gap-2">
                                            {showHandCamera ? <Eye size={14} /> : <EyeOff size={14} />} Camera Feed
                                        </span>
                                        <Toggle
                                            value={showHandCamera}
                                            onChange={setShowHandCamera}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === "face" && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                    <h3 className="text-sm font-semibold mb-2 text-white/80">FACE TRACKING</h3>

                                    {/* Toggle Tracking */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-light flex items-center gap-2">
                                            <User size={14} /> Tracking
                                        </span>
                                        <Toggle
                                            value={faceTrackingEnabled}
                                            onChange={setFaceTrackingEnabled}
                                        />
                                    </div>

                                    {/* Show Camera */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-light flex items-center gap-2">
                                            {showFaceDebug ? <Eye size={14} /> : <EyeOff size={14} />} Debug View
                                        </span>
                                        <Toggle
                                            value={showFaceDebug}
                                            onChange={setShowFaceDebug}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === "voice" && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                                    <h3 className="text-sm font-semibold mb-2 text-white/80">VOICE INPUT</h3>

                                    {/* Simulate Voice Config Toggle */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-light flex items-center gap-2">
                                            <Mic size={14} /> Simulate Commands
                                        </span>
                                        <Toggle
                                            value={simulateVoiceConfig}
                                            onChange={setSimulateVoiceConfig}
                                        />
                                    </div>

                                    <p className="text-[10px] text-white/40 leading-tight">
                                        Enable this to test voice commands without microphone input.
                                    </p>

                                    {simulateVoiceConfig && (
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            {[
                                                "next Tuesday",
                                                "at 3 PM",
                                                "in the conference room",
                                                "tomorrow",
                                                "with the design team",
                                                "online"
                                            ].map((cmd) => (
                                                <button
                                                    key={cmd}
                                                    onClick={() => onSimulateVoiceCommand(cmd)}
                                                    className="px-2 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs hover:bg-white/10 transition-all text-left truncate"
                                                    title={`Simulate "${cmd}"`}
                                                >
                                                    "{cmd}"
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Reusable UI Components

const Toggle: React.FC<{ value: boolean; onChange: (val: boolean) => void }> = ({ value, onChange }) => (
    <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full p-1 transition-colors ${value ? "bg-blue-500" : "bg-white/20"
            }`}
    >
        <div
            className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${value ? "translate-x-4" : ""
                }`}
        />
    </button>
);

const Slider: React.FC<{ value: number; min: number; max: number; onChange: (val: number) => void }> = ({ value, min, max, onChange }) => (
    <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
    />
);

const SegmentedControl: React.FC<{
    options: { value: string; label: string; icon?: React.ReactNode }[];
    value: string;
    onChange: (val: string) => void
}> = ({ options, value, onChange }) => (
    <div className="flex bg-white/10 rounded-lg p-1">
        {options.map((opt) => (
            <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`flex-1 py-1.5 text-xs rounded-md transition-all flex items-center justify-center gap-1 ${value === opt.value
                    ? "bg-white/20 shadow-sm text-white"
                    : "text-white/40 hover:text-white/60"
                    }`}
            >
                {opt.icon}
                {opt.label}
            </button>
        ))}
    </div>
);
