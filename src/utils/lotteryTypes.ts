export type LotteryType = 'lao' | 'hanoi' | 'malay';

export type DayOfWeekEnglish =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export interface LotteryTypeConfig {
  id: LotteryType;
  name: string;
  shortName: string;
  flag: string;
  drawDays: number[]; // 0 = Sun ... 6 = Sat
  drawScheduleLabel: string;
  drawHour: number;
  drawMinute: number;
  drawTimeLabel: string;
  cutoffTotalMin: number; // e.g. 18*60 + 35
  defaultAlertTime: string; // HH:MM
  defaultDaysAheadPost: number;
  fullDigitsLabel: string;
  fullDigitsLength: number; // 6 for Lao, 5 for Hanoi, 4 for Malay
  fourDigitsLabel: string;
  hasAnimals: boolean;
  accentColor: 'amber' | 'rose' | 'cyan';
  pageDefaultName: string;
  hashtags: string;
}

export const LOTTERY_CONFIGS: Record<LotteryType, LotteryTypeConfig> = {
  lao: {
    id: 'lao',
    name: 'หวยลาวพัฒนา',
    shortName: 'หวยลาว',
    flag: '🇱🇦',
    drawDays: [1, 2, 3, 4, 5],
    drawScheduleLabel: 'จันทร์–ศุกร์ (หยุดเสาร์–อาทิตย์)',
    drawHour: 20,
    drawMinute: 30,
    drawTimeLabel: '20:30 น.',
    cutoffTotalMin: 20 * 60 + 35,
    defaultAlertTime: '17:30',
    defaultDaysAheadPost: 5,
    fullDigitsLabel: '6 ตัวเต็ม',
    fullDigitsLength: 6,
    fourDigitsLabel: '4 ตัวพัฒนา',
    hasAnimals: true,
    accentColor: 'amber',
    pageDefaultName: 'เพจแนวทางหวยลาว AI มหาเฮง',
    hashtags: '#หวยลาว #แนวทางหวยลาว #วิ่งรูดหวยลาว #2ตัวบน #15ชุดกันหลุด #หวยพัฒนา #สถิติหวยลาว',
  },
  hanoi: {
    id: 'hanoi',
    name: 'หวยฮานอย (ปกติ)',
    shortName: 'ฮานอยปกติ',
    flag: '🇻🇳',
    drawDays: [0, 1, 2, 3, 4, 5, 6],
    drawScheduleLabel: 'ออกรางวัลทุกวัน (จันทร์–อาทิตย์)',
    drawHour: 18,
    drawMinute: 30,
    drawTimeLabel: '18:30 น.',
    cutoffTotalMin: 18 * 60 + 35,
    defaultAlertTime: '16:30',
    defaultDaysAheadPost: 1,
    fullDigitsLabel: '5 ตัวพิเศษ',
    fullDigitsLength: 5,
    fourDigitsLabel: '4 ตัวบน',
    hasAnimals: false,
    accentColor: 'rose',
    pageDefaultName: 'เพจแนวทางหวยฮานอย AI มหาเฮง',
    hashtags: '#หวยฮานอย #ฮานอยปกติ #แนวทางฮานอย #วิ่งรูดฮานอย #2ตัวบน #15ชุดกันหลุด #สถิติฮานอย',
  },
  malay: {
    id: 'malay',
    name: 'หวยมาเลย์ (Magnum 4D)',
    shortName: 'หวยมาเลย์',
    flag: '🇲🇾',
    drawDays: [0, 3, 6],
    drawScheduleLabel: 'พุธ • เสาร์ • อาทิตย์',
    drawHour: 18,
    drawMinute: 30,
    drawTimeLabel: '18:30 น.',
    cutoffTotalMin: 18 * 60 + 35,
    defaultAlertTime: '16:30',
    defaultDaysAheadPost: 2,
    fullDigitsLabel: '4 ตัวรางวัลที่ 1',
    fullDigitsLength: 4,
    fourDigitsLabel: '4 ตัวตรง',
    hasAnimals: false,
    accentColor: 'cyan',
    pageDefaultName: 'เพจแนวทางหวยมาเลย์ AI มหาเฮง',
    hashtags: '#หวยมาเลย์ #Magnum4D #แนวทางมาเลย์ #วิ่งรูดมาเลย์ #2ตัวบน #15ชุดกันหลุด #สถิติมาเลย์',
  },
};

export const ALL_LOTTERY_TYPES: LotteryType[] = ['lao', 'hanoi', 'malay'];

export interface LiveSyncStatusInfo {
  lotteryType: LotteryType;
  sourceName: string;
  lastCheckedAt: string | null;
  lastSyncedAt: string | null;
  latestLiveDrawDate: string | null;
  latestLiveNumbers: string | null;
  addedCount: number;
  updatedCount: number;
  lastResultSummary: string | null;
  lastError: string | null;
  isSyncing: boolean;
}

