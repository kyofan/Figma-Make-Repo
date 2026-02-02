import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings2, Zap, Layers, Box, Cuboid } from "lucide-react";

interface ParallaxSettingsProps {
  smoothingEnabled: boolean;
  setSmoothingEnabled: (val: boolean) => void;
  intensity: number;
  setIntensity: (val: number) => void;
  renderMode: "gltf" | "splat";
  setRenderMode: (val: "gltf" | "splat") => void;
  sceneSettings?: {
    cameraX: number;
    cameraY: number;
    cameraZ: number;
    rotationX: number;
    rotationY: number;
  };
  setSceneSettings?: React.Dispatch<
    React.SetStateAction<{
      cameraX: number;
      cameraY: number;
      cameraZ: number;
      rotationX: number;
      rotationY: number;
    }>
  >;
}

export const ParallaxSettings: React.FC<ParallaxSettingsProps> = ({
  smoothingEnabled,
  setSmoothingEnabled,
  intensity,
  setIntensity,
  renderMode,
  setRenderMode,
  sceneSettings,
  setSceneSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg hover:bg-white/20 transition-all"
        title="Parallax Settings"
      >
        <Settings2 size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="mb-2 p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white w-72 shadow-2xl"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
          >
            <h3 className="text-sm font-semibold mb-4 text-white/80 uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} /> Parallax Config
            </h3>

            <div className="space-y-5">
              {/* Smoothing Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-light flex items-center gap-2">
                  <Zap size={14} /> Smoothing
                </span>
                <button
                  onClick={() => setSmoothingEnabled(!smoothingEnabled)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors ${
                    smoothingEnabled ? "bg-blue-500" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      smoothingEnabled ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Intensity Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-light">
                  <span className="flex items-center gap-2">Intensity</span>
                  <span className="text-xs text-white/60">{intensity}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              <div className="h-px bg-white/10" />

              {/* Render Mode Toggle */}
              <div className="space-y-2">
                <span className="text-sm font-light flex items-center gap-2">
                  <Box size={14} /> 3D Render Mode
                </span>
                <div className="flex bg-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setRenderMode("gltf")}
                    className={`flex-1 py-1.5 text-xs rounded-md transition-all flex items-center justify-center gap-1 ${
                      renderMode === "gltf"
                        ? "bg-white/20 shadow-sm text-white"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    <Cuboid size={12} /> GLTF
                  </button>
                  <button
                    onClick={() => setRenderMode("splat")}
                    className={`flex-1 py-1.5 text-xs rounded-md transition-all flex items-center justify-center gap-1 ${
                      renderMode === "splat"
                        ? "bg-white/20 shadow-sm text-white"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    <Box size={12} /> Splat
                  </button>
                </div>
                <p className="text-[10px] text-white/30 leading-tight">
                  GLTF: Uses /public/models/scene.glb
                  <br />
                  Splat: Uses Gaussian Splatting (Photo-real)
                </p>
              </div>

              {sceneSettings && setSceneSettings && (
                <>
                  <div className="h-px bg-white/10" />
                  <div className="space-y-3">
                    <span className="text-sm font-light flex items-center gap-2">
                      <Box size={14} /> Viewport
                    </span>

                    {/* Camera X */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-light text-white/60">
                        <span>Cam X</span>
                        <span>{sceneSettings.cameraX.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.1"
                        value={sceneSettings.cameraX}
                        onChange={(e) =>
                          setSceneSettings((prev) => ({
                            ...prev,
                            cameraX: Number(e.target.value),
                          }))
                        }
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      />
                    </div>

                    {/* Camera Y */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-light text-white/60">
                        <span>Cam Y</span>
                        <span>{sceneSettings.cameraY.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.1"
                        value={sceneSettings.cameraY}
                        onChange={(e) =>
                          setSceneSettings((prev) => ({
                            ...prev,
                            cameraY: Number(e.target.value),
                          }))
                        }
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      />
                    </div>

                    {/* Camera Z */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-light text-white/60">
                        <span>Cam Z</span>
                        <span>{sceneSettings.cameraZ.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="0.1"
                        value={sceneSettings.cameraZ}
                        onChange={(e) =>
                          setSceneSettings((prev) => ({
                            ...prev,
                            cameraZ: Number(e.target.value),
                          }))
                        }
                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
