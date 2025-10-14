"use client"

import { Canvas } from "@react-three/fiber"
import { useGLTF, OrbitControls, useAnimations, AdaptiveDpr } from "@react-three/drei"
import { Suspense, useEffect } from "react"
import { useTheme } from "next-themes"
import * as THREE from 'three'

// CSS Lotus as fallback
function CssLotus() {
  const { theme } = useTheme()
  return (
    <div className="w-32 h-32 mx-auto mb-8 relative">
      <div className="absolute inset-0 animate-spin-slow">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-16 h-16 left-8 -top-4 origin-bottom
              ${theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'}
              rounded-full transform`}
            style={{
              transform: `rotate(${i * 45}deg)`,
              transformOrigin: 'center bottom',
            }}
          />
        ))}
      </div>
      <div className={`absolute w-8 h-8 rounded-full left-12 top-12
        ${theme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'}`}
      />
    </div>
  )
}

function Lotus(props: any) {
  const { scene, animations } = useGLTF('/models/lotus_compressed.glb', '/draco/', false)
  const { actions } = useAnimations(animations, scene)
  const { theme } = useTheme()

  // Start animation once when actions are ready
  useEffect(() => {
    const firstKey = Object.keys(actions)[0]
    const action = firstKey ? actions[firstKey] : undefined
    if (action) {
      action.reset().play()
      action.clampWhenFinished = false
      action.timeScale = 0.5
      action.setLoop(THREE.LoopPingPong, Infinity)
      action.fadeIn(0.1)
    }
  }, [actions])

  // Update materials on theme change without restarting animation
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        const newMaterial = new THREE.MeshStandardMaterial({
          color: theme === 'dark' ? '#FFD700' : '#FFE55C',
          metalness: 0.6,
          roughness: 0.3,
          emissive: theme === 'dark' ? '#4A3800' : '#FFE55C',
          emissiveIntensity: theme === 'dark' ? 0.4 : 0.2,
        })
        child.material = newMaterial
      }
    })
  }, [scene, theme])

  return <primitive object={scene} {...props} />
}
export function LotusModel() {
  return (
    <div className="w-[430px] h-[400px] mx-auto -mt-8 md:-mt-10">
      <Suspense fallback={<CssLotus />}>
        <Canvas 
          shadows={false}
          dpr={[1, 1.5]} 
          camera={{ 
            fov: 45, 
            position: [0, 0, 2],
            near: 0.1,
            far: 1000
          }}
          gl={{ 
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
          }}
        >
          <AdaptiveDpr />
          <ambientLight intensity={0.7} />
          <directionalLight 
            position={[5, 5, 5]}
            intensity={3.1}
          />
          <directionalLight 
            position={[-5, 5, -5]}
            intensity={2}
          />
          <group position={[0, -0.55, 0]}>
            <Lotus 
              scale={0.4}
              rotation={[0, 0, 0]}
              castShadow={false}
              receiveShadow={false}
            />
          </group>
          <OrbitControls
            autoRotate
            autoRotateSpeed={2}
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </Suspense>
    </div>
  )
}

useGLTF.preload('/models/lotus_compressed.glb', '/draco/', false)
