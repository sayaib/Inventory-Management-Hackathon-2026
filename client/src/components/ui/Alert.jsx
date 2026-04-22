import React from 'react';
import { cn } from '../../utils/cn';

export default function Alert({ variant = 'info', className, children, ...props }) {
  const variantClass =
    variant === 'error'
      ? 'app-alert app-alert-error'
      : variant === 'success'
        ? 'app-alert app-alert-success'
        : 'app-alert border-slate-200 bg-white text-slate-700';

  return (
    <div
      className={cn(variantClass, className)}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      {...props}
    >
      {children}
    </div>
  );
}

