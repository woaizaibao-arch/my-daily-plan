export type Category = string;
export type ModuleType = 'TASK' | 'EVENT' | 'GOAL';

export interface TaskTemplate {
  id: string;
  title: string;
  category: Category;
  defaultDuration: number; // in minutes
  color: string;
  moduleType: ModuleType;
}

export interface ScheduledTask {
  id: string;
  templateId: string;
  title: string;
  category: Category;
  startTime: string; // "HH:mm"
  duration: number; // in minutes
  isCompleted: boolean;
  actualDuration: number; // in seconds
  isRunning: boolean;
  lastStartTime?: number; // timestamp
  color: string;
  moduleType: ModuleType;
  isLocked: boolean;
  points: number;
}

export interface DailyStats {
  date: string;
  tasksCompleted: number;
  totalTasks: number;
  points: number;
  categoryTime: Record<Category, number>;
  timeDeviations: number[]; // actual - planned in seconds
}

export interface RewardCard {
  id: string;
  title: string;
  cost: number;
  icon: string;
  description: string;
}

export type UserRank = 'Beginner' | 'Consistent' | 'Productive' | 'Master' | 'Elite';

export type ViewMode = 'STUDENT' | 'PARENT';

export interface ParentTask {
  id: string;
  time: string; // "HH:mm"
  title: string;
  isCompleted: boolean;
}
