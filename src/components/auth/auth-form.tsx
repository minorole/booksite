"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/api/auth/callback`,
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
          title: "Magic link sent",
          description: "Check your email for the login link. Be sure to check your spam folder too.",
        })
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`)
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
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
          className="w-full"
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <div className="mr-2">
                <LoadingSpinner />
              </div>
              Sending magic link...
            </>
          ) : (
            "Continue with Email"
          )}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
} 