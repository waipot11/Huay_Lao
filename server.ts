import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { HISTORICAL_DRAWS, LAO_ANIMALS, LaoLotteryDraw } from './src/data/laoLotteryHistory.ts';
import { computeComprehensiveStats, getUpcomingLaoDraw } from './src/utils/lotteryStats.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI client (Server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-memory or file-backed storage for Facebook configuration and scheduled posts
interface FacebookConfig {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  autoPostEnabled: boolean;
  daysAhead: number; // default 5 days before draw
  postingTime: string; // e.g. "09:00"
  includeImageCard: boolean;
  lastSyncTime?: string;
  status: 'connected' | 'disconnected' | 'testing';
}

interface ScheduledPost {
  id: string;
  drawDate: string; // YYYY-MM-DD
  drawDateThai: string;
  scheduledTime: string; // ISO string or YYYY-MM-DD HH:mm
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

const CONFIG_FILE = path.join(__dirname, '.fb_config.json');
const POSTS_FILE = path.join(__dirname, '.fb_posts.json');
const CUSTOM_DRAWS_FILE = path.join(__dirname, '.custom_draws.json');

function loadCustomDraws(): LaoLotteryDraw[] {
  try {
    if (fs.existsSync(CUSTOM_DRAWS_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_DRAWS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading custom draws file', e);
  }
  return [];
}

function saveCustomDraws(draws: LaoLotteryDraw[]) {
  try {
    fs.writeFileSync(CUSTOM_DRAWS_FILE, JSON.stringify(draws, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving custom draws', e);
  }
}

let customDraws: LaoLotteryDraw[] = loadCustomDraws();

function getAllDraws(): LaoLotteryDraw[] {
  const map = new Map<string, LaoLotteryDraw>();
  for (const d of HISTORICAL_DRAWS) {
    map.set(d.drawDate, d);
  }
  for (const cd of customDraws) {
    map.set(cd.drawDate, cd);
  }
  return Array.from(map.values()).sort((a, b) => b.drawDate.localeCompare(a.drawDate));
}

function loadConfig(): FacebookConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading fb config file', e);
  }
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
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving fb config', e);
  }
}

function loadPosts(): ScheduledPost[] {
  let existing: ScheduledPost[] = [];
  try {
    if (fs.existsSync(POSTS_FILE)) {
      existing = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading fb posts file', e);
  }

  // Initialize with upcoming draw 5 days in advance using live dynamic engine
  const draws = getAllDraws();
  const upcoming = getUpcomingLaoDraw(new Date(), 5, draws);
  const stats = computeComprehensiveStats(draws);
  const conv3D = stats.threeDigitConviction;
  const conv4D = stats.fourDigitConviction;
  const mainD = String(stats.hotDigits[0] ?? conv3D.mainPick[0]);
  const secD = String(stats.hotDigits[1] ?? conv3D.mainPick[1]);
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
      content: `🇱🇦 สรุปแนวทางหวยลาวพัฒนา ประจำ${upcoming.drawDateThai} 🇱🇦\n(คำนวณสดจากสถิติ ${stats.totalDraws} งวด + สูตรพอร์ต 15 ชุด V2 กันหลุดเลขเบิ้ล)\n\n👑 【 ฟันธง 3 ตัวเต็ง เม็ดเดียว 】:  🌟 ${conv3D.mainPick} 🌟\n💎 ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด): ${conv3D.permutations6.join(' - ')}\n\n🛡️ 【 พอร์ต 15 ชุดเต็งตรง (10 ชุดหลัก + 5 ชุดเกราะกันเบิ้ล) 】:\n🥇 Tier 1 (เม็ดทองเน้นหนัก): ${conv3D.fifteenSetsPortfolio.tier1Gold.join(' - ')}\n🥈 Tier 2 (เม็ดเงินเต็งรอง): ${conv3D.fifteenSetsPortfolio.tier2Silver.join(' - ')}\n🥉 Tier 3 (เกราะกันหลุด & กันเบิ้ล): ${conv3D.fifteenSetsPortfolio.tier3Shield.join(' - ')}\n\n⭐ 4 ตัวแจ็กพอตเสริม: ${conv3D.fourDigitJackpot}\n⭐ เลขเด่น: ${mainD}  |  เลขรอง: ${secD}  |  วิ่ง/รูด: ${mainD} - ${secD}\n\n🎯 เจาะ 2 ตัวบน: ${top2List.slice(0, 3).join(' - ')}\n🎯 เจาะ 2 ตัวล่าง: ${bot2List.slice(0, 3).join(' - ')}\n\n🐉 นามสัตว์มงคล: ${conv3D.animalLink.name} (${conv3D.animalLink.number}) / ${conv3D.animalBackup.name} (${conv3D.animalBackup.number})\n\n📌 สนับสนุนการเสี่ยงโชคอย่างมีสติ ข้อมูลนี้คำนวณจากสถิติย้อนหลังและโมเดลปัญญาประดิษฐ์\n#หวยลาว #แนวทางหวยลาว #3ตัวเต็ง #15ชุดกันหลุด #หวยลาววันนี้ #หวยพัฒนา #สถิติหวยลาว #เลขเด็ด`,
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
  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving fb posts', e);
  }
}

let fbConfig = loadConfig();
let scheduledPosts = loadPosts();

// ==========================================
// LINE Notification 2-Hour Automated System
// ==========================================
interface LineNotificationConfig {
  enabled: boolean;
  type: 'messaging_api';
  channelAccessToken: string;
  userId: string; // LINE User ID (e.g. U0123456789abcdef0123456789abcdef)
  targetUserId?: string; // backwards compatibility
  sendMode: 'push' | 'broadcast'; // 'push' to user, or 'broadcast' to followers
  hoursAhead: number; // default 2 hours (18:30 น.)
  customAlertTime?: string; // optional HH:mm e.g. "18:30"
  targetTime: string; // "18:30 น."
  status: 'connected' | 'disconnected' | 'testing';
  lastNotifiedDate?: string;
  lastAttemptDate?: string;
  lastSyncTime?: string;
}

interface LineNotificationLog {
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

const LINE_CONFIG_FILE = path.join(__dirname, '.line_config.json');
const LINE_LOGS_FILE = path.join(__dirname, '.line_logs.json');

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
  const minute = 30;
  return {
    hour,
    minute,
    label: `${String(hour).padStart(2, '0')}:30 น.`,
  };
}

function getEffectiveLineToken(overrideToken?: string): string {
  return (overrideToken || lineConfig?.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
}

function getEffectiveLineUserId(overrideUser?: string): string {
  return (overrideUser || lineConfig?.userId || lineConfig?.targetUserId || process.env.LINE_USER_ID || '').trim();
}

function getEffectiveLineSendMode(overrideMode?: 'push' | 'broadcast'): 'push' | 'broadcast' {
  if (overrideMode === 'push' || overrideMode === 'broadcast') return overrideMode;
  if (lineConfig?.sendMode === 'push' || lineConfig?.sendMode === 'broadcast') return lineConfig.sendMode;
  const envMode = (process.env.LINE_SEND_MODE || '').trim().toLowerCase();
  return envMode === 'broadcast' ? 'broadcast' : 'push';
}

function loadLineConfig(): LineNotificationConfig {
  const envSendMode = (process.env.LINE_SEND_MODE || '').trim().toLowerCase() === 'broadcast' ? 'broadcast' : 'push';
  const envAlertTime = (process.env.LINE_ALERT_TIME || '').trim();
  const defaultAlert = /^\d{1,2}:\d{2}$/.test(envAlertTime) ? envAlertTime : '18:30';
  const defaultTimeInfo = computeTargetAlertTime(2, defaultAlert);

  try {
    if (fs.existsSync(LINE_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(LINE_CONFIG_FILE, 'utf-8'));
      const hoursAhead = data.hoursAhead || 2;
      const resolvedCustomTime = data.customAlertTime || defaultAlert;
      const timeInfo = computeTargetAlertTime(hoursAhead, resolvedCustomTime);
      return {
        enabled: data.enabled ?? true,
        type: 'messaging_api',
        channelAccessToken: data.channelAccessToken || '',
        userId: data.userId || data.targetUserId || '',
        targetUserId: data.targetUserId || data.userId || '',
        sendMode: data.sendMode || envSendMode,
        hoursAhead,
        customAlertTime: `${String(timeInfo.hour).padStart(2, '0')}:${String(timeInfo.minute).padStart(2, '0')}`,
        targetTime: data.targetTime || timeInfo.label,
        status: data.status || 'connected',
        lastNotifiedDate: data.lastNotifiedDate,
        lastAttemptDate: data.lastAttemptDate,
        lastSyncTime: data.lastSyncTime,
      };
    }
  } catch (e) {
    console.error('Error reading line config file', e);
  }
  return {
    enabled: true,
    type: 'messaging_api',
    channelAccessToken: '',
    userId: '',
    targetUserId: '',
    sendMode: envSendMode,
    hoursAhead: 2,
    customAlertTime: `${String(defaultTimeInfo.hour).padStart(2, '0')}:${String(defaultTimeInfo.minute).padStart(2, '0')}`,
    targetTime: defaultTimeInfo.label,
    status: 'connected',
  };
}

function saveLineConfig(cfg: LineNotificationConfig) {
  try {
    fs.writeFileSync(LINE_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving line config', e);
  }
}

function loadLineLogs(): LineNotificationLog[] {
  try {
    if (fs.existsSync(LINE_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(LINE_LOGS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading line logs file', e);
  }
  return [];
}

function saveLineLogs(logs: LineNotificationLog[]) {
  try {
    fs.writeFileSync(LINE_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving line logs', e);
  }
}

let lineConfig = loadLineConfig();
let lineLogs = loadLineLogs();

// API Endpoints

// 1. Get History (merged with user-recorded draws)
app.get('/api/history', (_req: Request, res: Response) => {
  const allDraws = getAllDraws();
  res.json({
    success: true,
    draws: allDraws,
    data: allDraws,
    animals: LAO_ANIMALS,
  });
});

// 1b. Add / Update Latest Draw Result & Recalibrate Stats
app.post('/api/history/add', (req: Request, res: Response) => {
  const { drawDate, threeDigitsTop, twoDigitsBottom, fourDigits, sixDigits, animalName } = req.body || {};
  if (!drawDate || !threeDigitsTop || !/^\d{3}$/.test(String(threeDigitsTop).trim())) {
    return res.status(400).json({
      success: false,
      error: 'กรุณาระบุวันที่ออกรางวัล (YYYY-MM-DD) และเลขท้าย 3 ตัวให้ถูกต้อง (3 หลัก)',
    });
  }

  const t3 = String(threeDigitsTop).trim();
  const f4 = fourDigits && /^\d{4}$/.test(String(fourDigits).trim()) ? String(fourDigits).trim() : `-${t3}`;
  const s6 = sixDigits && /^\d{6}$/.test(String(sixDigits).trim()) ? String(sixDigits).trim() : `---${t3}`;
  const b2 = twoDigitsBottom && /^\d{2}$/.test(String(twoDigitsBottom).trim()) ? String(twoDigitsBottom).trim() : (f4.length === 4 && /^\d{4}$/.test(f4) ? f4.slice(0, 2) : '--');
  const top2 = t3.slice(-2);

  const [y, m, d] = String(drawDate).split('-').map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const dayNum = dt.getUTCDay();
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  let dayOfWeek: 'Monday' | 'Wednesday' | 'Friday' = 'Wednesday';
  let dayOfWeekThai = 'วันพุธ';
  let shortDay = 'พุธ';
  if (dayNum === 1) {
    dayOfWeek = 'Monday';
    dayOfWeekThai = 'วันจันทร์';
    shortDay = 'จันทร์';
  } else if (dayNum === 5) {
    dayOfWeek = 'Friday';
    dayOfWeekThai = 'วันศุกร์';
    shortDay = 'ศุกร์';
  }

  const drawDateThai = `${shortDay} ${d} ${thaiMonths[(m || 1) - 1]} ${y + 543}`;
  const isPartial = !/^\d{4}$/.test(f4) || !/^\d{2}$/.test(b2);

  // Match animal if omitted
  let resolvedAnimalName = animalName ? String(animalName).trim() : '';
  if (!resolvedAnimalName) {
    for (const [, a] of Object.entries(LAO_ANIMALS)) {
      if (a.numbers.includes(top2)) {
        resolvedAnimalName = a.name;
        break;
      }
    }
  }

  const newDraw: LaoLotteryDraw = {
    id: `lao-${drawDate}`,
    drawDate: String(drawDate),
    drawDateThai,
    dayOfWeek,
    dayOfWeekThai,
    sixDigits: s6,
    fourDigits: f4,
    threeDigitsTop: t3,
    twoDigitsTop: top2,
    twoDigitsBottom: b2,
    animalName: resolvedAnimalName || undefined,
    animalNumber: top2,
    isPartial,
  };

  customDraws = [newDraw, ...customDraws.filter((x) => x.drawDate !== newDraw.drawDate)];
  saveCustomDraws(customDraws);

  const allDraws = getAllDraws();
  const stats = computeComprehensiveStats(allDraws);
  const upcoming = getUpcomingLaoDraw(new Date(), fbConfig.daysAhead || 5, allDraws);

  res.json({
    success: true,
    message: `บันทึกผลงวด ${drawDateThai} (${t3}) และคำนวณแนวทางงวด ${upcoming.drawDateThai} ใหม่เรียบร้อยแล้ว!`,
    draws: allDraws,
    stats,
    upcoming,
  });
});

// 2. Get Comprehensive Stats
app.get('/api/stats', (_req: Request, res: Response) => {
  const draws = getAllDraws();
  const stats = computeComprehensiveStats(draws);
  const upcoming = getUpcomingLaoDraw(new Date(), fbConfig.daysAhead || 5, draws);
  res.json({
    success: true,
    stats,
    upcoming,
  });
});

// 3. AI Analysis with Gemini 3.8 Flash
app.post('/api/ai/analyze', async (req: Request, res: Response) => {
  const draws = getAllDraws();
  const stats = computeComprehensiveStats(draws);
  const upcoming = getUpcomingLaoDraw(new Date(), fbConfig.daysAhead || 5, draws);
  const defaultConv3D = stats.threeDigitConviction;
  const defaultConv4D = stats.fourDigitConviction;
  const mainD = String(stats.hotDigits[0] ?? defaultConv3D.mainPick[0]);
  const secD = String(stats.hotDigits[1] ?? defaultConv3D.mainPick[1]);
  const thirdD = String(stats.hotDigits[2] ?? defaultConv3D.mainPick[2]);

  try {
    const { targetDate, customWeights, focusDay } = req.body || {};

    const drawDateThai = targetDate || upcoming.drawDateThai;
    const day = focusDay || upcoming.dayOfWeekThai;
    const latestDraw = draws[0];

    // Prepare prompt with dynamic data from all 10 statistical sources
    const systemPrompt = `คุณคือผู้เชี่ยวชาญด้านคณิตศาสตร์สถิติและการวิเคราะห์ตัวเลขสำหรับ "หวยลาวพัฒนา" (ຫວຍພັດທະນາ)
ผลรางวัลล่าสุด: ${latestDraw.drawDateThai} ออก 3 ตัวท้าย "${latestDraw.threeDigitsTop}" (2 ตัวท้าย ${latestDraw.twoDigitsTop}, สัตว์ ${latestDraw.animalName || '-'})
อัตราการออกเลขเบิ้ล/หามใน 3 ตัวท้ายย้อนหลัง: ${stats.double3DRatePercent}%

ข้อมูลจากเครื่องยนต์คำนวณ 10 มิติสำหรับงวดเป้าหมาย ${drawDateThai} (${day}):
1. สถิติความถี่ ${stats.totalDraws} งวด: เลขมาแรง ${stats.hotDigits.join(', ')}, เลขออกน้อย ${stats.killDigits.join(', ')}
2. สถิติเฉพาะ${day}: เด่นประจำวัน ${stats.dayStats[upcoming.dayOfWeek]?.topDigits.map((t) => t.digit).join(', ')}
3. มหาทักษาเทวฤทธิ์: กำลังวัน ${stats.dayStats[upcoming.dayOfWeek]?.kamlangWan || 15} (เลขมงคล ${stats.dayStats[upcoming.dayOfWeek]?.auspiciousDigits.join(', ')})
4. เลขไหล 3 งวดหลังสุด (Flow Momentum): ${stats.flowDigits.join(', ')}
5. ชุดหลักจากการคำนวณ Matrix (Baseline Engine):
   - 3 ตัวเต็งแนะนำ: ${defaultConv3D.mainPick}
   - ชุด 6 กลับ: ${defaultConv3D.permutations6.join(', ')}
   - พอร์ต 15 ชุด (10 ชุดตรง + 5 ชุดเกราะกันเบิ้ล): ${defaultConv3D.wheeling15Sets.join(', ')}
   - 5 ชุดเกราะกันเบิ้ล (Double Shield): ${defaultConv3D.doubleShieldSets.join(', ')}
   - 4 ตัวแจ็กพอตเสริม: ${defaultConv3D.fourDigitJackpot}
   - 2 ตัวบน: ${defaultConv3D.derivedTwoDigits.topList.join(', ')} | 2 ตัวล่าง: ${defaultConv3D.derivedTwoDigits.bottomList.join(', ')}

จงวิเคราะห์และปรับเทียบผลลัพธ์โดยไม่ยึดติดเลขงวดเก่า และส่งผลลัพธ์เป็น JSON ตามโครงสร้างต่อไปนี้:
{
  "highlightMain": "${mainD}",
  "highlightSecondary": "${secD}",
  "runningDigits": ["${mainD}", "${secD}", "${thirdD}"],
  "threeDigitConviction": {
    "mainPick": "ชุด 3 ตัวเต็งที่แม่นยำที่สุด",
    "confidenceScore": 96,
    "positionBreakdown": {
      "hundreds": { "digit": "X", "reason": "คำอธิบายหลักร้อย" },
      "tens": { "digit": "Y", "reason": "คำอธิบายหลักสิบ" },
      "units": { "digit": "Z", "reason": "คำอธิบายหลักหน่วย" }
    },
    "supportingPicks": ["...", "...", "..."],
    "permutations6": ["...", "..."],
    "wheeling4Digits": ["..."],
    "wheeling4Sets": ["..."],
    "wheeling5Digits": ["..."],
    "wheeling5Sets": ["..."],
    "derivedTwoDigits": {
      "top": "${defaultConv3D.derivedTwoDigits.top}",
      "bottom": "${defaultConv3D.derivedTwoDigits.bottom}"
    },
    "fourDigitJackpot": "${defaultConv3D.fourDigitJackpot}",
    "totalSum": ${defaultConv3D.totalSum},
    "animalLink": { "name": "${defaultConv3D.animalLink.name}", "number": "${defaultConv3D.animalLink.number}" },
    "strategyReason": "คำอธิบายกลยุทธ์ 3 ตัวเต็ง + เกราะกันเบิ้ล"
  },
  "fourDigitsSet": ["${defaultConv3D.fourDigitJackpot}", ...],
  "threeDigitsDirect": ["...", "...", "..."],
  "threeDigitsSwap": ["...", "..."],
  "twoDigitsTop": ${JSON.stringify(defaultConv3D.derivedTwoDigits.topList)},
  "twoDigitsBottom": ${JSON.stringify(defaultConv3D.derivedTwoDigits.bottomList)},
  "animalPicks": [
    { "name": "${defaultConv3D.animalLink.name}", "number": "${defaultConv3D.animalLink.number}", "reason": "สอดคล้อง 2 ตัวบน" },
    { "name": "${defaultConv3D.animalBackup.name}", "number": "${defaultConv3D.animalBackup.number}", "reason": "สอดคล้อง 2 ตัวล่าง" }
  ],
  "confidenceScore": 96,
  "rationale": "คำอธิบายสรุปความแม่นยำและวิธีแก้จุดบอดเลขเบิ้ลจากงวด ${latestDraw.threeDigitsTop}",
  "facebookPostContent": "ข้อความโพสต์ Facebook เต็มรูปแบบ ที่เน้น 3 ตัวเต็ง เม็ดเดียว ชุด 6 กลับ และเกราะกันเบิ้ล พร้อมอิโมจิและแฮชแท็ก"
}`;

    const userPrompt = `กรุณาวิเคราะห์ตัวเลขหวยลาวสำหรับงวด ${drawDateThai} (${day}) หลังผลงวดล่าสุด ${latestDraw.drawDateThai} ออก ${latestDraw.threeDigitsTop} (เบิ้ล ${latestDraw.twoDigitsTop}) โดยสรุป 3 ตัวเต็ง เม็ดเดียว พร้อมพอร์ต 15 ชุดที่มีเกราะกันเลขเบิ้ล และเขียนโพสต์ Facebook ล่วงหน้า 5 วัน`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

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
      targetDrawDate: upcoming.drawDate,
      targetDrawDateThai: drawDateThai,
      dayOfWeekThai: day,
      highlightMain: parsedData.highlightMain || mainD,
      highlightSecondary: parsedData.highlightSecondary || secD,
      runningDigits: parsedData.runningDigits || [mainD, secD, thirdD],
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
      animalPicks: parsedData.animalPicks || [
        { name: defaultConv3D.animalLink.name, number: defaultConv3D.animalLink.number, reason: `สอดคล้อง 2 ตัวบนเด่น ${defaultConv3D.derivedTwoDigits.top}` },
        { name: defaultConv3D.animalBackup.name, number: defaultConv3D.animalBackup.number, reason: `สอดคล้อง 2 ตัวล่างกำลัง${day}` },
      ],
      confidenceScore: parsedData.confidenceScore || 96,
      rationale:
        parsedData.rationale ||
        `วิเคราะห์สดจากสถิติ ${stats.totalDraws} งวด (หลังผล ${latestDraw.threeDigitsTop}) ฟันธง 3 ตัวเต็ง (${main3D}) พร้อมพอร์ต 15 ชุดผสมเกราะกันเลขเบิ้ล 5 ชุด`,
      sourceBreakdown: customWeights || {
        historical: 15,
        dayOfWeek: 12,
        kamlangWan: 12,
        animal: 10,
        flowMomentum: 12,
        killNumbers: 5,
        crossPosition: 12,
        sumRange: 8,
        expertConsensus: 7,
        aiDeep: 12,
      },
      facebookPostContent:
        parsedData.facebookPostContent ||
        `🇱🇦 สรุปแนวทางหวยลาวพัฒนา ประจำ${drawDateThai} 🇱🇦\n(คำนวณสดจากสถิติ ${stats.totalDraws} งวด + สูตรพอร์ต 15 ชุด V2 กันหลุดเลขเบิ้ล)\n\n👑 【 ฟันธง 3 ตัวเต็ง เม็ดเดียว 】:  🌟 ${main3D} 🌟\n💎 ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด): ${(conv3D.permutations6 || defaultConv3D.permutations6).join(' - ')}\n\n🛡️ 【 พอร์ต 15 ชุดเต็งตรง (10 ชุดหลัก + 5 ชุดเกราะกันเบิ้ล) 】:\n🥇 Tier 1: ${defaultConv3D.fifteenSetsPortfolio.tier1Gold.join(' - ')}\n🥈 Tier 2: ${defaultConv3D.fifteenSetsPortfolio.tier2Silver.join(' - ')}\n🥉 Tier 3 (รวมเกราะกันเบิ้ล): ${defaultConv3D.fifteenSetsPortfolio.tier3Shield.join(' - ')}\n\n⭐ 4 ตัวแจ็กพอตเสริม: ${conv3D.fourDigitJackpot || defaultConv3D.fourDigitJackpot}\n⭐ เลขเด่น: ${mainD}  |  เลขรอง: ${secD}  |  วิ่ง/รูด: ${mainD} - ${secD}\n\n🎯 เจาะ 2 ตัวบน: ${top2List.slice(0, 3).join(' - ')}\n🎯 เจาะ 2 ตัวล่าง: ${bot2List.slice(0, 3).join(' - ')}\n\n🐉 นามสัตว์มงคล: ${defaultConv3D.animalLink.name} (${defaultConv3D.animalLink.number}) / ${defaultConv3D.animalBackup.name} (${defaultConv3D.animalBackup.number})\n\n📌 สนับสนุนการเสี่ยงโชคอย่างมีสติ ข้อมูลนี้คำนวณตามหลักคณิตศาสตร์สถิติและปัญญาประดิษฐ์\n#หวยลาว #แนวทางหวยลาว #3ตัวเต็ง #หวยพัฒนา #เลขเด็ดหวยลาว #หวยลาววันนี้ #สถิติหวยลาว`,
      generatedAt: new Date().toISOString(),
    };

    res.json({ success: true, result });
  } catch (err: any) {
    console.warn('AI API temporarily unavailable, using dynamic 10-source conviction engine:', err?.message || err);
    const main3D = defaultConv3D.mainPick;
    const top2List = defaultConv3D.derivedTwoDigits.topList;
    const bot2List = defaultConv3D.derivedTwoDigits.bottomList;

    const fallbackResult = {
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
      animalPicks: [
        { name: defaultConv3D.animalLink.name, number: defaultConv3D.animalLink.number, reason: `สอดคล้อง 2 ตัวบนเด่น ${defaultConv3D.derivedTwoDigits.top}` },
        { name: defaultConv3D.animalBackup.name, number: defaultConv3D.animalBackup.number, reason: `สอดคล้อง 2 ตัวล่างกำลัง${upcoming.dayOfWeekThai}` },
      ],
      confidenceScore: 96,
      rationale: defaultConv3D.strategyReason,
      sourceBreakdown: {
        historical: 15,
        dayOfWeek: 12,
        kamlangWan: 12,
        animal: 10,
        flowMomentum: 12,
        killNumbers: 5,
        crossPosition: 12,
        sumRange: 8,
        expertConsensus: 7,
        aiDeep: 12,
      },
      facebookPostContent: `🇱🇦 สรุปแนวทางหวยลาวพัฒนา ประจำ${upcoming.drawDateThai} 🇱🇦\n(คำนวณสดจากสถิติ ${stats.totalDraws} งวด + พอร์ต 15 ชุด V2 กันหลุดเลขเบิ้ล)\n\n👑 【 ฟันธง 3 ตัวเต็ง เม็ดเดียว 】:  🌟 ${main3D} 🌟\n💎 ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด): ${defaultConv3D.permutations6.join(' - ')}\n\n🛡️ 【 พอร์ต 15 ชุดเต็งตรง (10 ชุดหลัก + 5 ชุดเกราะกันเบิ้ล) 】:\n🥇 Tier 1: ${defaultConv3D.fifteenSetsPortfolio.tier1Gold.join(' - ')}\n🥈 Tier 2: ${defaultConv3D.fifteenSetsPortfolio.tier2Silver.join(' - ')}\n🥉 Tier 3 (รวมเกราะกันเบิ้ล): ${defaultConv3D.fifteenSetsPortfolio.tier3Shield.join(' - ')}\n\n⭐ 4 ตัวแจ็กพอตเสริม: ${defaultConv3D.fourDigitJackpot}\n⭐ เลขเด่น: ${mainD}  |  เลขรอง: ${secD}  |  วิ่ง/รูด: ${mainD} - ${secD}\n\n🎯 เจาะ 2 ตัวบน: ${top2List.slice(0, 3).join(' - ')}\n🎯 เจาะ 2 ตัวล่าง: ${bot2List.slice(0, 3).join(' - ')}\n\n🐉 นามสัตว์มงคล: ${defaultConv3D.animalLink.name} (${defaultConv3D.animalLink.number}) / ${defaultConv3D.animalBackup.name} (${defaultConv3D.animalBackup.number})\n\n📌 สนับสนุนการเสี่ยงโชคอย่างมีสติ ข้อมูลนี้คำนวณตามหลักคณิตศาสตร์สถิติและปัญญาประดิษฐ์\n#หวยลาว #แนวทางหวยลาว #3ตัวเต็ง #หวยพัฒนา #เลขเด็ดหวยลาว #หวยลาววันนี้ #สถิติหวยลาว`,
      generatedAt: new Date().toISOString(),
    };

    res.json({ success: true, result: fallbackResult });
  }
});

// 4. Get Facebook Config
app.get('/api/facebook/config', (_req: Request, res: Response) => {
  res.json({ success: true, config: fbConfig });
});

// 5. Save Facebook Config
app.post('/api/facebook/config', (req: Request, res: Response) => {
  const newConfig = { ...fbConfig, ...req.body };
  fbConfig = newConfig;
  saveConfig(fbConfig);
  res.json({ success: true, config: fbConfig });
});

// 6. Test Facebook Token & Page ID Connection
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

// 7. Get Scheduled Posts
app.get('/api/facebook/posts', (_req: Request, res: Response) => {
  res.json({ success: true, posts: scheduledPosts });
});

// 8. Create or Update Scheduled Post
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

// 9. Publish Immediately to Facebook
app.post('/api/facebook/publish-now', async (req: Request, res: Response) => {
  const { postId, content } = req.body;
  const postIndex = scheduledPosts.findIndex((p) => p.id === postId);
  const targetPost = postIndex >= 0 ? scheduledPosts[postIndex] : null;

  const textToPost = content || (targetPost ? targetPost.content : '');

  if (!textToPost) {
    return res.status(400).json({ success: false, error: 'ไม่มีเนื้อหาข้อความที่จะโพสต์' });
  }

  // If real Page Token and Page ID are configured, attempt real Facebook Graph API POST
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

  // Simulation mode (if user hasn't set Facebook token yet)
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
// LINE Messaging API (Push Message) Dispatch
// ==========================================
function buildDefaultLineMessage(
  upcoming: ReturnType<typeof getUpcomingLaoDraw>,
  stats: ReturnType<typeof computeComprehensiveStats>
) {
  const conv3D = stats.threeDigitConviction;
  const timeInfo = computeTargetAlertTime(lineConfig.hoursAhead, lineConfig.customAlertTime);
  const mainD = String(stats.hotDigits[0] ?? conv3D.mainPick[0]);
  const secD = String(stats.hotDigits[1] ?? conv3D.mainPick[1]);
  const top2Str = (conv3D.derivedTwoDigits.topList || [conv3D.derivedTwoDigits.top]).slice(0, 2).join(' - ');
  const bot2Str = (conv3D.derivedTwoDigits.bottomList || [conv3D.derivedTwoDigits.bottom]).slice(0, 2).join(' - ');

  return `🇱🇦【 แจ้งเตือนด่วน! หวยลาวพัฒนาออกวันนี้ 】🇱🇦\n⏰ เวลาแจ้งเตือน ${timeInfo.label} (หวยออกเวลา 20:30 น.)\nงวดประจำ${upcoming.drawDateThai}\n\n👑 【 ฟันธง 3 ตัวเต็ง เม็ดเดียว 】:  🌟 ${conv3D.mainPick} 🌟\n💎 ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด): ${conv3D.permutations6.join(' - ')}\n\n🛡️ 【 พอร์ต 15 ชุด V2 (10 ชุดหลัก + 5 ชุดเกราะกันเบิ้ล) 】:\n🥇 Tier 1: ${conv3D.fifteenSetsPortfolio.tier1Gold.join(' - ')}\n🥈 Tier 2: ${conv3D.fifteenSetsPortfolio.tier2Silver.join(' - ')}\n🥉 Tier 3 (รวมกันเบิ้ล): ${conv3D.fifteenSetsPortfolio.tier3Shield.join(' - ')}\n\n⭐ 4 ตัวแจ็กพอตเสริม: ${conv3D.fourDigitJackpot}\n⭐ เด่น ${mainD} รอง ${secD} | วิ่ง/รูด: ${mainD} - ${secD}\n🎯 2 ตัวบน: ${top2Str} | 2 ตัวล่าง: ${bot2Str}\n\n⚠️ ปิดรับแทงประมาณ 20:00 น. รีบจัดก่อนเวลาปิดรับ ขอให้รวยรับทรัพย์ทุกท่านครับ! 💰✨`;
}

function getLineSchedulerStatus() {
  const now = new Date();
  const bangkokTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dayOfWeek = bangkokTime.getUTCDay();
  const currentHour = bangkokTime.getUTCHours();
  const currentMin = bangkokTime.getUTCMinutes();
  const todayStr = bangkokTime.toISOString().slice(0, 10);
  const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const isDrawDay = [1, 3, 5].includes(dayOfWeek);

  const timeInfo = computeTargetAlertTime(lineConfig.hoursAhead, lineConfig.customAlertTime);
  const currentTotalMin = currentHour * 60 + currentMin;
  const targetTotalMin = timeInfo.hour * 60 + timeInfo.minute;
  const effectiveToken = getEffectiveLineToken();
  const effectiveUser = getEffectiveLineUserId();
  const effectiveMode = getEffectiveLineSendMode();
  const hasEnvToken = Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_ACCESS_TOKEN.trim().length > 20);
  const hasEnvUserId = Boolean(
    process.env.LINE_USER_ID && process.env.LINE_USER_ID.trim().startsWith('U') && process.env.LINE_USER_ID.trim().length >= 30
  );
  const hasToken = Boolean(effectiveToken.length > 20);
  const hasRecipient =
    effectiveMode === 'broadcast' ||
    Boolean(effectiveUser.startsWith('U') && effectiveUser.length >= 30);

  const alreadyNotifiedToday = lineConfig.lastNotifiedDate === todayStr;

  return {
    serverBangkokTime: `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} น.`,
    serverBangkokDate: todayStr,
    dayOfWeekThai: thaiDays[dayOfWeek],
    isDrawDay,
    targetAlertTime: timeInfo.label,
    targetAlertHHMM: `${String(timeInfo.hour).padStart(2, '0')}:${String(timeInfo.minute).padStart(2, '0')}`,
    isPastAlertTimeToday: currentTotalMin >= targetTotalMin,
    isBeforeDrawToday: currentTotalMin <= 20 * 60 + 30,
    enabled: lineConfig.enabled,
    hasToken,
    hasRecipient,
    envConfigured: {
      hasEnvToken,
      hasEnvUserId,
    },
    configSaved: fs.existsSync(LINE_CONFIG_FILE) || (hasEnvToken && (effectiveMode === 'broadcast' || hasEnvUserId)),
    alreadyNotifiedToday,
    lastNotifiedDate: lineConfig.lastNotifiedDate || null,
    lastSyncTime: lineConfig.lastSyncTime || null,
  };
}

async function dispatchLineNotification(
  message: string,
  targetUser?: string,
  overrideToken?: string,
  overrideSendMode?: 'push' | 'broadcast'
): Promise<{ success: boolean; message: string; isSimulated?: boolean; details?: any }> {
  const token = getEffectiveLineToken(overrideToken);
  const rawTarget = getEffectiveLineUserId(targetUser);
  const mode = getEffectiveLineSendMode(overrideSendMode);

  // If token is provided, make real API request to LINE
  if (token && token.length > 20) {
    const isBroadcast = mode === 'broadcast' || rawTarget.toLowerCase() === 'broadcast';
    const isPush = !isBroadcast;

    if (isPush && !rawTarget) {
      return {
        success: false,
        message: 'กรุณากรอก Your LINE User ID (ขึ้นต้นด้วย U...) เพื่อส่งแบบ Push Message หรือเลือกโหมด Broadcast',
        isSimulated: false,
      };
    }

    const endpoint = isPush
      ? 'https://api.line.me/v2/bot/message/push'
      : 'https://api.line.me/v2/bot/message/broadcast';

    const payload = isPush
      ? {
          to: rawTarget,
          messages: [{ type: 'text', text: message }],
        }
      : {
          messages: [{ type: 'text', text: message }],
        };

    try {
      console.log(`[LINE API] Sending ${isPush ? `Push Message to ${rawTarget}` : 'Broadcast'}...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        let errorMsg = responseData.message || `HTTP ${response.status}`;
        if (response.status === 401) {
          errorMsg = 'Channel Access Token ไม่ถูกต้องหรือหมดอายุ (กรุณาคัดลอก Channel Access Token (long-lived) จากแท็บ Messaging API ใน LINE Developers Console)';
        } else if (response.status === 400) {
          const detailStr = JSON.stringify(responseData);
          if (detailStr.includes('to') || detailStr.includes('Failed to send messages')) {
            errorMsg = `User ID ไม่ถูกต้อง ("${rawTarget}") หรือยังไม่ได้กด "เพิ่มเพื่อน (Add Friend)" กับ LINE Official Account บอทตัวนี้ (กรุณาสแกน QR Code เพื่อเพิ่มเพื่อนกับบอทก่อนทดสอบ)`;
          } else {
            errorMsg = `LINE API ส่งไม่สำเร็จ: ${responseData.message || 'ข้อมูลรูปแบบข้อความไม่ถูกต้อง'}`;
          }
        } else if (response.status === 429) {
          errorMsg = 'ส่งข้อความเกินโควต้าฟรีของ LINE Official Account (จำกัด 500 ข้อความ/เดือน)';
        }

        console.error('[LINE Push Error]', response.status, responseData);
        return {
          success: false,
          message: errorMsg,
          isSimulated: false,
          details: responseData,
        };
      }

      // Success
      lineConfig.status = 'connected';
      lineConfig.lastSyncTime = new Date().toISOString();
      saveLineConfig(lineConfig);

      return {
        success: true,
        message: isPush
          ? `ส่งข้อความ Push Message เข้า LINE สำเร็จแล้ว! (ส่งตรงถึง User ID: ${rawTarget})`
          : 'บรอดแคสต์ส่งข้อความเข้า LINE Official Account สำเร็จเรียบร้อย!',
        isSimulated: false,
        details: responseData,
      };
    } catch (err: any) {
      console.error('[LINE Dispatch Exception]', err);
      return {
        success: false,
        message: `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ LINE ได้: ${err.message}`,
        isSimulated: false,
      };
    }
  }

  // Simulation mode (when token is empty)
  return {
    success: true,
    message: 'จำลองการส่งแจ้งเตือนสำเร็จ (ยังไม่ได้ใส่ Channel Access Token - กรุณากรอกและกดบันทึกเพื่อส่งข้อความเข้า LINE จริง)',
    isSimulated: true,
  };
}

let isLineSchedulerRunning = false;

async function runLineAutoScheduler(options?: { force?: boolean; source?: string }) {
  if (isLineSchedulerRunning) {
    return { triggered: false, reason: 'กำลังประมวลผลรอบส่งอยู่' };
  }
  isLineSchedulerRunning = true;
  try {
    if (!lineConfig.enabled && !options?.force) {
      return { triggered: false, reason: 'ระบบแจ้งเตือนอัตโนมัติถูกปิดอยู่' };
    }

    const now = new Date();
    const bangkokTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const dayOfWeek = bangkokTime.getUTCDay(); // 1 = Mon, 3 = Wed, 5 = Fri
    const currentHour = bangkokTime.getUTCHours();
    const currentMin = bangkokTime.getUTCMinutes();
    const todayStr = bangkokTime.toISOString().slice(0, 10);

    const timeInfo = computeTargetAlertTime(lineConfig.hoursAhead, lineConfig.customAlertTime);
    const currentTotalMin = currentHour * 60 + currentMin;
    const targetTotalMin = timeInfo.hour * 60 + timeInfo.minute;
    // Allow automatic window from targetTime until 20:35 (just after draw) so catch-ups work reliably
    const drawCutoffMin = 20 * 60 + 35;

    if (!options?.force) {
      if (![1, 3, 5].includes(dayOfWeek)) {
        return { triggered: false, reason: 'วันนี้ไม่ใช่วันออกรางวัลหวยลาว (จันทร์, พุธ, ศุกร์)' };
      }
      if (currentTotalMin < targetTotalMin) {
        return {
          triggered: false,
          reason: `ยังไม่ถึงเวลาแจ้งเตือน (${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} น. < ${timeInfo.label})`,
        };
      }
      if (currentTotalMin > drawCutoffMin) {
        return { triggered: false, reason: 'เลยเวลาออกรางวัล 20:30 น. ของวันนี้แล้ว' };
      }
      if (lineConfig.lastNotifiedDate === todayStr) {
        return { triggered: false, reason: `ส่งแจ้งเตือนงวดวันที่ ${todayStr} สำเร็จไปแล้ว` };
      }
      if (lineConfig.lastAttemptDate === todayStr) {
        return { triggered: false, reason: `รอการตรวจสอบ Token ก่อนส่งซ้ำงวด ${todayStr}` };
      }
    }

    console.log(
      `[LineAutoNotifier:${options?.source || 'interval'}] Triggering LINE alert for ${todayStr} at ${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} BKK...`
    );

    const draws = getAllDraws();
    const stats = computeComprehensiveStats(draws);
    const upcoming = getUpcomingLaoDraw(new Date(), 5, draws);
    const conv3D = stats.threeDigitConviction;
    const autoMsg = buildDefaultLineMessage(upcoming, stats);

    const effectiveMode = getEffectiveLineSendMode();
    const effectiveToken = getEffectiveLineToken();
    const targetRecipient = effectiveMode === 'broadcast' ? 'broadcast' : getEffectiveLineUserId();
    const res = await dispatchLineNotification(autoMsg, targetRecipient, effectiveToken, effectiveMode);

    lineConfig.lastSyncTime = new Date().toISOString();
    if (res.success && !res.isSimulated) {
      lineConfig.lastNotifiedDate = todayStr;
      delete lineConfig.lastAttemptDate;
    } else {
      lineConfig.lastAttemptDate = todayStr;
    }
    saveLineConfig(lineConfig);

    const logItem: LineNotificationLog = {
      id: `line_auto_${Date.now()}`,
      sentAt: new Date().toISOString(),
      drawDate: todayStr,
      drawDateThai: upcoming.drawDateThai,
      status: res.success ? (res.isSimulated ? 'simulated' : 'success') : 'failed',
      recipient: targetRecipient || (res.isSimulated ? 'จำลอง' : 'LINE User'),
      numbersSummary: `3 ตัว: ${conv3D.mainPick} | 15 ชุดทองคำ`,
      messagePreview: autoMsg.slice(0, 120) + '...',
      error: res.success ? undefined : res.message,
    };
    lineLogs.unshift(logItem);
    if (lineLogs.length > 50) lineLogs.pop();
    saveLineLogs(lineLogs);

    return {
      triggered: true,
      result: res,
      log: logItem,
      logs: lineLogs,
    };
  } catch (e: any) {
    console.error('[LineAutoNotifier] Error:', e.message);
    return { triggered: false, reason: e.message };
  } finally {
    isLineSchedulerRunning = false;
  }
}

// 10. Get LINE Config & Live Scheduler Status
app.get('/api/line/config', (_req: Request, res: Response) => {
  res.json({ success: true, config: lineConfig, schedulerStatus: getLineSchedulerStatus() });
});

// 10b. Live Scheduler Status & Heartbeat Check
app.get('/api/line/status', async (_req: Request, res: Response) => {
  // Also run a quiet background check if the browser woke up the server right around alert time
  const check = await runLineAutoScheduler({ source: 'heartbeat' });
  res.json({
    success: true,
    schedulerStatus: getLineSchedulerStatus(),
    config: lineConfig,
    logs: lineLogs,
    check,
  });
});

// 11. Save LINE Config
app.post('/api/line/config', (req: Request, res: Response) => {
  const { channelAccessToken, userId, targetUserId, sendMode, enabled, hoursAhead, customAlertTime } = req.body;
  const nextHours = hoursAhead !== undefined ? hoursAhead : lineConfig.hoursAhead;
  const nextCustomTime = customAlertTime !== undefined ? customAlertTime : lineConfig.customAlertTime;
  const timeInfo = computeTargetAlertTime(nextHours, nextCustomTime);

  lineConfig = {
    ...lineConfig,
    ...req.body,
    channelAccessToken: channelAccessToken !== undefined ? String(channelAccessToken).trim() : lineConfig.channelAccessToken,
    userId: userId !== undefined ? String(userId).trim() : targetUserId !== undefined ? String(targetUserId).trim() : lineConfig.userId,
    targetUserId: userId !== undefined ? String(userId).trim() : lineConfig.targetUserId,
    sendMode: sendMode || lineConfig.sendMode || 'push',
    enabled: enabled !== undefined ? enabled : lineConfig.enabled,
    hoursAhead: nextHours,
    customAlertTime: `${String(timeInfo.hour).padStart(2, '0')}:${String(timeInfo.minute).padStart(2, '0')}`,
    targetTime: timeInfo.label,
  };
  // Reset failed attempt lock when user updates config
  delete lineConfig.lastAttemptDate;
  saveLineConfig(lineConfig);
  res.json({ success: true, config: lineConfig, schedulerStatus: getLineSchedulerStatus() });
});

// 12. Get LINE Logs
app.get('/api/line/logs', (_req: Request, res: Response) => {
  res.json({ success: true, logs: lineLogs });
});

// 13. Test Send LINE Push Message (also persists provided credentials so scheduler has them)
app.post('/api/line/test-send', async (req: Request, res: Response) => {
  const { customMessage, channelAccessToken, userId, sendMode } = req.body;
  const draws = getAllDraws();
  const stats = computeComprehensiveStats(draws);
  const upcoming = getUpcomingLaoDraw(new Date(), fbConfig.daysAhead || 5, draws);
  const conv3D = stats.threeDigitConviction;

  const tokenToUse = getEffectiveLineToken(channelAccessToken !== undefined ? String(channelAccessToken) : undefined);
  const userToUse = getEffectiveLineUserId(userId !== undefined ? String(userId) : undefined);
  const modeToUse = getEffectiveLineSendMode(sendMode);

  // Auto-persist non-empty user-entered credentials so background scheduler uses them too
  let configChanged = false;
  const typedToken = channelAccessToken !== undefined ? String(channelAccessToken).trim() : '';
  const typedUser = userId !== undefined ? String(userId).trim() : '';
  if (typedToken && typedToken !== lineConfig.channelAccessToken) {
    lineConfig.channelAccessToken = typedToken;
    configChanged = true;
  }
  if (typedUser && typedUser !== 'broadcast' && typedUser !== lineConfig.userId) {
    lineConfig.userId = typedUser;
    lineConfig.targetUserId = typedUser;
    configChanged = true;
  }
  if (sendMode && sendMode !== lineConfig.sendMode) {
    lineConfig.sendMode = modeToUse;
    configChanged = true;
  }
  if (configChanged) {
    delete lineConfig.lastAttemptDate;
    saveLineConfig(lineConfig);
  }

  const messageToSend = customMessage || buildDefaultLineMessage(upcoming, stats);

  const result = await dispatchLineNotification(messageToSend, userToUse, tokenToUse, modeToUse);

  const newLog: LineNotificationLog = {
    id: `line_log_${Date.now()}`,
    sentAt: new Date().toISOString(),
    drawDate: upcoming.drawDate,
    drawDateThai: upcoming.drawDateThai,
    status: result.success ? (result.isSimulated ? 'simulated' : 'success') : 'failed',
    recipient: modeToUse === 'broadcast' ? 'broadcast' : userToUse || (result.isSimulated ? 'จำลอง' : 'LINE User'),
    numbersSummary: `3 ตัว: ${conv3D.mainPick} | 4D: ${conv3D.fourDigitJackpot}`,
    messagePreview: messageToSend.slice(0, 120) + '...',
    error: result.success ? undefined : result.message,
  };

  lineLogs.unshift(newLog);
  if (lineLogs.length > 50) lineLogs.pop();
  saveLineLogs(lineLogs);

  res.json({
    ...result,
    log: newLog,
    logs: lineLogs,
    config: lineConfig,
    schedulerStatus: getLineSchedulerStatus(),
  });
});

// 14. External Cron Trigger Endpoint (wakes up Cloud Run / forces scheduled check)
app.all('/api/line/cron-trigger', async (req: Request, res: Response) => {
  const force = req.query.force === 'true' || req.body?.force === true;
  const outcome = await runLineAutoScheduler({ force, source: force ? 'manual-force' : 'external-cron' });
  res.json({
    success: true,
    ...outcome,
    schedulerStatus: getLineSchedulerStatus(),
    config: lineConfig,
    logs: lineLogs,
  });
});

// ==========================================
// Telegram Group Notification Bot API System
// ==========================================
interface TelegramNotificationConfig {
  enabled: boolean;
  botToken: string;
  chatId: string; // Supports single (-100...) or comma-separated multiple group IDs
  topicThreadId?: string; // Optional forum topic message_thread_id
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

interface TelegramNotificationLog {
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

const TELEGRAM_CONFIG_FILE = path.join(__dirname, '.telegram_config.json');
const TELEGRAM_LOGS_FILE = path.join(__dirname, '.telegram_logs.json');

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

function loadTelegramConfig(): TelegramNotificationConfig {
  const envAlertTime = (process.env.TELEGRAM_ALERT_TIME || '').trim();
  const defaultAlert = /^\d{1,2}:\d{2}$/.test(envAlertTime) ? envAlertTime : '18:30';
  const defaultTimeInfo = computeTargetAlertTime(2, defaultAlert);

  try {
    if (fs.existsSync(TELEGRAM_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(TELEGRAM_CONFIG_FILE, 'utf-8'));
      const hoursAhead = data.hoursAhead || 2;
      const resolvedCustomTime = data.customAlertTime || defaultAlert;
      const timeInfo = computeTargetAlertTime(hoursAhead, resolvedCustomTime);
      return {
        enabled: data.enabled ?? true,
        botToken: data.botToken || '',
        chatId: data.chatId || '',
        topicThreadId: data.topicThreadId || '',
        pinMessage: data.pinMessage ?? false,
        disableNotification: data.disableNotification ?? false,
        hoursAhead,
        customAlertTime: `${String(timeInfo.hour).padStart(2, '0')}:${String(timeInfo.minute).padStart(2, '0')}`,
        targetTime: data.targetTime || timeInfo.label,
        status: data.status || 'connected',
        botUsername: data.botUsername,
        lastNotifiedDate: data.lastNotifiedDate,
        lastAttemptDate: data.lastAttemptDate,
        lastSyncTime: data.lastSyncTime,
      };
    }
  } catch (e) {
    console.error('Error reading telegram config file', e);
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
    targetTime: defaultTimeInfo.label,
    status: 'connected',
  };
}

function saveTelegramConfig(cfg: TelegramNotificationConfig) {
  try {
    fs.writeFileSync(TELEGRAM_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving telegram config', e);
  }
}

function loadTelegramLogs(): TelegramNotificationLog[] {
  try {
    if (fs.existsSync(TELEGRAM_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(TELEGRAM_LOGS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading telegram logs file', e);
  }
  return [];
}

function saveTelegramLogs(logs: TelegramNotificationLog[]) {
  try {
    fs.writeFileSync(TELEGRAM_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving telegram logs', e);
  }
}

let telegramConfig = loadTelegramConfig();
let telegramLogs = loadTelegramLogs();

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildDefaultTelegramMessage(
  upcoming: ReturnType<typeof getUpcomingLaoDraw>,
  stats: ReturnType<typeof computeComprehensiveStats>
) {
  const conv3D = stats.threeDigitConviction;
  const timeInfo = computeTargetAlertTime(telegramConfig.hoursAhead, telegramConfig.customAlertTime);
  const mainD = String(stats.hotDigits[0] ?? conv3D.mainPick[0]);
  const secD = String(stats.hotDigits[1] ?? conv3D.mainPick[1]);
  const top2Str = (conv3D.derivedTwoDigits.topList || [conv3D.derivedTwoDigits.top]).slice(0, 3).join(' - ');
  const bot2Str = (conv3D.derivedTwoDigits.bottomList || [conv3D.derivedTwoDigits.bottom]).slice(0, 3).join(' - ');
  const doubleShields = (conv3D.doubleShieldSets || conv3D.fifteenSetsPortfolio.doubleShieldSets || []).join(' - ');

  return `🇱🇦<b>【 แจ้งเตือนสมาชิกกลุ่ม! หวยลาวพัฒนาออกวันนี้ 】</b>🇱🇦
⏰ เวลาแจ้งเตือน ${timeInfo.label} (หวยออกเวลา 20:30 น.)
📅 งวดประจำ${escapeHtml(upcoming.drawDateThai)}

👑 <b>ฟันธง 3 ตัวเต็ง เม็ดเดียว:</b> 🌟 <code>${conv3D.mainPick}</code> 🌟
💎 <b>ชุด 6 กลับ (เต็ง-โต๊ด):</b> <code>${conv3D.permutations6.join(' - ')}</code>

🛡️ <b>พอร์ต 15 ชุด Hybrid V2 (10 ชุดหลัก + 5 ชุดเกราะกันเบิ้ล):</b>
🥇 <b>Tier 1 (เม็ดทอง):</b> <code>${conv3D.fifteenSetsPortfolio.tier1Gold.join(' - ')}</code>
🥈 <b>Tier 2 (เม็ดเงิน):</b> <code>${conv3D.fifteenSetsPortfolio.tier2Silver.join(' - ')}</code>
🥉 <b>Tier 3 (แกนเสริม + กันเบิ้ล):</b> <code>${conv3D.fifteenSetsPortfolio.tier3Shield.join(' - ')}</code>${doubleShields ? `\n🛡️ <b>เกราะกันเบิ้ล/หาม:</b> <code>${doubleShields}</code>` : ''}

⭐ <b>4 ตัวแจ็กพอตเสริม:</b> <code>${conv3D.fourDigitJackpot}</code>
⭐ <b>เลขเด่น:</b> ${mainD}  |  <b>เลขรอง:</b> ${secD}  |  <b>วิ่ง/รูด:</b> ${mainD} - ${secD}
🎯 <b>2 ตัวบน:</b> <code>${top2Str}</code>
🎯 <b>2 ตัวล่าง:</b> <code>${bot2Str}</code>
🐉 <b>นามสัตว์มงคล:</b> ${escapeHtml(conv3D.animalLink.name)} (${conv3D.animalLink.number}) / ${escapeHtml(conv3D.animalBackup.name)} (${conv3D.animalBackup.number})

⚠️ <i>ระบบปิดรับแทงประมาณ 20:00 น. ขอให้สมาชิกทุกท่านเฮงๆ ปังๆ ครับ!</i> 💰✨`;
}

function getTelegramSchedulerStatus() {
  const now = new Date();
  const bangkokTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dayOfWeek = bangkokTime.getUTCDay();
  const currentHour = bangkokTime.getUTCHours();
  const currentMin = bangkokTime.getUTCMinutes();
  const todayStr = bangkokTime.toISOString().slice(0, 10);
  const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const isDrawDay = [1, 3, 5].includes(dayOfWeek);

  const timeInfo = computeTargetAlertTime(telegramConfig.hoursAhead, telegramConfig.customAlertTime);
  const currentTotalMin = currentHour * 60 + currentMin;
  const targetTotalMin = timeInfo.hour * 60 + timeInfo.minute;

  const effectiveToken = getEffectiveTelegramToken();
  const effectiveChatIds = parseTelegramChatIds(getEffectiveTelegramChatId());
  const hasEnvToken = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim().length > 20);
  const hasEnvChatId = Boolean(process.env.TELEGRAM_CHAT_ID && parseTelegramChatIds(process.env.TELEGRAM_CHAT_ID).length > 0);
  const hasToken = Boolean(effectiveToken.length > 20);
  const hasChatId = effectiveChatIds.length > 0;
  const alreadyNotifiedToday = telegramConfig.lastNotifiedDate === todayStr;

  return {
    serverBangkokTime: `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} น.`,
    serverBangkokDate: todayStr,
    dayOfWeekThai: thaiDays[dayOfWeek],
    isDrawDay,
    targetAlertTime: timeInfo.label,
    targetAlertHHMM: `${String(timeInfo.hour).padStart(2, '0')}:${String(timeInfo.minute).padStart(2, '0')}`,
    isPastAlertTimeToday: currentTotalMin >= targetTotalMin,
    isBeforeDrawToday: currentTotalMin <= 20 * 60 + 30,
    enabled: telegramConfig.enabled,
    hasToken,
    hasChatId,
    groupCount: effectiveChatIds.length,
    envConfigured: {
      hasEnvToken,
      hasEnvChatId,
    },
    configSaved: fs.existsSync(TELEGRAM_CONFIG_FILE) || (hasEnvToken && hasEnvChatId),
    alreadyNotifiedToday,
    lastNotifiedDate: telegramConfig.lastNotifiedDate || null,
    lastSyncTime: telegramConfig.lastSyncTime || null,
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

        // Optional: pin message in group if enabled and bot has rights
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

async function runTelegramAutoScheduler(options?: { force?: boolean; source?: string }) {
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

    const timeInfo = computeTargetAlertTime(telegramConfig.hoursAhead, telegramConfig.customAlertTime);
    const currentTotalMin = currentHour * 60 + currentMin;
    const targetTotalMin = timeInfo.hour * 60 + timeInfo.minute;
    const drawCutoffMin = 20 * 60 + 35;

    if (!options?.force) {
      if (![1, 3, 5].includes(dayOfWeek)) {
        return { triggered: false, reason: 'วันนี้ไม่ใช่วันออกรางวัลหวยลาว (จันทร์, พุธ, ศุกร์)' };
      }
      if (currentTotalMin < targetTotalMin) {
        return {
          triggered: false,
          reason: `ยังไม่ถึงเวลาแจ้งเตือน (${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} น. < ${timeInfo.label})`,
        };
      }
      if (currentTotalMin > drawCutoffMin) {
        return { triggered: false, reason: 'เลยเวลาออกรางวัล 20:30 น. ของวันนี้แล้ว' };
      }
      if (telegramConfig.lastNotifiedDate === todayStr) {
        return { triggered: false, reason: `ส่งแจ้งเตือนกลุ่ม Telegram งวด ${todayStr} สำเร็จไปแล้ว` };
      }
      if (telegramConfig.lastAttemptDate === todayStr) {
        return { triggered: false, reason: `รอตรวจสอบ Bot Token / Chat ID ก่อนส่งซ้ำงวด ${todayStr}` };
      }
    }

    const draws = getAllDraws();
    const stats = computeComprehensiveStats(draws);
    const upcoming = getUpcomingLaoDraw(new Date(), 5, draws);
    const conv3D = stats.threeDigitConviction;
    const autoMsg = buildDefaultTelegramMessage(upcoming, stats);

    const res = await dispatchTelegramNotification(autoMsg);

    telegramConfig.lastSyncTime = new Date().toISOString();
    if (res.success && !res.isSimulated) {
      telegramConfig.lastNotifiedDate = todayStr;
      delete telegramConfig.lastAttemptDate;
    } else {
      telegramConfig.lastAttemptDate = todayStr;
    }
    saveTelegramConfig(telegramConfig);

    const targetRecipient = getEffectiveTelegramChatId() || (res.isSimulated ? 'จำลอง' : 'Telegram Group');
    const logItem: TelegramNotificationLog = {
      id: `tg_auto_${Date.now()}`,
      sentAt: new Date().toISOString(),
      drawDate: todayStr,
      drawDateThai: upcoming.drawDateThai,
      status: res.success ? (res.isSimulated ? 'simulated' : 'success') : 'failed',
      recipient: targetRecipient,
      numbersSummary: `3 ตัว: ${conv3D.mainPick} | 15 ชุด Hybrid`,
      messagePreview: autoMsg.replace(/<[^>]+>/g, '').slice(0, 120) + '...',
      error: res.success ? undefined : res.message,
    };
    telegramLogs.unshift(logItem);
    if (telegramLogs.length > 50) telegramLogs.pop();
    saveTelegramLogs(telegramLogs);

    return {
      triggered: true,
      result: res,
      log: logItem,
      logs: telegramLogs,
    };
  } catch (e: any) {
    console.error('[TelegramAutoNotifier] Error:', e.message);
    return { triggered: false, reason: e.message };
  } finally {
    isTelegramSchedulerRunning = false;
  }
}

// 15. Telegram Config & Status
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
  const { botToken, chatId, topicThreadId, pinMessage, disableNotification, enabled, hoursAhead, customAlertTime } = req.body;
  const nextHours = hoursAhead !== undefined ? hoursAhead : telegramConfig.hoursAhead;
  const nextCustomTime = customAlertTime !== undefined ? customAlertTime : telegramConfig.customAlertTime;
  const timeInfo = computeTargetAlertTime(nextHours, nextCustomTime);

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
    targetTime: timeInfo.label,
  };
  delete telegramConfig.lastAttemptDate;
  saveTelegramConfig(telegramConfig);
  res.json({ success: true, config: telegramConfig, schedulerStatus: getTelegramSchedulerStatus() });
});

app.get('/api/telegram/logs', (_req: Request, res: Response) => {
  res.json({ success: true, logs: telegramLogs });
});

// 16. Auto-detect Telegram groups via getMe + getUpdates
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

// 17. Test Send Telegram Group Message
app.post('/api/telegram/test-send', async (req: Request, res: Response) => {
  const { customMessage, botToken, chatId, topicThreadId, pinMessage, disableNotification } = req.body || {};
  const draws = getAllDraws();
  const stats = computeComprehensiveStats(draws);
  const upcoming = getUpcomingLaoDraw(new Date(), fbConfig.daysAhead || 5, draws);
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
    saveTelegramConfig(telegramConfig);
  }

  const messageToSend = customMessage || buildDefaultTelegramMessage(upcoming, stats);
  const result = await dispatchTelegramNotification(messageToSend, chatIdToUse, tokenToUse, {
    topicThreadId,
    pinMessage,
    disableNotification,
  });

  const newLog: TelegramNotificationLog = {
    id: `tg_log_${Date.now()}`,
    sentAt: new Date().toISOString(),
    drawDate: upcoming.drawDate,
    drawDateThai: upcoming.drawDateThai,
    status: result.success ? (result.isSimulated ? 'simulated' : 'success') : 'failed',
    recipient: chatIdToUse || (result.isSimulated ? 'จำลอง' : 'Telegram Group'),
    numbersSummary: `3 ตัว: ${conv3D.mainPick} | 4D: ${conv3D.fourDigitJackpot}`,
    messagePreview: messageToSend.replace(/<[^>]+>/g, '').slice(0, 120) + '...',
    error: result.success ? undefined : result.message,
  };

  telegramLogs.unshift(newLog);
  if (telegramLogs.length > 50) telegramLogs.pop();
  saveTelegramLogs(telegramLogs);

  res.json({
    ...result,
    log: newLog,
    logs: telegramLogs,
    config: telegramConfig,
    schedulerStatus: getTelegramSchedulerStatus(),
  });
});

// 18. External Cron Trigger Endpoint for Telegram
app.all('/api/telegram/cron-trigger', async (req: Request, res: Response) => {
  const force = req.query.force === 'true' || req.body?.force === true;
  const outcome = await runTelegramAutoScheduler({ force, source: force ? 'manual-force' : 'external-cron' });
  res.json({
    success: true,
    ...outcome,
    schedulerStatus: getTelegramSchedulerStatus(),
    config: telegramConfig,
    logs: telegramLogs,
  });
});

// Facebook Automatic schedule checker (runs in background every 60s)
setInterval(async () => {
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
          // Mark as published in simulation
          post.status = 'published';
          post.publishedAt = new Date().toISOString();
          post.facebookPostId = `sim_${Date.now()}`;
        }
        savePosts(scheduledPosts);
      }
    }
  }
}, 60000);

// LINE & Telegram Automatic Notification Checker (completely independent from Facebook toggle, checks every 30s)
setInterval(() => {
  runLineAutoScheduler({ source: 'interval-30s' });
  runTelegramAutoScheduler({ source: 'interval-30s' });
}, 30000);

// Run initial check 3 seconds after startup
setTimeout(() => {
  runLineAutoScheduler({ source: 'startup' });
  runTelegramAutoScheduler({ source: 'startup' });
}, 3000);

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
