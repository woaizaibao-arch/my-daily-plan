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
  Settings,
  Code,
  Globe,
  Cpu,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../utils';
import { NewsItem, NewsSource, Language } from '../types';
import { GoogleGenAI } from "@google/genai";

const SOURCES_EN: NewsSource[] = [
  { id: '1', name: 'Science & Tech', url: 'https://www.snexplores.org/feed' },
  { id: '2', name: 'Global Currents', url: 'https://www.pbs.org/newshour/classroom/feed/' },
  { id: '3', name: 'Maker News', url: 'https://hackaday.com/blog/feed/' },
];

const SOURCES_ZH: NewsSource[] = [
  { id: 'z1', name: '机器之心', url: 'https://www.jiqizhixin.com/' },
  { id: 'z2', name: '36氪', url: 'https://36kr.com/' },
  { id: 'z3', name: 'IT之家', url: 'https://www.ithome.com/' },
];

const TeenNewsView: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('news_language_v2');
    return (saved as Language) || 'ZH';
  });
  const [sources, setSources] = useState<NewsSource[]>(() => {
    const saved = localStorage.getItem('teen_news_sources_v2');
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
    localStorage.setItem('teen_news_sources_v2', JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem('news_language_v2', language);
    // When language changes, if we haven't customized sources, update them to defaults for that language
    const saved = localStorage.getItem('teen_news_sources_v2');
    if (!saved) {
      setSources(language === 'ZH' ? SOURCES_ZH : SOURCES_EN);
    }
    setActiveSourceId('all');
    fetchNews();
  }, [language]);

  const t = {
    ZH: {
      subscriptions: '探索频道',
      reset: '恢复默认',
      resetConfirm: '确定要恢复默认订阅源吗？',
      allFeeds: '全部动态',
      searchPlaceholder: '搜索感兴趣的内容...',
      fetching: '正在探索新知识...',
      noNews: '未找到相关内容',
      aiBrief: 'AI 学习导师',
      analyzing: '正在为你解析核心原理...',
      generateSummary: '生成 AI 解析',
      readMore: '原文可在源站查看。点击外部链接图标阅读更多。',
      viewOriginal: '查看原文',
      selectArticle: '选择一个主题',
      selectArticleDesc: '从列表中选择一个感兴趣的主题，查看 AI 导师为你准备的深度解析。',
      summaryPrompt: (title: string, content: string) => `作为一名 9 年级学生的贴心同伴导师。用清晰易懂的语言总结这些文章。如果文章提到技术或工程，请解释核心机制（例如传感器的工作原理）。跳过废话，专注于“为什么这很重要”的部分。\n\n标题: ${title}\n内容: ${content}`,
      summaryFailed: '生成摘要失败。',
      lastUpdated: '最后更新',
      nextUpdate: '下次更新：北京时间 08:00'
    },
    EN: {
      subscriptions: 'Discovery Channels',
      reset: 'Reset to Defaults',
      resetConfirm: 'Are you sure you want to reset to default sources?',
      allFeeds: 'All Updates',
      searchPlaceholder: 'Search for interesting content...',
      fetching: 'Exploring new knowledge...',
      noNews: 'No content found',
      aiBrief: 'AI Learning Mentor',
      analyzing: 'Analyzing core principles for you...',
      generateSummary: 'Generate AI Analysis',
      readMore: 'Full article available at source. Click the external link icon to read more.',
      viewOriginal: 'View Original',
      selectArticle: 'Select a Topic',
      selectArticleDesc: 'Choose a topic from the list to see the deep analysis prepared by your AI mentor.',
      summaryPrompt: (title: string, content: string) => `Act as a helpful peer mentor for a 9th-grade student. Summarize these articles in clear language. If the article mentions technology or engineering, explain the core mechanism (like how a sensor works). Skip the fluff and focus on the 'Why it matters' part.\n\nTitle: ${title}\nContent: ${content}`,
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
        // Science & Tech
        {
          id: 'st1',
          title: 'How Sensors Help Robots "See" the World',
          content: 'Sensors are the eyes and ears of a robot. From ultrasonic sensors that measure distance using sound waves to infrared sensors that detect heat, these components allow machines to navigate complex environments.',
          url: 'https://www.snexplores.org/article/robot-sensors-vision',
          source: 'Science & Tech',
          date: updateTime,
          isRead: false
        },
        {
          id: 'st2',
          title: 'The Mystery of Deep Sea Bioluminescence',
          content: 'Scientists are discovering how creatures in the deepest parts of the ocean create their own light to communicate and hunt in total darkness.',
          url: 'https://www.snexplores.org/article/deep-sea-light',
          source: 'Science & Tech',
          date: updateTime,
          isRead: false
        },
        {
          id: 'st3',
          title: 'New Battery Tech Could Charge Phones in Seconds',
          content: 'Researchers are testing a new type of graphene-based battery that can hold more energy and charge significantly faster than current lithium-ion models.',
          url: 'https://www.snexplores.org/article/fast-charge-battery',
          source: 'Science & Tech',
          date: updateTime,
          isRead: false
        },
        // Global Currents
        {
          id: 'gc1',
          title: 'Understanding Global Trade and Its Impact on Your Life',
          content: 'Global trade connects countries through the exchange of goods and services. This article explores how a smartphone made in one country uses parts from ten others.',
          url: 'https://www.pbs.org/newshour/classroom/global-trade',
          source: 'Global Currents',
          date: updateTime,
          isRead: false
        },
        {
          id: 'gc2',
          title: 'How Climate Change is Affecting Coastal Communities',
          content: 'Rising sea levels are forcing towns to build new defenses and rethink how they interact with the ocean. Students share their stories from the front lines.',
          url: 'https://www.pbs.org/newshour/classroom/coastal-impact',
          source: 'Global Currents',
          date: updateTime,
          isRead: false
        },
        {
          id: 'gc3',
          title: 'The History of the Silk Road and Modern Connectivity',
          content: 'Tracing the ancient trade routes that connected East and West, and how they laid the foundation for today\'s interconnected global economy.',
          url: 'https://www.pbs.org/newshour/classroom/silk-road',
          source: 'Global Currents',
          date: updateTime,
          isRead: false
        },
        // Maker News
        {
          id: 'm1',
          title: 'Building Your First Arduino Project: A Smart Lamp',
          content: 'Learn how to use an Arduino Uno and a light-dependent resistor (LDR) to create a lamp that turns on automatically when the room gets dark.',
          url: 'https://hackaday.com/blog/arduino-smart-lamp',
          source: 'Maker News',
          date: updateTime,
          isRead: false
        },
        {
          id: 'm2',
          title: '3D Printing for Beginners: Choosing Your First Filament',
          content: 'From PLA to PETG, we break down the pros and cons of different materials to help you get the best results for your maker projects.',
          url: 'https://hackaday.com/blog/3d-printing-filament',
          source: 'Maker News',
          date: updateTime,
          isRead: false
        },
        {
          id: 'm3',
          title: 'Raspberry Pi Zero: The Tiny Computer for Big Ideas',
          content: 'Discover how this $10 computer is powering everything from retro gaming consoles to home automation systems around the world.',
          url: 'https://hackaday.com/blog/raspberry-pi-zero-projects',
          source: 'Maker News',
          date: updateTime,
          isRead: false
        }
      ];

      const mockItemsZH: NewsItem[] = [
        // 机器之心
        {
          id: 'st1',
          title: '传感器如何帮助机器人“看”世界',
          content: '传感器是机器人的眼睛和耳朵。从利用声波测量距离的超声波传感器到探测热量的红外传感器，这些组件让机器能够在复杂环境中导航。',
          url: 'https://www.jiqizhixin.com/',
          source: '机器之心',
          date: updateTime,
          isRead: false
        },
        {
          id: 'st2',
          title: '深海生物发光的奥秘',
          content: '科学家们正在发现深海生物如何在完全黑暗的环境中产生自己的光，以便进行交流和捕猎。',
          url: 'https://www.jiqizhixin.com/',
          source: '机器之心',
          date: updateTime,
          isRead: false
        },
        {
          id: 'st3',
          title: '新型电池技术可能在几秒钟内为手机充电',
          content: '研究人员正在测试一种新型石墨烯电池，它比目前的锂离子电池能储存更多能量，且充电速度显著加快。',
          url: 'https://www.jiqizhixin.com/',
          source: '机器之心',
          date: updateTime,
          isRead: false
        },
        // 36氪
        {
          id: 'gc1',
          title: '了解全球贸易及其对你生活的影响',
          content: '全球贸易通过商品和服务交换将各国联系在一起。本文探讨了在一个国家制造的智能手机如何使用来自其他十个国家的零部件。',
          url: 'https://36kr.com/',
          source: '36氪',
          date: updateTime,
          isRead: false
        },
        {
          id: 'gc2',
          title: '气候变化如何影响沿海社区',
          content: '海平面上升迫使城镇建立新的防御系统，并重新思考如何与海洋互动。学生们分享了来自前线的故事。',
          url: 'https://36kr.com/',
          source: '36氪',
          date: updateTime,
          isRead: false
        },
        {
          id: 'gc3',
          title: '丝绸之路的历史与现代互联互通',
          content: '追踪连接东西方的古代贸易路线，以及它们如何为当今互联互通的全球经济奠定基础。',
          url: 'https://36kr.com/',
          source: '36氪',
          date: updateTime,
          isRead: false
        },
        // IT之家
        {
          id: 'm1',
          title: '制作你的第一个 Arduino 项目：智能灯',
          content: '学习如何使用 Arduino Uno 和光敏电阻 (LDR) 制作一个在房间变暗时自动开启的灯。',
          url: 'https://www.ithome.com/',
          source: 'IT之家',
          date: updateTime,
          isRead: false
        },
        {
          id: 'm2',
          title: '3D 打印入门：选择你的第一种耗材',
          content: '从 PLA 到 PETG，我们分析了不同材料的优缺点，帮助你的创客项目获得最佳效果。',
          url: 'https://www.ithome.com/',
          source: 'IT之家',
          date: updateTime,
          isRead: false
        },
        {
          id: 'm3',
          title: 'Raspberry Pi Zero：承载大创意的微型计算机',
          content: '发现这台价值 10 美元的计算机如何为全球各地从复古游戏机到家庭自动化系统的各种设备提供动力。',
          url: 'https://www.ithome.com/',
          source: 'IT之家',
          date: updateTime,
          isRead: false
        }
      ];
      
      setItems(language === 'ZH' ? mockItemsZH : mockItemsEN);
      localStorage.setItem('teen_news_last_fetch_v1', new Date().toISOString());
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
      console.error('AI Summary failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const filteredItems = items.filter(item => {
    const activeSource = sources.find(s => s.id === activeSourceId);
    return (activeSourceId === 'all' || item.source === activeSource?.name) &&
      (item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       item.content.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const getSourceIcon = (sourceName: string) => {
    switch (sourceName) {
      case 'Science & Tech': return <Cpu className="w-4 h-4" />;
      case 'Global Currents': return <Globe className="w-4 h-4" />;
      case 'Maker News': return <Settings className="w-4 h-4" />;
      default: return <Newspaper className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-180px)] overflow-hidden">
      {/* Sidebar: Sources */}
      <aside className={cn(
        "col-span-1 lg:col-span-3 space-y-6 overflow-y-auto pr-2 custom-scrollbar",
        mobileStep !== 'sources' && "hidden lg:block"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[10px] md:text-[11px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <Newspaper className="w-4 h-4" /> {t.subscriptions}
            </h2>
            <div className="flex bg-indigo-50 dark:bg-indigo-900/20 p-0.5 rounded-lg w-fit">
              <button 
                onClick={() => setLanguage('ZH')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[9px] font-black transition-all",
                  language === 'ZH' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-indigo-400"
                )}
              >
                ZH
              </button>
              <button 
                onClick={() => setLanguage('EN')}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[9px] font-black transition-all",
                  language === 'EN' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-indigo-400"
                )}
              >
                EN
              </button>
            </div>
            <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <p className="text-[8px] lg:text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">{t.lastUpdated}</p>
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
                  localStorage.removeItem('teen_news_sources_v2');
                }
              }}
              className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-lg hover:bg-indigo-100 transition-colors"
              title={t.reset}
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20">
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
                ? "bg-indigo-600 text-white border-transparent shadow-lg" 
                : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-200"
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
                  ? "bg-indigo-600 text-white border-transparent shadow-lg" 
                  : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-200"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-7 h-7 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center text-[10px] lg:text-xs font-black",
                  activeSourceId === source.name ? "bg-white/20 text-white" : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600"
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
          <span className="text-xs font-black uppercase tracking-widest text-indigo-400">{t.subscriptions}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 lg:py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[11px] lg:text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar min-h-[400px] lg:min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
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
                  "w-full text-left p-4 lg:p-5 rounded-2xl lg:rounded-3xl border transition-all tactile-tile group",
                  selectedItem?.id === item.id
                    ? "bg-indigo-600 border-transparent shadow-xl shadow-indigo-500/20"
                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-[8px] lg:text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                    selectedItem?.id === item.id ? "bg-white/20 text-white" : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                  )}>
                    {item.source}
                  </span>
                  <span className={cn(
                    "text-[8px] lg:text-[9px] font-bold",
                    selectedItem?.id === item.id ? "text-white/60" : "text-slate-400"
                  )}>
                    {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className={cn(
                  "text-xs lg:text-sm font-black leading-tight mb-2 line-clamp-2",
                  selectedItem?.id === item.id ? "text-white" : "text-slate-800 dark:text-white"
                )}>
                  {item.title}
                </h3>
                <p className={cn(
                  "text-[10px] lg:text-[11px] font-medium line-clamp-2",
                  selectedItem?.id === item.id ? "text-white/80" : "text-slate-500 dark:text-slate-400"
                )}>
                  {item.content}
                </p>
              </button>
            ))
          ) : (
            <div className="text-center py-20 text-slate-400">
              <Code className="w-12 h-12 mx-auto mb-4 opacity-20" />
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
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl lg:rounded-2xl flex items-center justify-center">
                    {getSourceIcon(selectedItem.source)}
                  </div>
                  <div>
                    <p className="text-[8px] lg:text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{selectedItem.source}</p>
                    <p className="text-[10px] lg:text-xs font-bold text-slate-400">{new Date(selectedItem.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a 
                    href={selectedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 lg:p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-500 rounded-xl lg:rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2"
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
                    className="p-2 lg:p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-500 rounded-xl lg:rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h2 className="text-lg lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {selectedItem.title}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-5 lg:p-8 space-y-6 lg:space-y-8 custom-scrollbar">
              {/* AI Summary Section */}
              <div className="p-5 lg:p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl lg:rounded-3xl border border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <BrainCircuit className="w-12 h-12 lg:w-16 lg:h-16 text-indigo-600" />
                </div>
                <div className="flex items-center gap-2 mb-3 lg:mb-4 relative">
                  <BrainCircuit className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-600" />
                  <h4 className="text-[9px] lg:text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{t.aiBrief}</h4>
                </div>
                
                {isSummarizing ? (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <p className="text-[11px] lg:text-xs font-bold text-indigo-600/60 italic">{t.analyzing}</p>
                  </div>
                ) : selectedItem.summary ? (
                  <div className="prose prose-slate dark:prose-invert prose-xs max-w-none">
                    <Markdown>{selectedItem.summary}</Markdown>
                  </div>
                ) : (
                  <button 
                    onClick={() => generateSummary(selectedItem)}
                    className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-indigo-600 text-white rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
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
            <div className="w-16 h-16 lg:w-24 lg:h-24 bg-indigo-50 dark:bg-indigo-900/50 rounded-2xl lg:rounded-[2.5rem] flex items-center justify-center mb-6 lg:mb-8">
              <Code className="w-8 h-8 lg:w-12 lg:h-12 text-indigo-200 dark:text-indigo-700" />
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

export default TeenNewsView;
