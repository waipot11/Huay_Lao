import { LaoLotteryDraw, LAO_ANIMALS } from '../data/laoLotteryHistory';
import { LotteryType, DayOfWeekEnglish } from './lotteryTypes';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const WEEKDAY_META: Record<number, { en: DayOfWeekEnglish; th: string; shortTh: string }> = {
  0: { en: 'Sunday', th: 'วันอาทิตย์', shortTh: 'อาทิตย์' },
  1: { en: 'Monday', th: 'วันจันทร์', shortTh: 'จันทร์' },
  2: { en: 'Tuesday', th: 'วันอังคาร', shortTh: 'อังคาร' },
  3: { en: 'Wednesday', th: 'วันพุธ', shortTh: 'พุธ' },
  4: { en: 'Thursday', th: 'วันพฤหัสบดี', shortTh: 'พฤหัสบดี' },
  5: { en: 'Friday', th: 'วันศุกร์', shortTh: 'ศุกร์' },
  6: { en: 'Saturday', th: 'วันเสาร์', shortTh: 'เสาร์' },
};

export interface LiveFetchOutcome {
  lotteryType: LotteryType;
  sourceName: string;
  fetchedDraws: LaoLotteryDraw[];
  ok: boolean;
  error?: string;
}

function getBangkokTodayIso(): string {
  const bkk = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return bkk.toISOString().slice(0, 10);
}

function resolveDateMeta(drawDate: string): {
  drawDateThai: string;
  dayOfWeek: DayOfWeekEnglish;
  dayOfWeekThai: string;
} {
  const [y, m, d] = drawDate.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const meta = WEEKDAY_META[dt.getUTCDay()] || WEEKDAY_META[3];
  return {
    drawDateThai: `${meta.shortTh} ${d} ${THAI_MONTHS[(m || 1) - 1] || 'มกราคม'} ${y + 543}`,
    dayOfWeek: meta.en,
    dayOfWeekThai: meta.th,
  };
}

function lookupAnimalName(twoDigitsTop: string): string | undefined {
  for (const [, a] of Object.entries(LAO_ANIMALS)) {
    if (a.numbers.includes(twoDigitsTop)) {
      return a.name;
    }
  }
  return undefined;
}

async function fetchTextWithTimeout(url: string, timeoutMs: number = 7000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MultiLottoFetcher/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiveLaoResults(): Promise<LiveFetchOutcome> {
  const sourceName = 'Sanook ตรวจหวยลาว';
  const todayIso = getBangkokTodayIso();
  try {
    const tagUrl = 'https://www.sanook.com/news/tag/%E0%B8%AB%E0%B8%A7%E0%B8%A2%E0%B8%A5%E0%B8%B2%E0%B8%A7/';
    const tagHtml = await fetchTextWithTimeout(tagUrl, 7000);
    const links = Array.from(
      new Set(
        Array.from(tagHtml.matchAll(/href="(https:\/\/www\.sanook\.com\/news\/\d+\/?)"/g)).map((m) => m[1])
      )
    ).slice(0, 3);

    const parsedByDate = new Map<string, LaoLotteryDraw>();

    for (const url of links) {
      try {
        const html = await fetchTextWithTimeout(url, 7000);
        const txt = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ');

        // Strict non-bridging pattern so a pending "xx" block cannot accidentally capture the next historical block
        const re =
          /ผลหวยลาว(?:วันนี้|งวด)?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*(?:ออกอะไรบ้าง)?\s*เลข\s*6\s*ตัว\s*[:：]?\s*(\d{6})/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(txt)) !== null) {
          const dd = m[1].padStart(2, '0');
          const mm = m[2].padStart(2, '0');
          let y = parseInt(m[3], 10);
          if (y < 100) y = 2500 + y - 543;
          else if (y > 2400) y -= 543;
          const iso = `${y}-${mm}-${dd}`;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso > todayIso) continue;

          const sixDigits = m[4];
          if (!/^\d{6}$/.test(sixDigits) || parsedByDate.has(iso)) continue;

          const meta = resolveDateMeta(iso);
          const fourDigits = sixDigits.slice(-4);
          const threeDigitsTop = sixDigits.slice(-3);
          const twoDigitsTop = sixDigits.slice(-2);
          const twoDigitsBottom = sixDigits.slice(2, 4);
          const animalName = lookupAnimalName(twoDigitsTop);

          parsedByDate.set(iso, {
            id: `lao-${iso}`,
            drawDate: iso,
            drawDateThai: meta.drawDateThai,
            dayOfWeek: meta.dayOfWeek,
            dayOfWeekThai: meta.dayOfWeekThai,
            sixDigits,
            fourDigits,
            threeDigitsTop,
            twoDigitsTop,
            twoDigitsBottom,
            animalName,
            animalNumber: twoDigitsTop,
          });
        }
      } catch {
        // Continue to next article if one fails
      }
    }

    const fetchedDraws = Array.from(parsedByDate.values()).sort((a, b) =>
      b.drawDate.localeCompare(a.drawDate)
    );
    return { lotteryType: 'lao', sourceName, fetchedDraws, ok: fetchedDraws.length > 0 };
  } catch (err: any) {
    return {
      lotteryType: 'lao',
      sourceName,
      fetchedDraws: [],
      ok: false,
      error: err?.message || 'ไม่สามารถเชื่อมต่อแหล่งผลหวยลาวได้',
    };
  }
}

export async function fetchLiveHanoiResults(): Promise<LiveFetchOutcome> {
  const sourceName = 'XSKT Miền Bắc Official RSS';
  const todayIso = getBangkokTodayIso();
  try {
    const rss = await fetchTextWithTimeout('https://xskt.com.vn/rss-feed/mien-bac-xsmb.rss', 7000);
    const parsedByDate = new Map<string, LaoLotteryDraw>();
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let im: RegExpExecArray | null;

    while ((im = itemRe.exec(rss)) !== null) {
      const block = im[1];
      const linkM = block.match(/ngay-(\d{2})-(\d{2})-(\d{4})/);
      const descM = block.match(/<description>([\s\S]*?)<\/description>/);
      if (!linkM || !descM) continue;

      const iso = `${linkM[3]}-${linkM[2]}-${linkM[1]}`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso > todayIso || parsedByDate.has(iso)) continue;

      const desc = descM[1].replace(/\s+/g, ' ');
      const numM = desc.match(/ĐB:\s*(\d{5})\s*1:\s*(\d{5})/);
      if (!numM) continue;

      const fiveDigits = numM[1];
      const prize1 = numM[2];
      const meta = resolveDateMeta(iso);

      parsedByDate.set(iso, {
        id: `hanoi-${iso}`,
        drawDate: iso,
        drawDateThai: meta.drawDateThai,
        dayOfWeek: meta.dayOfWeek,
        dayOfWeekThai: meta.dayOfWeekThai,
        sixDigits: fiveDigits,
        fourDigits: fiveDigits.slice(-4),
        threeDigitsTop: fiveDigits.slice(-3),
        twoDigitsTop: fiveDigits.slice(-2),
        twoDigitsBottom: prize1.slice(-2),
      });
    }

    const fetchedDraws = Array.from(parsedByDate.values()).sort((a, b) =>
      b.drawDate.localeCompare(a.drawDate)
    );
    return { lotteryType: 'hanoi', sourceName, fetchedDraws, ok: fetchedDraws.length > 0 };
  } catch (err: any) {
    return {
      lotteryType: 'hanoi',
      sourceName,
      fetchedDraws: [],
      ok: false,
      error: err?.message || 'ไม่สามารถเชื่อมต่อแหล่งผลหวยฮานอยได้',
    };
  }
}

export async function fetchLiveMalayResults(): Promise<LiveFetchOutcome> {
  const sourceName = '4D88 Magnum 4D Live';
  const todayIso = getBangkokTodayIso();
  try {
    const html = await fetchTextWithTimeout('https://www.4d88.com/', 7000);
    const txt = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ');

    const m = txt.match(
      /Magnum 4D\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{2})-(\d{2})-(\d{4})[\s\S]{0,180}?1st Prize\s+(\d{4})\s+2nd Prize\s+(\d{4})/i
    );
    if (!m) {
      return { lotteryType: 'malay', sourceName, fetchedDraws: [], ok: false, error: 'ผล Magnum 4D ยังไม่ออกหรือกำลังรออัปเดต' };
    }

    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso > todayIso) {
      return { lotteryType: 'malay', sourceName, fetchedDraws: [], ok: false };
    }

    const prize1 = m[4];
    const prize2 = m[5];
    const meta = resolveDateMeta(iso);

    const draw: LaoLotteryDraw = {
      id: `malay-${iso}`,
      drawDate: iso,
      drawDateThai: meta.drawDateThai,
      dayOfWeek: meta.dayOfWeek,
      dayOfWeekThai: meta.dayOfWeekThai,
      sixDigits: prize1,
      fourDigits: prize1,
      threeDigitsTop: prize1.slice(-3),
      twoDigitsTop: prize1.slice(-2),
      twoDigitsBottom: prize2.slice(-2),
    };

    return { lotteryType: 'malay', sourceName, fetchedDraws: [draw], ok: true };
  } catch (err: any) {
    return {
      lotteryType: 'malay',
      sourceName,
      fetchedDraws: [],
      ok: false,
      error: err?.message || 'ไม่สามารถเชื่อมต่อแหล่งผลหวยมาเลย์ได้',
    };
  }
}

export async function fetchLiveResultsByType(type: LotteryType): Promise<LiveFetchOutcome> {
  if (type === 'hanoi') return fetchLiveHanoiResults();
  if (type === 'malay') return fetchLiveMalayResults();
  return fetchLiveLaoResults();
}
