"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, useAnimations, AdaptiveDpr } from "@react-three/drei"
import { Suspense, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { MeshStandardMaterial, LoopPingPong } from 'three'

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

  // Shared materials (avoid reallocating per-mesh on theme change)
  const lightMaterial = useMemo(() => new MeshStandardMaterial({
    color: '#FFE55C',
    metalness: 0.6,
    roughness: 0.3,
    emissive: '#FFE55C',
    emissiveIntensity: 0.2,
  }), [])

  const darkMaterial = useMemo(() => new MeshStandardMaterial({
    color: '#FFD700',
    metalness: 0.6,
    roughness: 0.3,
    emissive: '#4A3800',
    emissiveIntensity: 0.4,
  }), [])

  // Start animation once when actions are ready
  useEffect(() => {
    const firstKey = Object.keys(actions)[0]
    const action = firstKey ? actions[firstKey] : undefined
    if (action) {
      action.reset().play()
      action.clampWhenFinished = false
      action.timeScale = 0.5
      action.setLoop(LoopPingPong, Infinity)
      action.fadeIn(0.1)
    }
  }, [actions])

  // Update materials on theme change without restarting animation
  useEffect(() => {
    const mat = theme === 'dark' ? darkMaterial : lightMaterial
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.material = mat
      }
    })
  }, [scene, theme, lightMaterial, darkMaterial])

  // Dispose shared materials on unmount
  useEffect(() => {
    return () => {
      lightMaterial.dispose()
      darkMaterial.dispose()
    }
  }, [lightMaterial, darkMaterial])

  // Lightweight auto-rotation (matches OrbitControls autoRotateSpeed=2 ≈ 30s/rev)
  useFrame((_, delta) => {
    scene.rotation.y += (Math.PI * 2 / 30) * delta
  })

  return <primitive object={scene} {...props} />
}
export function LotusModel() {
  return (
    <div className="w-[430px] h-[400px] mx-auto -mt-6">
      <Suspense fallback={<CssLotus />}>
        <Canvas 
          shadows={false}
          dpr={[1, 1.25]} 
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
        </Canvas>
      </Suspense>
    </div>
  )
}

useGLTF.preload('/models/lotus_compressed.glb', '/draco/', false)
