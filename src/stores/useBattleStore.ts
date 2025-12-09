import { defineStore } from 'pinia';
import { reactive, computed, toRaw } from 'vue';
import type { FoodLog } from '@/types';
import { MONSTERS, RACES } from '@/constants/gameData';
import { showToast, showNotify } from 'vant';
import { getLocalDateStr } from '@/utils/dateUtils';

import { useSystemStore } from './useSystemStore';
import { useHeroStore } from './useHeroStore';
import { useCollectionStore } from './useCollectionStore';

const MINIONS_POOL = [
  { name: '糖分小鬼', icon: '🍬', weakness: '忌高糖', weaknessType: 'LOW_CARB' },
  { name: '油腻史莱姆', icon: '💧', weakness: '忌油腻', weaknessType: 'LOW_FAT' },
  { name: '碳水强盗', icon: '🍞', weakness: '忌高碳', weaknessType: 'LOW_CARB' },
  { name: '懒惰炸弹', icon: '💣', weakness: '需高蛋白', weaknessType: 'HIGH_PRO' }
];

// Combo 有效时间窗口 (3小时)
const COMBO_WINDOW_MS = 3 * 60 * 60 * 1000;

export const useBattleStore = defineStore('battle', () => {
  const systemStore = useSystemStore();
  const heroStore = useHeroStore();
  const collectionStore = useCollectionStore();

  const logs = reactive<Record<string, FoodLog[]>>({});

  // NEW V2.4: 全局属性缓存 (Global Stats Cache)
  // 解决每次计算 heroStats 都要遍历数千条 log 的 O(N) 性能问题
  const globalStats = reactive({
    totalP: 0,
    totalC: 0,
    totalF: 0,
    totalCals: 0
  });

  // 连击状态追踪
  const comboState = reactive({
    count: 0,
    lastLogTime: 0,
    lastLogId: 0
  });

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

  // 优化：直接从缓存读取，性能 O(1)
  const historyTotalMacros = computed(() => {
    return {
      totalP: globalStats.totalP,
      totalC: globalStats.totalC,
      totalF: globalStats.totalF,
      totalCals: globalStats.totalCals
    };
  });

  // --- 初始化/重算缓存逻辑 ---
  // 仅在 loadState 时调用一次，或者在数据导入时调用
  function recalculateGlobalStats() {
    let p = 0, c = 0, f = 0, cals = 0;
    Object.values(logs).forEach((dayLogs) => {
      if (Array.isArray(dayLogs)) {
        dayLogs.forEach(l => {
          p += (l.p || 0);
          c += (l.c || 0);
          f += (l.f || 0);
          cals += (l.calories || 0);
        });
      }
    });
    globalStats.totalP = p;
    globalStats.totalC = c;
    globalStats.totalF = f;
    globalStats.totalCals = cals;
    console.log('[BattleStore] Global stats recalculated:', globalStats);
  }

  const dailyMonster = computed(() => {
    const todayStr = systemStore.currentDate;
    const [y, m, d] = todayStr.split('-').map(Number);
    const todayDate = new Date(y, m - 1, d);

    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(todayDate.getDate() - 1);
    const yKey = getLocalDateStr(yesterdayDate);

    const yLogs = logs[yKey] || [];
    const yStats = yLogs.reduce((acc, l) => ({ c: acc.c+(l.c||0), f: acc.f+(l.f||0), p: acc.p+(l.p||0) }), {c:0, f:0, p:0});

    let monsterType = 'BALANCED';
    if (yStats.c > 300) monsterType = 'LOW_CARB';
    else if (yStats.f > 80) monsterType = 'LOW_FAT';
    else if (yStats.p < 30 && yLogs.length > 0) monsterType = 'HIGH_PRO';

    const candidates = MONSTERS.filter(m => m.weaknessType === monsterType);
    const seed = todayStr.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
    return candidates.length > 0 ? candidates[seed % candidates.length] : MONSTERS[0];
  });

  const stageInfo = computed(() => {
    const target = heroStore.dailyTarget;
    const consumed = todayMacros.value.cals;

    // V2.1: Boss 血量动态平衡
    const bossReserveHP = Math.max(500, Math.floor(target * 0.4));
    const minionHP = 500;
    const minionPool = Math.max(0, target - bossReserveHP);
    const minionCount = Math.floor(minionPool / minionHP);

    let currentStageIndex = Math.floor(consumed / (minionHP || 1));
    if (currentStageIndex >= minionCount) currentStageIndex = minionCount;

    const isBoss = currentStageIndex === minionCount;
    const bossHP = target - (minionCount * minionHP);

    const currentMaxHp = isBoss ? bossHP : minionHP;
    const startCals = isBoss ? (minionCount * minionHP) : (currentStageIndex * minionHP);
    const damageDealt = consumed - startCals;
    const isOverloaded = consumed > target;

    const dateSeed = parseInt(systemStore.currentDate.replace(/-/g, '')) + currentStageIndex;
    const minionData = MINIONS_POOL[dateSeed % MINIONS_POOL.length];
    const bossData = dailyMonster.value;
    const activeMonster = isOverloaded ? { ...bossData, name: `暴走·${bossData.name}`, icon: '🔥' } : bossData;

    return {
      stages: Array(minionCount + 1).fill(0),
      currentIndex: currentStageIndex,
      currentObj: {
        type: isBoss ? 'BOSS' : 'MINION',
        data: isBoss ? activeMonster : minionData,
        maxHp: currentMaxHp
      },
      currentHpRemaining: Math.max(0, currentMaxHp - damageDealt),
      isBoss,
      isOverloaded,
      isCleared: consumed >= target && consumed <= target * 1.1
    };
  });

  const weeklyStats = computed(() => {
    const refDateStr = systemStore.analysisRefDate || getLocalDateStr();
    const [y, m, d] = refDateStr.split('-').map(Number);
    const refDate = new Date(y, m - 1, d, 12, 0, 0);

    const dayOfWeek = refDate.getDay() || 7;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() - dayOfWeek + 1);

    const days = [];
    const weekdays = ['一','二','三','四','五','六','日'];
    const todayStr = getLocalDateStr();

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateStr(d);
      const isFuture = dateStr > todayStr;

      const dayLogs = logs[dateStr] || [];
      const total = dayLogs.reduce((sum, log) => sum + (log.calories || 0), 0);

      let rpgStatus = 'UNKNOWN';
      if (total > 0) {
        if(total > heroStore.dailyTarget * 1.1) { rpgStatus = 'DEFEAT'; }
        else if(total >= heroStore.dailyTarget * 0.8) { rpgStatus = 'VICTORY'; }
        else { rpgStatus = 'ONGOING'; }
      } else if (dateStr < todayStr) {
        if (!isFuture && total === 0) rpgStatus = 'SKIPPED';
      }

      days.push({
        label: `${d.getMonth()+1}/${d.getDate()}`,
        val: total,
        weekday: weekdays[i],
        date: dateStr,
        isToday: dateStr === todayStr,
        rpgStatus,
        isFuture
      });
    }
    return days;
  });

  function commitLog(logItem: any) {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    if (!logs[dateKey]) logs[dateKey] = [];
    const cleanLogItem = JSON.parse(JSON.stringify(toRaw(logItem)));

    logs[dateKey].unshift({
      id: Date.now(),
      ...cleanLogItem,
      mealType: systemStore.temp.activeMealType,
      timestamp: new Date().toISOString()
    });

    // 增量更新缓存
    globalStats.totalP += (cleanLogItem.p || 0);
    globalStats.totalC += (cleanLogItem.c || 0);
    globalStats.totalF += (cleanLogItem.f || 0);
    globalStats.totalCals += (cleanLogItem.calories || 0);

    collectionStore.checkDailyQuests(cleanLogItem);
    checkAchievements(false);

    if (dateKey === getLocalDateStr()) {
      comboState.lastLogTime = Date.now();
      comboState.lastLogId = logItem.id;
    }
  }

  function checkAchievements(isInitCheck: boolean) {
    const stats = todayMacros.value;
    const list = todayLogs.value;
    collectionStore.achievements.forEach(ach => {
      if (ach.unlocked) return;
      let pass = false;
      if (ach.id===1 && list.length>0) pass=true;
      if (ach.id===2 && stats.p>100) pass=true;
      if (ach.id===3 && list.some(l=>l.category==='VEG') && list.reduce((a,b)=>a+(b.grams||0),0)>300) pass=true;
      if (pass) {
        if(!isInitCheck) collectionStore.unlockAch(ach.id);
        else ach.unlocked = true;
      }
    });
  }

  function getHeroStatsForBattle() {
    const user = heroStore.user;
    const raceKey = user.race || 'HUMAN';
    const race = RACES[raceKey] || RACES.HUMAN;
    const { totalP, totalC } = historyTotalMacros.value;

    let rawStr = Math.floor(totalP / 70) + 10;
    let rawAgi = Math.floor(totalC / 180) + 10;

    rawStr = Math.floor(rawStr * (race?.growth?.str || 1));
    rawAgi = Math.floor(rawAgi * (race?.growth?.agi || 1));

    let blockValue = Math.floor(rawStr * 0.8);
    let dodgeChance = Math.min(rawAgi * 0.003, 0.60);

    Object.values(user.equipped).forEach(itemId => {
      if (itemId) {
        const item = collectionStore.achievements.find(a => a.id === itemId);
        if (item) {
          if (item.stats.includes('格挡')) {
            const match = item.stats.match(/格挡 \+(\d+)/);
            if (match) blockValue += parseInt(match[1]);
          }
          if (item.stats.includes('闪避')) {
            const match = item.stats.match(/闪避 \+(\d+)%/);
            if (match) dodgeChance += parseInt(match[1]) / 100;
          }
          if (item.stats.includes('全属性')) {
            blockValue += 5;
          }
        }
      }
    });

    return { blockValue, dodgeChance };
  }

  function deleteLog(log: FoodLog) {
    const dateKey = systemStore.currentDate || '';
    const dayLogs = logs[dateKey];
    if (!dayLogs) return;
    const idx = dayLogs.findIndex(l => l.id === log.id);
    if (idx !== -1) {
      const anyLog = log as any;
      if (anyLog.gainedExp) heroStore.addExp(-anyLog.gainedExp);
      if (log.damageTaken) heroStore.heal(log.damageTaken);

      // 增量更新缓存 (减去)
      globalStats.totalP -= (log.p || 0);
      globalStats.totalC -= (log.c || 0);
      globalStats.totalF -= (log.f || 0);
      globalStats.totalCals -= (log.calories || 0);

      dayLogs.splice(idx, 1);
      comboState.count = Math.max(0, comboState.count - 1);
      showToast('记录已撤销');
    }
  }

  // --- Combo 逻辑 ---
  function calculateCombo(tags: string[], timestamp: number) {
    const now = Date.now();
    const isWithinWindow = (now - comboState.lastLogTime) < COMBO_WINDOW_MS;
    const isBadFood = tags.includes('HIGH_SUGAR') || tags.includes('HIGH_FAT') || tags.includes('HIGH_SODIUM');
    const isGoodFood = tags.includes('CLEAN') || tags.includes('HIGH_PRO') || tags.includes('BALANCED');

    let newCombo = comboState.count;
    let comboMultiplier = 1.0;
    let comboMsg = '';

    if (isBadFood) {
      newCombo = 0;
      comboMsg = '💔 连击中断';
    } else if (isWithinWindow && isGoodFood) {
      newCombo += 1;
    } else if (!isWithinWindow) {
      newCombo = 1;
    }

    if (newCombo > 10) newCombo = 10;
    comboMultiplier = 1.0 + (newCombo > 1 ? (newCombo - 1) * 0.1 : 0);

    return { newCombo, comboMultiplier, comboMsg };
  }

  function battleCommit(item: any) {
    let tags = item.tags || [];
    const c = Number(item.c)||0, f = Number(item.f)||0, p = Number(item.p)||0;
    const grams = Number(item.grams)||100;

    const newTags = new Set<string>();
    if (item.tags) item.tags.forEach((t: string) => {
      if (t === 'CLEAN' || t === 'BALANCED') newTags.add(t);
    });

    if (c > 20 && (c/grams > 0.2)) newTags.add('HIGH_CARB');
    if (f > 10 && (f/grams > 0.1)) newTags.add('HIGH_FAT');
    if (p > 15 && (p/grams > 0.15)) newTags.add('HIGH_PRO');
    if (item.name.includes('糖') || item.name.includes('奶茶') || item.name.includes('蛋糕')) newTags.add('HIGH_SUGAR');

    item.tags = Array.from(newTags);
    collectionStore.saveToFoodDb(item);

    const monster = stageInfo.value.currentObj?.data;
    const stats = getHeroStatsForBattle();

    let multiplier = 1.0;
    let isResist = false;
    let resistReason = '';
    const isBossOverloaded = stageInfo.value.isOverloaded;

    if (monster) {
      if (monster.weaknessType === 'LOW_CARB' && (newTags.has('HIGH_CARB') || c > 30)) {
        multiplier = 0.3; isResist = true; resistReason = 'Boss 厌恶碳水！';
      } else if (monster.weaknessType === 'LOW_FAT' && (newTags.has('HIGH_FAT') || f > 15)) {
        multiplier = 0.3; isResist = true; resistReason = 'Boss 厌恶油腻！';
      }
    }

    const { newCombo, comboMultiplier, comboMsg } = calculateCombo(item.tags, Date.now());
    comboState.count = newCombo;

    if (!isResist) {
      multiplier *= comboMultiplier;
    }

    item.multiplier = multiplier;
    item.comboCount = newCombo;

    const xp = item.isComposite ? 60 : 30;
    item.gainedExp = xp;

    if (isResist || isBossOverloaded) {
      systemStore.triggerShake();
      let baseDamage = 30;
      if (isBossOverloaded) {
        baseDamage *= 2;
        resistReason = resistReason ? `${resistReason} (暴走)` : 'Boss 处于暴走状态！';
      }
      const damage = Math.max(1, baseDamage - stats.blockValue);

      if (Math.random() < stats.dodgeChance) {
        item.dodged = true;
        showNotify({ type: 'success', message: '⚡ 装备生效！完美闪避！' });
      } else {
        heroStore.user.heroCurrentHp = Math.max(0, heroStore.user.heroCurrentHp - damage);
        item.damageTaken = damage;
        item.blocked = stats.blockValue;
        showNotify({ type: 'danger', message: `💔 ${resistReason || '受到反击'} (-${damage} HP)` });
      }
    } else {
      const heal = Math.floor((item.calories||0)/20);
      if (heal>0) {
        heroStore.heal(heal);
        let msg = `恢复 ${heal} HP`;
        if (newCombo > 1) msg += ` | 连击 x${newCombo} 🔥`;
        showToast(msg);
      }
    }

    commitLog(item);
    heroStore.addExp(xp);

    const quests = collectionStore.dailyQuests;
    const completedCount = quests.filter(q => q.completed).length;
    if (completedCount === quests.length && quests.length > 0) {
      showNotify({ type: 'success', message: '🎉 今日任务全部完成！' });
    }
  }

  return { logs, todayLogs, todayMacros, historyTotalMacros, stageInfo, weeklyStats, logsReverse, comboState, battleCommit, deleteLog, checkAchievements, commitLog, recalculateGlobalStats };
});
