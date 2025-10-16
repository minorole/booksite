"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, useAnimations, AdaptiveDpr } from "@react-three/drei"
import { Suspense, useEffect, useMemo } from "react"
import { MeshStandardMaterial, LoopPingPong } from 'three'

// CSS Lotus as fallback
function CssLotus() {
  return (
    <div className="w-32 h-32 mx-auto mb-8 relative">
      <div className="absolute inset-0 animate-spin-slow">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={"absolute w-16 h-16 left-8 -top-4 origin-bottom bg-[#E8C95A]/10 rounded-full transform"}
            style={{
              transform: `rotate(${i * 45}deg)`,
              transformOrigin: 'center bottom',
            }}
          />
        ))}
      </div>
      <div className={"absolute w-8 h-8 rounded-full left-12 top-12 bg-[#E8C95A]/20"} />
    </div>
  )
}

function Lotus(props: Record<string, unknown>) {
  const { scene, animations } = useGLTF('/models/lotus_compressed.glb', '/draco/', false)
  const { actions } = useAnimations(animations, scene)

  // Single matte-gold material shared by all meshes
  const goldMaterial = useMemo(() => new MeshStandardMaterial({
    color: '#E8C95A',
    metalness: 0.55,
    roughness: 0.35,
    emissive: '#E8C95A',
    emissiveIntensity: 0.10,
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

  // Apply the matte-gold material to all meshes
  useEffect(() => {
    scene.traverse((child) => {
      const c = child as unknown as { isMesh?: boolean; material?: unknown }
      if (c.isMesh) {
        // Assign shared material when available
        ;(c as unknown as { material: MeshStandardMaterial }).material = goldMaterial
      }
    })
  }, [scene, goldMaterial])

  // Dispose shared material on unmount
  useEffect(() => {
    return () => {
      goldMaterial.dispose()
    }
  }, [goldMaterial])

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
          className="bg-transparent"
          style={{ background: 'transparent' }}
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
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
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
