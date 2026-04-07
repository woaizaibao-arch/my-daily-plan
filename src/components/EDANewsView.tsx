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
  Sparkles,
  Cpu,
  Microscope,
  Binary,
  Terminal,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../utils';
import { NewsItem, NewsSource, Language } from '../types';
import { GoogleGenAI } from "@google/genai";

const SOURCES_EN: NewsSource[] = [
  { id: '1', name: 'SemiEngineering (Business)', url: 'https://semiengineering.com/category/business/feed/' },
  { id: '2', name: 'DIGITIMES (Semiconductor)', url: 'https://www.digitimes.com/rss/semiconductor.xml' },
  { id: '3', name: 'Cadence / Synopsys IR', url: 'https://news.synopsys.com/index.php?s=20295&pagetemplate=rss' },
  { id: '4', name: 'CSIS / SIA News', url: 'https://www.sia-online.org/feed/' },
  { id: '5', name: 'EE Times (Executive View)', url: 'https://www.eetimes.com/category/executive-view/feed/' },
];

const SOURCES_ZH: NewsSource[] = [
  { id: 'z1', name: '机器之心', url: 'https://www.jiqizhixin.com/' },
  { id: 'z2', name: '36氪', url: 'https://36kr.com/' },
  { id: 'z3', name: 'IT之家', url: 'https://www.ithome.com/' },
  { id: 'z4', name: '电子工程专辑', url: 'https://www.eet-china.com/' },
];

const EDANewsView: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('eda_news_language_v2');
    return (saved as Language) || 'ZH';
  });
  const [sources, setSources] = useState<NewsSource[]>(() => {
    const saved = localStorage.getItem('eda_news_sources_v2');
    if (saved) return JSON.parse(saved);
    return language === 'ZH' ? SOURCES_ZH : SOURCES_EN;
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
    localStorage.setItem('eda_news_sources_v2', JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem('eda_news_language_v2', language);
    // When language changes, if we haven't customized sources, update them to defaults for that language
    const saved = localStorage.getItem('eda_news_sources_v2');
    if (!saved) {
      setSources(language === 'ZH' ? SOURCES_ZH : SOURCES_EN);
    }
    setActiveSourceId('all');
    fetchNews();
  }, [language]);

  const t = {
    ZH: {
      subscriptions: '战略情报源',
      reset: '恢复默认',
      resetConfirm: '确定要恢复默认 EDA 战略情报源吗？',
      allFeeds: '全产业链',
      searchPlaceholder: '搜索战略关键词 (M&A, Policy, Foundry)...',
      fetching: '正在同步全球战略情报...',
      noNews: '未发现相关战略简报',
      aiBrief: 'Strategy Consultant Insight',
      analyzing: '正在进行战略价值评估...',
      generateSummary: '进行战略价值评估',
      readMore: '原文可在源站查看。点击外部链接图标阅读更多。',
      viewOriginal: '查看原文',
      selectArticle: '选择战略简报',
      selectArticleDesc: '从列表中选择一条半导体战略动态，查看世界级战略顾问为您准备的深度分析。',
      summaryPrompt: (title: string, content: string) => `Role: 你是一位世界级的半导体行业战略分析师（Strategy Consultant）。
Instructions:
严苛过滤：立即丢弃所有关于“代码实现”、“工具 Bug 修复”、“具体 API 更改”或“底层算法公式”的技术文章。
价值判定：只处理涉及以下关键词的内容：M&A (收并购), Market Share (市场份额), IP Litigation (知识产权诉讼), Policy (政策), Roadmap (战略路线图), Foundry (代工厂合作)。
深度加工：不要只是翻译，要进行“老板视角”的二次创作。

Output Template (输出格式):
🔴/🟢 [简短有力的标题]
事件快报: 用一句话说明发生了什么。
老板视角 (Key Takeaways):
竞争影响: 该事件如何削弱或增强了主要竞争对手（如 Synopsys/Cadence）的地位？
市场机会: 我们的公司是否有切入点或需要规避的政策风险？
关键词: #[标签]

标题: ${title}
内容: ${content}`,
      summaryFailed: '分析失败。',
      lastUpdated: '最后更新',
      nextUpdate: '下次更新：北京时间 08:00'
    },
    EN: {
      subscriptions: 'Strategic Intelligence',
      reset: 'Reset to Defaults',
      resetConfirm: 'Are you sure you want to reset default EDA sources?',
      allFeeds: 'Full Chain',
      searchPlaceholder: 'Search strategic keywords (M&A, Policy, Foundry)...',
      fetching: 'Syncing global strategic intelligence...',
      noNews: 'No strategic briefs found',
      aiBrief: 'Strategy Consultant Insight',
      analyzing: 'Performing strategic value assessment...',
      generateSummary: 'Perform Strategic Value Assessment',
      readMore: 'Full article available at source. Click the external link icon to read more.',
      viewOriginal: 'View Original',
      selectArticle: 'Select Strategic Brief',
      selectArticleDesc: 'Choose a semiconductor strategic update from the list to see the deep analysis prepared by a world-class strategy consultant.',
      summaryPrompt: (title: string, content: string) => `Role: You are a world-class semiconductor industry Strategy Consultant.
Instructions:
Strict Filtering: Immediately discard all technical articles about "code implementation", "tool bug fixes", "specific API changes", or "low-level algorithm formulas".
Value Judgment: Only process content involving the following keywords: M&A, Market Share, IP Litigation, Policy, Roadmap, Foundry.
Deep Processing: Do not just translate; perform a secondary creation from a "boss's perspective".

Output Template:
🔴/🟢 [Short and powerful title]
Event Brief: Explain what happened in one sentence.
Boss's Perspective (Key Takeaways):
Competitive Impact: How does this event weaken or strengthen the position of major competitors (e.g., Synopsys/Cadence)?
Market Opportunity: Does our company have an entry point or policy risks to avoid?
Keywords: #[Tag]

Title: ${title}
Content: ${content}`,
      summaryFailed: 'Analysis failed.',
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
        // SemiEngineering (Business)
        {
          id: 'se1',
          title: 'M&A: Synopsys Completes Acquisition of Ansys to Bolster Simulation Portfolio',
          content: 'The $35 billion deal marks a significant consolidation in the EDA and simulation market, aiming to provide a unified design-to-analysis workflow.',
          url: 'https://semiengineering.com/synopsys-ansys-acquisition-complete',
          source: 'SemiEngineering (Business)',
          date: updateTime,
          isRead: false,
          category: 'M&A'
        },
        {
          id: 'se2',
          title: 'Market Share: Cadence Gains Ground in Digital Implementation Tools',
          content: 'Recent market reports indicate a shift in market share as top-tier semiconductor companies adopt new AI-driven placement and routing solutions.',
          url: 'https://semiengineering.com/eda-market-share-shift',
          source: 'SemiEngineering (Business)',
          date: updateTime,
          isRead: false,
          category: 'Market Share'
        },
        {
          id: 'se3',
          title: 'Foundry: TSMC and EDA Partners Align on 2nm Design Infrastructure',
          content: 'The collaboration ensures that EDA tools are fully optimized for the unique requirements of Gate-All-Around (GAA) transistors at the 2nm node.',
          url: 'https://semiengineering.com/tsmc-2nm-eda-alignment',
          source: 'SemiEngineering (Business)',
          date: updateTime,
          isRead: false,
          category: 'Foundry'
        },
        // DIGITIMES (Semiconductor)
        {
          id: 'd1',
          title: 'Supply Chain: Global Foundries Expand Capacity Amid Rising AI Chip Demand',
          content: 'Major foundries are accelerating their expansion plans to meet the unprecedented demand for high-performance computing and AI accelerators.',
          url: 'https://www.digitimes.com/news/a20240401PD200.html',
          source: 'DIGITIMES (Semiconductor)',
          date: updateTime,
          isRead: false,
          category: 'Supply Chain'
        },
        {
          id: 'd2',
          title: 'Foundry: Samsung Electronics Secures Major 3nm Orders from AI Startups',
          content: 'Samsung\'s 3nm GAA process is gaining traction among AI chip designers looking for improved power efficiency and performance.',
          url: 'https://www.digitimes.com/news/a20240401PD201.html',
          source: 'DIGITIMES (Semiconductor)',
          date: updateTime,
          isRead: false,
          category: 'Foundry'
        },
        {
          id: 'd3',
          title: 'Policy: South Korea Announces New Subsidies for Semiconductor R&D',
          content: 'The government aims to strengthen the domestic semiconductor ecosystem by providing significant financial support for advanced research and development.',
          url: 'https://www.digitimes.com/news/a20240401PD202.html',
          source: 'DIGITIMES (Semiconductor)',
          date: updateTime,
          isRead: false,
          category: 'Policy'
        },
        // Cadence / Synopsys IR
        {
          id: 'ir1',
          title: 'Roadmap: Synopsys Unveils Next-Generation AI-Driven EDA Suite',
          content: 'The new roadmap focuses on deep integration of generative AI across the entire design flow to automate repetitive tasks and optimize results.',
          url: 'https://news.synopsys.com/roadmap-ai-eda',
          source: 'Cadence / Synopsys IR',
          date: updateTime,
          isRead: false,
          category: 'Roadmap'
        },
        {
          id: 'ir2',
          title: 'Strategy: Cadence Expands Partnership with Leading Hyperscalers',
          content: 'The strategic collaboration aims to optimize EDA workloads for cloud environments and develop custom silicon solutions for data centers.',
          url: 'https://www.cadence.com/ir-strategy-hyperscale',
          source: 'Cadence / Synopsys IR',
          date: updateTime,
          isRead: false,
          category: 'Roadmap'
        },
        {
          id: 'ir3',
          title: 'M&A: Synopsys Announces Strategic Investment in AI Chip Startup',
          content: 'The investment aligns with Synopsys\' strategy to foster innovation in the AI hardware space and integrate new technologies into its EDA tools.',
          url: 'https://news.synopsys.com/ir-ai-investment',
          source: 'Cadence / Synopsys IR',
          date: updateTime,
          isRead: false,
          category: 'M&A'
        },
        // CSIS / SIA News
        {
          id: 'cs1',
          title: 'Policy: US Government Finalizes Rules for CHIPS Act Subsidies',
          content: 'The new regulations provide clarity on the requirements for receiving federal funding and the restrictions on expanding capacity in certain regions.',
          url: 'https://www.sia-online.org/chips-act-final-rules',
          source: 'CSIS / SIA News',
          date: updateTime,
          isRead: false,
          category: 'Policy'
        },
        {
          id: 'cs2',
          title: 'Policy: Export Restrictions on Advanced Semiconductor Equipment Tighten',
          content: 'New updates to export control lists aim to further restrict the flow of advanced lithography and etching tools to specific markets.',
          url: 'https://www.sia-online.org/export-restrictions-update',
          source: 'CSIS / SIA News',
          date: updateTime,
          isRead: false,
          category: 'Policy'
        },
        {
          id: 'cs3',
          title: 'IP Litigation: Major EDA Vendors Settle Long-Standing Patent Dispute',
          content: 'The settlement includes a cross-licensing agreement that allows both companies to use each other\'s patented technologies in their respective tools.',
          url: 'https://www.sia-online.org/eda-patent-settlement',
          source: 'CSIS / SIA News',
          date: updateTime,
          isRead: false,
          category: 'IP Litigation'
        },
        // EE Times (Executive View)
        {
          id: 'ee1',
          title: 'Roadmap: CEO Interview - The Future of EDA in the Age of AI',
          content: 'Industry leaders discuss the transformative impact of AI on chip design and the strategic shifts required to stay competitive in a rapidly evolving market.',
          url: 'https://www.eetimes.com/ceo-interview-eda-ai-future',
          source: 'EE Times (Executive View)',
          date: updateTime,
          isRead: false,
          category: 'Roadmap'
        },
        {
          id: 'ee2',
          title: 'Strategy: Navigating the Geopolitical Landscape of the Semiconductor Industry',
          content: 'Executives share their perspectives on the challenges of operating in a fragmented global market and the importance of supply chain resilience.',
          url: 'https://www.eetimes.com/semiconductor-geopolitics-strategy',
          source: 'EE Times (Executive View)',
          date: updateTime,
          isRead: false,
          category: 'Roadmap'
        },
        {
          id: 'ee3',
          title: 'Market Share: The Rise of Custom Silicon and Its Impact on EDA Vendors',
          content: 'As more system companies develop their own chips, EDA vendors are adapting their business models to support custom design requirements.',
          url: 'https://www.eetimes.com/custom-silicon-eda-impact',
          source: 'EE Times (Executive View)',
          date: updateTime,
          isRead: false,
          category: 'Market Share'
        }
      ];

      const mockItemsZH: NewsItem[] = [
        // 机器之心 (jiqizhixin.com)
        {
          id: 'se1',
          title: '收并购：Synopsys 完成对 Ansys 的收购，增强仿真产品组合',
          content: '这笔 350 亿美元的交易标志着 EDA 和仿真市场的重大整合，旨在提供统一的设计到分析工作流程。',
          url: 'https://www.jiqizhixin.com/',
          source: '机器之心',
          date: updateTime,
          isRead: false,
          category: 'M&A'
        },
        {
          id: 'se2',
          title: '市场份额：Cadence 在数字实现工具领域取得进展',
          content: '最近的市场报告显示，随着顶级半导体公司采用新的 AI 驱动的布局布线解决方案，市场份额正在发生转移。',
          url: 'https://www.jiqizhixin.com/',
          source: '机器之心',
          date: updateTime,
          isRead: false,
          category: 'Market Share'
        },
        {
          id: 'se3',
          title: '代工厂：TSMC 与 EDA 合作伙伴就 2nm 设计基础设施达成一致',
          content: '此次合作确保了 EDA 工具针对 2nm 节点全环绕栅极 (GAA) 晶体管的独特要求进行了全面优化。',
          url: 'https://www.jiqizhixin.com/',
          source: '机器之心',
          date: updateTime,
          isRead: false,
          category: 'Foundry'
        },
        // 36氪 (36kr.com)
        {
          id: 'd1',
          title: '供应链：全球代工厂在 AI 芯片需求激增中扩大产能',
          content: '主要代工厂正在加速其扩张计划，以满足对高性能计算和 AI 加速器前所未有的需求。',
          url: 'https://36kr.com/',
          source: '36氪',
          date: updateTime,
          isRead: false,
          category: 'Supply Chain'
        },
        {
          id: 'd2',
          title: '代工厂：三星电子获得 AI 初创公司的大量 3nm 订单',
          content: '三星的 3nm GAA 工艺在寻求提高能效和性能的 AI 芯片设计人员中越来越受欢迎。',
          url: 'https://36kr.com/',
          source: '36氪',
          date: updateTime,
          isRead: false,
          category: 'Foundry'
        },
        {
          id: 'd3',
          title: '政策：韩国宣布新的半导体研发补贴',
          content: '政府旨在通过为先进研发提供重大财政支持来加强国内半导体生态系统。',
          url: 'https://36kr.com/',
          source: '36氪',
          date: updateTime,
          isRead: false,
          category: 'Policy'
        },
        // IT之家 (ithome.com)
        {
          id: 'ir1',
          title: '战略路线图：Synopsys 揭晓下一代 AI 驱动的 EDA 套件',
          content: '新的路线图侧重于在整个设计流程中深度集成生成式 AI，以自动执行重复性任务并优化结果。',
          url: 'https://www.ithome.com/',
          source: 'IT之家',
          date: updateTime,
          isRead: false,
          category: 'Roadmap'
        },
        {
          id: 'ir2',
          title: '战略：Cadence 扩大与领先超大规模企业的合作伙伴关系',
          content: '此次战略合作旨在针对云环境优化 EDA 工作负载，并为数据中心开发定制硅解决方案。',
          url: 'https://www.ithome.com/',
          source: 'IT之家',
          date: updateTime,
          isRead: false,
          category: 'Roadmap'
        },
        {
          id: 'ir3',
          title: '收并购：Synopsys 宣布对 AI 芯片初创公司的战略投资',
          content: '此次投资符合 Synopsys 在 AI 硬件领域促进创新并将新技术集成到其 EDA 工具中的战略。',
          url: 'https://www.ithome.com/',
          source: 'IT之家',
          date: updateTime,
          isRead: false,
          category: 'M&A'
        },
        // 电子工程专辑 (eet-china.com)
        {
          id: 'cs1',
          title: '政策：美国政府敲定芯片法案补贴规则',
          content: '新法规明确了获得联邦资金的要求以及在某些地区扩大产能的限制。',
          url: 'https://www.eet-china.com/',
          source: '电子工程专辑',
          date: updateTime,
          isRead: false,
          category: 'Policy'
        },
        {
          id: 'cs2',
          title: '政策：先进半导体设备出口限制收紧',
          content: '出口管制清单的新更新旨在进一步限制先进光刻和蚀刻工具流向特定市场。',
          url: 'https://www.eet-china.com/',
          source: '电子工程专辑',
          date: updateTime,
          isRead: false,
          category: 'Policy'
        },
        {
          id: 'cs3',
          title: '知识产权诉讼：主要 EDA 厂商解决长期专利纠纷',
          content: '和解协议包括一项交叉许可协议，允许两家公司在各自的工具中使用彼此的专利技术。',
          url: 'https://www.eet-china.com/',
          source: '电子工程专辑',
          date: updateTime,
          isRead: false,
          category: 'IP Litigation'
        },
        // 电子工程专辑 (eet-china.com)
        {
          id: 'ee1',
          title: '战略路线图：CEO 访谈 - AI 时代的 EDA 未来',
          content: '行业领袖讨论了 AI 对芯片设计的变革性影响，以及在快速发展的市场中保持竞争力所需的战略转变。',
          url: 'https://www.eet-china.com/',
          source: '电子工程专辑',
          date: updateTime,
          isRead: false,
          category: 'Roadmap'
        },
        {
          id: 'ee2',
          title: '战略：应对半导体行业的跨国政治格局',
          content: '高管们分享了他们对在碎片化的全球市场中运营的挑战以及供应链韧性重要性的看法。',
          url: 'https://www.eet-china.com/',
          source: '电子工程专辑',
          date: updateTime,
          isRead: false,
          category: 'Roadmap'
        },
        {
          id: 'ee3',
          title: '市场份额：定制芯片的兴起及其对 EDA 厂商的影响',
          content: '随着越来越多的系统公司开发自己的芯片，EDA 厂商正在调整其业务模式以支持定制设计要求。',
          url: 'https://www.eet-china.com/',
          source: '电子工程专辑',
          date: updateTime,
          isRead: false,
          category: 'Market Share'
        }
      ];
      
      setItems(language === 'ZH' ? mockItemsZH : mockItemsEN);
      console.log('EDA News Items set:', language === 'ZH' ? mockItemsZH.length : mockItemsEN.length);
      localStorage.setItem('eda_news_last_fetch_v2', new Date().toISOString());
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setIsLoading(false);
    }
  };


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
      console.error('AI Analysis failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const filteredItems = items
    .filter(item => {
      const activeSource = sources.find(s => s.id === activeSourceId);
      return (activeSourceId === 'all' || item.source === activeSource?.name) &&
        (item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
         item.content.toLowerCase().includes(searchQuery.toLowerCase()));
    })
    .sort((a, b) => {
      const priority = ['M&A', 'Policy', '收并购', '政策'];
      const aPriority = priority.some(p => a.category?.includes(p) || a.title.includes(p)) ? 1 : 0;
      const bPriority = priority.some(p => b.category?.includes(p) || b.title.includes(p)) ? 1 : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const getSourceIcon = (sourceName: string) => {
    if (sourceName.includes('Cadence') || sourceName.includes('Synopsys') || sourceName.includes('Siemens')) return <Cpu className="w-4 h-4" />;
    if (sourceName.includes('SemiEngineering') || sourceName.includes('WikiChip')) return <Binary className="w-4 h-4" />;
    if (sourceName.includes('arXiv')) return <Microscope className="w-4 h-4" />;
    return <Terminal className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-180px)] overflow-hidden font-fira">
      {/* Sidebar: Sources */}
      <aside className={cn(
        "col-span-1 lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar",
        mobileStep !== 'sources' && "hidden lg:block"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[10px] md:text-[11px] font-black text-teal-400 dark:text-teal-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Terminal className="w-4 h-4" /> {t.subscriptions}
            </h2>
            <div className="flex bg-teal-50 dark:bg-teal-900/20 p-0.5 rounded-lg w-fit">
              <button 
                onClick={() => setLanguage('ZH')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[9px] font-black transition-all",
                  language === 'ZH' ? "bg-white dark:bg-slate-700 text-teal-600 shadow-sm" : "text-teal-400"
                )}
              >
                ZH
              </button>
              <button 
                onClick={() => setLanguage('EN')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[9px] font-black transition-all",
                  language === 'EN' ? "bg-white dark:bg-slate-700 text-teal-600 shadow-sm" : "text-teal-400"
                )}
              >
                EN
              </button>
            </div>
            <div className="mt-2 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-900/30">
              <p className="text-[8px] lg:text-[9px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">{t.lastUpdated}</p>
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
                  setSources(language === 'ZH' ? SOURCES_ZH : SOURCES_EN);
                  setActiveSourceId('all');
                  localStorage.removeItem('eda_news_sources_v2');
                }
              }}
              className="p-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-500 rounded-lg hover:bg-teal-100 transition-colors"
              title={t.reset}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/20">
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
                ? "bg-teal-900 dark:bg-teal-700 text-white border-transparent shadow-lg" 
                : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-teal-200"
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
                  ? "bg-teal-900 dark:bg-teal-700 text-white border-transparent shadow-lg" 
                  : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-teal-200"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-7 h-7 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center text-[10px] lg:text-xs font-black",
                  activeSourceId === source.name ? "bg-white/20 text-white" : "bg-teal-50 dark:bg-teal-900/30 text-teal-600"
                )}>
                  {getSourceIcon(source.name)}
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
          <span className="text-xs font-black uppercase tracking-widest text-teal-400">{t.subscriptions}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 lg:py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[11px] lg:text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar min-h-[400px] lg:min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
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
                  "w-full text-left p-4 lg:p-5 rounded-none border-l-2 transition-all group relative overflow-hidden",
                  selectedItem?.id === item.id
                    ? "bg-slate-900 border-teal-500 shadow-xl"
                    : "bg-slate-900/40 border-slate-800 hover:border-teal-500/50",
                  (item.category === 'M&A' || item.category === 'Policy') && "border-l-4 border-teal-400"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-[8px] lg:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border",
                    selectedItem?.id === item.id 
                      ? "bg-teal-500/20 text-teal-400 border-teal-500/30" 
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  )}>
                    {item.source}
                  </span>
                  <span className={cn(
                    "text-[8px] lg:text-[9px] font-mono",
                    selectedItem?.id === item.id ? "text-teal-500/60" : "text-slate-600"
                  )}>
                    [{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
                  </span>
                </div>
                <h3 className={cn(
                  "text-xs lg:text-sm font-bold leading-tight mb-1 line-clamp-2",
                  selectedItem?.id === item.id ? "text-teal-400" : "text-slate-300",
                  (item.category === 'M&A' || item.category === 'Policy') && "font-black text-white"
                )}>
                  {item.category === 'M&A' || item.category === 'Policy' ? '🔴 ' : '🟢 '}
                  {item.title}
                </h3>
                {selectedItem?.id === item.id && (
                  <div className="absolute bottom-0 left-0 h-0.5 bg-teal-500 animate-pulse w-full" />
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-20 text-slate-400">
              <Binary className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">{t.noNews}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Column */}
      <div className={cn(
        "col-span-1 lg:col-span-5 bg-slate-950 rounded-none border border-slate-800 shadow-2xl overflow-hidden flex flex-col",
        mobileStep !== 'content' && "hidden lg:flex"
      )}>
        {selectedItem ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-5 lg:p-8 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setMobileStep('list')}
                    className="p-2 bg-slate-900 text-slate-500 rounded-none border border-slate-800 lg:hidden"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-teal-500/10 rounded-none border border-teal-500/30 flex items-center justify-center">
                    {getSourceIcon(selectedItem.source)}
                  </div>
                  <div>
                    <p className="text-[8px] lg:text-[10px] font-black text-teal-500 uppercase tracking-widest">{selectedItem.source}</p>
                    <p className="text-[10px] lg:text-xs font-mono text-slate-500">[{new Date(selectedItem.date).toLocaleDateString()}]</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={selectedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 lg:p-3 bg-slate-900 text-teal-500 rounded-none border border-slate-800 hover:bg-slate-800 transition-all flex items-center gap-2"
                    title={t.viewOriginal}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">{t.viewOriginal}</span>
                  </a>
                  <button 
                    onClick={() => {
                      setSelectedItem(null);
                      setMobileStep('list');
                    }}
                    className="p-2 lg:p-3 bg-slate-900 text-slate-500 rounded-none border border-slate-800 hover:bg-slate-800 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h2 className="text-lg lg:text-xl font-black text-white tracking-tight leading-tight">
                {selectedItem.category === 'M&A' || selectedItem.category === 'Policy' ? '🔴 ' : '🟢 '}
                {selectedItem.title}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-5 lg:p-8 space-y-6 lg:space-y-8 custom-scrollbar">
              {/* AI Analysis Section */}
              <div className="p-5 lg:p-6 bg-slate-900 rounded-none border border-teal-500/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Terminal className="w-12 h-12 lg:w-16 lg:h-16 text-teal-500" />
                </div>
                <div className="flex items-center gap-2 mb-3 lg:mb-4 relative">
                  <BrainCircuit className="w-3 h-3 lg:w-4 lg:h-4 text-teal-500" />
                  <h4 className="text-[9px] lg:text-[10px] font-black text-teal-500 uppercase tracking-[0.2em]">{t.aiBrief}</h4>
                </div>
                
                {isSummarizing ? (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                    <p className="text-[11px] lg:text-xs font-mono text-teal-500/60 italic">{t.analyzing}</p>
                  </div>
                ) : selectedItem.summary ? (
                  <div className="prose prose-invert prose-xs max-w-none font-fira">
                    <Markdown>{selectedItem.summary}</Markdown>
                  </div>
                ) : (
                  <button 
                    onClick={() => generateSummary(selectedItem)}
                    className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-teal-600 text-white rounded-none text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all"
                  >
                    {t.generateSummary}
                  </button>
                )}
              </div>

              <details className="group">
                <summary className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:text-teal-500 transition-colors flex items-center gap-2 list-none">
                  <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                  View Original Content
                </summary>
                <div className="mt-4 text-slate-400 text-[12px] lg:text-sm font-medium leading-relaxed border-l border-slate-800 pl-4">
                  {selectedItem.content}
                  <p className="mt-4 italic text-slate-500 text-[11px] lg:text-xs">
                    {t.readMore}
                  </p>
                </div>
              </details>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 text-center">
            <div className="w-16 h-16 lg:w-24 lg:h-24 bg-teal-50 dark:bg-teal-900/50 rounded-2xl lg:rounded-[2.5rem] flex items-center justify-center mb-6 lg:mb-8">
              <Cpu className="w-8 h-8 lg:w-12 lg:h-12 text-teal-200 dark:text-teal-700" />
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

export default EDANewsView;
