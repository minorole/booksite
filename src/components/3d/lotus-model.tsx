'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, AdaptiveDpr } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { MeshStandardMaterial, LoopPingPong, Group } from 'three';
import {
  LOTUS_AUTO_ROTATE_PERIOD_S,
  LOTUS_DRAG_YAW_SENSITIVITY,
  LOTUS_DRAG_YAW_FRICTION_DRAG,
  LOTUS_DRAG_YAW_FRICTION_COAST,
  LOTUS_DRAG_YAW_VEL_MAX,
  LOTUS_DRAG_START_PX,
  LOTUS_BASE_TILT_RAD,
} from '@/lib/ui';
import { useReducedMotionRef } from '@/lib/ui/useReducedMotion';

// CSS Lotus as fallback
function CssLotus() {
  return (
    <div className="relative mx-auto mb-8 h-32 w-32">
      <div className="animate-spin-slow absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={
              'absolute -top-4 left-8 h-16 w-16 origin-bottom transform rounded-full bg-[#E8C95A]/10'
            }
            style={{
              transform: `rotate(${i * 45}deg)`,
              transformOrigin: 'center bottom',
            }}
          />
        ))}
      </div>
      <div className={'absolute top-12 left-12 h-8 w-8 rounded-full bg-[#E8C95A]/20'} />
    </div>
  );
}

function Lotus(props: Record<string, unknown>) {
  const { gl } = useThree();
  const { scene, animations } = useGLTF('/models/lotus_compressed.glb', '/draco/', false);
  const { actions } = useAnimations(animations, scene);
  const reducedMotionRef = useReducedMotionRef();
  const hiddenRef = useRef(false);
  const inViewRef = useRef(true);

  // Single matte-gold material shared by all meshes
  const goldMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#E8C95A',
        metalness: 0.55,
        roughness: 0.35,
        emissive: '#E8C95A',
        emissiveIntensity: 0.1,
      }),
    [],
  );

  // Start animation once when actions are ready
  useEffect(() => {
    const firstKey = Object.keys(actions)[0];
    const action = firstKey ? actions[firstKey] : undefined;
    if (action) {
      action.reset().play();
      action.clampWhenFinished = false;
      action.timeScale = 0.8;
      action.setLoop(LoopPingPong, Infinity);
      action.fadeIn(0.1);
    }
  }, [actions]);

  // Apply the matte-gold material to all meshes
  useEffect(() => {
    scene.traverse((child) => {
      const c = child as unknown as { isMesh?: boolean; material?: unknown };
      if (c.isMesh) {
        // Assign shared material when available
        (c as unknown as { material: MeshStandardMaterial }).material = goldMaterial;
        // Ensure animated petals are not culled at frustum edges
        (c as unknown as { frustumCulled?: boolean }).frustumCulled = false;
      }
    });
  }, [scene, goldMaterial]);

  // Dispose shared material on unmount
  useEffect(() => {
    return () => {
      goldMaterial.dispose();
    };
  }, [goldMaterial]);

  // Track page visibility to gate rotation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onVisibility = () => {
      hiddenRef.current = !!document.hidden;
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Pause rotation when Canvas is out of view
  useEffect(() => {
    const el: HTMLElement | undefined = (gl as any)?.domElement;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e) inViewRef.current = !!e.isIntersecting;
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [gl]);

  // Lightweight auto-rotation (matches OrbitControls autoRotateSpeed=2 ≈ 30s/rev)
  useFrame((_, delta) => {
    if (hiddenRef.current || reducedMotionRef.current || !inViewRef.current) return;
    const perSecond = (Math.PI * 2) / LOTUS_AUTO_ROTATE_PERIOD_S;
    scene.rotation.y += perSecond * delta;
  });

  return <primitive object={scene} {...props} />;
}
// Tilt was removed; spin-only interaction remains
function YawGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<Group>(null);
  const dragging = useRef(false);
  const pointerActive = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const lastX = useRef(0);
  const yaw = useRef(0);
  const yawVel = useRef(0);
  const reducedMotionRef = useReducedMotionRef();
  const { size } = useThree();

  const onPointerDown = (e: React.PointerEvent) => {
    if (reducedMotionRef.current) return;
    pointerActive.current = true;
    start.current.x = e.clientX;
    start.current.y = e.clientY;
    lastX.current = e.clientX;
    dragging.current = false;
    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (reducedMotionRef.current) return;
    if (!pointerActive.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (!dragging.current) {
      if (Math.abs(dx) > LOTUS_DRAG_START_PX && Math.abs(dx) > Math.abs(dy)) {
        dragging.current = true;
        try {
          (e.currentTarget as any).setPointerCapture?.(e.pointerId);
        } catch {}
      } else {
        return;
      }
    }
    const deltaX = e.clientX - lastX.current;
    lastX.current = e.clientX;
    const norm = size.width > 0 ? deltaX / size.width : 0;
    yawVel.current += norm * LOTUS_DRAG_YAW_SENSITIVITY;
    // Clamp velocity to avoid runaway speeds
    const vmax = LOTUS_DRAG_YAW_VEL_MAX;
    if (yawVel.current > vmax) yawVel.current = vmax;
    else if (yawVel.current < -vmax) yawVel.current = -vmax;
  };
  const release = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as any).releasePointerCapture?.((e as any).pointerId);
    } catch {}
    dragging.current = false;
    pointerActive.current = false;
  };

  useFrame((_, delta) => {
    // Apply different damping while dragging vs coasting
    const friction = dragging.current
      ? LOTUS_DRAG_YAW_FRICTION_DRAG
      : LOTUS_DRAG_YAW_FRICTION_COAST;
    const f = Math.exp(-friction * delta);
    yawVel.current *= f;
    // Clamp again for safety
    const vmax = LOTUS_DRAG_YAW_VEL_MAX;
    if (yawVel.current > vmax) yawVel.current = vmax;
    else if (yawVel.current < -vmax) yawVel.current = -vmax;
    // Integrate
    yaw.current += yawVel.current * delta;
    const g = groupRef.current;
    if (g) g.rotation.y = yaw.current;
  });

  return (
    <group
      ref={groupRef}
      rotation={[-LOTUS_BASE_TILT_RAD, 0, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      {children}
    </group>
  );
}
export function LotusModel() {
  const [maxDpr, setMaxDpr] = useState<number>(1.25);

  // Optionally cap DPR when on battery to reduce GPU load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nav: any = navigator as any;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    if (nav && typeof nav.getBattery === 'function') {
      nav
        .getBattery()
        .then((battery: any) => {
          if (disposed) return;
          if (battery && battery.charging === false) setMaxDpr(1.1);
          const onChargingChange = () => {
            setMaxDpr(battery.charging ? 1.25 : 1.1);
          };
          battery.addEventListener?.('chargingchange', onChargingChange);
          cleanup = () => battery.removeEventListener?.('chargingchange', onChargingChange);
        })
        .catch(() => {
          /* ignore */
        });
    }
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);
  return (
    <div className="mx-auto -mt-6 h-[400px] w-[430px]">
      <Suspense fallback={<CssLotus />}>
        <Canvas
          aria-hidden={true}
          style={{ touchAction: 'pan-y' }}
          shadows={false}
          dpr={[1, maxDpr]}
          camera={{
            fov: 52,
            position: [0, 0, 2],
            near: 0.01,
            far: 50,
          }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false,
          }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <AdaptiveDpr />
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={3.1} />
          <directionalLight position={[-5, 5, -5]} intensity={2} />
          <group position={[0, -0.55, 0]}>
            <YawGroup>
              <Lotus scale={0.4} />
            </YawGroup>
          </group>
        </Canvas>
      </Suspense>
    </div>
  );
}

useGLTF.preload('/models/lotus_compressed.glb', '/draco/', false);
