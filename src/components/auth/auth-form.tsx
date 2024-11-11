"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        })
      } else {
        toast({
          title: "Check your email",
          description: "We sent you a login link. Be sure to check your spam too.",
        })
        router.push('/auth/verify')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-4">
      <Input
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Sending magic link..." : "Sign in with Email"}
      </Button>
    </form>
  )
} 