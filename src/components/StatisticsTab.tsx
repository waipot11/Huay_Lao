import React, { useState } from 'react';
import {
  BarChart3,
  Search,
  Filter,
  Calendar,
  Flame,
  Snowflake,
  TrendingUp,
  Percent,
  BookOpen,
  Hash,
} from 'lucide-react';
import { ComprehensiveStats } from '../utils/lotteryStats';
import { LaoLotteryDraw, HISTORICAL_DRAWS, LAO_ANIMALS } from '../data/laoLotteryHistory';

interface StatisticsTabProps {
  stats: ComprehensiveStats;
  draws?: LaoLotteryDraw[];
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({ stats, draws = HISTORICAL_DRAWS }) => {
  const [subView, setSubView] = useState<'history' | 'frequencies' | 'animals' | 'kamlang'>('history');
  const [dayFilter, setDayFilter] = useState<'all' | 'Monday' | 'Wednesday' | 'Friday'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [animalSearch, setAnimalSearch] = useState('');

  // Filter draws
  const filteredDraws = draws.filter((draw) => {
    if (dayFilter !== 'all' && draw.dayOfWeek !== dayFilter) return false;
    if (searchQuery) {
      const q = searchQuery.trim();
      return (
        draw.fourDigits.includes(q) ||
        draw.sixDigits.includes(q) ||
        draw.twoDigitsTop.includes(q) ||
        draw.twoDigitsBottom.includes(q) ||
        draw.drawDateThai.includes(q) ||
        (draw.animalName && draw.animalName.includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Sub Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>คลังสถิติหวยลาว & ข้อมูลหลายแหล่ง (Multi-Source Statistics)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            รวบรวมผลรางวัลย้อนหลังจริง สถิติความถี่รายตำแหน่ง อัตราส่วนคู่-คี่ สูง-ต่ำ กำลังวัน และตำรานามสัตว์
          </p>
        </div>

        {/* Sub Nav */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
          <button
            onClick={() => setSubView('history')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              subView === 'history'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ผลย้อนหลัง ({draws.length})
          </button>
          <button
            onClick={() => setSubView('frequencies')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              subView === 'frequencies'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ความถี่ตัวเลข 0-9
          </button>
          <button
            onClick={() => setSubView('kamlang')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              subView === 'kamlang'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            กำลังวันมหาทักษา
          </button>
          <button
            onClick={() => setSubView('animals')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              subView === 'animals'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ตำรานามสัตว์ 40 ชนิด
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>เลขเด่นมาแรงสุด</span>
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono-tabular">
            {stats.hotDigits.join('  •  ')}
          </div>
          <div className="text-[11px] text-slate-400">ออกบ่อยสุดในสถิติ 50 งวด</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Snowflake className="w-3.5 h-3.5 text-sky-400" />
            <span>เลขดับ / เลขค้าง</span>
          </div>
          <div className="text-xl font-bold text-sky-400 font-mono-tabular">
            {stats.coldDigits.join('  •  ')}
          </div>
          <div className="text-[11px] text-slate-400">ไม่ออกนานสุดในสถิติ</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span>อัตราส่วนคู่ / คี่</span>
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono-tabular">
            {100 - stats.oddEvenRatio.oddPercent}% : {stats.oddEvenRatio.oddPercent}%
          </div>
          <div className="text-[11px] text-slate-400">คู่ (Even) : คี่ (Odd)</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span>อัตราส่วนสูง / ต่ำ</span>
          </div>
          <div className="text-xl font-bold text-purple-400 font-mono-tabular">
            {stats.highLowRatio.highPercent}% : {100 - stats.highLowRatio.highPercent}%
          </div>
          <div className="text-[11px] text-slate-400">สูง (5-9) : ต่ำ (0-4)</div>
        </div>
      </div>

      {/* Sub View 1: History Table */}
      {subView === 'history' && (
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="ค้นหาเลข 4 ตัว, 2 ตัว, นามสัตว์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setDayFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  dayFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ทุกวัน
              </button>
              <button
                onClick={() => setDayFilter('Monday')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  dayFilter === 'Monday' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                วันจันทร์
              </button>
              <button
                onClick={() => setDayFilter('Wednesday')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  dayFilter === 'Wednesday' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                วันพุธ
              </button>
              <button
                onClick={() => setDayFilter('Friday')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  dayFilter === 'Friday' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                วันศุกร์
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">งวดวันที่</th>
                  <th className="py-3 px-3 font-semibold">วัน</th>
                  <th className="py-3 px-4 font-semibold text-right font-mono">6 ตัวเต็ม</th>
                  <th className="py-3 px-4 font-semibold text-right font-mono text-amber-400">
                    4 ตัวพัฒนา
                  </th>
                  <th className="py-3 px-3 font-semibold text-right font-mono text-blue-400">
                    3 ตัวบน
                  </th>
                  <th className="py-3 px-3 font-semibold text-right font-mono text-emerald-400">
                    2 ตัวบน
                  </th>
                  <th className="py-3 px-3 font-semibold text-right font-mono text-purple-400">
                    2 ตัวล่าง
                  </th>
                  <th className="py-3 px-4 font-semibold">นามสัตว์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                {filteredDraws.map((draw) => (
                  <tr key={draw.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 text-slate-200 whitespace-nowrap">{draw.drawDateThai}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] text-slate-400">{draw.dayOfWeekThai}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400 tabular-nums">
                      {draw.sixDigits}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-300 tabular-nums">
                      {draw.fourDigits}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-blue-300 tabular-nums">
                      {draw.threeDigitsTop}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300 tabular-nums">
                      {draw.twoDigitsTop}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-300 tabular-nums">
                      {draw.twoDigitsBottom}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 whitespace-nowrap">
                      {draw.animalName ? `${draw.animalName} (${draw.animalNumber})` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub View 2: Frequencies Breakdown */}
      {subView === 'frequencies' && (
        <div className="space-y-6">
          {/* Overall 0-9 bar chart representation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-amber-400" />
              <span>ความถี่ตัวเลข 0 - 9 ทั้งหมดในรอบ 50 งวด</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {stats.overallDigitFrequencies.map((item) => (
                <div
                  key={item.digit}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-amber-400 font-mono-tabular">
                      {item.digit}
                    </span>
                    <span className="text-xs text-slate-400 font-mono-tabular">
                      {item.count} ครั้ง ({item.percentage}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, item.percentage * 5)}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>ออกล่าสุด:</span>
                    <span className="font-mono-tabular text-slate-300">
                      {item.lastSeenDrawsAgo === 0 ? 'งวดล่าสุด' : `${item.lastSeenDrawsAgo} งวดก่อน`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Positional Breakdown (หลักพัน, ร้อย, สิบ, หน่วย) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'หลักพัน (ตำแหน่งที่ 1)', data: stats.positionFrequencies.thousands, color: 'text-amber-400' },
              { title: 'หลักร้อย (ตำแหน่งที่ 2)', data: stats.positionFrequencies.hundreds, color: 'text-blue-400' },
              { title: 'หลักสิบ (ตำแหน่งที่ 3)', data: stats.positionFrequencies.tens, color: 'text-emerald-400' },
              { title: 'หลักหน่วย (ตำแหน่งที่ 4)', data: stats.positionFrequencies.units, color: 'text-purple-400' },
            ].map((col, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className={`text-xs font-bold ${col.color}`}>{col.title}</span>
                <div className="space-y-1.5 pt-1">
                  {[...col.data]
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map((item, rank) => (
                      <div
                        key={item.digit}
                        className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0"
                      >
                        <span className="text-slate-300">
                          อันดับ {rank + 1}: <strong className="text-white font-mono">{item.digit}</strong>
                        </span>
                        <span className="text-slate-400 font-mono-tabular">
                          {item.count} ครั้ง ({item.percentage}%)
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub View 3: Kamlang Wan Numerology */}
      {subView === 'kamlang' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>สูตรกำลังวันมหาทักษาโบราณสำหรับหวยลาว (จันทร์, พุธ, ศุกร์)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              ศาสตร์คำนวณกำลังวันตามโหราศาสตร์พยากรณ์ตัวเลข ร่วมกับสถิติผลจริงของหวยลาว
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.values(stats.dayStats).map((d) => (
              <div
                key={d.day}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-sm font-bold text-white">{d.dayThai}</span>
                  <span className="text-xs px-2.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-mono font-bold">
                    กำลังวัน: {d.kamlangWan}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-slate-400">เลขมงคลประจำวัน:</span>
                  <div className="flex gap-2">
                    {d.auspiciousDigits.map((n) => (
                      <span
                        key={n}
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 font-bold text-lg flex items-center justify-center font-mono-tabular"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">สถิติจริง 3 อันดับแรกในงวด{d.dayThai}:</span>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    {d.topDigits.map((td) => (
                      <span key={td.digit} className="font-mono-tabular">
                        เลข <strong className="text-white">{td.digit}</strong> ({td.count} ครั้ง)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub View 4: Nam Sam 40 Animals */}
      {subView === 'animals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>ตำราเลขนามสัตว์ 40 ชนิด (สลากพัฒนา สปป.ลาว)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ตารางอ้างอิงเลขนามสัตว์ 40 ชนิดตามมาตรฐานหวยพัฒนาของรัฐวิสาหกิจหวยพัฒนา สปป.ลาว
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="ค้นหาชื่อสัตว์ หรือเลข..."
                value={animalSearch}
                onChange={(e) => setAnimalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-1">
            {Object.entries(LAO_ANIMALS)
              .filter(([id, data]) => {
                if (!animalSearch) return true;
                const q = animalSearch.trim().toLowerCase();
                return (
                  data.name.toLowerCase().includes(q) ||
                  data.lao.includes(q) ||
                  data.numbers.some((num) => num.includes(q))
                );
              })
              .map(([id, data]) => (
                <div
                  key={id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 hover:border-amber-500/40 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{data.name}</span>
                    <span className="text-[11px] text-amber-400/80 font-mono">{data.lao}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {data.numbers.map((num) => (
                      <span
                        key={num}
                        className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-xs rounded"
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
