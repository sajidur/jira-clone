'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * Jira-style popover menu anchored to a button. It is position: fixed, so scrolling containers such as
 * the sidebar can't clip it. Closes on an outside click or Escape.
 */
export const Popover: React.FC<{
  anchor: DOMRect;
  placement?: 'right' | 'below' | 'below-end';
  width?: number;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ anchor, placement = 'right', width = 320, label, onClose, children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    setHeight(panelRef.current?.offsetHeight ?? 0);
  }, [children]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const panelWidth = Math.min(width, vw - 16);
  let left = placement === 'right' ? anchor.right + 8 : placement === 'below-end' ? anchor.right - panelWidth : anchor.left;
  let top = placement === 'right' ? anchor.top - 4 : anchor.bottom + 4;
  left = Math.max(8, Math.min(left, vw - panelWidth - 8));
  top = Math.max(8, Math.min(top, vh - Math.max(height, 40) - 8));

  return (
    <>
      <div className="fixed inset-0 z-[60]" onMouseDown={onClose} />
      <div
        ref={panelRef}
        role="menu"
        aria-label={label}
        className="fixed z-[61] max-h-[min(70vh,560px)] overflow-y-auto bg-white rounded-[3px] shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)] py-2 text-sm"
        style={{ top, left, width: panelWidth }}
      >
        {children}
      </div>
    </>
  );
};

export const MenuSection: React.FC<{ title?: string; children: React.ReactNode; divider?: boolean }> = ({
  title,
  children,
  divider
}) => (
  <div className={divider ? 'mt-1.5 pt-1.5 border-t border-[#EBECF0]' : ''}>
    {title && <div className="px-4 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#5E6C84]">{title}</div>}
    {children}
  </div>
);

const itemClass =
  'w-full flex items-center gap-3 px-4 py-1.5 text-left text-[#172B4D] hover:bg-[#F4F5F7] active:bg-[#DEEBFF] focus:outline-none focus-visible:bg-[#F4F5F7] cursor-pointer';

export const MenuLink: React.FC<{
  href: string;
  icon?: React.ReactNode;
  description?: string;
  external?: boolean;
  onNavigate?: () => void;
  children: React.ReactNode;
}> = ({ href, icon, description, external, onNavigate, children }) =>
  external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={onNavigate} className={itemClass}>
      {icon && <span className="shrink-0 text-[#42526E]">{icon}</span>}
      <span className="flex-1 min-w-0 truncate">{children}</span>
      <span className="text-[#7A869A] text-xs" aria-hidden="true">↗</span>
    </a>
  ) : (
    <Link href={href} role="menuitem" onClick={onNavigate} className={itemClass}>
      {icon && <span className="shrink-0 text-[#42526E]">{icon}</span>}
      <span className="flex-1 min-w-0">
        <span className="block truncate">{children}</span>
        {description && <span className="block text-[11px] text-[#5E6C84] truncate">{description}</span>}
      </span>
    </Link>
  );

export const MenuButton: React.FC<{
  onClick: () => void;
  icon?: React.ReactNode;
  shortcut?: string;
  children: React.ReactNode;
}> = ({ onClick, icon, shortcut, children }) => (
  <button type="button" role="menuitem" onClick={onClick} className={itemClass}>
    {icon && <span className="shrink-0 text-[#42526E]">{icon}</span>}
    <span className="flex-1 min-w-0 truncate">{children}</span>
    {shortcut && (
      <kbd className="px-1.5 py-px rounded bg-[#F4F5F7] border border-[#DFE1E6] text-[10px] text-[#5E6C84] font-mono">
        {shortcut}
      </kbd>
    )}
  </button>
);

export const MenuEmpty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-4 py-1.5 text-sm text-[#5E6C84] leading-relaxed">{children}</p>
);
