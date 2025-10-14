import { AuthForm } from "@/components/auth/auth-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Logo } from "@/components/common/logo"

export default function SignInPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const err = (typeof searchParams?.error === 'string') ? searchParams?.error : undefined
  const message = err === 'LinkExpired'
    ? 'Your magic link has expired. Please request a new one.'
    : err === 'AuthError'
    ? 'We couldn’t sign you in. Please try again.'
    : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span>Welcome to</span>
          <Logo height={40} />
        </CardTitle>
        <CardDescription>
          New or returning? Simply enter your email below to continue.
          We’ll send you a secure magic link to sign in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message && (
          <Alert className="mb-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <AuthForm />
      </CardContent>
    </Card>
  )
}
