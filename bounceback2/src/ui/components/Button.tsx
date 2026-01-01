import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = `
    font-semibold rounded-xl transition-all duration-200
    active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center justify-center gap-2
  `;

  const variantStyles = {
    primary: `
      bg-indigo-500 text-white
      hover:bg-indigo-600 active:bg-indigo-700
      shadow-lg shadow-indigo-500/30
    `,
    secondary: `
      bg-white text-indigo-600
      border-2 border-indigo-200
      hover:bg-indigo-50 active:bg-indigo-100
    `,
    ghost: `
      bg-transparent text-slate-600
      hover:bg-slate-100 active:bg-slate-200
    `,
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
