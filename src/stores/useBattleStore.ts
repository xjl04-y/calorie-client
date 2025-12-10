import { defineStore } from 'pinia';
import { reactive, computed, toRaw } from 'vue';
import type { FoodLog, FoodItem, EnvironmentEffect } from '@/types';
import { MONSTERS, RACES } from '@/constants/gameData';
import { showToast, showNotify } from 'vant';
import { getLocalDateStr } from '@/utils/dateUtils';
import { generateId, safeVibrate } from '@/utils/gameUtils';

import { useSystemStore } from './useSystemStore';
import { useHeroStore } from './useHeroStore';
import { useCollectionStore } from './useCollectionStore';

const MINIONS_POOL = [
  { name: '糖分小鬼', icon: '🍬', weakness: '忌高糖', weaknessType: '低碳' },
  { name: '油腻史莱姆', icon: '💧', weakness: '忌油腻', weaknessType: '低脂' },
  { name: '碳水强盗', icon: '🍞', weakness: '忌高碳', weaknessType: '低碳' },
  { name: '懒惰炸弹', icon: '💣', weakness: '需高蛋白', weaknessType: '高蛋白' }
];

const COMBO_WINDOW_MS = 3 * 60 * 60 * 1000;

const ENVIRONMENTS: EnvironmentEffect[] = [
  { id: 'SUNNY', name: '烈日当空', icon: '☀️', desc: '代谢旺盛，所有伤害 +5%', type: 'BUFF', multiplier: 1.05, color: 'text-orange-500' },
  { id: 'RAINY', name: '阴雨连绵', icon: '🌧️', desc: '心情低落，所有伤害 -5%', type: 'DEBUFF', multiplier: 0.95, color: 'text-blue-400' },
  { id: 'FOGGY', name: '迷雾笼罩', icon: '🌫️', desc: '视野模糊，Boss 闪避增加 (模拟)', type: 'DEBUFF', multiplier: 0.9, color: 'text-slate-400' },
  { id: 'WINDY', name: '顺风而行', icon: '🍃', desc: '身轻如燕，连击效果提升', type: 'BUFF', multiplier: 1.1, color: 'text-green-500' },
  { id: 'STORM', name: '雷暴天气', icon: '⚡', desc: '极度危险，但也充满机遇，伤害浮动大 (取1.1)', type: 'BUFF', multiplier: 1.1, color: 'text-purple-500' }
];

export const useBattleStore = defineStore('battle', () => {
  const systemStore = useSystemStore();
  const heroStore = useHeroStore();
  const collectionStore = useCollectionStore();

  const logs = reactive<Record<string, FoodLog[]>>({});

  const globalStats = reactive({
    totalP: 0, totalC: 0, totalF: 0, totalCals: 0
  });

  const comboState = reactive({
    count: 0,
    lastLogTime: 0,
    lastLogId: 0 as string | number
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

  // [Fix V3.0] 核心修复：计算今日造成的"有效伤害总额"
  const todayDamage = computed(() => {
    return todayLogs.value.reduce((total, log) => {
      const dmg = Math.floor((log.calories || 0) * (log.multiplier || 1));
      return total + dmg;
    }, 0);
  });

  const historyTotalMacros = computed(() => {
    return {
      totalP: globalStats.totalP,
      totalC: globalStats.totalC,
      totalF: globalStats.totalF,
      totalCals: globalStats.totalCals
    };
  });

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

  const dailyMonster = computed(() => {
    const todayStr = systemStore.currentDate;
    const [y, m, d] = todayStr.split('-').map(Number);
    const todayDate = new Date(y || 2024, (m || 1) - 1, d || 1);

    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(todayDate.getDate() - 1);
    const yKey = getLocalDateStr(yesterdayDate);

    const yLogs = logs[yKey] || [];
    const yStats = yLogs.reduce((acc, l) => ({ c: acc.c+(l.c||0), f: acc.f+(l.f||0), p: acc.p+(l.p||0) }), {c:0, f:0, p:0});

    let monsterType = '均衡';
    if (yStats.c > 300) monsterType = '低碳';
    else if (yStats.f > 80) monsterType = '低脂';
    else if (yStats.p < 30 && yLogs.length > 0) monsterType = '高蛋白';

    const candidates = MONSTERS.filter(m => m?.weaknessType === monsterType);
    const seed = todayStr.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
    return candidates.length > 0 ? candidates[seed % candidates.length] : MONSTERS[0];
  });

  const environment = computed((): EnvironmentEffect => {
    const todayStr = systemStore.currentDate;
    const hash = todayStr.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const index = Math.abs(hash) % ENVIRONMENTS.length;
    return ENVIRONMENTS[index] || ENVIRONMENTS[0];
  });

  const stageInfo = computed(() => {
    const target = heroStore.dailyTarget;
    const damageProgress = todayDamage.value;

    const bossReserveHP = Math.max(500, Math.floor(target * 0.4));
    const minionHP = 500;
    const minionPool = Math.max(0, target - bossReserveHP);
    const minionCount = Math.floor(minionPool / minionHP);

    let currentStageIndex = Math.floor(damageProgress / (minionHP || 1));
    if (currentStageIndex >= minionCount) currentStageIndex = minionCount;

    const isBoss = currentStageIndex === minionCount;
    const bossHP = target - (minionCount * minionHP);

    const currentMaxHp = isBoss ? bossHP : minionHP;
    const startDamage = isBoss ? (minionCount * minionHP) : (currentStageIndex * minionHP);
    const currentDamageInStage = damageProgress - startDamage;
    const isOverloaded = damageProgress > target;

    const dateSeed = parseInt(systemStore.currentDate.replace(/-/g, '')) + currentStageIndex;
    const minionData = MINIONS_POOL[dateSeed % MINIONS_POOL.length];
    const bossData = dailyMonster.value;
    const activeMonster = isOverloaded && bossData ? { ...bossData, name: `暴走·${bossData.name}`, icon: '🔥' } : bossData;

    return {
      stages: Array(minionCount + 1).fill(0),
      currentIndex: currentStageIndex,
      currentObj: {
        type: isBoss ? 'BOSS' : 'MINION',
        data: isBoss ? activeMonster : minionData,
        maxHp: currentMaxHp
      },
      currentHpRemaining: Math.max(0, Math.floor(currentMaxHp - currentDamageInStage)),
      isBoss,
      isOverloaded,
      isCleared: damageProgress >= target && damageProgress <= target * 1.1
    };
  });

  // [Fix Bug] 恢复丢失的 weeklyStats 计算属性
  const weeklyStats = computed(() => {
    const refDateStr = systemStore.analysisRefDate || getLocalDateStr();
    const [y, m, d] = refDateStr.split('-').map(Number);
    const refDate = new Date(y || 2024, (m || 1) - 1, d || 1, 12, 0, 0);

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

  function commitLog(logItem: FoodLog) {
    const dateKey = systemStore.currentDate || getLocalDateStr();
    if (!logs[dateKey]) logs[dateKey] = [];
    const cleanLogItem = JSON.parse(JSON.stringify(toRaw(logItem)));

    const newLog: FoodLog = {
      ...cleanLogItem,
      id: generateId(),
      mealType: systemStore.temp.activeMealType,
      timestamp: new Date().toISOString()
    };

    logs[dateKey].unshift(newLog);

    globalStats.totalP = Math.round(globalStats.totalP + (cleanLogItem.p || 0));
    globalStats.totalC = Math.round(globalStats.totalC + (cleanLogItem.c || 0));
    globalStats.totalF = Math.round(globalStats.totalF + (cleanLogItem.f || 0));
    globalStats.totalCals = Math.round(globalStats.totalCals + (cleanLogItem.calories || 0));

    collectionStore.checkDailyQuests(cleanLogItem);
    checkAchievements(false);

    if (dateKey === getLocalDateStr()) {
      comboState.lastLogTime = Date.now();
      comboState.lastLogId = newLog.id;
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
      if (ach.id===7 && list.some(l=>l.tags?.includes('均衡'))) pass=true;
      if (ach.id===8 && comboState.count >= 10) pass=true;

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
            if (match && match[1]) blockValue += parseInt(match[1]);
          }
          if (item.stats.includes('闪避')) {
            const match = item.stats.match(/闪避 \+(\d+)%/);
            if (match && match[1]) dodgeChance += parseInt(match[1]) / 100;
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
      if (log.gainedExp) heroStore.addExp(-log.gainedExp);
      if (log.damageTaken) heroStore.heal(log.damageTaken);

      globalStats.totalP = Math.round(globalStats.totalP - (log.p || 0));
      globalStats.totalC = Math.round(globalStats.totalC - (log.c || 0));
      globalStats.totalF = Math.round(globalStats.totalF - (log.f || 0));
      globalStats.totalCals = Math.round(globalStats.totalCals - (log.calories || 0));

      dayLogs.splice(idx, 1);
      comboState.count = Math.max(0, comboState.count - 1);
      showToast('记录已撤销');
    }
  }

  function calculateCombo(tags: string[], timestamp: number) {
    const now = Date.now();
    const lastTime = comboState.lastLogTime || now;
    const isWithinWindow = (now - lastTime) < COMBO_WINDOW_MS;

    const isBadFood = tags.includes('高糖') || tags.includes('高油') || tags.includes('高盐');
    const isGoodFood = tags.includes('纯净') || tags.includes('高蛋白') || tags.includes('均衡');

    let newCombo = comboState.count;
    let comboMultiplier = 1.0;
    let comboMsg = '';

    if (isBadFood) {
      newCombo = 0;
      comboMsg = '💔 连击中断';
    } else if (isWithinWindow && isGoodFood) {
      newCombo += 1;
    } else if (!isWithinWindow) {
      newCombo = isGoodFood ? 1 : 0;
      comboMsg = '⏱️ 连击超时';
    }

    if (newCombo > 10) newCombo = 10;
    comboMultiplier = 1.0 + (newCombo > 1 ? (newCombo - 1) * 0.1 : 0);

    return { newCombo, comboMultiplier, comboMsg };
  }

  function spawnFloatingText(text: string, type: 'DAMAGE' | 'HEAL' | 'CRIT' | 'BLOCK' | 'EXP') {
    if (!systemStore.temp.floatingTexts) systemStore.temp.floatingTexts = [];
    systemStore.temp.floatingTexts.push({
      id: generateId(),
      text,
      type,
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 10
    });
    setTimeout(() => {
      if (systemStore.temp.floatingTexts && systemStore.temp.floatingTexts.length > 0) {
        systemStore.temp.floatingTexts.shift();
      }
    }, 1500);
  }

  function battleCommit(item: FoodItem) {
    if (!item) return;

    // 1. 标签与基础处理
    let tags = item.tags || [];
    const c = Number(item.c)||0, f = Number(item.f)||0, p = Number(item.p)||0;
    const grams = Number(item.grams)||100;

    const newTags = new Set<string>();
    if (item.tags) item.tags.forEach((t: string) => {
      newTags.add(t);
    });

    const densityC = c / grams;
    const densityF = f / grams;
    const densityP = p / grams;

    const isLargeMeal = grams > 250;

    if (isLargeMeal) {
      if (densityC > 0.20 && c > 40) newTags.add('高碳');
      if (densityF > 0.15 && f > 20) newTags.add('高油');
      if (densityP > 0.15 && p > 25) newTags.add('高蛋白');
    } else {
      if (c > 20 && densityC > 0.2) newTags.add('高碳');
      if (f > 10 && densityF > 0.1) newTags.add('高油');
      if (p > 15 && densityP > 0.15) newTags.add('高蛋白');
    }

    if (item.name.includes('糖') || item.name.includes('奶茶') || item.name.includes('蛋糕')) newTags.add('高糖');
    if (newTags.has('高碳') && newTags.has('高蛋白') && newTags.has('纯净')) newTags.add('均衡');

    const battleItem: FoodLog = {
      ...item,
      tags: Array.from(newTags),
      mealType: systemStore.temp.activeMealType,
      timestamp: new Date().toISOString()
    };

    try {
      collectionStore.saveToFoodDb(battleItem);
    } catch (e) {
      console.warn('FoodDB save failed', e);
    }

    const monster = stageInfo.value.currentObj?.data;
    const stats = getHeroStatsForBattle();
    const activeSkill = heroStore.consumeSkillEffect();
    if (activeSkill) battleItem.skillEffect = activeSkill.id;

    const isExhausted = heroStore.isExhausted;

    let multiplier = 1.0;
    let isResist = false;
    let resistReason = '';
    const isBossOverloaded = stageInfo.value.isOverloaded;
    const ignoreResist = activeSkill?.effectType === 'IGNORE_RESIST';

    if (monster && !ignoreResist) {
      // [Fix Bug] 纯净套餐逻辑修正
      // isPreset 表示是用户保存的套餐
      // 只要是纯净套餐，容忍度极高，且就算超标也不触发严重抵抗（multiplier 不会变成 0.3）
      const isCleanSet = newTags.has('纯净') && (item.isPreset || item.isComposite);
      const carbThreshold = isCleanSet ? 100 : 30;
      const fatThreshold = isCleanSet ? 50 : 15;

      if (monster.weaknessType === '低碳' && (newTags.has('高碳') || c > carbThreshold)) {
        if (isCleanSet) {
          multiplier = 0.8; // 纯净套餐即使高碳，也保有 80% 伤害
          // 且不设置 isResist，意味着不会被反击
        } else {
          multiplier = 0.3; isResist = true; resistReason = 'Boss 厌恶碳水！';
        }
      } else if (monster.weaknessType === '低脂' && (newTags.has('高油') || f > fatThreshold)) {
        if (isCleanSet) {
          multiplier = 0.8;
        } else {
          multiplier = 0.3; isResist = true; resistReason = 'Boss 厌恶油腻！';
        }
      }
    }

    const { newCombo, comboMultiplier, comboMsg } = calculateCombo(battleItem.tags || [], Date.now());
    comboState.count = newCombo;

    if (!isResist) multiplier *= comboMultiplier;
    if (isExhausted) multiplier *= 0.5;

    const env = environment.value;
    multiplier *= env.multiplier;

    if (activeSkill?.effectType === 'CRIT_GUARANTEE') {
      if (activeSkill.id === 'ORC_RAGE') multiplier = 3.0;
      else multiplier = Math.max(multiplier, 1.5);
    }

    battleItem.multiplier = multiplier;
    battleItem.comboCount = newCombo;

    let xp = battleItem.isComposite ? 60 : 30;
    if (activeSkill?.effectType === 'DOUBLE_EXP') xp *= 2;
    if (isExhausted) xp = Math.floor(xp * 0.5);

    const damageVal = Math.floor((battleItem.calories || 0) * multiplier);
    battleItem.finalDamageValue = damageVal;

    if (stageInfo.value.currentHpRemaining <= damageVal && !stageInfo.value.isOverloaded) {
      xp += 10;
      spawnFloatingText('OVERKILL!', 'EXP');
    }

    battleItem.gainedExp = xp;

    if (activeSkill?.effectType === 'DOUBLE_EXP' && activeSkill.id === 'HUMAN_PRAYER') {
      const healAmt = Math.floor((battleItem.calories || 0) * 0.5);
      heroStore.heal(healAmt);
      spawnFloatingText(`+${healAmt}`, 'HEAL');
      showNotify({ type: 'success', message: `🙏 圣光转化：恢复 ${healAmt} HP`, duration: 2000 });
    }
    else if (isResist || isBossOverloaded) {
      const hasComboProtection = newCombo > 1;

      if (hasComboProtection) {
        showNotify({ type: 'success', message: '⚡ 极速连击！闪避了反击！', duration: 2000 });
        spawnFloatingText('DODGE!', 'BLOCK');
        battleItem.dodged = true;
      } else {
        const isBlockAll = activeSkill?.id === 'DWARF_DRINK';

        if (!isBlockAll) {
          systemStore.triggerShake();
          safeVibrate([100, 50, 100]);

          let baseDamage = 30;
          if (isBossOverloaded) {
            baseDamage *= 2;
            resistReason = resistReason ? `${resistReason} (暴走)` : 'Boss 处于暴走状态！';
          }
          const damage = Math.max(1, baseDamage - stats.blockValue);

          if (Math.random() < stats.dodgeChance) {
            battleItem.dodged = true;
            spawnFloatingText('MISS', 'BLOCK');
            showNotify({ type: 'success', message: '⚡ 装备生效！完美闪避！', duration: 2000 });
          } else {
            heroStore.damage(damage);
            battleItem.damageTaken = damage;
            battleItem.blocked = stats.blockValue;
            spawnFloatingText(`-${damage}`, 'DAMAGE');
            showNotify({ type: 'danger', message: `💔 ${resistReason || '受到反击'} (-${damage} HP)`, duration: 3000 });
          }
        } else {
          showNotify({ type: 'primary', message: '🍺 酒仙护体！格挡了反击！', duration: 2000 });
          spawnFloatingText('BLOCK!', 'BLOCK');
          battleItem.blocked = 999;
        }
      }
    }
    else {
      let heal = Math.floor((battleItem.calories||0)/20);
      if (activeSkill?.effectType === 'LIFESTEAL') {
        heal += Math.floor(damageVal * 0.1);
      }

      if (activeSkill?.id === 'ORC_RAGE') {
        heroStore.damage(50);
        showNotify({ type: 'warning', message: '🩸 血祭：自身扣除 50 HP', duration: 2000 });
      }

      let msg = `✅ 已记录：${battleItem.name}`;

      // 飘字逻辑：确保总是显示伤害
      spawnFloatingText(`${damageVal}`, multiplier > 1.2 ? 'CRIT' : 'DAMAGE');

      if (heal > 0) {
        heroStore.heal(heal);
        spawnFloatingText(`+${heal}`, 'HEAL');
        msg += `\n❤️ 恢复 ${heal} HP`;
      }

      if (isExhausted) msg += `\n⚠️ 力竭状态：伤害减半`;
      if (newCombo > 1) msg += ` | 连击 x${newCombo}`;
      if (activeSkill) msg += ` | ${activeSkill.name}`;
      if (env.type === 'BUFF') msg += ` | ${env.icon}环境加成`;

      showNotify({ type: 'success', message: msg, duration: 2000 });
    }

    commitLog(battleItem);
    heroStore.addExp(xp);

    const quests = collectionStore.quests.filter(q => q.status === 'ACCEPTED');
    const completedCount = quests.filter(q => q.current >= q.target).length;
    if (completedCount === quests.length && quests.length > 0) {
      setTimeout(() => {
        showNotify({ type: 'success', message: '🎉 今日任务全部完成！', background: '#f59e0b' });
        safeVibrate(200);
      }, 500);
    }
  }

  return {
    logs, todayLogs, todayMacros, historyTotalMacros, stageInfo, weeklyStats,
    logsReverse, comboState, environment, todayDamage,
    battleCommit, deleteLog, checkAchievements, commitLog, recalculateGlobalStats
  };
});
