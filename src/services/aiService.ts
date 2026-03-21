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

export function calculateStats(tasks: ScheduledTask[]) {
  const completedTasks = tasks.filter(t => t.isCompleted);
  if (completedTasks.length === 0) return { avgDeviation: 0, stdDev: 0, efficiency: 0 };

  const deviations = completedTasks.map(t => (t.actualDuration / 60) - t.duration);
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  
  const variance = deviations.reduce((a, b) => a + Math.pow(b - avgDeviation, 2), 0) / deviations.length;
  const stdDev = Math.sqrt(variance);

  const efficiency = completedTasks.reduce((acc, t) => {
    const planned = t.duration * 60;
    return acc + (planned / Math.max(planned, t.actualDuration));
  }, 0) / completedTasks.length;

  return {
    avgDeviation: Math.round(avgDeviation * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    efficiency: Math.round(efficiency * 100)
  };
}
