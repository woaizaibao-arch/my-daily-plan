import React, { useState, useEffect } from 'react';
import { 
  Rss, Search, ExternalLink, RefreshCw, BrainCircuit,
  ChevronRight, ChevronLeft, Newspaper, Plus, X, Loader2, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../utils';
import { NewsItem, NewsSource, Language } from '../types';
import { GoogleGenAI } from "@google/genai";

const DEFAULT_SOURCES: NewsSource[] = [
  { id: '1', name: 'Bloomberg', url: 'https://www.bloomberg.com/feeds/bview/most-read.xml' },
  { id: '2', name: 'Reuters', url: 'https://rsshub.app/reuters/world/china' },
  { id: '3', name: 'WSJ', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
];

const NewsView: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('news_language') as Language || 'ZH');
  const [sources] = useState<NewsSource[]>(DEFAULT_SOURCES);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSourceId, setActiveSourceId] = useState<string>('all');
  const [mobileStep, setMobileStep] = useState<'sources' | 'list' | 'content'>('sources');

  const t = {
    ZH: {
      subscriptions: '订阅源', allFeeds: '精选全站', searchPlaceholder: '搜索...',
      fetching: '正在抓取前 3 条核心简报...', noNews: '未找到相关新闻',
      aiBrief: 'AI 战略简报', analyzing: '正在分析...',
      generateSummary: '生成 AI 摘要', readMore: '点击标题或图标阅读原文。',
      selectArticle: '选择决策参考',
      summaryPrompt: (t: string, c: string) => `请用 3 个关键点总结这篇新闻。重点关注对行业布局的影响。\n\n标题: ${t}\n内容: ${c}`,
    },
    EN: {
      subscriptions: 'Sources', allFeeds: 'Top 3 Global', searchPlaceholder: 'Search...',
      fetching: 'Fetching Top 3 Highlights...', noNews: 'No news found',
      aiBrief: 'AI Brief', analyzing: 'Analyzing...',
      generateSummary: 'AI Summary', readMore: 'Click title for full article.',
      selectArticle: 'Select an article',
      summaryPrompt: (t: string, c: string) => `Summarize in 3 key points for a CEO.\n\nTitle: ${t}\nContent: ${c}`,
    }
  }[language];

  // 核心逻辑：根据点击的 Source 实时抓取前 3 条
  const fetchNews = async (sourceName: string) => {
    setIsLoading(true);
    setSelectedItem(null); // 切换源时清空选中的内容
    
    const backupItems: NewsItem[] = [
      { id: 'b1', title: `[${sourceName}] 2026 行业战略趋势报告`, content: '实时抓取正在排队中，请点击上方刷新按钮或稍后再试...', url: '#', source: sourceName, date: new Date().toISOString(), isRead: false }
    ];

    try {
      const proxy = "https://api.allorigins.win/raw?url=";
      // 匹配对应源的 RSS 地址
      let targetUrl = "https://rsshub.app/reuters/world/china"; 
      if (sourceName === 'Bloomberg') targetUrl = "https://www.bloomberg.com/feeds/bview/most-read.xml";
      if (sourceName === 'WSJ') targetUrl = "https://feeds.a.dj.com/rss/RSSWorldNews.xml";
      if (sourceName === 'all') targetUrl = "https://www.reuters.com/rssFeed/worldNews";

      const response = await fetch(`${proxy}${encodeURIComponent(targetUrl)}`);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      
      // 【关键修改点】：使用 .slice(0, 3) 确保只显示 3 条最重要的
      const xmlItems = Array.from(xml.querySelectorAll("item")).slice(0, 3);

      if (xmlItems.length > 0) {
        const fetched = xmlItems.map((el, idx) => ({
          id: `f-${sourceName}-${idx}`,
          title: el.querySelector("title")?.textContent || "Loading...",
          content: el.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 200) + "..." || "",
          url: el.querySelector("link")?.textContent || "#",
          source: sourceName === 'all' ? '财经动态' : sourceName,
          date: new Date().toISOString(),
          isRead: false
        }));
        setItems(fetched);
      } else {
        setItems(backupItems);
      }
    } catch (e) {
      setItems(backupItems);
    } finally {
      setIsLoading(false);
    }
  };

  // 监听 activeSourceId 的变化，实现点击即抓取
  useEffect(() => {
    fetchNews(activeSourceId);
  }, [activeSourceId, language]);

  const generateSummary = async (item: NewsItem) => {
    if (item.summary || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: "YOUR_GEMINI_KEY" });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: t.summaryPrompt(item.title, item.content),
      });
      const summary = response.text || "摘要生成失败";
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, summary } : i));
      if (selectedItem?.id === item.id) setSelectedItem(prev => prev ? { ...prev, summary } : null);
    } catch (e) { console.error(e); } finally { setIsSummarizing(false); }
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] overflow-hidden">
      {/* Sidebar */}
      <aside className={cn("col-span-3 space-y-4 overflow-y-auto pr-2 custom-scrollbar", mobileStep !== 'sources' && "hidden lg:block")}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Rss className="w-4 h-4" /> {t.subscriptions}
          </h2>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setLanguage('ZH')} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black", language === 'ZH' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>ZH</button>
            <button onClick={() => setLanguage('EN')} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black", language === 'EN' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>EN</button>
          </div>
        </div>
        
        <div className="space-y-2">
          <button onClick={() => setActiveSourceId('all')} className={cn("w-full flex items-center gap-3 p-4 rounded-2xl border transition-all", activeSourceId === 'all' ? "bg-slate-900 text-white shadow-lg" : "bg-white border-slate-100")}>
            <LayoutGrid className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-widest">{t.allFeeds}</span>
          </button>
          {sources.map(source => (
            <button key={source.id} onClick={() => setActiveSourceId(source.name)} className={cn("w-full flex items-center justify-between p-4 rounded-2xl border transition-all", activeSourceId === source.name ? "bg-slate-900 text-white shadow-lg" : "bg-white border-slate-100")}>
              <span className="text-[10px] font-black uppercase tracking-widest">{source.name}</span>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>
          ))}
        </div>
      </aside>

      {/* List */}
      <div className={cn("col-span-4 flex flex-col gap-4 overflow-hidden", mobileStep !== 'list' && "hidden lg:flex")}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 text-xs font-bold outline-none" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {isLoading ? <div className="py-20 text-center text-slate-400 animate-pulse">{t.fetching}</div> : filteredItems.map(item => (
            <button key={item.id} onClick={() => { setSelectedItem(item); if(!item.summary) generateSummary(item); setMobileStep('content'); }} className={cn("w-full text-left p-5 rounded-[2rem] border transition-all tactile-tile", selectedItem?.id === item.id ? "bg-blue-600 text-white border-transparent shadow-xl" : "bg-white dark:bg-slate-800 border-slate-100")}>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2 block">{item.source}</span>
              <h3 className="text-sm font-black leading-tight mb-2 line-clamp-2">{item.title}</h3>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={cn("col-span-5 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col", mobileStep !== 'content' && "hidden lg:flex")}>
        {selectedItem ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setMobileStep('list')} className="lg:hidden p-2 bg-slate-50 rounded-xl"><ChevronLeft /></button>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-50 rounded-xl"><Newspaper className="text-blue-600 w-5 h-5" /></div>
                   <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedItem.source}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => window.open(selectedItem.url, '_blank')} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100"><ExternalLink className="w-4 h-4" /></button>
                  <button onClick={() => setSelectedItem(null)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100"><X className="w-4 h-4" /></button>
                </div>
              </div>
              {/* 大标题点击跳转 */}
              <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-all cursor-pointer group/title">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
                  {selectedItem.title}
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                </h2>
              </a>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4"><BrainCircuit className="w-4 h-4 text-blue-600" /><h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t.aiBrief}</h4></div>
                {isSummarizing ? <div className="flex items-center gap-3 py-2 text-blue-600 animate-pulse italic text-xs">{t.analyzing}</div> : <div className="prose prose-slate prose-xs"><Markdown>{selectedItem.summary || ""}</Markdown></div>}
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{selectedItem.content}</p>
              <p className="text-[10px] italic text-slate-400 mt-4">{t.readMore}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6"><BrainCircuit className="w-10 h-10 text-slate-200" /></div>
            <h3 className="text-xl font-black text-slate-800 mb-2">{t.selectArticle}</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsView;
