import { defineStore } from 'pinia';
import { reactive, computed, toRaw } from 'vue';
import { getLocalDateStr } from '@/utils/dateUtils';
import { generateId } from '@/utils/gameUtils';
import type { FoodLog } from '@/types';
import { useSystemStore } from './useSystemStore';

// 将日志相关的基础统计逻辑剥离到这里
export const useLogStore = defineStore('log', () => {
  const systemStore = useSystemStore();

  // --- State ---
  const logs = reactive<Record<string, FoodLog[]>>({});

  // 全局统计缓存 (历史总计，不含今日)
  const globalStats = reactive({
    totalP: 0, totalC: 0, totalF: 0, totalCals: 0
  });

  // --- Getters ---
  const todayLogs = computed((): FoodLog[] => {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    return logs[dateKey] || [];
  });

  // [New] 筛选今日的饮食记录 (不含运动)
  const todayFoodLogs = computed(() => {
    return todayLogs.value.filter(l => l.mealType !== 'EXERCISE');
  });

  // [New] 筛选今日的运动记录
  const todayExerciseLogs = computed(() => {
    return todayLogs.value.filter(l => l.mealType === 'EXERCISE');
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

  // [New] 统计今日运动消耗
  const todayBurn = computed(() => {
    return todayExerciseLogs.value.reduce((acc, log) => acc + (log.calories || 0), 0);
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

  // 纯粹的添加日志，不涉及战斗结算弹窗
  function addLog(logItem: FoodLog) {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    if (!logs[dateKey]) logs[dateKey] = [];

    // 确保数据纯净
    const newLog: FoodLog = {
      ...JSON.parse(JSON.stringify(toRaw(logItem))),
      id: logItem.id || generateId(), // 确保有 ID
      timestamp: logItem.timestamp || new Date().toISOString()
    };

    logs[dateKey].unshift(newLog);
    // 只有饮食才计入全局统计 (用于属性成长)
    if (newLog.mealType !== 'EXERCISE') {
      _updateGlobalStats(newLog, 1);
    }
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
      if (removed && removed.mealType !== 'EXERCISE') {
        _updateGlobalStats(removed, -1);
      }
      return removed;
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
          if (l.mealType !== 'EXERCISE') {
            p += (l.p || 0); c += (l.c || 0); f += (l.f || 0); cals += (l.calories || 0);
          }
        });
      }
    });
    globalStats.totalP = Math.round(p);
    globalStats.totalC = Math.round(c);
    globalStats.totalF = Math.round(f);
    globalStats.totalCals = Math.round(cals);
  }

  return {
    logs,
    globalStats,
    todayLogs,
    todayFoodLogs,
    todayExerciseLogs,
    logsReverse,
    todayMacros,
    todayBurn,
    todayDamage,
    historyTotalMacros,
    lastMealTime,
    addLog,
    removeLog,
    recalculateGlobalStats
  };
});
