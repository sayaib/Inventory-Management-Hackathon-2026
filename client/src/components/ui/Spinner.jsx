import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Spinner({ className, ...props }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} {...props} />;
}

