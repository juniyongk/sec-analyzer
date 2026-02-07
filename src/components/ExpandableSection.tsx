'use client';

import { useState, ReactNode } from 'react';

interface ExpandableSectionProps {
  title: string;
  badge?: string;
  badgeColor?: 'blue' | 'yellow' | 'red' | 'green';
  children: ReactNode;
  defaultOpen?: boolean;
}

const badgeColors = {
  blue: 'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  green: 'bg-green-100 text-green-700',
};

export default function ExpandableSection({
  title,
  badge,
  badgeColor = 'blue',
  children,
  defaultOpen = false,
}: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
          {badge && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColors[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
