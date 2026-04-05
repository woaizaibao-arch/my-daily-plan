import React, { useState, useEffect } from 'react';
import { 
  Rss, Search, ExternalLink, RefreshCw, BrainCircuit,
  ChevronRight, ChevronLeft, Newspaper, Plus, X, Loader2, LayoutGrid
} from 'lucide-react';
import { cn } from '../utils';
import { NewsItem, Language } from '../types';

const NewsView: React.FC = () => {
  const [language, setLanguage] = useState<Language>('ZH');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<string>('Reuters');
  const [mobileStep, setMobileStep] = useState<'sources' | 'list' | 'content'>('sources');

  // 1. 真实的 RSS 订阅源（这些源提供了每篇文章的独立长链接）
  const sources = [
    { id: '1', name: 'Reuters', url: 'https://www.reuters.com/arc/outboundfeeds/rss/concepts/china/' },
    { id: '2', name: 'WSJ', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
    { id: '3', name: 'Bloomberg', url: 'https://rsshub.app/bloomberg/index' },
  ];

  const t = {
    ZH: { fetching: '正在同步全球实时头条...', select: '请从左侧选择决策简报', aiBrief: 'Project Chronos 战略分析' },
    EN: { fetching: 'Syncing Global Live Feeds...', select: 'Select a Strategic Brief', aiBrief: 'Project Chronos Insight' }
  }[language];

  // 2. 核心：动态抓取函数，确保获取到的是具体的 Article URL
  const fetchRealNews = async (sourceName: string) => {
    setIsLoading(true);
    setSelectedItem(null);
    
    const sourceObj = sources.find(s => s.name === sourceName) || sources[0];
    // 使用公开的 RSS2JSON 转换服务，这是目前前端获取真实链接最稳的办法
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(sourceObj.url)}`; 

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === 'ok' && data.items) {
        // 关键点：从 API 返回的原始数据中提取真实的每篇文章链接 (el.link)
        const fetched = data.items.slice(0, 3).map((el: any, idx: number) => ({
          id: `live-${sourceName}-${idx}`,
          title: el.title,
          url: el.link, // 这里就是你要求的精准长链接
          content: el.description?.replace(/<[^>]*>/g, '').slice(0, 180) + "...",
          source: sourceName,
          date: el.pubDate || new Date().toISOString(),
          isRead: false
        }));
        setItems(fetched);
      }
    } catch (e) {
      console.error("抓取失败:", e);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealNews(activeSourceId);
  }, [activeSourceId]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={cn("col-span-3 space-y-4", mobileStep !== 'sources' && "hidden lg:block")}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">财经智库</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
            <button onClick={() => setLanguage('ZH')} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black transition-all", language === 'ZH' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>ZH</button>
            <button onClick={() => setLanguage('EN')} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black transition-all", language === 'EN' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>EN</button>
          </div>
        </div>
        <div className="space-y-2">
          {sources.map(s => (
            <button key={s.id} onClick={() => setActiveSourceId(s.name)} className={cn("w-full flex items-center justify-between p-4 rounded-2xl border transition-all tactile-tile", activeSourceId === s.name ? "bg-slate-900 text-white shadow-lg scale-[1.02]" : "bg-white border-slate-100 hover:border-blue-200")}>
              <span className="text-[10px] font-black uppercase tracking-widest">{s.name}</span>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>
          ))}
        </div>
      </aside>

      {/* List */}
      <div className={cn("col-span-4 flex flex-col gap-4", mobileStep !== 'list' && "hidden lg:flex")}>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.fetching}</p>
            </div>
          ) : (
            items.map(item => (
              <button key={item.id} onClick={() => {setSelectedItem(item); setMobileStep('content');}} className={cn("w-full text-left p-5 rounded-[2rem] border transition-all tactile-tile", selectedItem?.id === item.id ? "bg-blue-600 text-white border-transparent shadow-xl" : "bg-white border-slate-100 shadow-sm")}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-black uppercase opacity-60">LIVE 更新</span>
                  <span className="text-[8px] font-bold opacity-30">17:30推送</span>
                </div>
                <h3 className="text-sm font-black leading-tight line-clamp-2">{item.title}</h3>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn("col-span-5 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col", mobileStep !== 'content' && "hidden lg:flex")}>
        {selectedItem ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setMobileStep('list')} className="lg:hidden p-2"><ChevronLeft className="w-4 h-4"/></button>
                <button onClick={() => window.open(selectedItem.url, '_blank')} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><ExternalLink className="w-4 h-4 text-slate-500"/></button>
              </div>
              {/* 这里就是你要求的核心：大标题点击后精准跳转到独立文章 */}
              <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="group block">
                <h2 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors flex items-center gap-2">
                  {selectedItem.title} <ExternalLink className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
              </a>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="w-4 h-4 text-blue-600" />
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t.aiBrief}</h4>
                </div>
                <p className="text-xs text-blue-800 font-bold leading-relaxed border-l-2 border-blue-300 pl-3">
                  正在研判该报道对半导体及 EDA 行业的深层影响... 建议点击上方标题阅读完整报告。
                </p>
              </div>
              <p className="text-slate-600 text-[13px] leading-relaxed font-medium">{selectedItem.content}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-300">
            <BrainCircuit className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-xs font-black uppercase tracking-widest">{t.select}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsView;
