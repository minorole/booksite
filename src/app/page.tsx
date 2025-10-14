"use client"

import { Navbar } from "@/components/layout/navbar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import dynamic from 'next/dynamic'
import Typewriter from 'typewriter-effect';
import { useProgress } from '@react-three/drei'

const LotusModel = dynamic(
  () => import('@/components/3d/lotus-model').then(m => m.LotusModel),
  { ssr: false }
)

// Full-screen loading overlay driven by actual 3D loading progress
function LoadingOverlay({ progress, fading }: { progress: number; fading: boolean }) {
  const pct = Math.max(0, Math.min(Math.round(progress), 100))
  return (
    <div className={cn(
      "fixed inset-0 bg-background flex items-center justify-center z-50 transition-opacity duration-300",
      fading ? "opacity-0" : "opacity-100"
    )}>
      <div className="w-[300px] text-center">
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Loading… {pct}%
        </p>
      </div>
    </div>
  )
}

// Carousel messages
const messages = [
  "阿弥陀佛！欢迎来到中佛州净宗学会，您有什么问题？我可以帮助您查找法宝和回答简单的问题。",
  "Amitabha! Welcome to AMTBCF. How may I help you? I can help you find Dharma materials and answer simple questions."
]

// Chat input with typing effect
function ChatInput() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full max-w-2xl mx-auto group">
      <Input 
        placeholder=""
        className="h-16 rounded-2xl text-lg text-center bg-background/60 border border-border/60 shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {!isFocused && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative h-full flex items-center justify-center px-4">
            <div className="w-full text-center text-base sm:text-lg text-muted-foreground">
              <Typewriter
                options={{
                  autoStart: true,
                  loop: true,
                  cursor: '|',
                  wrapperClassName: 'break-words',
                  cursorClassName: 'text-primary animate-blink',
                  delay: 145,
                  deleteSpeed: 5,
                  strings: messages,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Quick links section
function QuickLinks() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 max-w-3xl mx-auto mt-10">
      <Link
        href="/books/pure-land"
        className="group p-6 sm:p-8 text-center rounded-2xl border border-border/60 bg-card/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-accent/40"
      >
        <span className="block text-2xl font-medium tracking-wide text-foreground">净土佛书</span>
        <span className="block mt-2 text-base text-muted-foreground">Pure Land</span>
      </Link>
      <Link
        href="/books/others"
        className="group p-6 sm:p-8 text-center rounded-2xl border border-border/60 bg-card/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-accent/40"
      >
        <span className="block text-2xl font-medium tracking-wide text-foreground">其他佛书</span>
        <span className="block mt-2 text-base text-muted-foreground">Other Books</span>
      </Link>
      <Link
        href="/items/dharma"
        className="group p-6 sm:p-8 text-center rounded-2xl border border-border/60 bg-card/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-accent/40"
      >
        <span className="block text-2xl font-medium tracking-wide text-foreground">法宝</span>
        <span className="block mt-2 text-base text-muted-foreground">Dharma Items</span>
      </Link>
      <Link
        href="/items/statues"
        className="group p-6 sm:p-8 text-center rounded-2xl border border-border/60 bg-card/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-accent/40"
      >
        <span className="block text-2xl font-medium tracking-wide text-foreground">佛像</span>
        <span className="block mt-2 text-base text-muted-foreground">Buddha Statues</span>
      </Link>
    </div>
  )
}

export default function Home() {
  // Track real asset loading state from drei
  const { active, progress } = useProgress()
  const [isLoading, setIsLoading] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)

  const completeOverlay = useCallback(() => {
    if (isFadingOut || !isLoading) return
    setIsFadingOut(true)
    const t = setTimeout(() => setIsLoading(false), 250)
    return () => clearTimeout(t)
  }, [isFadingOut, isLoading])

  // Hide overlay as soon as 3D assets are done (with a safety cap)
  useEffect(() => {
    if (!active && progress >= 100) completeOverlay()
  }, [active, progress, completeOverlay])

  useEffect(() => {
    // Safety timeout in case progress cannot be determined on some devices
    const timeout = setTimeout(() => completeOverlay(), 8000)
    if (!isLoading) clearTimeout(timeout)
    return () => clearTimeout(timeout)
  }, [isLoading, completeOverlay])

  return (
    <>
      {isLoading && <LoadingOverlay progress={progress} fading={isFadingOut} />}
      <div className={cn(
        "min-h-screen flex flex-col"
      )}>
        <Navbar />
        
        <main className="relative flex-1 flex flex-col items-center justify-center p-4">
          {/* subtle hero glow */}
          <div className="pointer-events-none absolute -z-10 inset-x-0 top-[-60px] h-[240px] bg-[radial-gradient(60%_40%_at_50%_0%,hsl(var(--primary)/0.10),transparent)] blur-3xl" />
          <div className="w-full max-w-4xl mx-auto text-center space-y-4">
            <LotusModel />

            <div className="space-y-4">
              <h1 className="font-bold">
                <span className="block font-serif text-5xl sm:text-6xl md:text-7xl tracking-tight leading-[1.1]">中佛州净宗学会</span>
                <span className="block text-xl sm:text-2xl text-muted-foreground mt-2">
                  Amitabha Buddhist Society of Central Florida
                </span>
              </h1>
              
              <ChatInput />
            </div>

            <QuickLinks />
          </div>
        </main>

        <footer className="border-t py-4 mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© 2024 AMTBCF. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  )
}
