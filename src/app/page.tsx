"use client"

import { Navbar } from "@/components/layout/navbar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Suspense, useState, useEffect } from "react"
import { LotusModel } from "@/components/3d/lotus-model"
import Typewriter from 'typewriter-effect';

// Loading screen component
function LoadingScreen({ onLoadingComplete }: { onLoadingComplete: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let mounted = true;

    const timer = setInterval(() => {
      if (mounted) {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer)
            onLoadingComplete()
            return 100
          }
          return Math.min(prev + 1, 100)
        })
      }
    }, 20)

    // Cleanup function
    return () => {
      mounted = false;
      clearInterval(timer)
    }
  }, [onLoadingComplete])

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="w-[300px] text-center">
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Loading... {progress}%
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
        className="pl-4 pr-12 py-8 text-lg shadow-md border-2 text-center focus-visible:ring-0 focus-visible:ring-offset-0"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {!isFocused && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative h-full flex items-center justify-center px-4">
            <div className="w-full text-muted-foreground text-center">
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mt-8">
      <Link 
        href="/books/pure-land"
        className="p-4 text-center rounded-lg border hover:bg-accent transition-colors"
      >
        净土佛书<br/>Pure Land
      </Link>
      <Link 
        href="/books/others"
        className="p-4 text-center rounded-lg border hover:bg-accent transition-colors"
      >
        其他佛书<br/>Other Books
      </Link>
      <Link 
        href="/items/dharma"
        className="p-4 text-center rounded-lg border hover:bg-accent transition-colors"
      >
        法宝<br/>Dharma Items
      </Link>
      <Link 
        href="/items/statues" 
        className="p-4 text-center rounded-lg border hover:bg-accent transition-colors"
      >
        佛像<br/>Buddha Statues
      </Link>
    </div>
  )
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <>
      {isLoading && (
        <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />
      )}
      <div className={cn(
        "min-h-screen flex flex-col",
        isLoading && "hidden" // Hide content while loading
      )}>
        <Navbar />
        
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl mx-auto text-center space-y-4">
            <LotusModel />

            <div className="space-y-4">
              <h1 className="text-4xl font-bold">
                <span className="block">中佛州净宗学会</span>
                <span className="block text-2xl text-muted-foreground mt-2">
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