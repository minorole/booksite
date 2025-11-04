'use client';

import { Navbar } from '@/components/layout/navbar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HOME_INPUT_MIN_WORDS_EN, HOME_INPUT_MIN_CHARS_ZH } from '@/lib/ui';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
// Typewriter animation removed in favor of static hint
import { useProgress } from '@react-three/drei';
import { useLocale } from '@/contexts/LocaleContext';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LotusModel = dynamic(() => import('@/components/3d/lotus-model').then((m) => m.LotusModel), {
  ssr: false,
});

const Particles = dynamic(() => import('@/components/ui/particles').then((m) => m.Particles), {
  ssr: false,
});

// Removed Liquid Ether background

function LoadingOverlay({ progress, fading }: { progress: number; fading: boolean }) {
  const pct = Math.max(0, Math.min(Math.round(progress), 100));
  return (
    <div
      className={cn(
        'bg-background fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300',
        fading ? 'opacity-0' : 'opacity-100',
      )}
    >
      <div className="w-[300px] text-center">
        <div className="bg-muted mb-4 h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-muted-foreground text-sm">Loading… {pct}%</p>
      </div>
    </div>
  );
}

function ChatInput({ messages }: { messages: string[] }) {
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState('');
  const { toast } = useToast();
  const { locale } = useLocale();

  const hint = messages[0] || '';
  const hintVisible = !isFocused && value.trim().length === 0;

  const handleSubmit = useCallback(() => {
    const v = value.trim();
    if (!v) return;
    toast({
      title: locale === 'zh' ? '已发送' : 'Sent',
      description: locale === 'zh' ? '当前为示例输入框。' : 'This input is a demo for now.',
    });
    setValue('');
  }, [value, toast, locale]);

  const isZh = locale === 'zh';
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const charCountZh = value.replace(/\s/g, '').length;
  const meetsMin = isZh
    ? charCountZh >= HOME_INPUT_MIN_CHARS_ZH
    : wordCount >= HOME_INPUT_MIN_WORDS_EN;

  return (
    <div className="group relative mx-auto w-full max-w-3xl">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder=""
        aria-label={locale === 'zh' ? '消息输入' : 'Message input'}
        className="min-h-[10rem] resize-y rounded-2xl px-5 py-5 pr-20 text-base shadow-sm focus-visible:ring-0 focus-visible:outline-none sm:min-h-[12rem] sm:text-lg"
        onFocus={() => {
          setIsFocused(true);
        }}
        onBlur={() => setIsFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (meetsMin) {
              handleSubmit();
            } else {
              toast({
                variant: 'default',
                title: isZh ? '输入太短' : 'Too short',
                description: isZh
                  ? `请至少输入${HOME_INPUT_MIN_CHARS_ZH}个字`
                  : `Please enter at least ${HOME_INPUT_MIN_WORDS_EN} words`,
              });
            }
          }
        }}
      />
      {!isFocused && value.trim().length === 0 && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="relative h-full px-5 py-5">
            <div className="text-muted-foreground text-left text-base sm:text-lg">
              <span className="opacity-80">{hint}</span>
            </div>
          </div>
        </div>
      )}
      {meetsMin && (
        <div className="absolute right-3 bottom-3">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={locale === 'zh' ? '发送' : 'Send'}
            className="h-10 w-10 rounded-full"
            onClick={handleSubmit}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function HomeClient() {
  const { locale } = useLocale();
  const { active, progress } = useProgress();
  const [isLoading, setIsLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const completeOverlay = useCallback(() => {
    if (isFadingOut || !isLoading) return;
    setIsFadingOut(true);
    const t = setTimeout(() => setIsLoading(false), 250);
    return () => clearTimeout(t);
  }, [isFadingOut, isLoading]);

  useEffect(() => {
    if (!active && progress >= 100) completeOverlay();
  }, [active, progress, completeOverlay]);

  useEffect(() => {
    const timeout = setTimeout(() => completeOverlay(), 8000);
    if (!isLoading) clearTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [isLoading, completeOverlay]);

  const messages =
    locale === 'zh'
      ? ['阿弥陀佛！欢迎来到中佛州净宗学会，您有什么问题？我可以帮助您查找法宝和回答简单的问题。']
      : [
          'Amitabha! Welcome to AMTBCF. How may I help you? I can help you find Dharma materials and answer simple questions.',
        ];

  return (
    <>
      {isLoading && <LoadingOverlay progress={progress} fading={isFadingOut} />}
      <div className={cn('relative flex min-h-screen flex-col')}>
        {/* Home-only particles background; not a theme change */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-neutral-950" />
          <Particles
            particleColors={['#FFE55C']}
            particleCount={200}
            particleSpread={10}
            speed={0.05}
            particleBaseSize={120}
            moveParticlesOnHover={false}
            alphaParticles={false}
            disableRotation={false}
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/80 via-neutral-950/40 to-transparent" />
        </div>
        <Navbar />

        <main className="relative flex flex-1 flex-col items-center justify-start p-4 pt-6 sm:pt-8 md:pt-12 lg:pt-14">
          {/* background intentionally left blank */}
          <div className="mx-auto w-full max-w-4xl space-y-4 text-center">
            <LotusModel />

            <div className="space-y-4">
              {/*
                Ma Shan Zheng only has a 400 weight. Requesting bold (700/800)
                can cause some browsers to pick a different Chinese font.
                For zh, keep headings at medium/normal to ensure MSZ renders.
              */}
              <h1 className={cn(locale === 'zh' ? 'font-medium' : 'font-bold')}>
                <span className="block font-serif text-5xl leading-[1.1] tracking-tight text-white sm:text-6xl md:text-7xl">
                  {locale === 'zh'
                    ? '中佛州净宗学会'
                    : 'Amitabha Buddhist Society of Central Florida'}
                </span>
              </h1>

              <ChatInput messages={messages} />
            </div>
          </div>
        </main>

        <footer className="mt-auto py-4">
          <div className="text-muted-foreground container mx-auto px-4 text-center text-sm">
            <p>© 2024 AMTBCF. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
