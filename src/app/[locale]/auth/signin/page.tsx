import React from "react"
import { AuthForm } from "@/components/auth/auth-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Logo } from "@/components/common/logo"
import Link from "next/link"
import { Bilingual } from "@/components/common/bilingual"

export default async function SignInPage({
  searchParams,
  params,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
  params: Promise<{ locale: string }>
}) {
  const p = await params
  const locale = p.locale === 'zh' ? 'zh' : 'en'
  const sp = await searchParams
  const err = (typeof sp?.error === 'string') ? sp?.error : undefined
  const message: React.ReactNode = err === 'LinkExpired'
    ? (<Bilingual cnText="你的魔法链接已过期，请重新请求一封。" enText="Your magic link has expired. Please request a new one." />)
    : err === 'AuthError'
    ? (<Bilingual cnText="未能为你完成登录，请再试一次。" enText="We couldn’t sign you in. Please try again." />)
    : undefined

  return (
    <Card className="bg-transparent border-0 shadow-none backdrop-blur-0 p-0">
      <CardHeader className="relative pb-2 flex items-center justify-center">
        <Link href={`/${locale}`} className="absolute left-0 top-2 text-white hover:text-white text-sm font-semibold leading-tight">
          <Bilingual as="span" cnText="返回" enText="Back" enClassName="text-white" />
        </Link>
        <CardTitle className="text-center">
          <Logo height={56} variant="badge" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <Bilingual as="div" align="center" cnText="使用以下方式登录/注册" enText="Use one of the following to sign in or sign up" cnClassName="text-white text-base sm:text-lg" enClassName="text-white text-sm sm:text-base" />
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
