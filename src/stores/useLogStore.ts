import { defineStore } from 'pinia';
import { reactive, computed, toRaw } from 'vue';
import { getLocalDateStr } from '@/utils/dateUtils';
import { generateId } from '@/utils/gameUtils';
import type { 
  FoodLog, ExerciseLog, HydrationLog, DailyLog,
  isExerciseLog, isHydrationLog, isFoodLog, 
  isLegacyExerciseLog, isLegacyHydrationLog 
} from '@/types';
import { useSystemStore } from './useSystemStore';

// 将日志相关的基础统计逻辑剥离到这里
// [Refactor V6.0] 支持三种独立记录类型
export const useLogStore = defineStore('log', () => {
  const systemStore = useSystemStore();

  // --- State ---
  // 食物日志 (保持原有结构，向后兼容)
  const logs = reactive<Record<string, FoodLog[]>>({});
  
  // [New V6.0] 运动日志 - 独立存储
  const exerciseLogs = reactive<Record<string, ExerciseLog[]>>({});
  
  // [New V6.0] 补水日志 - 独立存储
  const hydrationLogs = reactive<Record<string, HydrationLog[]>>({});

  // 全局统计缓存 (历史总计，不含今日)
  const globalStats = reactive({
    totalP: 0, totalC: 0, totalF: 0, totalCals: 0
  });
  
  // [New V6.0] 运动统计缓存
  const exerciseStats = reactive({
    totalBurned: 0,        // 历史总消耗
    totalDuration: 0,      // 历史总时长 (分钟)
    totalSessions: 0       // 历史总次数
  });
  
  // [New V6.0] 补水统计缓存
  const hydrationStats = reactive({
    totalAmount: 0,        // 历史总饮水量 (ml)
    totalCups: 0           // 历史总杯数
  });

  // --- Getters ---
  const todayLogs = computed((): FoodLog[] => {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    return logs[dateKey] || [];
  });
  
  // [New V6.0] 今日运动记录
  const todayExerciseLogsNew = computed((): ExerciseLog[] => {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    return exerciseLogs[dateKey] || [];
  });
  
  // [New V6.0] 今日补水记录
  const todayHydrationLogsNew = computed((): HydrationLog[] => {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    return hydrationLogs[dateKey] || [];
  });

  // [向后兼容] 筛选今日的食物记录 (不含运动/补水)
  const todayFoodLogs = computed(() => {
    return todayLogs.value.filter(l => 
      l.mealType !== 'EXERCISE' && l.mealType !== 'HYDRATION'
    );
  });

  // [向后兼容] 筛选今日的运动记录 (旧数据格式)
  const todayExerciseLogs = computed(() => {
    return todayLogs.value.filter(l => l.mealType === 'EXERCISE');
  });
  
  // [向后兼容] 筛选今日的补水记录 (旧数据格式)
  const todayHydrationLogsLegacy = computed(() => {
    return todayLogs.value.filter(l => l.mealType === 'HYDRATION');
  });
  
  // [New V6.0] 合并新旧格式的运动记录
  const allTodayExercise = computed(() => {
    const newLogs = todayExerciseLogsNew.value;
    const legacyLogs = todayExerciseLogs.value;
    // 将旧格式转换为统一视图
    const legacyConverted = legacyLogs.map(l => ({
      id: l.id,
      logType: 'EXERCISE' as const,
      name: l.name,
      icon: l.icon,
      duration: l.grams || 30,
      caloriesBurned: l.calories || 0,
      timestamp: l.timestamp,
      healAmount: l.healed,
      tags: l.tags
    }));
    return [...newLogs, ...legacyConverted];
  });
  
  // [New V6.0] 合并新旧格式的补水记录
  const allTodayHydration = computed(() => {
    const newLogs = todayHydrationLogsNew.value;
    const legacyLogs = todayHydrationLogsLegacy.value;
    // 将旧格式转换为统一视图
    const legacyConverted = legacyLogs.map(l => ({
      id: l.id,
      logType: 'HYDRATION' as const,
      name: l.name,
      icon: l.icon || '💧',
      amount: l.grams || 250,
      timestamp: l.timestamp
    }));
    return [...newLogs, ...legacyConverted];
  });

  const logsReverse = computed(() => [...todayLogs.value].reverse());

  // [Modified] 仅统计饮食的宏量 (Macro)
  const todayMacros = computed(() => {
    return todayFoodLogs.value.reduce((acc, log) => ({
      cals: acc.cals + (log.calories || 0),
      p: acc.p + (log.p || 0),
      c: acc.c + (log.c || 0),
      f: acc.f + (log.f || 0)
    }), { cals: 0, p: 0, c: 0, f: 0 });
  });

  // [New V6.0] 统计今日运动消耗 (合并新旧格式)
  const todayBurn = computed(() => {
    const newBurn = todayExerciseLogsNew.value.reduce((acc, log) => acc + (log.caloriesBurned || 0), 0);
    const legacyBurn = todayExerciseLogs.value.reduce((acc, log) => acc + (log.calories || 0), 0);
    return newBurn + legacyBurn;
  });
  
  // [New V6.0] 统计今日运动时长 (分钟)
  const todayExerciseDuration = computed(() => {
    const newDuration = todayExerciseLogsNew.value.reduce((acc, log) => acc + (log.duration || 0), 0);
    const legacyDuration = todayExerciseLogs.value.reduce((acc, log) => acc + (log.grams || 0), 0);
    return newDuration + legacyDuration;
  });
  
  // [New V6.0] 统计今日补水量 (ml)
  const todayHydrationAmount = computed(() => {
    const newAmount = todayHydrationLogsNew.value.reduce((acc, log) => acc + (log.amount || 0), 0);
    const legacyAmount = todayHydrationLogsLegacy.value.reduce((acc, log) => acc + (log.grams || 0), 0);
    return newAmount + legacyAmount;
  });
  
  // [New V6.0] 统计今日补水杯数
  const todayHydrationCups = computed(() => {
    return todayHydrationLogsNew.value.length + todayHydrationLogsLegacy.value.length;
  });

  // 计算今日造成的"有效伤害总额" (只计算食物伤害，不计算运动)
  const todayDamage = computed(() => {
    return todayFoodLogs.value.reduce((total, log) => {
      // 这里的 damageTaken 逻辑如果是反伤扣除，则不算作对 Boss 伤害
      const dmg = Math.floor((log.calories || 0) * (log.multiplier || 1));
      return total + dmg;
    }, 0);
  });

  const historyTotalMacros = computed(() => ({ ...globalStats }));

  // [New] 获取上一餐的时间 (用于断食计算)
  const lastMealTime = computed(() => {
    // 查找最近一条非运动记录
    const lastLog = todayFoodLogs.value[0]; // todayLogs 已按时间倒序排列(unshift)
    if (lastLog) return new Date(lastLog.timestamp).getTime();
    return 0;
  });

  // --- Actions ---

  // 纯粹的添加食物日志，不涉及战斗结算弹窗
  function addLog(logItem: FoodLog) {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    if (!logs[dateKey]) logs[dateKey] = [];

    // 确保数据纯净
    const newLog: FoodLog = {
      ...JSON.parse(JSON.stringify(toRaw(logItem))),
      id: logItem.id || generateId(),
      timestamp: logItem.timestamp || new Date().toISOString()
    };

    logs[dateKey].unshift(newLog);
    // 只有饮食才计入全局统计 (用于属性成长)
    if (newLog.mealType !== 'EXERCISE' && newLog.mealType !== 'HYDRATION') {
      _updateGlobalStats(newLog, 1);
    }
    return newLog;
  }
  
  // [New V6.0] 添加运动记录 (新格式)
  function addExerciseLog(logItem: Omit<ExerciseLog, 'id' | 'timestamp' | 'logType'>): ExerciseLog {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    if (!exerciseLogs[dateKey]) exerciseLogs[dateKey] = [];
    
    const newLog: ExerciseLog = {
      ...logItem,
      id: generateId(),
      logType: 'EXERCISE',
      timestamp: new Date().toISOString()
    };
    
    exerciseLogs[dateKey].unshift(newLog);
    
    // 更新全局运动统计
    exerciseStats.totalBurned += newLog.caloriesBurned || 0;
    exerciseStats.totalDuration += newLog.duration || 0;
    exerciseStats.totalSessions += 1;
    
    return newLog;
  }
  
  // [New V6.0] 添加补水记录 (新格式)
  function addHydrationLog(logItem: Omit<HydrationLog, 'id' | 'timestamp' | 'logType'>): HydrationLog {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    if (!hydrationLogs[dateKey]) hydrationLogs[dateKey] = [];
    
    const newLog: HydrationLog = {
      ...logItem,
      id: generateId(),
      logType: 'HYDRATION',
      timestamp: new Date().toISOString()
    };
    
    hydrationLogs[dateKey].unshift(newLog);
    
    // 更新全局补水统计
    hydrationStats.totalAmount += newLog.amount || 0;
    hydrationStats.totalCups += 1;
    
    return newLog;
  }

  function removeLog(logId: number | string) {
    const dateKey = systemStore.currentDate || '';
    const dayLogs = logs[dateKey];
    if (!dayLogs) return null;

    const idx = dayLogs.findIndex(l => l.id === logId);
    if (idx !== -1) {
      const removed = dayLogs[idx];
      dayLogs.splice(idx, 1);
      if (removed && removed.mealType !== 'EXERCISE' && removed.mealType !== 'HYDRATION') {
        _updateGlobalStats(removed, -1);
      }
      return removed;
    }
    return null;
  }
  
  // [New V6.0] 删除运动记录
  function removeExerciseLog(logId: number | string): ExerciseLog | null {
    const dateKey = systemStore.currentDate || '';
    const dayLogs = exerciseLogs[dateKey];
    if (!dayLogs) return null;
    
    const idx = dayLogs.findIndex(l => l.id === logId);
    if (idx !== -1) {
      const removed = dayLogs[idx];
      dayLogs.splice(idx, 1);
      
      // 更新统计
      if (removed) {
        exerciseStats.totalBurned -= removed.caloriesBurned || 0;
        exerciseStats.totalDuration -= removed.duration || 0;
        exerciseStats.totalSessions = Math.max(0, exerciseStats.totalSessions - 1);
      }
      return removed || null;
    }
    return null;
  }
  
  // [New V6.0] 删除补水记录
  function removeHydrationLog(logId: number | string): HydrationLog | null {
    const dateKey = systemStore.currentDate || '';
    const dayLogs = hydrationLogs[dateKey];
    if (!dayLogs) return null;
    
    const idx = dayLogs.findIndex(l => l.id === logId);
    if (idx !== -1) {
      const removed = dayLogs[idx];
      dayLogs.splice(idx, 1);
      
      // 更新统计
      if (removed) {
        hydrationStats.totalAmount -= removed.amount || 0;
        hydrationStats.totalCups = Math.max(0, hydrationStats.totalCups - 1);
      }
      return removed || null;
    }
    return null;
  }

  function _updateGlobalStats(log: FoodLog, sign: 1 | -1) {
    globalStats.totalP = Math.max(0, Math.round(globalStats.totalP + (log.p || 0) * sign));
    globalStats.totalC = Math.max(0, Math.round(globalStats.totalC + (log.c || 0) * sign));
    globalStats.totalF = Math.max(0, Math.round(globalStats.totalF + (log.f || 0) * sign));
    globalStats.totalCals = Math.max(0, Math.round(globalStats.totalCals + (log.calories || 0) * sign));
  }

  // 重新计算所有历史数据 (用于读档后)
  function recalculateGlobalStats() {
    let p = 0, c = 0, f = 0, cals = 0;
    Object.values(logs).forEach((dayLogs) => {
      if (Array.isArray(dayLogs)) {
        dayLogs.forEach(l => {
          if (l.mealType !== 'EXERCISE' && l.mealType !== 'HYDRATION') {
            p += (l.p || 0); c += (l.c || 0); f += (l.f || 0); cals += (l.calories || 0);
          }
        });
      }
    });
    globalStats.totalP = Math.round(p);
    globalStats.totalC = Math.round(c);
    globalStats.totalF = Math.round(f);
    globalStats.totalCals = Math.round(cals);
    
    // [New V6.0] 同时重算运动和补水统计
    recalculateExerciseStats();
    recalculateHydrationStats();
  }
  
  // [New V6.0] 重新计算运动统计
  function recalculateExerciseStats() {
    let burned = 0, duration = 0, sessions = 0;
    
    // 新格式数据
    Object.values(exerciseLogs).forEach((dayLogs) => {
      if (Array.isArray(dayLogs)) {
        dayLogs.forEach(l => {
          burned += (l.caloriesBurned || 0);
          duration += (l.duration || 0);
          sessions += 1;
        });
      }
    });
    
    // 旧格式数据 (从 logs 中统计)
    Object.values(logs).forEach((dayLogs) => {
      if (Array.isArray(dayLogs)) {
        dayLogs.forEach(l => {
          if (l.mealType === 'EXERCISE') {
            burned += (l.calories || 0);
            duration += (l.grams || 0);
            sessions += 1;
          }
        });
      }
    });
    
    exerciseStats.totalBurned = burned;
    exerciseStats.totalDuration = duration;
    exerciseStats.totalSessions = sessions;
  }
  
  // [New V6.0] 重新计算补水统计
  function recalculateHydrationStats() {
    let amount = 0, cups = 0;
    
    // 新格式数据
    Object.values(hydrationLogs).forEach((dayLogs) => {
      if (Array.isArray(dayLogs)) {
        dayLogs.forEach(l => {
          amount += (l.amount || 0);
          cups += 1;
        });
      }
    });
    
    // 旧格式数据 (从 logs 中统计)
    Object.values(logs).forEach((dayLogs) => {
      if (Array.isArray(dayLogs)) {
        dayLogs.forEach(l => {
          if (l.mealType === 'HYDRATION') {
            amount += (l.grams || 0);
            cups += 1;
          }
        });
      }
    });
    
    hydrationStats.totalAmount = amount;
    hydrationStats.totalCups = cups;
  }
  
  // [New V6.0] 可选的数据迁移函数：将旧格式运动/补水记录迁移到新格式
  // 返回迁移的记录数量
  function migrateOldLogs(): { exerciseMigrated: number; hydrationMigrated: number } {
    let exerciseMigrated = 0;
    let hydrationMigrated = 0;
    
    Object.entries(logs).forEach(([dateKey, dayLogs]) => {
      if (!Array.isArray(dayLogs)) return;
      
      const toRemove: number[] = [];
      
      dayLogs.forEach((log, idx) => {
        // 迁移运动记录
        if (log.mealType === 'EXERCISE') {
          if (!exerciseLogs[dateKey]) exerciseLogs[dateKey] = [];
          
          const newLog: ExerciseLog = {
            id: log.id,
            logType: 'EXERCISE',
            name: log.name,
            icon: log.icon,
            duration: log.grams || 30,
            caloriesBurned: log.calories || 0,
            timestamp: log.timestamp,
            healAmount: log.healed,
            tags: log.tags,
            tips: log.tips
          };
          
          exerciseLogs[dateKey].push(newLog);
          toRemove.push(idx);
          exerciseMigrated++;
        }
        
        // 迁移补水记录
        if (log.mealType === 'HYDRATION') {
          if (!hydrationLogs[dateKey]) hydrationLogs[dateKey] = [];
          
          const newLog: HydrationLog = {
            id: log.id,
            logType: 'HYDRATION',
            name: log.name,
            icon: log.icon || '💧',
            amount: log.grams || 250,
            timestamp: log.timestamp
          };
          
          hydrationLogs[dateKey].push(newLog);
          toRemove.push(idx);
          hydrationMigrated++;
        }
      });
      
      // 从原数组中移除已迁移的记录 (从后往前删除以保持索引正确)
      for (let i = toRemove.length - 1; i >= 0; i--) {
        dayLogs.splice(toRemove[i], 1);
      }
    });
    
    // 重新计算统计
    recalculateExerciseStats();
    recalculateHydrationStats();
    
    return { exerciseMigrated, hydrationMigrated };
  }

  return {
    // State
    logs,
    exerciseLogs,
    hydrationLogs,
    globalStats,
    exerciseStats,
    hydrationStats,
    
    // 食物相关 Getters
    todayLogs,
    todayFoodLogs,
    logsReverse,
    todayMacros,
    todayDamage,
    historyTotalMacros,
    lastMealTime,
    
    // 运动相关 Getters
    todayExerciseLogs,          // 旧格式兼容
    todayExerciseLogsNew,       // 新格式
    allTodayExercise,           // 合并视图
    todayBurn,
    todayExerciseDuration,
    
    // 补水相关 Getters
    todayHydrationLogsLegacy,   // 旧格式兼容
    todayHydrationLogsNew,      // 新格式
    allTodayHydration,          // 合并视图
    todayHydrationAmount,
    todayHydrationCups,
    
    // 食物 Actions
    addLog,
    removeLog,
    recalculateGlobalStats,
    
    // 运动 Actions
    addExerciseLog,
    removeExerciseLog,
    recalculateExerciseStats,
    
    // 补水 Actions
    addHydrationLog,
    removeHydrationLog,
    recalculateHydrationStats,
    
    // 数据迁移
    migrateOldLogs
  };
});
