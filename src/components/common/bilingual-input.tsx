'use client';

import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Bilingual } from '@/components/common/bilingual';

type BilingualInputProps = React.ComponentProps<typeof Input> & {
  cnPlaceholder: React.ReactNode;
  enPlaceholder: React.ReactNode;
  wrapperClassName?: string;
  overlayClassName?: string;
};

export function BilingualInput({
  cnPlaceholder,
  enPlaceholder,
  className,
  wrapperClassName,
  overlayClassName,
  value,
  defaultValue,
  type = 'text',
  ...rest
}: BilingualInputProps) {
  const hasContent = useMemo(() => {
    if (typeof value === 'string') return value.length > 0;
    if (typeof defaultValue === 'string') return defaultValue.length > 0;
    return false;
  }, [value, defaultValue]);

  return (
    <div className={cn('relative', wrapperClassName)}>
      <Input
        type={type}
        placeholder=""
        className={cn('h-12 text-sm', className)}
        value={value as unknown as string | number | readonly string[] | undefined}
        defaultValue={defaultValue as unknown as string | number | readonly string[] | undefined}
        {...rest}
      />
      {!hasContent && (
        <div
          className={cn(
            'pointer-events-none absolute top-1/2 right-3 left-3 -translate-y-1/2 text-sm',
            overlayClassName,
          )}
        >
          <Bilingual cnText={cnPlaceholder} enText={enPlaceholder} />
        </div>
      )}
    </div>
  );
}

export default BilingualInput;
