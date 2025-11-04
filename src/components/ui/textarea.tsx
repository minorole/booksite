import * as React from 'react';

import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/lib/ui';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'border-input bg-background ring-offset-background placeholder:text-muted-foreground flex min-h-[80px] w-full rounded-md border px-3 py-2 text-base disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          FOCUS_RING,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
