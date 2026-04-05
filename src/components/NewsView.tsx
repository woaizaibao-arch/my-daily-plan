import React, { useState, useEffect } from 'react';
import { 
  Rss, Search, ExternalLink, BrainCircuit, ChevronRight, 
  ChevronLeft, X, Loader2, Globe, AlertCircle
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

  // 1. 实时 RSS 订阅源（包含中文镜像源）
  const sourceMap: Record<Language, Record<string, string>> = {
    ZH: {
      'Reuters': 'https://rsshub.app/reuters/world/china',
      'WSJ': 'https://rsshub.app/wsj/zh-cn/market',
      'Bloomberg': 'https://rsshub.app/bloomberg/index'
    },
    EN: {
      'Reuters': 'https://www.reuters.com/arc/outboundfeeds/rss/concepts/china/',
      'WSJ': 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
      'Bloomberg': 'https://rsshub.app/bloomberg/index'
    }
  };

  const t = {
    ZH: { fetching: '正在同步全球实时头条...', select: '请选择今日决策简报', aiBrief: '战略决策研判', sync: '17:30 自动抓取' },
    EN: { fetching: 'Syncing Live Intelligence...', select: 'Select a Strategic Brief', aiBrief: 'Strategic Insight', sync: '17:30 Auto-Sync' }
  }[language];

  // 2. 核心抓取函数：精准链接解析
  const fetchLiveNews = async (sourceName: string, lang: Language) => {
    setIsLoading(true);
    setSelectedItem(null);
    
    const rssUrl = sourceMap[lang][sourceName];
    // 使用公开的 RSS 转 JSON 接口，这是目前绕过跨域最稳定的商业方案
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&_t=${Date.now()}`;

    try {
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (data.status === 'ok' && data.items && data.items.length > 0) {
        const fetched = data.items.slice(0, 3).map((el: any, idx: number) => {
          // 【精准跳转逻辑】
          // 很多源把真实链接藏在 guid 或 link 里，这里做强校验
          let articleUrl = el.link || el.guid || "";
          
          // 针对 WSJ 的特殊处理，确保不跳频道页
          if (articleUrl.includes('rssWorldNews')) {
            articleUrl = el.guid; 
          }

          return {
            id: `live-${sourceName}-${idx}-${Date.now()}`,
            title: el.title,
            url: articleUrl,
            content: el.description?.replace(/<[^>]*>/g, '').slice(0, 200) + "...",
            source: sourceName,
            date: el.pubDate || new Date().toISOString(),
            isRead: false
          };
        });
        setItems(fetched);
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error("抓取失败，请检查 RSSHub 节点状态:", e);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveNews(activeSourceId, language);
  }, [activeSourceId, language]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={cn("col-span-3 space-y-4", mobileStep !== 'sources' && "hidden lg:block")}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <h2 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">实时情报源</h2>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            <button onClick={() => setLanguage('ZH')} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black transition-all", language === 'ZH' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>ZH</button>
            <button onClick={() => setLanguage('EN')} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black transition-all", language === 'EN' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>EN</button>
          </div>
        </div>
        <div className="space-y-2">
          {['Reuters', 'WSJ', 'Bloomberg'].map(name => (
            <button key={name} onClick={() => setActiveSourceId(name)} className={cn("w-full flex items-center justify-between p-4 rounded-2xl border transition-all", activeSourceId === name ? "bg-slate-900 text-white shadow-lg" : "bg-white border-slate-100 hover:border-blue-200 shadow-sm")}>
              <span className="text-[10px] font-black uppercase tracking-widest">{name}</span>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>
          ))}
        </div>
      </aside>

      {/* List Column */}
      <div className={cn("col-span-4 flex flex-col gap-4", mobileStep !== 'list' && "hidden lg:flex")}>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar px-1">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.fetching}</p>
            </div>
          ) : items.length > 0 ? (
            items.map(item => (
              <button key={item.id} onClick={() => {setSelectedItem(item); setMobileStep('content');}} className={cn("w-full text-left p-5 rounded-[2rem] border transition-all shadow-sm tactile-tile", selectedItem?.id === item.id ? "bg-blue-600 text-white border-transparent" : "bg-white border-slate-100")}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-black uppercase opacity-60">LIVE • {item.source}</span>
                  <span className="text-[8px] font-bold opacity-30">{t.sync}</span>
                </div>
                <h3 className="text-sm font-black leading-tight line-clamp-2">{item.title}</h3>
              </button>
            ))
          ) : (
            <div className="py-20 text-center text-slate-300">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">抓取受限，请稍后重试</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Column */}
      <div className={cn("col-span-5 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col", mobileStep !== 'content' && "hidden lg:flex")}>
        {selectedItem ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setMobileStep('list')} className="lg:hidden p-2"><ChevronLeft className="w-4 h-4"/></button>
                <button onClick={() => window.open(selectedItem.url, '_blank')} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><ExternalLink className="w-4 h-4 text-slate-500"/></button>
              </div>
              {/* 大标题点击精准跳转到文章详情页 */}
              <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="group block cursor-pointer">
                <h2 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors flex items-center gap-2">
                  {selectedItem.title} <ExternalLink className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
              </a>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="w-4 h-4 text-blue-600" />
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t.aiBrief}</h4>
                </div>
                <p className="text-xs text-blue-800 font-bold leading-relaxed border-l-2 border-blue-300 pl-3 italic">
                  正在实时解析该文章对半导体 EDA 行业及全球市场的战略影响... 请点击标题阅读完整原文。
                </p>
              </div>
              <p className="text-slate-600 text-[13.5px] leading-relaxed font-medium">{selectedItem.content}</p>
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
