"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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
    }
    setLoading(false)
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