import React, { useRef, useEffect, useState } from 'react';
import { Download, Copy, Check, RefreshCw, Sparkles, Share2, Facebook } from 'lucide-react';

interface BannerData {
  drawDateThai: string;
  highlightMain: string;
  highlightSecondary: string;
  twoDigitsTop: string[];
  twoDigitsBottom: string[];
  threeDigitsDirect: string[];
  fourDigitsSet: string[];
  main4D?: string;
  main3D?: string;
  permutations6?: string[];
  wheelingSets?: string[];
  portfolio15Sets?: string[];
  animalPicks: Array<{ name: string; number: string }>;
  pageName: string;
}

interface BannerCardStudioProps {
  bannerData: BannerData;
  onSendToPost?: (dataUrl: string) => void;
}

export const BannerCardStudio: React.FC<BannerCardStudioProps> = ({
  bannerData,
  onSendToPost,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [customWatermark, setCustomWatermark] = useState(bannerData.pageName || 'เพจแนวทางหวยลาว AI มหาเฮง');

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set 1200x630 (standard Facebook OpenGraph / feed landscape post resolution)
    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    const mainConviction3D = bannerData.main3D || bannerData.threeDigitsDirect[0] || '---';
    const mainConviction4D = bannerData.main4D || bannerData.fourDigitsSet[0] || '----';
    const perms6List = bannerData.permutations6 && bannerData.permutations6.length > 0
      ? bannerData.permutations6
      : bannerData.threeDigitsDirect.slice(0, 6);

    // Base background gradient: Deep luxury navy slate with gold accents
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#060B18');
    bgGrad.addColorStop(0.5, '#0B1528');
    bgGrad.addColorStop(1, '#050811');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative geometric border frame
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, width - 56, height - 56);

    // Header badge
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 270, 36, 540, 48, 24);
    ctx.fill();
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Prompt, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🇱🇦 แนวทางหวยลาวพัฒนา (10 แหล่งสถิติ & AI) 🇱🇦', width / 2, 60);

    // Target Draw Date
    ctx.fillStyle = '#FDE68A';
    ctx.font = '600 25px Prompt, sans-serif';
    ctx.fillText(`งวดประจำ${bannerData.drawDateThai}`, width / 2, 116);

    // ===================================================
    // 👑 GRAND 3-DIGIT CONVICTION HERO BOX (ฟันธง 3 ตัวเต็ง)
    // ===================================================
    ctx.fillStyle = 'rgba(217, 119, 6, 0.24)';
    ctx.beginPath();
    ctx.roundRect(80, 148, 1040, 155, 20);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Top Crown Label
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 21px Prompt, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👑 ฟันธง 3 ตัวเต็ง เม็ดเดียว 👑', width / 2, 178);

    // 3 Big Digits in separate gold glowing blocks
    const d3Array = mainConviction3D.split('');
    const boxW = 105;
    const boxH = 74;
    const gap = 24;
    const totalW = 3 * boxW + 2 * gap;
    const startX = width / 2 - totalW / 2;

    d3Array.forEach((d, idx) => {
      const bx = startX + idx * (boxW + gap);
      const by = 196;

      // Box gradient
      const bGrad = ctx.createLinearGradient(bx, by, bx, by + boxH);
      bGrad.addColorStop(0, '#F59E0B');
      bGrad.addColorStop(1, '#D97706');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, boxW, boxH, 16);
      ctx.fill();
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'black 58px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d, bx + boxW / 2, by + boxH / 2 + 2);
    });

    // 6 Permutations row inside hero box
    ctx.fillStyle = '#FEF3C7';
    ctx.font = '600 15px Prompt, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `💎 ชุด 6 กลับ (6 ประตูการันตีตรง-โต๊ด):  ${perms6List.join('   •   ')}`,
      width / 2,
      284
    );

    // Zone 2: เด่น - รอง - วิ่ง/รูด & 4 ตัวแจ็กพอตเสริม
    // Left Box: เด่น - รอง
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(80, 318, 500, 105, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 16px Prompt, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⭐ เด่น - รอง & วิ่ง/รูด:', 105, 345);

    ctx.fillStyle = '#FDE68A';
    ctx.font = 'bold 28px JetBrains Mono, monospace';
    ctx.fillText(`เด่น ${bannerData.highlightMain || '-'}   รอง ${bannerData.highlightSecondary || '-'}`, 105, 385);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '400 14px Prompt, sans-serif';
    ctx.fillText(
      `วิ่ง/รูด 19 ประตู: ${bannerData.highlightMain || '-'} - ${bannerData.highlightSecondary || '-'}  •  ฟันเน้นบน: ${bannerData.twoDigitsTop[0] || '--'} / ล่าง: ${bannerData.twoDigitsBottom[0] || '--'}`,
      105,
      410
    );

    // Right Box: 4 ตัวแจ็กพอตเสริม & 3 ตัวเต็งรอง
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(620, 318, 500, 105, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#C084FC';
    ctx.font = 'bold 16px Prompt, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⭐ 4 ตัวแจ็กพอตเสริม & 3 ตัวเต็งรอง:', 645, 345);

    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 24px JetBrains Mono, monospace';
    ctx.fillText(`แจ็กพอต 4D: ${mainConviction4D}`, 645, 380);

    ctx.fillStyle = '#67E8F9';
    ctx.font = '600 13px Prompt, sans-serif';
    ctx.fillText('🛡️ พอร์ต 15 ชุดเต็งสูตรทองคำกันหลุด (ครอบคลุม 6 ตัววิน 100%)', 645, 408);

    // Zone 3: 2 ตัวบน - ล่าง
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(80, 436, 1040, 95, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 16px Prompt, sans-serif';
    ctx.fillText('🎯 เจาะเน้น 2 ตัวบน - ล่าง:', 105, 462);

    const twoDigits = [
      ...bannerData.twoDigitsTop.slice(0, 4),
      ...bannerData.twoDigitsBottom.slice(0, 4),
    ].slice(0, 8);

    twoDigits.forEach((num, idx) => {
      const x = 105 + idx * 124;
      const y = 476;

      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(x, y, 106, 42, 10);
      ctx.fill();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#FDE68A';
      ctx.font = 'bold 26px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(num, x + 53, y + 26);
    });

    // Zone 3: Footer bar with Watermark & Disclaimer
    ctx.fillStyle = '#475569';
    ctx.font = '400 14px Prompt, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `🐉 นามสัตว์มงคล: ${bannerData.animalPicks.map((a) => `${a.name} (${a.number})`).join(' / ') || 'พญานาค (29) / เสือ (06)'}`,
      80,
      545
    );

    ctx.fillStyle = '#64748B';
    ctx.font = '400 13px Prompt, sans-serif';
    ctx.fillText('⚠️ สูตรคำนวณตามหลักสถิติและความน่าจะเป็น โปรดเสี่ยงโชคอย่างมีสติ', 80, 580);

    // Watermark page name on right
    ctx.fillStyle = '#38BDF8';
    ctx.font = '600 18px Prompt, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`📢 ${customWatermark}`, width - 80, 555);

    ctx.fillStyle = '#64748B';
    ctx.font = '400 13px Prompt, sans-serif';
    ctx.fillText('Auto-Generated by LaoLotto AI • 5-Day Advance Post', width - 80, 582);
  };

  useEffect(() => {
    renderCanvas();
  }, [bannerData, customWatermark]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `lao_lottery_${bannerData.drawDateThai.replace(/\s+/g, '_')}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>เครื่องมือสร้างภาพการ์ดแบนเนอร์ Facebook HD (1200x630)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            สร้างภาพแนวทางหวยลาวระดับ 4K คมชัด สวยงาม พร้อมลายน้ำเพจ สำหรับโพสต์ลง Facebook หรือแชร์ลงกลุ่ม
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={renderCanvas}
            className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>รีเฟรชภาพ</span>
          </button>

          <button
            onClick={handleCopyImage}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'คัดลอกรูปแล้ว!' : 'คัดลอกรูปภาพ'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-lg shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลดภาพ HD (.PNG)</span>
          </button>
        </div>
      </div>

      {/* Watermark & Customization Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 border border-slate-800/80 px-4 py-3 rounded-xl">
        <label className="text-xs text-slate-300 whitespace-nowrap font-medium flex items-center gap-1.5">
          <Facebook className="w-3.5 h-3.5 text-blue-400" />
          <span>ชื่อเพจ / ลายน้ำบนการ์ด:</span>
        </label>
        <input
          type="text"
          value={customWatermark}
          onChange={(e) => setCustomWatermark(e.target.value)}
          placeholder="เช่น เพจแนวทางหวยลาว AI มหาเฮง"
          className="w-full sm:max-w-md px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400"
        />
        <span className="text-[11px] text-slate-400">
          (ภาพจะอัปเดตอัตโนมัติแบบเรียลไทม์)
        </span>
      </div>

      {/* Canvas Viewport */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
        <div className="w-full max-w-4xl aspect-[1200/630] rounded-xl overflow-hidden border border-slate-800/80 shadow-lg">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain block"
          />
        </div>
        <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-2">
          <span>สัดส่วน 1200 × 630 พิกเซล (มาตรฐาน Facebook Feed & OpenGraph Card)</span>
        </div>
      </div>
    </div>
  );
};
