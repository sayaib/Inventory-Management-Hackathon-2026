import React from 'react';
import { cn } from '../../utils/cn';

export default function EmptyState({ icon: Icon, title, description, className, action }) {
  return (
    <div className={cn('mx-auto w-full max-w-sm space-y-2 text-center', className)}>
      {Icon && (
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Icon className="h-5 w-5" />
        </div>
      )}
      {title && <div className="text-sm font-bold text-slate-800">{title}</div>}
      {description && <div className="text-xs text-slate-500">{description}</div>}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

