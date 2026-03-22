import { ScheduledTask, TaskTemplate } from "../types";

/**
 * Mocks an AI-driven schedule optimization.
 * In a real app, this would call a Gemini model to reorder tasks based on 
 * priority, energy levels, and historical performance.
 */
export async function optimizeSchedule(tasks: ScheduledTask[], templates: TaskTemplate[]): Promise<ScheduledTask[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Simple optimization logic: 
  // 1. Keep completed tasks as they are.
  // 2. Reorder remaining tasks to minimize gaps.
  // 3. Ensure locked tasks stay at their fixed times.
  
  const completed = tasks.filter(t => t.isCompleted);
  const remaining = tasks.filter(t => !t.isCompleted);
  
  // Sort remaining by original start time for now, but could be smarter
  const sortedRemaining = [...remaining].sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  return [...completed, ...sortedRemaining];
}

export function calculateWeeklyAverages(templates: TaskTemplate[]): { title: string; avgMinutes: number; color: string }[] {
  const averages: { title: string; avgMinutes: number; color: string }[] = [];
  const today = new Date();
  
  // Map to store total duration and count for each template
  const statsMap: Record<string, { totalSeconds: number; count: number; color: string }> = {};

  // Look back 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const savedTasks = localStorage.getItem(`tasks-${dateStr}`);
    
    if (savedTasks) {
      const dayTasks: ScheduledTask[] = JSON.parse(savedTasks);
      dayTasks.forEach(task => {
        if (task.isCompleted) {
          if (!statsMap[task.title]) {
            statsMap[task.title] = { totalSeconds: 0, count: 0, color: task.color };
          }
          statsMap[task.title].totalSeconds += task.actualDuration;
          statsMap[task.title].count += 1;
        }
      });
    }
  }

  Object.entries(statsMap).forEach(([title, data]) => {
    averages.push({
      title,
      avgMinutes: Math.round(data.totalSeconds / (data.count || 1) / 60),
      color: data.color
    });
  });

  return averages.sort((a, b) => b.avgMinutes - a.avgMinutes);
}
