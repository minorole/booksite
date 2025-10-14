import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="relative min-h-screen flex items-center justify-center dark bg-background text-foreground">
      <div className="absolute inset-0">
        <CanvasRevealEffect
          animationSpeed={3}
          containerClassName="w-full h-full bg-black"
          colors={[[255, 255, 255], [255, 255, 255]]}
          opacities={[0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]}
          dotSize={6.6}
          totalSize={22}
          showGradient={false}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,1)_0%,_transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
      </div>
      <div className="relative z-10 w-full max-w-md p-4">
        {children}
      </div>
    </main>
  )
}
