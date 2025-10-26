"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, useAnimations, AdaptiveDpr } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useState } from "react"
import { MeshStandardMaterial, LoopPingPong, Group } from 'three'
import { LOTUS_TILT_MAX_RAD, LOTUS_AUTO_ROTATE_PERIOD_S, LOTUS_TILT_POS_MAX, LOTUS_TILT_SPRING_STIFFNESS, LOTUS_TILT_SPRING_DAMPING, LOTUS_DRAG_YAW_SENSITIVITY, LOTUS_DRAG_YAW_FRICTION, LOTUS_DRAG_START_PX } from "@/lib/ui"

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
    // Targets for rotation (x,z) and parallax position (x,y)
    const targetRot = useRef({ x: 0, z: 0 })
    const targetPos = useRef({ x: 0, y: 0 })
    // Current values
    const currentRot = useRef({ x: 0, z: 0 })
    const currentPos = useRef({ x: 0, y: 0 })
    // Velocities for spring integration
    const velRot = useRef({ x: 0, z: 0 })
    const velPos = useRef({ x: 0, y: 0 })
    const enabledRef = useRef(true)
    const { pointer } = useThree()

    useImperativeHandle(ref, () => ({
      reset: () => {
        // Set targets to neutral; springs ease naturally back
        targetRot.current.x = 0
        targetRot.current.z = 0
        targetPos.current.x = 0
        targetPos.current.y = 0
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

    // Smoothly spring towards the target tilt/parallax derived from R3F pointer
    useFrame((_, delta) => {
      const maxRot = LOTUS_TILT_MAX_RAD
      const maxPos = LOTUS_TILT_POS_MAX
      if (enabledRef.current) {
        // R3F pointer: [-1,1] in both axes relative to the canvas
        targetRot.current.x = -pointer.y * maxRot
        targetRot.current.z = pointer.x * maxRot
        // Subtle parallax position; smaller vertical shift for natural feel
        targetPos.current.x = pointer.x * maxPos
        targetPos.current.y = -pointer.y * (maxPos * 0.6)
      } else {
        targetRot.current.x = 0
        targetRot.current.z = 0
        targetPos.current.x = 0
        targetPos.current.y = 0
      }

      // Critically-damped-ish spring integration for smooth, natural motion
      const k = LOTUS_TILT_SPRING_STIFFNESS
      const c = LOTUS_TILT_SPRING_DAMPING

      // Rotation X
      const ax = (targetRot.current.x - currentRot.current.x) * k - velRot.current.x * c
      velRot.current.x += ax * delta
      currentRot.current.x += velRot.current.x * delta
      // Rotation Z
      const az = (targetRot.current.z - currentRot.current.z) * k - velRot.current.z * c
      velRot.current.z += az * delta
      currentRot.current.z += velRot.current.z * delta

      // Position X
      const apx = (targetPos.current.x - currentPos.current.x) * k - velPos.current.x * c
      velPos.current.x += apx * delta
      currentPos.current.x += velPos.current.x * delta
      // Position Y
      const apy = (targetPos.current.y - currentPos.current.y) * k - velPos.current.y * c
      velPos.current.y += apy * delta
      currentPos.current.y += velPos.current.y * delta

      const g = groupRef.current
      if (g) {
        g.rotation.x = currentRot.current.x
        g.rotation.z = currentRot.current.z
        // Base position offset is applied in the group wrapper below
        g.position.x = currentPos.current.x
        g.position.y = -0.55 + currentPos.current.y
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
function YawGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<Group>(null)
  const dragging = useRef(false)
  const start = useRef({ x: 0, y: 0 })
  const lastX = useRef(0)
  const yaw = useRef(0)
  const yawVel = useRef(0)
  const reducedMotionRef = useRef(false)
  const { size } = useThree()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const onReducedChange = () => { reducedMotionRef.current = !!mReduced?.matches }
    onReducedChange()
    mReduced?.addEventListener('change', onReducedChange)
    return () => mReduced?.removeEventListener('change', onReducedChange)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (reducedMotionRef.current) return
    start.current.x = e.clientX
    start.current.y = e.clientY
    lastX.current = e.clientX
    dragging.current = false
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (reducedMotionRef.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (!dragging.current) {
      if (Math.abs(dx) > LOTUS_DRAG_START_PX && Math.abs(dx) > Math.abs(dy)) {
        dragging.current = true
        try { (e.currentTarget as any).setPointerCapture?.(e.pointerId) } catch {}
      } else {
        return
      }
    }
    const deltaX = e.clientX - lastX.current
    lastX.current = e.clientX
    const norm = size.width > 0 ? deltaX / size.width : 0
    yawVel.current += norm * LOTUS_DRAG_YAW_SENSITIVITY
  }
  const release = (e: React.PointerEvent) => {
    if (dragging.current) {
      try { (e.currentTarget as any).releasePointerCapture?.((e as any).pointerId) } catch {}
    }
    dragging.current = false
  }

  useFrame((_, delta) => {
    // Friction and integrate yaw
    const f = Math.exp(-LOTUS_DRAG_YAW_FRICTION * delta)
    yawVel.current *= f
    yaw.current += yawVel.current * delta
    const g = groupRef.current
    if (g) g.rotation.y = yaw.current
  })

  return (
    <group
      ref={groupRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      {children}
    </group>
  )
}
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
          style={{ touchAction: 'pan-y' }}
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
          <YawGroup>
            <TiltGroup ref={tiltRef}>
              <Lotus 
                scale={0.4}
              />
            </TiltGroup>
          </YawGroup>
        </Canvas>
      </Suspense>
    </div>
  )
}

useGLTF.preload('/models/lotus_compressed.glb', '/draco/', false)
