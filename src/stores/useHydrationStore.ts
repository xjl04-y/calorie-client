/**
 * useHydrationStore - 独立补水状态管理
 * [New V6.0] 将补水相关逻辑从 BattleStore 中分离
 * 
 * 职责:
 * - 补水记录的 CRUD 操作
 * - 补水提醒管理
 * - 补水目标与进度追踪
 * - RPG 效果处理 (净化、Buff)
 */
import { defineStore } from 'pinia';
import { reactive, computed, watch } from 'vue';
import { showToast, showNotify } from 'vant';
import type { HydrationLog, FoodLog } from '@/types';
// generateId 目前未使用，保留供未来扩展

import { useSystemStore } from './useSystemStore';
import { useHeroStore } from './useHeroStore';
import { useLogStore } from './useLogStore';
import { useCollectionStore } from './useCollectionStore';

// 饮品预设
const DRINK_PRESETS = [
  { id: 'water', name: '纯净水', icon: '💧', defaultAmount: 250, type: 'WATER' as const, tags: ['纯净'] },
  { id: 'hot_water', name: '温开水', icon: '🫖', defaultAmount: 250, type: 'WATER' as const, temperature: 'WARM' as const, tags: ['纯净', '温热'] },
  { id: 'tea', name: '茶', icon: '🍵', defaultAmount: 200, type: 'TEA' as const, tags: ['提神'] },
  { id: 'green_tea', name: '绿茶', icon: '🍃', defaultAmount: 200, type: 'TEA' as const, tags: ['抗氧化'] },
  { id: 'coffee', name: '咖啡', icon: '☕', defaultAmount: 150, type: 'COFFEE' as const, tags: ['提神', '咖啡因'] },
  { id: 'milk', name: '牛奶', icon: '🥛', defaultAmount: 250, type: 'OTHER' as const, tags: ['蛋白质'] },
  { id: 'juice', name: '果汁', icon: '🧃', defaultAmount: 250, type: 'OTHER' as const, tags: ['维生素'] },
  { id: 'soda', name: '苏打水', icon: '🥤', defaultAmount: 330, type: 'OTHER' as const, tags: ['气泡'] }
] as const;

export type DrinkPreset = typeof DRINK_PRESETS[number];

export const useHydrationStore = defineStore('hydration', () => {
  const systemStore = useSystemStore();
  const heroStore = useHeroStore();
  const logStore = useLogStore();
  const collectionStore = useCollectionStore();

  // --- State ---
  // 临时表单状态
  const formState = reactive({
    selectedPresetId: 'water' as string,
    customName: '',
    customIcon: '💧',
    amount: 250,
    cupSize: 250,
    temperature: 'WARM' as 'COLD' | 'WARM' | 'HOT',
    type: 'WATER' as 'WATER' | 'TEA' | 'COFFEE' | 'OTHER'
  });

  // 提醒状态
  const reminderState = reactive({
    isEnabled: false,
    intervalMinutes: 60,
    lastRemindTime: 0,
    nextRemindTime: 0
  });

  // --- Getters ---
  // 用户补水配置
  const hydrationConfig = computed(() => {
    return heroStore.user.hydration || {
      dailyTargetCups: 8,
      cupSizeMl: 250,
      reminderInterval: 60,
      enableNotifications: false
    };
  });

  // 今日目标 (ml)
  const dailyTargetMl = computed(() => {
    return hydrationConfig.value.dailyTargetCups * hydrationConfig.value.cupSizeMl;
  });

  // 今日进度
  const todayProgress = computed(() => {
    const amount = logStore.todayHydrationAmount;
    const cups = logStore.todayHydrationCups;
    const target = dailyTargetMl.value;
    const percentage = Math.min(100, Math.round((amount / target) * 100));
    
    return {
      amount,
      cups,
      target,
      percentage,
      remaining: Math.max(0, target - amount),
      isComplete: amount >= target
    };
  });

  // 选中的饮品预设
  const selectedPreset = computed(() => {
    if (!formState.selectedPresetId) return null;
    return DRINK_PRESETS.find(d => d.id === formState.selectedPresetId) || null;
  });

  // 上次补水时间
  const lastDrinkTime = computed(() => {
    return heroStore.user.hydration?.lastDrinkTime || 0;
  });

  // 距离上次补水的时间 (分钟)
  const minutesSinceLastDrink = computed(() => {
    if (!lastDrinkTime.value) return Infinity;
    return Math.floor((Date.now() - lastDrinkTime.value) / 60000);
  });

  // 是否需要提醒
  const shouldRemind = computed(() => {
    if (!reminderState.isEnabled) return false;
    return minutesSinceLastDrink.value >= reminderState.intervalMinutes;
  });

  // 今日补水记录
  const todayLogs = computed(() => logStore.allTodayHydration);

  // --- Actions ---

  /**
   * 重置表单状态
   */
  function resetForm() {
    formState.selectedPresetId = 'water';
    formState.customName = '';
    formState.customIcon = '💧';
    formState.amount = hydrationConfig.value.cupSizeMl;
    formState.cupSize = hydrationConfig.value.cupSizeMl;
    formState.temperature = 'WARM';
    formState.type = 'WATER';
  }

  /**
   * 选择饮品预设
   */
  function selectPreset(presetId: string) {
    formState.selectedPresetId = presetId;
    const preset = DRINK_PRESETS.find(d => d.id === presetId);
    if (preset) {
      formState.amount = preset.defaultAmount;
      formState.type = preset.type;
      if ('temperature' in preset) {
        formState.temperature = preset.temperature;
      }
    }
  }

  /**
   * 快速补水 (一杯)
   */
  function quickDrink(presetId: string = 'water'): { log: HydrationLog } {
    const preset = DRINK_PRESETS.find(d => d.id === presetId) || DRINK_PRESETS[0];
    return commitHydration({
      name: preset.name,
      icon: preset.icon,
      amount: preset.defaultAmount,
      type: preset.type
    });
  }

  /**
   * 提交补水记录 (核心方法)
   */
  function commitHydration(options?: {
    name?: string;
    icon?: string;
    amount?: number;
    cupSize?: number;
    temperature?: 'COLD' | 'WARM' | 'HOT';
    type?: 'WATER' | 'TEA' | 'COFFEE' | 'OTHER';
  }): { log: HydrationLog } {
    // 使用传入参数或表单状态
    const preset = selectedPreset.value;
    const name = options?.name || formState.customName || preset?.name || '水';
    const icon = options?.icon || formState.customIcon || preset?.icon || '💧';
    const amount = options?.amount ?? formState.amount;
    const cupSize = options?.cupSize ?? formState.cupSize;
    const type = options?.type ?? formState.type;
    const temperature = options?.temperature ?? formState.temperature;

    // RPG 模式效果
    let healAmount = 0;
    let buffEffect = '';

    if (!systemStore.isPureMode) {
      // 在 RPG 模式下，补水可以提供轻微的治疗效果
      healAmount = Math.floor(amount / 10); // 每10ml恢复1点HP
      
      // 根据饮品类型提供特殊效果
      if (type === 'TEA') {
        buffEffect = '精神焕发';
      } else if (type === 'COFFEE') {
        buffEffect = '专注力提升';
      }
    }

    // 使用新格式存储到 LogStore
    const savedLog = logStore.addHydrationLog({
      name,
      icon,
      amount,
      cupSize,
      type,
      temperature,
      healAmount,
      buffEffect
    });

    // 更新用户补水时间
    if (heroStore.user.hydration) {
      heroStore.user.hydration.lastDrinkTime = Date.now();
    }

    // RPG 模式效果
    if (!systemStore.isPureMode) {
      systemStore.triggerHealEffect();
      heroStore.heal(healAmount);
      
      // 根据饮品类型显示不同提示
      let message = '💧 净化之水！身心舒畅！';
      if (type === 'TEA') {
        message = '🍵 茶韵悠长，精神焕发！';
      } else if (type === 'COFFEE') {
        message = '☕ 咖啡提神，专注力 +1！';
      }
      
      showNotify({ type: 'primary', message });
    } else {
      showToast({ type: 'success', message: `💧 补水 +${amount}ml` });
    }

    // 任务检查 (兼容旧的任务系统)
    const legacyFormat: FoodLog = {
      id: savedLog.id,
      name: savedLog.name,
      icon: savedLog.icon,
      calories: 0,
      p: 0, c: 0, f: 0,
      grams: savedLog.amount,
      mealType: 'HYDRATION',
      timestamp: savedLog.timestamp,
      category: 'DRINK',
      tags: ['纯净']
    };
    collectionStore.checkDailyQuests(legacyFormat);

    // 检查是否完成今日目标
    // 只在首次达到目标时显示通知
    const wasComplete = todayProgress.value.isComplete;
    // 重新计算进度以获取最新的状态
    const newProgress = {
      amount: logStore.todayHydrationAmount,
      cups: logStore.todayHydrationCups,
      target: dailyTargetMl.value,
      percentage: Math.min(100, Math.round((logStore.todayHydrationAmount / dailyTargetMl.value) * 100)),
      remaining: Math.max(0, dailyTargetMl.value - logStore.todayHydrationAmount),
      isComplete: logStore.todayHydrationAmount >= dailyTargetMl.value
    };
    
    if (newProgress.isComplete && !wasComplete) {
      if (!systemStore.isPureMode) {
        showNotify({
          type: 'success',
          message: '🎉 今日补水目标已达成！',
          background: '#22c55e',
          duration: 3000
        });
      }
    }

    // 重置表单
    resetForm();

    return { log: savedLog };
  }

  /**
   * 删除补水记录
   */
  function removeHydration(logId: number | string): HydrationLog | null {
    return logStore.removeHydrationLog(logId);
  }

  /**
   * 更新补水配置
   */
  function updateConfig(config: Partial<{
    dailyTargetCups: number;
    cupSizeMl: number;
    reminderInterval: number;
    enableNotifications: boolean;
  }>) {
    if (heroStore.user.hydration) {
      Object.assign(heroStore.user.hydration, config);
    }
    
    // 同步提醒状态
    if (config.enableNotifications !== undefined) {
      reminderState.isEnabled = config.enableNotifications;
    }
    if (config.reminderInterval !== undefined) {
      reminderState.intervalMinutes = config.reminderInterval;
    }
  }

  /**
   * 启用/禁用提醒
   */
  function toggleReminder(enabled: boolean) {
    reminderState.isEnabled = enabled;
    if (heroStore.user.hydration) {
      heroStore.user.hydration.enableNotifications = enabled;
    }
    
    if (enabled) {
      _scheduleNextReminder();
    }
  }

  /**
   * 获取补水建议
   */
  function getSuggestion(): { message: string; icon: string; type: 'INFO' | 'WARN' | 'GOOD' } {
    const progress = todayProgress.value;
    const minutesSince = minutesSinceLastDrink.value;
    
    if (progress.isComplete) {
      return { message: '今日补水目标已完成，保持水分充足！', icon: '✨', type: 'GOOD' };
    }
    
    if (minutesSince > 120) {
      return { message: '已经超过2小时没喝水了，快来补充水分！', icon: '⚠️', type: 'WARN' };
    }
    
    if (minutesSince > 60) {
      return { message: '一小时没喝水了，来杯水保持活力吧！', icon: '💧', type: 'INFO' };
    }
    
    if (progress.percentage < 30) {
      return { message: `今日进度 ${progress.percentage}%，还需要 ${progress.remaining}ml`, icon: '🥤', type: 'INFO' };
    }
    
    if (progress.percentage < 70) {
      return { message: `进度不错！再来 ${progress.remaining}ml 就达标了`, icon: '💪', type: 'INFO' };
    }
    
    return { message: `即将达标！只差 ${progress.remaining}ml 了`, icon: '🎯', type: 'GOOD' };
  }

  // --- Internal Helpers ---
  function _scheduleNextReminder() {
    if (!reminderState.isEnabled) return;
    
    const now = Date.now();
    reminderState.nextRemindTime = now + (reminderState.intervalMinutes * 60 * 1000);
  }

  // 监听配置变化，同步提醒状态
  watch(
    () => heroStore.user.hydration,
    (config) => {
      if (config) {
        reminderState.isEnabled = config.enableNotifications || false;
        reminderState.intervalMinutes = config.reminderInterval || 60;
      }
    },
    { immediate: true, deep: true }
  );

  return {
    // State
    formState,
    reminderState,
    
    // Getters
    hydrationConfig,
    dailyTargetMl,
    todayProgress,
    selectedPreset,
    lastDrinkTime,
    minutesSinceLastDrink,
    shouldRemind,
    todayLogs,
    
    // 常量导出
    DRINK_PRESETS,
    
    // Actions
    resetForm,
    selectPreset,
    quickDrink,
    commitHydration,
    removeHydration,
    updateConfig,
    toggleReminder,
    getSuggestion
  };
});
