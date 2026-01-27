import React, { useState, useEffect } from 'react';
import { defineProperties } from "figma:react";
import { motion } from 'motion/react';
import { TextEditor } from './components/TextEditor';
import { GazeIndicator } from './components/GazeIndicator';
import { VoiceVisualizer, SpeechStatus } from './components/VoiceVisualizer';
import { InfoPanel } from './components/InfoPanel';
import SpaceKey from './components/SpaceKey';

export default function SpatialTextInput({
  showGazeIndicator = true,
  initialText = "Could we meet on Monday at the Studio?"
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpaceKeyPressed, setIsSpaceKeyPressed] = useState(false);
  const [speechData, setSpeechData] = useState<SpeechStatus>({ text: '', status: 'idle' });
  const [micPermissionStatus, setMicPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  
  // Handle spacebar visual indicator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceKeyPressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceKeyPressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleListeningChange = (listening: boolean, data?: SpeechStatus) => {
    setIsListening(listening);
    if (data) {
      setSpeechData(data);
    }
  };

  // Request microphone permissions explicitly
  const requestMicrophonePermission = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setMicPermissionStatus('granted');
      })
      .catch(() => {
        setMicPermissionStatus('denied');
      });
  };

  // Check microphone permission on mount
  useEffect(() => {
    navigator.permissions?.query({ name: 'microphone' as PermissionName })
      .then(permissionStatus => {
        setMicPermissionStatus(permissionStatus.state);
        
        permissionStatus.onchange = () => {
          setMicPermissionStatus(permissionStatus.state);
        };
      })
      .catch(error => {
        console.log('Permission API not supported, will check when starting recognition');
      });
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* visionOS-style background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-900 to-black z-0" />
      
      {/* Subtle particle/light effect in background */}
      <div className="absolute inset-0 z-0 opacity-20">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-48 h-48 rounded-full bg-gradient-to-r from-blue-400/30 to-purple-400/30 blur-3xl"
            initial={{
              x: Math.random() * 100 - 50 + '%',
              y: Math.random() * 100 - 50 + '%',
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              x: [
                Math.random() * 100 - 50 + '%',
                Math.random() * 100 - 50 + '%',
                Math.random() * 100 - 50 + '%',
              ],
              y: [
                Math.random() * 100 - 50 + '%',
                Math.random() * 100 - 50 + '%',
                Math.random() * 100 - 50 + '%',
              ],
            }}
            transition={{
              duration: 20 + Math.random() * 30,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div
        className="w-full max-w-4xl z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header className="text-center mb-4">
          <motion.h1 
            className="text-3xl font-light mb-2 text-white/90"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            The Next Paradigm on Input
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
      <VoiceVisualizer 
        isListening={isListening}
        speechData={speechData}
        micPermissionStatus={micPermissionStatus}
        onRequestMicPermission={requestMicrophonePermission}
      />
      <InfoPanel />
      <SpaceKey active={isSpaceKeyPressed} />

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
        v1.1.13
      </motion.div>
    </div>
  );
}

defineProperties(SpatialTextInput, {
  showGazeIndicator: {
    label: "Show gaze indicator",
    type: "boolean",
    defaultValue: true
  },
  initialText: {
    label: "Initial text",
    type: "string",
    defaultValue: "Could we meet on Monday at the Studio?"
  }
});