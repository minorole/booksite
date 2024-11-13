import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function VerifyPage() {
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
        <div className="space-y-4 text-sm text-muted-foreground">
          <p className="text-center">
            Click the link in your email to continue. The link will expire in 24 hours.
          </p>
          <p className="text-center">
            Don't see the email? Check your spam folder or request a new link.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 