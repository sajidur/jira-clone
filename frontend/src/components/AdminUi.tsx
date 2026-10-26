'use client';

import React from 'react';
import { Icons } from './Icons';

const LOZENGE_TONES = {
  success: 'bg-[#E3FCEF] text-[#006644]',
  neutral: 'bg-[#DFE1E6] text-[#42526E]',
  discovery: 'bg-[#EAE6FF] text-[#403294]',
  warning: 'bg-[#FFF0B3] text-[#172B4D]',
  info: 'bg-[#DEEBFF] text-[#0747A6]'
};

export const Lozenge: React.FC<{ tone: keyof typeof LOZENGE_TONES; children: React.ReactNode }> = ({ tone, children }) => (
  <span
    className={`inline-flex items-center px-1 rounded-[3px] text-[11px] font-bold uppercase leading-4 whitespace-nowrap ${LOZENGE_TONES[tone]}`}
  >
    {children}
  </span>
);

export const fieldClass =
  'w-full h-9 px-2.5 text-sm text-[#172B4D] bg-[#FAFBFC] border-2 border-[#DFE1E6] rounded-[3px] hover:bg-[#EBECF0] focus:bg-white focus:border-[#4C9AFF] focus:outline-none disabled:opacity-60';

export const Dialog: React.FC<{ title: string; children: React.ReactNode; onClose: () => void }> = ({
  title,
  children,
  onClose
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091E42]/50 p-4">
    <div className="bg-white rounded-[3px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <h2 className="text-xl font-semibold text-[#172B4D]">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-[3px] text-[#42526E] hover:bg-[#EBECF0] cursor-pointer"
          aria-label="Close"
        >
          <Icons.X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);
