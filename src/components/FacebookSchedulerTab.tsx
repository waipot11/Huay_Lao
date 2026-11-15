import React, { useState } from 'react';
import {
  CalendarClock,
  Send,
  Eye,
  Edit3,
  Copy,
  Check,
  Facebook,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  HelpCircle,
  ThumbsUp,
  MessageCircle,
  Share2,
  Trash2,
  PlusCircle,
  X,
  Play,
  Pause,
} from 'lucide-react';

export interface ScheduledPost {
  id: string;
  drawDate: string;
  drawDateThai: string;
  scheduledTime: string;
  status: 'scheduled' | 'published' | 'failed' | 'draft';
  content: string;
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

interface FacebookSchedulerTabProps {
  config: FacebookConfig;
  posts: ScheduledPost[];
  onSaveConfig: (cfg: Partial<FacebookConfig>) => Promise<void>;
  onTestToken: (pageId: string, token: string) => Promise<{ success: boolean; message: string }>;
  onPublishNow: (postId: string, content?: string) => Promise<{ success: boolean; message: string; isSimulated?: boolean }>;
  onUpdatePost: (post: ScheduledPost) => Promise<void>;
  bannerDataUrl?: string;
}

export const FacebookSchedulerTab: React.FC<FacebookSchedulerTabProps> = ({
  config,
  posts,
  onSaveConfig,
  onTestToken,
  onPublishNow,
  onUpdatePost,
  bannerDataUrl,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'settings' | 'guide'>('queue');
  const [previewPost, setPreviewPost] = useState<ScheduledPost | null>(null);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for settings
  const [pageIdInput, setPageIdInput] = useState(config.pageId || '');
  const [pageNameInput, setPageNameInput] = useState(config.pageName || '');
  const [tokenInput, setTokenInput] = useState(config.pageAccessToken || '');
  const [daysAheadInput, setDaysAheadInput] = useState(config.daysAhead || 5);
  const [postingTimeInput, setPostingTimeInput] = useState(config.postingTime || '09:30');
  const [autoPostEnabled, setAutoPostEnabled] = useState(config.autoPostEnabled);
  const [testingToken, setTestingToken] = useState(false);

  const handleTestToken = async () => {
    setTestingToken(true);
    setStatusMessage(null);
    try {
      const res = await onTestToken(pageIdInput, tokenInput);
      setStatusMessage({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
      if (res.success) {
        await onSaveConfig({
          pageId: pageIdInput,
          pageName: pageNameInput,
          pageAccessToken: tokenInput,
          daysAhead: Number(daysAheadInput),
          postingTime: postingTimeInput,
          autoPostEnabled,
        });
      }
    } finally {
      setTestingToken(false);
    }
  };

  const handleSaveSettings = async () => {
    setStatusMessage(null);
    try {
      await onSaveConfig({
        pageId: pageIdInput,
        pageName: pageNameInput,
        pageAccessToken: tokenInput,
        daysAhead: Number(daysAheadInput),
        postingTime: postingTimeInput,
        autoPostEnabled,
      });
      setStatusMessage({ type: 'success', text: 'บันทึกการตั้งค่าระบบโพสต์เรียบร้อยแล้ว' });
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'บันทึกไม่สำเร็จ' });
    }
  };

  const handlePublish = async (post: ScheduledPost) => {
    setIsPublishing(post.id);
    setStatusMessage(null);
    try {
      const res = await onPublishNow(post.id, post.content);
      setStatusMessage({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
    } finally {
      setIsPublishing(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    const updated: ScheduledPost = {
      ...editingPost,
      content: editContent,
    };
    await onUpdatePost(updated);
    setEditingPost(null);
    setStatusMessage({ type: 'success', text: 'อัปเดตเนื้อหาโพสต์เรียบร้อย' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Automation Overview & Status */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Facebook className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>ระบบโพสต์ Facebook อัตโนมัติ (ล่วงหน้า 5 วัน)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  วิเคราะห์แนวทางหวยลาวด้วย AI และส่งโพสต์ขึ้นแฟนเพจ Facebook ล่วงหน้าก่อนหวยออก 5 วันโดยอัตโนมัติ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-300 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>กำหนดโพสต์ล่วงหน้า:</span>
                <span className="font-semibold text-amber-400 font-mono-tabular">{config.daysAhead || 5} วัน</span>
                <span>(เวลา {config.postingTime || '09:30'} น.)</span>
              </div>

              <span className="text-slate-600">·</span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">สถานะระบบ:</span>
                {config.autoPostEnabled ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>กำลังทำงานอัตโนมัติ</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                    <Pause className="w-3.5 h-3.5" />
                    <span>หยุดพักชั่วคราว</span>
                  </span>
                )}
              </div>

              <span className="text-slate-600">·</span>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">การเชื่อมต่อเพจ:</span>
                {config.status === 'connected' ? (
                  <span className="text-emerald-400 font-medium">{config.pageName || 'เชื่อมต่อเพจแล้ว'}</span>
                ) : (
                  <span className="text-amber-400 font-medium">โหมดจำลอง (พร้อมทดสอบ/เชื่อมต่อ)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const next = !config.autoPostEnabled;
                setAutoPostEnabled(next);
                onSaveConfig({ autoPostEnabled: next });
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-sm ${
                config.autoPostEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {config.autoPostEnabled ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4" />}
              <span>{config.autoPostEnabled ? 'ระบบอัตโนมัติเปิดอยู่' : 'เปิดใช้งานระบบออโต้'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Alert if any */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-red-950/40 border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeSubTab === 'queue'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarClock className="w-4 h-4 text-blue-400" />
          <span>คิวโพสต์ล่วงหน้า ({posts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeSubTab === 'settings'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4 text-amber-400" />
          <span>ตั้งค่า Facebook Page & เวลา</span>
        </button>

        <button
          onClick={() => setActiveSubTab('guide')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 ${
            activeSubTab === 'guide'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <span>วิธีขอ Page Token ฟรี (Meta API)</span>
        </button>
      </div>

      {/* Sub Tab 1: Queue */}
      {activeSubTab === 'queue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Facebook className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        แนวทางหวยลาว: {post.drawDateThai}
                      </h3>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>กำหนดโพสต์:</span>
                        <span className="text-amber-400 font-mono-tabular">
                          {new Date(post.scheduledTime).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>(ล่วงหน้า {config.daysAhead || 5} วัน)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {post.status === 'published' && (
                      <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>โพสต์แล้ว</span>
                      </span>
                    )}
                    {post.status === 'scheduled' && (
                      <span className="text-xs px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>รอโพสต์อัตโนมัติ</span>
                      </span>
                    )}
                    {post.status === 'failed' && (
                      <span className="text-xs px-2.5 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-red-400" />
                        <span>เกิดข้อผิดพลาด</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Highlight summary badge */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    👑 3 ตัวเต็ง:
                  </span>
                  <span className="px-2.5 py-0.5 bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded font-black font-mono-tabular text-sm shadow-sm">
                    {post.highlightNumbers.threeDigits?.[0] || '---'}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-purple-400 font-semibold">4 ตัวเสริม:</span>
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded font-mono-tabular text-xs">
                    {post.highlightNumbers.fourDigits?.[0] || '----'}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">เด่น:</span>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold font-mono-tabular">
                    {post.highlightNumbers.main}
                  </span>
                  <span className="text-slate-400">รอง:</span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-bold font-mono-tabular">
                    {post.highlightNumbers.secondary}
                  </span>
                  <span className="text-slate-400">2 ตัว:</span>
                  <span className="text-slate-200 font-mono-tabular">
                    {post.highlightNumbers.twoDigits.slice(0, 4).join(', ')}
                  </span>
                </div>

                {/* Content preview snippet */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {post.content}
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewPost(post)}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>ดูตัวอย่าง Facebook Feed</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingPost(post);
                        setEditContent(post.content);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>แก้ไขข้อความ</span>
                    </button>

                    <button
                      onClick={() => handleCopy(post.content, post.id)}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {copiedId === post.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === post.id ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handlePublish(post)}
                    disabled={isPublishing === post.id}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isPublishing === post.id ? 'กำลังส่งโพสต์...' : 'โพสต์ไปยัง Facebook ทันที'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub Tab 2: Settings */}
      {activeSubTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-400" />
              <span>ตั้งค่าการเชื่อมต่อ Facebook Page & เวลาโพสต์อัตโนมัติ</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              เชื่อมต่อกับ Facebook Graph API เพื่อโพสต์ตรงลงแฟนเพจ หรือใช้โหมดจำลองหากต้องการทดสอบระบบ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Auto Schedule Settings */}
            <div className="space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                1. กฎการตั้งเวลาโพสต์ล่วงหน้า
              </h4>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">
                  จำนวนวันโพสต์ล่วงหน้าก่อนหวยออก (วัน):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={daysAheadInput}
                    onChange={(e) => setDaysAheadInput(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white font-mono-tabular focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-xs text-amber-400 font-medium">
                    (แนะนำ: 5 วัน ตามที่กำหนด เพื่อให้ผู้ติดตามเพจมีเวลาเตรียมตัว)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">
                  เวลาที่ต้องการให้ระบบโพสต์อัตโนมัติ:
                </label>
                <input
                  type="time"
                  value={postingTimeInput}
                  onChange={(e) => setPostingTimeInput(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="autoPostCheck"
                  checked={autoPostEnabled}
                  onChange={(e) => setAutoPostEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                />
                <label htmlFor="autoPostCheck" className="text-xs text-slate-200 cursor-pointer">
                  เปิดระบบโพสต์อัตโนมัติเมื่อถึงเวลากำหนด (Auto Background Trigger)
                </label>
              </div>
            </div>

            {/* Facebook Credentials */}
            <div className="space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
              <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center justify-between">
                <span>2. ข้อมูล Facebook Graph API</span>
                <span className="text-[11px] text-slate-500 font-normal">v19.0 API</span>
              </h4>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">ชื่อแฟนเพจ (Page Name):</label>
                <input
                  type="text"
                  value={pageNameInput}
                  onChange={(e) => setPageNameInput(e.target.value)}
                  placeholder="เช่น เพจแนวทางหวยลาว AI มหาเฮง"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Facebook Page ID:</label>
                <input
                  type="text"
                  value={pageIdInput}
                  onChange={(e) => setPageIdInput(e.target.value)}
                  placeholder="เช่น 102938475610293"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Page Access Token:</label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="EAA..."
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-blue-400 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  ต้องการสิทธิ์ pages_manage_posts และ pages_read_engagement (ดูแท็บคู่มือการขอ Token)
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleTestToken}
                  disabled={testingToken || !pageIdInput || !tokenInput}
                  className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Facebook className="w-3.5 h-3.5 text-blue-400" />
                  <span>{testingToken ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ API'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={handleSaveSettings}
              className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-xl transition-all shadow-sm"
            >
              บันทึกการตั้งค่าทั้งหมด
            </button>
          </div>
        </div>
      )}

      {/* Sub Tab 3: Guide */}
      {activeSubTab === 'guide' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            <span>คู่มือการขอ Facebook Page Access Token ภายใน 2 นาที</span>
          </h3>

          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-semibold text-amber-400">ขั้นตอนที่ 1: เข้าสู่ระบบ Meta for Developers</span>
              <p>
                1. เปิดเว็บ{' '}
                <a
                  href="https://developers.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline"
                >
                  developers.facebook.com
                </a>{' '}
                และเข้าสู่ระบบด้วยบัญชี Facebook ของคุณ
              </p>
              <p>2. ไปที่เมนู "My Apps" &gt; "Create App" เลือกประเภท "Business" หรือ "Other"</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-semibold text-amber-400">ขั้นตอนที่ 2: ใช้ Graph API Explorer สร้าง Token</span>
              <p>
                1. ไปที่เมนู Tools &gt;{' '}
                <a
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline"
                >
                  Graph API Explorer
                </a>
              </p>
              <p>2. ในช่อง "User or Page" ให้เลือกแฟนเพจ Facebook ที่คุณเป็นผู้ดูแล (Page Admin)</p>
              <p>3. ในช่อง "Permissions" เพิ่มสิทธิ์ 2 ตัว:</p>
              <ul className="list-disc pl-5 text-amber-300 space-y-1 font-mono">
                <li>pages_manage_posts (สิทธิ์ในการสร้างโพสต์ลงเพจ)</li>
                <li>pages_read_engagement (สิทธิ์ในการอ่านข้อมูลเพจ)</li>
              </ul>
              <p>4. กดปุ่ม "Generate Access Token" และอนุญาตสิทธิ์</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-semibold text-amber-400">ขั้นตอนที่ 3: คัดลอก Page ID & Page Token มาวางในแอป</span>
              <p>1. คัดลอก Token ที่ได้มาวางในช่อง "Page Access Token" ในแท็บตั้งค่า</p>
              <p>2. ไปที่หน้าแฟนเพจของคุณ ดูที่แท็บ "เกี่ยวกับ" (About) เพื่อคัดลอก "Page ID" 15-16 หลัก</p>
              <p>3. กดปุ่ม "ทดสอบการเชื่อมต่อ API" หากขึ้นเชื่อมต่อสำเร็จ ระบบจะโพสต์อัตโนมัติให้ทันที!</p>
            </div>

            <div className="p-3 bg-blue-950/40 border border-blue-800/80 rounded-xl text-blue-200">
              💡 <strong>ข้อดีของแอปนี้:</strong> หากคุณยังไม่มี Token หรือต้องการทดสอบก่อน
              สามารถใช้ระบบ "โหมดจำลอง (Simulator)" เพื่อทดสอบระบบคิว ตัวอย่างโพสต์ และดูภาพการ์ดได้ทันที 100%!
            </div>
          </div>
        </div>
      )}

      {/* Facebook Feed Simulator Modal */}
      {previewPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-white">ตัวอย่างการแสดงผลบน Facebook Feed</span>
              </div>
              <button
                onClick={() => setPreviewPost(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Post Card */}
            <div className="p-4 bg-slate-900 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow">
                  🇱🇦
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {config.pageName || 'เพจแนวทางหวยลาว AI มหาเฮง'}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>5 วันที่แล้ว</span>
                    <span>·</span>
                    <span>🌐 สาธารณะ</span>
                  </div>
                </div>
              </div>

              {/* Text Body */}
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto px-1">
                {previewPost.content}
              </div>

              {/* Banner Attachment Preview */}
              <div className="rounded-xl overflow-hidden border border-amber-500/30 bg-slate-950 relative aspect-[1200/630] flex items-center justify-center p-4">
                <div className="p-4 text-center space-y-2">
                  <div className="text-amber-400 font-bold text-xs uppercase tracking-wider">
                    🇱🇦 แนวทางหวยลาวพัฒนา (10 แหล่งสถิติ & AI)
                  </div>
                  <div className="text-white text-xs">{previewPost.drawDateThai}</div>

                  <div className="pt-2">
                    <span className="text-[11px] text-amber-300 font-semibold block">
                      👑 ฟันธง 3 ตัวเต็ง เม็ดเดียว:
                    </span>
                    <span className="text-3xl font-black text-amber-400 font-mono-tabular tracking-wider drop-shadow-md">
                      {previewPost.highlightNumbers.threeDigits?.[0] || '---'}
                    </span>
                    <span className="text-[10px] text-purple-300 block mt-0.5">
                      (4 ตัวแจ็กพอตเสริม: {previewPost.highlightNumbers.fourDigits?.[0] || '----'})
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-3 bg-slate-900/90 px-3.5 py-1 rounded-full border border-slate-800 text-xs">
                    <span className="text-slate-400">เด่น:</span>
                    <span className="font-bold text-amber-400 font-mono-tabular">
                      {previewPost.highlightNumbers.main}
                    </span>
                    <span className="text-slate-400">รอง:</span>
                    <span className="font-bold text-blue-400 font-mono-tabular">
                      {previewPost.highlightNumbers.secondary}
                    </span>
                  </div>
                </div>
              </div>

              {/* Like / Comment / Share */}
              <div className="border-t border-slate-800 pt-2 flex items-center justify-around text-xs text-slate-400">
                <div className="flex items-center gap-1.5 hover:text-blue-400 cursor-pointer py-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>ถูกใจ (1.2k)</span>
                </div>
                <div className="flex items-center gap-1.5 hover:text-blue-400 cursor-pointer py-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>แสดงความคิดเห็น (348)</span>
                </div>
                <div className="flex items-center gap-1.5 hover:text-blue-400 cursor-pointer py-1">
                  <Share2 className="w-4 h-4" />
                  <span>แชร์ (512)</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                onClick={() => setPreviewPost(null)}
                className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
              >
                ปิด
              </button>
              <button
                onClick={() => {
                  handlePublish(previewPost);
                  setPreviewPost(null);
                }}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>โพสต์จริงทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
              <span className="text-xs font-bold text-white">แก้ไขข้อความโพสต์ Facebook</span>
              <button onClick={() => setEditingPost(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="text-xs text-slate-300">เนื้อหาโพสต์ (รองรับ Emoji และ Hashtags):</label>
              <textarea
                rows={10}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingPost(null)}
                className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
