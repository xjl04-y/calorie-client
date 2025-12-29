import { defineStore } from 'pinia';
import { reactive, computed, toRaw } from 'vue';
import { getLocalDateStr } from '@/utils/dateUtils';
import { generateId } from '@/utils/gameUtils';
import type { FoodLog, ExerciseLog, HydrationLog } from '@/types';
import { useSystemStore } from './useSystemStore';
import { useHeroStore } from './useHeroStore';
import { sqliteLogService } from '@/utils/sqliteLogService';

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

    // [Critical Fix] 彻底移除了 ID 重复检查逻辑
    // 无论 logItem.id 是什么，这里都会通过 generateId() 生成全新的 ID
    // 从而允许无限添加相同的食物

    // 确保数据纯净
    const newLog: FoodLog = {
      ...JSON.parse(JSON.stringify(toRaw(logItem))),
      id: generateId(), // 强制生成唯一ID
      timestamp: logItem.timestamp || new Date().toISOString()
    };

    // [Reverted] 移除了之前的自动重命名逻辑
    // 用户的UI层已经实现了连击计数显示，这里不再修改 newLog.name

    console.log(`[LogStore] 添加日志成功: ${newLog.id} - ${newLog.name}`);
    logs[dateKey].unshift(newLog);

    // 只有饮食才计入全局统计 (用于属性成长)
    if (newLog.mealType !== 'EXERCISE') {
      _updateGlobalStats(newLog, 1);
    }

    // 保存到数据库
    _saveLogToDb(newLog, dateKey).catch(err => {
      console.error('[LogStore] 保存日志到数据库失败:', err);
    });

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

      // 从数据库删除
      sqliteLogService.deleteLog(String(logId)).catch(err => {
        console.error('[LogStore] 从数据库删除日志失败:', err);
      });

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

  // [技术工单03] 跨夜时间同步机制 - 修复“午夜幽灵”问题
  function checkDateConsistency() {
    const realToday = getLocalDateStr();
    const current = systemStore.currentDate;

    if (current !== realToday) {
      console.log(`[日期修正] 检测到时间偏移: ${current} -> ${realToday}`);
      systemStore.currentDate = realToday;
      return true; // 返回true表示日期已更新
    }
    return false;
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

  // [指令1] 新增: 更新日志的奖励字段
  function updateLogRewards(logId: number | string, gold: number, exp: number) {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    const dayLogs = logs[dateKey];
    if (!dayLogs) return;

    const log = dayLogs.find(l => l.id === logId);
    if (log) {
      log.generatedGold = gold;
      log.generatedExp = exp;
    }
  }

  // [New] 运动记录管理
  function addExerciseLog(exercise: Omit<ExerciseLog, 'id' | 'logType' | 'timestamp'>): ExerciseLog {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    if (!logs[dateKey]) logs[dateKey] = [];

    const newLog: ExerciseLog = {
      ...exercise,
      id: generateId(),
      logType: 'EXERCISE',
      timestamp: new Date().toISOString()
    };

    // 将运动记录添加到 logs 中（注意：这里将 ExerciseLog 存为 FoodLog 的特殊类型）
    logs[dateKey].unshift(newLog as any);

    // 保存到数据库
    _saveLogToDb(newLog as any, dateKey).catch(err => {
      console.error('[LogStore] 保存运动记录到数据库失败:', err);
    });

    return newLog;
  }

  function removeExerciseLog(logId: number | string): ExerciseLog | null {
    const heroStore = useHeroStore();
    const dateKey = systemStore.currentDate || '';
    const dayLogs = logs[dateKey];
    if (!dayLogs) return null;

    const idx = dayLogs.findIndex(l => l.id === logId);
    if (idx !== -1) {
      const removed = dayLogs[idx] as any as ExerciseLog;

      // [优先级二修复] 回滚运动奖励
      // 扣除金币
      if (removed.goldGained && removed.goldGained > 0) {
        heroStore.revertGold(removed.goldGained, '撤销运动记录');
      }
      // 扣除经验
      if (removed.generatedExp && removed.generatedExp > 0) {
        heroStore.revertXp(removed.generatedExp, '撤销运动记录');
      }
      // 回滚治疗/护盾效果：扣血
      if (removed.healAmount && removed.healAmount > 0) {
        heroStore.damage(removed.healAmount);
      }
      if (removed.shieldGained && removed.shieldGained > 0) {
        // 扣除护盾
        const currentShield = heroStore.user.heroShield || 0;
        heroStore.user.heroShield = Math.max(0, currentShield - removed.shieldGained);
      }

      dayLogs.splice(idx, 1);

      // 从数据库删除
      sqliteLogService.deleteLog(String(logId)).catch(err => {
        console.error('[LogStore] 从数据库删除运动记录失败:', err);
      });

      return removed;
    }
    return null;
  }

  // [New] 补水记录管理
  function addHydrationLog(hydration: Omit<HydrationLog, 'id' | 'logType' | 'timestamp'>): HydrationLog {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    if (!logs[dateKey]) logs[dateKey] = [];

    const newLog: HydrationLog = {
      ...hydration,
      id: generateId(),
      logType: 'HYDRATION',
      timestamp: new Date().toISOString()
    };

    logs[dateKey].unshift(newLog as any);

    // 保存到数据库
    _saveLogToDb(newLog as any, dateKey).catch(err => {
      console.error('[LogStore] 保存补水记录到数据库失败:', err);
    });

    return newLog;
  }

  function removeHydrationLog(logId: number | string): HydrationLog | null {
    const dateKey = systemStore.currentDate || '';
    const dayLogs = logs[dateKey];
    if (!dayLogs) return null;

    const idx = dayLogs.findIndex(l => l.id === logId);
    if (idx !== -1) {
      const removed = dayLogs[idx] as any as HydrationLog;
      dayLogs.splice(idx, 1);

      // 从数据库删除
      sqliteLogService.deleteLog(String(logId)).catch(err => {
        console.error('[LogStore] 从数据库删除补水记录失败:', err);
      });

      return removed;
    }
    return null;
  }

  // [New] Computed - 获取今日所有运动记录
  const allTodayExercise = computed(() => {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    const dayLogs = logs[dateKey] || [];
    return dayLogs.filter(l => (l as any).logType === 'EXERCISE') as any as ExerciseLog[];
  });

  // [New] Computed - 获取今日所有补水记录
  const allTodayHydration = computed(() => {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    const dayLogs = logs[dateKey] || [];
    return dayLogs.filter(l => (l as any).logType === 'HYDRATION') as any as HydrationLog[];
  });

  // [New] Computed - 今日补水量统计
  const todayHydrationAmount = computed(() => {
    return allTodayHydration.value.reduce((sum, log) => sum + (log.amount || 0), 0);
  });

  // [New] Computed - 今日补水杯数
  const todayHydrationCups = computed(() => {
    return allTodayHydration.value.length;
  });

  // --- 数据库辅助方法 ---

  // 保存日志到数据库
  async function _saveLogToDb(log: FoodLog | ExerciseLog | HydrationLog, dateKey: string) {
    try {
      const logType = (log as any).logType || 'FOOD';
      await sqliteLogService.saveLog({
        id: String(log.id),
        type: logType,
        date: dateKey,
        timestamp: new Date(log.timestamp).getTime(),
        data: log // 注意：这里把 log 对象存到了 data 字段
      });
      console.log(`[LogStore] 日志已保存到数据库: ${log.id}`);
    } catch (error) {
      console.error('[LogStore] 保存日志失败:', error);
      throw error;
    }
  }

  // 从数据库加载所有日志
  async function loadLogsFromDb() {
    try {
      console.log('[LogStore] 开始从数据库加载日志...');
      const dbLogs = await sqliteLogService.getAllLogs();
      console.log(`[LogStore] 从数据库加载了 ${dbLogs.length} 条日志`);

      // 清空当前内存中的日志
      Object.keys(logs).forEach(key => delete logs[key]);

      // 按日期重新组织日志（按时间戳降序排列）
      dbLogs.forEach((row: any) => {
        const dateKey = row.date || getLocalDateStr();
        if (!logs[dateKey]) logs[dateKey] = [];

        // [修复核心Bug] 从数据库记录中解包 data 字段
        // 数据库返回的 row 结构通常是 { id, date, timestamp, data: '...'|obj }
        // 我们需要的是 data 里面的内容
        let logItem = null;

        if (row.data) {
          try {
            // 如果 data 是字符串(JSON)，则解析；如果是对象则直接用
            logItem = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;

            // 确保 id 和 timestamp 存在 (以数据库外层字段为准，覆盖内部可能过时的数据)
            if (logItem) {
              if (row.id && !logItem.id) logItem.id = row.id;
              // 某些情况下 logItem.timestamp 可能是旧的，这里不强制覆盖，但可以保留 row.timestamp 作为参考
            }
          } catch (e) {
            console.error('[LogStore] 解析日志数据失败:', e, row);
            // 降级：如果解析失败，尝试直接使用 row.data 或 row 本身
            logItem = row.data || row;
          }
        } else {
          // 兼容旧数据或异常数据
          logItem = row;
        }

        if (logItem) {
          logs[dateKey].push(logItem);
        }
      });

      // 每个日期的日志按时间戳降序排序
      Object.keys(logs).forEach(dateKey => {
        logs[dateKey].sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA; // 降序排列，最新的在前面
        });
      });

      // 重新计算全局统计
      recalculateGlobalStats();

      console.log('[LogStore] 日志加载完成');
    } catch (error) {
      console.error('[LogStore] 加载日志失败:', error);
    }
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
    updateLogRewards,
    recalculateGlobalStats,
    checkDateConsistency,
    loadLogsFromDb, // 导出数据库加载方法
    // [优先级二] 新增运动和补水记录管理方法
    addExerciseLog,
    removeExerciseLog,
    addHydrationLog,
    removeHydrationLog,
    allTodayExercise,
    allTodayHydration,
    todayHydrationAmount,
    todayHydrationCups
  };
});
