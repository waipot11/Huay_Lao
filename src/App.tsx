import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AIAnalysisTab, AIAnalysisResult, RecordDrawPayload } from './components/AIAnalysisTab';
import { FacebookSchedulerTab, ScheduledPost, FacebookConfig } from './components/FacebookSchedulerTab';
import {
  TelegramNotifyTab,
  TelegramConfig,
  TelegramNotificationLog,
  TelegramSchedulerStatus,
} from './components/TelegramNotifyTab';
import { BannerCardStudio } from './components/BannerCardStudio';
import { StatisticsTab } from './components/StatisticsTab';
import { computeComprehensiveStats, getUpcomingLaoDraw, ComprehensiveStats, UpcomingDrawInfo } from './utils/lotteryStats';
import { HISTORICAL_DRAWS, LaoLotteryDraw } from './data/laoLotteryHistory';

function buildAnalysisFromStats(statsData: ComprehensiveStats, upcomingData: UpcomingDrawInfo): AIAnalysisResult {
  const conv3D = statsData.threeDigitConviction;
  const conv4D = statsData.fourDigitConviction;
  const portfolio15 = conv3D.fifteenSetsPortfolio;
  const highlightMain = String(statsData.hotDigits[0] ?? conv3D.mainPick[0] ?? '0');
  const highlightSecondary = String(statsData.hotDigits[1] ?? conv3D.mainPick[1] ?? '0');
  const thirdRun = String(statsData.hotDigits[2] ?? conv3D.mainPick[2] ?? '0');
  const topList = conv3D.derivedTwoDigits?.topList || [conv3D.derivedTwoDigits.top];
  const bottomList = conv3D.derivedTwoDigits?.bottomList || [conv3D.derivedTwoDigits.bottom];
  const animalMain = conv3D.animalLink;
  const animalBackup = conv3D.animalBackup || conv4D.animalLink;
  const doubleShieldList = portfolio15.doubleShieldSets || conv3D.doubleShieldSets || [];

  return {
    targetDrawDate: upcomingData.drawDate,
    targetDrawDateThai: upcomingData.drawDateThai,
    dayOfWeekThai: upcomingData.dayOfWeekThai,
    highlightMain,
    highlightSecondary,
    runningDigits: [highlightMain, highlightSecondary, thirdRun],
    threeDigitConviction: conv3D,
    fourDigitConviction: conv4D,
    fourDigitsSet: [conv3D.fourDigitJackpot, ...conv4D.supportingPicks],
    threeDigitsDirect: [conv3D.mainPick, ...conv3D.supportingPicks],
    threeDigitsSwap: conv3D.permutations6.filter((x) => x !== conv3D.mainPick),
    twoDigitsTop: topList,
    twoDigitsBottom: bottomList,
    animalPicks: [
      { name: animalMain.name, number: animalMain.number, reason: `ตรงกับชุด 2 ตัวบนเด่นประจำ${upcomingData.dayOfWeekThai}` },
      { name: animalBackup.name, number: animalBackup.number, reason: `ตรงกับชุด 2 ตัวล่างกำลังวัน${upcomingData.dayOfWeekThai}` },
    ],
    confidenceScore: conv3D.confidenceScore,
    rationale: conv3D.strategyReason,
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
    facebookPostContent: `🇱🇦 สรุปแนวทางหวยลาวพัฒนา ประจำ${upcomingData.drawDateThai} 🇱🇦\n(Dynamic Engine V2: 10 ชุดหลัก + ${doubleShieldList.length} ชุดเกราะกันเบิ้ล จาก ${statsData.totalDraws} งวดสถิติ)\n\n👑 【 ฟันธง 3 ตัวเต็ง เม็ดเดียว 】:  🌟 ${conv3D.mainPick} 🌟\n💎 ชุด 6 กลับ (6 ประตูเต็ง-โต๊ด): ${conv3D.permutations6.join(' - ')}\n\n🛡️ 【 พอร์ต 15 ชุดเต็งตรง (Hybrid กันหลุด + กันเบิ้ล) 】:\n🥇 Tier 1 (เม็ดทองเน้นหนัก): ${portfolio15.tier1Gold.join(' - ')}\n🥈 Tier 2 (เม็ดเงินเต็งรอง): ${portfolio15.tier2Silver.join(' - ')}\n🥉 Tier 3 (แกนเสริม + เกราะกันเบิ้ล): ${portfolio15.tier3Shield.join(' - ')}\n${doubleShieldList.length > 0 ? `🛡️ เกราะกันเบิ้ล/หาม: ${doubleShieldList.join(' - ')}\n` : ''}\n⭐ 4 ตัวแจ็กพอตเสริม: ${conv3D.fourDigitJackpot}\n⭐ เลขเด่น: ${highlightMain}  |  เลขรอง: ${highlightSecondary}  |  วิ่ง/รูด: ${highlightMain} - ${highlightSecondary}\n\n🎯 เจาะ 2 ตัวบน: ${topList.slice(0, 3).join(' - ')}\n🎯 เจาะ 2 ตัวล่าง: ${bottomList.slice(0, 3).join(' - ')}\n\n🐉 นามสัตว์มงคล: ${animalMain.name} (${animalMain.number}) / ${animalBackup.name} (${animalBackup.number})\n\n📌 สนับสนุนการเสี่ยงโชคอย่างมีสติ ข้อมูลนี้คำนวณตามหลักคณิตศาสตร์สถิติและความน่าจะเป็น\n#หวยลาว #แนวทางหวยลาว #3ตัวเต็ง #15ชุดกันหลุด #หวยพัฒนา #เลขเด็ดหวยลาว #หวยลาววันนี้ #สถิติหวยลาว`,
    generatedAt: new Date().toISOString(),
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'ai' | 'facebook' | 'telegram' | 'banner' | 'stats'>('ai');
  const [draws, setDraws] = useState<LaoLotteryDraw[]>(HISTORICAL_DRAWS);
  const [stats, setStats] = useState<ComprehensiveStats>(() => computeComprehensiveStats(HISTORICAL_DRAWS));
  const [upcoming, setUpcoming] = useState<UpcomingDrawInfo>(() => getUpcomingLaoDraw(new Date(), 5, HISTORICAL_DRAWS));
  const [isLoading, setIsLoading] = useState(false);

  const [fbConfig, setFbConfig] = useState<FacebookConfig>({
    pageId: '',
    pageName: 'เพจแนวทางหวยลาว AI มหาเฮง',
    pageAccessToken: '',
    autoPostEnabled: true,
    daysAhead: 5,
    postingTime: '09:30',
    includeImageCard: true,
    status: 'disconnected',
  });

  const [posts, setPosts] = useState<ScheduledPost[]>([]);

  // Telegram Group Bot Config & Logs
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    enabled: true,
    botToken: '',
    chatId: '',
    topicThreadId: '',
    pinMessage: false,
    disableNotification: false,
    hoursAhead: 2,
    customAlertTime: '18:30',
    targetTime: '18:30 น.',
    status: 'disconnected',
  });
  const [telegramLogs, setTelegramLogs] = useState<TelegramNotificationLog[]>([]);
  const [telegramSchedulerStatus, setTelegramSchedulerStatus] = useState<TelegramSchedulerStatus | null>(null);

  const refreshTelegramStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (data.success) {
        if (data.schedulerStatus) setTelegramSchedulerStatus(data.schedulerStatus);
        if (data.config) setTelegramConfig(data.config);
        if (data.logs) setTelegramLogs(data.logs);
      }
    } catch (err) {
      console.error('Telegram status refresh error:', err);
    }
  };

  // Initial Data Fetch + 30s Heartbeat
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([fetch('/api/stats'), fetch('/api/history')]);
        const statsData = await statsRes.json();
        const historyData = await historyRes.json();

        if (historyData.success && Array.isArray(historyData.draws)) {
          setDraws(historyData.draws);
        }

        if (statsData.success && statsData.stats && statsData.upcoming) {
          setStats(statsData.stats);
          setUpcoming(statsData.upcoming);
          setAnalysis(buildAnalysisFromStats(statsData.stats, statsData.upcoming));
        }

        const configRes = await fetch('/api/facebook/config');
        const configData = await configRes.json();
        if (configData.success) {
          setFbConfig(configData.config);
        }

        const postsRes = await fetch('/api/facebook/posts');
        const postsData = await postsRes.json();
        if (postsData.success) {
          setPosts(postsData.posts);
        }

        const [tgCfgRes, tgLogsRes] = await Promise.all([
          fetch('/api/telegram/config'),
          fetch('/api/telegram/logs'),
        ]);
        const tgCfgData = await tgCfgRes.json();
        if (tgCfgData.success) {
          if (tgCfgData.config) setTelegramConfig(tgCfgData.config);
          if (tgCfgData.schedulerStatus) setTelegramSchedulerStatus(tgCfgData.schedulerStatus);
        }
        const tgLogsData = await tgLogsRes.json();
        if (tgLogsData.success && tgLogsData.logs) {
          setTelegramLogs(tgLogsData.logs);
        }
      } catch (err) {
        console.error('Initial data load error:', err);
      }
    };

    fetchData();

    // Keep server awake & refresh Telegram scheduler status every 30s while app is open
    const heartbeatTimer = setInterval(() => {
      refreshTelegramStatus();
    }, 30000);

    return () => clearInterval(heartbeatTimer);
  }, []);

  // Initial default analysis built dynamically from stats (zero hardcoded picks)
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(() => buildAnalysisFromStats(stats, upcoming));

  // Record Latest Draw Handler -> recalculates entire engine for next draw
  const handleRecordDraw = async (payload: RecordDrawPayload) => {
    try {
      const res = await fetch('/api/history/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.stats && data.upcoming) {
        if (Array.isArray(data.draws)) setDraws(data.draws);
        setStats(data.stats);
        setUpcoming(data.upcoming);
        setAnalysis(buildAnalysisFromStats(data.stats, data.upcoming));
        refreshTelegramStatus();
        return {
          success: true,
          message: `บันทึกผล ${payload.threeDigitsTop} เข้าสมอง AI สำเร็จ — อัปเดตแนวทางงวดถัดไป (${data.upcoming.drawDateThai}) เป็นชุด ${data.stats.threeDigitConviction.mainPick} เรียบร้อย!`,
        };
      }
      return { success: false, error: data.error || 'ไม่สามารถบันทึกผลหวยได้' };
    } catch (err: any) {
      return { success: false, error: err.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' };
    }
  };

  // AI Analysis Handler
  const handleRunAnalysis = async (weights: Record<string, number>) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDate: upcoming.drawDateThai,
          focusDay: upcoming.dayOfWeekThai,
          customWeights: weights,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setAnalysis(data.result);
      } else {
        console.error('AI analyze failed:', data.error);
      }
    } catch (err: any) {
      console.error('AI analyze connection error:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Facebook Config Saver
  const handleSaveConfig = async (newCfg: Partial<FacebookConfig>) => {
    const merged = { ...fbConfig, ...newCfg };
    setFbConfig(merged);
    const res = await fetch('/api/facebook/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    const data = await res.json();
    if (data.success) {
      setFbConfig(data.config);
    }
  };

  // Test Facebook Token
  const handleTestToken = async (pageId: string, token: string) => {
    try {
      const res = await fetch('/api/facebook/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, pageAccessToken: token }),
      });
      const data = await res.json();
      if (data.success) {
        setFbConfig((prev) => ({
          ...prev,
          status: 'connected',
          pageId,
          pageAccessToken: token,
          pageName: data.data?.name || prev.pageName,
        }));
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'การเชื่อมต่อล้มเหลว' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  // Publish Now to Facebook
  const handlePublishNow = async (postId: string, content?: string) => {
    try {
      const res = await fetch('/api/facebook/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.posts) {
          setPosts(data.posts);
        }
        return {
          success: true,
          message: data.message,
          isSimulated: data.isSimulated,
        };
      }
      return {
        success: false,
        message: data.error || 'โพสต์ไม่สำเร็จ',
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  // Update Post in Queue
  const handleUpdatePost = async (updatedPost: ScheduledPost) => {
    const res = await fetch('/api/facebook/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPost),
    });
    const data = await res.json();
    if (data.success && data.posts) {
      setPosts(data.posts);
    }
  };

  // Send AI Analysis to 5-day Auto Post Queue
  const handleSendToQueue = async (res: AIAnalysisResult) => {
    const newPost: ScheduledPost = {
      id: `post-${res.targetDrawDate}`,
      drawDate: res.targetDrawDate,
      drawDateThai: res.targetDrawDateThai,
      scheduledTime: `${upcoming.postScheduledDate}T${fbConfig.postingTime || '09:30'}:00`,
      status: 'scheduled',
      content: res.facebookPostContent,
      highlightNumbers: {
        main: res.highlightMain,
        secondary: res.highlightSecondary,
        twoDigits: res.twoDigitsTop.slice(0, 4),
        threeDigits: [
          res.threeDigitConviction?.mainPick || res.threeDigitsDirect[0] || stats.threeDigitConviction.mainPick,
          ...res.threeDigitsDirect
            .filter((x) => x !== (res.threeDigitConviction?.mainPick || stats.threeDigitConviction.mainPick))
            .slice(0, 3),
        ],
        fourDigits: res.fourDigitsSet.slice(0, 3),
      },
    };
    await handleUpdatePost(newPost);
  };

  // Telegram Group Notification Handlers
  const handleSaveTelegramConfig = async (newCfg: Partial<TelegramConfig>) => {
    try {
      const merged = { ...telegramConfig, ...newCfg };
      setTelegramConfig(merged);
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (data.success) {
        if (data.config) setTelegramConfig(data.config);
        if (data.schedulerStatus) setTelegramSchedulerStatus(data.schedulerStatus);
      }
    } catch (err) {
      console.error('Failed to save Telegram config:', err);
    }
  };

  const handleTestTelegramSend = async (
    customMessage?: string,
    options?: {
      botToken?: string;
      chatId?: string;
      topicThreadId?: string;
      pinMessage?: boolean;
      disableNotification?: boolean;
    }
  ) => {
    try {
      const res = await fetch('/api/telegram/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customMessage,
          botToken: options?.botToken,
          chatId: options?.chatId,
          topicThreadId: options?.topicThreadId,
          pinMessage: options?.pinMessage,
          disableNotification: options?.disableNotification,
        }),
      });
      const data = await res.json();
      if (data.logs) setTelegramLogs(data.logs);
      if (data.config) setTelegramConfig(data.config);
      if (data.schedulerStatus) setTelegramSchedulerStatus(data.schedulerStatus);
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'ส่งข้อความ Telegram ไม่สำเร็จ' };
    }
  };

  const handleDetectTelegramGroups = async (botToken?: string) => {
    try {
      const res = await fetch('/api/telegram/detect-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'ไม่สามารถค้นหากลุ่ม Telegram ได้' };
    }
  };

  const handleForceTelegramTrigger = async () => {
    try {
      const res = await fetch('/api/telegram/cron-trigger?force=true', { method: 'POST' });
      const data = await res.json();
      if (data.logs) setTelegramLogs(data.logs);
      if (data.config) setTelegramConfig(data.config);
      if (data.schedulerStatus) setTelegramSchedulerStatus(data.schedulerStatus);
      return data;
    } catch (err: any) {
      return { success: false, triggered: false, reason: err.message || 'เกิดข้อผิดพลาด' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fbConnected={fbConfig.status === 'connected'}
        upcomingDateThai={upcoming.drawDateThai}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'ai' && (
          <AIAnalysisTab
            stats={stats}
            upcoming={upcoming}
            analysis={analysis}
            onAnalyze={handleRunAnalysis}
            isLoading={isLoading}
            onSendToQueue={handleSendToQueue}
            onGoToBanner={() => setActiveTab('banner')}
            onRecordDraw={handleRecordDraw}
          />
        )}

        {activeTab === 'facebook' && (
          <FacebookSchedulerTab
            config={fbConfig}
            posts={posts}
            onSaveConfig={handleSaveConfig}
            onTestToken={handleTestToken}
            onPublishNow={handlePublishNow}
            onUpdatePost={handleUpdatePost}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramNotifyTab
            config={telegramConfig}
            schedulerStatus={telegramSchedulerStatus}
            upcoming={upcoming}
            stats={stats}
            logs={telegramLogs}
            onSaveConfig={handleSaveTelegramConfig}
            onTestSend={handleTestTelegramSend}
            onDetectGroups={handleDetectTelegramGroups}
            onRefreshStatus={refreshTelegramStatus}
            onForceTrigger={handleForceTelegramTrigger}
          />
        )}

        {activeTab === 'banner' && (
          <BannerCardStudio
            bannerData={{
              drawDateThai: analysis?.targetDrawDateThai || upcoming.drawDateThai,
              highlightMain: analysis?.highlightMain || String(stats.hotDigits[0] ?? '0'),
              highlightSecondary: analysis?.highlightSecondary || String(stats.hotDigits[1] ?? '0'),
              twoDigitsTop: analysis?.twoDigitsTop || stats.threeDigitConviction.derivedTwoDigits.topList,
              twoDigitsBottom: analysis?.twoDigitsBottom || stats.threeDigitConviction.derivedTwoDigits.bottomList,
              threeDigitsDirect: analysis?.threeDigitsDirect || [stats.threeDigitConviction.mainPick, ...stats.threeDigitConviction.supportingPicks],
              fourDigitsSet: analysis?.fourDigitsSet || [stats.threeDigitConviction.fourDigitJackpot, ...stats.fourDigitConviction.supportingPicks],
              main4D: analysis?.threeDigitConviction?.fourDigitJackpot || stats.threeDigitConviction.fourDigitJackpot,
              main3D: analysis?.threeDigitConviction?.mainPick || stats.threeDigitConviction.mainPick,
              permutations6: analysis?.threeDigitConviction?.permutations6 || stats.threeDigitConviction.permutations6,
              wheelingSets: analysis?.threeDigitConviction?.wheeling4Sets || stats.threeDigitConviction.wheeling4Sets,
              portfolio15Sets: analysis?.threeDigitConviction?.wheeling15Sets || stats.threeDigitConviction.wheeling15Sets,
              animalPicks: analysis?.animalPicks || [
                stats.threeDigitConviction.animalLink,
                stats.threeDigitConviction.animalBackup || stats.fourDigitConviction.animalLink,
              ],
              pageName: fbConfig.pageName || 'เพจแนวทางหวยลาว AI มหาเฮง',
            }}
          />
        )}

        {activeTab === 'stats' && <StatisticsTab stats={stats} draws={draws} />}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>LaoLotto AI © 2026 • ระบบวิเคราะห์สถิติหวยลาวพัฒนา & โพสต์ Facebook อัตโนมัติล่วงหน้า 5 วัน</p>
          <p className="text-slate-600">
            โปรดเสี่ยงโชคอย่างมีสติและรับผิดชอบ ข้อมูลในระบบคำนวณตามหลักสถิติและความน่าจะเป็น
          </p>
        </div>
      </footer>
    </div>
  );
}
