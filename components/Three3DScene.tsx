import React, { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  Environment,
  PerspectiveCamera,
  Grid,
  Box,
  Torus,
  Float,
  OrbitControls,
} from "@react-three/drei";
import { MotionValue } from "motion/react";
import * as THREE from "three";

// Props
interface Three3DSceneProps {
  headX: MotionValue<number>;
  headY: MotionValue<number>;
  headZ?: MotionValue<number>;
  smoothingEnabled: boolean;
  renderMode?: "gltf" | "splat"; // Default to gltf
  modelUrl?: string;
  sceneSettings?: {
    cameraX: number;
    cameraY: number;
    cameraZ: number;
    rotationX: number;
    rotationY: number;
    targetX: number;
    targetY: number;
    targetZ: number;
  };
  modelSettings?: {
    scale: number;
    positionX: number;
    positionY: number;
    positionZ: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
  };
}

// Camera Controller Component (Optional - works with OrbitControls)
const CameraController = ({
  headX,
  headY,
  headZ,
  sceneSettings,
  enableHeadTracking,
}: {
  headX: MotionValue<number>;
  headY: MotionValue<number>;
  headZ?: MotionValue<number>;
  sceneSettings?: Three3DSceneProps["sceneSettings"];
  enableHeadTracking?: boolean;
}) => {
  const { camera } = useThree();

  // Apply sceneSettings to camera when they change
  useEffect(() => {
    if (sceneSettings && !enableHeadTracking) {
      // Directly set camera position when not using head tracking
      camera.position.set(
        sceneSettings.cameraX ?? 0,
        sceneSettings.cameraY ?? 0,
        sceneSettings.cameraZ ?? 5
      );
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [sceneSettings, enableHeadTracking, camera]);

  useFrame(() => {
    // Only apply head tracking if enabled (disabled when using manual controls)
    if (!enableHeadTracking) return;

    // Read current motion values
    const x = headX.get();
    const y = headY.get();
    const z = headZ?.get() || 0;

    // Base Settings (Manual Override)
    const baseX = sceneSettings?.cameraX ?? 0;
    const baseY = sceneSettings?.cameraY ?? 0;
    const baseZ = sceneSettings?.cameraZ ?? 5;

    // Parallax Sensitivity
    const moveRange = 3.0;
    const depthRange = 4.0;

    // Calculate Target Positions
    const targetX = baseX + x * moveRange;
    const targetY = baseY + y * moveRange;
    const targetZ = baseZ - z * depthRange;

    // Smooth interpolation
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.1);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1);

    camera.lookAt(0, 0, 0);
  });

  return null;
};

// Default Placeholder Scene (if no GLTF)
const DefaultScene = () => {
  return (
    <group>
      <Grid
        position={[0, -2, 0]}
        args={[20, 20]}
        cellColor="#ffffff"
        sectionColor="#ffffff"
        fadeDistance={10}
        fadeStrength={1}
      />
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <Box position={[-2, 0, 0]} args={[1, 1, 1]}>
          <meshStandardMaterial color="hotpink" />
        </Box>
      </Float>
      <Float speed={3} rotationIntensity={1.5} floatIntensity={1}>
        <Torus position={[2, 0, -2]} args={[0.8, 0.2, 16, 32]}>
          <meshStandardMaterial color="cyan" />
        </Torus>
      </Float>
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={2}>
        <Box position={[0, 1, -3]} args={[0.5, 3, 0.5]} rotation={[0, 0, 0.5]}>
          <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={0.5} />
        </Box>
      </Float>

      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
    </group>
  );
};

// GLTF Loader Component
const ModelLoader = ({ url }: { url: string }) => {
  // Catch errors if file doesn't exist
  const [error, setError] = useState(false);

  // We wrap useGLTF in a try/catch block conceptually, but hooks can't be wrapped.
  // Instead we use `useGLTF.preload` or just handle the error boundary.
  // For simplicity, we'll try to load. If it fails, the ErrorBoundary above should catch it?
  // R3F doesn't have a built-in simple "try load" hook.

  // Workaround: We will assume the file exists for the prototype.
  // To make it robust, we should probably check if it exists or use a fallback.
  // I will just use the DefaultScene if the URL is "placeholder".

  if (url === "placeholder") return <DefaultScene />;

  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1} />;
};

// Main Component
export const Three3DScene: React.FC<Three3DSceneProps> = ({
  headX,
  headY,
  headZ,
  renderMode = "gltf",
  modelUrl,
  sceneSettings,
  modelSettings,
}) => {
  const [enableHeadTracking, setEnableHeadTracking] = useState(false);
  const [orbitControlsRef, setOrbitControlsRef] = useState<any>(null);

  // Update OrbitControls target when sceneSettings change
  useEffect(() => {
    if (orbitControlsRef && sceneSettings) {
      const targetX = sceneSettings.targetX ?? 0;
      const targetY = sceneSettings.targetY ?? 0;
      const targetZ = sceneSettings.targetZ ?? 0;
      orbitControlsRef.target.set(targetX, targetY, targetZ);
      orbitControlsRef.update();
    }
  }, [orbitControlsRef, sceneSettings?.targetX, sceneSettings?.targetY, sceneSettings?.targetZ]);

  const handleResetCamera = () => {
    if (orbitControlsRef) {
      // Reset camera to user-found coordinates
      // CAM: [0.45, 0.26, 0.79]
      const defaultX = renderMode === "splat" && modelUrl?.includes("Livingroom") ? 0.45 : (sceneSettings?.cameraX ?? 0);
      const defaultY = renderMode === "splat" && modelUrl?.includes("Livingroom") ? 0.26 : (sceneSettings?.cameraY ?? 0);
      const defaultZ = renderMode === "splat" && modelUrl?.includes("Livingroom") ? 0.79 : (sceneSettings?.cameraZ ?? 10);

      // Target: [0.75, 0.44, 0.11]
      const targetX = renderMode === "splat" && modelUrl?.includes("Livingroom") ? 0.75 : (sceneSettings?.targetX ?? 0);
      const targetY = renderMode === "splat" && modelUrl?.includes("Livingroom") ? 0.44 : (sceneSettings?.targetY ?? 0);
      const targetZ = renderMode === "splat" && modelUrl?.includes("Livingroom") ? 0.11 : (sceneSettings?.targetZ ?? 0);

      orbitControlsRef.object.position.set(defaultX, defaultY, defaultZ);
      orbitControlsRef.target.set(targetX, targetY, targetZ);
      orbitControlsRef.update();
    }
  };

  return (
    <div className="w-full h-full relative">
      {/* Camera Controls Overlay */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <button
          onClick={handleResetCamera}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white text-xs font-medium transition-all border border-white/20"
        >
          Reset Camera
        </button>
        <button
          onClick={() => setEnableHeadTracking(!enableHeadTracking)}
          className={`px-3 py-2 backdrop-blur-md rounded-lg text-white text-xs font-medium transition-all border ${enableHeadTracking
            ? "bg-blue-500/30 border-blue-400/50"
            : "bg-white/10 hover:bg-white/20 border-white/20"
            }`}
        >
          {enableHeadTracking ? "Head Tracking ON" : "Head Tracking OFF"}
        </button>
      </div>

      {/* Optimized Canvas settings for better performance on high-res displays */}
      <Canvas dpr={[1, 1.5]} gl={{ antialias: false, alpha: false }}>
        <PerspectiveCamera
          makeDefault
          position={
            renderMode === "splat" && modelUrl?.includes("Livingroom")
              ? [0.45, 0.26, 0.79]  // User-verified coordinates
              : [0, 0, 10]
          }
          fov={50}
          near={0.01}
          far={100000}
        />

        {/* OrbitControls for free camera movement */}
        <OrbitControls
          ref={setOrbitControlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={0.01}
          maxDistance={100000}
          zoomSpeed={2}
          enabled={!enableHeadTracking}
          makeDefault
          onChange={() => {
            if (orbitControlsRef) {
              const p = orbitControlsRef.object.position;
              const t = orbitControlsRef.target;
              console.log(`Camera: pos(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) target(${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)})`);
            }
          }}
        />

        <CameraController
          headX={headX}
          headY={headY}
          headZ={headZ}
          sceneSettings={sceneSettings}
          enableHeadTracking={enableHeadTracking}
        />

        <Suspense fallback={null}>
          {renderMode === "gltf" && (
            // We point to a file that might not exist yet.
            // Users should place 'scene.glb' in 'public/models/'.
            // For now, I'll default to the internal scene to avoid crashing until they do.
            // I will add a toggle or logic to check.
            // Let's use the DefaultScene by default for the demo.
            <DefaultScene />
            // To use real GLTF: <ModelLoader url="/models/scene.glb" />
          )}



          <Environment preset="city" />
        </Suspense>
      </Canvas>

      {/* Instructions Overlay */}
      <div className="absolute bottom-12 right-4 text-xs text-white/30 text-right pointer-events-none flex flex-col items-end gap-1">
        <div>{renderMode === "gltf" ? "3D GLTF Mode" : "Gaussian Splat Mode"}</div>
        <div className="text-white/20">
          {enableHeadTracking ? "Using head tracking" : "Left click + drag to rotate • Right click + drag to pan • Scroll to zoom"}
        </div>
      </div>
    </div>
  );
};
