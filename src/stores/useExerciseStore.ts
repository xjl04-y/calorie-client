/**
 * useExerciseStore - 独立运动状态管理
 * [New V6.0] 将运动相关逻辑从 BattleStore 中分离
 * 
 * 职责:
 * - 运动记录的 CRUD 操作
 * - 运动 RPG 效果计算 (治疗、护盾、金币转化)
 * - 运动预设管理
 * - 运动统计与分析
 */
import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { showToast, showNotify } from 'vant';
import type { ExerciseLog } from '@/types';
import { generateId } from '@/utils/gameUtils';

import { useSystemStore } from './useSystemStore';
import { useHeroStore } from './useHeroStore';
import { useLogStore } from './useLogStore';

// 运动强度系数 (用于消耗计算)
const INTENSITY_MULTIPLIERS = {
  LOW: 0.8,
  MEDIUM: 1.0,
  HIGH: 1.3
} as const;

// 预设运动库
const EXERCISE_PRESETS = [
  { id: 'walk', name: '散步', icon: '🚶', baseCaloriesPerMin: 3, intensity: 'LOW' as const, tags: ['有氧', '轻松'] },
  { id: 'run', name: '跑步', icon: '🏃', baseCaloriesPerMin: 10, intensity: 'HIGH' as const, tags: ['有氧', '燃脂'] },
  { id: 'cycling', name: '骑行', icon: '🚴', baseCaloriesPerMin: 7, intensity: 'MEDIUM' as const, tags: ['有氧', '户外'] },
  { id: 'swim', name: '游泳', icon: '🏊', baseCaloriesPerMin: 9, intensity: 'HIGH' as const, tags: ['有氧', '全身'] },
  { id: 'yoga', name: '瑜伽', icon: '🧘', baseCaloriesPerMin: 4, intensity: 'LOW' as const, tags: ['柔韧', '冥想'] },
  { id: 'strength', name: '力量训练', icon: '🏋️', baseCaloriesPerMin: 6, intensity: 'MEDIUM' as const, tags: ['力量', '增肌'] },
  { id: 'hiit', name: 'HIIT', icon: '⚡', baseCaloriesPerMin: 12, intensity: 'HIGH' as const, tags: ['高强度', '燃脂'] },
  { id: 'dance', name: '跳舞', icon: '💃', baseCaloriesPerMin: 6, intensity: 'MEDIUM' as const, tags: ['有氧', '娱乐'] },
  { id: 'climb', name: '爬山', icon: '🧗', baseCaloriesPerMin: 8, intensity: 'HIGH' as const, tags: ['有氧', '户外'] },
  { id: 'badminton', name: '羽毛球', icon: '🏸', baseCaloriesPerMin: 7, intensity: 'MEDIUM' as const, tags: ['球类', '娱乐'] },
  { id: 'basketball', name: '篮球', icon: '🏀', baseCaloriesPerMin: 8, intensity: 'HIGH' as const, tags: ['球类', '团队'] },
  { id: 'housework', name: '做家务', icon: '🧹', baseCaloriesPerMin: 3, intensity: 'LOW' as const, tags: ['日常', '轻松'] }
] as const;

export type ExercisePreset = typeof EXERCISE_PRESETS[number];

export const useExerciseStore = defineStore('exercise', () => {
  const systemStore = useSystemStore();
  const heroStore = useHeroStore();
  const logStore = useLogStore();

  // --- State ---
  // 自定义运动库 (用户添加的运动)
  const customExercises = reactive<ExercisePreset[]>([]);
  
  // 临时表单状态 (用于 Modal/Page)
  const formState = reactive({
    selectedPresetId: '' as string,
    customName: '',
    customIcon: '🏃',
    duration: 30,
    intensity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    manualCalories: 0, // 手动输入的消耗值
    useManualCalories: false
  });

  // --- Getters ---
  // 所有可用运动 (预设 + 自定义)
  const allExercises = computed(() => {
    return [...EXERCISE_PRESETS, ...customExercises];
  });

  // 选中的运动预设
  const selectedPreset = computed(() => {
    if (!formState.selectedPresetId) return null;
    return allExercises.value.find(e => e.id === formState.selectedPresetId) || null;
  });

  // 预估消耗热量
  const estimatedCalories = computed(() => {
    if (formState.useManualCalories) {
      return formState.manualCalories;
    }
    
    const preset = selectedPreset.value;
    if (!preset) return 0;
    
    const userWeight = heroStore.user.weight || 60;
    const weightFactor = userWeight / 60; // 以60kg为基准
    const intensityMult = INTENSITY_MULTIPLIERS[formState.intensity];
    
    return Math.round(
      preset.baseCaloriesPerMin * formState.duration * weightFactor * intensityMult
    );
  });

  // 今日运动统计
  const todayStats = computed(() => {
    const exercises = logStore.allTodayExercise;
    return {
      totalBurned: exercises.reduce((acc, log) => acc + (log.caloriesBurned || 0), 0),
      totalDuration: exercises.reduce((acc, log) => acc + (log.duration || 0), 0),
      totalSessions: exercises.length
    };
  });

  // 预计 RPG 效果
  const estimatedRpgEffects = computed(() => {
    const calories = estimatedCalories.value;
    const healAmt = 50 + Math.floor(calories / 10);
    
    const currentHp = heroStore.user.heroCurrentHp;
    const maxHp = heroStore.user.heroMaxHp;
    const missingHp = maxHp - currentHp;
    
    let actualHeal = 0;
    let shieldGained = 0;
    let goldGained = 0;
    
    if (healAmt <= missingHp) {
      actualHeal = healAmt;
    } else {
      actualHeal = missingHp;
      const overflow = healAmt - missingHp;
      
      const shieldCap = maxHp;
      const currentShield = heroStore.user.heroShield || 0;
      const shieldSpace = shieldCap - currentShield;
      
      if (shieldSpace > 0) {
        shieldGained = Math.min(overflow, shieldSpace);
        const remainingOverflow = overflow - shieldGained;
        if (remainingOverflow > 0) {
          goldGained = Math.floor(remainingOverflow * 0.5);
        }
      } else {
        goldGained = Math.floor(overflow * 0.5);
      }
    }
    
    return { healAmount: actualHeal, shieldGained, goldGained };
  });

  // --- Actions ---
  
  /**
   * 重置表单状态
   */
  function resetForm() {
    formState.selectedPresetId = '';
    formState.customName = '';
    formState.customIcon = '🏃';
    formState.duration = 30;
    formState.intensity = 'MEDIUM';
    formState.manualCalories = 0;
    formState.useManualCalories = false;
  }

  /**
   * 选择预设运动
   */
  function selectPreset(presetId: string) {
    formState.selectedPresetId = presetId;
    const preset = allExercises.value.find(e => e.id === presetId);
    if (preset) {
      formState.intensity = preset.intensity;
    }
  }

  /**
   * 计算指定运动的消耗热量
   */
  function calculateCalories(
    baseCaloriesPerMin: number,
    duration: number,
    intensity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
    userWeight?: number
  ): number {
    const weight = userWeight || heroStore.user.weight || 60;
    const weightFactor = weight / 60;
    const intensityMult = INTENSITY_MULTIPLIERS[intensity];
    return Math.round(baseCaloriesPerMin * duration * weightFactor * intensityMult);
  }

  /**
   * 提交运动记录 (核心方法)
   * 同时处理数据存储和 RPG 效果
   */
  function commitExercise(options?: {
    name?: string;
    icon?: string;
    duration?: number;
    caloriesBurned?: number;
    intensity?: 'LOW' | 'MEDIUM' | 'HIGH';
    baseExerciseId?: string;
    tips?: string;
    tags?: string[];
  }): { log: ExerciseLog; effects: { healAmount: number; shieldGained: number; goldGained: number } } {
    // 使用传入参数或表单状态
    const preset = selectedPreset.value;
    const name = options?.name || formState.customName || preset?.name || '运动';
    const icon = options?.icon || formState.customIcon || preset?.icon || '🏃';
    const duration = options?.duration ?? formState.duration;
    const intensity = options?.intensity ?? formState.intensity;
    const caloriesBurned = options?.caloriesBurned ?? estimatedCalories.value;
    const baseExerciseId = options?.baseExerciseId || formState.selectedPresetId;
    const tags = options?.tags || (preset?.tags as unknown as string[]) || [];
    const tips = options?.tips;
    
    const userWeight = heroStore.user.weight || 60;
    
    // RPG 模式效果计算
    const healAmt = 50 + Math.floor(caloriesBurned / 10);
    
    const currentHp = heroStore.user.heroCurrentHp;
    const maxHp = heroStore.user.heroMaxHp;
    const missingHp = maxHp - currentHp;
    
    let actualHeal = 0;
    let shieldGained = 0;
    let goldGained = 0;

    if (healAmt <= missingHp) {
      // 未满血：全部用于治疗
      heroStore.heal(healAmt);
      actualHeal = healAmt;
    } else {
      // 溢出：先补满血，剩余转护盾/金币
      if (missingHp > 0) {
        heroStore.heal(missingHp);
        actualHeal = missingHp;
      }
      const overflow = healAmt - missingHp;

      const shieldCap = maxHp;
      const currentShield = heroStore.user.heroShield || 0;
      const shieldSpace = shieldCap - currentShield;

      if (shieldSpace > 0) {
        shieldGained = Math.min(overflow, shieldSpace);
        heroStore.addShield(shieldGained);

        const remainingOverflow = overflow - shieldGained;
        if (remainingOverflow > 0) {
          goldGained = Math.floor(remainingOverflow * 0.5);
          if (goldGained > 0) {
            heroStore.addGold(goldGained, '运动转化', 'BATTLE_REWARD');
          }
        }
      } else {
        goldGained = Math.floor(overflow * 0.5);
        heroStore.addGold(goldGained, '运动转化', 'BATTLE_REWARD');
      }
    }

    // 使用新格式存储到 LogStore，包含 RPG 效果
    const savedLog = logStore.addExerciseLog({
      name,
      icon,
      duration,
      caloriesBurned,
      userWeight,
      baseExerciseId,
      intensity,
      tips,
      tags,
      healAmount: actualHeal,
      shieldGained,
      goldGained
    });

    // RPG 模式效果显示
    if (!systemStore.isPureMode) {
      systemStore.triggerHealEffect();
      if (actualHeal > 0) _spawnFloatingText(`+${actualHeal}`, 'HEAL');
      if (shieldGained > 0) setTimeout(() => _spawnFloatingText(`+${shieldGained}`, 'BLOCK'), 200);
      if (goldGained > 0) setTimeout(() => _spawnFloatingText(`+${goldGained}G`, 'EXP'), 400);
      
      // 显示通知
      if (actualHeal > 0) {
        showNotify({ type: 'success', message: `🏋️ 运动恢复：HP +${actualHeal}` });
      }
      if (shieldGained > 0) {
        showNotify({
          type: 'primary',
          message: `🛡️ 状态绝佳！获得 ${shieldGained} 点护盾！`,
          background: '#0ea5e9',
          duration: 2500
        });
      }
      if (goldGained > 0) {
        showNotify({
          type: 'warning',
          message: `💪 巅峰状态！溢出的活力转化为 ${goldGained} 金币！`,
          background: '#f59e0b',
          duration: 2500
        });
      }
    } else {
      // 纯净模式简单提示
      showToast(`运动记录成功，消耗 ${caloriesBurned} kcal`);
    }
    
    // 重置表单
    resetForm();
    
    return {
      log: savedLog,
      effects: { healAmount: actualHeal, shieldGained, goldGained }
    };
  }

  /**
   * 删除运动记录
   */
  function removeExercise(logId: number | string): ExerciseLog | null {
    return logStore.removeExerciseLog(logId);
  }

  /**
   * 添加自定义运动到库
   */
  function addCustomExercise(exercise: {
    name: string;
    icon: string;
    baseCaloriesPerMin: number;
    intensity?: 'LOW' | 'MEDIUM' | 'HIGH';
    tags?: string[];
  }) {
    const newExercise = {
      id: `custom_${generateId()}`,
      name: exercise.name,
      icon: exercise.icon,
      baseCaloriesPerMin: exercise.baseCaloriesPerMin,
      intensity: exercise.intensity || 'MEDIUM' as const,
      tags: exercise.tags || []
    };
    customExercises.push(newExercise as ExercisePreset);
    return newExercise;
  }

  /**
   * 移除自定义运动
   */
  function removeCustomExercise(exerciseId: string) {
    const idx = customExercises.findIndex(e => e.id === exerciseId);
    if (idx !== -1) {
      customExercises.splice(idx, 1);
      return true;
    }
    return false;
  }

  // --- Internal Helpers ---
  function _spawnFloatingText(text: string, type: 'DAMAGE' | 'HEAL' | 'CRIT' | 'BLOCK' | 'EXP') {
    if (systemStore.isPureMode) return;
    if (!systemStore.temp.floatingTexts) systemStore.temp.floatingTexts = [];
    systemStore.temp.floatingTexts.push({
      id: generateId(),
      text,
      type,
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 10
    });
    setTimeout(() => {
      if (systemStore.temp.floatingTexts?.length > 0) {
        systemStore.temp.floatingTexts.shift();
      }
    }, 1500);
  }

  return {
    // State
    formState,
    customExercises,
    
    // Getters
    allExercises,
    selectedPreset,
    estimatedCalories,
    todayStats,
    estimatedRpgEffects,
    
    // 常量导出
    EXERCISE_PRESETS,
    INTENSITY_MULTIPLIERS,
    
    // Actions
    resetForm,
    selectPreset,
    calculateCalories,
    commitExercise,
    removeExercise,
    addCustomExercise,
    removeCustomExercise
  };
});
