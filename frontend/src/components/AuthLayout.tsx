'use client';

import React from 'react';
import { Icons } from './Icons';

export const authInputClass =
  'w-full h-10 px-2.5 text-sm text-[#172B4D] bg-[#FAFBFC] border-2 border-[#DFE1E6] rounded-[3px] placeholder:text-[#7A869A] hover:bg-[#EBECF0] focus:bg-white focus:border-[#4C9AFF] focus:outline-none transition-colors';

export const authPrimaryButtonClass =
  'w-full h-10 rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] active:bg-[#0747A6] disabled:bg-[#0052CC]/70 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-wait';

const ALERT_TONES = {
  error: { box: 'bg-[#FFEBE6] text-[#BF2600]', icon: <Icons.X className="w-4 h-4 mt-px shrink-0" /> },
  success: { box: 'bg-[#E3FCEF] text-[#006644]', icon: <Icons.CheckCircle className="w-4 h-4 mt-px shrink-0" /> },
  info: { box: 'bg-[#DEEBFF] text-[#172B4D]', icon: <Icons.Help className="w-4 h-4 mt-px shrink-0 text-[#0052CC]" /> }
};

export const AuthAlert: React.FC<{ tone: keyof typeof ALERT_TONES; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={`mt-5 flex items-start gap-2 rounded-[3px] px-3 py-2.5 text-[13px] leading-relaxed ${ALERT_TONES[tone].box}`}
  >
    {ALERT_TONES[tone].icon}
    <div>{children}</div>
  </div>
);

/** Card layout shared by the login, forgot password and reset password screens. */
export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="h-screen w-full overflow-y-auto bg-[#FAFBFC] relative">
    <BoardIllustration className="hidden lg:block fixed bottom-0 left-0 w-[340px] xl:w-[400px] pointer-events-none select-none" />
    <ReportIllustration className="hidden lg:block fixed bottom-0 right-0 w-[340px] xl:w-[400px] pointer-events-none select-none" />

    <main className="relative z-10 min-h-full flex flex-col items-center justify-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-[400px] bg-white rounded-[3px] shadow-[0_0_10px_rgba(9,30,66,0.12)] px-6 sm:px-10 pt-8 pb-6">
        <div className="flex items-center justify-center gap-2">
          <Icons.JiraLogo className="w-8 h-8" />
          <span className="text-[28px] leading-none font-semibold tracking-tight text-[#253858]">Jira</span>
        </div>

        {children}

        <div className="mt-8 pt-5 border-t border-[#DFE1E6] text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-[#253858]">
            <Icons.JiraLogo className="w-4 h-4" />
            <span>JIRA CLONE</span>
          </div>
          <p className="text-[11px] text-[#5E6C84]">One account for all your projects, boards and reports.</p>
        </div>
      </div>

      <p className="mt-6 text-[11px] text-[#7A869A]">Self-hosted · .NET 10 + PostgreSQL</p>
    </main>
  </div>
);

const BoardIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 400 340" fill="none" aria-hidden="true">
    <circle cx="110" cy="330" r="200" fill="#DEEBFF" />
    <rect x="48" y="118" width="250" height="176" rx="10" fill="#FFFFFF" stroke="#DFE1E6" strokeWidth="2" />
    <rect x="64" y="134" width="66" height="8" rx="4" fill="#C1C7D0" />
    <rect x="142" y="134" width="66" height="8" rx="4" fill="#C1C7D0" />
    <rect x="220" y="134" width="62" height="8" rx="4" fill="#C1C7D0" />
    <rect x="64" y="154" width="66" height="40" rx="5" fill="#F4F5F7" />
    <rect x="64" y="154" width="4" height="40" rx="2" fill="#0052CC" />
    <rect x="74" y="164" width="44" height="6" rx="3" fill="#97A0AF" />
    <rect x="74" y="176" width="28" height="6" rx="3" fill="#DFE1E6" />
    <rect x="64" y="202" width="66" height="40" rx="5" fill="#F4F5F7" />
    <rect x="64" y="202" width="4" height="40" rx="2" fill="#FFAB00" />
    <rect x="74" y="212" width="38" height="6" rx="3" fill="#97A0AF" />
    <rect x="142" y="154" width="66" height="40" rx="5" fill="#F4F5F7" />
    <rect x="142" y="154" width="4" height="40" rx="2" fill="#6554C0" />
    <rect x="152" y="164" width="46" height="6" rx="3" fill="#97A0AF" />
    <rect x="152" y="176" width="24" height="6" rx="3" fill="#DFE1E6" />
    <rect x="220" y="154" width="62" height="40" rx="5" fill="#F4F5F7" />
    <rect x="220" y="154" width="4" height="40" rx="2" fill="#36B37E" />
    <rect x="230" y="164" width="40" height="6" rx="3" fill="#97A0AF" />
    <circle cx="268" cy="214" r="16" fill="#36B37E" />
    <path d="M260 214l5.5 5.5L276 209" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="24" y="250" width="70" height="44" rx="6" fill="#0052CC" />
    <rect x="34" y="262" width="40" height="6" rx="3" fill="#4C9AFF" />
    <rect x="34" y="274" width="26" height="6" rx="3" fill="#4C9AFF" />
  </svg>
);

const ReportIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 400 340" fill="none" aria-hidden="true">
    <circle cx="290" cy="330" r="200" fill="#E3FCEF" />
    <rect x="100" y="110" width="250" height="180" rx="10" fill="#FFFFFF" stroke="#DFE1E6" strokeWidth="2" />
    <rect x="118" y="128" width="90" height="8" rx="4" fill="#C1C7D0" />
    <rect x="128" y="226" width="22" height="46" rx="3" fill="#B3D4FF" />
    <rect x="162" y="204" width="22" height="68" rx="3" fill="#4C9AFF" />
    <rect x="196" y="186" width="22" height="86" rx="3" fill="#0052CC" />
    <rect x="230" y="214" width="22" height="58" rx="3" fill="#79E2F2" />
    <rect x="264" y="172" width="22" height="100" rx="3" fill="#00B8D9" />
    <path d="M124 196l38-22 34 10 34-26 34 8 34-24" stroke="#FF5630" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="300" cy="134" r="12" fill="#FFAB00" />
    <circle cx="322" cy="134" r="12" fill="#6554C0" />
    <rect x="296" y="236" width="80" height="48" rx="6" fill="#36B37E" />
    <rect x="306" y="248" width="44" height="6" rx="3" fill="#ABF5D1" />
    <rect x="306" y="260" width="28" height="6" rx="3" fill="#ABF5D1" />
  </svg>
);
