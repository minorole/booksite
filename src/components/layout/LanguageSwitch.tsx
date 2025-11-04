'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { HOVER_LIFT_SHADOW } from '@/lib/ui';
import { replaceLeadingLocale } from '@/lib/i18n/paths';

export function LanguageSwitch() {
  const { locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = useCallback(
    (next: 'en' | 'zh') => {
      if (!pathname) return;
      const target = replaceLeadingLocale(pathname, next);
      router.push(target);
    },
    [pathname, router],
  );

  return (
    <Switch name="ui-language" size="small">
      <div
        onClick={() => switchTo('zh')}
        className={cn(HOVER_LIFT_SHADOW, 'rounded-md px-1 py-0.5')}
      >
        <Switch.Control label="中文" value="zh" defaultChecked={locale === 'zh'} />
      </div>
      <div
        onClick={() => switchTo('en')}
        className={cn(HOVER_LIFT_SHADOW, 'rounded-md px-1 py-0.5')}
      >
        <Switch.Control label="English" value="en" defaultChecked={locale === 'en'} />
      </div>
    </Switch>
  );
}

export default LanguageSwitch;
