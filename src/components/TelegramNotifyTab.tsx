import React, { useState, useEffect } from 'react';
import {
  Send,
  Users,
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
  KeyRound,
  ClipboardPaste,
  Lock,
  Radio,
  Zap,
  AlertTriangle,
  Search,
  Pin,
  Hash,
} from 'lucide-react';
import { UpcomingDrawInfo, ComprehensiveStats } from '../utils/lotteryStats';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  topicThreadId?: string;
  pinMessage?: boolean;
  disableNotification?: boolean;
  hoursAhead: number;
  customAlertTime: string;
  targetTime: string;
  status: 'connected' | 'disconnected' | 'testing';
  botUsername?: string;
  lastNotifiedDate?: string;
  lastAttemptDate?: string;
  lastSyncTime?: string;
}

export interface TelegramSchedulerStatus {
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
  hasChatId: boolean;
  groupCount: number;
  envConfigured?: {
    hasEnvToken: boolean;
    hasEnvChatId: boolean;
  };
  configSaved: boolean;
  alreadyNotifiedToday: boolean;
  lastNotifiedDate: string | null;
  lastSyncTime: string | null;
}

export interface TelegramNotificationLog {
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

export interface DetectedTelegramGroup {
  chatId: string;
  title: string;
  type: string;
  username?: string;
}

interface TelegramNotifyTabProps {
  config: TelegramConfig;
  schedulerStatus?: TelegramSchedulerStatus | null;
  upcoming: UpcomingDrawInfo;
  stats: ComprehensiveStats;
  logs: TelegramNotificationLog[];
  onSaveConfig: (cfg: Partial<TelegramConfig>) => Promise<void>;
  onTestSend: (
    customMessage?: string,
    options?: {
      botToken?: string;
      chatId?: string;
      topicThreadId?: string;
      pinMessage?: boolean;
      disableNotification?: boolean;
    }
  ) => Promise<{ success: boolean; message: string; isSimulated?: boolean }>;
  onDetectGroups: (botToken?: string) => Promise<{
    success: boolean;
    bot?: { username?: string; firstName?: string };
    groups?: DetectedTelegramGroup[];
    message?: string;
    error?: string;
  }>;
  onRefreshStatus?: () => Promise<void>;
  onForceTrigger?: () => Promise<{ success: boolean; triggered?: boolean; reason?: string; result?: { success: boolean; message: string } }>;
}

export const TelegramNotifyTab: React.FC<TelegramNotifyTabProps> = ({
  config,
  schedulerStatus,
  upcoming,
  stats,
  logs,
  onSaveConfig,
  onTestSend,
  onDetectGroups,
  onRefreshStatus,
  onForceTrigger,
}) => {
  const [enabled, setEnabled] = useState(config.enabled ?? true);
  const [botToken, setBotToken] = useState(config.botToken || '');
  const [chatId, setChatId] = useState(config.chatId || '');
  const [topicThreadId, setTopicThreadId] = useState(config.topicThreadId || '');
  const [pinMessage, setPinMessage] = useState(Boolean(config.pinMessage));
  const [disableNotification, setDisableNotification] = useState(Boolean(config.disableNotification));
  const [hoursAhead, setHoursAhead] = useState(config.hoursAhead || 2);
  const [customAlertTime, setCustomAlertTime] = useState(config.customAlertTime || '18:30');
  const [showToken, setShowToken] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedGroups, setDetectedGroups] = useState<DetectedTelegramGroup[]>([]);
  const [detectedBotName, setDetectedBotName] = useState(config.botUsername || '');
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string; isSimulated?: boolean } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedCronUrl, setCopiedCronUrl] = useState(false);
  const [copiedSecretKey, setCopiedSecretKey] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'preview' | 'logs' | 'guide'>('settings');

  useEffect(() => {
    setEnabled(config.enabled ?? true);
    if (config.botToken !== undefined) setBotToken(config.botToken || '');
    if (config.chatId !== undefined) setChatId(config.chatId || '');
    if (config.topicThreadId !== undefined) setTopicThreadId(config.topicThreadId || '');
    if (config.pinMessage !== undefined) setPinMessage(Boolean(config.pinMessage));
    if (config.disableNotification !== undefined) setDisableNotification(Boolean(config.disableNotification));
    if (config.hoursAhead) setHoursAhead(config.hoursAhead);
    if (config.customAlertTime) setCustomAlertTime(config.customAlertTime);
    if (config.botUsername) setDetectedBotName(config.botUsername);
  }, [
    config.enabled,
    config.botToken,
    config.chatId,
    config.topicThreadId,
    config.pinMessage,
    config.disableNotification,
    config.hoursAhead,
    config.customAlertTime,
    config.botUsername,
  ]);

  const conv3D = stats.threeDigitConviction;
  const portfolio15 = conv3D.fifteenSetsPortfolio;
  const main3D = conv3D.mainPick;
  const main4D = conv3D.fourDigitJackpot;
  const highlightMain = String(stats.recommendedRunDigits?.[0] ?? stats.hotDigits[0] ?? main3D[0] ?? '0');
  const highlightSecondary = String(stats.recommendedRunDigits?.[1] ?? stats.hotDigits[1] ?? main3D[1] ?? '0');
  const topPairs = (conv3D.derivedTwoDigits?.topList || [conv3D.derivedTwoDigits.top]).slice(0, 5).join(' - ');
  const bottomPairs = (conv3D.derivedTwoDigits?.bottomList || [conv3D.derivedTwoDigits.bottom]).slice(0, 4).join(' - ');
  const animalMain = `${conv3D.animalLink.name} (${conv3D.animalLink.number})`;
  const animalBackup = `${conv3D.animalBackup?.name || conv3D.animalLink.name} (${conv3D.animalBackup?.number || conv3D.animalLink.number})`;
  const doubleShieldList = portfolio15.doubleShieldSets || conv3D.doubleShieldSets || [];

  const targetNotificationTime = `${customAlertTime || '18:30'} น.`;
  const cronTriggerUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/api/telegram/cron-trigger` : '/api/telegram/cron-trigger';

  const telegramHtmlPreviewMessage = `🇱🇦<b>【 แจ้งเตือนสมาชิกกลุ่ม! หวยลาวพัฒนาออกวันนี้ 】</b>🇱🇦
⏰ เวลาแจ้งเตือน ${targetNotificationTime} (หวยออกเวลา 20:30 น.)
📅 งวดประจำ${upcoming.drawDateThai}
📊 <i>Engine V3 Mean-Reversion (Backtest 35 งวด: วิ่ง/รูด ${stats.backtestReport.run2Rate}%)</i>

⭐ <b>วิ่ง/รูด 19 ประตู (เด่นสุด):</b> <code>${highlightMain}</code> - <code>${highlightSecondary}</code>
🎯 <b>2 ตัวบน (5 ชุดคัดพิเศษ):</b> <code>${topPairs}</code>
🎯 <b>2 ตัวล่าง:</b> <code>${bottomPairs}</code>

👑 <b>ฟันธง 3 ตัวเต็ง เม็ดเดียว:</b> 🌟 <code>${main3D}</code> 🌟
💎 <b>ชุด 6 กลับ (เต็ง-โต๊ด):</b> <code>${conv3D.permutations6.join(' - ')}</code>

🛡️ <b>พอร์ต 15 ชุด V3 (13 ชุดหลัก + ${doubleShieldList.length} เกราะกันเบิ้ล):</b>
🥇 <b>Tier 1 (เม็ดทอง):</b> <code>${portfolio15.tier1Gold.join(' - ')}</code>
🥈 <b>Tier 2 (เม็ดเงิน):</b> <code>${portfolio15.tier2Silver.join(' - ')}</code>
🥉 <b>Tier 3 (หลักเสริม + กันเบิ้ล):</b> <code>${portfolio15.tier3Shield.join(' - ')}</code>${
    doubleShieldList.length > 0 ? `\n🛡️ <b>เกราะกันเบิ้ล:</b> <code>${doubleShieldList.join(' - ')}</code>` : ''
  }

⭐ <b>4 ตัวแจ็กพอตเสริม:</b> <code>${main4D}</code>
🐉 <b>นามสัตว์มงคล:</b> ${animalMain} / ${animalBackup}

⚠️ <i>ระบบปิดรับแทงประมาณ 20:00 น. ขอให้สมาชิกทุกท่านเฮงๆ ปังๆ ครับ!</i> 💰✨`;

  const telegramPlainMessage = telegramHtmlPreviewMessage.replace(/<[^>]+>/g, '');

  const handleSelectPresetHours = (hours: number) => {
    setHoursAhead(hours);
    const computedHour = Math.max(0, 20 - hours);
    setCustomAlertTime(`${String(computedHour).padStart(2, '0')}:30`);
  };

  const handleCopySecretKey = (keyName: string) => {
    navigator.clipboard.writeText(keyName);
    setCopiedSecretKey(keyName);
    setTimeout(() => setCopiedSecretKey(null), 1800);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      await onSaveConfig({
        enabled,
        botToken: botToken.trim(),
        chatId: chatId.trim(),
        topicThreadId: topicThreadId.trim(),
        pinMessage,
        disableNotification,
        hoursAhead,
        customAlertTime,
        targetTime: targetNotificationTime,
      });
      setTestResult({
        type: 'success',
        text: `บันทึกการตั้งค่า Telegram กลุ่มสมาชิกเรียบร้อยแล้ว (ตั้งเวลาส่งอัตโนมัติ ${targetNotificationTime})`,
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

  const handleDetectGroupsClick = async () => {
    setIsDetecting(true);
    setTestResult(null);
    try {
      const res = await onDetectGroups(botToken.trim() || undefined);
      if (res.bot?.username) setDetectedBotName(res.bot.username);
      if (res.groups) setDetectedGroups(res.groups);
      setTestResult({
        type: res.success ? 'success' : 'error',
        text: res.message || res.error || 'ไม่สามารถค้นหากลุ่มได้',
      });
    } catch (e: any) {
      setTestResult({ type: 'error', text: e.message || 'เกิดข้อผิดพลาดในการค้นหากลุ่ม' });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleAddDetectedChatId = (idToAdd: string) => {
    const existing = chatId
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!existing.includes(idToAdd)) {
      const next = [...existing, idToAdd].join(', ');
      setChatId(next);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestSend(telegramHtmlPreviewMessage, {
        botToken: botToken.trim() || undefined,
        chatId: chatId.trim() || undefined,
        topicThreadId: topicThreadId.trim() || undefined,
        pinMessage,
        disableNotification,
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
      await onSaveConfig({
        enabled,
        botToken: botToken.trim(),
        chatId: chatId.trim(),
        topicThreadId: topicThreadId.trim(),
        pinMessage,
        disableNotification,
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
    navigator.clipboard.writeText(telegramPlainMessage);
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
      if (text) setBotToken(text.trim());
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
  };

  const handlePasteChatId = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setChatId(text.trim());
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
  };

  const hasEnvToken = Boolean(schedulerStatus?.envConfigured?.hasEnvToken);
  const hasEnvChatId = Boolean(schedulerStatus?.envConfigured?.hasEnvChatId);
  const isTokenConfigured = Boolean((botToken && botToken.trim().length > 20) || hasEnvToken);
  const isChatIdConfigured = Boolean((chatId && chatId.trim().length > 0) || hasEnvChatId);

  return (
    <div className="space-y-6">
      {/* Top Banner Header: Telegram Group Bot API */}
      <div className="bg-gradient-to-r from-sky-950/80 via-slate-950 to-slate-900 border-2 border-[#229ED9]/45 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#229ED9]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center font-black shadow-xl shadow-sky-500/25 shrink-0">
              <Send className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  Telegram Group Bot (แจ้งเตือนสมาชิกกลุ่ม)
                </h1>
                <span className="px-3 py-0.5 rounded-full bg-[#229ED9]/20 text-sky-300 border border-[#229ED9]/40 text-xs font-bold font-mono flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-[#229ED9] animate-pulse' : 'bg-slate-500'}`} />
                  {enabled ? `เตือนออโต้เวลา ${targetNotificationTime}` : 'ปิดระบบชั่วคราว'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                ส่งแนวทางหวยลาวพร้อมเลข 3 ตัวเต็ง & พอร์ต 15 ชุดตรงเข้า{' '}
                <strong>กลุ่มสมาชิก Telegram (Group / Supergroup / Channel)</strong> ฟรีไม่จำกัดโควต้า เวลา{' '}
                <strong className="text-sky-400 font-mono font-bold">{targetNotificationTime}</strong> ทุกวันจันทร์–ศุกร์ (หยุดเสาร์–อาทิตย์)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0 flex-wrap">
            <button
              onClick={handleTestNotification}
              disabled={isTesting}
              className="px-4 py-2.5 bg-[#229ED9] hover:bg-[#1e8ec4] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-[#229ED9]/25 flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isTesting ? 'กำลังส่งเข้ากลุ่ม Telegram...' : '✈️ ทดสอบส่งเข้ากลุ่มทันที'}</span>
            </button>

            <button
              onClick={handleToggleAuto}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                enabled
                  ? 'bg-sky-950/80 border-[#229ED9]/50 text-sky-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              {enabled ? <ToggleRight className="w-5 h-5 text-[#229ED9]" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
              <span className="hidden sm:inline">{enabled ? 'เปิดออโต้' : 'ปิดออโต้'}</span>
            </button>
          </div>
        </div>

        {/* Live Feedback Alert */}
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm transition-all ${
              testResult.type === 'success'
                ? 'bg-sky-950/90 border-[#229ED9]/70 text-sky-100'
                : 'bg-rose-950/90 border-rose-500/70 text-rose-100'
            }`}
          >
            {testResult.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#229ED9] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold">
                {testResult.type === 'success' ? 'สำเร็จ:' : 'เกิดข้อผิดพลาดในการส่ง Telegram:'}
              </div>
              <div className="leading-relaxed">{testResult.text}</div>
              {testResult.isSimulated && (
                <div className="text-[11px] text-amber-300 font-mono pt-1">
                  💡 หมายเหตุ: ระบบจำลองข้อความสำเร็จ กรอก Bot Token และ Group Chat ID ด้านล่าง หรือใส่ใน AI Studio Secrets เพื่อส่งเข้ากลุ่มจริง
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto">
          {[
            { id: 'settings', label: '⚙️ ตั้งค่า Bot Token, Group ID & เวลา', badge: null },
            { id: 'preview', label: '📱 ตัวอย่างข้อความในกลุ่ม', badge: 'Telegram' },
            { id: 'logs', label: '📜 ประวัติการส่งเข้ากลุ่ม', badge: `${logs.length}` },
            { id: 'guide', label: '📖 วิธีสร้างบอท & หา Group ID', badge: 'ง่ายมาก' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-[#229ED9] text-white shadow-sm'
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
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[#229ED9] shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white">สถานะตัวตั้งเวลา Telegram (GMT+7):</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-amber-300 font-bold">
                  วัน{schedulerStatus.dayOfWeekThai} {schedulerStatus.serverBangkokTime}
                </span>
                {schedulerStatus.isDrawDay ? (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                    วันนี้วันหวยลาวออก
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">วันนี้ไม่มีออกรางวัล</span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-slate-400">
                <span className={schedulerStatus.hasToken ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>
                  {schedulerStatus.hasToken ? '✅ Bot Token พร้อมใช้' : '❌ ยังไม่ตั้ง Bot Token'}
                </span>
                <span>•</span>
                <span className={schedulerStatus.hasChatId ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>
                  {schedulerStatus.hasChatId
                    ? `✅ ตั้งค่ากลุ่มแล้ว (${schedulerStatus.groupCount} กลุ่ม)`
                    : '❌ ยังไม่ระบุ Group Chat ID'}
                </span>
                <span>•</span>
                <span className={schedulerStatus.alreadyNotifiedToday ? 'text-emerald-400' : 'text-amber-300'}>
                  {schedulerStatus.alreadyNotifiedToday
                    ? '✅ ส่งแจ้งเตือนเข้ากลุ่มรอบวันนี้แล้ว'
                    : schedulerStatus.isDrawDay && schedulerStatus.isPastAlertTimeToday
                    ? '⏰ เลยเวลาเตือนรอบวันนี้แล้ว (กดส่งด่วนได้เลย)'
                    : `⏳ รอบแจ้งเตือนเวลา ${schedulerStatus.targetAlertTime}`}
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
              <span>{isForcing ? 'กำลังยิงเข้ากลุ่ม...' : '⚡ สั่งยิงเข้ากลุ่มรอบวันนี้ทันที'}</span>
            </button>
          )}
        </div>
      )}

      {/* SUB-TAB 1: SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form (2 cols) */}
          <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#229ED9]" />
                <h3 className="text-base font-bold text-white">ตั้งค่าบอทแจ้งเตือนกลุ่มสมาชิก Telegram</h3>
              </div>
              {detectedBotName && (
                <span className="text-xs text-sky-300 font-mono bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded-full">
                  @{detectedBotName}
                </span>
              )}
            </div>

            {/* AI Studio Secrets / Environment Variables Integration Card */}
            <div className="bg-sky-950/25 border border-[#229ED9]/40 p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-sky-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#229ED9]" />
                  <span>ตั้งค่าถาวรใน AI Studio → Secrets / Environment Variables</span>
                </h4>
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                    hasEnvToken && hasEnvChatId
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {hasEnvToken && hasEnvChatId ? '✅ เชื่อมต่อจาก Secrets แล้ว' : 'ยังไม่ได้ตั้งใน Secrets'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                เพื่อไม่ให้ข้อมูลหายเมื่อรีสตาร์ทหรือ Deploy ใหม่ แนะนำให้นำคีย์ด้านล่างไปเพิ่มในเมนู{' '}
                <strong className="text-white">Secrets / Environment Variables</strong> ของ AI Studio:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                {[
                  {
                    key: 'TELEGRAM_BOT_TOKEN',
                    active: hasEnvToken,
                    desc: 'Token บอทจาก @BotFather',
                  },
                  {
                    key: 'TELEGRAM_CHAT_ID',
                    active: hasEnvChatId,
                    desc: 'Chat ID กลุ่ม (เช่น -1001234567890)',
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

            {/* Input 1: Telegram Bot Token */}
            <div className="space-y-2 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[#229ED9]" />
                  <span>Telegram Bot Token (จาก @BotFather):</span>
                  <span className="text-rose-400">*</span>
                </label>
                <div>
                  {botToken.trim().length > 20 ? (
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> กรอกแล้ว
                    </span>
                  ) : hasEnvToken ? (
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ใช้ค่าจาก AI Studio Secret (TELEGRAM_BOT_TOKEN)
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-400 font-mono">ยังไม่ได้กรอก (หรือตั้งใน Secrets)</span>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="เช่น 1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#229ED9] font-mono"
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
                    className="p-1.5 text-slate-400 hover:text-[#229ED9] rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Input 2: Group Chat ID + Auto-Detect Button */}
            <div className="space-y-3 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#229ED9]" />
                  <span>Telegram Group / Channel Chat ID (รองรับหลายกลุ่มคั่นด้วย , ):</span>
                  <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {chatId.trim().length > 0 ? (
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> กรอกแล้ว
                    </span>
                  ) : hasEnvChatId ? (
                    <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ใช้ค่าจาก Secret (TELEGRAM_CHAT_ID)
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">เช่น -1001234567890</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="เช่น -1001234567890 หรือ @mychannel (ส่งหลายกลุ่มคั่นด้วยเครื่องหมาย ,)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#229ED9] font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                      type="button"
                      onClick={handlePasteChatId}
                      title="วางจากคลิปบอร์ด"
                      className="p-1.5 text-slate-400 hover:text-[#229ED9] rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDetectGroupsClick}
                  disabled={isDetecting}
                  className="px-3.5 py-2.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isDetecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>{isDetecting ? 'กำลังค้นหากลุ่ม...' : '🔍 ค้นหากลุ่มอัตโนมัติ'}</span>
                </button>
              </div>

              {detectedGroups.length > 0 && (
                <div className="p-3 bg-slate-950 rounded-xl border border-sky-500/30 space-y-2">
                  <span className="text-[11px] font-bold text-sky-300 block">
                    พบกลุ่ม/แชตที่บอทอยู่ (คลิกเพื่อเลือกเพิ่มเข้าช่อง Chat ID):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {detectedGroups.map((g) => (
                      <button
                        key={g.chatId}
                        type="button"
                        onClick={() => handleAddDetectedChatId(g.chatId)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-sky-500/20 border border-slate-700 hover:border-sky-400 rounded-lg text-xs text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <span className="font-bold">{g.title}</span>
                        <code className="text-[10px] font-mono text-amber-300">{g.chatId}</code>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-400">{g.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Forum Topic & Pin Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-sky-400" />
                    <span>Topic / Thread ID (ถ้ากลุ่มเปิดหัวข้อ):</span>
                  </label>
                  <input
                    type="text"
                    value={topicThreadId}
                    onChange={(e) => setTopicThreadId(e.target.value.replace(/\D/g, ''))}
                    placeholder="เว้นว่างได้"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#229ED9]"
                  />
                </div>

                <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pinMessage}
                    onChange={(e) => setPinMessage(e.target.checked)}
                    className="accent-[#229ED9]"
                  />
                  <span className="text-xs text-slate-200 flex items-center gap-1">
                    <Pin className="w-3.5 h-3.5 text-amber-400" />
                    ปักหมุดในกลุ่มอัตโนมัติ
                  </span>
                </label>

                <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disableNotification}
                    onChange={(e) => setDisableNotification(e.target.checked)}
                    className="accent-[#229ED9]"
                  />
                  <span className="text-xs text-slate-200">ส่งแบบเงียบ (ไม่มีเสียงเตือน)</span>
                </label>
              </div>
            </div>

            {/* Schedule Time */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-300">
                  ตั้งเวลาส่งเข้ากลุ่ม Telegram อัตโนมัติ (วันจันทร์–ศุกร์ เวลาไทย):
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">กำหนดเวลาเอง:</span>
                  <input
                    type="time"
                    value={customAlertTime}
                    onChange={(e) => setCustomAlertTime(e.target.value)}
                    className="bg-slate-900 border border-[#229ED9]/50 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { hours: 1, time: '19:30', label: 'ก่อน 1 ชม. (19:30 น.)', desc: 'เตือนโค้งสุดท้ายก่อนปิดรับ' },
                  { hours: 2, time: '18:30', label: 'ก่อน 2 ชม. (18:30 น.)', desc: '★ แนะนำที่สุด มีเวลาเตรียมโพย' },
                  { hours: 3, time: '17:30', label: 'ก่อน 3 ชม. (17:30 น.)', desc: 'ส่งเข้ากลุ่มช่วงเย็น' },
                ].map((item) => {
                  const isSelected = customAlertTime === item.time;
                  return (
                    <button
                      key={item.hours}
                      type="button"
                      onClick={() => handleSelectPresetHours(item.hours)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/20 border-[#229ED9] text-white shadow-sm ring-1 ring-[#229ED9]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-100">{item.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#229ED9]" />}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 block">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-5 border-t border-slate-800 flex-wrap">
              <div className="text-xs text-slate-400">
                {isTokenConfigured && isChatIdConfigured ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> พร้อมส่งเข้ากลุ่ม Telegram เวลา {targetNotificationTime}
                  </span>
                ) : (
                  <span className="text-amber-400/90 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> กรุณากรอก Bot Token & Group Chat ID แล้วกด "บันทึกการตั้งค่า"
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
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-sky-400" />}
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isTesting}
                  className="px-6 py-2.5 bg-[#229ED9] hover:bg-[#1e8ec4] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-[#229ED9]/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isTesting ? 'กำลังส่ง...' : '✈️ ทดสอบส่งเข้ากลุ่มทันที'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Summary + Cron Card */}
          <div className="space-y-6">
            <div className="bg-slate-950 border border-[#229ED9]/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-[#229ED9]">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-sm font-bold text-white">สรุปรอบส่งเข้ากลุ่ม Telegram ถัดไป</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">งวดถัดไป:</span>
                  <span className="font-bold text-amber-300">{upcoming.drawDateThai}</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">เวลาออกรางวัล:</span>
                  <span className="font-bold text-slate-200 font-mono">20:30 น. ({upcoming.dayOfWeekThai})</span>
                </div>

                <div className="p-3 bg-sky-950/40 rounded-xl border border-[#229ED9]/30 flex items-center justify-between">
                  <span className="text-sky-300">เวลายิงเตือนกลุ่ม:</span>
                  <span className="font-bold text-sky-400 font-mono text-sm">{targetNotificationTime}</span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">กลุ่มเป้าหมาย:</span>
                  <span className="font-mono text-slate-200 truncate max-w-[160px]">
                    {chatId.trim()
                      ? chatId.trim()
                      : hasEnvChatId
                      ? 'ใช้จาก Secret (TELEGRAM_CHAT_ID)'
                      : 'ยังไม่ได้ระบุ Chat ID'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">3 ตัวเต็งเม็ดเดียว:</span>
                  <span className="text-lg font-black text-amber-400 font-mono tracking-wider">{main3D}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400">พอร์ต V3 (13+2):</span>
                  <span className="text-xs font-bold text-sky-400">13 ชุดหลัก + 2 ชุดกันเบิ้ล</span>
                </div>
              </div>
            </div>

            {/* 24/7 Cloud Run Wake-up Cron URL Card */}
            <div className="bg-slate-950 border border-sky-500/30 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#229ED9]" />
                  <span>ลิงก์ปลุกแจ้งเตือน Telegram (เมื่อปิดเว็บ)</span>
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                นำลิงก์นี้ไปตั้งเวลาที่ <strong className="text-white">cron-job.org</strong> (ฟรี) ให้ยิงทุกวันจันทร์–ศุกร์ เวลา {customAlertTime} น. เพื่อปลุกเซิร์ฟเวอร์ให้ส่งเข้ากลุ่ม Telegram ตรงเวลาแม้ปิดเว็บ:
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={cronTriggerUrl}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-sky-300 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyCronUrl}
                  className="px-2.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedCronUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCronUrl ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TELEGRAM GROUP CHAT PREVIEW */}
      {activeSubTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center shadow-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <Smartphone className="w-4 h-4 text-[#229ED9]" />
              <span>หน้าจอจำลองกลุ่ม Telegram (สมาชิกกดแตะที่เลขเพื่อคัดลอกได้ทันที)</span>
            </div>

            <div className="w-full max-w-[380px] bg-[#0e1621] rounded-[32px] border-4 border-slate-700 shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-[#17212b] px-4 py-3 flex items-center gap-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-full bg-[#229ED9] text-white flex items-center justify-center font-bold text-sm shadow-md">
                  🇱🇦
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">กลุ่มแนวทางหวยลาว AI VIP</div>
                  <div className="text-[10px] text-sky-400 font-medium">LaoLotto AI Bot • bot</div>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="bg-[#182533] border border-slate-700/60 text-slate-100 rounded-2xl rounded-bl-sm p-3.5 shadow-md text-xs leading-relaxed whitespace-pre-wrap">
                  <div className="font-bold text-sky-300 border-b border-slate-700 pb-1.5 mb-2">
                    🇱🇦【 แจ้งเตือนสมาชิกกลุ่ม! หวยลาวพัฒนาออกวันนี้ 】🇱🇦
                  </div>
                  <div className="text-[11px] text-slate-300 mb-2">
                    ⏰ เวลาแจ้งเตือน {targetNotificationTime} | งวดประจำ{upcoming.drawDateThai}
                  </div>
                  <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-2.5 my-2">
                    <div className="text-[11px] font-bold text-amber-300">👑 ฟันธง 3 ตัวเต็ง เม็ดเดียว:</div>
                    <div className="text-xl font-black text-amber-400 tracking-wider font-mono">🌟 {main3D} 🌟</div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      💎 6 กลับ: {conv3D.permutations6.join(' - ')}
                    </div>
                  </div>
                  <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-2.5 my-2 text-[10px] text-slate-200 space-y-0.5">
                    <div className="font-bold text-sky-300">🛡️ พอร์ต 15 ชุด Hybrid V2 (10 ชุดหลัก + 5 ชุดกันเบิ้ล):</div>
                    <div>🥇 Tier 1: {portfolio15.tier1Gold.join(' - ')}</div>
                    <div>🥈 Tier 2: {portfolio15.tier2Silver.join(' - ')}</div>
                    <div>🥉 Tier 3: {portfolio15.tier3Shield.join(' - ')}</div>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <div>⭐ 4 ตัวเสริม: <strong className="text-white font-mono">{main4D}</strong></div>
                    <div>⭐ เด่น {highlightMain} รอง {highlightSecondary} | วิ่ง/รูด: {highlightMain} - {highlightSecondary}</div>
                    <div>🎯 2 ตัวบน: {topPairs} | 2 ตัวล่าง: {bottomPairs}</div>
                    <div>🐉 นามสัตว์: {animalMain} / {animalBackup}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#229ED9]" />
                <span>ข้อความเต็มที่จะส่งเข้ากลุ่ม Telegram</span>
              </h4>
              <button
                onClick={handleCopyText}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3.5 h-3.5 text-[#229ED9]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMessage ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto">
              {telegramPlainMessage}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#229ED9]" />
                <span>ประวัติการส่งเข้ากลุ่ม Telegram</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">บันทึกการส่งแจ้งเตือนทั้งแบบส่งจริงและแบบจำลอง</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">รวม {logs.length} รายการ</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-slate-500">
              <Clock className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium">ยังไม่มีประวัติการส่งเข้ากลุ่ม Telegram</p>
              <p className="text-xs">กดปุ่ม "✈️ ทดสอบส่งเข้ากลุ่มทันที" ด้านบนเพื่อเริ่มทดสอบระบบ</p>
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
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : log.status === 'simulated'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {log.status === 'success' ? 'ส่งเข้ากลุ่มสำเร็จ (Telegram จริง)' : log.status === 'simulated' ? 'จำลองสำเร็จ' : 'ส่งไม่สำเร็จ'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      กลุ่มเป้าหมาย: <span className="font-mono text-slate-200">{log.recipient}</span> • ตัวเลข:{' '}
                      <span className="font-bold text-amber-300">{log.numbersSummary}</span>
                    </p>
                    {log.error && <p className="text-xs text-rose-400">ข้อผิดพลาด: {log.error}</p>}
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

      {/* SUB-TAB 4: STEP-BY-STEP GUIDE */}
      {activeSubTab === 'guide' && (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#229ED9]" />
              <span>วิธีสร้างบอท Telegram & เชื่อมเข้ากลุ่มสมาชิกใน 3 นาที</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">ส่งฟรีไม่จำกัดจำนวนข้อความและไม่จำกัดจำนวนสมาชิกในกลุ่ม</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#229ED9] text-white font-black text-sm flex items-center justify-center">
                  1
                </div>
                <span className="text-[10px] font-mono text-sky-400">@BotFather</span>
              </div>
              <h4 className="text-sm font-bold text-white">สร้างบอทผ่าน @BotFather เพื่อรับ Token</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                เปิดแอป Telegram ค้นหาบัญชีทางการ <strong>@BotFather</strong> &gt; พิมพ์ <code className="text-amber-300">/newbot</code> &gt; ตั้งชื่อบอทและ Username (ลงท้ายด้วย bot เช่น <code>LaoLottoVipBot</code>) แล้วคัดลอก HTTP API Token มาวาง
              </p>
            </div>

            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#229ED9] text-white font-black text-sm flex items-center justify-center">
                  2
                </div>
                <span className="text-[10px] font-mono text-emerald-400">ดึง Chat ID อัตโนมัติ</span>
              </div>
              <h4 className="text-sm font-bold text-white">เชิญบอทเข้ากลุ่ม & กดปุ่มค้นหากลุ่มอัตโนมัติ</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                1) เชิญบอทเข้ากลุ่ม Telegram ของคุณ (แนะนำตั้งเป็น Admin หากต้องการให้ปักหมุด)<br />
                2) พิมพ์ข้อความอะไรก็ได้ในกลุ่ม 1 ครั้ง (เช่น <code>/start</code>)<br />
                3) วาง Token ด้านบนแล้วกดปุ่ม <strong>🔍 ค้นหากลุ่มอัตโนมัติ</strong> ระบบจะดึง Chat ID (เช่น <code>-100...</code>) ให้กดเลือกทันที!
              </p>
            </div>

            <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center">
                  3
                </div>
                <span className="text-[10px] font-bold text-sky-400">ตั้งปลุกอัตโนมัติ 24 ชม. (cron-job.org)</span>
              </div>
              <h4 className="text-sm font-bold text-white">ตั้งเวลาส่งเข้ากลุ่มแม้ปิดหน้าเว็บ</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                ตั้ง Secrets <code>TELEGRAM_BOT_TOKEN</code> และ <code>TELEGRAM_CHAT_ID</code> ใน AI Studio Settings แล้วนำ URL ด้านล่างไปตั้งใน{' '}
                <strong className="text-sky-400">cron-job.org</strong> เวลา <strong>{customAlertTime} น. (Asia/Bangkok) วันจันทร์–ศุกร์</strong>
              </p>
              <div className="flex items-center gap-2 pt-1">
                <code className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-sky-300 overflow-x-auto">
                  {cronTriggerUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCronUrl}
                  className="px-3 py-2 bg-[#229ED9] text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
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
