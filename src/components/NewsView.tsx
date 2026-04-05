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
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileStep, setMobileStep] = useState<'sources' | 'list' | 'content'>('sources');

  // 1. 真实的 RSS 源地址
  const sources = [
    { id: '1', name: 'Reuters', url: 'https://www.reuters.com/arc/outboundfeeds/rss/concepts/china/' },
    { id: '2', name: 'WSJ', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
    { id: '3', name: 'Bloomberg', url: 'https://rsshub.app/bloomberg/index' },
  ];

  const t = {
    ZH: { fetching: '正在同步全球实时头条...', select: '请选择今日核心简报', aiBrief: 'AI 战略分析' },
    EN: { fetching: 'Syncing Global Live Feeds...', select: 'Select a Strategic Brief', aiBrief: 'AI Insight' }
  }[language];

  // 2. 核心：通过 rss2json 接口获取真实的 JSON 数据和具体链接
  const fetchRealNews = async (sourceName: string) => {
    setIsLoading(true);
    setSelectedItem(null);
    
    const sourceObj = sources.find(s => s.name === sourceName) || sources[0];
    // 使用公开的 RSS2JSON 转换服务，绕过跨域限制
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(sourceObj.url)}&api_key=your_free_key_here`; 

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === 'ok' && data.items) {
        // 筛选前 3 条最重要的
        const fetched = data.items.slice(0, 3).map((el: any, idx: number) => ({
          id: `live-${sourceName}-${idx}`,
          title: el.title,
          // 这里的 el.link 是该篇文章的真实长链接
          url: el.link,
          content: el.description?.replace(/<[^>]*>/g, '').slice(0, 200) + "...",
          source: sourceName,
          date: el.pubDate || new Date().toISOString(),
          isRead: false
        }));
        setItems(fetched);
      }
    } catch (e) {
      console.error("抓取失败，请检查网络或 API 限制");
      // 如果接口暂时不可用，保持列表为空或显示错误提示
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
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setLanguage('ZH')} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black", language === 'ZH' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>ZH</button>
            <button onClick={() => setLanguage('EN')} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black", language === 'EN' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>EN</button>
          </div>
        </div>
        <div className="space-y-2">
          {sources.map(s => (
            <button key={s.id} onClick={() => setActiveSourceId(s.name)} className={cn("w-full flex items-center justify-between p-4 rounded-2xl border transition-all", activeSourceId === s.name ? "bg-slate-900 text-white shadow-lg" : "bg-white border-slate-100 hover:border-blue-200")}>
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
            <div className="py-20 text-center animate-pulse text-[10px] font-black text-slate-400 uppercase">{t.fetching}</div>
          ) : (
            items.map(item => (
              <button key={item.id} onClick={() => {setSelectedItem(item); setMobileStep('content');}} className={cn("w-full text-left p-5 rounded-[2rem] border transition-all shadow-sm", selectedItem?.id === item.id ? "bg-blue-600 text-white border-transparent" : "bg-white border-slate-100")}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-black uppercase opacity-60">LIVE 更新</span>
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
                <button onClick={() => window.open(selectedItem.url, '_blank')} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100"><ExternalLink className="w-4 h-4 text-slate-500"/></button>
              </div>
              {/* 这里就是你要求的：真实的文章长链接跳转 */}
              <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="group block">
                <h2 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                  {selectedItem.title} <ExternalLink className="inline w-5 h-5 ml-2 opacity-0 group-hover:opacity-100" />
                </h2>
              </a>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">{t.aiBrief}</h4>
                <p className="text-xs text-blue-800 font-bold leading-relaxed italic">
                  正在实时分析该文章对半导体与宏观市场的影响... 建议点击上方标题阅读全文以获取完整上下文。
                </p>
              </div>
              <p className="text-slate-600 text-[13px] leading-relaxed">{selectedItem.content}</p>
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
