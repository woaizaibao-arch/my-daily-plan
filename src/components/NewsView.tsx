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

  const t = {
    ZH: {
      subscriptions: '全球财经源', allFeeds: '重磅精选', searchPlaceholder: '搜索市场动态...',
      fetching: '正在同步 17:30 全球头条...', noNews: '暂无数据',
      aiBrief: 'Project Chronos 宏观研判',
      aiDesc: '本文涉及全球市场核心动向，对资产配置及风险规避有重要参考价值。',
      readMore: '完整深度报告由原网发布。建议点击标题跳转原文阅读。',
      selectArticle: '请选择今日 17:30 核心财经简报',
      syncTime: '17:30推送', top3: '重磅头条'
    },
    EN: {
      subscriptions: 'Global Feeds', allFeeds: 'Breaking News', searchPlaceholder: 'Search markets...',
      fetching: 'Syncing 17:30 Daily Headliners...', noNews: 'No news found',
      aiBrief: 'Project Chronos Macro Insight',
      aiDesc: 'High-impact market movement. Critical for asset allocation and risk management.',
      readMore: 'Full reports available at source. Click title to read more.',
      selectArticle: 'Select a 17:30 Strategic Brief',
      syncTime: '17:30 Sent', top3: 'Top Headlines'
    }
  }[language];

  // 🌍 纯净财经数据库：完全剔除 EDA 内容，聚焦重磅财经
  const database: Record<Language, Record<string, NewsItem[]>> = {
    ZH: {
      'Reuters': [
        { id: 'rz1', title: '路透社：埃及 3 月 PMI 跌至两年低点，中东冲突加剧通胀隐忧', content: '路透社最新数据显示，埃及私营部门活动萎缩严重。受地缘局势影响，美元走强及燃料成本飙升正导致投入价格激增，商业信心近一年来首次转为负面。', url: 'https://www.reuters.com/markets/world-city/war-weighs-egypts-private-sector-pmi-hits-near-two-year-low-2026-04-05/', source: 'Reuters', date: '2026-04-05', isRead: false },
        { id: 'rz2', title: '路透社：布伦特原油站稳 90 美元上方，市场紧盯着霍尔木兹海峡', content: '由于市场担忧中东冲突可能导致霍尔木兹海峡航运受阻，国际油价持续走强。分析师警告，若冲突升级，全球原油供应可能面临重大缺口。', url: 'https://www.reuters.com/business/energy/', source: 'Reuters', date: '2026-04-05', isRead: false },
        { id: 'rz3', title: '财经动态：中国服务业扩张速度加快，抵消制造业出口放缓压力', content: '最新财新服务业指数显示，随着内需回暖，服务业表现强劲，为宏观经济复苏提供了重要支撑，提振了投资者对亚太市场的信心。', url: 'https://www.reuters.com/world/china/', source: 'Reuters', date: '2026-04-05', isRead: false }
      ],
      'WSJ': [
        { id: 'wz1', title: '华尔街日报：美国非农数据意外强劲，美联储 6 月降息概率骤降', content: '强劲的劳动力市场数据让美联储陷入两难。目前市场普遍预期基准利率将维持更久（Higher-for-longer），华尔街正重新评估债券收益率曲线。', url: 'https://www.wsj.com/economy/central-banking/', source: 'WSJ', date: '2026-04-05', isRead: false },
        { id: 'wz2', title: 'WSJ 观察：科技巨头转向精简模式，投资者关注 AI 支出回报率', content: '在一波大规模 AI 投入后，股东开始要求科技巨头证明相关支出的变现能力。这导致纳斯达克指数近期波动加剧，市场重心开始重回盈利基本面。', url: 'https://www.wsj.com/tech/', source: 'WSJ', date: '2026-04-05', isRead: false },
        { id: 'wz3', title: '重磅：全球央行黄金储备创历史新高，对冲地缘政治风险意图明显', content: '华尔街日报报道称，以中国、印度及土耳其为首的央行正在大规模买入实物黄金。这反映出全球对美元体系的依赖度正随着脱钩趋势而发生微妙转变。', url: 'https://www.wsj.com/market-data/', source: 'WSJ', date: '2026-04-05', isRead: false }
      ],
      'Bloomberg': [
        { id: 'bz1', title: '彭博社：AI 投融资热潮冷却，资金正从应用层转向底层硬件算力', content: '彭博行业研究指出，风投资金正大规模撤离估值过高的 AI 软件初创公司，转而投向开发新一代光子互连及高速存储技术的硬件公司，旨在解决算力瓶颈。', url: 'https://www.bloomberg.com/technology', source: 'Bloomberg', date: '2026-04-05', isRead: false },
        { id: 'bz2', title: '彭博分析：霍尔木兹海峡若受阻，全球原油或飙升至 170 美元/桶', content: 'IEA 警告称，波斯湾航运通道是全球能源的咽喉。一旦发生重大阻断，全球通胀将再次失控，这对于尚未完全走出通胀阴影的西方国家将是毁灭性的。', url: 'https://www.bloomberg.com/markets', source: 'Bloomberg', date: '2026-04-05', isRead: false },
        { id: 'bz3', title: '快讯：日本银行暗示将逐步退出负利率政策，日元套利交易大平仓', content: '彭博获悉，日银最新表态显示其对通胀目标的信心增强。这引发了全球资本市场的连锁反应，投资者正在紧盯日元兑美元的汇率波动。', url: 'https://www.bloomberg.com/news/', source: 'Bloomberg', date: '2026-04-05', isRead: false }
      ]
    },
    EN: {
      'Reuters': [
        { id: 're1', title: 'Reuters: Egypt March PMI Slumps to 2-Year Low as Conflict Hits Business', content: 'Input prices surge due to a stronger dollar and rising fuel costs, causing business confidence to hit a 12-month low amid regional tensions.', url: 'https://www.reuters.com/markets/world-city/war-weighs-egypts-private-sector-pmi-hits-near-two-year-low-2026-04-05/', source: 'Reuters', date: '2026-04-05', isRead: false },
        { id: 're2', title: 'Reuters: Brent Oil Holds Above $90 as Markets Eye Strait of Hormuz Risks', content: 'Fears of a potential escalation in the Middle East causing supply disruptions keep international oil prices elevated near multi-month highs.', url: 'https://www.reuters.com/business/energy/', source: 'Reuters', date: '2026-04-05', isRead: false },
        { id: 're3', title: 'Global Markets: China Services Expansion Gains Momentum Amid Demand Recovery', content: 'New service sector data highlights a robust recovery, offsetting weaker export demand and boosting investor confidence in the APAC region.', url: 'https://www.reuters.com/world/china/', source: 'Reuters', date: '2026-04-05', isRead: false }
      ],
      'WSJ': [
        { id: 'we1', title: 'WSJ: Blockbuster Jobs Data Puts Fed Rate Cut Hopes on Thin Ice', content: 'A surprisingly resilient labor market suggests that the "higher-for-longer" rate environment is here to stay, forcing a major re-evaluation of bond yields.', url: 'https://www.wsj.com/economy/central-banking/', source: 'WSJ', date: '2026-04-05', isRead: false },
        { id: 'we2', title: 'WSJ Analysis: Tech Giants Shift Focus to ROI as AI Hype Meets Reality', content: 'Investors are now demanding proof of monetization for massive AI capital expenditures, leading to increased volatility across the Nasdaq index.', url: 'https://www.wsj.com/tech/', source: 'WSJ', date: '2026-04-05', isRead: false },
        { id: 'we3', title: 'Breaking: Central Bank Gold Reserves Hit All-Time High Amid Geopolitical Risk', content: 'Central banks in emerging markets continue to diversify away from the dollar, signaling a fundamental shift in the global financial order.', url: 'https://www.wsj.com/market-data/', source: 'WSJ', date: '2026-04-05', isRead: false }
      ],
      'Bloomberg': [
        { id: 'be1', title: 'Bloomberg: AI Funding Pivot Seen from Apps Toward Core Computing Hardware', content: 'Capital is fleeing overvalued AI software startups in favor of hardware firms developing photonic interconnects and high-bandwidth memory.', url: 'https://www.bloomberg.com/technology', source: 'Bloomberg', date: '2026-04-05', isRead: false },
        { id: 'be2', title: 'Bloomberg: IEA Warns Crude Could Hit $170 if Hormuz Strait is Blocked', content: 'Energy analyst warns that a major disruption in the Persian Gulf would reignite global inflation and push Western economies toward recession.', url: 'https://www.bloomberg.com/markets', source: 'Bloomberg', date: '2026-04-05', isRead: false },
        { id: 'be3', title: 'Bloomberg: BoJ Signals Pivot from Negative Rates, Sparking Carry Trade Exit', content: 'Growing confidence in inflation targets triggers global market reactions as investors prepare for a fundamental shift in Japanese monetary policy.', url: 'https://www.bloomberg.com/news/', source: 'Bloomberg', date: '2026-04-05', isRead: false }
      ]
    }
  };

  const handleSourceChange = (sourceName: string, lang: Language) => {
    setActiveSourceId(sourceName);
    setIsLoading(true);
    setSelectedItem(null);
    setTimeout(() => {
      setItems(database[lang][sourceName] || database[lang]['Reuters']);
      setIsLoading(false);
    }, 600);
  };

  useEffect(() => { handleSourceChange(activeSourceId, language); }, [language]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] overflow-hidden font-sans">
      <aside className={cn("col-span-3 space-y-4", mobileStep !== 'sources' && "hidden lg:block")}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Rss className="w-4 h-4 text-slate-400" />
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">{t.subscriptions}</h2>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
            <button onClick={() => setLanguage('ZH')} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black transition-all", language === 'ZH' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>ZH</button>
            <button onClick={() => setLanguage('EN')} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black transition-all", language === 'EN' ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}>EN</button>
          </div>
        </div>
        <div className="space-y-2">
          {['Reuters', 'WSJ', 'Bloomberg'].map(name => (
            <button key={name} onClick={() => handleSourceChange(name, language)} className={cn("w-full flex items-center justify-between p-4 rounded-2xl border transition-all", activeSourceId === name ? "bg-slate-900 text-white shadow-lg" : "bg-white border-slate-100 hover:border-blue-200")}>
              <span className="text-[10px] font-black uppercase tracking-widest">{name}</span>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>
          ))}
        </div>
      </aside>

      <div className={cn("col-span-4 flex flex-col gap-4", mobileStep !== 'list' && "hidden lg:flex")}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder={t.searchPlaceholder} className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-100 text-xs font-bold outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="py-20 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.fetching}</p>
            </div>
          ) : (
            items.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
              <button key={item.id} onClick={() => {setSelectedItem(item); setMobileStep('content');}} className={cn("w-full text-left p-5 rounded-[2rem] border transition-all tactile-tile", selectedItem?.id === item.id ? "bg-blue-600 text-white border-transparent shadow-xl" : "bg-white border-slate-100 shadow-sm")}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{t.top3}</span>
                  <span className="text-[8px] font-bold opacity-40">{t.syncTime}</span>
                </div>
                <h3 className="text-sm font-black leading-tight line-clamp-2">{item.title}</h3>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={cn("col-span-5 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col", mobileStep !== 'content' && "hidden lg:flex")}>
        {selectedItem ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setMobileStep('list')} className="lg:hidden p-2 bg-slate-50 rounded-xl"><ChevronLeft className="w-4 h-4"/></button>
                <div className="flex gap-2">
                  <button onClick={() => window.open(selectedItem.url, '_blank')} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><ExternalLink className="w-4 h-4"/></button>
                  <button onClick={() => setSelectedItem(null)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all"><X className="w-4 h-4"/></button>
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
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t.aiBrief}</h4>
                </div>
                <p className="text-xs text-blue-800 font-bold leading-relaxed border-l-2 border-blue-300 pl-3">{t.aiDesc}</p>
              </div>
              <p className="text-slate-600 text-[13px] leading-relaxed font-medium">{selectedItem.content}</p>
              <div className="pt-6 border-t border-slate-50"><p className="text-[10px] italic text-slate-400">{t.readMore}</p></div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-300">
            <BrainCircuit className="w-12 h-12 mb-6 opacity-20" /><p className="text-xs font-black uppercase tracking-widest">{t.selectArticle}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsView;
