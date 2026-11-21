import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { HISTORICAL_DRAWS, LAO_ANIMALS, LaoLotteryDraw } from '../data/laoLotteryHistory.ts';
import { HANOI_HISTORICAL_DRAWS } from '../data/hanoiLotteryHistory.ts';
import { MALAY_HISTORICAL_DRAWS } from '../data/malayLotteryHistory.ts';
import { LotteryType, LOTTERY_CONFIGS, ALL_LOTTERY_TYPES, DayOfWeekEnglish, LiveSyncStatusInfo } from '../utils/lotteryTypes.ts';
import { computeComprehensiveStats, getUpcomingLaoDraw } from '../utils/lotteryStats.ts';
import { fetchLiveResultsByType } from '../utils/liveResultFetcher.ts';

dotenv.config();

export const isVercelRuntime = Boolean(process.env.VERCEL);
const SEED_DIR = process.cwd();
const RUNTIME_DIR = isVercelRuntime ? os.tmpdir() : SEED_DIR;

export const app = express();
app.use(express.json({ limit: '10mb' }));

function readJsonFile<T>(filename: string): T | null {
  const runtimePath = path.join(RUNTIME_DIR, filename);
  const seedPath = path.join(SEED_DIR, filename);
  for (const candidate of [runtimePath, seedPath]) {
    try {
      if (fs.existsSync(candidate)) {
        return JSON.parse(fs.readFileSync(candidate, 'utf-8')) as T;
      }
    } catch (e) {
      console.error(`Error reading ${candidate}:`, e);
    }
  }
  return null;
}

function writeJsonFile(filename: string, data: unknown) {
  try {
    const targetPath = path.join(RUNTIME_DIR, filename);
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
  }
}

// Lazy-safe Google GenAI client (Server-side only)
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface FacebookConfig {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  autoPostEnabled: boolean;
  daysAhead: number;
  postingTime: string;
  includeImageCard: boolean;
  lastSyncTime?: string;
  status: 'connected' | 'disconnected' | 'testing';
}

export interface ScheduledPost {
  id: string;
  drawDate: string;
  drawDateThai: string;
  scheduledTime: string;
  status: 'scheduled' | 'published' | 'failed' | 'draft';
  content: string;
  aiAnalysisId?: string;
  publishedAt?: string;
  facebookPostId?: string;
  errorLog?: string;
  highlightNumbers: {
    main: string;
    secondary: string;
    twoDigits: string[];
    threeDigits: string[];
    fourDigits: string[];
  };
}

const CONFIG_FILENAME = '.fb_config.json';
const POSTS_FILENAME = '.fb_posts.json';
const CUSTOM_DRAWS_FILENAMES: Record<LotteryType, string> = {
  lao: '.custom_draws.json',
  hanoi: '.custom_draws_hanoi.json',
  malay: '.custom_draws_malay.json',
};

function resolveLotteryType(raw: any): LotteryType {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'hanoi') return 'hanoi';
  if (s === 'malay') return 'malay';
  return 'lao';
}

function getBaseDrawsByType(type: LotteryType): LaoLotteryDraw[] {
  if (type === 'hanoi') return HANOI_HISTORICAL_DRAWS;
  if (type === 'malay') return MALAY_HISTORICAL_DRAWS;
  return HISTORICAL_DRAWS;
}

function loadCustomDrawsByType(type: LotteryType): LaoLotteryDraw[] {
  const parsed = readJsonFile<LaoLotteryDraw[]>(CUSTOM_DRAWS_FILENAMES[type]);
  return Array.isArray(parsed) ? parsed : [];
}

function saveCustomDrawsByType(type: LotteryType, draws: LaoLotteryDraw[]) {
  writeJsonFile(CUSTOM_DRAWS_FILENAMES[type], draws);
}

const customDrawsMap: Record<LotteryType, LaoLotteryDraw[]> = {
  lao: loadCustomDrawsByType('lao'),
  hanoi: loadCustomDrawsByType('hanoi'),
  malay: loadCustomDrawsByType('malay'),
};

function getAllDraws(type: LotteryType = 'lao'): LaoLotteryDraw[] {
  const map = new Map<string, LaoLotteryDraw>();
  for (const d of getBaseDrawsByType(type)) {
    map.set(d.drawDate, d);
  }
  for (const cd of customDrawsMap[type]) {
    map.set(cd.drawDate, cd);
  }
  return Array.from(map.values()).sort((a, b) => b.drawDate.localeCompare(a.drawDate));
}

const LIVE_SOURCE_LABELS: Record<LotteryType, string> = {
  lao: 'Sanook ตรวจหวยลาว',
  hanoi: 'XSKT Miền Bắc Official RSS',
  malay: '4D88 Magnum 4D Live',
};

const liveSyncState: Record<LotteryType, LiveSyncStatusInfo> = {
  lao: {
    lotteryType: 'lao',
    sourceName: LIVE_SOURCE_LABELS.lao,
    lastCheckedAt: null,
    lastSyncedAt: null,
    latestLiveDrawDate: null,
    latestLiveNumbers: null,
    addedCount: 0,
    updatedCount: 0,
    lastResultSummary: null,
    lastError: null,
    isSyncing: false,
  },
  hanoi: {
    lotteryType: 'hanoi',
    sourceName: LIVE_SOURCE_LABELS.hanoi,
    lastCheckedAt: null,
    lastSyncedAt: null,
    latestLiveDrawDate: null,
    latestLiveNumbers: null,
    addedCount: 0,
    updatedCount: 0,
    lastResultSummary: null,
    lastError: null,
    isSyncing: false,
  },
  malay: {
    lotteryType: 'malay',
    sourceName: LIVE_SOURCE_LABELS.malay,
    lastCheckedAt: null,
    lastSyncedAt: null,
    latestLiveDrawDate: null,
    latestLiveNumbers: null,
    addedCount: 0,
    updatedCount: 0,
    lastResultSummary: null,
    lastError: null,
    isSyncing: false,
  },
};

const LIVE_CHECK_COOLDOWN_MS = 180 * 1000;

export async function syncLotteryFromLiveSource(
  type: LotteryType,
  options?: { force?: boolean }
): Promise<{
  ok: boolean;
  addedCount: number;
  updatedCount: number;
  changedDraws: LaoLotteryDraw[];
  latestDraw?: LaoLotteryDraw;
  message: string;
  skippedByCooldown?: boolean;
}> {
  const state = liveSyncState[type];
  const cfg = LOTTERY_CONFIGS[type];

  if (state.isSyncing) {
    return {
      ok: true,
      addedCount: 0,
      updatedCount: 0,
      changedDraws: [],
      message: `กำลังดึงผล${cfg.shortName}อยู่ กรุณารอสักครู่...`,
      skippedByCooldown: true,
    };
  }

  if (!options?.force && state.lastCheckedAt) {
    const elapsed = Date.now() - new Date(state.lastCheckedAt).getTime();
    if (elapsed < LIVE_CHECK_COOLDOWN_MS) {
      return {
        ok: true,
        addedCount: 0,
        updatedCount: 0,
        changedDraws: [],
        message: `ตรวจสอบผล${cfg.shortName}ล่าสุดไปแล้วเมื่อไม่กี่นาทีที่ผ่านมา`,
        skippedByCooldown: true,
      };
    }
  }

  state.isSyncing = true;
  state.lastCheckedAt = new Date().toISOString();

  try {
    const outcome = await fetchLiveResultsByType(type);
    state.sourceName = outcome.sourceName;

    if (!outcome.ok || outcome.fetchedDraws.length === 0) {
      state.lastError = outcome.error || 'ยังไม่มีผลรางวัลงวดใหม่จากแหล่งข้อมูล';
      const fallbackMsg = `${cfg.flag} ${cfg.shortName}: ${state.lastError}`;
      state.lastResultSummary = fallbackMsg;
      return {
        ok: false,
        addedCount: 0,
        updatedCount: 0,
        changedDraws: [],
        message: fallbackMsg,
      };
    }

    const baseMap = new Map<string, LaoLotteryDraw>();
    for (const d of getBaseDrawsByType(type)) baseMap.set(d.drawDate, d);
    const customMap = new Map<string, LaoLotteryDraw>();
    for (const d of customDrawsMap[type]) customMap.set(d.drawDate, d);

    let addedCount = 0;
    let updatedCount = 0;
    const changedDraws: LaoLotteryDraw[] = [];

    for (const liveDraw of outcome.fetchedDraws) {
      const existingCustom = customMap.get(liveDraw.drawDate);
      const existingBase = baseMap.get(liveDraw.drawDate);
      const existing = existingCustom || existingBase;

      if (existingCustom && existingCustom.id.startsWith('manual-') && !existingCustom.isPartial) {
        continue;
      }

      if (!existing) {
        customMap.set(liveDraw.drawDate, liveDraw);
        addedCount += 1;
        changedDraws.push(liveDraw);
      } else {
        const wasPartial = Boolean(existing.isPartial);
        const numbersDiffer =
          existing.sixDigits !== liveDraw.sixDigits ||
          existing.threeDigitsTop !== liveDraw.threeDigitsTop ||
          existing.twoDigitsBottom !== liveDraw.twoDigitsBottom;
        const replacesBaseSeed = !existingCustom && numbersDiffer;

        if ((wasPartial || replacesBaseSeed || (existingCustom && numbersDiffer)) && !liveDraw.isPartial) {
          customMap.set(liveDraw.drawDate, liveDraw);
          updatedCount += 1;
          changedDraws.push(liveDraw);
        }
      }
    }

    if (addedCount > 0 || updatedCount > 0) {
      customDrawsMap[type] = Array.from(customMap.values()).sort((a, b) =>
        b.drawDate.localeCompare(a.drawDate)
      );
      saveCustomDrawsByType(type, customDrawsMap[type]);
      console.log(
        `[LiveSync] ${cfg.shortName}: added=${addedCount}, updated=${updatedCount} (latest=${outcome.fetchedDraws[0].drawDate} ${outcome.fetchedDraws[0].threeDigitsTop}-${outcome.fetchedDraws[0].twoDigitsBottom})`
      );
    }

    const latest = outcome.fetchedDraws[0];
    state.lastSyncedAt = new Date().toISOString();
    state.latestLiveDrawDate = latest.drawDate;
    state.latestLiveNumbers = `${latest.sixDigits} (บน ${latest.threeDigitsTop} / ล่าง ${latest.twoDigitsBottom})`;
    state.addedCount = addedCount;
    state.updatedCount = updatedCount;
    state.lastError = null;

    const msg =
      addedCount > 0 || updatedCount > 0
        ? `${cfg.flag} ดึงผลจริง${cfg.shortName}สำเร็จ! เพิ่มใหม่ ${addedCount} งวด, อัปเดตสมบูรณ์ ${updatedCount} งวด (ล่าสุด ${latest.drawDateThai}: บน ${latest.threeDigitsTop} ล่าง ${latest.twoDigitsBottom})`
        : `${cfg.flag} ผล${cfg.shortName}เป็นปัจจุบันแล้ว (ล่าสุด ${latest.drawDateThai}: บน ${latest.threeDigitsTop} ล่าง ${latest.twoDigitsBottom})`;

    state.lastResultSummary = msg;
    return {
      ok: true,
      addedCount,
      updatedCount,
      changedDraws,
      latestDraw: latest,
      message: msg,
    };
  } catch (err: any) {
    const errMsg: string = err?.message || 'เกิดข้อผิดพลาดในการดึงผลจริง';
    state.lastError = errMsg;
    state.lastResultSummary = errMsg;
    return {
      ok: false,
      addedCount: 0,
      updatedCount: 0,
      changedDraws: [],
      message: errMsg,
    };
  } finally {
    state.isSyncing = false;
  }
}

export async function syncAllLotteriesFromLive(options?: { force?: boolean }) {
  return Promise.all(ALL_LOTTERY_TYPES.map((lt) => syncLotteryFromLiveSource(lt, options)));
}

function getBangkokDateParts() {
  const bkk = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return {
    todayIso: bkk.toISOString().slice(0, 10),
    dayOfWeek: bkk.getUTCDay(),
    totalMin: bkk.getUTCHours() * 60 + bkk.getUTCMinutes(),
  };
}

export async function runPostDrawLiveSyncCheck() {
  const { todayIso, dayOfWeek, totalMin } = getBangkokDateParts();
  for (const lt of ALL_LOTTERY_TYPES) {
    const cfg = LOTTERY_CONFIGS[lt];
    if (!cfg.drawDays.includes(dayOfWeek)) continue;

    const startMin = lt === 'lao' ? 20 * 60 + 32 : lt === 'malay' ? 19 * 60 : 18 * 60 + 32;
    const endMin = lt === 'lao' ? 23 * 60 + 30 : 22 * 60 + 30;
    if (totalMin < startMin || totalMin > endMin) continue;

    const latest = getAllDraws(lt)[0];
    const needsTodayUpdate = !latest || latest.drawDate < todayIso || Boolean(latest.isPartial);
    if (needsTodayUpdate) {
      await syncLotteryFromLiveSource(lt);
    }
  }
}

function loadConfig(): FacebookConfig {
  const parsed = readJsonFile<FacebookConfig>(CONFIG_FILENAME);
  if (parsed) return parsed;
  return {
    pageId: '',
    pageName: 'เพจแนวทางหวยลาว AI มหาเฮง',
    pageAccessToken: '',
    autoPostEnabled: true,
    daysAhead: 5,
    postingTime: '09:30',
    includeImageCard: true,
    status: 'disconnected',
  };
}

function saveConfig(cfg: FacebookConfig) {
  writeJsonFile(CONFIG_FILENAME, cfg);
}

function loadPosts(): ScheduledPost[] {
  let existing = readJsonFile<ScheduledPost[]>(POSTS_FILENAME);
  if (!Array.isArray(existing)) existing = [];

  const draws = getAllDraws();
  const upcoming = getUpcomingLaoDraw(new Date(), 5, draws);
  const stats = computeComprehensiveStats(draws);
  const conv3D = stats.threeDigitConviction;
  const conv4D = stats.fourDigitConviction;
  const single19 = stats.singleDigit19Door;
  const mainD = single19.primaryPick.digit;
  const secD = single19.backupPick.digit;
  const top2List = conv3D.derivedTwoDigits.topList || [conv3D.derivedTwoDigits.top];
  const bot2List = conv3D.derivedTwoDigits.bottomList || [conv3D.derivedTwoDigits.bottom];

  const hasUpcoming = existing.some((p) => p.drawDate === upcoming.drawDate);
  if (!hasUpcoming) {
    existing.unshift({
      id: `post-${upcoming.drawDate}`,
      drawDate: upcoming.drawDate,
      drawDateThai: upcoming.drawDateThai,
      scheduledTime: `${upcoming.postScheduledDate}T09:30:00`,
      status: 'scheduled',
      content: `🇱🇦 สรุปแนวทางหวยลาวพัฒนา ประจำ${upcoming.drawDateThai} 🇱🇦\n(Engine V4 รูด 1 ตัว 19 ประตู บน+ล่าง • กรอง Backtest ${single19.testedDraws} งวดจริงเข้า ${single19.hitRatePercent}% เกินมาตรฐาน ${single19.standardTargetRate}%)\n\n🔥 【 ตัวเดียวเน้นๆ รูด 1 ตัว 19 ประตู บน+ล่าง 】:  ⭐ ${mainD} ⭐  (ค้าง 4 ตำแหน่ง ${single19.primaryPick.dueGap4Pos} งวด • คะแนน ${single19.primaryPick.score}/100)\n🛡️ ตัวกันรอง: ${secD} (ค้าง ${single19.backupPick.dueGap4Pos} งวด)\n\n🎯 เจาะ 2 ตัวบน (5 ชุดคัดพิเศษ): ${top2List.slice(0, 5).join(' - ')}\n🎯 เจาะ 2 ตัวล่าง: ${bot2List.slice(0, 4).join(' - ')}\n\n👑 【 ฟันธง 3 ตัวเต็ง เม็ดเดียว 】:  🌟 ${conv3D.mainPick} 🌟\n💎 ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด): ${conv3D.permutations6.join(' - ')}\n\n🛡️ 【 พอร์ต 15 ชุด V3 (13 ชุดหลัก + 2 เกราะกันเบิ้ล) 】:\n🥇 Tier 1 (เม็ดทอง): ${conv3D.fifteenSetsPortfolio.tier1Gold.join(' - ')}\n🥈 Tier 2 (เม็ดเงิน): ${conv3D.fifteenSetsPortfolio.tier2Silver.join(' - ')}\n🥉 Tier 3 (หลักเสริม + กันเบิ้ล): ${conv3D.fifteenSetsPortfolio.tier3Shield.join(' - ')}\n\n⭐ 4 ตัวแจ็กพอตเสริม: ${conv3D.fourDigitJackpot}\n🐉 นามสัตว์มงคล: ${conv3D.animalLink.name} (${conv3D.animalLink.number}) / ${conv3D.animalBackup.name} (${conv3D.animalBackup.number})\n\n📌 ข้อมูลคำนวณตามหลักสถิติย้อนหลัง โปรดเสี่ยงโชคอย่างมีสติ\n#หวยลาว #รูด19ประตู #แนวทางหวยลาว #2ตัวบน #15ชุดกันหลุด #หวยพัฒนา #สถิติหวยลาว`,
      highlightNumbers: {
        main: mainD,
        secondary: secD,
        twoDigits: [...top2List.slice(0, 3), ...bot2List.slice(0, 3)],
        threeDigits: [conv3D.mainPick, ...conv3D.supportingPicks],
        fourDigits: [conv3D.fourDigitJackpot, ...conv4D.supportingPicks],
      },
    });
  }

  return existing;
}

function savePosts(posts: ScheduledPost[]) {
  writeJsonFile(POSTS_FILENAME, posts);
}

export let fbConfig = loadConfig();
export let scheduledPosts = loadPosts();

export async function runFacebookAutoPostCheck() {
  if (!fbConfig.autoPostEnabled) return;
  const now = new Date();

  for (const post of scheduledPosts) {
    if (post.status === 'scheduled') {
      const scheduledDate = new Date(post.scheduledTime);
      if (scheduledDate <= now) {
        console.log(`[AutoScheduler] Executing scheduled post for draw ${post.drawDate}...`);
        if (fbConfig.pageId && fbConfig.pageAccessToken && fbConfig.pageAccessToken.length > 20) {
          try {
            const graphUrl = `https://graph.facebook.com/v19.0/${fbConfig.pageId}/feed`;
            const response = await fetch(graphUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: post.content,
                access_token: fbConfig.pageAccessToken,
              }),
            });
            const data = await response.json();
            if (data.id) {
              post.status = 'published';
              post.publishedAt = new Date().toISOString();
              post.facebookPostId = data.id;
            } else {
              post.status = 'failed';
              post.errorLog = data.error?.message || 'Unknown error';
            }
          } catch (e: any) {
            post.status = 'failed';
            post.errorLog = e.message;
          }
        } else {
          post.status = 'published';
          post.publishedAt = new Date().toISOString();
          post.facebookPostId = `sim_${Date.now()}`;
        }
        savePosts(scheduledPosts);
      }
    }
  }
}

function computeTargetAlertTime(hoursAhead: number, customAlertTime?: string): { hour: number; minute: number; label: string } {
  if (customAlertTime && /^\d{1,2}:\d{2}$/.test(customAlertTime.trim())) {
    const [hStr, mStr] = customAlertTime.trim().split(':');
    const hour = Math.min(23, Math.max(0, parseInt(hStr, 10)));
    const minute = Math.min(59, Math.max(0, parseInt(mStr, 10)));
    return {
      hour,
      minute,
      label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} น.`,
    };
  }
  const hour = Math.max(0, 20 - (hoursAhead || 2));
  return {
    hour,
    minute: 30,
    label: `${String(hour).padStart(2, '0')}:30 น.`,
  };
}

// ==========================================
// API Endpoints
// ==========================================

app.get('/api/history', (req: Request, res: Response) => {
  const lotteryType = resolveLotteryType(req.query.type);
  const allDraws = getAllDraws(lotteryType);
  res.json({
    success: true,
    lotteryType,
    config: LOTTERY_CONFIGS[lotteryType],
    draws: allDraws,
    data: allDraws,
    animals: lotteryType === 'lao' ? LAO_ANIMALS : {},
    syncStatus: liveSyncState[lotteryType],
  });
});

app.post('/api/history/add', (req: Request, res: Response) => {
  const { lotteryType: rawType, drawDate, threeDigitsTop, twoDigitsBottom, fourDigits, sixDigits, animalName } = req.body || {};
  const lotteryType = resolveLotteryType(rawType);
  const cfg = LOTTERY_CONFIGS[lotteryType];

  if (!drawDate || !threeDigitsTop || !/^\d{3}$/.test(String(threeDigitsTop).trim())) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุวันที่ออกรางวัล (YYYY-MM-DD) และเลขท้าย 3 ตัวให้ถูกต้อง (3 หลัก)',
    });
  }

  const t3 = String(threeDigitsTop).trim();
  const clean4 = fourDigits ? String(fourDigits).trim() : '';
  const cleanFull = sixDigits ? String(sixDigits).trim() : '';
  const f4 = /^\d{4}$/.test(clean4)
    ? clean4
    : /^\d{4,6}$/.test(cleanFull)
    ? cleanFull.slice(-4)
    : `-${t3}`;
  const s6 = /^\d{4,6}$/.test(cleanFull)
    ? cleanFull
    : /^\d{4}$/.test(f4)
    ? f4
    : `---${t3}`;
  const b2 =
    twoDigitsBottom && /^\d{2}$/.test(String(twoDigitsBottom).trim())
      ? String(twoDigitsBottom).trim()
      : /^\d{4}$/.test(f4)
      ? f4.slice(0, 2)
      : '--';
  const top2 = t3.slice(-2);

  const [y, m, d] = String(drawDate).split('-').map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const dayNum = dt.getUTCDay();
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  const weekdayMap: Record<number, { dayOfWeek: DayOfWeekEnglish; dayOfWeekThai: string; shortDay: string }> = {
    0: { dayOfWeek: 'Sunday', dayOfWeekThai: 'วันอาทิตย์', shortDay: 'อาทิตย์' },
    1: { dayOfWeek: 'Monday', dayOfWeekThai: 'วันจันทร์', shortDay: 'จันทร์' },
    2: { dayOfWeek: 'Tuesday', dayOfWeekThai: 'วันอังคาร', shortDay: 'อังคาร' },
    3: { dayOfWeek: 'Wednesday', dayOfWeekThai: 'วันพุธ', shortDay: 'พุธ' },
    4: { dayOfWeek: 'Thursday', dayOfWeekThai: 'วันพฤหัสบดี', shortDay: 'พฤหัสบดี' },
    5: { dayOfWeek: 'Friday', dayOfWeekThai: 'วันศุกร์', shortDay: 'ศุกร์' },
    6: { dayOfWeek: 'Saturday', dayOfWeekThai: 'วันเสาร์', shortDay: 'เสาร์' },
  };
  const { dayOfWeek, dayOfWeekThai, shortDay } = weekdayMap[dayNum] || weekdayMap[3];

  const drawDateThai = `${shortDay} ${d} ${thaiMonths[(m || 1) - 1]} ${y + 543}`;
  const isPartial = !/^\d{4}$/.test(f4) || !/^\d{2}$/.test(b2);

  let resolvedAnimalName = cfg.hasAnimals && animalName ? String(animalName).trim() : '';
  if (cfg.hasAnimals && !resolvedAnimalName) {
    for (const [, a] of Object.entries(LAO_ANIMALS)) {
      if (a.numbers.includes(top2)) {
        resolvedAnimalName = a.name;
        break;
      }
    }
  }

  const newDraw: LaoLotteryDraw = {
    id: `manual-${lotteryType}-${drawDate}`,
    drawDate: String(drawDate),
    drawDateThai,
    dayOfWeek,
    dayOfWeekThai,
    sixDigits: s6,
    fourDigits: f4,
    threeDigitsTop: t3,
    twoDigitsTop: top2,
    twoDigitsBottom: b2,
    animalName: cfg.hasAnimals ? resolvedAnimalName || undefined : undefined,
    animalNumber: cfg.hasAnimals ? top2 : undefined,
    isPartial,
  };

  customDrawsMap[lotteryType] = [
    newDraw,
    ...customDrawsMap[lotteryType].filter((x) => x.drawDate !== newDraw.drawDate),
  ];
  saveCustomDrawsByType(lotteryType, customDrawsMap[lotteryType]);

  const allDraws = getAllDraws(lotteryType);
  const stats = computeComprehensiveStats(allDraws, new Date(), lotteryType);
  const upcoming = getUpcomingLaoDraw(new Date(), cfg.defaultDaysAheadPost, allDraws, lotteryType);

  res.json({
    success: true,
    lotteryType,
    message: `บันทึกผล${cfg.shortName} งวด ${drawDateThai} (${t3}) และคำนวณแนวทางงวด ${upcoming.drawDateThai} ใหม่เรียบร้อยแล้ว!`,
    draws: allDraws,
    stats,
    upcoming,
    syncStatus: liveSyncState[lotteryType],
  });
});

app.post('/api/history/sync-live', async (req: Request, res: Response) => {
  const rawType = req.body?.lotteryType || req.query.type;
  const syncAll = req.body?.all === true || req.query.all === 'true';
  const lotteryType = resolveLotteryType(rawType);
  const cfg = LOTTERY_CONFIGS[lotteryType];

  if (syncAll) {
    const outcomes = await syncAllLotteriesFromLive({ force: true });
    const draws = getAllDraws(lotteryType);
    const stats = computeComprehensiveStats(draws, new Date(), lotteryType);
    const upcoming = getUpcomingLaoDraw(new Date(), cfg.defaultDaysAheadPost, draws, lotteryType);
    return res.json({
      success: outcomes.some((o) => o.ok),
      lotteryType,
      outcomes,
      message: outcomes.map((o) => o.message).join(' | '),
      draws,
      stats,
      upcoming,
      syncStatus: liveSyncState[lotteryType],
      allSyncStatus: liveSyncState,
    });
  }

  const outcome = await syncLotteryFromLiveSource(lotteryType, { force: true });
  const draws = getAllDraws(lotteryType);
  const stats = computeComprehensiveStats(draws, new Date(), lotteryType);
  const upcoming = getUpcomingLaoDraw(new Date(), cfg.defaultDaysAheadPost, draws, lotteryType);

  res.json({
    success: outcome.ok,
    lotteryType,
    addedCount: outcome.addedCount,
    updatedCount: outcome.updatedCount,
    message: outcome.message,
    draws,
    stats,
    upcoming,
    syncStatus: liveSyncState[lotteryType],
  });
});

app.get('/api/stats', async (req: Request, res: Response) => {
  const lotteryType = resolveLotteryType(req.query.type);
  const cfg = LOTTERY_CONFIGS[lotteryType];

  const lastCheck = liveSyncState[lotteryType].lastCheckedAt;
  if (!lastCheck || Date.now() - new Date(lastCheck).getTime() > 5 * 60 * 1000) {
    if (isVercelRuntime) {
      await Promise.race([
        syncLotteryFromLiveSource(lotteryType),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } else {
      void syncLotteryFromLiveSource(lotteryType);
    }
  }

  const draws = getAllDraws(lotteryType);
  const stats = computeComprehensiveStats(draws, new Date(), lotteryType);
  const upcoming = getUpcomingLaoDraw(new Date(), cfg.defaultDaysAheadPost, draws, lotteryType);
  res.json({
    success: true,
    lotteryType,
    config: cfg,
    stats,
    upcoming,
    syncStatus: liveSyncState[lotteryType],
  });
});

app.post('/api/ai/analyze', async (req: Request, res: Response) => {
  const { targetDate, customWeights, focusDay, lotteryType: rawType } = req.body || {};
  const lotteryType = resolveLotteryType(rawType || req.query.type);
  const cfg = LOTTERY_CONFIGS[lotteryType];
  const draws = getAllDraws(lotteryType);
  const stats = computeComprehensiveStats(draws, new Date(), lotteryType);
  const upcoming = getUpcomingLaoDraw(new Date(), cfg.defaultDaysAheadPost, draws, lotteryType);
  const defaultConv3D = stats.threeDigitConviction;
  const defaultConv4D = stats.fourDigitConviction;
  const single19 = stats.singleDigit19Door;
  const mainD = single19.primaryPick.digit;
  const secD = single19.backupPick.digit;
  const thirdD = String(stats.recommendedRunDigits?.[2] ?? stats.hotDigits[2] ?? defaultConv3D.mainPick[2]);

  const buildV3FbPost = (
    dateLabel: string,
    pick3: string,
    perms: string[],
    jackpot4: string,
    top2: string[],
    bot2: string[],
    d1: string,
    d2: string
  ) => {
    const shieldList = defaultConv3D.doubleShieldSets || [];
    const animalLine = cfg.hasAnimals
      ? `\n🐉 นามสัตว์มงคล: ${defaultConv3D.animalLink.name} (${defaultConv3D.animalLink.number}) / ${defaultConv3D.animalBackup.name} (${defaultConv3D.animalBackup.number})`
      : '';
    return `${cfg.flag} สรุปแนวทาง${cfg.name} ประจำ${dateLabel} ${cfg.flag}\n(Engine V4 รูด 1 ตัว 19 ประตู บน+ล่าง • Backtest ${single19.testedDraws} งวดจริงเข้า ${single19.hitRatePercent}% เกินมาตรฐาน ${single19.standardTargetRate}%)\n\n🔥 【 ตัวเดียวเน้นๆ รูด 1 ตัว 19 ประตู บน+ล่าง 】:  ⭐ ${d1} ⭐  (ค้าง 4 ตำแหน่ง ${single19.primaryPick.dueGap4Pos} งวด • คะแนน ${single19.primaryPick.score}/100)\n🛡️ ตัวกันรอง: ${d2} (ค้าง ${single19.backupPick.dueGap4Pos} งวด)\n\n🎯 เจาะ 2 ตัวบน (5 ชุดคัดพิเศษ): ${top2.slice(0, 5).join(' - ')}\n🎯 เจาะ 2 ตัวล่าง: ${bot2.slice(0, 4).join(' - ')}\n\n👑 【 ฟันธง 3 ตัวเต็ง เม็ดเดียว 】:  🌟 ${pick3} 🌟\n💎 ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด): ${perms.join(' - ')}\n\n🛡️ 【 พอร์ต 15 ชุด V3 (13 ชุดหลัก + ${shieldList.length} เกราะกันเบิ้ล) 】:\n🥇 Tier 1 (เม็ดทอง): ${defaultConv3D.fifteenSetsPortfolio.tier1Gold.join(' - ')}\n🥈 Tier 2 (เม็ดเงิน): ${defaultConv3D.fifteenSetsPortfolio.tier2Silver.join(' - ')}\n🥉 Tier 3 (หลักเสริม + กันเบิ้ล): ${defaultConv3D.fifteenSetsPortfolio.tier3Shield.join(' - ')}\n\n⭐ ${cfg.fourDigitsLabel} แจ็กพอตเสริม: ${jackpot4}${animalLine}\n\n📌 สนับสนุนการเสี่ยงโชคอย่างมีสติ ข้อมูลนี้คำนวณตามหลักคณิตศาสตร์สถิติและความน่าจะเป็น\n${cfg.hashtags}`;
  };

  try {
    const ai = getGenAIClient();
    if (!ai) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const drawDateThai = targetDate || upcoming.drawDateThai;
    const day = focusDay || upcoming.dayOfWeekThai;
    const latestDraw = draws[0];

    const systemPrompt = `คุณคือผู้เชี่ยวชาญด้านคณิตศาสตร์สถิติและการวิเคราะห์ตัวเลขสำหรับ "${cfg.name}" (Engine V4 รูด 1 ตัว 19 ประตู บน+ล่าง + Engine V3 2ตัว/3ตัว)
ผลรางวัลล่าสุด: ${latestDraw.drawDateThai} ออก 3 ตัวท้าย "${latestDraw.threeDigitsTop}" (2 ตัวบน ${latestDraw.twoDigitsTop}, 2 ตัวล่าง ${latestDraw.twoDigitsBottom}${cfg.hasAnimals ? `, สัตว์ ${latestDraw.animalName || '-'}` : ''})
ผล Walk-Forward Backtest ย้อนหลัง ${single19.testedDraws} งวดจริง (รูด 1 ตัว 19 ประตู บน+ล่าง): เข้า ${single19.hitDraws}/${single19.testedDraws} งวด (${single19.hitRatePercent}% เกินมาตรฐาน ${single19.standardTargetRate}%, 2 เด้ง ${single19.doubleHitDraws} ครั้ง, ROI ${single19.simulatedRoiPercent}%)

ข้อมูลจากเครื่องยนต์ V4 สำหรับงวดเป้าหมาย ${drawDateThai} (${day}):
1. ตัวเดียวเน้นๆ รูด 1 ตัว 19 ประตู บน+ล่าง (4-Position Due-Gap + Cold10): เด่นสุด "${mainD}" (ค้าง 4 ตำแหน่ง ${single19.primaryPick.dueGap4Pos} งวด, คะแนน ${single19.primaryPick.score}) | กันรอง "${secD}"
2. สถิติเฉพาะ${day}: เด่นประจำวัน ${stats.dayStats[upcoming.dayOfWeek]?.topDigits.map((t) => t.digit).join(', ') || 'รอสถิติเพิ่มเติม'}
3. เลขล่าสุด 3 งวด (Flow): ${stats.flowDigits.join(', ')}
4. ชุดหลักจาก V3 Matrix (ยังเก็บไว้ปกติ):
   - 3 ตัวเต็งแนะนำ: ${defaultConv3D.mainPick}
   - ชุด 6 กลับ: ${defaultConv3D.permutations6.join(', ')}
   - พอร์ต 15 ชุด V3: ${defaultConv3D.wheeling15Sets.join(', ')}
   - 2 ตัวบนเด่น (00-99 Matrix): ${defaultConv3D.derivedTwoDigits.topList.join(', ')}
   - 2 ตัวล่างเด่น: ${defaultConv3D.derivedTwoDigits.bottomList.join(', ')}

ส่งผลลัพธ์เป็น JSON ตามโครงสร้างนี้ (ห้ามเปลี่ยนตัวเลขรูดหลัก "${mainD}" ที่ผ่าน Backtest 35 งวดเด็ดขาด):
{
  "highlightMain": "${mainD}",
  "highlightSecondary": "${secD}",
  "runningDigits": ["${mainD}", "${secD}", "${thirdD}"],
  "threeDigitConviction": {
    "mainPick": "${defaultConv3D.mainPick}",
    "confidenceScore": ${defaultConv3D.confidenceScore},
    "positionBreakdown": ${JSON.stringify(defaultConv3D.positionBreakdown)},
    "supportingPicks": ${JSON.stringify(defaultConv3D.supportingPicks)},
    "permutations6": ${JSON.stringify(defaultConv3D.permutations6)},
    "wheeling4Digits": ${JSON.stringify(defaultConv3D.wheeling4Digits)},
    "wheeling4Sets": ${JSON.stringify(defaultConv3D.wheeling4Sets)},
    "wheeling5Digits": ${JSON.stringify(defaultConv3D.wheeling5Digits)},
    "wheeling5Sets": ${JSON.stringify(defaultConv3D.wheeling5Sets)},
    "derivedTwoDigits": {
      "top": "${defaultConv3D.derivedTwoDigits.top}",
      "bottom": "${defaultConv3D.derivedTwoDigits.bottom}"
    },
    "fourDigitJackpot": "${defaultConv3D.fourDigitJackpot}",
    "totalSum": ${defaultConv3D.totalSum},
    "animalLink": { "name": "${defaultConv3D.animalLink.name}", "number": "${defaultConv3D.animalLink.number}" },
    "strategyReason": "คำอธิบายกลยุทธ์ V3 Mean-Reversion + Due-Gap สำหรับ ${cfg.name}"
  },
  "fourDigitsSet": ${JSON.stringify([defaultConv3D.fourDigitJackpot, ...defaultConv4D.supportingPicks])},
  "threeDigitsDirect": ${JSON.stringify([defaultConv3D.mainPick, ...defaultConv3D.supportingPicks])},
  "threeDigitsSwap": ${JSON.stringify(defaultConv3D.permutations6.filter((x) => x !== defaultConv3D.mainPick))},
  "twoDigitsTop": ${JSON.stringify(defaultConv3D.derivedTwoDigits.topList)},
  "twoDigitsBottom": ${JSON.stringify(defaultConv3D.derivedTwoDigits.bottomList)},
  "animalPicks": [
    { "name": "${defaultConv3D.animalLink.name}", "number": "${defaultConv3D.animalLink.number}", "reason": "สอดคล้อง 2 ตัวบน V3" },
    { "name": "${defaultConv3D.animalBackup.name}", "number": "${defaultConv3D.animalBackup.number}", "reason": "สอดคล้อง 2 ตัวล่าง V3" }
  ],
  "confidenceScore": ${defaultConv3D.confidenceScore},
  "rationale": "คำอธิบายกลยุทธ์ Mean-Reversion & Due-Gap สำหรับ${cfg.name} งวด ${drawDateThai}",
  "facebookPostContent": "ข้อความโพสต์ Facebook เต็มรูปแบบสำหรับ ${cfg.name} ที่เน้น วิ่ง/รูด ${mainD}-${secD}, 2 ตัวบน 5 ชุด, และพอร์ต 15 ชุด V3"
}`;

    const userPrompt = `กรุณาสรุปวิเคราะห์ตัวเลข${cfg.name} Engine V3 สำหรับงวด ${drawDateThai} (${day}) หลังผลงวดล่าสุด ${latestDraw.drawDateThai} ออก ${latestDraw.threeDigitsTop} โดยเน้นวิ่ง/รูด ${mainD}-${secD} และ 2 ตัวบน 5 ชุด พร้อมข้อความโพสต์ Facebook`;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini request timeout (8s)')), 8000)
    );

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      }),
      timeoutPromise,
    ]);

    const text = response.text || '{}';
    let parsedData: any;
    try {
      parsedData = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(clean);
    }

    const conv3D = parsedData.threeDigitConviction || defaultConv3D;
    const main3D = conv3D.mainPick || defaultConv3D.mainPick;
    const top2List = parsedData.twoDigitsTop || defaultConv3D.derivedTwoDigits.topList;
    const bot2List = parsedData.twoDigitsBottom || defaultConv3D.derivedTwoDigits.bottomList;

    const result = {
      lotteryType,
      targetDrawDate: upcoming.drawDate,
      targetDrawDateThai: drawDateThai,
      dayOfWeekThai: day,
      highlightMain: mainD,
      highlightSecondary: secD,
      runningDigits: [mainD, secD, thirdD],
      threeDigitConviction: {
        ...defaultConv3D,
        mainPick: main3D,
        confidenceScore: conv3D.confidenceScore || defaultConv3D.confidenceScore,
        positionBreakdown: conv3D.positionBreakdown || defaultConv3D.positionBreakdown,
        supportingPicks: conv3D.supportingPicks || defaultConv3D.supportingPicks,
        permutations6: conv3D.permutations6 || defaultConv3D.permutations6,
        wheeling4Digits: conv3D.wheeling4Digits || defaultConv3D.wheeling4Digits,
        wheeling4Sets: conv3D.wheeling4Sets || defaultConv3D.wheeling4Sets,
        wheeling5Digits: conv3D.wheeling5Digits || defaultConv3D.wheeling5Digits,
        wheeling5Sets: conv3D.wheeling5Sets || defaultConv3D.wheeling5Sets,
        derivedTwoDigits: conv3D.derivedTwoDigits || defaultConv3D.derivedTwoDigits,
        fourDigitJackpot: conv3D.fourDigitJackpot || defaultConv3D.fourDigitJackpot,
        totalSum: conv3D.totalSum || defaultConv3D.totalSum,
        animalLink: conv3D.animalLink || defaultConv3D.animalLink,
        strategyReason: conv3D.strategyReason || defaultConv3D.strategyReason,
      },
      fourDigitConviction: defaultConv4D,
      fourDigitsSet: parsedData.fourDigitsSet || [defaultConv3D.fourDigitJackpot, ...defaultConv4D.supportingPicks],
      threeDigitsDirect: parsedData.threeDigitsDirect || [main3D, ...defaultConv3D.supportingPicks],
      threeDigitsSwap: parsedData.threeDigitsSwap || defaultConv3D.permutations6.filter((x: string) => x !== main3D),
      twoDigitsTop: top2List,
      twoDigitsBottom: bot2List,
      animalPicks: cfg.hasAnimals
        ? parsedData.animalPicks || [
            { name: defaultConv3D.animalLink.name, number: defaultConv3D.animalLink.number, reason: `สอดคล้อง 2 ตัวบนเด่น ${defaultConv3D.derivedTwoDigits.top}` },
            { name: defaultConv3D.animalBackup.name, number: defaultConv3D.animalBackup.number, reason: `สอดคล้อง 2 ตัวล่างกำลัง${day}` },
          ]
        : [],
      confidenceScore: parsedData.confidenceScore || defaultConv3D.confidenceScore,
      rationale: parsedData.rationale || defaultConv3D.strategyReason,
      sourceBreakdown: customWeights || {
        historical: 15,
        dayOfWeek: 12,
        kamlangWan: 12,
        animal: cfg.hasAnimals ? 10 : 0,
        flowMomentum: 12,
        killNumbers: 5,
        crossPosition: 12,
        sumRange: 8,
        expertConsensus: 7,
        aiDeep: 12,
      },
      facebookPostContent:
        parsedData.facebookPostContent ||
        buildV3FbPost(
          drawDateThai,
          main3D,
          conv3D.permutations6 || defaultConv3D.permutations6,
          conv3D.fourDigitJackpot || defaultConv3D.fourDigitJackpot,
          top2List,
          bot2List,
          mainD,
          secD
        ),
      generatedAt: new Date().toISOString(),
    };

    res.json({ success: true, result });
  } catch (err: any) {
    console.warn(`AI API temporarily unavailable for ${lotteryType}, using V3/V4 conviction engine:`, err?.message || err);
    const main3D = defaultConv3D.mainPick;
    const top2List = defaultConv3D.derivedTwoDigits.topList;
    const bot2List = defaultConv3D.derivedTwoDigits.bottomList;

    const fallbackResult = {
      lotteryType,
      targetDrawDate: upcoming.drawDate,
      targetDrawDateThai: upcoming.drawDateThai,
      dayOfWeekThai: upcoming.dayOfWeekThai,
      highlightMain: mainD,
      highlightSecondary: secD,
      runningDigits: [mainD, secD, thirdD],
      threeDigitConviction: defaultConv3D,
      fourDigitConviction: defaultConv4D,
      fourDigitsSet: [defaultConv3D.fourDigitJackpot, ...defaultConv4D.supportingPicks],
      threeDigitsDirect: [main3D, ...defaultConv3D.supportingPicks],
      threeDigitsSwap: defaultConv3D.permutations6.filter((x: string) => x !== main3D),
      twoDigitsTop: top2List,
      twoDigitsBottom: bot2List,
      animalPicks: cfg.hasAnimals
        ? [
            { name: defaultConv3D.animalLink.name, number: defaultConv3D.animalLink.number, reason: `สอดคล้อง 2 ตัวบนเด่น ${defaultConv3D.derivedTwoDigits.top}` },
            { name: defaultConv3D.animalBackup.name, number: defaultConv3D.animalBackup.number, reason: `สอดคล้อง 2 ตัวล่างกำลัง${upcoming.dayOfWeekThai}` },
          ]
        : [],
      confidenceScore: defaultConv3D.confidenceScore,
      rationale: defaultConv3D.strategyReason,
      sourceBreakdown: {
        historical: 15,
        dayOfWeek: 12,
        kamlangWan: 12,
        animal: cfg.hasAnimals ? 10 : 0,
        flowMomentum: 12,
        killNumbers: 5,
        crossPosition: 12,
        sumRange: 8,
        expertConsensus: 7,
        aiDeep: 12,
      },
      facebookPostContent: buildV3FbPost(
        upcoming.drawDateThai,
        main3D,
        defaultConv3D.permutations6,
        defaultConv3D.fourDigitJackpot,
        top2List,
        bot2List,
        mainD,
        secD
      ),
      generatedAt: new Date().toISOString(),
    };

    res.json({ success: true, result: fallbackResult });
  }
});

// Facebook Config & Posts APIs
app.get('/api/facebook/config', (_req: Request, res: Response) => {
  res.json({ success: true, config: fbConfig });
});

app.post('/api/facebook/config', (req: Request, res: Response) => {
  const newConfig = { ...fbConfig, ...req.body };
  fbConfig = newConfig;
  saveConfig(fbConfig);
  res.json({ success: true, config: fbConfig });
});

app.post('/api/facebook/test-token', async (req: Request, res: Response) => {
  const { pageId, pageAccessToken } = req.body;
  if (!pageId || !pageAccessToken) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอก Page ID และ Page Access Token ให้ครบถ้วน',
    });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${pageId}?fields=id,name,fan_count,verification_status&access_token=${encodeURIComponent(
      pageAccessToken
    )}`;
    const fbRes = await fetch(url);
    const fbData = await fbRes.json();

    if (fbData.error) {
      fbConfig.status = 'disconnected';
      saveConfig(fbConfig);
      return res.status(400).json({
        success: false,
        error: `Facebook Graph API Error: ${fbData.error.message} (Code: ${fbData.error.code})`,
      });
    }

    fbConfig.status = 'connected';
    fbConfig.pageName = fbData.name || fbConfig.pageName;
    fbConfig.lastSyncTime = new Date().toISOString();
    saveConfig(fbConfig);

    res.json({
      success: true,
      data: fbData,
      message: `เชื่อมต่อกับเพจ "${fbData.name}" สำเร็จเรียบร้อย! พร้อมใช้งานระบบโพสต์อัตโนมัติ`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `ไม่สามารถเชื่อมต่อไปยัง Facebook ได้: ${err.message}`,
    });
  }
});

app.get('/api/facebook/posts', (_req: Request, res: Response) => {
  res.json({ success: true, posts: scheduledPosts });
});

app.post('/api/facebook/posts', (req: Request, res: Response) => {
  const post: ScheduledPost = req.body;
  const existingIndex = scheduledPosts.findIndex((p) => p.id === post.id);

  if (existingIndex >= 0) {
    scheduledPosts[existingIndex] = { ...scheduledPosts[existingIndex], ...post };
  } else {
    scheduledPosts.unshift(post);
  }

  savePosts(scheduledPosts);
  res.json({ success: true, post, posts: scheduledPosts });
});

app.post('/api/facebook/publish-now', async (req: Request, res: Response) => {
  const { postId, content } = req.body;
  const postIndex = scheduledPosts.findIndex((p) => p.id === postId);
  const targetPost = postIndex >= 0 ? scheduledPosts[postIndex] : null;

  const textToPost = content || (targetPost ? targetPost.content : '');

  if (!textToPost) {
    return res.status(400).json({ success: false, error: 'ไม่มีเนื้อหาข้อความที่จะโพสต์' });
  }

  if (fbConfig.pageId && fbConfig.pageAccessToken && fbConfig.pageAccessToken.length > 20) {
    try {
      const graphUrl = `https://graph.facebook.com/v19.0/${fbConfig.pageId}/feed`;
      const response = await fetch(graphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToPost,
          access_token: fbConfig.pageAccessToken,
        }),
      });

      const data = await response.json();
      if (data.error) {
        if (targetPost) {
          targetPost.status = 'failed';
          targetPost.errorLog = data.error.message;
          savePosts(scheduledPosts);
        }
        return res.status(400).json({
          success: false,
          error: `Facebook API: ${data.error.message}`,
        });
      }

      if (targetPost) {
        targetPost.status = 'published';
        targetPost.publishedAt = new Date().toISOString();
        targetPost.facebookPostId = data.id;
        savePosts(scheduledPosts);
      }

      return res.json({
        success: true,
        facebookPostId: data.id,
        isSimulated: false,
        message: 'โพสต์ไปยังเพจ Facebook จริงสำเร็จเรียบร้อย!',
        posts: scheduledPosts,
      });
    } catch (err: any) {
      if (targetPost) {
        targetPost.status = 'failed';
        targetPost.errorLog = err.message;
        savePosts(scheduledPosts);
      }
      return res.status(500).json({
        success: false,
        error: `เกิดข้อผิดพลาดในการเชื่อมต่อ Facebook: ${err.message}`,
      });
    }
  }

  const simulatedPostId = `fb_${Date.now()}_simulated`;
  if (targetPost) {
    targetPost.status = 'published';
    targetPost.publishedAt = new Date().toISOString();
    targetPost.facebookPostId = simulatedPostId;
    savePosts(scheduledPosts);
  }

  return res.json({
    success: true,
    facebookPostId: simulatedPostId,
    isSimulated: true,
    message: 'จำลองการโพสต์สำเร็จเรียบร้อย! (สามารถใส่ Facebook Page Token ในแท็บตั้งค่าเพื่อเชื่อมต่อกับเพจจริง)',
    posts: scheduledPosts,
  });
});

// ==========================================
// Telegram Group Notification Bot API System
// ==========================================
export interface TelegramNotificationConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  topicThreadId?: string;
  pinMessage?: boolean;
  disableNotification?: boolean;
  hoursAhead: number;
  customAlertTime: string;
  earlyAlertTime?: string;
  enabledLotteries?: LotteryType[];
  targetTime: string;
  status: 'connected' | 'disconnected' | 'testing';
  botUsername?: string;
  lastNotifiedDate?: string;
  lastAttemptDate?: string;
  lastNotifiedByType?: Partial<Record<LotteryType, string>>;
  lastAttemptByType?: Partial<Record<LotteryType, string>>;
  lastSyncTime?: string;
}

export interface TelegramNotificationLog {
  id: string;
  sentAt: string;
  lotteryType?: LotteryType;
  drawDate: string;
  drawDateThai: string;
  status: 'success' | 'failed' | 'simulated';
  recipient: string;
  numbersSummary: string;
  messagePreview: string;
  error?: string;
}

const TELEGRAM_CONFIG_FILENAME = '.telegram_config.json';
const TELEGRAM_LOGS_FILENAME = '.telegram_logs.json';

function getEffectiveTelegramToken(overrideToken?: string): string {
  return (overrideToken || telegramConfig?.botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

function getEffectiveTelegramChatId(overrideChatId?: string): string {
  return (overrideChatId || telegramConfig?.chatId || process.env.TELEGRAM_CHAT_ID || '').trim();
}

function parseTelegramChatIds(rawChatId: string): string[] {
  return rawChatId
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeEnabledLotteries(input?: any): LotteryType[] {
  if (Array.isArray(input) && input.length > 0) {
    const filtered = input.map(resolveLotteryType);
    return Array.from(new Set(filtered));
  }
  return ['lao', 'hanoi', 'malay'];
}

function loadTelegramConfig(): TelegramNotificationConfig {
  const envAlertTime = (process.env.TELEGRAM_ALERT_TIME || '').trim();
  const envEarlyAlertTime = (process.env.TELEGRAM_EARLY_ALERT_TIME || '').trim();
  const defaultAlert = /^\d{1,2}:\d{2}$/.test(envAlertTime) ? envAlertTime : '17:30';
  const defaultEarly = /^\d{1,2}:\d{2}$/.test(envEarlyAlertTime) ? envEarlyAlertTime : '16:30';
  const defaultTimeInfo = computeTargetAlertTime(2, defaultAlert);

  const data = readJsonFile<any>(TELEGRAM_CONFIG_FILENAME);
  if (data) {
    const hoursAhead = data.hoursAhead || 2;
    const resolvedCustomTime = /^\d{1,2}:\d{2}$/.test(envAlertTime)
      ? envAlertTime
      : data.customAlertTime || defaultAlert;
    const timeInfo = computeTargetAlertTime(hoursAhead, resolvedCustomTime);
    const earlyAlert = /^\d{1,2}:\d{2}$/.test(envEarlyAlertTime)
      ? envEarlyAlertTime
      : /^\d{1,2}:\d{2}$/.test(data.earlyAlertTime || '')
      ? data.earlyAlertTime
      : defaultEarly;
    return {
      enabled: data.enabled ?? true,
      botToken: data.botToken || '',
      chatId: data.chatId || '',
      topicThreadId: data.topicThreadId || '',
      pinMessage: data.pinMessage ?? false,
      disableNotification: data.disableNotification ?? false,
      hoursAhead,
      customAlertTime: `${String(timeInfo.hour).padStart(2, '0')}:${String(timeInfo.minute).padStart(2, '0')}`,
      earlyAlertTime: earlyAlert,
      enabledLotteries: normalizeEnabledLotteries(data.enabledLotteries),
      targetTime: data.targetTime || timeInfo.label,
      status: data.status || 'connected',
      botUsername: data.botUsername,
      lastNotifiedDate: data.lastNotifiedDate,
      lastAttemptDate: data.lastAttemptDate,
      lastNotifiedByType: data.lastNotifiedByType || (data.lastNotifiedDate ? { lao: data.lastNotifiedDate } : {}),
      lastAttemptByType: data.lastAttemptByType || {},
      lastSyncTime: data.lastSyncTime,
    };
  }

  return {
    enabled: true,
    botToken: '',
    chatId: '',
    topicThreadId: '',
    pinMessage: false,
    disableNotification: false,
    hoursAhead: 2,
    customAlertTime: `${String(defaultTimeInfo.hour).padStart(2, '0')}:${String(defaultTimeInfo.minute).padStart(2, '0')}`,
    earlyAlertTime: defaultEarly,
    enabledLotteries: ['lao', 'hanoi', 'malay'],
    targetTime: defaultTimeInfo.label,
    status: 'connected',
    lastNotifiedByType: {},
    lastAttemptByType: {},
  };
}

function saveTelegramConfig(cfg: TelegramNotificationConfig) {
  writeJsonFile(TELEGRAM_CONFIG_FILENAME, cfg);
}

function loadTelegramLogs(): TelegramNotificationLog[] {
  const parsed = readJsonFile<TelegramNotificationLog[]>(TELEGRAM_LOGS_FILENAME);
  return Array.isArray(parsed) ? parsed : [];
}

function saveTelegramLogs(logs: TelegramNotificationLog[]) {
  writeJsonFile(TELEGRAM_LOGS_FILENAME, logs);
}

let telegramConfig = loadTelegramConfig();
let telegramLogs = loadTelegramLogs();

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildDefaultTelegramMessage(
  upcoming: ReturnType<typeof getUpcomingLaoDraw>,
  stats: ReturnType<typeof computeComprehensiveStats>,
  lotteryType: LotteryType = 'lao'
) {
  const cfg = LOTTERY_CONFIGS[lotteryType];
  const conv3D = stats.threeDigitConviction;
  const single19 = stats.singleDigit19Door;
  const alertTimeStr =
    lotteryType === 'lao'
      ? computeTargetAlertTime(telegramConfig.hoursAhead, telegramConfig.customAlertTime).label
      : `${telegramConfig.earlyAlertTime || cfg.defaultAlertTime} น.`;
  const mainD = single19.primaryPick.digit;
  const secD = single19.backupPick.digit;
  const filterBadge = single19.passesStandardFilter ? '✅ ผ่านเกณฑ์เกินมาตรฐาน' : '⏳ เฝ้าระวัง';
  const top2Str = (conv3D.derivedTwoDigits.topList || [conv3D.derivedTwoDigits.top]).slice(0, 5).join(' - ');
  const bot2Str = (conv3D.derivedTwoDigits.bottomList || [conv3D.derivedTwoDigits.bottom]).slice(0, 4).join(' - ');
  const doubleShields = (conv3D.doubleShieldSets || conv3D.fifteenSetsPortfolio.doubleShieldSets || []).join(' - ');
  const animalLine = cfg.hasAnimals
    ? `\n🐉 <b>นามสัตว์มงคล:</b> ${escapeHtml(conv3D.animalLink.name)} (${conv3D.animalLink.number}) / ${escapeHtml(conv3D.animalBackup.name)} (${conv3D.animalBackup.number})`
    : '';
  const closeHint = lotteryType === 'lao' ? '20:00 น.' : '18:00 น.';

  return `${cfg.flag}<b>【 แจ้งเตือนสมาชิกกลุ่ม! ${escapeHtml(cfg.name)}ออกวันนี้ 】</b>${cfg.flag}
⏰ เวลาแจ้งเตือน ${alertTimeStr} (หวยออกเวลา ${cfg.drawTimeLabel})
📅 งวดประจำ${escapeHtml(upcoming.drawDateThai)}
📊 <i>Engine V4 รูด 1 ตัว 19 ประตู บน+ล่าง (Backtest ${single19.testedDraws} งวดจริง: เข้า ${single19.hitRatePercent}% • ${filterBadge})</i>

🔥 <b>รูด 1 ตัว 19 ประตู บน+ล่าง (ตัวเดียวเน้นๆ):</b> 🌟 <code>${mainD}</code> 🌟 (ค้าง ${single19.primaryPick.dueGap4Pos} งวด • คะแนน ${single19.primaryPick.score})
🛡️ <b>ตัวกันรอง:</b> <code>${secD}</code> (ค้าง ${single19.backupPick.dueGap4Pos} งวด)

🎯 <b>2 ตัวบน (5 ชุดคัดพิเศษ):</b> <code>${top2Str}</code>
🎯 <b>2 ตัวล่าง:</b> <code>${bot2Str}</code>

👑 <b>ฟันธง 3 ตัวเต็ง เม็ดเดียว:</b> <code>${conv3D.mainPick}</code>
💎 <b>ชุด 6 กลับ (เต็ง-โต๊ด):</b> <code>${conv3D.permutations6.join(' - ')}</code>

🛡️ <b>พอร์ต 15 ชุด V3 (13 ชุดหลัก + 2 เกราะกันเบิ้ล):</b>
🥇 <b>Tier 1 (เม็ดทอง):</b> <code>${conv3D.fifteenSetsPortfolio.tier1Gold.join(' - ')}</code>
🥈 <b>Tier 2 (เม็ดเงิน):</b> <code>${conv3D.fifteenSetsPortfolio.tier2Silver.join(' - ')}</code>
🥉 <b>Tier 3 (หลักเสริม + กันเบิ้ล):</b> <code>${conv3D.fifteenSetsPortfolio.tier3Shield.join(' - ')}</code>${doubleShields ? `\n🛡️ <b>เกราะกันเบิ้ล:</b> <code>${doubleShields}</code>` : ''}

⭐ <b>${escapeHtml(cfg.fourDigitsLabel)} แจ็กพอตเสริม:</b> <code>${conv3D.fourDigitJackpot}</code>${animalLine}

⚠️ <i>ระบบปิดรับแทงประมาณ ${closeHint} ขอให้สมาชิกทุกท่านเฮงๆ ปังๆ ครับ!</i> 💰✨`;
}

function getTelegramSchedulerStatus() {
  const now = new Date();
  const bangkokTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dayOfWeek = bangkokTime.getUTCDay();
  const currentHour = bangkokTime.getUTCHours();
  const currentMin = bangkokTime.getUTCMinutes();
  const todayStr = bangkokTime.toISOString().slice(0, 10);
  const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  const enabledLotteries = normalizeEnabledLotteries(telegramConfig.enabledLotteries);
  const isDrawDay = enabledLotteries.some((lt) => LOTTERY_CONFIGS[lt].drawDays.includes(dayOfWeek));

  const timeInfo = computeTargetAlertTime(telegramConfig.hoursAhead, telegramConfig.customAlertTime);
  const earlyTimeInfo = computeTargetAlertTime(2, telegramConfig.earlyAlertTime || '16:30');
  const currentTotalMin = currentHour * 60 + currentMin;
  const targetTotalMin = timeInfo.hour * 60 + timeInfo.minute;

  const effectiveToken = getEffectiveTelegramToken();
  const effectiveChatIds = parseTelegramChatIds(getEffectiveTelegramChatId());
  const hasEnvToken = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim().length > 20);
  const hasEnvChatId = Boolean(process.env.TELEGRAM_CHAT_ID && parseTelegramChatIds(process.env.TELEGRAM_CHAT_ID).length > 0);
  const hasToken = Boolean(effectiveToken.length > 20);
  const hasChatId = effectiveChatIds.length > 0;

  const byTypeStatus = ALL_LOTTERY_TYPES.reduce((acc, lt) => {
    const cfg = LOTTERY_CONFIGS[lt];
    acc[lt] = {
      enabled: enabledLotteries.includes(lt),
      isDrawDayToday: cfg.drawDays.includes(dayOfWeek),
      alertTimeLabel: lt === 'lao' ? timeInfo.label : earlyTimeInfo.label,
      drawTimeLabel: cfg.drawTimeLabel,
      notifiedToday: telegramConfig.lastNotifiedByType?.[lt] === todayStr,
    };
    return acc;
  }, {} as Record<LotteryType, any>);

  const alreadyNotifiedToday =
    enabledLotteries
      .filter((lt) => LOTTERY_CONFIGS[lt].drawDays.includes(dayOfWeek))
      .every((lt) => telegramConfig.lastNotifiedByType?.[lt] === todayStr) &&
    enabledLotteries.some((lt) => LOTTERY_CONFIGS[lt].drawDays.includes(dayOfWeek));

  return {
    serverBangkokTime: `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} น.`,
    serverBangkokDate: todayStr,
    dayOfWeekThai: thaiDays[dayOfWeek],
    isDrawDay,
    targetAlertTime: timeInfo.label,
    targetAlertHHMM: `${String(timeInfo.hour).padStart(2, '0')}:${String(timeInfo.minute).padStart(2, '0')}`,
    earlyAlertTime: earlyTimeInfo.label,
    earlyAlertHHMM: `${String(earlyTimeInfo.hour).padStart(2, '0')}:${String(earlyTimeInfo.minute).padStart(2, '0')}`,
    isPastAlertTimeToday: currentTotalMin >= targetTotalMin,
    isBeforeDrawToday: currentTotalMin <= 20 * 60 + 30,
    enabled: telegramConfig.enabled,
    enabledLotteries,
    byTypeStatus,
    hasToken,
    hasChatId,
    groupCount: effectiveChatIds.length,
    envConfigured: {
      hasEnvToken,
      hasEnvChatId,
    },
    configSaved: fs.existsSync(path.join(RUNTIME_DIR, TELEGRAM_CONFIG_FILENAME)) || (hasEnvToken && hasEnvChatId),
    alreadyNotifiedToday,
    lastNotifiedDate: telegramConfig.lastNotifiedDate || null,
    lastSyncTime: telegramConfig.lastSyncTime || null,
    runtimeMode: isVercelRuntime ? 'vercel-serverless' : 'node-server',
  };
}

async function dispatchTelegramNotification(
  message: string,
  overrideChatId?: string,
  overrideToken?: string,
  options?: { topicThreadId?: string; pinMessage?: boolean; disableNotification?: boolean }
): Promise<{ success: boolean; message: string; isSimulated?: boolean; details?: any }> {
  const token = getEffectiveTelegramToken(overrideToken);
  const rawChatId = getEffectiveTelegramChatId(overrideChatId);
  const chatIds = parseTelegramChatIds(rawChatId);

  if (token && token.length > 20) {
    if (chatIds.length === 0) {
      return {
        success: false,
        message: 'กรุณากรอก Telegram Group Chat ID (เช่น -1001234567890) หรือกดปุ่ม "🔍 ค้นหากลุ่มอัตโนมัติ"',
        isSimulated: false,
      };
    }

    const threadIdStr = (options?.topicThreadId ?? telegramConfig.topicThreadId ?? '').trim();
    const threadId = threadIdStr && /^\d+$/.test(threadIdStr) ? parseInt(threadIdStr, 10) : undefined;
    const shouldPin = options?.pinMessage ?? telegramConfig.pinMessage ?? false;
    const silent = options?.disableNotification ?? telegramConfig.disableNotification ?? false;
    const looksLikeHtml = /<(b|i|code|pre|strong|em|a)\b/i.test(message);

    const successes: string[] = [];
    const failures: string[] = [];

    for (const cid of chatIds) {
      try {
        const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
        const payload: Record<string, any> = {
          chat_id: cid,
          text: message,
          disable_notification: silent,
        };
        if (looksLikeHtml) payload.parse_mode = 'HTML';
        if (threadId) payload.message_thread_id = threadId;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.ok) {
          const desc = String(data.description || `HTTP ${response.status}`);
          let friendly = desc;
          if (response.status === 401 || desc.includes('Unauthorized')) {
            friendly = 'Telegram Bot Token ไม่ถูกต้อง (กรุณาคัดลอก Token จาก @BotFather ให้ครบถ้วน)';
          } else if (desc.includes('chat not found')) {
            friendly = `ไม่พบกลุ่ม Chat ID "${cid}" (ตรวจสอบว่าได้เพิ่มบอทเข้ากลุ่ม Telegram และส่งข้อความทักทายในกลุ่มอย่างน้อย 1 ครั้งแล้ว)`;
          } else if (desc.includes('bot was kicked') || desc.includes('not a member') || response.status === 403) {
            friendly = `บอทไม่มีสิทธิ์ส่งข้อความในกลุ่ม "${cid}" หรือถูกลบออกจากกลุ่ม (กรุณาเพิ่มบอทกลับเข้ากลุ่ม)`;
          } else if (desc.includes('not enough rights')) {
            friendly = `กลุ่ม "${cid}" ปิดสิทธิ์ไม่ให้บอทส่งข้อความ (กรุณาตั้งบอทเป็น Admin หรือเปิดสิทธิ์ Send Messages)`;
          }
          failures.push(`${cid}: ${friendly}`);
          continue;
        }

        successes.push(cid);

        if (shouldPin && data.result?.message_id) {
          await fetch(`https://api.telegram.org/bot${token}/pinChatMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cid,
              message_id: data.result.message_id,
              disable_notification: true,
            }),
          }).catch(() => {});
        }
      } catch (err: any) {
        failures.push(`${cid}: ${err.message}`);
      }
    }

    if (successes.length > 0 && failures.length === 0) {
      telegramConfig.status = 'connected';
      telegramConfig.lastSyncTime = new Date().toISOString();
      saveTelegramConfig(telegramConfig);
      return {
        success: true,
        message: `ส่งแจ้งเตือนเข้ากลุ่ม Telegram สำเร็จแล้ว! (${successes.join(', ')})`,
        isSimulated: false,
      };
    }

    if (successes.length > 0 && failures.length > 0) {
      return {
        success: true,
        message: `ส่งสำเร็จ ${successes.length} กลุ่ม (${successes.join(', ')}) แต่ไม่สำเร็จ ${failures.length} กลุ่ม: ${failures.join(' | ')}`,
        isSimulated: false,
      };
    }

    return {
      success: false,
      message: failures.join(' | '),
      isSimulated: false,
    };
  }

  return {
    success: true,
    message: 'จำลองการส่งเข้ากลุ่ม Telegram สำเร็จ (ยังไม่ได้ใส่ Bot Token — กรุณากรอก Token จาก @BotFather หรือตั้งค่าใน Secrets เพื่อส่งเข้ากลุ่มจริง)',
    isSimulated: true,
  };
}

let isTelegramSchedulerRunning = false;

export async function runTelegramAutoScheduler(options?: {
  force?: boolean;
  source?: string;
  lotteryType?: LotteryType;
  slot?: 'early' | 'lao';
  allowCronHourGrace?: boolean;
}) {
  if (isTelegramSchedulerRunning) {
    return { triggered: false, reason: 'กำลังประมวลผลรอบส่ง Telegram อยู่' };
  }
  isTelegramSchedulerRunning = true;
  try {
    if (!telegramConfig.enabled && !options?.force) {
      return { triggered: false, reason: 'ระบบแจ้งเตือนกลุ่ม Telegram ถูกปิดอยู่' };
    }

    const now = new Date();
    const bangkokTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const dayOfWeek = bangkokTime.getUTCDay();
    const currentHour = bangkokTime.getUTCHours();
    const currentMin = bangkokTime.getUTCMinutes();
    const todayStr = bangkokTime.toISOString().slice(0, 10);
    const currentTotalMin = currentHour * 60 + currentMin;

    const laoTimeInfo = computeTargetAlertTime(telegramConfig.hoursAhead, telegramConfig.customAlertTime);
    const earlyTimeInfo = computeTargetAlertTime(2, telegramConfig.earlyAlertTime || '16:30');
    const enabledLotteries = normalizeEnabledLotteries(telegramConfig.enabledLotteries);

    let scopedEnabled = enabledLotteries;
    if (options?.slot === 'early') {
      scopedEnabled = enabledLotteries.filter((lt) => lt === 'hanoi' || lt === 'malay');
    } else if (options?.slot === 'lao') {
      scopedEnabled = enabledLotteries.filter((lt) => lt === 'lao');
    }

    const targetTypes: LotteryType[] = options?.force
      ? options.lotteryType
        ? [options.lotteryType]
        : scopedEnabled.filter((lt) => LOTTERY_CONFIGS[lt].drawDays.includes(dayOfWeek)).length > 0
        ? scopedEnabled.filter((lt) => LOTTERY_CONFIGS[lt].drawDays.includes(dayOfWeek))
        : [options.lotteryType || 'lao']
      : options?.lotteryType
      ? scopedEnabled.filter((lt) => lt === options.lotteryType)
      : scopedEnabled;

    const dueTypes: LotteryType[] = [];
    const skipReasons: string[] = [];

    // Vercel Hobby crons trigger anywhere inside the configured UTC hour (up to ~35m earlier than :30)
    const cronGraceMinutes = options?.allowCronHourGrace ? 35 : 0;

    for (const lt of targetTypes) {
      const cfg = LOTTERY_CONFIGS[lt];
      if (!options?.force) {
        if (!cfg.drawDays.includes(dayOfWeek)) {
          skipReasons.push(`${cfg.shortName}: วันนี้ไม่ออก`);
          continue;
        }
        const alertInfo = lt === 'lao' ? laoTimeInfo : earlyTimeInfo;
        const alertMin = alertInfo.hour * 60 + alertInfo.minute - cronGraceMinutes;
        if (currentTotalMin < alertMin) {
          skipReasons.push(`${cfg.shortName}: รอ ${alertInfo.label}`);
          continue;
        }
        if (currentTotalMin > cfg.cutoffTotalMin) {
          skipReasons.push(`${cfg.shortName}: เลย ${cfg.drawTimeLabel} แล้ว`);
          continue;
        }
        if (telegramConfig.lastNotifiedByType?.[lt] === todayStr) {
          skipReasons.push(`${cfg.shortName}: ส่งแล้ววันนี้`);
          continue;
        }
        if (telegramConfig.lastAttemptByType?.[lt] === todayStr) {
          skipReasons.push(`${cfg.shortName}: รอตรวจ Token/ChatID`);
          continue;
        }
      }
      dueTypes.push(lt);
    }

    if (dueTypes.length === 0) {
      return {
        triggered: false,
        reason: skipReasons.length > 0 ? skipReasons.join(' | ') : 'ยังไม่ถึงรอบแจ้งเตือนวันนี้',
      };
    }

    const dispatchedResults: any[] = [];
    telegramConfig.lastNotifiedByType = telegramConfig.lastNotifiedByType || {};
    telegramConfig.lastAttemptByType = telegramConfig.lastAttemptByType || {};

    for (const lt of dueTypes) {
      const cfg = LOTTERY_CONFIGS[lt];
      const draws = getAllDraws(lt);
      const stats = computeComprehensiveStats(draws, new Date(), lt);
      const upcoming = getUpcomingLaoDraw(new Date(), cfg.defaultDaysAheadPost, draws, lt);
      const conv3D = stats.threeDigitConviction;
      const autoMsg = buildDefaultTelegramMessage(upcoming, stats, lt);

      const res = await dispatchTelegramNotification(autoMsg);
      telegramConfig.lastSyncTime = new Date().toISOString();

      if (res.success && !res.isSimulated) {
        telegramConfig.lastNotifiedByType[lt] = todayStr;
        if (lt === 'lao') telegramConfig.lastNotifiedDate = todayStr;
        delete telegramConfig.lastAttemptByType[lt];
      } else {
        telegramConfig.lastAttemptByType[lt] = todayStr;
      }

      const targetRecipient = getEffectiveTelegramChatId() || (res.isSimulated ? 'จำลอง' : 'Telegram Group');
      const logItem: TelegramNotificationLog = {
        id: `tg_auto_${lt}_${Date.now()}`,
        sentAt: new Date().toISOString(),
        lotteryType: lt,
        drawDate: todayStr,
        drawDateThai: `${cfg.flag} ${cfg.shortName} • ${upcoming.drawDateThai}`,
        status: res.success ? (res.isSimulated ? 'simulated' : 'success') : 'failed',
        recipient: targetRecipient,
        numbersSummary: `[${cfg.shortName}] รูด 19 ประตู: ${stats.singleDigit19Door.primaryPick.digit} | 3 ตัว: ${conv3D.mainPick}`,
        messagePreview: autoMsg.replace(/<[^>]+>/g, '').slice(0, 120) + '...',
        error: res.success ? undefined : res.message,
      };
      telegramLogs.unshift(logItem);
      dispatchedResults.push({ lotteryType: lt, result: res, log: logItem });
    }

    if (telegramLogs.length > 60) telegramLogs = telegramLogs.slice(0, 60);
    saveTelegramConfig(telegramConfig);
    saveTelegramLogs(telegramLogs);

    return {
      triggered: true,
      dispatched: dispatchedResults,
      result: dispatchedResults[0]?.result,
      log: dispatchedResults[0]?.log,
      logs: telegramLogs,
    };
  } catch (e: any) {
    console.error('[TelegramAutoNotifier] Error:', e.message);
    return { triggered: false, reason: e.message };
  } finally {
    isTelegramSchedulerRunning = false;
  }
}

app.get('/api/telegram/config', (_req: Request, res: Response) => {
  res.json({ success: true, config: telegramConfig, schedulerStatus: getTelegramSchedulerStatus() });
});

app.get('/api/telegram/status', async (_req: Request, res: Response) => {
  const check = await runTelegramAutoScheduler({ source: 'heartbeat' });
  res.json({
    success: true,
    schedulerStatus: getTelegramSchedulerStatus(),
    config: telegramConfig,
    logs: telegramLogs,
    check,
  });
});

app.post('/api/telegram/config', (req: Request, res: Response) => {
  const {
    botToken,
    chatId,
    topicThreadId,
    pinMessage,
    disableNotification,
    enabled,
    hoursAhead,
    customAlertTime,
    earlyAlertTime,
    enabledLotteries,
  } = req.body;
  const nextHours = hoursAhead !== undefined ? hoursAhead : telegramConfig.hoursAhead;
  const nextCustomTime = customAlertTime !== undefined ? customAlertTime : telegramConfig.customAlertTime;
  const timeInfo = computeTargetAlertTime(nextHours, nextCustomTime);
  const nextEarlyTime =
    earlyAlertTime !== undefined && /^\d{1,2}:\d{2}$/.test(String(earlyAlertTime).trim())
      ? String(earlyAlertTime).trim()
      : telegramConfig.earlyAlertTime || '16:30';

  telegramConfig = {
    ...telegramConfig,
    ...req.body,
    botToken: botToken !== undefined ? String(botToken).trim() : telegramConfig.botToken,
    chatId: chatId !== undefined ? String(chatId).trim() : telegramConfig.chatId,
    topicThreadId: topicThreadId !== undefined ? String(topicThreadId).trim() : telegramConfig.topicThreadId,
    pinMessage: pinMessage !== undefined ? Boolean(pinMessage) : telegramConfig.pinMessage,
    disableNotification: disableNotification !== undefined ? Boolean(disableNotification) : telegramConfig.disableNotification,
    enabled: enabled !== undefined ? enabled : telegramConfig.enabled,
    hoursAhead: nextHours,
    customAlertTime: `${String(timeInfo.hour).padStart(2, '0')}:${String(timeInfo.minute).padStart(2, '0')}`,
    earlyAlertTime: nextEarlyTime,
    enabledLotteries:
      enabledLotteries !== undefined
        ? normalizeEnabledLotteries(enabledLotteries)
        : normalizeEnabledLotteries(telegramConfig.enabledLotteries),
    targetTime: timeInfo.label,
  };
  delete telegramConfig.lastAttemptDate;
  telegramConfig.lastAttemptByType = {};
  saveTelegramConfig(telegramConfig);
  res.json({ success: true, config: telegramConfig, schedulerStatus: getTelegramSchedulerStatus() });
});

app.get('/api/telegram/logs', (_req: Request, res: Response) => {
  res.json({ success: true, logs: telegramLogs });
});

app.post('/api/telegram/detect-groups', async (req: Request, res: Response) => {
  const token = getEffectiveTelegramToken(req.body?.botToken);
  if (!token || token.length < 20) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอก Bot Token จาก @BotFather ก่อนกดค้นหากลุ่ม',
    });
  }

  try {
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json().catch(() => ({}));
    if (!meRes.ok || !meData.ok) {
      return res.status(400).json({
        success: false,
        error: `Bot Token ไม่ถูกต้อง: ${meData.description || meRes.status}`,
      });
    }

    const botUsername = meData.result?.username || '';
    if (botUsername) {
      telegramConfig.botUsername = botUsername;
      saveTelegramConfig(telegramConfig);
    }

    const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50`);
    const updatesData = await updatesRes.json().catch(() => ({}));
    const chatsMap = new Map<string, { chatId: string; title: string; type: string; username?: string }>();

    if (updatesData.ok && Array.isArray(updatesData.result)) {
      for (const upd of updatesData.result) {
        const chat =
          upd.message?.chat ||
          upd.my_chat_member?.chat ||
          upd.channel_post?.chat ||
          upd.edited_message?.chat;
        if (chat && chat.id !== undefined) {
          const cid = String(chat.id);
          chatsMap.set(cid, {
            chatId: cid,
            title: chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || cid,
            type: chat.type || 'group',
            username: chat.username,
          });
        }
      }
    }

    const groups = Array.from(chatsMap.values());
    return res.json({
      success: true,
      bot: {
        id: meData.result?.id,
        firstName: meData.result?.first_name,
        username: botUsername,
      },
      groups,
      message:
        groups.length > 0
          ? `เชื่อมต่อบอท @${botUsername} สำเร็จ! พบ ${groups.length} แชต/กลุ่มล่าสุด`
          : `เชื่อมต่อบอท @${botUsername} สำเร็จ แต่ยังไม่พบข้อความล่าสุดในกลุ่ม (ให้เพิ่มบอทเข้ากลุ่ม แล้วพิมพ์ /start หรือข้อความใดก็ได้ในกลุ่ม 1 ครั้ง จากนั้นกดค้นหาใหม่)`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `ไม่สามารถเชื่อมต่อ Telegram API ได้: ${err.message}`,
    });
  }
});

app.post('/api/telegram/test-send', async (req: Request, res: Response) => {
  const { customMessage, botToken, chatId, topicThreadId, pinMessage, disableNotification, lotteryType: rawType } = req.body || {};
  const lotteryType = resolveLotteryType(rawType);
  const cfg = LOTTERY_CONFIGS[lotteryType];
  const draws = getAllDraws(lotteryType);
  const stats = computeComprehensiveStats(draws, new Date(), lotteryType);
  const upcoming = getUpcomingLaoDraw(new Date(), cfg.defaultDaysAheadPost, draws, lotteryType);
  const conv3D = stats.threeDigitConviction;

  const tokenToUse = getEffectiveTelegramToken(botToken);
  const chatIdToUse = getEffectiveTelegramChatId(chatId);

  let configChanged = false;
  const typedToken = botToken !== undefined ? String(botToken).trim() : '';
  const typedChatId = chatId !== undefined ? String(chatId).trim() : '';
  if (typedToken && typedToken !== telegramConfig.botToken) {
    telegramConfig.botToken = typedToken;
    configChanged = true;
  }
  if (typedChatId && typedChatId !== telegramConfig.chatId) {
    telegramConfig.chatId = typedChatId;
    configChanged = true;
  }
  if (topicThreadId !== undefined && String(topicThreadId).trim() !== (telegramConfig.topicThreadId || '')) {
    telegramConfig.topicThreadId = String(topicThreadId).trim();
    configChanged = true;
  }
  if (pinMessage !== undefined && Boolean(pinMessage) !== Boolean(telegramConfig.pinMessage)) {
    telegramConfig.pinMessage = Boolean(pinMessage);
    configChanged = true;
  }
  if (disableNotification !== undefined && Boolean(disableNotification) !== Boolean(telegramConfig.disableNotification)) {
    telegramConfig.disableNotification = Boolean(disableNotification);
    configChanged = true;
  }
  if (configChanged) {
    delete telegramConfig.lastAttemptDate;
    telegramConfig.lastAttemptByType = {};
    saveTelegramConfig(telegramConfig);
  }

  const messageToSend = customMessage || buildDefaultTelegramMessage(upcoming, stats, lotteryType);
  const result = await dispatchTelegramNotification(messageToSend, chatIdToUse, tokenToUse, {
    topicThreadId,
    pinMessage,
    disableNotification,
  });

  const newLog: TelegramNotificationLog = {
    id: `tg_log_${Date.now()}`,
    sentAt: new Date().toISOString(),
    lotteryType,
    drawDate: upcoming.drawDate,
    drawDateThai: `${cfg.flag} ${cfg.shortName} • ${upcoming.drawDateThai}`,
    status: result.success ? (result.isSimulated ? 'simulated' : 'success') : 'failed',
    recipient: chatIdToUse || (result.isSimulated ? 'จำลอง' : 'Telegram Group'),
    numbersSummary: `[${cfg.shortName}] รูด 19 ประตู: ${stats.singleDigit19Door.primaryPick.digit} | 3 ตัว: ${conv3D.mainPick}`,
    messagePreview: messageToSend.replace(/<[^>]+>/g, '').slice(0, 120) + '...',
    error: result.success ? undefined : result.message,
  };

  telegramLogs.unshift(newLog);
  if (telegramLogs.length > 60) telegramLogs = telegramLogs.slice(0, 60);
  saveTelegramLogs(telegramLogs);

  res.json({
    ...result,
    log: newLog,
    logs: telegramLogs,
    config: telegramConfig,
    schedulerStatus: getTelegramSchedulerStatus(),
  });
});

// External / Vercel Cron Trigger Endpoint for Telegram
app.all('/api/telegram/cron-trigger', async (req: Request, res: Response) => {
  const force = req.query.force === 'true' || req.body?.force === true;
  const rawType = req.query.type || req.body?.lotteryType;
  const lotteryType = rawType ? resolveLotteryType(rawType) : undefined;
  const rawSlot = String(req.query.slot || req.body?.slot || '').toLowerCase().trim();
  const slot: 'early' | 'lao' | undefined = rawSlot === 'early' ? 'early' : rawSlot === 'lao' ? 'lao' : undefined;
  const ua = String(req.headers['user-agent'] || '').toLowerCase();
  const isVercelCron = ua.includes('vercel-cron') || Boolean(req.headers['x-vercel-cron']) || req.query.cron === 'vercel';

  // Wait for live results sync (with bounded timeout) before evaluating draws on serverless runtimes
  await Promise.race([
    syncAllLotteriesFromLive({ force: false }),
    new Promise((resolve) => setTimeout(resolve, 3500)),
  ]);

  const outcome = await runTelegramAutoScheduler({
    force,
    source: force ? 'manual-force' : isVercelCron ? 'vercel-cron' : 'external-cron',
    lotteryType,
    slot,
    allowCronHourGrace: isVercelCron || Boolean(slot),
  });

  res.json({
    success: true,
    ...outcome,
    schedulerStatus: getTelegramSchedulerStatus(),
    config: telegramConfig,
    logs: telegramLogs,
    liveSyncStatus: liveSyncState,
  });
});

// Health Check Endpoint (Vercel / uptime pingers)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    status: 'healthy',
    runtime: isVercelRuntime ? 'vercel-serverless' : 'node-server',
    timestamp: new Date().toISOString(),
  });
});
