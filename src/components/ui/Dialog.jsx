import React from 'react';
import { cn } from './Button'; // reuse cn utility

/**
 * Simple wrapper around the native <dialog> element with Tailwind styling.
 * Exposes subcomponents to match the usage in the admin modals.
 */
export const Dialog = ({ open, onOpenChange, children, className }) => {
  const handleClose = () => {
    onOpenChange?.(false);
  };
  return (
    <dialog
      open={open}
      onClose={handleClose}
      className={cn('rounded-lg p-0 bg-surface shadow-lg max-w-md w-full', className)}
    >
      {children}
    </dialog>
  );
};

export const DialogContent = ({ children, className }) => {
  return <div className={cn('p-6', className)}>{children}</div>;
};

export const DialogHeader = ({ children, className }) => {
  return <div className={cn('mb-4', className)}>{children}</div>;
};

export const DialogTitle = ({ children, className }) => {
  return (
    <h2 className={cn('text-xl font-semibold text-text-main', className)}>{children}</h2>
  );
};

export const DialogDescription = ({ children, className }) => {
  return (
    <p className={cn('text-sm text-text-muted', className)}>{children}</p>
  );
};
