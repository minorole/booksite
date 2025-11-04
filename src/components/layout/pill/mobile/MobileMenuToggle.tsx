'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export type MobileMenuToggleProps = {
  isOpen: boolean;
  onClick: () => void;
  menuId: string;
  ariaLabelClosed: string;
  ariaLabelOpen: string;
};

export const MobileMenuToggle = React.forwardRef<HTMLButtonElement, MobileMenuToggleProps>(
  function MobileMenuToggle({ isOpen, onClick, menuId, ariaLabelClosed, ariaLabelOpen }, ref) {
    const ariaLabel = isOpen ? ariaLabelOpen : ariaLabelClosed;
    return (
      <Button
        ref={ref}
        type="button"
        size="icon"
        variant="outline"
        className="ml-1 h-9 w-9 rounded-full md:hidden"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="dialog"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
    );
  },
);
