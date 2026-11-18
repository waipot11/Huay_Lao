import React from 'react';
import { Sparkles, CalendarClock, BarChart3, Image as ImageIcon, Facebook, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { LotteryType, LOTTERY_CONFIGS, ALL_LOTTERY_TYPES } from '../utils/lotteryTypes';

interface NavbarProps {
  activeTab: 'ai' | 'facebook' | 'telegram' | 'banner' | 'stats';
  setActiveTab: (tab: 'ai' | 'facebook' | 'telegram' | 'banner' | 'stats') => void;
  fbConnected: boolean;
  upcomingDateThai: string;
  lotteryType: LotteryType;
  onChangeLotteryType: (type: LotteryType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  fbConnected,
  lotteryType,
  onChangeLotteryType,
}) => {
  const cfg = LOTTERY_CONFIGS[lotteryType];

  const activePillStyles: Record<LotteryType, string> = {
    lao: 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30',
    hanoi: 'bg-rose-500 text-white font-bold shadow-sm shadow-rose-500/30',
    malay: 'bg-cyan-400 text-slate-950 font-bold shadow-sm shadow-cyan-500/30',
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 sm:px-6 py-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Zone 1: Wordmark Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center text-slate-950 font-bold">
            <span className="text-sm font-extrabold tracking-tighter">{cfg.flag} AI</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              LaoLotto AI
            </span>
            <span className="text-[11px] text-amber-400/90 hidden xl:inline whitespace-nowrap font-medium">
              {cfg.name} • ออก {cfg.drawTimeLabel} ({cfg.drawScheduleLabel})
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="order-3 lg:order-2 w-full lg:w-auto flex flex-wrap items-center gap-1.5 py-0.5">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>วิเคราะห์ AI</span>
          </button>

          <button
            onClick={() => setActiveTab('facebook')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'facebook'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5 text-blue-400" />
            <span>โพสต์ Facebook</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded font-mono">
              {cfg.defaultDaysAheadPost} วัน
            </span>
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'telegram'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-300 hover:text-sky-300 hover:bg-sky-500/10 border border-sky-500/20'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-[#229ED9]" />
            <span className="font-semibold text-sky-400">กลุ่ม Telegram</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-sky-500/20 text-sky-300 rounded font-mono">
              3 หวย
            </span>
          </button>

          <button
            onClick={() => setActiveTab('banner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'banner'
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>การ์ดโพสต์ HD</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>สถิติ & หลายแหล่ง</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action / Status */}
        <div className="order-2 lg:order-3 flex items-center gap-2.5 shrink-0">
          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 border border-slate-800 bg-slate-900/80 px-3 py-1.5 rounded-lg">
            <Facebook className={`w-3.5 h-3.5 ${fbConnected ? 'text-blue-400' : 'text-slate-500'}`} />
            <span>{fbConnected ? 'เชื่อมต่อเพจแล้ว' : 'พร้อมเชื่อมเพจ'}</span>
            {fbConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>

          <button
            onClick={() => setActiveTab('facebook')}
            className="px-3 py-1.5 text-xs font-medium text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all rounded-lg shadow-sm shadow-amber-500/20 whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>ตั้งเวลาออโต้</span>
          </button>
        </div>
      </div>

      {/* Lottery Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1">เลือกประเภทหวย:</span>
          {ALL_LOTTERY_TYPES.map((lt) => {
            const item = LOTTERY_CONFIGS[lt];
            const isActive = lotteryType === lt;
            return (
              <button
                key={lt}
                type="button"
                onClick={() => onChangeLotteryType(lt)}
                className={`px-3 py-1 rounded-lg text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? activePillStyles[lt]
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{item.flag}</span>
                <span>{item.shortName}</span>
                <span className={`text-[10px] font-mono ${isActive ? 'opacity-80' : 'text-slate-400'}`}>
                  ({item.drawTimeLabel.replace(' น.', '')})
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
          <span>กำลังแสดง:</span>
          <strong className="text-slate-200">{cfg.flag} {cfg.name}</strong>
          <span className="text-slate-600">•</span>
          <span>{cfg.drawScheduleLabel}</span>
        </div>
      </div>
    </header>
  );
};
