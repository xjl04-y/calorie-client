import type { FoodItem } from '@/types';

/**
 * 默认运动项目配置
 */
export const DEFAULT_EXERCISES: FoodItem[] = [
  { id: 'ex_run', name: '跑步 (中速)', originalName: '跑步', calories: 400, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: '🏃', tags: ['有氧'], isExercise: true, tips: '提升心肺，净化身心' },
  { id: 'ex_walk', name: '快走', originalName: '快走', calories: 150, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: '🚶', tags: ['有氧'], isExercise: true, tips: '轻松的战备活动' },
  { id: 'ex_swim', name: '游泳', originalName: '游泳', calories: 350, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: '🏊', tags: ['有氧'], isExercise: true, tips: '全身性的锻炼' },
  { id: 'ex_hiit', name: 'HIIT', originalName: 'HIIT', calories: 450, p: 0, c: 0, f: 0, grams: 30, unit: '分钟', icon: '🔥', tags: ['高强度'], isExercise: true, tips: '短时间爆发，燃烧极限' },
  { id: 'ex_gym', name: '力量训练', originalName: '力量训练', calories: 250, p: 0, c: 0, f: 0, grams: 45, unit: '分钟', icon: '🏋️', tags: ['增肌'], isExercise: true, tips: '强化肌肉，提升格挡' },
  { id: 'ex_yoga', name: '瑜伽', originalName: '瑜伽', calories: 100, p: 0, c: 0, f: 0, grams: 45, unit: '分钟', icon: '🧘', tags: ['柔韧'], isExercise: true, tips: '冥想与恢复' },
  { id: 'ex_cycle', name: '骑行', originalName: '骑行', calories: 300, p: 0, c: 0, f: 0, grams: 45, unit: '分钟', icon: '🚴', tags: ['有氧'], isExercise: true, tips: '追风之旅' }
];
