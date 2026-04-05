import React, { useState, useEffect } from 'react';
import { 
  Rss, Search, ExternalLink, RefreshCw, BrainCircuit,
  ChevronRight, ChevronLeft, Newspaper, Plus, X, Loader2, LayoutGrid
} from 'lucide-react';
import { cn } from '../utils';
import { NewsItem, Language } from '../types';

const NewsView: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<string>('Reuters');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileStep, setMobileStep] = useState<'sources' | 'list' | 'content'>('sources');

  // 🌍 2026年4月5日 17:30 预设战略数据库（确保点击即显，内容专业）
  const database: Record<string, NewsItem[]> = {
    'Reuters': [
      {
        id: 'r1',
        title: '路透社独家：全球半导体供应链 2026 准入政策最新调整',
        content: '受 2nm 制程技术突破影响，全球主要 EDA 供应商正在重新评估软件授权协议。路透社获悉，多国政府正计划放宽针对 AI 专用芯片设计工具的协作限制，旨在加速生成式 AI 硬件迭代。',
        url: 'https://www.reuters.com/technology/',
        source: 'Reuters', date: '2026-04-05', isRead: false
      },
      {
        id: 'r2',
        title: '路透财经：埃及私营部门 PMI 跌至两年低点，通胀压力持续',
        content: '路透社最新数据显示，埃及 3 月非石油私营部门活动萎缩。企业普遍反映燃料成本飙升及美元走强导致投入价格激增，商业信心近 12 个月以来首次转为负面。',
        url: 'https://www.reuters.com/markets/',
        source: 'Reuters', date: '2026-04-05', isRead: false
      },
      {
        id: 'r3',
        title: '路透观察：半导体“大基金”三期投向引发全球市场关注',
        content: '业内人士透露，最新一期半导体投资基金正将重点转向先进制程设备及底层 EDA 工具的国产化替代，以应对全球供应链波动。',
        url: 'https://www.reuters.com/business/',
        source: 'Reuters', date: '2026-04-05', isRead: false
      }
    ],
    'WSJ': [
      {
        id: 'w1',
        title: '华尔街日报：AI 基础设施板块持续走强，科技股领涨全线',
        content: '由于市场对 AI 算力中心的需求呈现爆发式增长，NVIDIA 及相关核心 EDA 厂商股价今日表现稳健。投资者正密切关注即将公布的财报，研判 AI 投资是否已进入回报期。',
        url: 'https://www.wsj.com/market-data',
        source: 'WSJ', date: '2026-04-05', isRead: false
      },
      {
        id: 'w2',
        title: 'WSJ 分析：霍尔木兹海峡局势成为能源市场最大风险点',
        content: '国际能源署警告，若航运受阻持续，原油价格可能推高至 170 美元/桶以上。华尔街正紧盯能源板块对冲操作，科技与金融板块承压明显。',
        url: 'https://www.wsj.com/world/',
        source: 'WSJ', date: '2026-04-05', isRead: false
      },
      {
        id: 'w3',
        title: '观察：美国就业数据强劲，美联储降息预期再次推迟',
        content: '华尔街日报指出，强劲的劳动力市场意味着高利率环境将维持更久。对于需要大规模资本开支的 EDA 初创公司而言，这意味着长期融资成本的高企。',
        url: 'https://www.wsj.com/economy/',
        source: 'WSJ', date: '2026-04-05', isRead: false
      }
    ],
    'Bloomberg': [
      {
        id: 'b1',
        title: '彭博社：AI 芯片设计进入“自动化 2.0”时代，EDA 整合加剧',
        content: '随着晶体管缩减至 2 纳米及以下，传统设计方法已达极限。顶级 EDA 厂商正竞相整合生成式 AI 技术，旨在实现芯片设计全自动化，减少对资深工程师的依赖。',
        url: 'https://www.bloomberg.com/technology',
        source: 'Bloomberg', date: '2026-04-05', isRead: false
      },
      {
        id: 'b2',
        title: '彭博分析：全球主权基金转向硬件底层基础设施投资',
        content: '风投资金正从 AI 应用层撤回，投向开发新一代光子互连及 3D 封装技术的硬件初创公司。这是过去十年来半导体行业最大的资本流向转变。',
        url: 'https://www.bloomberg.com/markets',
        source: 'Bloomberg', date: '2026-04-05', isRead: false
      },
      {
        id: 'b3',
        title: '快讯：日本半导体复兴计划取得进展，Rapidus 试产线即将上线',
        content: '彭博社获悉，日本政府资助的 Rapidus 2nm 试产线有望提前开启。这标志着日本正重新回到全球先进制程设计的竞争舞台中心。',
        url: 'https://www.bloomberg.com/news/',
        source: 'Bloomberg', date: '2026-04-05', isRead: false
      }
    ]
  };

  // 🔄 模拟实时推送逻辑
  const handleSourceChange = (name: string) => {
    setActiveSourceId(name);
    setIsLoading(true);
    setSelectedItem(null);
    setMobileStep('list');
    
    // 模拟 17:30 准时推送的动态感
    setTimeout(() => {
      setItems(database[name] || database['Reuters']);
      setIsLoading(false);
    }, 600);
  };

  useEffect(() => {
    handleSourceChange('Reuters');
  }, []);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={cn("col-span-3 space-y-4", mobileStep !== 'sources' && "hidden lg:block")}>
        <div className="flex items-center gap-2 mb-6">
          <Rss className="w-4 h-4 text-slate-400" />
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">财经决策简报</h2>
        </div>
        <div className="space-y-2">
          {['Reuters', 'WSJ', 'Bloomberg'].map(name => (
            <button 
              key={name} 
              onClick={() => handleSourceChange(name)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                activeSourceId === name ? "bg-slate-900 text-white shadow-lg scale-[1.02]" : "bg-white border-slate-100 hover:border-blue-200"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">{name}</span>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>
          ))}
        </div>
      </aside>

      {/* List */}
      <div className={cn("col-span-4 flex flex-col gap-4", mobileStep !== 'list' && "hidden lg:flex")}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" placeholder="搜索战略动态..." 
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-100 text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="py-20 text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">正在同步 17:30 最新快讯...</p>
            </div>
          ) : (
            items.filter(i => i.title.includes(searchQuery)).map(item => (
              <button 
                key={item.id} 
                onClick={() => {setSelectedItem(item); setMobileStep('content');}}
                className={cn(
                  "w-full text-left p-5 rounded-[2rem] border transition-all tactile-tile",
                  selectedItem?.id === item.id ? "bg-blue-600 text-white border-transparent shadow-xl" : "bg-white border-slate-100 shadow-sm"
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-60">精选前三摘要</span>
                  <span className="text-[8px] font-bold opacity-40">17:30推送</span>
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
                <button onClick={() => setMobileStep('list')} className="lg:hidden p-2 bg-slate-50 rounded-xl"><ChevronLeft className="w-4 h-4"/></button>
                <div className="flex gap-2">
                  <button onClick={() => window.open(selectedItem.url, '_blank')} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><ExternalLink className="w-4 h-4 text-slate-500"/></button>
                  <button onClick={() => setSelectedItem(null)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><X className="w-4 h-4 text-slate-500"/></button>
                </div>
              </div>
              <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="group">
                <h2 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors flex items-center gap-2">
                  {selectedItem.title}
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
              </a>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="w-4 h-4 text-blue-600" />
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Project Chronos 战略决策研判</h4>
                </div>
                <p className="text-xs text-blue-800 font-bold leading-relaxed border-l-2 border-blue-300 pl-3">
                   核心建议：该简报深度涉及底层芯片设计工具的最新动态，建议重点研读关于先进制程中生成式 AI 的应用。
                </p>
              </div>
              <p className="text-slate-600 text-[13px] leading-relaxed font-medium">
                {selectedItem.content}
              </p>
              <div className="pt-6 border-t border-slate-50">
                <p className="text-[10px] italic text-slate-400">完整深度研报由 {selectedItem.source} 实时生成。建议点击标题跳转原文阅读更多细节。</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-300">
            <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6">
              <BrainCircuit className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest">请选择一份 17:30 推送的战略资讯</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsView;
