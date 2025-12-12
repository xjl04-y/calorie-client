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

  // 全局统计缓存
  const globalStats = reactive({
    totalP: 0, totalC: 0, totalF: 0, totalCals: 0
  });

  // --- Getters ---
  const todayLogs = computed((): FoodLog[] => {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    return logs[dateKey] || [];
  });

  const logsReverse = computed(() => [...todayLogs.value].reverse());

  const todayMacros = computed(() => {
    return todayLogs.value.reduce((acc, log) => ({
      cals: acc.cals + (log.calories || 0),
      p: acc.p + (log.p || 0),
      c: acc.c + (log.c || 0),
      f: acc.f + (log.f || 0)
    }), { cals: 0, p: 0, c: 0, f: 0 });
  });

  // 计算今日造成的"有效伤害总额" (数据层只管提供数值，不管 Boss 死没死)
  const todayDamage = computed(() => {
    return todayLogs.value.reduce((total, log) => {
      // 这里的 damageTaken 逻辑如果是反伤扣除，则不算作对 Boss 伤害
      // 仅计算有效攻击
      const dmg = Math.floor((log.calories || 0) * (log.multiplier || 1));
      return total + dmg;
    }, 0);
  });

  const historyTotalMacros = computed(() => ({ ...globalStats }));

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
    _updateGlobalStats(newLog, 1);
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
      if (removed) {
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
          p += (l.p || 0); c += (l.c || 0); f += (l.f || 0); cals += (l.calories || 0);
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
    logsReverse,
    todayMacros,
    todayDamage,
    historyTotalMacros,
    addLog,
    removeLog,
    recalculateGlobalStats
  };
});
