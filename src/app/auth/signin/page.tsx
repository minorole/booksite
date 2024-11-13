import { AuthForm } from "@/components/auth/auth-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Free Marketplace</CardTitle>
        <CardDescription>
          New or returning? Simply enter your email below to continue.
          We'll send you a secure magic link to sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm />
      </CardContent>
    </Card>
  )
} 