import React, { useState, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  HelpCircle,
  Smartphone,
  Sparkles,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Info,
  Calendar,
  Eye,
  EyeOff,
  UserCheck,
  KeyRound,
  QrCode,
  ClipboardPaste,
  Lock,
  Radio,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { UpcomingDrawInfo, ComprehensiveStats } from '../utils/lotteryStats';

export interface LineConfig {
  enabled: boolean;
  type?: 'messaging_api';
  channelAccessToken: string;
  userId: string; // LINE User ID (e.g. U0123456789abcdef0123456789abcdef)
  targetUserId?: string; // backwards compatibility
  sendMode?: 'push' | 'broadcast';
  lineNotifyToken?: string;
  webhookUrl?: string;
  hoursAhead: number; // default 2
  customAlertTime?: string; // HH:mm e.g. "18:30"
  targetTime: string; // e.g. "18:30 น."
  status: 'connected' | 'disconnected' | 'testing';
  lastNotifiedDate?: string;
  lastAttemptDate?: string;
  lastSyncTime?: string;
}

export interface LineSchedulerStatus {
  serverBangkokTime: string;
  serverBangkokDate: string;
  dayOfWeekThai: string;
  isDrawDay: boolean;
  targetAlertTime: string;
  targetAlertHHMM: string;
  isPastAlertTimeToday: boolean;
  isBeforeDrawToday: boolean;
  enabled: boolean;
  hasToken: boolean;
  hasRecipient: boolean;
  envConfigured?: {
    hasEnvToken: boolean;
    hasEnvUserId: boolean;
  };
  configSaved: boolean;
  alreadyNotifiedToday: boolean;
  lastNotifiedDate: string | null;
  lastSyncTime: string | null;
}

export interface LineNotificationLog {
  id: string;
  sentAt: string;
  drawDate: string;
  drawDateThai: string;
  status: 'success' | 'failed' | 'simulated';
  recipient: string;
  numbersSummary: string;
  messagePreview: string;
  error?: string;
}

interface LineNotifyTabProps {
  config: LineConfig;
  schedulerStatus?: LineSchedulerStatus | null;
  upcoming: UpcomingDrawInfo;
  stats: ComprehensiveStats;
  logs: LineNotificationLog[];
  onSaveConfig: (cfg: Partial<LineConfig>) => Promise<void>;
  onTestSend: (
    customMessage?: string,
    credentials?: { channelAccessToken?: string; userId?: string; sendMode?: 'push' | 'broadcast' }
  ) => Promise<{ success: boolean; message: string; isSimulated?: boolean }>;
  onRefreshStatus?: () => Promise<void>;
  onForceTrigger?: () => Promise<{ success: boolean; triggered?: boolean; reason?: string; result?: { success: boolean; message: string } }>;
}

export const LineNotifyTab: React.FC<LineNotifyTabProps> = ({
  config,
  schedulerStatus,
  upcoming,
  stats,
  logs,
  onSaveConfig,
  onTestSend,
  onRefreshStatus,
  onForceTrigger,
}) => {
  const [enabled, setEnabled] = useState(config.enabled ?? true);
  const [token, setToken] = useState(config.channelAccessToken || '');
  const [userId, setUserId] = useState(config.userId || config.targetUserId || '');
  const [sendMode, setSendMode] = useState<'push' | 'broadcast'>(config.sendMode || 'push');
  const [hoursAhead, setHoursAhead] = useState(config.hoursAhead || 2);
  const [customAlertTime, setCustomAlertTime] = useState(config.customAlertTime || '18:30');
  const [showToken, setShowToken] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string; isSimulated?: boolean } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedCronUrl, setCopiedCronUrl] = useState(false);
  const [copiedSecretKey, setCopiedSecretKey] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'preview' | 'logs' | 'guide'>('settings');

  // Sync local form state when config loads/updates from server
  useEffect(() => {
    setEnabled(config.enabled ?? true);
    if (config.channelAccessToken !== undefined) setToken(config.channelAccessToken || '');
    if (config.userId !== undefined || config.targetUserId !== undefined) {
      setUserId(config.userId || config.targetUserId || '');
    }
    if (config.sendMode) setSendMode(config.sendMode);
    if (config.hoursAhead) setHoursAhead(config.hoursAhead);
    if (config.customAlertTime) setCustomAlertTime(config.customAlertTime);
  }, [config.channelAccessToken, config.userId, config.targetUserId, config.sendMode, config.hoursAhead, config.customAlertTime, config.enabled]);

  const conv3D = stats.threeDigitConviction;
  const portfolio15 = conv3D.fifteenSetsPortfolio;
  const main3D = conv3D.mainPick;
  const main4D = conv3D.fourDigitJackpot;
  const highlightMain = String(stats.hotDigits[0] ?? main3D[0] ?? '0');
  const highlightSecondary = String(stats.hotDigits[1] ?? main3D[1] ?? '0');
  const topPairs = (conv3D.derivedTwoDigits?.topList || [conv3D.derivedTwoDigits.top]).join(' - ');
  const bottomPairs = (conv3D.derivedTwoDigits?.bottomList || [conv3D.derivedTwoDigits.bottom]).join(' - ');
  const animalMain = `${conv3D.animalLink.name} (${conv3D.animalLink.number})`;
  const animalBackup = `${conv3D.animalBackup?.name || conv3D.animalLink.name} (${conv3D.animalBackup?.number || conv3D.animalLink.number})`;
  const doubleShieldList = portfolio15.doubleShieldSets || conv3D.doubleShieldSets || [];

  const targetNotificationTime = `${customAlertTime || '18:30'} น.`;
  const cronTriggerUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/line/cron-trigger` : '/api/line/cron-trigger';

  // Standard LINE Push Alert Template
  const lineAlertMessage = `🇱🇦【 แจ้งเตือนด่วน! หวยลาวพัฒนาออกวันนี้ 】🇱🇦
⏰ เวลาแจ้งเตือน ${targetNotificationTime} (หวยออกเวลา 20:30 น.)
งวดประจำ${upcoming.drawDateThai}

👑 【 ฟันธง 3 ตัวเต็ง เม็ดเดียว 】:  🌟 ${main3D} 🌟
💎 ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด):
${conv3D.permutations6.join(' - ')}

🛡️ 【 พอร์ต 15 ชุดเต็งตรง (10 ชุดหลัก + 5 ชุดเกราะกันเบิ้ล) 】:
🥇 Tier 1 (เม็ดทองเน้นหนัก): ${portfolio15.tier1Gold.join(' - ')}
🥈 Tier 2 (เม็ดเงินเต็งรอง): ${portfolio15.tier2Silver.join(' - ')}
🥉 Tier 3 (เกราะกันหลุด/กันเบิ้ล): ${portfolio15.tier3Shield.join(' - ')}
${doubleShieldList.length > 0 ? `🛡️ ชุดกันเบิ้ล/หามในพอร์ต: ${doubleShieldList.join(' - ')}\n` : ''}(💡 แนะนำแทงแบบ "เต็งควบโต๊ด" ป้องกันทั้งเลขสลับหลักและเลขเบิ้ล!)

⭐ 4 ตัวแจ็กพอตเสริม: ${main4D}
⭐ เลขเด่น: ${highlightMain}  |  เลขรอง: ${highlightSecondary}  |  วิ่ง/รูด: ${highlightMain} - ${highlightSecondary}

🎯 เจาะ 2 ตัวบน: ${topPairs}
🎯 เจาะ 2 ตัวล่าง: ${bottomPairs}

🐉 นามสัตว์มงคล: ${animalMain} / ${animalBackup}

⚠️ ระบบปิดรับแทงประมาณ 20:00 น. ขอให้รวยรับทรัพย์ทุกท่านครับ! 💰✨`;

  const handleSelectPresetHours = (hours: number) => {
    setHoursAhead(hours);
    const computedHour = Math.max(0, 20 - hours);
    setCustomAlertTime(`${String(computedHour).padStart(2, '0')}:30`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      await onSaveConfig({
        enabled,
        type: 'messaging_api',
        channelAccessToken: token.trim(),
        userId: userId.trim(),
        targetUserId: userId.trim(),
        sendMode,
        hoursAhead,
        customAlertTime,
        targetTime: targetNotificationTime,
      });
      setTestResult({
        type: 'success',
        text: `บันทึกการตั้งค่า LINE Messaging API เรียบร้อยแล้ว (ตั้งปลุกเวลา ${targetNotificationTime})`,
      });
      if (onRefreshStatus) await onRefreshStatus();
    } catch (e: any) {
      setTestResult({ type: 'error', text: e.message || 'บันทึกไม่สำเร็จ' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAuto = async () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    try {
      await onSaveConfig({ enabled: nextEnabled });
      if (onRefreshStatus) await onRefreshStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const trimmedToken = token.trim();
      const trimmedUserId = userId.trim();

      const res = await onTestSend(lineAlertMessage, {
        channelAccessToken: trimmedToken,
        userId: sendMode === 'broadcast' ? 'broadcast' : trimmedUserId,
        sendMode,
      });

      setTestResult({
        type: res.success ? 'success' : 'error',
        text: res.message,
        isSimulated: res.isSimulated,
      });
    } catch (e: any) {
      setTestResult({ type: 'error', text: e.message || 'การส่งทดสอบล้มเหลว' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleForceTriggerNow = async () => {
    if (!onForceTrigger) return;
    setIsForcing(true);
    setTestResult(null);
    try {
      // Save latest settings first
      await onSaveConfig({
        enabled,
        channelAccessToken: token.trim(),
        userId: userId.trim(),
        targetUserId: userId.trim(),
        sendMode,
        hoursAhead,
        customAlertTime,
        targetTime: targetNotificationTime,
      });
      const res = await onForceTrigger();
      if (res.result) {
        setTestResult({
          type: res.result.success ? 'success' : 'error',
          text: res.result.message,
        });
      } else {
        setTestResult({
          type: res.triggered ? 'success' : 'error',
          text: res.reason || 'ไม่สามารถส่งรอบอัตโนมัติได้',
        });
      }
    } catch (e: any) {
      setTestResult({ type: 'error', text: e.message || 'เกิดข้อผิดพลาด' });
    } finally {
      setIsForcing(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(lineAlertMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleCopyCronUrl = () => {
    navigator.clipboard.writeText(cronTriggerUrl);
    setCopiedCronUrl(true);
    setTimeout(() => setCopiedCronUrl(false), 2000);
  };

  const handlePasteToken = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setToken(text.trim());
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
  };

  const handlePasteUserId = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUserId(text.trim());
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
  };

  const handleCopySecretKey = (keyName: string) => {
    navigator.clipboard.writeText(keyName);
    setCopiedSecretKey(keyName);
    setTimeout(() => setCopiedSecretKey(null), 1800);
  };

  const hasEnvToken = Boolean(schedulerStatus?.envConfigured?.hasEnvToken);
  const hasEnvUserId = Boolean(schedulerStatus?.envConfigured?.hasEnvUserId);
  const isTokenConfigured = Boolean((token && token.trim().length > 20) || hasEnvToken);
  const isUserIdConfigured = Boolean((userId && userId.trim().startsWith('U') && userId.trim().length >= 30) || hasEnvUserId);

  return (
    <div className="space-y-6">
      {/* Top Banner Header: LINE Messaging API Branding */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-950 to-slate-900 border-2 border-[#06C755]/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#06C755]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-[#06C755] text-white flex items-center justify-center font-black shadow-xl shadow-emerald-500/25 shrink-0">
              <MessageSquare className="w-7 h-7 sm:w-9 sm:h-9" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  LINE Messaging API (Push Message)
                </h1>
                <span className="px-3 py-0.5 rounded-full bg-[#06C755]/20 text-emerald-300 border border-[#06C755]/40 text-xs font-bold font-mono flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-[#06C755] animate-pulse' : 'bg-slate-500'}`} />
                  {enabled ? `เตือนออโต้เวลา ${targetNotificationTime}` : 'ปิดระบบชั่วคราว'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                ส่งตรงเข้าบัญชี LINE ของคุณผ่าน <strong>Push Message</strong> หรือบรอดแคสต์หาผู้ติดตามอัตโนมัติเวลา{' '}
                <strong className="text-[#06C755] font-mono font-bold">{targetNotificationTime}</strong> ของวันหวยออก (จันทร์, พุธ, ศุกร์)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0 flex-wrap">
            <button
              onClick={handleTestNotification}
              disabled={isTesting}
              className="px-4 py-2.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-[#06C755]/25 flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isTesting ? 'กำลังยิงข้อความเข้า LINE...' : '🔔 ทดสอบส่ง LINE ทันที'}</span>
            </button>

            <button
              onClick={handleToggleAuto}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                enabled
                  ? 'bg-emerald-950/80 border-[#06C755]/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {enabled ? <ToggleRight className="w-5 h-5 text-[#06C755]" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
              <span className="hidden sm:inline">{enabled ? 'เปิดออโต้' : 'ปิดออโต้'}</span>
            </button>
          </div>
        </div>

        {/* Live Feedback Alert */}
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm transition-all ${
              testResult.type === 'success'
                ? 'bg-emerald-950/90 border-[#06C755]/70 text-emerald-100'
                : 'bg-rose-950/90 border-rose-500/70 text-rose-100'
            }`}
          >
            {testResult.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#06C755] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold">
                {testResult.type === 'success' ? 'สำเร็จ:' : 'เกิดข้อผิดพลาดในการส่ง LINE:'}
              </div>
              <div className="leading-relaxed">{testResult.text}</div>
              {testResult.isSimulated && (
                <div className="text-[11px] text-amber-300 font-mono pt-1">
                  💡 หมายเหตุ: ระบบทำการจำลองข้อความสำเร็จ กรอก Channel Access Token และ User ID ด้านล่างแล้วกด "บันทึกการตั้งค่า" เพื่อเปิดใช้งานการส่งจริง
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto">
          {[
            { id: 'settings', label: '⚙️ ตั้งค่า Token, User ID & เวลาเตือน', badge: null },
            { id: 'preview', label: '📱 ตัวอย่างข้อความแชต LINE', badge: 'ห้องแชต' },
            { id: 'logs', label: '📜 ประวัติการส่งแจ้งเตือน', badge: `${logs.length}` },
            { id: 'guide', label: '📖 วิธีหา Token & ตั้งปลุก 24 ชม.', badge: 'สำคัญ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-[#06C755] text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white font-mono">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Live Scheduler Diagnostic Monitor */}
      {schedulerStatus && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[#06C755] shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white">สถานะตัวตั้งเวลาฝั่งเซิร์ฟเวอร์ (GMT+7):</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-amber-300 font-bold">
                  วัน{schedulerStatus.dayOfWeekThai} {schedulerStatus.serverBangkokTime}
                </span>
                {schedulerStatus.isDrawDay ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    วันนี้วันหวยลาวออก
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    วันนี้ไม่มีออกรางวัล
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-slate-400">
                <span className={schedulerStatus.hasToken ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>
                  {schedulerStatus.hasToken ? '✅ Token บันทึกแล้ว' : '❌ ยังไม่บันทึก Token ลงเซิร์ฟเวอร์'}
                </span>
                <span>•</span>
                <span className={schedulerStatus.hasRecipient ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>
                  {schedulerStatus.hasRecipient ? '✅ มี User ID / Broadcast' : '❌ ยังไม่ระบุ User ID'}
                </span>
                <span>•</span>
                <span className={schedulerStatus.alreadyNotifiedToday ? 'text-emerald-400' : 'text-amber-300'}>
                  {schedulerStatus.alreadyNotifiedToday
                    ? '✅ ส่งแจ้งเตือนรอบวันนี้แล้ว'
                    : schedulerStatus.isDrawDay && schedulerStatus.isPastAlertTimeToday
                    ? '⏰ เลยเวลาเตือนรอบวันนี้แล้ว (กดส่งด่วนได้เลย)'
                    : `⏳ รอรอบแจ้งเตือนเวลา ${schedulerStatus.targetAlertTime}`}
                </span>
              </div>
            </div>
          </div>

          {onForceTrigger && (
            <button
              type="button"
              onClick={handleForceTriggerNow}
              disabled={isForcing}
              className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isForcing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{isForcing ? 'กำลังยิงรอบวันนี้...' : '⚡ สั่งยิงแจ้งเตือนรอบวันนี้ทันที'}</span>
            </button>
          )}
        </div>
      )}

      {/* SUB-TAB 1: SETTINGS (FOCUSED ON CHANNEL ACCESS TOKEN, USER ID & SCHEDULING) */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Setting Form (2 Columns) */}
          <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-[#06C755]" />
                <h3 className="text-base font-bold text-white">
                  ตั้งค่าการเชื่อมต่อ LINE Messaging API (Push Message)
                </h3>
              </div>
              <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" /> เข้ารหัสปลอดภัย
              </span>
            </div>

            {/* Cloud Run Sleep Warning & Solution Notice */}
            <div className="bg-amber-950/30 border border-amber-500/40 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1.5">
                <h4 className="font-bold text-amber-300">
                  ทำไมต้องตั้งค่า "ตัวปลุกอัตโนมัติ" ถ้าปิดหน้าเว็บทิ้งไว้?
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  1) เมื่อเปิดหน้าเว็บนี้ทิ้งไว้ เซิร์ฟเวอร์จะตรวจสอบและส่งอัตโนมัติตามเวลาที่ตั้งไว้ได้ทันที (แก้ไขบั๊กเช็กนาทีแล้ว)<br />
                  2) แต่หาก<strong>ปิดเบราว์เซอร์หรือปิดหน้าจอมือถือ</strong> Cloud Run จะเข้าโหมดหลับ (Sleep) ทำให้ตัวจับเวลาหยุดเดิน แนะนำให้คัดลอกลิงก์ <strong>Cron Trigger</strong> ด้านขวาล่างไปใส่ใน <span className="text-emerald-300 font-bold">cron-job.org (ฟรี)</span> เพื่อปลุกเซิร์ฟเวอร์ให้ยิง LINE ตรงเวลา 100% ทุกวันจันทร์/พุธ/ศุกร์!
                </p>
              </div>
            </div>

            {/* Mode Selector: Push vs Broadcast */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-300 block">
                เลือกรูปแบบการจัดส่ง (Delivery Mode):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSendMode('push')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    sendMode === 'push'
                      ? 'bg-emerald-500/20 border-[#06C755] text-white shadow-sm ring-1 ring-[#06C755]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#06C755]" />
                      Push Message (ส่งตรงถึงคุณ)
                    </span>
                    <span className="text-[10px] bg-[#06C755] text-slate-950 font-black px-2 py-0.5 rounded-full">
                      แนะนำ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ส่งตรงเข้าบัญชี LINE ส่วนตัวของคุณผ่าน <strong>User ID</strong>
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSendMode('broadcast')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    sendMode === 'broadcast'
                      ? 'bg-emerald-500/20 border-[#06C755] text-white shadow-sm ring-1 ring-[#06C755]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      Broadcast (ส่งหาผู้ติดตามทุกคน)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ส่งบรอดแคสต์กระจายหาสมาชิกทุกคนที่ติดตาม LINE OA
                  </p>
                </button>
              </div>
            </div>

            {/* AI Studio Secrets / Environment Variables Integration Card */}
            <div className="bg-emerald-950/25 border border-[#06C755]/40 p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#06C755]" />
                  <span>ตั้งค่าถาวรใน AI Studio → Secrets / Environment Variables</span>
                </h4>
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                    hasEnvToken && (sendMode === 'broadcast' || hasEnvUserId)
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {hasEnvToken && (sendMode === 'broadcast' || hasEnvUserId)
                    ? '✅ เชื่อมต่อจาก Secrets แล้ว'
                    : 'ยังไม่ได้ตั้งใน Secrets'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                เพื่อไม่ให้ Token หายเมื่อรีสตาร์ทหรือ Deploy ใหม่ แนะนำให้เพิ่มชื่อตัวแปรด้านล่างในเมนู{' '}
                <strong className="text-white">Secrets / Environment Variables</strong> ของ AI Studio (เมื่อตั้งแล้วระบบจะดึงมาใช้ให้อัตโนมัติทันที):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                {[
                  {
                    key: 'LINE_CHANNEL_ACCESS_TOKEN',
                    active: hasEnvToken,
                    desc: 'วาง Channel access token (long-lived)',
                  },
                  {
                    key: 'LINE_USER_ID',
                    active: hasEnvUserId,
                    desc: 'วาง Your user ID (ขึ้นต้นด้วย U...)',
                  },
                ].map((envItem) => (
                  <div
                    key={envItem.key}
                    className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono font-bold text-amber-300 text-[11px] truncate">{envItem.key}</code>
                        <span className={envItem.active ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {envItem.active ? '● พร้อมใช้' : '○ ว่าง'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">{envItem.desc}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopySecretKey(envItem.key)}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSecretKey === envItem.key ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedSecretKey === envItem.key ? 'คัดลอกแล้ว' : 'คัดลอกชื่อ'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Input 1: Channel Access Token */}
            <div className="space-y-2 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#06C755]" />
                  <span>Channel Access Token (Long-lived):</span>
                  <span className="text-rose-400">*</span>
                </label>
                <div>
                  {token.trim().length > 20 ? (
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> กรอกแล้ว ({token.trim().length} ตัวอักษร)
                    </span>
                  ) : hasEnvToken ? (
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ใช้ค่าจาก AI Studio Secret (LINE_CHANNEL_ACCESS_TOKEN)
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 font-mono">ยังไม่ได้กรอก (หรือตั้งใน Secrets)</span>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="วาง Channel access token (long-lived) จาก LINE Developers Console"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#06C755] font-mono"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    title={showToken ? 'ซ่อน Token' : 'แสดง Token'}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteToken}
                    title="วางจากคลิปบอร์ด"
                    className="p-1.5 text-slate-400 hover:text-[#06C755] rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                📍 แท็บ <strong>Messaging API</strong> &gt; ล่างสุด <em>Channel access token (long-lived)</em> &gt; กด Issue
              </p>
            </div>

            {/* Input 2: LINE User ID (Only for Push Message) */}
            {sendMode === 'push' && (
              <div className="space-y-2 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#06C755]" />
                    <span>Your LINE User ID (ผู้รับข้อความ Push):</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <div>
                    {userId.trim().startsWith('U') && userId.trim().length >= 30 ? (
                      <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> รูปแบบถูกต้อง
                      </span>
                    ) : hasEnvUserId ? (
                      <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ใช้ค่าจาก AI Studio Secret (LINE_USER_ID)
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">ขึ้นต้นด้วย U... ความยาว 33 ตัว</span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="เช่น U0123456789abcdef0123456789abcdef"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#06C755] font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                      type="button"
                      onClick={handlePasteUserId}
                      title="วางจากคลิปบอร์ด"
                      className="p-1.5 text-slate-400 hover:text-[#06C755] rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  📍 แท็บ <strong>Basic settings</strong> &gt; เลื่อนลงมาที่ <em>Your user ID</em> (อย่าลืมสแกน QR Code เพิ่มเพื่อนบอทก่อน)
                </p>
              </div>
            )}

            {/* Time Selection: Presets + Exact Custom Time */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-300">
                  ตั้งเวลาแจ้งเตือนอัตโนมัติ (วันจันทร์, พุธ, ศุกร์ เวลาไทย):
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">กำหนดเวลาเอง:</span>
                  <input
                    type="time"
                    value={customAlertTime}
                    onChange={(e) => setCustomAlertTime(e.target.value)}
                    className="bg-slate-900 border border-[#06C755]/50 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-[#06C755] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { hours: 1, time: '19:30', label: 'ก่อน 1 ชม. (19:30 น.)', desc: 'เตือนโค้งสุดท้ายก่อนปิดรับ' },
                  { hours: 2, time: '18:30', label: 'ก่อน 2 ชม. (18:30 น.)', desc: '★ แนะนำที่สุด มีเวลาคีย์โพย' },
                  { hours: 3, time: '17:30', label: 'ก่อน 3 ชม. (17:30 น.)', desc: 'เตือนล่วงหน้าช่วงเย็น' },
                ].map((item) => {
                  const isSelected = customAlertTime === item.time;
                  return (
                    <button
                      key={item.hours}
                      type="button"
                      onClick={() => handleSelectPresetHours(item.hours)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-[#06C755] text-white shadow-sm ring-1 ring-[#06C755]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-100">{item.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#06C755]" />}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 block">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: Save & Test */}
            <div className="flex items-center justify-between gap-3 pt-5 border-t border-slate-800 flex-wrap">
              <div className="text-xs text-slate-400">
                {isTokenConfigured && (sendMode === 'broadcast' || isUserIdConfigured) ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> พร้อมส่ง Push Message เวลา {targetNotificationTime}
                  </span>
                ) : (
                  <span className="text-amber-400/90 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> กรุณากรอก Token & User ID แล้วกด "บันทึกการตั้งค่า"
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-100 font-bold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-emerald-400" />}
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isTesting}
                  className="px-6 py-2.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#06C755]/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isTesting ? 'กำลังส่ง...' : '🔔 ทดสอบส่ง LINE ทันที'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Summary + External Cron Card (1 Column) */}
          <div className="space-y-6">
            {/* Draw Schedule Card */}
            <div className="bg-slate-950 border border-[#06C755]/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-[#06C755]">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-sm font-bold text-white">สรุปรอบการแจ้งเตือนถัดไป</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">งวดถัดไป:</span>
                  <span className="font-bold text-amber-300">{upcoming.drawDateThai}</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">เวลาออกรางวัล:</span>
                  <span className="font-bold text-slate-200 font-mono">20:30 น. (วัน{upcoming.dayOfWeekThai})</span>
                </div>

                <div className="p-3 bg-emerald-950/40 rounded-xl border border-[#06C755]/30 flex items-center justify-between">
                  <span className="text-emerald-300">เวลายิงเตือน LINE:</span>
                  <span className="font-bold text-[#06C755] font-mono text-sm">
                    {targetNotificationTime}
                  </span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">ปลายทาง:</span>
                  <span className="font-mono text-slate-200">
                    {sendMode === 'push'
                      ? userId
                        ? `${userId.slice(0, 6)}...${userId.slice(-4)}`
                        : hasEnvUserId
                        ? 'ใช้จาก Secret (LINE_USER_ID)'
                        : 'ยังไม่ได้ระบุ User ID'
                      : 'Broadcast (ทุกคน)'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">3 ตัวเต็งเม็ดเดียว:</span>
                  <span className="text-lg font-black text-amber-400 font-mono tracking-wider">
                    {main3D}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400">พอร์ตทองคำ:</span>
                  <span className="text-xs font-bold text-emerald-400">15 ชุดเต็ง-โต๊ด</span>
                </div>
              </div>
            </div>

            {/* 24/7 Cloud Run Wake-up Cron URL Card */}
            <div className="bg-slate-950 border border-emerald-500/30 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#06C755]" />
                  <span>ลิงก์ปลุกแจ้งเตือนอัตโนมัติ (เมื่อปิดเว็บ)</span>
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                นำลิงก์นี้ไปตั้งเวลาที่ <strong className="text-white">cron-job.org</strong> (ฟรี) ให้ยิงทุกวันจันทร์/พุธ/ศุกร์ เวลา {customAlertTime} น. เพื่อให้ระบบตื่นมายิง LINE แม้ปิดหน้าเว็บไปแล้ว:
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={cronTriggerUrl}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-emerald-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyCronUrl}
                  className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedCronUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCronUrl ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CHAT PREVIEW MOCKUP */}
      {activeSubTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center shadow-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <Smartphone className="w-4 h-4 text-[#06C755]" />
              <span>หน้าจอจำลองสมาร์ตโฟน (LINE Chat Preview)</span>
            </div>

            <div className="w-full max-w-[360px] bg-[#1a252f] rounded-[36px] border-4 border-slate-700 shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-[#1e2b37] px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-300 font-mono">
                <span>{customAlertTime}</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="bg-[#243542] px-4 py-3 flex items-center gap-3 border-b border-slate-700/60">
                <div className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center font-bold text-sm shadow-md">
                  🇱🇦
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span>LaoLotto AI Bot</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06C755]" />
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium">LINE Official Account (บอท)</div>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                  เตือน {targetNotificationTime}
                </span>
              </div>

              <div className="bg-[#7297b8] p-3.5 space-y-3 min-h-[440px] max-h-[500px] overflow-y-auto">
                <div className="text-center">
                  <span className="bg-black/25 text-white text-[10px] px-2.5 py-0.5 rounded-full">
                    {upcoming.drawDateThai}
                  </span>
                </div>

                <div className="flex items-end gap-1.5">
                  <div className="max-w-[88%] bg-white text-slate-900 rounded-2xl rounded-bl-sm p-3.5 shadow-md text-xs font-sans leading-relaxed whitespace-pre-wrap select-text">
                    <div className="font-bold text-[#00B900] text-sm border-b border-slate-200 pb-1 mb-2">
                      🇱🇦【 แจ้งเตือนด่วน! หวยลาวพัฒนาออกวันนี้ 】🇱🇦
                    </div>
                    <div className="text-[11px] text-slate-600 mb-2">
                      ⏰ เวลาแจ้งเตือน {targetNotificationTime} (หวยออกเวลา 20:30 น.)
                      <br />
                      งวดประจำ{upcoming.drawDateThai}
                    </div>

                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 my-2">
                      <div className="text-[11px] font-bold text-amber-900">
                        👑 ฟันธง 3 ตัวเต็ง เม็ดเดียว:
                      </div>
                      <div className="text-xl font-black text-amber-600 tracking-wider font-mono">
                        🌟 {main3D} 🌟
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        💎 6 กลับ (6 ประตู): {conv3D.permutations6.slice(0, 3).join('-')}...
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 my-2 text-[11px]">
                      <div className="font-bold text-emerald-900">
                        🛡️ พอร์ต 15 ชุดเต็งสูตรทองคำ (เต็งควบโต๊ด):
                      </div>
                      <div className="text-[10px] text-slate-700 mt-0.5 space-y-0.5">
                        <div>🥇 Tier 1: {portfolio15.tier1Gold.join(', ')}</div>
                        <div>🥈 Tier 2: {portfolio15.tier2Silver.join(', ')}</div>
                        <div>🥉 Tier 3: {portfolio15.tier3Shield.join(', ')}</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-700 space-y-0.5 pt-1">
                      <div>⭐ 4 ตัวแจ็กพอตเสริม: <strong>{main4D}</strong></div>
                      <div>⭐ เด่น {highlightMain} รอง {highlightSecondary} | วิ่ง/รูด: {highlightMain} - {highlightSecondary}</div>
                      <div>🎯 2 ตัวบน: {topPairs} | 2 ตัวล่าง: {bottomPairs}</div>
                    </div>

                    <div className="text-[10px] text-slate-500 border-t border-slate-200 mt-2 pt-1">
                      ⚠️ ปิดรับประมาณ 20:00 น. ขอให้รวยรับทรัพย์ทุกท่านครับ! 💰✨
                    </div>
                  </div>

                  <span className="text-[9px] text-white/90 font-mono mb-1 shrink-0">
                    อ่านแล้ว
                    <br />
                    {customAlertTime}
                  </span>
                </div>
              </div>

              <div className="bg-[#243542] px-3 py-2.5 rounded-b-[32px] flex items-center justify-between text-slate-400 text-xs">
                <span>ข้อความอัตโนมัติก่อนหวยออก</span>
                <span className="text-[#06C755] font-bold">{targetNotificationTime}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#06C755]" />
                <span>ข้อความเต็มรูปแบบที่จะส่งเข้า LINE</span>
              </h4>
              <button
                onClick={handleCopyText}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3.5 h-3.5 text-[#06C755]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMessage ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto">
              {lineAlertMessage}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: NOTIFICATION HISTORY LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#06C755]" />
                <span>ประวัติการส่งแจ้งเตือนเข้า LINE (Push Message Logs)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                บันทึกการส่งแจ้งเตือนทั้งแบบจริงและแบบจำลอง
              </p>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              รวมทั้งหมด {logs.length} รายการ
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-slate-500">
              <Clock className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium">ยังไม่มีประวัติการส่งแจ้งเตือน</p>
              <p className="text-xs">กดปุ่ม "🔔 ทดสอบส่ง LINE ทันที" ด้านบนเพื่อเริ่มทดสอบระบบ</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {logs.map((log) => (
                <div key={log.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{log.drawDateThai}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : log.status === 'simulated'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {log.status === 'success' ? 'ส่งสำเร็จ (LINE จริง)' : log.status === 'simulated' ? 'จำลองสำเร็จ' : 'ส่งไม่สำเร็จ'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      ผู้รับ: <span className="font-mono text-slate-200">{log.recipient}</span> • ตัวเลข: <span className="font-bold text-amber-300">{log.numbersSummary}</span>
                    </p>
                    {log.error && (
                      <p className="text-xs text-rose-400">
                        ข้อผิดพลาด: {log.error}
                      </p>
                    )}
                  </div>

                  <div className="text-right text-xs text-slate-500 font-mono self-start sm:self-auto">
                    {new Date(log.sentAt).toLocaleString('th-TH')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: STEP-BY-STEP SETUP GUIDE */}
      {activeSubTab === 'guide' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#06C755]" />
              <span>คู่มือตั้งค่า LINE Messaging API + ตั้งปลุก 24 ชม. (4 ขั้นตอน)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              ส่งแจ้งเตือนตรงเข้าบัญชี LINE ของคุณอัตโนมัติแม้ปิดหน้าจอมือถือ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#06C755] text-slate-950 font-black text-sm flex items-center justify-center">
                  1
                </div>
                <span className="text-[10px] font-mono text-slate-400">developers.line.biz</span>
              </div>
              <h4 className="text-sm font-bold text-white">สร้าง Messaging API & คัดลอก Token</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                เข้า <a href="https://developers.line.biz" target="_blank" rel="noreferrer" className="text-[#06C755] underline font-bold">developers.line.biz</a> &gt; เลือก Channel ประเภท Messaging API &gt; แท็บ <strong>Messaging API</strong> &gt; กด <strong>Issue</strong> ตรง <em>Channel access token (long-lived)</em>
              </p>
            </div>

            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#06C755] text-slate-950 font-black text-sm flex items-center justify-center">
                  2
                </div>
                <span className="text-[10px] font-mono text-amber-400">Basic Settings</span>
              </div>
              <h4 className="text-sm font-bold text-white">คัดลอก User ID & เพิ่มเพื่อนบอท</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                แท็บ <strong>Basic settings</strong> คัดลอก <em>Your user ID</em> (ขึ้นต้นด้วย U...) และสแกน QR Code เพื่อเพิ่มเพื่อนกับบอทในแอป LINE ก่อน จากนั้นวางทั้งสองค่าและกด <strong>บันทึกการตั้งค่า</strong>
              </p>
            </div>

            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center">
                  3
                </div>
                <span className="text-[10px] font-bold text-emerald-400">ส่งตรงเวลาแม้ปิดเว็บ (cron-job.org)</span>
              </div>
              <h4 className="text-sm font-bold text-white">ตั้งเวลาปลุกเซิร์ฟเวอร์อัตโนมัติ (แนะนำ 100%)</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                เนื่องจากระบบคลาวด์จะพักเครื่องอัตโนมัติเมื่อคุณปิดหน้าจอเบราว์เซอร์ ให้สมัครเว็บ <strong className="text-[#06C755]">cron-job.org</strong> (ฟรีตลอดชีพ) แล้วสร้าง Cronjob ใส่ URL ด้านล่าง ตั้งเวลา <strong>18:30 น. (Timezone: Asia/Bangkok) เฉพาะวันจันทร์, พุธ, ศุกร์</strong> ระบบจะตื่นขึ้นมายิง LINE Push Message ให้คุณตรงเวลาเป๊ะทุกงวด:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <code className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 overflow-x-auto">
                  {cronTriggerUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCronUrl}
                  className="px-3 py-2 bg-[#06C755] text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                >
                  {copiedCronUrl ? 'คัดลอกแล้ว!' : 'คัดลอก URL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
