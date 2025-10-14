import { AuthForm } from "@/components/auth/auth-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Logo } from "@/components/common/logo"
import Link from "next/link"

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const err = (typeof params?.error === 'string') ? params?.error : undefined
  const message = err === 'LinkExpired'
    ? '你的魔法链接已过期，请重新请求一封。 · Your magic link has expired. Please request a new one.'
    : err === 'AuthError'
    ? '未能为你完成登录，请再试一次。 · We couldn’t sign you in. Please try again.'
    : undefined

  return (
    <Card className="bg-transparent border-0 shadow-none backdrop-blur-0 p-0">
      <CardHeader className="relative pb-2 flex items-center justify-center">
        <Link href="/" className="absolute left-0 top-2 text-white/80 hover:text-white text-sm font-semibold leading-tight">
          返回
          <br />
          <span className="text-white/60 text-xs">Back</span>
        </Link>
        <CardTitle className="text-center">
          <Logo height={56} variant="badge" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <p className="text-white/80 text-base sm:text-lg">使用以下方式登录/注册</p>
          <p className="text-white/60 text-sm sm:text-base">Use one of the following to sign in or sign up</p>
        </div>
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
