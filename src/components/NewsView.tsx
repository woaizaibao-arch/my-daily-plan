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
  Trash2,
  CheckCircle2,
  X,
  Loader2,
  LayoutGrid,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../utils';
import { NewsItem, NewsSource, Language } from '../types';
import { GoogleGenAI } from "@google/genai";

const DEFAULT_SOURCES: NewsSource[] = [
  { id: '1', name: 'Bloomberg', url: 'https://www.bloomberg.com/feeds/bview/most-read.xml' },
  { id: '2', name: 'Reuters', url: 'https://www.reuters.com/rssFeed/worldNews' },
  { id: '3', name: 'WSJ', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
  { id: '4', name: 'Financial Times', url: 'https://www.ft.com/?format=rss' },
];

const NewsView: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('news_language');
    return (saved as Language) || 'ZH';
  });
  const [sources, setSources] = useState<NewsSource[]>(() => {
    const saved = localStorage.getItem('news_sources_v2');
    return saved ? JSON.parse(saved) : DEFAULT_SOURCES;
  });
  const [items, setItems] = useState<NewsItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSourceId, setActiveSourceId] = useState<string>('all');
  const [mobileStep, setMobileStep] = useState<'sources' | 'list' | 'content'>('sources');

  useEffect(() => {
    if (selectedItem) setMobileStep('content');
  }, [selectedItem]);

  useEffect(() => {
    localStorage.setItem('news_sources_v2', JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem('news_language', language);
  }, [language]);

  const t = {
    ZH: {
      subscriptions: '订阅源',
      reset: '恢复默认',
      resetConfirm: '确定要恢复默认订阅源吗？',
      allFeeds: '所有资讯',
      searchPlaceholder: '搜索新闻...',
      fetching: '正在获取最新新闻...',
      noNews: '未找到相关新闻',
      aiBrief: 'AI 智能简报',
      analyzing: 'Gemini 正在分析内容...',
      generateSummary: '生成 AI 摘要',
      readMore: '原文可在源站查看。点击外部链接图标阅读更多。',
      selectArticle: '选择一篇文章',
      selectArticleDesc: '从列表中选择一条新闻，查看完整内容和 AI 驱动的智能简报。',
      summaryPrompt: (title: string, content: string) => `请用 3 个关键点总结这篇新闻文章。保持简洁和专业。\n\n标题: ${title}\n内容: ${content}`,
      summaryFailed: '生成摘要失败。',
      lastUpdated: '最后更新',
      nextUpdate: '下次更新：北京时间 08:00'
    },
    EN: {
      subscriptions: 'Subscriptions',
      reset: 'Reset to Defaults',
      resetConfirm: 'Are you sure you want to reset to default sources?',
      allFeeds: 'All Feeds',
      searchPlaceholder: 'Search news...',
      fetching: 'Fetching latest news...',
      noNews: 'No news found',
      aiBrief: 'AI Intelligence Brief',
      analyzing: 'Gemini is analyzing the context...',
      generateSummary: 'Generate AI Summary',
      readMore: 'Full article available at source. Click the external link icon to read more.',
      selectArticle: 'Select an article',
      selectArticleDesc: 'Choose a news item from the list to see the full content and AI-powered intelligence brief.',
      summaryPrompt: (title: string, content: string) => `Summarize this news article in 3 key bullet points. Be concise and professional.\n\nTitle: ${title}\nContent: ${content}`,
      summaryFailed: 'Failed to generate summary.',
      lastUpdated: 'Last Updated',
      nextUpdate: 'Next update at 08:00 Beijing Time'
    }
  }[language];

  const getLatestUpdatePoint = () => {
    const now = new Date();
    // Beijing is UTC+8. 8:00 AM Beijing = 00:00 UTC
    const updatePoint = new Date(now);
    updatePoint.setUTCHours(0, 0, 0, 0);
    if (now.getTime() < updatePoint.getTime()) {
      updatePoint.setUTCDate(updatePoint.getUTCDate() - 1);
    }
    return updatePoint;
  };

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const updateTime = getLatestUpdatePoint().toISOString();
      
      const mockItemsEN: NewsItem[] = [
        // Bloomberg
        {
          id: 'b1',
          title: 'Bloomberg: Global Markets React to Central Bank Signals',
          content: 'Major indices showed volatility today as global central banks signaled a potential pause in rate hikes, citing cooling inflation data but tight labor markets.',
          url: 'https://www.bloomberg.com/news/articles/global-markets-react',
          source: 'Bloomberg',
          date: updateTime,
          isRead: false
        },
        {
          id: 'b2',
          title: 'Bloomberg: Energy Transition Accelerates in Emerging Economies',
          content: 'A new report highlights a surge in renewable energy investments across Southeast Asia and Africa, driven by falling costs of solar and wind technology.',
          url: 'https://www.bloomberg.com/news/articles/energy-transition',
          source: 'Bloomberg',
          date: updateTime,
          isRead: false
        },
        {
          id: 'b3',
          title: 'Bloomberg: Tech Sector Braces for New Antitrust Regulations',
          content: 'Regulatory bodies are proposing stricter rules for digital platforms, focusing on data portability and fair competition in the app store ecosystem.',
          url: 'https://www.bloomberg.com/news/articles/tech-antitrust',
          source: 'Bloomberg',
          date: updateTime,
          isRead: false
        },
        // Reuters
        {
          id: 'r1',
          title: 'Reuters: Tech Giants Face New Regulatory Scrutiny in EU',
          content: 'The European Commission has opened a series of investigations into the content privacy practices of several major tech firms, focusing on how user information is shared across platforms.',
          url: 'https://www.reuters.com/business/tech-giants-scrutiny',
          source: 'Reuters',
          date: updateTime,
          isRead: false
        },
        {
          id: 'r2',
          title: 'Reuters: Global Shipping Rates Stabilize as Port Congestion Eases',
          content: 'Freight costs have reached their lowest levels in 18 months, providing relief for global retailers ahead of the peak holiday shopping season.',
          url: 'https://www.reuters.com/business/shipping-rates',
          source: 'Reuters',
          date: updateTime,
          isRead: false
        },
        {
          id: 'r3',
          title: 'Reuters: Sustainable Finance Gains Momentum in Corporate Bonds',
          content: 'Green bond issuance has hit record highs this quarter, as companies face increasing pressure from investors to align with ESG targets.',
          url: 'https://www.reuters.com/business/green-bonds',
          source: 'Reuters',
          date: updateTime,
          isRead: false
        },
        // WSJ
        {
          id: 'w1',
          title: 'WSJ: Supply Chain Disruptions Ease as Port Congestion Clears',
          content: 'A new report from the WSJ notes that global shipping delays have reached a two-year low, providing relief for retailers ahead of the holiday season.',
          url: 'https://www.wsj.com/articles/supply-chain-relief',
          source: 'WSJ',
          date: updateTime,
          isRead: false
        },
        {
          id: 'w2',
          title: 'WSJ: Remote Work Trends Reshape Commercial Real Estate',
          content: 'Office vacancy rates in major cities continue to climb, forcing developers to rethink urban spaces and consider residential conversions.',
          url: 'https://www.wsj.com/articles/office-real-estate',
          source: 'WSJ',
          date: updateTime,
          isRead: false
        },
        {
          id: 'w3',
          title: 'WSJ: Consumer Spending Remains Resilient Despite Inflation',
          content: 'Retail sales data shows that households are continuing to spend on travel and services, even as prices for essential goods remain elevated.',
          url: 'https://www.wsj.com/articles/consumer-spending',
          source: 'WSJ',
          date: updateTime,
          isRead: false
        },
        // Financial Times
        {
          id: 'f1',
          title: 'FT: Emerging Markets Attract Record Capital Inflows',
          content: 'Investors are pouring capital into emerging markets at a record pace, driven by attractive valuations and improving economic outlooks in Southeast Asia, according to the Financial Times.',
          url: 'https://www.ft.com/content/emerging-markets-inflow',
          source: 'Financial Times',
          date: updateTime,
          isRead: false
        },
        {
          id: 'f2',
          title: 'FT: Central Banks Navigate "Last Mile" of Inflation Battle',
          content: 'Policy makers are debating the timing of potential rate cuts as core inflation proves stickier than expected in several advanced economies.',
          url: 'https://www.ft.com/content/inflation-battle',
          source: 'Financial Times',
          date: updateTime,
          isRead: false
        },
        {
          id: 'f3',
          title: 'FT: Venture Capital Funding Shifts Toward AI Infrastructure',
          content: 'Investment patterns are changing as VCs prioritize startups building the hardware and software foundations for generative AI models.',
          url: 'https://www.ft.com/content/vc-ai-funding',
          source: 'Financial Times',
          date: updateTime,
          isRead: false
        }
      ];

      const mockItemsZH: NewsItem[] = [
        // Bloomberg
        {
          id: 'b1',
          title: '彭博社：全球市场对央行信号做出反应',
          content: '由于全球央行暗示可能暂停加息，理由是通胀数据降温但劳动力市场依然紧缺，主要指数今天出现波动。',
          url: 'https://www.bloomberg.com/news/articles/global-markets-react',
          source: 'Bloomberg',
          date: updateTime,
          isRead: false
        },
        {
          id: 'b2',
          title: '彭博社：新兴经济体能源转型加速',
          content: '一份新报告强调，在太阳能和风能技术成本下降的推动下，东南亚和非洲的可再生能源投资激增。',
          url: 'https://www.bloomberg.com/news/articles/energy-transition',
          source: 'Bloomberg',
          date: updateTime,
          isRead: false
        },
        {
          id: 'b3',
          title: '彭博社：科技行业准备迎接新的反垄断法规',
          content: '监管机构正提议对数字平台实施更严格的规则，重点关注应用商店生态系统中的数据可移植性和公平竞争。',
          url: 'https://www.bloomberg.com/news/articles/tech-antitrust',
          source: 'Bloomberg',
          date: updateTime,
          isRead: false
        },
        // Reuters
        {
          id: 'r1',
          title: '路透社：科技巨头在欧盟面临新的监管审查',
          content: '欧盟委员会已对几家主要科技公司的内容隐私做法展开一系列调查，重点关注用户信息如何在平台间共享。',
          url: 'https://www.reuters.com/business/tech-giants-scrutiny',
          source: 'Reuters',
          date: updateTime,
          isRead: false
        },
        {
          id: 'r2',
          title: '路透社：随着港口拥堵缓解，全球运费趋于稳定',
          content: '货运成本已降至 18 个月以来的最低水平，在假期购物高峰季节到来之前为全球零售商提供了缓解。',
          url: 'https://www.reuters.com/business/shipping-rates',
          source: 'Reuters',
          date: updateTime,
          isRead: false
        },
        {
          id: 'r3',
          title: '路透社：可持续金融在公司债券中势头强劲',
          content: '本季度绿色债券发行量创下历史新高，因为公司面临来自投资者越来越大的压力，要求其符合 ESG 目标。',
          url: 'https://www.reuters.com/business/green-bonds',
          source: 'Reuters',
          date: updateTime,
          isRead: false
        },
        // WSJ
        {
          id: 'w1',
          title: '华尔街日报：随着港口拥堵清除，供应链中断缓解',
          content: '《华尔街日报》的一份新报告指出，全球航运延误已降至两年来的最低点，在假期季节到来之前为零售商提供了缓解。',
          url: 'https://www.wsj.com/articles/supply-chain-relief',
          source: 'WSJ',
          date: updateTime,
          isRead: false
        },
        {
          id: 'w2',
          title: '华尔街日报：远程办公趋势重塑商业地产',
          content: '主要城市的写字楼空置率继续攀升，迫使开发商重新思考城市空间并考虑住宅改造。',
          url: 'https://www.wsj.com/articles/office-real-estate',
          source: 'WSJ',
          date: updateTime,
          isRead: false
        },
        {
          id: 'w3',
          title: '华尔街日报：尽管存在通胀，消费者支出仍具韧性',
          content: '零售销售数据显示，尽管基本商品价格仍然高企，但家庭仍在继续在旅游和服务上支出。',
          url: 'https://www.wsj.com/articles/consumer-spending',
          source: 'WSJ',
          date: updateTime,
          isRead: false
        },
        // Financial Times
        {
          id: 'f1',
          title: '金融时报：新兴市场吸引创纪录的资本流入',
          content: '据《金融时报》报道，在东南亚估值吸引力和经济前景改善的推动下，投资者正以创纪录的速度向新兴市场投入资本。',
          url: 'https://www.ft.com/content/emerging-markets-inflow',
          source: 'Financial Times',
          date: updateTime,
          isRead: false
        },
        {
          id: 'f2',
          title: '金融时报：央行应对通胀战役的“最后一英里”',
          content: '由于几个先进经济体的核心通胀证明比预期更具粘性，政策制定者正在辩论潜在降息的时机。',
          url: 'https://www.ft.com/content/inflation-battle',
          source: 'Financial Times',
          date: updateTime,
          isRead: false
        },
        {
          id: 'f3',
          title: '金融时报：风险投资转向 AI 基础设施',
          content: '随着风投优先考虑为生成式 AI 模型构建硬件和软件基础的初创公司，投资模式正在发生变化。',
          url: 'https://www.ft.com/content/vc-ai-funding',
          source: 'Financial Times',
          date: updateTime,
          isRead: false
        }
      ];
      
      setItems(language === 'ZH' ? mockItemsZH : mockItemsEN);
      localStorage.setItem('news_last_fetch_v2', new Date().toISOString());
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [language]);

  const generateSummary = async (item: NewsItem) => {
    if (item.summary) return;
    
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: t.summaryPrompt(item.title, item.content),
      });
      
      const summary = response.text || t.summaryFailed;
      
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, summary } : i));
      if (selectedItem?.id === item.id) {
        setSelectedItem(prev => prev ? { ...prev, summary } : null);
      }
    } catch (error) {
      console.error('AI Summary failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const filteredItems = items.filter(item => 
    (activeSourceId === 'all' || item.source === activeSourceId) &&
    (item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     item.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-180px)] overflow-hidden">
      {/* Sidebar: Sources */}
      <aside className={cn(
        "col-span-1 lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar",
        mobileStep !== 'sources' && "hidden lg:block"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[10px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Rss className="w-4 h-4" /> {t.subscriptions}
            </h2>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg w-fit">
              <button 
                onClick={() => setLanguage('ZH')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[9px] font-black transition-all",
                  language === 'ZH' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400"
                )}
              >
                ZH
              </button>
              <button 
                onClick={() => setLanguage('EN')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[9px] font-black transition-all",
                  language === 'EN' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400"
                )}
              >
                EN
              </button>
            </div>
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <p className="text-[8px] lg:text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">{t.lastUpdated}</p>
              <p className="text-[9px] lg:text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {getLatestUpdatePoint().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[7px] lg:text-[8px] font-medium text-slate-400 mt-1 italic">{t.nextUpdate}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (confirm(t.resetConfirm)) {
                  setSources(DEFAULT_SOURCES);
                  setActiveSourceId('all');
                }
              }}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
              title={t.reset}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <button 
            onClick={() => {
              setActiveSourceId('all');
              setMobileStep('list');
            }}
            className={cn(
              "w-full flex items-center gap-3 p-3 lg:p-4 rounded-2xl border transition-all tactile-tile",
              activeSourceId === 'all' 
                ? "bg-slate-900 dark:bg-slate-700 text-white border-transparent shadow-lg" 
                : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-200"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest">{t.allFeeds}</span>
          </button>

          {sources.map(source => (
            <button 
              key={source.id}
              onClick={() => {
                setActiveSourceId(source.name);
                setMobileStep('list');
              }}
              className={cn(
                "w-full flex items-center justify-between p-3 lg:p-4 rounded-2xl border transition-all tactile-tile",
                activeSourceId === source.name
                  ? "bg-slate-900 dark:bg-slate-700 text-white border-transparent shadow-lg" 
                  : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-200"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 lg:w-8 lg:h-8 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-[10px] lg:text-xs font-black text-blue-600">
                  {source.name[0]}
                </div>
                <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest">{source.name}</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40" />
            </button>
          ))}
        </div>
      </aside>

      {/* List Column */}
      <div className={cn(
        "col-span-1 lg:col-span-4 flex flex-col gap-4 overflow-hidden",
        mobileStep !== 'list' && "hidden lg:flex"
      )}>
        <div className="flex items-center gap-2 lg:hidden">
          <button 
            onClick={() => setMobileStep('sources')}
            className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">{t.subscriptions}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 lg:py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[11px] lg:text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar min-h-[400px] lg:min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-[10px] font-black uppercase tracking-widest">{t.fetching}</p>
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  if (!item.summary) generateSummary(item);
                  setMobileStep('content');
                }}
                className={cn(
                  "w-full text-left p-4 md:p-5 rounded-2xl md:rounded-3xl border transition-all tactile-tile group",
                  selectedItem?.id === item.id
                    ? "bg-blue-600 border-transparent shadow-xl shadow-blue-500/20"
                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                    selectedItem?.id === item.id ? "bg-white/20 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  )}>
                    {item.source}
                  </span>
                  <span className={cn(
                    "text-[8px] md:text-[9px] font-bold",
                    selectedItem?.id === item.id ? "text-white/60" : "text-slate-400"
                  )}>
                    {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className={cn(
                  "text-xs md:text-sm font-black leading-tight mb-2 line-clamp-2",
                  selectedItem?.id === item.id ? "text-white" : "text-slate-800 dark:text-white"
                )}>
                  {item.title}
                </h3>
                <p className={cn(
                  "text-[10px] md:text-[11px] font-medium line-clamp-2",
                  selectedItem?.id === item.id ? "text-white/80" : "text-slate-500 dark:text-slate-400"
                )}>
                  {item.content}
                </p>
              </button>
            ))
          ) : (
            <div className="text-center py-20 text-slate-400">
              <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">{t.noNews}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Column */}
      <div className={cn(
        "col-span-1 lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl lg:rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col tactile-tile",
        mobileStep !== 'content' && "hidden lg:flex"
      )}>
        {selectedItem ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-5 lg:p-8 border-b border-slate-50 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setMobileStep('list')}
                    className="p-2 bg-slate-50 dark:bg-slate-900/50 text-slate-500 rounded-xl lg:hidden"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl lg:rounded-2xl flex items-center justify-center">
                    <Newspaper className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[8px] lg:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{selectedItem.source}</p>
                    <p className="text-[10px] lg:text-xs font-bold text-slate-400">{new Date(selectedItem.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => window.open(selectedItem.url, '_blank')}
                    className="p-2 lg:p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-500 rounded-xl lg:rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedItem(null);
                      setMobileStep('list');
                    }}
                    className="p-2 lg:p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-500 rounded-xl lg:rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <a 
  href={selectedItem.url} 
  target="_blank" 
  rel="noopener noreferrer"
  className="hover:text-blue-600 transition-all cursor-pointer group/title"
>
  <h2 className="text-lg lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-2">
    {selectedItem.title}
    <ExternalLink className="w-4 h-4 opacity-0 group-hover/title:opacity-100 transition-opacity" />
  </h2>
</a>
            </div>

            <div className="flex-1 overflow-y-auto p-5 lg:p-8 space-y-6 lg:space-y-8 custom-scrollbar">
              {/* AI Summary Section */}
              <div className="p-5 lg:p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl lg:rounded-3xl border border-blue-100 dark:border-blue-900/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <BrainCircuit className="w-12 h-12 lg:w-16 lg:h-16 text-blue-600" />
                </div>
                <div className="flex items-center gap-2 mb-3 lg:mb-4 relative">
                  <BrainCircuit className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" />
                  <h4 className="text-[9px] lg:text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{t.aiBrief}</h4>
                </div>
                
                {isSummarizing ? (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <p className="text-[11px] lg:text-xs font-bold text-blue-600/60 italic">{t.analyzing}</p>
                  </div>
                ) : selectedItem.summary ? (
                  <div className="prose prose-slate dark:prose-invert prose-xs max-w-none">
                    <Markdown>{selectedItem.summary}</Markdown>
                  </div>
                ) : (
                  <button 
                    onClick={() => generateSummary(selectedItem)}
                    className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-blue-600 text-white rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    {t.generateSummary}
                  </button>
                )}
              </div>

              <div className="text-slate-600 dark:text-slate-300 text-[13px] lg:text-sm font-medium leading-relaxed">
                {selectedItem.content}
                <p className="mt-4 italic text-slate-400 text-[11px] lg:text-xs">
                  {t.readMore}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 text-center">
            <div className="w-16 h-16 lg:w-24 lg:h-24 bg-slate-50 dark:bg-slate-900/50 rounded-2xl lg:rounded-[2.5rem] flex items-center justify-center mb-6 lg:mb-8">
              <BrainCircuit className="w-8 h-8 lg:w-12 lg:h-12 text-slate-200 dark:text-slate-700" />
            </div>
            <h3 className="text-lg lg:text-xl font-black text-slate-800 dark:text-white mb-2">{t.selectArticle}</h3>
            <p className="text-[11px] lg:text-sm font-bold text-slate-400 max-w-xs">
              {t.selectArticleDesc}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsView;
