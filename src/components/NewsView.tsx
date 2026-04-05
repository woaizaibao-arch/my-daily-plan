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

const NewsView: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('news_language') as Language || 'ZH');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSourceId, setActiveSourceId] = useState<string>('Reuters');
  const [mobileStep, setMobileStep] = useState<'sources' | 'list' | 'content'>('sources');

  const sources: NewsSource[] = [
    { id: '1', name: 'Reuters', url: 'https://www.reuters.com/arc/outboundfeeds/rss/concepts/china/' },
    { id: '2', name: 'WSJ', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
    { id: '3', name: 'Bloomberg', url: 'https://www.bloomberg.com/feeds/bview/most-read.xml' },
  ];

  const t = {
    ZH: {
      subscriptions: '财经智库',
      allFeeds: '核心简报',
      searchPlaceholder: '搜索新闻...',
      fetching: '正在连接全球数据中心...',
      noNews: '暂无数据，请尝试切换源',
      aiBrief: 'AI 战略分析',
      analyzing: 'Gemini 正在研判决策建议...',
      generateSummary: '生成决策简报',
      readMore: '点击标题或图标阅读完整原文。',
      selectArticle: '请选择决策参考',
      summaryPrompt: (title: string, content: string) => `作为首席分析师，请用3个要点总结这篇新闻。重点关注对行业布局的影响：\n\n标题: ${title}\n内容: ${content}`,
    },
    EN: {
      subscriptions: 'Intelligence',
      allFeeds: 'Top 3 Briefs',
      searchPlaceholder: 'Search news...',
      fetching: 'Syncing with global feeds...',
      noNews: 'No news found',
      aiBrief: 'AI Insight',
      analyzing: 'Gemini is analyzing context...',
      generateSummary: 'Get AI Summary',
      readMore: 'Click title for full article.',
      selectArticle: 'Select an Insight',
      summaryPrompt: (title: string, content: string) => `Summarize for CEO in 3 points focus on industry impact:\n\nTitle: ${title}\nContent: ${content}`,
    }
  }[language];

  // 🚀 核心抓取逻辑：使用 rss2json 绕过跨域限制并实现精选 3 条
  const fetchNews = async (sourceName: string) => {
    setIsLoading(true);
    setSelectedItem(null);
    
    const sourceObj = sources.find(s => s.name === sourceName) || sources[0];
    // 使用 rss2json 接口，这是目前前端绕过跨域抓取 RSS 最稳定的方法
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(sourceObj.url)}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === 'ok' && data.items) {
        // 【核心需求】：只取最重要的前 3 条
        const fetched = data.items.slice(0, 3).map((el: any, idx: number) => ({
          id: `real-${sourceName}-${idx}`,
          title: el.title || "Latest News",
          content: el.description?.replace(/<[^>]*>/g, '').slice(0, 200) + "..." || "No content available.",
          url: el.link || "#",
          source: sourceName,
          date: el.pubDate || new Date().toISOString(),
          isRead: false
        }));
        setItems(fetched);
      } else {
        throw new Error("API Limit");
      }
    } catch (e) {
      console.error("Fetch error:", e);
      // 紧急避险：如果接口失败，显示手动更新的真实动态
      setItems([{
        id: 'emergency',
        title: `[${sourceName}] 实时抓取受限，请直接访问官网`,
        content: `由于顶级财经媒体的反爬机制，实时连接暂时受阻。您可以点击下方原文链接，直接查看 ${sourceName} 的最新 2nm 芯片制程及市场动态。`,
        url: sourceObj.url.split('/rss')[0],
        source: sourceName,
        date: new Date().toISOString(),
        isRead: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(activeSourceId);
  }, [activeSourceId, language]);

  const generateSummary = async (item: NewsItem) => {
    if (item.summary || isSummarizing) return;
    setIsSummarizing(true);
    try {
      // 请确保你在环境变量中配置了 GEMINI_API_KEY
      const ai = new GoogleGenAI({ apiKey: "YOUR_GEMINI_API_KEY" });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: t.summaryPrompt(item.title, item.content),
      });
      const summary = response.text || "摘要生成失败";
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

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] overflow-hidden">
      {/* Sidebar: Sources */}
      <aside className={cn(
        "col-span-3 space-y-4 overflow-y-auto pr-2 custom-scrollbar",
        mobileStep !== 'sources' && "hidden lg:block"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Rss className="w-4 h-4" /> {t.subscriptions}
          </h2>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setLanguage('ZH')}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[9px] font-black",
                language === 'ZH' ? "bg-white shadow-sm text-blue-600" : "text-slate-400"
              )}
            >ZH</button>
            <button 
              onClick={() => setLanguage('EN')}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[9px] font-black",
                language === 'EN' ? "bg-white shadow
