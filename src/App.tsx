import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Play, 
  Pause, 
  LayoutGrid, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Lock,
  Activity,
  Zap,
  Clock,
  Check,
  Gem,
  Award,
  Sun,
  Moon,
  Volume2,
  BarChart3,
  X,
  User,
  Baby
} from 'lucide-react';
import { format, addDays, startOfToday, parse, addMinutes } from 'date-fns';
import confetti from 'canvas-confetti';

const fireworks = () => {
  const duration = 3 * 1000;
  const defaults = { startVelocity: 35, spread: 360, ticks: 60, zIndex: 1000 };
  const bangUrl = 'https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3';
  
  const triggerBurst = (x: number) => {
    try {
      const audio = new Audio(bangUrl);
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}

    confetti({ 
      ...defaults, 
      particleCount: 60, 
      origin: { x, y: Math.random() - 0.2 } 
    });
  };

  // Initial burst
  triggerBurst(0.5);

  // Periodic bursts for 3 seconds
  const interval = setInterval(() => {
    const x = Math.random() > 0.5 ? (Math.random() * 0.2 + 0.1) : (Math.random() * 0.2 + 0.7);
    triggerBurst(x);
  }, 500);

  // Absolute stop after 3 seconds
  setTimeout(() => {
    clearInterval(interval);
  }, duration);
};

import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

import { 
  DndContext, 
  useDraggable, 
  useDroppable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn, formatDuration, getSecondsFromTime, getTimeFromSeconds } from './utils';
import { Category, ScheduledTask, TaskTemplate, UserRank, ModuleType, RewardCard, ViewMode, ParentTask } from './types';
import { optimizeSchedule, calculateWeeklyAverages } from './services/aiService';

const CATEGORIES: { name: Category; color: string }[] = [
  { name: 'SCHOOLWORK', color: '#3b82f6' },
  { name: 'INSTRUMENTS', color: '#8b5cf6' },
  { name: 'SAT', color: '#10b981' },
  { name: 'FITNESS', color: '#ef4444' },
  { name: 'LEISURE', color: '#f59e0b' },
  { name: 'OTHERS', color: '#64748b' },
];

const INITIAL_TEMPLATES: TaskTemplate[] = [
  { id: 't1', title: 'Math Homework', category: 'SCHOOLWORK', defaultDuration: 60, color: '#3b82f6', moduleType: 'TASK' },
  { id: 't1-1', title: 'Science', category: 'SCHOOLWORK', defaultDuration: 45, color: '#3b82f6', moduleType: 'TASK' },
  { id: 't1-2', title: 'English', category: 'SCHOOLWORK', defaultDuration: 45, color: '#3b82f6', moduleType: 'TASK' },
  { id: 't1-3', title: 'Asia Study', category: 'SCHOOLWORK', defaultDuration: 30, color: '#3b82f6', moduleType: 'TASK' },
  { id: 't1-4', title: 'Music Exploration', category: 'SCHOOLWORK', defaultDuration: 45, color: '#3b82f6', moduleType: 'TASK' },
  { id: 't1-5', title: 'French', category: 'SCHOOLWORK', defaultDuration: 45, color: '#3b82f6', moduleType: 'TASK' },
  { id: 't2', title: 'Piano Practice', category: 'INSTRUMENTS', defaultDuration: 45, color: '#8b5cf6', moduleType: 'TASK' },
  { id: 't2-1', title: 'Guitar Session', category: 'INSTRUMENTS', defaultDuration: 30, color: '#8b5cf6', moduleType: 'TASK' },
  { id: 't2-2', title: 'Violin Drill', category: 'INSTRUMENTS', defaultDuration: 60, color: '#8b5cf6', moduleType: 'TASK' },
  { id: 't3', title: 'SAT Reading', category: 'SAT', defaultDuration: 60, color: '#10b981', moduleType: 'TASK' },
  { id: 't3-1', title: 'SAT Math', category: 'SAT', defaultDuration: 60, color: '#10b981', moduleType: 'TASK' },
  { id: 't4', title: 'Cardio Workout', category: 'FITNESS', defaultDuration: 45, color: '#ef4444', moduleType: 'TASK' },
  { id: 't4-1', title: 'Strength Training', category: 'FITNESS', defaultDuration: 60, color: '#ef4444', moduleType: 'TASK' },
  { id: 't5', title: 'Fiction Reading', category: 'LEISURE', defaultDuration: 30, color: '#f59e0b', moduleType: 'TASK' },
  { id: 't5-1', title: 'Movie Night', category: 'LEISURE', defaultDuration: 120, color: '#f59e0b', moduleType: 'TASK' },
  { id: 't6', title: 'Meditation', category: 'OTHERS', defaultDuration: 15, color: '#64748b', moduleType: 'TASK' },
  { id: 't6-1', title: 'House Chores', category: 'OTHERS', defaultDuration: 30, color: '#64748b', moduleType: 'TASK' },
];

const REWARD_CARDS: RewardCard[] = [
  { id: 'r1', title: 'Dining Out', cost: 10, icon: '🍔', description: 'Treat yourself to a meal outside.' },
  { id: 'r2', title: 'Gaming Time', cost: 3, icon: '🎮', description: '1 hour of guilt-free gaming.' },
  { id: 'r3', title: 'Chore Pass', cost: 5, icon: '🧹', description: 'Skip one household chore.' },
];

const RANK_PROGRESSION: Record<UserRank, { next: UserRank | null; cost: number; label: string }> = {
  'Beginner': { next: 'Consistent', cost: 100, label: '🌱 Beginner' },
  'Consistent': { next: 'Productive', cost: 250, label: '🌿 Consistent' },
  'Productive': { next: 'Master', cost: 500, label: '🌳 Productive' },
  'Master': { next: 'Elite', cost: 1000, label: '💎 Master' },
  'Elite': { next: null, cost: 0, label: '👑 Elite' },
};

const NOTIFICATION_SOUNDS = [
  { id: 'zen', name: '禅意磬音', url: 'https://assets.mixkit.co/active_storage/sfx/402/402-preview.mp3' },
  { id: 'crystal', name: '水晶清脆', url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' },
  { id: 'birds', name: '清晨鸟鸣', url: 'https://assets.mixkit.co/active_storage/sfx/136/136-preview.mp3' },
  { id: 'harp', name: '优雅竖琴', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
  { id: 'piano', name: '柔和钢琴', url: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3' },
];

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('user-view-mode') as ViewMode) || 'STUDENT';
  });
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [pendingShift, setPendingShift] = useState<{ delaySeconds: number; taskIndex: number; taskTitle: string } | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [parentTasks, setParentTasks] = useState<ParentTask[]>([]);
  const [categories, setCategories] = useState<{ name: Category; color: string }[]>(() => {
    const saved = localStorage.getItem('user-categories');
    return saved ? JSON.parse(saved) : CATEGORIES;
  });
  const [templates, setTemplates] = useState<TaskTemplate[]>(() => {
    const saved = localStorage.getItem('user-templates');
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
  });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [points, setPoints] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [inventory, setInventory] = useState<string[]>([]);
  const [userRank, setUserRank] = useState<UserRank>('Beginner');
  const [showReward, setShowReward] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<Category | null>('SCHOOLWORK');
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [selectedSoundUrl, setSelectedSoundUrl] = useState(() => {
    return localStorage.getItem('user-sound-url') || NOTIFICATION_SOUNDS[0].url;
  });
  
  // Use a ref for the audio object to keep it stable and avoid re-creation issues
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio once and request notification permissions
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(selectedSoundUrl);
      audioRef.current.preload = 'auto';
    }

    // Request notification permissions for background alerts
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Update source when selection changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = selectedSoundUrl;
      audioRef.current.load();
      localStorage.setItem('user-sound-url', selectedSoundUrl);
    }
  }, [selectedSoundUrl]);

  const playNotification = (duration: number = 3000, loop: boolean = false, title?: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Show system notification if possible (works in background on many devices)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title || "计划提醒", {
        body: "您的计划时间已到！",
        icon: "/favicon.ico"
      });
    }

    if (soundTimeoutRef.current) {
      clearTimeout(soundTimeoutRef.current);
    }

    audio.pause();
    audio.currentTime = 0;
    audio.loop = loop;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn("Playback failed:", error);
        setAlertMessage("声音被拦截了！请点击页面任意位置激活，或在浏览器设置中允许本站播放声音。");
      });
    }

    if (duration > 0) {
      soundTimeoutRef.current = setTimeout(() => {
        audio.pause();
        audio.loop = false;
        audio.currentTime = 0;
        soundTimeoutRef.current = null;
      }, duration);
    }
  };

  // Global click listener to "unlock" the stable audio instance
  useEffect(() => {
    const unlock = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
          console.log("Audio context unlocked");
          window.removeEventListener('click', unlock);
        }).catch(() => {});
      }
    };
    window.addEventListener('click', unlock);
    return () => window.removeEventListener('click', unlock);
  }, []);

  // Modals state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState<Category | null>(null);
  const [quickAddTask, setQuickAddTask] = useState<ScheduledTask | null>(null);
  const [newCatName, setNewCatName] = useState('');
  
  // Calculate weekly averages
  const weeklyAverages = useMemo(() => calculateWeeklyAverages(templates), [tasks, templates]);
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newTplTitle, setNewTplTitle] = useState('');
  const [newTplDuration, setNewTplDuration] = useState(60);

  const [parentTaskTitle, setParentTaskTitle] = useState('');
  const [parentTaskTime, setParentTaskTime] = useState('08:00');

  const addParentTask = () => {
    if (!parentTaskTitle.trim()) return;
    const newTask: ParentTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: parentTaskTitle,
      time: parentTaskTime,
      isCompleted: false
    };
    setParentTasks([...parentTasks, newTask].sort((a, b) => a.time.localeCompare(b.time)));
    setParentTaskTitle('');
  };

  const toggleParentTask = (id: string) => {
    setParentTasks(parentTasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const deleteParentTask = (id: string) => {
    setParentTasks(parentTasks.filter(t => t.id !== id));
  };

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('user-dark-mode');
    return saved === 'true';
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load data
  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const savedTasks = localStorage.getItem(`tasks-${dateStr}`);
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    else setTasks([]);

    const savedParentTasks = localStorage.getItem(`parent-tasks-${dateStr}`);
    if (savedParentTasks) setParentTasks(JSON.parse(savedParentTasks));
    else setParentTasks([]);
    
    const savedPoints = localStorage.getItem('user-points');
    if (savedPoints) setPoints(parseInt(savedPoints));

    const savedDiamonds = localStorage.getItem('user-diamonds');
    if (savedDiamonds) setDiamonds(parseInt(savedDiamonds));

    const savedInventory = localStorage.getItem('user-inventory');
    if (savedInventory) setInventory(JSON.parse(savedInventory));

    const savedRank = localStorage.getItem('user-rank');
    if (savedRank) setUserRank(savedRank as UserRank);
  }, [selectedDate]);

  // Save data
  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    localStorage.setItem(`tasks-${dateStr}`, JSON.stringify(tasks));
    localStorage.setItem(`parent-tasks-${dateStr}`, JSON.stringify(parentTasks));
    localStorage.setItem('user-view-mode', viewMode);
    localStorage.setItem('user-points', points.toString());
    localStorage.setItem('user-diamonds', diamonds.toString());
    localStorage.setItem('user-inventory', JSON.stringify(inventory));
    localStorage.setItem('user-rank', userRank);
    localStorage.setItem('user-categories', JSON.stringify(categories));
    localStorage.setItem('user-templates', JSON.stringify(templates));
  }, [tasks, selectedDate, points, diamonds, inventory, userRank, categories, templates]);

  useEffect(() => {
    localStorage.setItem('user-dark-mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Timer Logic with sub-second accuracy and sound notification
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTasks(prev => {
        let changed = false;
        const newTasks = prev.map(task => {
          if (task.isRunning && task.lastStartTime) {
            const elapsedMs = now - task.lastStartTime;
            
            if (elapsedMs >= 1000) {
              changed = true;
              const secondsToAdd = Math.floor(elapsedMs / 1000);
              const newActualDuration = task.actualDuration + secondsToAdd;
              const plannedSeconds = task.duration * 60;

              // Trigger sound if we just crossed the planned duration
              if (task.actualDuration < plannedSeconds && newActualDuration >= plannedSeconds) {
                playNotification(3000, false, `计划完成: ${task.title}`);
              }

              return {
                ...task,
                actualDuration: newActualDuration,
                lastStartTime: task.lastStartTime + (secondsToAdd * 1000)
              };
            }
          }
          return task;
        });
        return changed ? newTasks : prev;
      });
    }, 200); // Run more frequently for better responsiveness
    return () => clearInterval(interval);
  }, []);

  const addTaskFromTemplate = (template: TaskTemplate) => {
    const lastTask = tasks[tasks.length - 1];
    let nextStartTime = "09:00";
    if (lastTask) {
      const lastEndSeconds = getSecondsFromTime(lastTask.startTime) + lastTask.duration * 60;
      nextStartTime = getTimeFromSeconds(lastEndSeconds);
    }

    const newTask: ScheduledTask = {
      id: Math.random().toString(36).substr(2, 9),
      templateId: template.id,
      title: template.title,
      category: template.category,
      startTime: nextStartTime,
      duration: template.defaultDuration,
      isCompleted: false,
      actualDuration: 0,
      isRunning: false,
      color: template.color,
      moduleType: template.moduleType,
      isLocked: false,
      points: 0
    };
    setQuickAddTask(newTask);
  };

  const updateTask = (id: string, updates: Partial<ScheduledTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const toggleTaskComplete = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const isNowCompleted = !task.isCompleted;
    const plannedSeconds = task.duration * 60;
    const delaySeconds = task.actualDuration - plannedSeconds;
    const taskIndex = tasks.findIndex(t => t.id === id);

    if (isNowCompleted) {
      fireworks();
    }

    setTasks(prev => {
      const isOnTime = task.actualDuration <= plannedSeconds;
      let newTasks = prev.map(t => {
        if (t.id === id) {
          return { 
            ...t, 
            isCompleted: isNowCompleted, 
            isRunning: false,
            points: isNowCompleted && isOnTime ? 10 : 0
          };
        }
        return t;
      });

      if (isNowCompleted) {
        setDiamonds(d => d + 1);
        setPoints(p => p + (isOnTime ? 10 : 5));
        setShowReward(true);
        setTimeout(() => setShowReward(false), 2000);

        const wasAllDone = prev.length > 0 && prev.every(t => t.isCompleted);
        const isNowAllDone = newTasks.length > 0 && newTasks.every(t => t.isCompleted);
        if (isNowAllDone && !wasAllDone) {
          setDiamonds(d => d + 5);
          fireworks();
        }
      }

      return newTasks;
    });

    // Global Shift Logic - Now asks for permission if delay >= 5 mins (300s)
    if (isNowCompleted && Math.abs(delaySeconds) >= 300) {
      setPendingShift({
        delaySeconds,
        taskIndex,
        taskTitle: task.title
      });
    }
  };

  const applyShift = () => {
    if (!pendingShift) return;
    const { delaySeconds, taskIndex } = pendingShift;

    setTasks(prev => {
      let conflictDetected = false;
      const newTasks = prev.map((t, idx) => {
        if (idx > taskIndex && !t.isCompleted) {
          const currentStartSeconds = getSecondsFromTime(t.startTime);
          const newStartSeconds = currentStartSeconds + delaySeconds;
          const newStartTime = getTimeFromSeconds(newStartSeconds);
          
          if (t.isLocked) conflictDetected = true;
          
          return { ...t, startTime: newStartTime };
        }
        return t;
      });

      if (conflictDetected) {
        setAlertMessage("Current delay will affect subsequent fixed schedules. Please review your timeline.");
      }
      return newTasks;
    });
    setPendingShift(null);
  };

  const buyCard = (card: RewardCard) => {
    if (diamonds >= card.cost) {
      setDiamonds(d => d - card.cost);
      setInventory(prev => [...prev, card.id]);
      fireworks();
    }
  };

  const toggleTimer = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const starting = !t.isRunning;
        return {
          ...t,
          isRunning: starting,
          lastStartTime: starting ? Date.now() : undefined
        };
      }
      return { ...t, isRunning: false };
    }));
  };

  const promoteRank = () => {
    const stage = RANK_PROGRESSION[userRank];
    if (stage.next && points >= stage.cost) {
      setPoints(p => p - stage.cost);
      setUserRank(stage.next);
      fireworks();
    }
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const name = newCatName.toUpperCase();
    if (categories.some(c => c.name === name)) {
      setAlertMessage("Category already exists.");
      return;
    }
    setCategories([...categories, { name, color: newCatColor }]);
    setNewCatName('');
    setShowAddCategory(false);
  };

  const deleteCategory = (name: Category) => {
    setCategories(categories.filter(c => c.name !== name));
    setTemplates(templates.filter(t => t.category !== name));
    if (expandedCategory === name) setExpandedCategory(null);
  };

  const addTemplate = (category: Category) => {
    if (!newTplTitle.trim()) return;
    const cat = categories.find(c => c.name === category);
    const newTpl: TaskTemplate = {
      id: `t-${Date.now()}`,
      title: newTplTitle,
      category,
      defaultDuration: newTplDuration,
      color: cat?.color || '#3b82f6',
      moduleType: 'TASK'
    };
    setTemplates([...templates, newTpl]);
    setNewTplTitle('');
    setNewTplDuration(60);
    setShowAddTemplate(null);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === 'template' && over.id === 'timeline-dropzone') {
      const template = active.data.current.template as TaskTemplate;
      addTaskFromTemplate(template);
      return;
    }

    if (active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
        
        {/* Header */}
        <header className="glass sticky top-0 z-[100] px-4 md:px-8 py-4 mb-4 md:mb-8 border-b border-white/20 dark:border-white/10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
            <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 tactile-tile">
                  <Zap className="text-white w-6 h-6 fill-white" />
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-black tracking-tighter text-slate-900 dark:text-white">
                    {viewMode === 'STUDENT' ? 'STUDENT PLAN' : 'PARENT PLAN'}
                  </h1>
                </div>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setViewMode('STUDENT')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    viewMode === 'STUDENT' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Baby className="w-3 h-3" /> Student
                </button>
                <button 
                  onClick={() => setViewMode('PARENT')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    viewMode === 'PARENT' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <User className="w-3 h-3" /> Parent
                </button>
              </div>
              
              <div className="hidden md:block h-8 w-px bg-slate-200 dark:bg-slate-700" />
              
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 tactile-tile">
                  <div className="relative w-4 h-4 md:w-5 md:h-5 diamond-3d">
                    <Gem className="w-full h-full text-blue-500 fill-blue-500/20" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-full pointer-events-none" />
                  </div>
                  <span className="text-xs md:text-sm font-black text-slate-700 dark:text-slate-200">{diamonds}</span>
                </div>
                <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 tactile-tile">
                  <Award className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                  <span className="text-xs md:text-sm font-black text-slate-700 dark:text-slate-200">{points}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-between md:justify-end">
              <div className="relative">
                <button 
                  onClick={() => setShowSoundSettings(!showSoundSettings)}
                  className={cn(
                    "p-3 bg-white dark:bg-slate-800 rounded-2xl border transition-all tactile-tile text-slate-500 dark:text-slate-400",
                    showSoundSettings ? "border-blue-500 text-blue-500" : "border-slate-100 dark:border-slate-700"
                  )}
                  title="选择预警声音"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                <AnimatePresence>
                  {showSoundSettings && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-48 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl z-[200] p-2"
                    >
                      <div className="space-y-1">
                        {NOTIFICATION_SOUNDS.map(sound => (
                          <button
                            key={sound.id}
                            onClick={() => {
                              setSelectedSoundUrl(sound.url);
                              // Small delay to let the src update, then play a short preview
                              setTimeout(() => playNotification(2000, false), 50);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-black transition-all",
                              selectedSoundUrl === sound.url 
                                ? "bg-blue-600 text-white" 
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                            )}
                          >
                            <span>{sound.name}</span>
                            {selectedSoundUrl === sound.url && <Check className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
                        <button 
                          onClick={() => {
                            playNotification(3000, false);
                            setShowSoundSettings(false);
                          }}
                          className="w-full py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                        >
                          测试 10 秒铃声
                        </button>
                        <button 
                          onClick={() => {
                            fireworks();
                            setShowSoundSettings(false);
                          }}
                          className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                        >
                          测试烟花音效
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 tactile-tile text-slate-500 dark:text-slate-400"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl p-1 border border-slate-100 dark:border-slate-700 shadow-sm tactile-tile">
                <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
                <div className="px-4 text-center min-w-[120px]">
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">{format(selectedDate, 'MMM dd')}</p>
                </div>
                <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          {viewMode === 'STUDENT' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10">
              {/* The Hub: Module Warehouse */}
              <aside className="col-span-1 md:col-span-3 space-y-6 md:space-y-8">
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" /> The Hub
                    </h2>
                    <button 
                      onClick={() => setShowAddCategory(true)}
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {categories.map(cat => {
                      const catTemplates = templates.filter(t => t.category === cat.name);
                      const isExpanded = expandedCategory === cat.name;
                      
                      return (
                        <div key={cat.name} className="space-y-2">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                              className={cn(
                                "flex-1 flex items-center justify-between p-4 rounded-2xl border transition-all tactile-tile",
                                isExpanded 
                                  ? "bg-slate-900 dark:bg-slate-700 text-white border-transparent shadow-lg" 
                                  : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-200"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="text-xs font-black uppercase tracking-widest">{cat.name}</span>
                              </div>
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4 opacity-40" />}
                            </button>
                            <button 
                              onClick={() => deleteCategory(cat.name)}
                              className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-2 pl-4"
                              >
                                <button 
                                  onClick={() => setShowAddTemplate(cat.name)}
                                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Add Module</span>
                                </button>

                                {catTemplates.length > 0 ? (
                                  catTemplates.map(t => (
                                    <div key={t.id} className="relative group/tpl">
                                      <DraggableTemplate template={t} onAdd={() => addTaskFromTemplate(t)} />
                                      <button 
                                        onClick={() => deleteTemplate(t.id)}
                                        className="absolute -right-2 -top-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/tpl:opacity-100 transition-opacity shadow-lg z-10"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic py-2">No modules available</p>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 tactile-tile">
                  <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">The Vault</h3>
                  <div className="flex flex-col items-center text-center">
                    <div className="text-5xl mb-3 drop-shadow-lg">{RANK_PROGRESSION[userRank].label.split(' ')[0]}</div>
                    <p className="text-xl font-black text-slate-800 dark:text-white">{RANK_PROGRESSION[userRank].label.split(' ')[1]}</p>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (points / RANK_PROGRESSION[userRank].cost) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2">{points} / {RANK_PROGRESSION[userRank].cost} XP to Level Up</p>
                    
                    {RANK_PROGRESSION[userRank].next && (
                      <button 
                        onClick={promoteRank}
                        disabled={points < RANK_PROGRESSION[userRank].cost}
                        className="w-full mt-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black dark:hover:bg-slate-100 disabled:opacity-20 transition-all active:scale-95"
                      >
                        Evolve System
                      </button>
                    )}
                  </div>
                </section>
              </aside>

              {/* Active Timeline */}
              <div className="col-span-1 md:col-span-6">
                <TimelineDropZone 
                  tasks={tasks} 
                  isOptimizing={isOptimizing} 
                  onOptimize={async () => {
                    setIsOptimizing(true);
                    const opt = await optimizeSchedule(tasks, templates);
                    setTasks(opt);
                    setIsOptimizing(false);
                  }}
                  toggleTimer={toggleTimer}
                  toggleTaskComplete={toggleTaskComplete}
                  onDelete={(id) => setTasks(tasks.filter(t => t.id !== id))}
                  onUpdateTask={updateTask}
                />
              </div>

              {/* Rewards */}
              <aside className="col-span-1 md:col-span-3 space-y-6 md:space-y-8">
                {/* Weekly Averages Panel */}
                <section className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 tactile-tile">
                  <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Weekly Avg Time
                  </h3>
                  <div className="space-y-4">
                    {weeklyAverages.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium text-center py-4">No data yet</p>
                    ) : (
                      weeklyAverages.map(avg => (
                        <div key={avg.title} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: avg.color }} />
                              <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[120px]">{avg.title}</p>
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{avg.avgMinutes} <span className="text-[10px] text-slate-400">min</span></p>
                          </div>
                          <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full transition-all duration-1000" 
                              style={{ 
                                backgroundColor: avg.color,
                                width: `${Math.min(100, (avg.avgMinutes / 120) * 100)}%` 
                              }} 
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 tactile-tile">
                  <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Reward Store
                  </h3>
                  <div className="space-y-4">
                    {REWARD_CARDS.map(card => (
                      <button 
                        key={card.id}
                        onClick={() => buyCard(card)}
                        disabled={diamonds < card.cost}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-500/50 transition-all group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{card.icon}</span>
                          <div className="text-left">
                            <p className="text-xs font-black text-slate-700 dark:text-slate-200">{card.title}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{card.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                          <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{card.cost}</span>
                          <Gem className="w-3 h-3 text-blue-500 fill-blue-500/20 diamond-3d" />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {inventory.length > 0 && (
                  <section className="p-6 bg-slate-900 dark:bg-slate-950 rounded-3xl shadow-2xl border border-white/5">
                    <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Inventory</h3>
                    <div className="flex flex-wrap gap-2">
                      {inventory.map((id, idx) => {
                        const card = REWARD_CARDS.find(c => c.id === id);
                        return (
                          <div key={idx} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl hover:bg-white/20 transition-colors cursor-help" title={card?.title}>
                            {card?.icon}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </aside>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Parent View: Simple & Concise */}
              <section className="p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 tactile-tile">
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">Parent Planner</h2>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Simple Daily Schedule</p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Task Title</label>
                      <input 
                        type="text"
                        placeholder="e.g. Family Dinner"
                        value={parentTaskTitle}
                        onChange={(e) => setParentTaskTitle(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Time</label>
                      <input 
                        type="time"
                        value={parentTaskTime}
                        onChange={(e) => setParentTaskTime(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={addParentTask}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98]"
                  >
                    Add to Schedule
                  </button>
                </div>
              </section>

              <div className="space-y-4">
                {parentTasks.length === 0 ? (
                  <div className="py-20 text-center bg-slate-50/50 dark:bg-slate-900/20 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <Clock className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-400 dark:text-slate-600 text-xs font-black uppercase tracking-widest">No plans for today</p>
                  </div>
                ) : (
                  parentTasks.map(task => (
                    <motion.div 
                      layout
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 tactile-tile group",
                        task.isCompleted && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                          <p className="text-sm font-black text-slate-800 dark:text-white">{task.time}</p>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-700" />
                        <div>
                          <h3 className={cn(
                            "text-sm font-black text-slate-700 dark:text-slate-200",
                            task.isCompleted && "line-through"
                          )}>{task.title}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleParentTask(task.id)}
                          className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                            task.isCompleted ? "bg-green-500 text-white" : "bg-slate-50 dark:bg-slate-900 text-slate-300 hover:text-green-500"
                          )}
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => deleteParentTask(task.id)}
                          className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>

        {/* Focus Mode Overlay */}
        {tasks.some(t => t.isRunning) && (
          <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-[450px]">
            <motion.div 
              initial={{ y: 100, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              className="dark-glass p-6 rounded-[2.5rem] text-white shadow-2xl flex items-center gap-6 border border-white/10"
            >
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 relative">
                <Activity className="w-8 h-8 animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-white/20 border-t-white animate-spin" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Active Focus</p>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    {Math.round(Math.min(100, ((tasks.find(t => t.isRunning)?.actualDuration || 0) / ((tasks.find(t => t.isRunning)?.duration || 1) * 60)) * 100))}%
                  </p>
                </div>
                <p className="text-lg font-black truncate">{tasks.find(t => t.isRunning)?.title}</p>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-2xl font-mono font-black">
                    {formatDuration(tasks.find(t => t.isRunning)?.actualDuration || 0)}
                  </p>
                  <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, ((tasks.find(t => t.isRunning)?.actualDuration || 0) / ((tasks.find(t => t.isRunning)?.duration || 1) * 60)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {showAddCategory && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm"
            >
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 uppercase tracking-tighter">New Category</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Name</label>
                    <input 
                      type="text" 
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="e.g. CODING"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Color</label>
                    <div className="flex gap-3">
                      {['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#64748b', '#ec4899', '#06b6d4'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setNewCatColor(color)}
                          className={cn(
                            "w-8 h-8 rounded-full border-4 transition-all",
                            newCatColor === color ? "border-slate-200 scale-110" : "border-transparent opacity-50"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setShowAddCategory(false)}
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={addCategory}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {showAddTemplate && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm"
            >
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 uppercase tracking-tighter">New Module</h3>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Adding to {showAddTemplate}</p>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Title</label>
                    <input 
                      type="text" 
                      value={newTplTitle}
                      onChange={(e) => setNewTplTitle(e.target.value)}
                      placeholder="e.g. React Study"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Default Duration (Min)</label>
                    <input 
                      type="number" 
                      value={newTplDuration}
                      onChange={(e) => setNewTplDuration(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setShowAddTemplate(null)}
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => addTemplate(showAddTemplate)}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30"
                    >
                      Add to Hub
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {quickAddTask && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm"
            >
              <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Initialize Task</h3>
                  <button onClick={() => setQuickAddTask(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{quickAddTask.category}</span>
                      <button 
                        onClick={() => setQuickAddTask({ ...quickAddTask, isLocked: !quickAddTask.isLocked })}
                        className={cn("p-2 rounded-xl transition-all", quickAddTask.isLocked ? "bg-red-50 dark:bg-red-900/20 text-red-500" : "bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600")}
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <input 
                      type="text"
                      value={quickAddTask.title}
                      onChange={(e) => setQuickAddTask({ ...quickAddTask, title: e.target.value })}
                      placeholder="Task Title"
                      className="w-full font-black text-slate-800 dark:text-white bg-transparent border-none p-0 focus:ring-0 text-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Start Time</label>
                      <input 
                        type="time" 
                        value={quickAddTask.startTime}
                        onChange={(e) => setQuickAddTask({ ...quickAddTask, startTime: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Duration (Min)</label>
                      <input 
                        type="number" 
                        value={quickAddTask.duration}
                        onChange={(e) => setQuickAddTask({ ...quickAddTask, duration: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adjust Duration</label>
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{quickAddTask.duration}m</span>
                    </div>
                    <input 
                      type="range"
                      min="5"
                      max="180"
                      step="5"
                      value={quickAddTask.duration}
                      onChange={(e) => setQuickAddTask({ ...quickAddTask, duration: parseInt(e.target.value) })}
                      className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setQuickAddTask(null)}
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        setTasks([...tasks, quickAddTask]);
                        setQuickAddTask(null);
                      }}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30"
                    >
                      Add to Timeline
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {showReward && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] glass dark:bg-slate-800/90 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/20 dark:border-white/10"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30 animate-bounce diamond-3d">
                <Gem className="w-6 h-6 text-white fill-white" />
              </div>
              <div>
                <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Crystal Acquired</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Task synchronization complete.</p>
              </div>
            </motion.div>
          )}

          {pendingShift && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm"
            >
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] max-w-md w-full shadow-2xl tactile-tile border border-slate-100 dark:border-slate-700">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 mb-6 mx-auto">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-center text-slate-800 dark:text-white mb-4 uppercase tracking-tighter">时间调整建议</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm leading-relaxed mb-8">
                  计划「{pendingShift.taskTitle}」{pendingShift.delaySeconds > 0 ? '推迟' : '提前'}了 {Math.abs(Math.round(pendingShift.delaySeconds / 60))} 分钟完成。
                  是否自动平移后续的所有计划？
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setPendingShift(null)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest"
                  >
                    保持现状
                  </button>
                  <button 
                    onClick={applyShift}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/30"
                  >
                    自动平移
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {alertMessage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm"
            >
              <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] max-w-md w-full shadow-2xl tactile-tile border border-slate-100 dark:border-slate-700">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 mb-6 mx-auto">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-center text-slate-800 dark:text-white mb-4">Timeline Conflict</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm leading-relaxed mb-8">{alertMessage}</p>
                <button 
                  onClick={() => setAlertMessage(null)}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black dark:hover:bg-slate-100 transition-all"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DndContext>
  );
}

function DraggableTemplate({ template, onAdd }: { template: TaskTemplate, onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `template-${template.id}`,
    data: { type: 'template', template },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "w-full group flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 tactile-tile cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 scale-95 z-50"
      )}
    >
      <div>
        <h3 className="font-black text-slate-700 dark:text-slate-200 text-xs">{template.title}</h3>
      </div>
      <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          onAdd(); 
        }}
        className="w-8 h-8 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all z-20 active:scale-90"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

function TimelineDropZone({ 
  tasks, 
  isOptimizing, 
  onOptimize, 
  toggleTimer, 
  toggleTaskComplete, 
  onDelete,
  onUpdateTask
}: { 
  tasks: ScheduledTask[], 
  isOptimizing: boolean, 
  onOptimize: () => void,
  toggleTimer: (id: string) => void,
  toggleTaskComplete: (id: string) => void,
  onDelete: (id: string) => void,
  onUpdateTask: (id: string, updates: Partial<ScheduledTask>) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline-dropzone' });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "p-4 md:p-10 min-h-[500px] md:min-h-[700px] relative transition-all bg-white dark:bg-slate-800 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-700 tactile-tile",
        isOver && "bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/50 scale-[1.01]"
      )}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-10 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">Active Timeline</h2>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Synchronized Schedule</p>
        </div>
      </div>

      <div className="space-y-6 relative">
        {tasks.length === 0 ? (
          <div className="py-40 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700 tactile-tile">
              <Plus className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            </div>
            <p className="text-slate-400 dark:text-slate-600 text-sm font-black uppercase tracking-widest">
              {isOver ? "Release to Deploy" : "Initialize Timeline"}
            </p>
          </div>
        ) : (
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map(task => (
              <SortableTaskItem 
                key={task.id} 
                task={task} 
                toggleTimer={toggleTimer}
                toggleTaskComplete={toggleTaskComplete}
                onDelete={onDelete}
                onUpdateTask={onUpdateTask}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

function SortableTaskItem({ 
  task, 
  toggleTimer, 
  toggleTaskComplete, 
  onDelete,
  onUpdateTask
}: { 
  task: ScheduledTask,
  toggleTimer: (id: string) => void,
  toggleTaskComplete: (id: string) => void,
  onDelete: (id: string) => void,
  onUpdateTask: (id: string, updates: Partial<ScheduledTask>) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "flex flex-row items-start gap-3 md:gap-4 group relative md:pl-28",
        task.isCompleted ? "opacity-40 grayscale" : "opacity-100",
        isDragging && "z-50"
      )}
    >
      <div className="md:absolute md:left-0 md:top-1 md:text-right w-16 md:w-24 flex flex-col items-center md:items-end justify-start gap-2 shrink-0">
        <div className="relative group/time w-full">
          <input 
            type="time" 
            value={task.startTime}
            onChange={(e) => onUpdateTask(task.id, { startTime: e.target.value })}
            className="text-[10px] md:text-[11px] font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-1 md:px-3 py-1.5 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500/20 cursor-pointer hover:border-blue-300 transition-all w-full text-center md:text-right"
          />
        </div>
        <div className="flex items-center gap-1 w-full">
          <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 px-1 md:px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 shadow-inner w-full justify-center md:justify-end">
            <input 
              type="number" 
              value={task.duration}
              onChange={(e) => onUpdateTask(task.id, { duration: parseInt(e.target.value) || 0 })}
              className="text-[9px] font-black text-slate-600 dark:text-slate-400 bg-transparent border-none p-0 w-6 md:w-10 text-center md:text-right focus:ring-0 cursor-pointer"
            />
            <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 ml-0.5">m</span>
          </div>
        </div>
      </div>

      <div className={cn(
        "w-full flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl md:rounded-3xl p-4 md:p-5 hover:border-blue-200 dark:hover:border-blue-500/50 transition-all tactile-tile",
        task.isRunning && "border-blue-200 dark:border-blue-500 ring-4 ring-blue-50 dark:ring-blue-900/20",
        task.actualDuration > task.duration * 60 && !task.isCompleted && "border-red-200 dark:border-red-900/50 animate-pulse-subtle"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{task.category}</span>
            {task.isLocked && <Lock className="w-2.5 h-2.5 text-red-400" />}
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => onUpdateTask(task.id, { isLocked: !task.isLocked })}
              className={cn("p-1.5 rounded-xl transition-all", task.isLocked ? "bg-red-50 dark:bg-red-900/20 text-red-500" : "bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400")}
            >
              <Lock className="w-3 h-3" />
            </button>
            <button onClick={() => toggleTimer(task.id)} className={cn("p-1.5 rounded-xl transition-all shadow-sm", task.isRunning ? "bg-red-600 text-white" : "bg-slate-900 dark:bg-slate-700 text-white hover:bg-black dark:hover:bg-slate-600")}>
              {task.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button onClick={() => toggleTaskComplete(task.id)} className={cn("p-1.5 rounded-xl transition-all shadow-sm", task.isCompleted ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600")}>
              {task.isCompleted ? <Check className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            </button>
            <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-200 dark:text-slate-700 hover:text-red-500 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
            <div className="cursor-grab active:cursor-grabbing p-1.5 text-slate-200 dark:text-slate-700 hover:text-slate-400 transition-colors" {...listeners} {...attributes}>
              <LayoutGrid className="w-3 h-3" />
            </div>
          </div>
        </div>
        
        <input 
          type="text"
          value={task.title}
          onChange={(e) => onUpdateTask(task.id, { title: e.target.value })}
          className="w-full font-black text-slate-800 dark:text-white bg-transparent border-none p-0 focus:ring-0 text-sm"
        />

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-700">
            <Activity className="w-3 h-3" /> {formatDuration(task.actualDuration)}
          </div>
          <div className="flex-1 group/slider relative flex items-center">
            <input 
              type="range"
              min="5"
              max="180"
              step="5"
              value={task.duration}
              onChange={(e) => onUpdateTask(task.id, { duration: parseInt(e.target.value) })}
              className="w-full h-1 bg-slate-100 dark:bg-slate-900 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
          </div>
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">
            {task.duration}m
          </div>
        </div>
      </div>
    </div>
  );
}
