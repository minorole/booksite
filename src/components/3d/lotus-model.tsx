"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, useAnimations, AdaptiveDpr } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useState } from "react"
import { MeshStandardMaterial, LoopPingPong, Group } from 'three'
import { LOTUS_TILT_MAX_RAD, LOTUS_AUTO_ROTATE_PERIOD_S, LOTUS_TILT_EASING_BASE } from "@/lib/ui"

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
  const reducedMotionRef = useRef(false)
  const hiddenRef = useRef(false)

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
      action.timeScale = 0.8
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

  // Track reduced-motion and page visibility to gate rotation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const onReducedChange = () => { reducedMotionRef.current = !!mReduced?.matches }
    onReducedChange()
    mReduced?.addEventListener('change', onReducedChange)

    const onVisibility = () => { hiddenRef.current = !!document.hidden }
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mReduced?.removeEventListener('change', onReducedChange)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Lightweight auto-rotation (matches OrbitControls autoRotateSpeed=2 ≈ 30s/rev)
  useFrame((_, delta) => {
    if (hiddenRef.current || reducedMotionRef.current) return
    const perSecond = (Math.PI * 2) / LOTUS_AUTO_ROTATE_PERIOD_S
    scene.rotation.y += perSecond * delta
  })

  return <primitive object={scene} {...props} />
}

const TiltGroup = forwardRef<{ reset: () => void }, { children: React.ReactNode }>(
  ({ children }, ref) => {
    const groupRef = useRef<Group>(null)
    const target = useRef({ x: 0, z: 0 })
    const current = useRef({ x: 0, z: 0 })
    const enabledRef = useRef(true)
    const { pointer } = useThree()

    useImperativeHandle(ref, () => ({
      reset: () => {
        // Set target to neutral; useFrame smoothing makes the motion natural
        target.current.x = 0
        target.current.z = 0
      },
    }), [])

    // Respect prefers-reduced-motion and pointer capability
    useEffect(() => {
      if (typeof window === 'undefined') return
      const mReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
      const mFine = window.matchMedia?.('(pointer: fine)')
      const update = () => {
        enabledRef.current = (!!mFine?.matches) && !mReduced?.matches
      }
      update()
      mReduced?.addEventListener('change', update)
      mFine?.addEventListener('change', update)
      return () => {
        mReduced?.removeEventListener('change', update)
        mFine?.removeEventListener('change', update)
      }
    }, [])

    // Smoothly ease towards the target tilt derived from R3F pointer
    useFrame((_, delta) => {
      const max = LOTUS_TILT_MAX_RAD
      if (enabledRef.current) {
        // R3F pointer: [-1,1] in both axes relative to the canvas
        target.current.x = -pointer.y * max
        target.current.z = pointer.x * max
      } else {
        target.current.x = 0
        target.current.z = 0
      }

      // Exponential smoothing; stable across frame rates
      const ease = 1 - Math.pow(LOTUS_TILT_EASING_BASE, delta)
      current.current.x += (target.current.x - current.current.x) * ease
      current.current.z += (target.current.z - current.current.z) * ease

      const g = groupRef.current
      if (g) {
        g.rotation.x = current.current.x
        g.rotation.z = current.current.z
      }
    })

    return (
      <group ref={groupRef} position={[0, -0.55, 0]}>
        {children}
      </group>
    )
  }
)
TiltGroup.displayName = 'TiltGroup'
export function LotusModel() {
  const tiltRef = useRef<{ reset: () => void }>(null)
  const [maxDpr, setMaxDpr] = useState<number>(1.25)

  // Optionally cap DPR when on battery to reduce GPU load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const nav: any = navigator as any
    if (nav && typeof nav.getBattery === 'function') {
      let disposed = false
      nav.getBattery().then((battery: any) => {
        if (disposed) return
        if (battery && battery.charging === false) setMaxDpr(1.1)
        const onChargingChange = () => {
          setMaxDpr(battery.charging ? 1.25 : 1.1)
        }
        battery.addEventListener?.('chargingchange', onChargingChange)
        // Cleanup listener when unmounting
        return () => {
          disposed = true
          battery.removeEventListener?.('chargingchange', onChargingChange)
        }
      }).catch(() => {/* ignore */})
    }
  }, [])
  return (
    <div className="w-[430px] h-[400px] mx-auto -mt-6">
      <Suspense fallback={<CssLotus />}>
        <Canvas 
          aria-hidden={true}
          shadows={false}
          dpr={[1, maxDpr]} 
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
          onPointerLeave={() => tiltRef.current?.reset()}
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
          <TiltGroup ref={tiltRef}>
            <Lotus 
              scale={0.4}
            />
          </TiltGroup>
        </Canvas>
      </Suspense>
    </div>
  )
}

useGLTF.preload('/models/lotus_compressed.glb', '/draco/', false)
