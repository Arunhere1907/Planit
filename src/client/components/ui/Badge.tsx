import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline' | 'amber';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const base = 'inline-flex items-center font-semibold rounded-full';
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs'
  }[size];

  const variants = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    primary: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    amber: 'bg-amber-100 text-amber-800 border border-amber-300',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    outline: 'bg-transparent text-slate-600 border border-slate-300'
  }[variant];

  return <span className={`${base} ${sizes} ${variants} ${className}`}>{children}</span>;
};
