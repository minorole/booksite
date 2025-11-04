'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

type SwitchContextType = {
  value: string | null;
  setValue: React.Dispatch<React.SetStateAction<string | null>>;
} | null;

const SwitchContext = createContext<SwitchContextType>(null);

interface SwitchProps {
  children: React.ReactNode;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  style?: React.CSSProperties;
}

export const Switch = ({ children, name = 'default', size = 'medium', style }: SwitchProps) => {
  const [value, setValue] = useState<string | null>(null);

  return (
    <SwitchContext.Provider value={{ value, setValue }}>
      <div
        className={clsx(
          'bg-background-100 border-gray-alpha-400 flex border p-1',
          size === 'small' && 'h-8 rounded-md',
          size === 'medium' && 'h-10 rounded-md',
          size === 'large' && 'h-12 rounded-lg',
        )}
        style={style}
      >
        {React.Children.map(children, (child) =>
          React.cloneElement(child as React.ReactElement<SwitchControlProps>, { size, name }),
        )}
      </div>
    </SwitchContext.Provider>
  );
};

interface SwitchControlProps {
  label?: string;
  value: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
}

const SwitchControl = ({
  label,
  value,
  defaultChecked,
  disabled = false,
  name,
  size = 'medium',
  icon,
}: SwitchControlProps) => {
  const context = useContext(SwitchContext);
  const checked = value === context?.value;

  useEffect(() => {
    if (defaultChecked) {
      context?.setValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <label
      className={clsx('flex h-full flex-1', disabled && 'pointer-events-none cursor-not-allowed')}
      onClick={() => context?.setValue(value)}
    >
      <input
        type="radio"
        name={name}
        value={value}
        disabled={disabled}
        checked={checked}
        className="hidden"
        readOnly
      />
      <span
        className={twMerge(
          clsx(
            'flex flex-1 cursor-pointer items-center justify-center font-sans font-medium duration-150',
            checked
              ? 'text-gray-1000 fill-gray-1000 rounded-sm bg-gray-100'
              : 'hover:text-gray-1000 hover:fill-gray-1000 fill-gray-900 text-gray-900',
            disabled && 'fill-gray-800 text-gray-800',
            !icon && size === 'small' && 'px-3 text-sm',
            !icon && size === 'medium' && 'px-3 text-sm',
            !icon && size === 'large' && 'px-4 text-base',
            icon && size === 'small' && 'px-2 py-1',
            icon && size === 'medium' && 'px-3 py-2',
            icon && size === 'large' && 'p-3',
          ),
        )}
      >
        {icon ? <span className={clsx(size === 'large' && 'scale-125')}>{icon}</span> : label}
      </span>
    </label>
  );
};

Switch.Control = SwitchControl as unknown as React.FC<SwitchControlProps>;

export default Switch;
