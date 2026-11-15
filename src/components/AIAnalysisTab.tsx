import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  TrendingUp,
  Sliders,
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Image as ImageIcon,
  ShieldCheck,
  Layers,
  ArrowRight,
  Info,
  Crown,
  Flame,
  Target,
  BarChart2,
  Cpu,
  Compass,
  BookmarkCheck,
  FilterX,
  Scale,
  Award,
  RotateCw,
  PlusCircle,
  Database,
} from 'lucide-react';
import { ComprehensiveStats, UpcomingDrawInfo, FourDigitConviction, ThreeDigitConviction, DataSourceItem } from '../utils/lotteryStats';

export interface AIAnalysisResult {
  targetDrawDate: string;
  targetDrawDateThai: string;
  dayOfWeekThai: string;
  highlightMain: string;
  highlightSecondary: string;
  runningDigits: string[];
  threeDigitConviction?: ThreeDigitConviction;
  fourDigitConviction?: FourDigitConviction;
  fourDigitsSet: string[];
  threeDigitsDirect: string[];
  threeDigitsSwap: string[];
  twoDigitsTop: string[];
  twoDigitsBottom: string[];
  animalPicks: Array<{ name: string; number: string; reason: string }>;
  confidenceScore: number;
  rationale: string;
  sourceBreakdown: Record<string, number>;
  facebookPostContent: string;
  generatedAt: string;
}

export interface RecordDrawPayload {
  drawDate: string;
  threeDigitsTop: string;
  fourDigits?: string;
  twoDigitsBottom?: string;
  animalName?: string;
}

interface AIAnalysisTabProps {
  stats: ComprehensiveStats;
  upcoming: UpcomingDrawInfo;
  analysis: AIAnalysisResult | null;
  onAnalyze: (weights: Record<string, number>) => Promise<void>;
  isLoading: boolean;
  onSendToQueue: (analysis: AIAnalysisResult) => void;
  onGoToBanner: () => void;
  onRecordDraw?: (payload: RecordDrawPayload) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const AIAnalysisTab: React.FC<AIAnalysisTabProps> = ({
  stats,
  upcoming,
  analysis,
  onAnalyze,
  isLoading,
  onSendToQueue,
  onGoToBanner,
  onRecordDraw,
}) => {
  const [copied, setCopied] = useState(false);
  const [queuedAlert, setQueuedAlert] = useState(false);
  const [selectedSourceTab, setSelectedSourceTab] = useState<'all' | 'astro' | 'stats' | 'ai'>('all');
  const [analysisStep, setAnalysisStep] = useState(0);

  const [copiedPerms3D, setCopiedPerms3D] = useState(false);
  const [copiedWheel4, setCopiedWheel4] = useState(false);
  const [copiedWheel5, setCopiedWheel5] = useState(false);
  const [copiedWheel15, setCopiedWheel15] = useState(false);
  const [betPerSet, setBetPerSet] = useState<number>(10);
  const [playStyle, setPlayStyle] = useState<'straightAndTod' | 'straightOnly' | 'sixDoorsGold'>('straightAndTod');
  const [convictionMode, setConvictionMode] = useState<'single3D' | 'portfolio15' | 'perms6' | 'wheel4' | 'wheel5' | 'jackpot4D'>('portfolio15');

  // Record Latest Draw Form State
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recordDate, setRecordDate] = useState(() => upcoming.drawDate || new Date().toISOString().slice(0, 10));
  const [record3D, setRecord3D] = useState('');
  const [record4D, setRecord4D] = useState('');
  const [record2Bottom, setRecord2Bottom] = useState('');
  const [recordAnimal, setRecordAnimal] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordFeedback, setRecordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active 3-Digit Prime Conviction (เต็งๆ เม็ดเดียว)
  const threeConviction = analysis?.threeDigitConviction || stats.threeDigitConviction;
  const main3D = threeConviction.mainPick;
  const digits3D = main3D.split('');

  // 15-Set Master Portfolio (10 Core + 5 Double Shield)
  const portfolio15 = threeConviction.fifteenSetsPortfolio || stats.threeDigitConviction.fifteenSetsPortfolio;
  const doubleShieldSet = new Set(portfolio15.doubleShieldSets || threeConviction.doubleShieldSets || []);
  const doubleShieldCount = (portfolio15.doubleShieldSets || threeConviction.doubleShieldSets || []).length;

  // Secondary 4-Digit Jackpot (ตัวเสริม)
  const conviction4D = analysis?.fourDigitConviction || stats.fourDigitConviction;
  const main4D = conviction4D.mainPick || threeConviction.fourDigitJackpot;
  const highlightMain = analysis?.highlightMain || String(stats.hotDigits[0] ?? main3D[0] ?? '0');
  const highlightSecondary = analysis?.highlightSecondary || String(stats.hotDigits[1] ?? main3D[1] ?? '0');
  const runningPair = analysis?.runningDigits || [highlightMain, highlightSecondary];
  const topPairsList = analysis?.twoDigitsTop || threeConviction.derivedTwoDigits.topList || [threeConviction.derivedTwoDigits.top];
  const bottomPairsList = analysis?.twoDigitsBottom || threeConviction.derivedTwoDigits.bottomList || [threeConviction.derivedTwoDigits.bottom];
  const animalMain = analysis?.animalPicks?.[0] || { name: threeConviction.animalLink.name, number: threeConviction.animalLink.number };
  const animalBackup = analysis?.animalPicks?.[1] || threeConviction.animalBackup || { name: conviction4D.animalLink.name, number: conviction4D.animalLink.number };
  const lastReview = conviction4D.lastDrawReview;
  const autopsy = conviction4D.systemAutopsy;

  const handleCopyPermutations3D = () => {
    if (!threeConviction?.permutations6) return;
    navigator.clipboard.writeText(threeConviction.permutations6.join(' - '));
    setCopiedPerms3D(true);
    setTimeout(() => setCopiedPerms3D(false), 2000);
  };

  const handleCopyWheel4 = () => {
    if (!threeConviction?.wheeling4Sets) return;
    navigator.clipboard.writeText(threeConviction.wheeling4Sets.join(' - '));
    setCopiedWheel4(true);
    setTimeout(() => setCopiedWheel4(false), 2000);
  };

  const handleCopyWheel5 = () => {
    if (!threeConviction?.wheeling5Sets) return;
    navigator.clipboard.writeText(threeConviction.wheeling5Sets.join(' - '));
    setCopiedWheel5(true);
    setTimeout(() => setCopiedWheel5(false), 2000);
  };

  const handleCopyWheel15 = () => {
    const sets = portfolio15.all15Sets || [];
    navigator.clipboard.writeText(sets.join(' - '));
    setCopiedWheel15(true);
    setTimeout(() => setCopiedWheel15(false), 2000);
  };

  const handleRunAnalysis = async () => {
    // Show visual step progress for mobile users
    setAnalysisStep(1);
    const t1 = setTimeout(() => setAnalysisStep(2), 600);
    const t2 = setTimeout(() => setAnalysisStep(3), 1300);

    try {
      await onAnalyze({
        historical: 15,
        dayOfWeek: 12,
        kamlangWan: 10,
        animal: 10,
        flowMomentum: 10,
        killNumbers: 8,
        crossPosition: 10,
        sumRange: 8,
        expertConsensus: 7,
        aiDeep: 10,
      });
      setAnalysisStep(4);
      setTimeout(() => setAnalysisStep(0), 1500);
    } catch {
      setAnalysisStep(0);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
    }
  };

  const handleCopyPost = () => {
    const textToCopy = analysis ? analysis.facebookPostContent : '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQueueClick = () => {
    if (!analysis) return;
    onSendToQueue(analysis);
    setQueuedAlert(true);
    setTimeout(() => setQueuedAlert(false), 3000);
  };

  const handleSubmitRecordDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRecordDraw) return;
    const clean3D = record3D.replace(/\D/g, '');
    if (clean3D.length !== 3) {
      setRecordFeedback({ type: 'error', text: 'กรุณากรอกผลเลขท้าย 3 ตัวบนให้ครบ 3 หลัก (เช่น 900)' });
      return;
    }
    setIsRecording(true);
    setRecordFeedback(null);
    try {
      const res = await onRecordDraw({
        drawDate: recordDate,
        threeDigitsTop: clean3D,
        fourDigits: record4D.replace(/\D/g, '') || undefined,
        twoDigitsBottom: record2Bottom.replace(/\D/g, '') || undefined,
        animalName: recordAnimal.trim() || undefined,
      });
      if (res.success) {
        setRecordFeedback({
          type: 'success',
          text: res.message || `บันทึกผล ${clean3D} เข้าสมอง AI และคำนวณแนวทางงวดใหม่เรียบร้อยแล้ว!`,
        });
        setRecord3D('');
        setRecord4D('');
        setRecord2Bottom('');
        setRecordAnimal('');
      } else {
        setRecordFeedback({ type: 'error', text: res.error || 'ไม่สามารถบันทึกผลหวยได้' });
      }
    } catch (err: any) {
      setRecordFeedback({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-6 sm:p-8 shadow-2xl">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none bg-cover bg-center"
          style={{ backgroundImage: "url('/src/assets/images/hero_lao_lottery_culture_1794031366691.jpg')" }}
        />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>ระบบคำนวณ 10 มิติ • วิเคราะห์ลึก & ฟันธง 4 ตัวพัฒนา</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              วิเคราะห์เลขหวยลาว & วางเลขเด็ดฟันธง 4 ตัว
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              ยกระดับความแม่นยำด้วยการผสาน <strong>10 แหล่งข้อมูลสถิติเชิงลึก</strong> พร้อมสูตรตัดเลขดับ 100% คำนวณหาชุด 4 ตัวเม็ดเดียวที่มีความน่าจะเป็นสูงสุดประจำงวด
            </p>

            <div className="flex items-center gap-3 text-xs text-slate-300 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>งวดที่กำลังจะมาถึง:</span>
                <span className="font-bold text-amber-300 font-mono-tabular">
                  {upcoming.drawDateThai}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800">
                <Flame className="w-4 h-4 text-emerald-400" />
                <span>แหล่งข้อมูลวิเคราะห์:</span>
                <span className="font-bold text-emerald-300 font-mono-tabular">
                  10 แหล่งสถิติเชิงลึก
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch lg:items-center gap-3 shrink-0">
            {onRecordDraw && (
              <button
                type="button"
                onClick={() => setShowRecordForm((v) => !v)}
                className="px-4 py-3.5 text-xs sm:text-sm font-bold text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/50 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>{showRecordForm ? 'ซ่อนฟอร์มบันทึกผล' : 'บันทึกผลหวยงวดล่าสุด'}</span>
              </button>
            )}
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading}
              className="px-6 py-4 text-sm font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 rounded-2xl shadow-xl shadow-amber-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <Zap className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>
                {isLoading
                  ? analysisStep === 1
                    ? '1/3 กำลังรวม 10 แหล่งสถิติ...'
                    : analysisStep === 2
                    ? '2/3 กำลังตัดเลขดับ & คำนวณมหาทักษา...'
                    : analysisStep === 3
                    ? '3/3 AI กำลังฟันธง 3 ตัว...'
                    : 'กำลังประมวลผลวิเคราะห์ AI...'
                  : 'คำนวณ & อัปเดตแนวทางงวดใหม่'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📝 IN-APP DRAW RECORDER: บันทึกผลหวยงวดล่าสุดเข้าสมอง AI     */}
      {/* ======================================================== */}
      {showRecordForm && onRecordDraw && (
        <form
          onSubmit={handleSubmitRecordDraw}
          className="rounded-3xl border border-emerald-500/40 bg-slate-900/95 p-5 sm:p-6 shadow-xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  บันทึกผลหวยลาวพัฒนาล่าสุดเข้าฐานข้อมูล AI (ไม่ต้องแก้โค้ด)
                </h3>
                <p className="text-xs text-slate-400">
                  เมื่อหวยออกแล้ว กรอกเลขท้าย 3 ตัวบน ระบบจะบันทึกเข้าสถิติ เปลี่ยนวันงวดถัดไป และคำนวณเลขชุดใหม่ทั้งระบบทันที
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">วันที่ออกรางวัล *</label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-amber-300 font-semibold block">เลขท้าย 3 ตัวบน *</label>
              <input
                type="text"
                maxLength={3}
                placeholder="เช่น 900"
                value={record3D}
                onChange={(e) => setRecord3D(e.target.value.replace(/\D/g, '').slice(0, 3))}
                required
                className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold text-base focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">4 ตัว (ไม่บังคับ)</label>
              <input
                type="text"
                maxLength={4}
                placeholder="เช่น 2193"
                value={record4D}
                onChange={(e) => setRecord4D(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">2 ตัวล่าง (ไม่บังคับ)</label>
              <input
                type="text"
                maxLength={2}
                placeholder="เช่น 21"
                value={record2Bottom}
                onChange={(e) => setRecord2Bottom(e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">นามสัตว์ (ไม่บังคับ)</label>
              <input
                type="text"
                placeholder="เช่น ตะขาบ"
                value={recordAnimal}
                onChange={(e) => setRecordAnimal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {recordFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                recordFeedback.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
              }`}
            >
              {recordFeedback.text}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowRecordForm(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl border border-slate-800 cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="submit"
              disabled={isRecording}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isRecording ? 'กำลังบันทึก & คำนวณใหม่...' : 'บันทึกผล & อัปเดตสูตร AI'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* 🔍 POST-MORTEM LAB: รายงานผ่าตัดระบบ & ชันสูตรผลงวดล่าสุดจริง */}
      {/* ======================================================== */}
      <div className="rounded-3xl border-2 border-red-500/50 bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-950 p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-500/30 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {autopsy.title}
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-red-500/30 text-red-300 font-bold border border-red-500/40">
                  ชันสูตรผลล่าสุด: {lastReview.actualThreeDigits}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {autopsy.subtitle} — เป้าหมายถัดไป: <strong className="text-amber-300">{upcoming.drawDateThai}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 bg-emerald-950/70 border border-emerald-600/80 px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Dynamic Engine V2 + เกราะกันเบิ้ล ({doubleShieldCount} ชุด)</span>
            </span>
          </div>
        </div>

        {/* Latest Draw Honest Audit + Historical Comparison */}
        <div className="bg-slate-950/90 border border-amber-500/40 p-4 rounded-2xl space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="font-bold text-amber-300">
              📌 ชันสูตรผลงวดล่าสุด ({lastReview.drawDateThai})
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                3 ตัวบน: {lastReview.actualThreeDigits} | 2 ตัวบน: {lastReview.actualTwoDigitsTop}
              </span>
              <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                นามสัตว์: {lastReview.actualAnimal}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <span className="text-emerald-400 font-bold block">✔️ จุดที่เข้าตรง:</span>
              <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                {lastReview.hits.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1">
              <span className="text-rose-400 font-bold block">❌ จุดที่หลุด & บทเรียนสำคัญ:</span>
              <ul className="list-disc list-inside text-rose-200/90 space-y-0.5">
                {lastReview.misses.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-[11px] text-amber-200/90 bg-amber-950/40 border border-amber-500/20 rounded-xl p-2.5">
            💡 <strong>การปรับจูนอัตโนมัติ:</strong> {lastReview.aiCalibrationNote}
          </p>
        </div>

        {/* Missed History Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {autopsy.missedHistory.map((item, idx) => (
            <div key={idx} className="bg-slate-950/90 border border-red-500/30 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-bold text-red-300">{item.drawDateThai}</span>
                <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  ออก: {item.actual4D}
                </span>
              </div>
              <p className="text-slate-300">
                🎯 <strong>วางไว้:</strong> <span className="font-mono text-amber-300">{item.predicted4D}</span> •{' '}
                <span className="text-rose-300">{item.missedParts}</span>
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">{item.diagnosis}</p>
            </div>
          ))}
        </div>

        {/* Surgical Repairs Cards */}
        <div className="pt-2">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>การผ่าตัดแก้ไขจุดบอดเชิงโครงสร้าง (Surgical Repairs V2):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {autopsy.blindSpots.map((bs, idx) => (
              <div key={idx} className="bg-slate-900/90 border border-amber-500/30 p-3.5 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-red-400">จุดบอดที่ {idx + 1}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      bs.severity === 'CRITICAL'
                        ? 'bg-red-950/80 text-red-300 border-red-800'
                        : 'bg-amber-950/80 text-amber-300 border-amber-800'
                    }`}
                  >
                    {bs.severity}
                  </span>
                </div>
                <h5 className="font-bold text-white text-xs">{bs.title}</h5>
                <p className="text-[11px] text-slate-400 leading-tight">
                  <strong>สาเหตุ:</strong> {bs.cause}
                </p>
                <div className="text-[11px] text-emerald-400 bg-emerald-950/30 p-1.5 rounded border border-emerald-900/40">
                  ✔️ <strong>วิธีแก้:</strong> {bs.fixApplied}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Strict Guidelines */}
        <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl text-xs space-y-1 text-slate-200">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>3 กฎเหล็กบริหารความเสี่ยงประจำงวด (Risk Mitigation Protocol):</span>
          </div>
          {autopsy.guaranteedRules.map((rule, idx) => (
            <p key={idx} className="text-[11px] text-slate-300">
              {idx + 1}. {rule}
            </p>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 👑 GRAND 3-DIGIT PRIME CONVICTION HERO SHOWCASE (3 ตัวเต็ง เม็ดเดียว) */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/70 bg-gradient-to-b from-amber-950/45 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Glow Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/30 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/35">
              <Crown className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  ฟันธง 3 ตัวเต็ง เม็ดเดียว & ชุด 6 ประตูการันตี
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                  ความแม่นยำ {threeConviction.confidenceScore}% (3 ตัวเต็ง)
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-1">
                🎯 <strong>ความน่าจะเป็น 1 ใน 1,000</strong> (ถูกรางวัลง่ายและแม่นยำกว่า 4 ตัวถึง 10 เท่า!) งวด{upcoming.drawDateThai}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
            <button
              onClick={() => setConvictionMode('portfolio15')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                convictionMode === 'portfolio15'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-md font-black ring-1 ring-amber-300'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-950" />
              <span>🛡️ พอร์ต 15 ชุดเต็ง (สูตรทองคำกันหลุด)</span>
              <span className="px-1.5 py-0.5 bg-amber-950 text-amber-200 text-[10px] rounded-full font-bold">แนะนำ</span>
            </button>
            <button
              onClick={() => setConvictionMode('single3D')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                convictionMode === 'single3D'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3 ตัวเต็งเม็ดเดียว ({main3D})
            </button>
            <button
              onClick={() => setConvictionMode('perms6')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                convictionMode === 'perms6'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด)
            </button>
            <button
              onClick={() => setConvictionMode('wheel4')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                convictionMode === 'wheel4'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ตารางวิน 4 ตัว (4 ชุดตรง-โต๊ด)
            </button>
            <button
              onClick={() => setConvictionMode('wheel5')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                convictionMode === 'wheel5'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ตารางวิน 5 ตัว (10 ชุด)
            </button>
            <button
              onClick={() => setConvictionMode('jackpot4D')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                convictionMode === 'jackpot4D'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ชุด 4 ตัวแจ็กพอตเสริม ({main4D})
            </button>
          </div>
        </div>

        {/* View Mode: 15-Set Master Portfolio (พอร์ต 15 ชุดเต็งสูตรทองคำกันหลุด) */}
        {convictionMode === 'portfolio15' && (
          <div className="space-y-6">
            {/* Direct Answer & Mathematical Probability Banner */}
            <div className="bg-gradient-to-br from-amber-950/70 via-slate-950 to-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-amber-500/30 pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold mb-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>ตอบข้อสงสัย: 4 ชุด vs 15 ชุด แบบไหนได้เปรียบกว่า?</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    🛡️ พอร์ต 15 ชุด Hybrid: 10 ชุดแกนหลัก + 5 ชุดเกราะกันเบิ้ล/หาม
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-3xl">
                    ทางคณิตศาสตร์ <strong>เลข 3 ตัวจะมีโอกาสออกเบิ้ลหรือหาม (XYY, XXY, XYX เช่น <span className="text-rose-300 font-mono">900</span>) สูงถึง 28% (280 ใน 1,000 ชุด)</strong> ระบบ V2 จึงแบ่งพอร์ต 15 ชุดออกเป็น{' '}
                    <strong>10 ชุดเลขไม่ซ้ำหลัก</strong> (จากแกน{' '}
                    <strong className="text-amber-300 font-mono">{threeConviction.wheeling6Digits.join(' - ')}</strong>) +{' '}
                    <strong className="text-cyan-300">5 ชุดเกราะกันเบิ้ล/หาม</strong> เพื่อปิดจุดบอดที่เคยทำให้พลาดงวด 900!
                  </p>
                </div>

                <button
                  onClick={handleCopyWheel15}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all self-start lg:self-auto shrink-0"
                >
                  {copiedWheel15 ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWheel15 ? 'คัดลอกครบทั้ง 15 ชุดแล้ว!' : '📋 คัดลอกทั้ง 15 ชุด (พร้อมส่งแทง)'}</span>
                </button>
              </div>

              {/* Mathematical Comparison Cards: 4 Sets vs 10 Sets vs 15 Sets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      แบบ 4 ชุดเต็ง
                    </span>
                    <span className="text-lg font-bold text-slate-200 block">ครอบคลุมแกน 4 ตัว (ไม่กันเบิ้ล)</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      เหมาะสำหรับคนงบน้อยมาก แต่มีความเสี่ยงสูงหากมีเลขแทรกหรือออกเลขเบิ้ล (เช่น 900)
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">โอกาสตรง-โต๊ด (ทางทฤษฎี):</span>
                    <span className="text-amber-400 font-bold">2.4% (24/1,000)</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                      แบบ 10 ชุด (วิน 5 ตัว)
                    </span>
                    <span className="text-lg font-bold text-slate-200 block">ครอบคลุมแกน 5 ตัว (ไม่กันเบิ้ล)</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      ปิดช่องโหว่เลขแกนได้ 60 ประตูโต๊ด แต่ยังไม่มีเกราะป้องกันเลขซ้ำ XYY/XXY
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">โอกาสตรง-โต๊ด (ทางทฤษฎี):</span>
                    <span className="text-blue-400 font-bold">6.0% (60/1,000)</span>
                  </div>
                </div>

                <div className="bg-amber-500/15 border-2 border-amber-400 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-amber-500/10">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider block mb-1">
                        👑 พอร์ต 15 ชุด (Hybrid V2)
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                        สมดุลสูงสุด
                      </span>
                    </div>
                    <span className="text-lg font-black text-white block">10 ชุดแกน + 5 ชุดกันเบิ้ล</span>
                    <p className="text-[11px] text-amber-100/90 mt-1">
                      ครอบคลุมทั้งเลขแกน 5 ตัว ({threeConviction.wheeling5Digits.join('-')}) และ 5 ชุดเกราะกันเบิ้ล ({Array.from(doubleShieldSet).join(', ')})
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-500/30 flex items-center justify-between text-xs font-mono">
                    <span className="text-amber-200">ประตูครอบคลุม:</span>
                    <span className="text-emerald-400 font-black">15 ชุด + เกราะกันเบิ้ล {doubleShieldCount} ชุด</span>
                  </div>
                </div>
              </div>

              {/* Question & Answer Box: Do we need to Reverse (กลับ) or Tod (โต๊ด)? */}
              <div className="mt-5 p-4 sm:p-5 bg-gradient-to-r from-amber-950/80 via-slate-950 to-slate-900 border-2 border-amber-500/40 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm">
                    ?
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-amber-300">
                    คำถามสำคัญ: ชุด 15 ชุดนี้ต้อง "กลับ" หรือ "โต๊ด" ด้วยหรือไม่?
                  </h4>
                </div>

                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2">
                  <p>
                    <strong className="text-amber-400 font-bold">คำตอบชัดเจน:</strong> <strong>"จำเป็นอย่างยิ่งครับ!"</strong> เพื่อปิดประตูหลุดสลับตำแหน่ง:
                  </p>
                  <ul className="space-y-1.5 list-disc list-inside text-xs text-slate-300 pl-1">
                    <li>
                      <span className="text-rose-300 font-bold">หากเล่น "เต็งตรงเพียวๆ":</span> เลขทั้ง 3 ตัวต้องออกเรียงหลักตรงเป๊ะ เช่น แทง{' '}
                      <code className="text-amber-300 font-mono">{main3D}</code> หากผลออกสลับตำแหน่งเช่น{' '}
                      <code className="text-slate-100 font-mono">{threeConviction.permutations6[1] || main3D}</code> จะไม่ได้เงิน
                    </li>
                    <li>
                      <span className="text-emerald-400 font-bold">สูตรแนะนำที่ได้เปรียบที่สุด:</span> แทงแบบ <strong>"เต็งควบโต๊ด (เช่น เต็ง 10 x โต๊ด 10)"</strong> รวมชุดละ 20 บาท (15 ชุด = 300 บาท)
                      <span className="block text-[11px] text-amber-200/90 pl-4 mt-0.5">
                        • <strong>ถ้าออกตรงเป๊ะ:</strong> ได้เต็ง 8,500 + โต๊ด 1,400 = <strong>9,900 บาท</strong> (กำไร +9,600 บาท)
                        <br />
                        • <strong>ถ้าออกสลับตำแหน่ง (โต๊ด):</strong> ยังได้ 1,400 บาท (หักทุน 300 ➡️ <strong>เหลือกำไร +1,100 บาท ไม่ขาดทุน!)</strong>
                      </span>
                    </li>
                    <li>
                      <span className="text-cyan-300 font-bold">สูตรเม็ดทอง 6 กลับ:</span> นำ <strong>3 ชุดแรก (Tier 1 เม็ดทอง: {(portfolio15.tier1Gold || []).join(', ')})</strong> ไปกด{' '}
                      <strong>"ชุด 6 กลับ"</strong> (และหากชุดกันเบิ้ลใช้ 3 กลับสำหรับ XYY/XXY) ส่วนชุดรองที่เหลือแทงเต็ง-โต๊ดตามงบ
                    </li>
                  </ul>
                </div>
              </div>

              {/* Interactive ROI & Budget Calculator with PlayStyle Mode */}
              <div className="mt-4 p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">
                      เครื่องคำนวณผลตอบแทนสด: เลือกรูปแบบการแทง (Play Style)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400">งบต่อชุด:</span>
                    {[5, 10, 20, 50, 100].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setBetPerSet(amount)}
                        className={`px-2.5 py-1 text-xs font-bold font-mono rounded-lg transition-colors ${
                          betPerSet === amount
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {amount} บ.
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setPlayStyle('straightAndTod')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      playStyle === 'straightAndTod'
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">1. เต็งควบโต๊ด (แนะนำที่สุด)</span>
                      {playStyle === 'straightAndTod' && <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">เลือกอยู่</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      เต็ง {betPerSet} + โต๊ด {betPerSet} (ชุดละ {betPerSet * 2} บ.)
                    </span>
                  </button>

                  <button
                    onClick={() => setPlayStyle('straightOnly')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      playStyle === 'straightOnly'
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">2. เต็งตรงเพียวๆ</span>
                      {playStyle === 'straightOnly' && <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">เลือกอยู่</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      เต็งตรง {betPerSet} บ. (ใช้งบน้อยสุด แต่ไม่กันสลับ)
                    </span>
                  </button>

                  <button
                    onClick={() => setPlayStyle('sixDoorsGold')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      playStyle === 'sixDoorsGold'
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">3. เม็ดทอง 6 กลับ + ที่เหลือตรง</span>
                      {playStyle === 'sixDoorsGold' && <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">เลือกอยู่</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      3 ชุดทองคูณ 6 ประตู (18 บิล) + 12 ชุดรองตรง
                    </span>
                  </button>
                </div>

                {(() => {
                  let totalCost = 0;
                  let directPayout = 0;
                  let directProfit = 0;
                  let todPayout = 0;
                  let todProfit = 0;

                  if (playStyle === 'straightAndTod') {
                    totalCost = betPerSet * 2 * 15;
                    directPayout = (betPerSet * 850) + (betPerSet * 140);
                    directProfit = directPayout - totalCost;
                    todPayout = betPerSet * 140;
                    todProfit = todPayout - totalCost;
                  } else if (playStyle === 'straightOnly') {
                    totalCost = betPerSet * 15;
                    directPayout = betPerSet * 850;
                    directProfit = directPayout - totalCost;
                    todPayout = 0;
                    todProfit = -totalCost;
                  } else {
                    // sixDoorsGold: 3 sets * 6 = 18 straight, 12 sets * 1 = 12 straight => total 30 bets
                    totalCost = (3 * 6 * betPerSet) + (12 * betPerSet);
                    directPayout = betPerSet * 850;
                    directProfit = directPayout - totalCost;
                    todPayout = betPerSet * 850; // because 6-doors guarantees direct straight!
                    todProfit = directProfit;
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block mb-0.5">เงินลงทุนรวม</span>
                        <span className="text-base sm:text-lg font-black text-rose-300 font-mono">
                          {totalCost.toLocaleString()} บาท
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          {playStyle === 'straightAndTod' ? 'รางวัลเมื่อออกตรง (เต็ง+โต๊ด)' : 'รางวัลเมื่อออกตรง'}
                        </span>
                        <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
                          {directPayout.toLocaleString()} บาท
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          {playStyle === 'straightAndTod' ? 'กำไรกรณีออกตรง' : 'กำไรสุทธิ'}
                        </span>
                        <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                          +{directProfit.toLocaleString()} บาท
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block mb-0.5">
                          {playStyle === 'straightAndTod' ? 'กำไรกรณีออกสลับหลัก (โต๊ด)' : playStyle === 'sixDoorsGold' ? 'การันตีตรงทุกประตู' : 'ความเสี่ยงสลับหลัก'}
                        </span>
                        <span className={`text-base sm:text-lg font-black font-mono ${
                          todProfit > 0 ? 'text-cyan-300' : 'text-rose-400'
                        }`}>
                          {todProfit > 0 ? `+${todProfit.toLocaleString()} บาท` : 'หลุดหากสลับหลัก'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* The 15 Numbers Breakdown across 3 Tiers */}
            <div className="space-y-4">
              {/* Tier 1: Gold Master (3 Sets) */}
              <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-amber-300">
                      🥇 Tier 1: ชุดเน้นหนัก เม็ดทอง (3 ชุดเต็งหัวกะทิ)
                    </h4>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                      แนะนำลง 40-50% ของงบ
                    </span>
                  </div>

                  <span className="text-xs text-slate-400">คัดจากหลักร้อย-สิบ-หน่วยที่มีคะแนนสถิติสูงสุด</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {portfolio15.tier1Gold.map((set, idx) => (
                    <div
                      key={set}
                      className="bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border-2 border-amber-400 rounded-2xl p-4 text-center hover:scale-105 transition-all shadow-md group cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(set);
                      }}
                    >
                      <span className="text-[11px] text-amber-300 font-semibold block mb-1">
                        {idx === 0 ? '👑 เต็งเอก เม็ดเดียว' : `เต็งทอง ชุดที่ ${idx + 1}`}
                      </span>
                      <span className="text-3xl font-black font-mono-tabular tracking-widest text-amber-300 group-hover:text-white transition-colors">
                        {set}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tier 2: Silver Support (4 Sets) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-700 text-slate-200 font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-slate-200">
                      🥈 Tier 2: ชุดเต็งรอง เม็ดเงิน (4 ชุดหลักประจำ{upcoming.dayOfWeekThai})
                    </h4>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                      แนะนำลง 30% ของงบ
                    </span>
                  </div>

                  <span className="text-xs text-slate-400">สอดคล้องกับเลขเด่น {highlightMain} และเลขรอง {highlightSecondary}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {portfolio15.tier2Silver.map((set, idx) => (
                    <div
                      key={set}
                      className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-center hover:border-amber-400 transition-all cursor-pointer group"
                      onClick={() => {
                        navigator.clipboard.writeText(set);
                      }}
                    >
                      <span className="text-[10px] text-slate-400 block mb-0.5">เต็งรอง {idx + 1}</span>
                      <span className="text-2xl font-black font-mono-tabular tracking-wider text-slate-100 group-hover:text-amber-300 transition-colors">
                        {set}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tier 3: Shield Protection + 5 Double/Twin Shield Sets (8 Sets) */}
              <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-lg bg-cyan-900 text-cyan-300 font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-cyan-300">
                      🥉 Tier 3: 3 ชุดแกนหลักเสริม + 🛡️ 5 ชุดเกราะกันเบิ้ล/หาม (ปิดจุดบอด XYY)
                    </h4>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-bold">
                      แนะนำลง 25% ของงบ
                    </span>
                  </div>

                  <span className="text-xs text-slate-400">ป้องกันเหตุการณ์ซ้ำรอยเลขเบิ้ล/หาม (เช่น 900)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                  {portfolio15.tier3Shield.map((set, idx) => {
                    const isDouble = doubleShieldSet.has(set) || /(\d).*\1/.test(set);
                    return (
                      <div
                        key={set}
                        className={`rounded-xl p-2.5 text-center transition-all cursor-pointer group border ${
                          isDouble
                            ? 'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-300'
                            : 'bg-slate-900/60 border-slate-800 hover:border-cyan-400'
                        }`}
                        onClick={() => {
                          navigator.clipboard.writeText(set);
                        }}
                      >
                        <span
                          className={`text-[9px] block mb-0.5 font-bold ${
                            isDouble ? 'text-emerald-300' : 'text-slate-500'
                          }`}
                        >
                          {isDouble ? '🛡️ กันเบิ้ล' : `แกนเสริม ${idx + 1}`}
                        </span>
                        <span
                          className={`text-lg font-bold font-mono-tabular transition-colors ${
                            isDouble
                              ? 'text-emerald-200 group-hover:text-white'
                              : 'text-slate-300 group-hover:text-cyan-300'
                          }`}
                        >
                          {set}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Mode 1: Single 3-Digit Prime Pick */}
        {convictionMode === 'single3D' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                <span>โครงสร้างเลข 3 ตัวตรงเต็งๆ (ร้อย - สิบ - หน่วย):</span>
              </span>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                ⭐ ผลรวม 3 ตัว: {threeConviction.totalSum} (สมดุลทองคำ)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  pos: 'หลักร้อย',
                  digit: digits3D[0] || '-',
                  reason: threeConviction.positionBreakdown.hundreds.reason,
                  gradient: 'from-amber-500 via-yellow-400 to-amber-300',
                  badge: `👑 แกนนำ (${upcoming.dayOfWeekThai})`,
                },
                {
                  pos: 'หลักสิบ',
                  digit: digits3D[1] || '-',
                  reason: threeConviction.positionBreakdown.tens.reason,
                  gradient: 'from-yellow-400 via-amber-300 to-yellow-200',
                  badge: `🔥 แกนสิบ-สมดุล`,
                },
                {
                  pos: 'หลักหน่วย',
                  digit: digits3D[2] || '-',
                  reason: threeConviction.positionBreakdown.units.reason,
                  gradient: 'from-amber-600 via-yellow-400 to-amber-400',
                  badge: `⚡ ปิดท้ายตัวตัด`,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/90 border-2 border-amber-500/40 rounded-3xl p-5 flex flex-col items-center text-center space-y-3 hover:border-amber-400 transition-all shadow-xl hover:shadow-amber-500/20"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-amber-300 tracking-wider">{item.pos}</span>
                    <span className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  </div>

                  <div
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr ${item.gradient} text-slate-950 font-black text-6xl sm:text-7xl flex items-center justify-center shadow-xl shadow-amber-500/30 font-mono-tabular tracking-tight`}
                  >
                    {item.digit}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pt-1">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-amber-300 font-bold text-sm block">
                  👑 สูตรฟันธง 3 ตัวเต็งเม็ดเดียว: <strong className="text-white text-base font-mono underline decoration-amber-400 underline-offset-4">{main3D}</strong>
                </span>
                <p className="text-slate-300 text-[11px]">
                  แนะนำเล่น <strong>3 ตัวตรง + 3 ตัวโต๊ด</strong> หรือเปิด <strong>ชุด 6 กลับ (6 ประตู)</strong> เพื่อป้องกันเลขสลับตำแหน่ง
                </p>
              </div>

              <button
                onClick={handleCopyPermutations3D}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl flex items-center gap-2 transition-all self-start sm:self-auto shadow-md"
              >
                {copiedPerms3D ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPerms3D ? 'คัดลอก 6 กลับแล้ว' : 'คัดลอกชุด 6 กลับ'}</span>
              </button>
            </div>
          </div>
        )}

        {/* View Mode 2: 6 Permutations (ชุด 6 กลับ 6 ประตูเต็ง-โต๊ด) */}
        {convictionMode === 'perms6' && (
          <div className="space-y-4 bg-slate-950/90 border border-amber-500/40 p-5 sm:p-6 rounded-2xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-amber-400" />
                  <span>ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด กันสลับหลัก)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  สลับตำแหน่งทั้งหมดของเลขเต็ง <strong className="text-white font-mono">{main3D}</strong> เพื่อปิดประตูหลุดสลับหลัก
                </p>
              </div>

              <button
                onClick={handleCopyPermutations3D}
                className="px-3.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                {copiedPerms3D ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPerms3D ? 'คัดลอกครบ 6 ประตูแล้ว' : 'คัดลอกครบ 6 ประตู'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
              {threeConviction.permutations6.map((perm, idx) => (
                <div
                  key={perm}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    idx === 0
                      ? 'bg-amber-500/25 border-amber-400 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 block mb-1">
                    {idx === 0 ? '👑 ตัวเอกตรง' : `ประตูที่ ${idx + 1}`}
                  </span>
                  <span className={`text-2xl font-black font-mono-tabular tracking-wider ${
                    idx === 0 ? 'text-amber-300' : 'text-slate-100'
                  }`}>
                    {perm}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/50 leading-relaxed">
              🛡️ <strong>หลักประกันตำแหน่ง:</strong> เมื่อเล่นชุด 6 กลับ หากผล 3 ตัวออกเลข{' '}
              <strong className="font-mono">{digits3D.join(', ')}</strong> ในตำแหน่งใดก็ตาม คุณจะถูกรางวัล 3 ตัวตรงทันที
            </div>
          </div>
        )}

        {/* View Mode 3: Wheeling Matrix 4 Digits (4 Sets) */}
        {convictionMode === 'wheel4' && (
          <div className="space-y-4 bg-slate-950/90 border border-amber-500/40 p-5 sm:p-6 rounded-2xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>สูตรตารางวิน 4 ตัวเข้า 3 ตัว (4 ชุดตรง-โต๊ด ประหยัดงบ)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  คัด 4 เลขเด่นหัวกะทิ: <strong className="text-white font-mono">{threeConviction.wheeling4Digits.join(' - ')}</strong> จับวิน 3 ตัวได้ 4 ชุด
                </p>
              </div>

              <button
                onClick={handleCopyWheel4}
                className="px-3.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                {copiedWheel4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWheel4 ? 'คัดลอกทั้ง 4 ชุดแล้ว' : 'คัดลอกทั้ง 4 ชุด'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {threeConviction.wheeling4Sets.map((set, idx) => (
                <div
                  key={set}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    idx === 0
                      ? 'bg-amber-500/25 border-amber-400 shadow-lg'
                      : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <span className="text-[11px] text-slate-400 block mb-1">
                    {idx === 0 ? '👑 ชุดฟันธงเอก' : `ชุดวินที่ ${idx + 1}`}
                  </span>
                  <span className={`text-2xl font-black font-mono-tabular tracking-wider ${
                    idx === 0 ? 'text-amber-300' : 'text-slate-100'
                  }`}>
                    {set}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/50">
              💡 <strong>ข้อดีของวิน 4 ตัว:</strong> ใช้งบน้อยเพียง 4 ชุด หากเลข 3 ตัวท้ายไม่เบิ้ลและออกในกลุ่ม ({threeConviction.wheeling4Digits.join(', ')}) จะถูกรางวัลตรงหรือโต๊ดทันที
            </div>
          </div>
        )}

        {/* View Mode 4: Wheeling Matrix 5 Digits (10 Sets) */}
        {convictionMode === 'wheel5' && (
          <div className="space-y-4 bg-slate-950/90 border border-amber-500/40 p-5 sm:p-6 rounded-2xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>สูตรตารางวิน 5 ตัวเข้า 3 ตัว (10 ชุดแกนหลัก)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  คัด 5 เลขเด่น: <strong className="text-white font-mono">{threeConviction.wheeling5Digits.join(' - ')}</strong> จับวิน 3 ตัวได้ 10 ชุด
                </p>
              </div>

              <button
                onClick={handleCopyWheel5}
                className="px-3.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                {copiedWheel5 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWheel5 ? 'คัดลอกทั้ง 10 ชุดแล้ว' : 'คัดลอกทั้ง 10 ชุด'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              {threeConviction.wheeling5Sets.map((set, idx) => (
                <div
                  key={set}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    idx === 0
                      ? 'bg-amber-500/20 border-amber-400 shadow-md'
                      : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 block mb-0.5">
                    {idx === 0 ? '👑 เม็ดเอก' : `ชุดที่ ${idx + 1}`}
                  </span>
                  <span className={`text-xl font-black font-mono-tabular tracking-wider ${
                    idx === 0 ? 'text-amber-300' : 'text-slate-200'
                  }`}>
                    {set}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Mode 5: 4-Digit Jackpot (ชุด 4 ตัวแจ็กพอตเสริม) */}
        {convictionMode === 'jackpot4D' && (
          <div className="space-y-4 bg-slate-950/90 border border-amber-500/40 p-5 sm:p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>ชุด 4 ตัวพัฒนา (แจ็กพอตเสริมสำหรับผู้ที่ต้องการลุ้นรางวัลใหญ่)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  นำหลักพัน ({conviction4D.positionBreakdown.thousands.digit}) ค้ำหน้าชุด 3 ตัวเต็ง {main3D} ได้ชุด 4 ตัวพัฒนา{' '}
                  <strong className="text-white font-mono">{main4D}</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              {[
                { name: '4 ตัวฟันธงแจ็กพอต', val: main4D, desc: `หลักพัน ${main4D[0]} ค้ำหน้า ${main3D}` },
                ...(threeConviction.fourDigitJackpotSupporting || conviction4D.supportingPicks || [])
                  .slice(0, 3)
                  .map((val, i) => ({
                    name: `4 ตัวเด่นรอง ${i + 1}`,
                    val,
                    desc: `ชุดรองจากโมเดล 10 มิติ (${upcoming.dayOfWeekThai})`,
                  })),
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    idx === 0
                      ? 'bg-amber-500/25 border-amber-400 shadow-lg'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <span className="text-[11px] text-slate-400 block mb-1">{item.name}</span>
                  <div className={`text-2xl font-black font-mono-tabular tracking-wider ${
                    idx === 0 ? 'text-amber-300' : 'text-slate-100'
                  }`}>
                    {item.val}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decomposition & Supporting Picks Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Supporting 3-Digit Picks */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>3 ตัวเต็งรอง 4 ชุด</span>
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {threeConviction.supportingPicks.map((pick) => (
                <span
                  key={pick}
                  className="px-3 py-1.5 bg-slate-900 border border-amber-500/30 text-amber-300 font-bold text-base rounded-xl font-mono-tabular shadow-sm"
                >
                  {pick}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">ชุดตัวเลขสำรองครอบคลุมรอบการออกของ{upcoming.dayOfWeekThai}</p>
          </div>

          {/* 2-Digit Top & Bottom */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-400" />
              <span>เจาะ 2 ตัวบน & 2 ตัวล่าง</span>
            </span>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="flex items-center gap-1.5 bg-emerald-500/15 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                <span className="text-slate-300">2 ตัวบนเต็ง:</span>
                <span className="text-emerald-300 font-black text-sm font-mono-tabular">
                  {threeConviction.derivedTwoDigits.top} (กัน {threeConviction.derivedTwoDigits.top.split('').reverse().join('')})
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-purple-500/15 px-3 py-1.5 rounded-lg border border-purple-500/30">
                <span className="text-slate-300">2 ตัวล่างเต็ง:</span>
                <span className="text-purple-300 font-black text-sm font-mono-tabular">
                  {threeConviction.derivedTwoDigits.bottom} (กัน {threeConviction.derivedTwoDigits.bottom.split('').reverse().join('')})
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">ตัดทอนตรงจาก 2 ตัวท้ายของ 3 ตัวเต็ง {main3D} และกำลังวัน{upcoming.dayOfWeekThai}</p>
          </div>

          {/* Statistical Validation & Animal Link */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>สายวิ่ง/รูด 19 ประตู & นามสัตว์</span>
            </span>
            <div className="space-y-1.5 pt-1 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">วิ่ง/รูด 19 ประตู:</span>
                <span className="font-bold text-amber-300 font-mono-tabular">
                  เด่น {highlightMain} — รอง {highlightSecondary}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">นามสัตว์มงคล:</span>
                <span className="font-bold text-sky-300">
                  {animalMain.name} ({animalMain.number}) / {animalBackup.name} ({animalBackup.number})
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">เล่นวิ่ง/รูดคุ้มกันทุนอันดับแรกเพื่อลดความเสี่ยง</p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 10 DEEP DATA SOURCES EXPLORER (ความละเอียดข้อมูล 10 แหล่ง) */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                ความละเอียดข้อมูล 10 แหล่งคำนวณ (10-Source Intelligence Grid)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ตรวจสอบว่าแต่ละแหล่งข้อมูลคำนวณได้เลขอะไร และมีน้ำหนักการตัดสินใจเท่าใด
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedSourceTab('all')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                selectedSourceTab === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ทั้งหมด (10 แหล่ง)
            </button>
            <button
              onClick={() => setSelectedSourceTab('stats')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                selectedSourceTab === 'stats' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              สถิติ & ความถี่
            </button>
            <button
              onClick={() => setSelectedSourceTab('astro')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                selectedSourceTab === 'astro' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              กำลังวัน & นามสัตว์
            </button>
            <button
              onClick={() => setSelectedSourceTab('ai')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                selectedSourceTab === 'ai' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AI & สหสัมพันธ์
            </button>
          </div>
        </div>

        {/* 10 Sources Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {stats.dataSources.map((ds) => (
            <div
              key={ds.id}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 hover:border-amber-500/40 transition-all space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-400 font-bold uppercase tracking-wider">
                    {ds.category}
                  </span>
                  <span className="text-slate-400 font-mono-tabular font-medium">
                    น้ำหนัก {ds.weight}%
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white line-clamp-1">{ds.name}</h4>
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {ds.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">ผลสกัด:</span>
                  <span className="text-amber-300 font-bold font-mono-tabular">
                    {ds.extractedDigits.join(', ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">ความแม่นยำ:</span>
                  <span className="text-emerald-400 font-bold font-mono-tabular">
                    {ds.confidence}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Queued notification */}
      {queuedAlert && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              ส่งแนวทางงวด {analysis?.targetDrawDateThai || upcoming.drawDateThai} พร้อมชุดฟันธง 4 ตัว เข้าสู่ระบบคิวโพสต์ล่วงหน้า 5 วันเรียบร้อยแล้ว!
            </span>
          </div>
          <span className="text-emerald-400 font-bold font-mono-tabular">5-Day Auto Queue</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECONDARY NUMBERS & COMPREHENSIVE SETS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Box 1: เด่น & รอง & วิ่ง/รูด */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>เลขเด่น - รอง ประจำงวด</span>
              </span>
              <span className="text-[11px] text-slate-400">{upcoming.dayOfWeekThai}</span>
            </div>

            <div className="mt-5 flex items-center justify-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-xs text-amber-200/80 mb-1 font-medium">เด่นตัวเดียว</span>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 font-black text-3xl flex items-center justify-center shadow-lg shadow-amber-500/30 font-mono-tabular">
                  {analysis?.highlightMain || stats.hotDigits[0] || '7'}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs text-blue-200/80 mb-1 font-medium">เลขรอง</span>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-slate-950 font-black text-3xl flex items-center justify-center shadow-lg shadow-blue-500/30 font-mono-tabular">
                  {analysis?.highlightSecondary || stats.hotDigits[1] || '4'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-400">
              สายวิ่ง/รูด 19 ประตู:{' '}
              <strong className="text-white font-mono-tabular">
                {runningPair.join(' - ')}
              </strong>
            </span>
          </div>
        </div>

        {/* Box 2: 3 ตัวตรง-โต๊ด */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-4 h-4 text-blue-400" />
            <span>เจาะ 3 ตัวตรง - โต๊ด</span>
          </span>

          <div className="space-y-3 pt-1">
            <div>
              <span className="text-xs text-slate-400">3 ตัวตรงเน้นๆ:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {(analysis?.threeDigitsDirect || [main3D, ...threeConviction.supportingPicks]).map((num) => (
                  <span
                    key={num}
                    className="px-3 py-1 bg-slate-950 border border-slate-800 text-slate-200 font-bold text-sm rounded-lg font-mono-tabular"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400">3 ตัวโต๊ดกันพลาด:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {(analysis?.threeDigitsSwap || threeConviction.permutations6.filter((x) => x !== main3D)).map((num) => (
                  <span
                    key={num}
                    className="px-2.5 py-0.5 bg-slate-950/60 border border-slate-800 text-slate-400 font-medium text-xs rounded font-mono-tabular"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Box 3: 2 ตัวบน - ล่าง */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>เจาะ 2 ตัวบน - ล่าง</span>
          </span>

          <div className="space-y-3 pt-1">
            <div>
              <span className="text-xs text-slate-400">2 ตัวบน:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {topPairsList.map((num) => (
                  <span
                    key={num}
                    className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-sm rounded-lg font-mono-tabular"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400">2 ตัวล่าง:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {bottomPairsList.map((num) => (
                  <span
                    key={num}
                    className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold text-sm rounded-lg font-mono-tabular"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rationale Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <span>บทวิเคราะห์สรุปความแม่นยำจากทั้ง 10 แหล่งข้อมูล</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          {analysis?.rationale || threeConviction.strategyReason}
        </p>
      </div>

      {/* Facebook Post Generator Box (Ready for 5-day Advance Post) */}
      <div className="bg-gradient-to-r from-blue-950/30 via-slate-900 to-slate-900 border border-blue-500/40 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              <span>ข้อความโพสต์ Facebook (เน้น 3 ตัวเต็ง & พอร์ต 15 ชุด Hybrid ล่วงหน้า 5 วัน)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              จัดรูปแบบพร้อมโพสต์ขึ้นแฟนเพจ Facebook เพื่อให้ผู้ติดตามได้เตรียมตัวก่อนหวยออก 5 วัน
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyPost}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกเรียบร้อย' : 'คัดลอกข้อความ'}</span>
            </button>

            <button
              onClick={onGoToBanner}
              className="px-3.5 py-2 text-xs font-medium text-purple-300 hover:text-purple-200 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/80 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>สร้างภาพการ์ดแบนเนอร์ HD</span>
            </button>

            <button
              onClick={handleQueueClick}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>ส่งเข้าคิวโพสต์ล่วงหน้า 5 วัน</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
          {analysis?.facebookPostContent ||
            `🇱🇦 สรุปแนวทางหวยลาวพัฒนา ประจำ${upcoming.drawDateThai} 🇱🇦\n(Dynamic Engine V2: 10 ชุดหลัก + 5 ชุดเกราะกันเบิ้ล จาก ${stats.totalDraws} งวดสถิติ)\n\n👑 【 ฟันธง 3 ตัวเต็ง เม็ดเดียว 】:  🌟 ${main3D} 🌟\n💎 ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด): ${threeConviction.permutations6.join(' - ')}\n\n🛡️ 【 พอร์ต 15 ชุดเต็งตรง (Hybrid กันหลุด + กันเบิ้ล) 】:\n🥇 Tier 1 (เม็ดทองเน้นหนัก): ${portfolio15.tier1Gold.join(' - ')}\n🥈 Tier 2 (เม็ดเงินเต็งรอง): ${portfolio15.tier2Silver.join(' - ')}\n🥉 Tier 3 (แกนเสริม + เกราะกันเบิ้ล): ${portfolio15.tier3Shield.join(' - ')}\n\n⭐ 4 ตัวแจ็กพอตเสริม: ${main4D}\n⭐ เลขเด่น: ${highlightMain}  |  เลขรอง: ${highlightSecondary}  |  วิ่ง/รูด: ${runningPair.join(' - ')}\n\n🎯 เจาะ 2 ตัวบน: ${topPairsList.slice(0, 3).join(' - ')}\n🎯 เจาะ 2 ตัวล่าง: ${bottomPairsList.slice(0, 3).join(' - ')}\n\n🐉 นามสัตว์มงคล: ${animalMain.name} (${animalMain.number}) / ${animalBackup.name} (${animalBackup.number})\n\n📌 สนับสนุนการเสี่ยงโชคอย่างมีสติ ข้อมูลนี้คำนวณตามหลักคณิตศาสตร์สถิติและปัญญาประดิษฐ์\n#หวยลาว #แนวทางหวยลาว #3ตัวเต็ง #15ชุดกันหลุด #หวยพัฒนา #เลขเด็ดหวยลาว #หวยลาววันนี้ #สถิติหวยลาว`}
        </div>
      </div>
    </div>
  );
};
