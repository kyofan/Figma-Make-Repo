import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

interface CameraContextType {
    stream: MediaStream | null;
    isLoading: boolean;
    error: string | null;
    isReady: boolean;
    videoRef: React.RefObject<HTMLVideoElement>;
    isVideoReady: boolean;
}

const CameraContext = createContext<CameraContextType>({
    stream: null,
    isLoading: true,
    error: null,
    isReady: false,
    videoRef: { current: null },
    isVideoReady: false
});

export const useCamera = () => useContext(CameraContext);

export const CameraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isVideoReady, setIsVideoReady] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const originalGetUserMediaRef = useRef<typeof navigator.mediaDevices.getUserMedia | null>(null);

    useEffect(() => {
        // Store original function once
        if (!originalGetUserMediaRef.current) {
            originalGetUserMediaRef.current = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        }

        const initCamera = async () => {
            try {
                setIsLoading(true);
                // Request camera with ideal constraints for MediaPipe/WebGazer
                const constraints = {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user"
                    },
                    audio: false
                };

                const mediaStream = await originalGetUserMediaRef.current!(constraints);
                setStream(mediaStream);
                setIsLoading(false);

                // Install Shim to intercept subsequent calls (e.g. from WebGazer)
                navigator.mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
                    // Check if request includes video
                    if (constraints && constraints.video) {
                        if (mediaStream.active) {
                            console.log("CameraProvider: Intercepting getUserMedia, returning shared stream clone.");
                            return mediaStream.clone();
                        }
                    }
                    // Fallback to original for audio-only or if stream inactive
                    return originalGetUserMediaRef.current!(constraints);
                };

            } catch (err: any) {
                console.error("CameraProvider: Failed to init camera", err);
                setError(err.message || "Failed to access camera");
                setIsLoading(false);
            }
        };

        initCamera();

        return () => {
            // Cleanup: Restore original getUserMedia
            if (originalGetUserMediaRef.current) {
                navigator.mediaDevices.getUserMedia = originalGetUserMediaRef.current;
            }

            // Stop tracks on unmount
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Handle video element readiness
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;

            const handleCanPlay = () => {
                setIsVideoReady(true);
            };

            videoRef.current.addEventListener('canplay', handleCanPlay);
            videoRef.current.play().catch(e => console.error("CameraProvider: Auto-play failed", e));

            return () => {
                if (videoRef.current) {
                    videoRef.current.removeEventListener('canplay', handleCanPlay);
                }
            };
        } else {
            setIsVideoReady(false);
        }
    }, [stream]);

    return (
        <CameraContext.Provider value={{
            stream,
            isLoading,
            error,
            isReady: !!stream && !isLoading,
            videoRef,
            isVideoReady
        }}>
            {/* Shared Hidden Video Element - The Source of Truth */}
            <video
                ref={videoRef}
                id="shared-camera-feed"
                autoPlay
                playsInline
                muted
                className="fixed opacity-0 pointer-events-none"
                style={{ top: -9999, left: -9999, width: 640, height: 480 }}
            />
            {children}
        </CameraContext.Provider>
    );
};
