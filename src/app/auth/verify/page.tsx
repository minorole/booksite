"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSearchParams } from 'next/navigation'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <CardTitle>Check your email</CardTitle>
            <CardDescription className="mt-2">
              We've sent you a magic link to sign in
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {email && (
            <p className="text-center text-sm">
              Magic link sent to: <span className="font-medium">{email}</span>
              <br />
              <span className="text-xs text-muted-foreground">
                (Wrong email? <a href="/auth/signin" className="text-primary hover:underline">Try again</a>)
              </span>
            </p>
          )}
          
          <Alert className="bg-muted/50 border-muted-foreground/20">
            <AlertDescription>
              <p className="font-medium">Can't find the email?</p>
              <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                <li>Check your spam or junk folder</li>
                <li>Wait a few minutes and refresh your inbox</li>
                <li>Make sure you entered the correct email</li>
              </ul>
            </AlertDescription>
          </Alert>

          <p className="text-xs text-muted-foreground text-center">
            The magic link will expire in 24 hours
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 