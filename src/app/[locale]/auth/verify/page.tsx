'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bilingual } from '@/components/common/bilingual';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/contexts/LocaleContext';

const EXP_MS = 15 * 60 * 1000;

function VerifyPageInner() {
  const params = useSearchParams();
  const { toast } = useToast();
  const { locale } = useLocale();
  const [hydrated, setHydrated] = useState(false);
  const email = useMemo(() => {
    const raw = params?.get('email') || undefined;
    return raw || '';
  }, [params]);
  const returnTo = useMemo(() => params?.get('returnTo') || undefined, [params]);
  const [cooldown, setCooldown] = useState<number>(60);
  const [sending, setSending] = useState<boolean>(false);
  const initialIssuedAt = useMemo(() => {
    const rawTs = params?.get('ts');
    const parsed = rawTs ? Number(rawTs) : undefined;
    return parsed && !isNaN(parsed) ? parsed : Date.now();
  }, [params]);
  const [issuedAt, setIssuedAt] = useState<number>(initialIssuedAt);

  const [remainingMs, setRemainingMs] = useState<number>(
    Math.max(0, EXP_MS - (Date.now() - issuedAt)),
  );

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setCooldown(60);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    const t = setInterval(() => {
      setRemainingMs(Math.max(0, EXP_MS - (Date.now() - issuedAt)));
    }, 1000);
    return () => clearInterval(t);
  }, [issuedAt]);

  const onResend = useCallback(async () => {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, returnTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to resend link');
      toast({
        title: <Bilingual cnText="魔法链接已重新发送" enText="Magic link resent" />,
        description: (
          <Bilingual
            cnText="请稍等片刻后再次查看收件箱。"
            enText="Check your inbox again in a moment."
          />
        ),
      });
      setCooldown(60);
      setIssuedAt(Date.now());
    } catch (e) {
      const mapAuthError = (msg?: string): ReactNode => {
        const m = (msg || '').toLowerCase();
        if (!m)
          return (
            <Bilingual
              cnText="发生未知错误，请重试。"
              enText="An unexpected error occurred. Please try again."
            />
          );
        if (m.includes('too many requests'))
          return <Bilingual cnText="请求过多，请稍后再试" enText="Too many requests" />;
        if (m.includes('failed to resend link'))
          return <Bilingual cnText="重新发送失败" enText="Failed to resend link" />;
        if (m.includes('failed to send magic link'))
          return <Bilingual cnText="发送魔法链接失败" enText="Failed to send magic link" />;
        return <Bilingual cnText={msg} enText={msg} />;
      };
      toast({
        variant: 'destructive',
        title: <Bilingual cnText="错误" enText="Error" />,
        description: mapAuthError(e instanceof Error ? e.message : undefined),
      });
    } finally {
      setSending(false);
    }
  }, [cooldown, email, returnTo, sending, toast]);

  const label: ReactNode = useMemo(() => {
    if (cooldown > 0) {
      const mm = Math.floor(cooldown / 60);
      const ss = String(cooldown % 60).padStart(2, '0');
      return (
        <Bilingual
          cnText={`${mm}:${ss} 后可重发`}
          enText={
            <>
              Resend in {mm}:{ss}
            </>
          }
          enClassName="text-white/70"
        />
      );
    }
    return <Bilingual cnText="重新发送链接" enText="Resend link" enClassName="text-white/70" />;
  }, [cooldown]);
  const expiryLabel = useMemo(() => {
    const totalSec = Math.ceil(remainingMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [remainingMs]);

  return (
    <Card className="backdrop-blur-0 border-0 bg-transparent p-0 shadow-none">
      <CardHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-primary/10 rounded-full p-3">
            <Mail className="text-primary h-6 w-6" />
          </div>
          <div className="text-center">
            <CardTitle className="text-3xl font-extrabold tracking-tight text-white/90 sm:text-4xl">
              <Bilingual as="span" cnText="请查收邮箱" enText="Check your email" />
            </CardTitle>
            <CardDescription className="mt-2 text-base leading-relaxed text-white/80 sm:text-lg">
              <Bilingual
                as="span"
                cnText="我们已发送登录魔法链接"
                enText="We’ve sent you a magic link to sign in"
              />
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {email && (
            <p className="text-center text-sm">
              <Bilingual
                as="span"
                cnText={
                  <>
                    <span className="text-white/80">魔法链接已发送至：</span>
                    <span className="font-semibold text-white">{email}</span>
                  </>
                }
                enText={
                  <>
                    <span className="text-white/80">Magic link sent to: </span>
                    <span className="font-semibold text-white">{email}</span>
                  </>
                }
              />
              <br />
              <span className="text-muted-foreground text-xs">
                <Bilingual
                  as="span"
                  cnText={
                    <>
                      <span>（邮箱不正确？</span>
                      <Link
                        href={`/${locale}/auth/signin`}
                        className="text-primary hover:underline"
                      >
                        重新填写
                      </Link>
                      <span>）</span>
                    </>
                  }
                  enText={
                    <>
                      <span>(Wrong email? </span>
                      <Link
                        href={`/${locale}/auth/signin`}
                        className="text-primary hover:underline"
                      >
                        Try again
                      </Link>
                      <span>)</span>
                    </>
                  }
                />
              </span>
            </p>
          )}

          <Alert className="border-white/20 bg-white/10">
            <AlertDescription className="text-white/90">
              <p className="font-medium">
                <Bilingual as="span" cnText="找不到邮件？" enText="Can’t find the email?" />
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>
                  <Bilingual
                    as="span"
                    cnText="检查垃圾邮件或广告邮件夹"
                    enText="Check your spam or junk folder"
                  />
                </li>
                <li>
                  <Bilingual
                    as="span"
                    cnText="等待几分钟后刷新收件箱"
                    enText="Wait a few minutes and refresh your inbox"
                  />
                </li>
                <li>
                  <Bilingual
                    as="span"
                    cnText="确认你输入了正确的邮箱地址"
                    enText="Make sure you entered the correct email"
                  />
                </li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="text-center text-sm text-white/80">
            {remainingMs > 0 ? (
              hydrated ? (
                <Bilingual
                  as="span"
                  cnText={<>链接将在 {expiryLabel} 后过期</>}
                  enText={<>Link expires in {expiryLabel}</>}
                />
              ) : (
                <Bilingual as="span" cnText="链接即将过期" enText="Link expires soon" />
              )
            ) : (
              <Bilingual
                as="span"
                cnText="链接可能已过期，你可以在下方重新发送。"
                enText="The link may have expired. You can resend a new link below."
              />
            )}
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              onClick={onResend}
              disabled={!email || sending || cooldown > 0}
              variant="ghost"
              className="h-11 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {label}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground p-4 text-sm">Loading…</div>}>
      <VerifyPageInner />
    </Suspense>
  );
}
