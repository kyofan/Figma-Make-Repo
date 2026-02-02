import React, { useState, useEffect, useCallback } from "react";
import { defineProperties } from "figma:react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { TextEditor } from "./components/TextEditor";
import { GazeIndicator } from "./components/GazeIndicator";
import { VoiceVisualizer, SpeechStatus } from "./components/VoiceVisualizer";
import { InfoPanel } from "./components/InfoPanel";

import {
  BackgroundManager,
  BackgroundType,
} from "./components/BackgroundManager";
import { BackgroundToggle } from "./components/BackgroundToggle";
import { ParallaxSettings } from "./components/ParallaxSettings";
import { HandTrackingManager } from "./components/HandTrackingManager";
import { FaceTrackingManager } from "./components/FaceTrackingManager";

export default function SpatialTextInput({
  showGazeIndicator = true,
  initialText = "Could we meet on Monday at the Studio?",
}) {
  const [isListening, setIsListening] = useState(false);
  const [speechData, setSpeechData] = useState<SpeechStatus>({
    text: "",
    status: "idle",
  });
  const [micPermissionStatus, setMicPermissionStatus] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");
  const [backgroundType, setBackgroundType] =
    useState<BackgroundType>("original");

  // Parallax Settings (A/B Testing)
  const [smoothingEnabled, setSmoothingEnabled] = useState(true);
  const [parallaxIntensity, setParallaxIntensity] = useState(50);
  const [renderMode, setRenderMode] = useState<"gltf" | "splat">("gltf");

  // Head Tracking State (MotionValues for performance)
  const headX = useMotionValue(0);
  const headY = useMotionValue(0);

  // UI Depth / Parallax Transforms
  const smoothX = useSpring(headX, { stiffness: 100, damping: 20 });
  const smoothY = useSpring(headY, { stiffness: 100, damping: 20 });

  const activeHeadX = smoothingEnabled ? smoothX : headX;
  const activeHeadY = smoothingEnabled ? smoothY : headY;

  const uiRotateX = useTransform(activeHeadY, (y) => y * 5); // Max 5deg tilt
  const uiRotateY = useTransform(activeHeadX, (x) => x * -5); // Max 5deg tilt
  const uiX = useTransform(activeHeadX, (x) => x * -15); // Horizontal parallax
  const uiY = useTransform(activeHeadY, (y) => y * -15); // Vertical parallax

  const handleHeadMove = useCallback((pos: { x: number; y: number; z: number }) => {
    headX.set(pos.x);
    headY.set(pos.y);
  }, [headX, headY]);

  const handleListeningChange = (listening: boolean, data?: SpeechStatus) => {
    setIsListening(listening);
    if (data) {
      setSpeechData(data);
    }
  };

  // Request microphone permissions explicitly
  const requestMicrophonePermission = () => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        setMicPermissionStatus("granted");
      })
      .catch(() => {
        setMicPermissionStatus("denied");
      });
  };

  // Check microphone permission on mount
  useEffect(() => {
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((permissionStatus) => {
        setMicPermissionStatus(permissionStatus.state);

        permissionStatus.onchange = () => {
          setMicPermissionStatus(permissionStatus.state);
        };
      })
      .catch((error) => {
        console.log(
          "Permission API not supported, will check when starting recognition",
        );
      });
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden perspective-[1200px]">
      <BackgroundManager
        type={backgroundType}
        headX={headX}
        headY={headY}
        smoothingEnabled={smoothingEnabled}
        parallaxIntensity={parallaxIntensity}
        renderMode={renderMode}
      />
      <HandTrackingManager />
      <FaceTrackingManager onHeadMove={handleHeadMove} />

      <ParallaxSettings
        smoothingEnabled={smoothingEnabled}
        setSmoothingEnabled={setSmoothingEnabled}
        intensity={parallaxIntensity}
        setIntensity={setParallaxIntensity}
        renderMode={renderMode}
        setRenderMode={setRenderMode}
      />

      <motion.div
        className="w-full max-w-4xl z-10 origin-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          rotateX: uiRotateX,
          rotateY: uiRotateY,
          x: uiX,
          y: uiY,
        }}
        transition={{ duration: 0.5 }}
      >
        <header className="text-center mb-4">
          <motion.h1
            className="text-3xl font-light mb-2 text-white/90"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            The Next Paradigm of Input
          </motion.h1>
          <motion.p
            className="text-lg text-white/60 font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Look to Select, Speak to Refine
          </motion.p>
        </header>

        <div className="relative">
          <TextEditor
            initialText={initialText}
            onListeningChange={handleListeningChange}
          />
        </div>
      </motion.div>

      <GazeIndicator isActive={showGazeIndicator} />

      <InfoPanel />

      {/* Control panel area in top left */}
      <div className="absolute top-4 left-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
        >
          <BackgroundToggle
            currentType={backgroundType}
            onTypeChange={setBackgroundType}
          />
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-4 left-4 text-sm text-white/40 font-light"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1 }}
      >
        Prototype for Apple Vision Pro • Spatial Computing
      </motion.div>

      {/* Version number in bottom right corner */}
      <motion.div
        className="absolute bottom-4 right-4 text-sm text-white/40 font-light"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1 }}
      >
        v2.1.0
      </motion.div>
    </div>
  );
}

defineProperties(SpatialTextInput, {
  showGazeIndicator: {
    label: "Show gaze indicator",
    type: "boolean",
    defaultValue: true,
  },
  initialText: {
    label: "Initial text",
    type: "string",
    defaultValue: "Could we meet on Monday at the Studio?",
  },
});
