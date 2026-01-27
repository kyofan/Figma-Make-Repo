import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface SpeechStatus {
  text: string;
  status: "idle" | "listening" | "processing" | "error";
  error?: string;
}

interface VoiceVisualizerProps {
  isListening: boolean;
  speechData?: SpeechStatus;
  micPermissionStatus?: "granted" | "denied" | "prompt" | "unknown";
  onRequestMicPermission?: () => void;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isListening,
  speechData = { text: "", status: "idle" },
  micPermissionStatus = "unknown",
  onRequestMicPermission,
}) => {
  const [barHeights, setBarHeights] = useState<number[]>(Array(16).fill(5));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize audio analyser when listening starts
  useEffect(() => {
    if (isListening) {
      let stream: MediaStream | null = null;

      const initializeAudioAnalyser = async () => {
        try {
          // Try to get microphone access
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });

          // Create audio context and analyser
          const AudioContext =
            window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext();
          analyserRef.current = audioContextRef.current.createAnalyser();

          // Connect microphone to analyser
          const source =
            audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);

          // Configure analyser
          analyserRef.current.fftSize = 64;
          const bufferLength = analyserRef.current.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);

          // Start visualization loop
          updateVisualization();
        } catch (err) {
          console.error("Error accessing microphone:", err);
          // Fall back to animated bars
        }
      };

      const updateVisualization = () => {
        if (!isListening) return;

        if (analyserRef.current && dataArrayRef.current) {
          // Get frequency data from microphone
          // @ts-ignore - Common mismatch between newer and older Uint8Array type definitions
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);

          // Map frequency data to bar heights (using just a subset of frequencies)
          const newHeights = Array(16)
            .fill(0)
            .map((_, i) => {
              const dataIndex = Math.floor(
                i * (dataArrayRef.current!.length / 16),
              );
              const value = dataArrayRef.current![dataIndex];
              // Scale the value to appropriate height (5-40px)
              return 5 + (value / 255) * 35;
            });

          setBarHeights(newHeights);
        } else {
          // If no audio analyser, use random animation
          setBarHeights(
            Array(16)
              .fill(0)
              .map(() => 5 + Math.random() * 20),
          );
        }

        animationFrameRef.current = requestAnimationFrame(updateVisualization);
      };

      // Try to initialize audio analyser
      initializeAudioAnalyser();

      // Clean up on component unmount or when isListening changes
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        if (audioContextRef.current) {
          audioContextRef.current.close();
        }

        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }
  }, [isListening]);

  return (
    <>
      {/* Microphone permission status - fixed position */}
      <AnimatePresence>
        {micPermissionStatus === "denied" && (
          <motion.div
            key="mic-denied"
            className="fixed top-24 left-1/2 transform -translate-x-1/2 mb-4 px-4 py-2 bg-red-500/20 backdrop-blur-md border border-red-400/30 rounded-lg text-white/90 font-light text-sm z-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <p className="mb-2">
              Microphone access denied. Voice input won't work.
            </p>
            <button
              onClick={onRequestMicPermission}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-white/80 text-xs transition-colors"
            >
              Request Access
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice visualization and detected speech display - fixed position */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            key="voice-visualizer"
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Real-time speech text display */}
            {speechData?.text && (
              <motion.div
                className="mb-4 px-6 py-3 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 rounded-xl text-white font-light w-80 text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-white/50 text-xs mb-1">
                  Detected speech:
                </div>
                <div className="text-lg">
                  {speechData.text || (
                    <span className="text-white/30 italic">Listening...</span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Audio visualizer bars */}
            <motion.div
              className="flex items-end space-x-1 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-5 py-3 shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              {barHeights.map((height, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-gradient-to-t from-blue-400 to-blue-300 rounded-full"
                  animate={{ height }}
                  transition={{
                    duration: 0.1,
                    ease: "easeOut",
                  }}
                  style={{ height: `${height}px` }}
                />
              ))}
              <span className="ml-4 text-white/80 font-light text-sm">
                Listening...
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
