import React, { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  Splat,
  Environment,
  PerspectiveCamera,
  Grid,
  Box,
  Torus,
  Float,
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
  };
}

// Camera Controller Component
const CameraController = ({
  headX,
  headY,
  headZ,
  sceneSettings,
}: {
  headX: MotionValue<number>;
  headY: MotionValue<number>;
  headZ?: MotionValue<number>;
  sceneSettings?: Three3DSceneProps["sceneSettings"];
}) => {
  const { camera } = useThree();

  useFrame(() => {
    // Read current motion values
    const x = headX.get();
    const y = headY.get();
    const z = headZ?.get() || 0;

    // Base Settings (Manual Override)
    const baseX = sceneSettings?.cameraX ?? 0;
    const baseY = sceneSettings?.cameraY ?? 0;
    const baseZ = sceneSettings?.cameraZ ?? 5;

    // Parallax Sensitivity
    const moveRange = 2.0;
    const depthRange = 3.0; // How much Z movement affects camera Z

    // Calculate Target Positions
    const targetX = baseX + x * moveRange;
    const targetY = baseY + y * moveRange;
    // For Z: If user moves head forward (negative Z in some conventions, or positive depending on mapping), camera moves forward (negative Z).
    // Assuming 'z' input is roughly -1 (far) to 1 (close).
    // If z is 1 (close), we want camera closer (smaller Z value).
    const targetZ = baseZ - z * depthRange;

    // Smooth interpolation
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.1);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1);

    // Look at center + rotation offset logic could go here
    // For now, look at center (0,0,0) is standard for parallax
    // To implement manual rotation, we could look at a shifted target
    // target = (0,0,0) + rotationOffset
    camera.lookAt(0, 0, 0);

    // Apply manual rotation offsets on top of lookAt if desired
    // (Note: lookAt overwrites quaternion, so we'd need to rotate a parent or offset lookAt target)
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
        <Box position={[0, 1, -3]} args={[0.5, 3, 0.5]} rotation={[0,0,0.5]}>
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
}) => {
  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        <CameraController
          headX={headX}
          headY={headY}
          headZ={headZ}
          sceneSettings={sceneSettings}
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

          {renderMode === "splat" && (
            // User can replace with "/models/room.splat"
            <Splat
              src={modelUrl || "https://antimatter15.com/splat/nike.splat"}
            />
          )}

          <Environment preset="city" />
        </Suspense>
      </Canvas>

      {/* Instructions Overlay */}
      <div className="absolute bottom-12 right-4 text-xs text-white/30 text-right pointer-events-none">
        {renderMode === "gltf" ? "3D GLTF Mode" : "Gaussian Splat Mode"}
      </div>
    </div>
  );
};
