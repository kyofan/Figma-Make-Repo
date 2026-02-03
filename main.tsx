import React, { useState, useEffect, useCallback, useRef } from "react";
import { defineProperties } from "figma:react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { TextEditor } from "./components/TextEditor";
import { GazeIndicator } from "./components/GazeIndicator";
import { SpeechStatus } from "./components/VoiceVisualizer";


import {
  BackgroundManager,
  BackgroundType,
} from "./components/BackgroundManager";
import { BackgroundToggle } from "./components/BackgroundToggle";
import { HandTrackingManager } from "./components/HandTrackingManager";
import { FaceTrackingManager } from "./components/FaceTrackingManager";
import { SettingsPanel } from "./components/SettingsPanel";

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
    useState<BackgroundType>("mixed-reality");

  // --- Hand Tracking State ---
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(true);
  const [handDominantHand, setHandDominantHand] = useState<"Left" | "Right">("Left");
  const [handTrackingMode, setHandTrackingMode] = useState<"Center" | "Relative">("Center");
  const [handSensitivity, setHandSensitivity] = useState(25);
  const [showHandCamera, setShowHandCamera] = useState(true);

  // --- Face Tracking State ---
  const [faceTrackingEnabled, setFaceTrackingEnabled] = useState(true);
  const [headTrackingSmoothing, setHeadTrackingSmoothing] = useState(true);
  const [showFaceDebug, setShowFaceDebug] = useState(false);

  // --- Dev State ---
  const cameraParamsRef = useRef<{ cam: any, target: any, headZ: number } | null>(null);
  const [cameraDebugInfo, setCameraDebugInfo] = useState<string>("");

  // Head Tracking State (MotionValues for performance)
  const headX = useMotionValue(0);
  const headY = useMotionValue(0);
  const headZ = useMotionValue(0);
  // UI Depth / Parallax Transforms (for 2D elements)
  const smoothX = useSpring(headX, { stiffness: 100, damping: 20 });
  const smoothY = useSpring(headY, { stiffness: 100, damping: 20 });

  const activeHeadX = headTrackingSmoothing ? smoothX : headX;
  const activeHeadY = headTrackingSmoothing ? smoothY : headY;

  const uiRotateX = useTransform(activeHeadY, (y) => y * 5); // Max 5deg tilt
  const uiRotateY = useTransform(activeHeadX, (x) => x * -5); // Max 5deg tilt
  const uiX = useTransform(activeHeadX, (x) => x * -15); // Horizontal parallax
  const uiY = useTransform(activeHeadY, (y) => y * -15); // Vertical parallax

  const handleHeadMove = useCallback(
    (pos: { x: number; y: number; z: number }) => {
      headX.set(pos.x);
      headY.set(pos.y);
      // z is usually distance. We might need to scale it or just pass it raw.
      // FaceTrackingManager returns rawZ.
      headZ.set(pos.z);
    },
    [headX, headY, headZ],
  );

  const handleBackgroundChange = (newType: BackgroundType) => {
    setBackgroundType(newType);
  };

  const handleListeningChange = (listening: boolean, data?: SpeechStatus) => {
    setIsListening(listening);
    if (data) {
      setSpeechData(data);
    }
  };

  const handleCameraUpdate = useCallback((cam: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) => {
    cameraParamsRef.current = {
      cam,
      target,
      headZ: headZ.get()
    };
    // Optional: Update debug string less frequently if performance is key
    setCameraDebugInfo(`CAM: [${cam.x.toFixed(2)}, ${cam.y.toFixed(2)}, ${cam.z.toFixed(2)}]
TGT: [${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}]
Head Z: ${headZ.get().toFixed(3)}`);
  }, [headZ]);

  const handleCopyParams = useCallback(() => {
    if (cameraParamsRef.current) {
      const { cam, target, headZ } = cameraParamsRef.current;
      const text = `CAM: [${cam.x.toFixed(2)}, ${cam.y.toFixed(2)}, ${cam.z.toFixed(2)}]
TGT: [${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}]
Head Z: ${headZ.toFixed(3)}`;

      navigator.clipboard.writeText(text);
      // Just a simple alert for now, or use a toast if available
      alert("Camera params copied to clipboard!");
    } else {
      alert("No camera data available to copy.");
    }
  }, []);

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
        headZ={headZ}
        smoothingEnabled={headTrackingSmoothing}
        onCameraUpdate={handleCameraUpdate}
      />
      <HandTrackingManager
        isTracking={handTrackingEnabled}
        targetHand={handDominantHand}
        trackingMode={handTrackingMode}
        sensitivity={handSensitivity}
        showCamera={showHandCamera}
      />
      <FaceTrackingManager
        onHeadMove={handleHeadMove}
        isTracking={faceTrackingEnabled}
        showDebugView={showFaceDebug}
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

        </header>

        <div className="relative">
          <TextEditor
            initialText={initialText}
            onListeningChange={handleListeningChange}
          />
        </div>
      </motion.div>

      <GazeIndicator isActive={showGazeIndicator} />



      <SettingsPanel
        handTrackingEnabled={handTrackingEnabled}
        setHandTrackingEnabled={setHandTrackingEnabled}
        handDominantHand={handDominantHand}
        setHandDominantHand={setHandDominantHand}
        handTrackingMode={handTrackingMode}
        setHandTrackingMode={setHandTrackingMode}
        handSensitivity={handSensitivity}
        setHandSensitivity={setHandSensitivity}
        showHandCamera={showHandCamera}
        setShowHandCamera={setShowHandCamera}
        faceTrackingEnabled={faceTrackingEnabled}
        setFaceTrackingEnabled={setFaceTrackingEnabled}
        headTrackingSmoothing={headTrackingSmoothing}
        setHeadTrackingSmoothing={setHeadTrackingSmoothing}
        showFaceDebug={showFaceDebug}
        setShowFaceDebug={setShowFaceDebug}
        onCopyParams={handleCopyParams}
        cameraDebugInfo={cameraDebugInfo}
      />

      {/* Control panel area in top left */}
      <div className="absolute top-4 left-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 }}
        >
          <BackgroundToggle
            currentType={backgroundType}
            onTypeChange={handleBackgroundChange}
          />
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-6 right-6 flex items-center gap-3 text-white/40 font-light pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1 }}
      >
        <div className="flex flex-col items-end">
          <span className="text-[1rem] whitespace-nowrap">Prototype for Spatial Computing • v2.6.1</span>
        </div>
        <div className="h-8 w-px bg-white/10 mx-1" />
        <img
          src="media/MHCID-LOGO.png"
          alt="MHCID Logo"
          className="h-[4rem] w-auto brightness-200 contrast-125"
        />
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
