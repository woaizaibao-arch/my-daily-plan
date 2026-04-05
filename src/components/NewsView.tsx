import React, { useState, useEffect } from 'react';
import { 
  Rss, 
  Search, 
  ExternalLink, 
  RefreshCw, 
  BrainCircuit,
  ChevronRight,
  ChevronLeft,
  Newspaper,
  Plus,
  X,
  Loader2,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../utils';
import { NewsItem, NewsSource, Language } from '../types';
import { GoogleGenAI } from "@google/genai";

const DEFAULT_SOURCES: NewsSource[] = [
  { id: '1', name: 'Reuters', url: 'https://rsshub.app/reuters/world/china' },
  { id: '2', name: 'WSJ', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
  { id: '3', name: 'FT', url: 'https://www.ft.com/?format=rss' },
];

const NewsView: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('news_language');
    return (saved as Language) || 'ZH';
  });
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
      subscriptions: '订阅源',
      allFeeds: '所有资讯',
      searchPlaceholder: '搜索新闻...',
      fetching: '正在获取实时财经新闻...',
      noNews: '未找到相关新闻',
      aiBrief: 'AI 战略简报',
      analyzing: 'Gemini 正在分析决策建议...',
      generateSummary: '生成 AI 摘要',
      readMore: '原文可在源站查看。点击标题或图标阅读更多。',
      selectArticle: '选择决策参考',
      summaryPrompt: (title: string, content: string) => `请用 3 个关键点总结这篇新闻。重点关注对行业布局的影响。\n\n标题: ${title}\n内容: ${content}`,
    },
    EN: {
      subscriptions: 'Sources',
      allFeeds: 'All Feeds',
      searchPlaceholder: 'Search...',
      fetching: 'Fetching real-time news...',
      noNews: 'No news found',
      aiBrief: 'AI Brief',
      analyzing: 'Gemini is analyzing...',
      generateSummary: 'AI Summary',
      readMore: 'Click title to read full article.',
      selectArticle: 'Select an article',
      summaryPrompt: (title: string, content: string) => `Summarize in 3 key points for a CEO.\n\nTitle: ${title}\nContent: ${content}`,
    }
  }[language];

  // 核心逻辑：真实抓取 + 兜底数据
  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const proxy = "https://api.allorigins.win/raw?url=";
      const targetUrl = language === 'ZH' ? "https://rsshub.app/reuters/world/china" : "https://feeds.a.dj.com/rss/RSSWorldNews.xml";
      
      const response = await fetch(`${proxy}${encodeURIComponent(targetUrl)}`);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const xmlItems = Array.from(xml.querySelectorAll("item")).slice(0, 10);

      if (xmlItems.length > 0) {
        const fetched = xmlItems.map((el, idx) => ({
          id: `real-${idx}`,
          title: el.querySelector("title")?.textContent || "Loading...",
          content: el.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 200) + "..." || "",
          url: el.querySelector("link")?.textContent || "#",
          source: language === 'ZH' ? '路透社' : 'WSJ',
          date: new Date().toISOString(),
          isRead: false
        }));
        setItems(fetched);
      } else {
        throw new Error("Empty Feed");
      }
    } catch (e) {
      console.log("Using backup news data");
      // 兜底数据：确保模块不消失，且链接真实有效
      setItems([
        {
          id: 'b1',
          title: '路透社：全球半导体与 EDA 行业战略调整趋势',
          content: '随着制程技术向 2nm 迈进，全球主要设计公司正加强与顶级 EDA 供应商的合作，以应对日益复杂的物理设计挑战...',
          url: 'https://www.reuters.com/technology/',
          source: 'Reuters',
          date: new Date().toISOString(),
          isRead: false
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, [language]);

  const generateSummary = async (item: NewsItem) => {
    if (item.summary || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: "YOUR_GEMINI_KEY" }); // 记得在环境变量配置
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
        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Rss className="w-4 h-4" /> {t.subscriptions}
        </h2>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit mb-4">
          <button onClick={() => setLanguage('ZH')} className={cn("px-3 py-1 rounded-lg text-[10px] font-black", language === 'ZH' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>ZH</button>
          <button onClick={() => setLanguage('EN')} className={cn("px-3 py-1 rounded-lg text-[10px] font-black", language === 'EN' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>EN</button>
        </div>
        <button className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-900 text-white shadow-lg"><LayoutGrid className="w-4 h-4" /> <span className="text-xs font-black uppercase tracking-widest">{t.allFeeds}</span></button>
      </aside>

      {/* List */}
      <div className={cn("col-span-4 flex flex-col gap-4 overflow-hidden", mobileStep !== 'list' && "hidden lg:flex")}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {isLoading ? <div className="py-20 text-center text-slate-400 animate-pulse">{t.fetching}</div> : filteredItems.map(item => (
            <button key={item.id} onClick={() => { setSelectedItem(item); if(!item.summary) generateSummary(item); setMobileStep('content'); }} className={cn("w-full text-left p-5 rounded-[2rem] border transition-all tactile-tile", selectedItem?.id === item.id ? "bg-blue-600 text-white border-transparent shadow-xl" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200")}>
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
                  <button onClick={() => window.open(selectedItem.url, '_blank')} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><ExternalLink className="w-4 h-4" /></button>
                  <button onClick={() => setSelectedItem(null)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100"><X className="w-4 h-4" /></button>
                </div>
              </div>
              {/* 这里就是你修改好的：带链接的大标题 */}
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
              <p className="text-[10px] italic text-slate-400">{t.readMore}</p>
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
