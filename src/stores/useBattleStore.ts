// ... existing imports ...
import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import type { FoodLog, FoodItem, EnvironmentEffect, MealType } from '@/types';
import { MONSTERS, RACES } from '@/constants/gameData';
import { showToast, showNotify } from 'vant';
import { getLocalDateStr, isSameDay } from '@/utils/dateUtils';
import { generateId, safeVibrate } from '@/utils/gameUtils';

import { useSystemStore } from './useSystemStore';
import { useHeroStore } from './useHeroStore';
import { useCollectionStore } from './useCollectionStore';
import { useLogStore } from './useLogStore';

// [Fix] 扩充小怪池，让战斗前期的怪物更加多样化，覆盖所有弱点类型
const MINIONS_POOL = [
  // --- 低碳/高糖系 ---
  { name: '糖分小鬼', icon: '🍬', weakness: '忌高糖', weaknessType: '低碳' },
  { name: '碳水强盗', icon: '🍞', weakness: '忌高碳', weaknessType: '低碳' },
  { name: '面团怪', icon: '🥯', weakness: '忌面食', weaknessType: '低碳' },
  { name: '饼干士兵', icon: '🍪', weakness: '忌甜食', weaknessType: '低碳' },
  { name: '馒头拳师', icon: '👊', weakness: '忌淀粉', weaknessType: '低碳' },

  // --- 低脂/油腻系 ---
  { name: '油腻史莱姆', icon: '💧', weakness: '忌油腻', weaknessType: '低脂' },
  { name: '炸鸡块怪', icon: '🍗', weakness: '忌油炸', weaknessType: '低脂' },
  { name: '薯条精', icon: '🍟', weakness: '忌快餐', weaknessType: '低脂' },
  { name: '肥肉球', icon: '🥓', weakness: '忌肥肉', weaknessType: '低脂' },
  { name: '黄油滑怪', icon: '🧈', weakness: '忌高脂', weaknessType: '低脂' },

  // --- 高蛋白/虚弱系 ---
  { name: '懒惰炸弹', icon: '💣', weakness: '需高蛋白', weaknessType: '高蛋白' },
  { name: '软脚虾', icon: '🦐', weakness: '需补充', weaknessType: '高蛋白' },
  { name: '骨架兵', icon: '💀', weakness: '需钙质', weaknessType: '高蛋白' },
  { name: '虚弱豆芽', icon: '🌱', weakness: '需营养', weaknessType: '高蛋白' },
  { name: '纸片人', icon: '📄', weakness: '需增肌', weaknessType: '高蛋白' },

  // --- 补水/干燥系 ---
  { name: '干燥怪', icon: '🏜️', weakness: '需补水', weaknessType: '水' },
  { name: '咸鱼干', icon: '🐟', weakness: '需淡化', weaknessType: '水' },
  { name: '枯叶精', icon: '🍂', weakness: '需滋润', weaknessType: '水' },
  { name: '火苗怪', icon: '🔥', weakness: '需降火', weaknessType: '水' },
  { name: '咖啡因小鬼', icon: '☕', weakness: '需补水', weaknessType: '水' },

  // --- 纯净/垃圾食品系 ---
  { name: '垃圾袋怪', icon: '🗑️', weakness: '忌垃圾', weaknessType: '纯净' },
  { name: '防腐剂幽灵', icon: '👻', weakness: '忌添加剂', weaknessType: '纯净' },
  { name: '辣条蛇', icon: '🐍', weakness: '忌辛辣', weaknessType: '纯净' },
  { name: '剩饭团', icon: '🍙', weakness: '忌隔夜', weaknessType: '纯净' },
  { name: '色素史莱姆', icon: '🌈', weakness: '忌色素', weaknessType: '纯净' }
];

const COMBO_WINDOW_MS = 3 * 60 * 60 * 1000;

// ... ENVIRONMENTS ...
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
  const logStore = useLogStore();

  const comboState = reactive({
    count: 0,
    lastLogTime: 0,
    lastLogId: 0 as string | number
  });

  // [Fix] 升级版怪物生成逻辑：完全匹配 monsters.ts 的分类
  const dailyMonster = computed(() => {
    const todayStr = systemStore.currentDate;
    const [y, m, d] = todayStr.split('-').map(Number);
    if (!y || !m || !d) return MONSTERS[0];

    const todayDate = new Date(y, (m || 1) - 1, d);
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(todayDate.getDate() - 1);
    const yKey = getLocalDateStr(yesterdayDate);

    const yLogs = logStore.logs[yKey] || [];

    // 统计昨日数据
    const yStats = yLogs.reduce((acc, l) => ({
      c: acc.c + (Number(l.c) || 0),
      f: acc.f + (Number(l.f) || 0),
      p: acc.p + (Number(l.p) || 0)
    }), { c: 0, f: 0, p: 0 });

    // 统计特殊行为
    const junkCount = yLogs.filter(l => l.tags?.includes('高糖') || l.tags?.includes('高油') || l.tags?.includes('垃圾食品')).length;
    const waterCount = yLogs.filter(l => l.mealType === 'HYDRATION').length;

    // [Fix] 智能判定怪物类型，覆盖所有 monsters.ts 定义
    let monsterType = '均衡'; // 默认 Lv.1-10

    // 优先级判断：问题最严重的领域优先生成 Boss
    if (waterCount < 2) {
      monsterType = '水'; // 缺水 -> 荒芜旱怪 (Lv.86-95)
    } else if (junkCount > 3) {
      monsterType = '纯净'; // 垃圾吃多了 -> 毒素变异体 (Lv.71-85)
    } else if (yStats.c > 350) {
      monsterType = '低碳'; // 碳水炸弹 -> 碳水大军 (Lv.26-40) / 糖分军团 (Lv.11-25)
    } else if (yStats.f > 100) {
      monsterType = '低脂'; // 油脂过高 -> 油脂魔物 (Lv.41-55)
    } else if (yStats.p < 40 && yLogs.length > 2) {
      monsterType = '高蛋白'; // 蛋白质不足 -> 虚弱鬼魂 (Lv.56-70)
    }

    // 从 MONSTERS 池中筛选符合类型的
    const candidates = MONSTERS.filter(m => m?.weaknessType === monsterType);

    // 如果没有找到对应类型的怪（防止填错了），则回退到全部列表
    const safeCandidates = candidates.length > 0 ? candidates : MONSTERS;

    // 使用日期种子随机选择
    const seed = todayStr.split('').reduce((a, b, i) => a + (b.charCodeAt(0) * (i + 1)), 0);
    return safeCandidates[seed % safeCandidates.length] || MONSTERS[0];
  });

  const environment = computed((): EnvironmentEffect => {
    const todayStr = systemStore.currentDate;
    const hash = todayStr.split('').reduce((a, b, i) => ((a << 5) - a) + (b.charCodeAt(0) * (i + 1)), 0);
    const index = Math.abs(hash) % ENVIRONMENTS.length;
    return (ENVIRONMENTS[index] || ENVIRONMENTS[0]) as EnvironmentEffect;
  });

  const stageInfo = computed(() => {
    // [Modified] Boss HP (Target) now includes exercise burn (done in heroStore.dailyTarget)
    const target = heroStore.dailyTarget || 2000;
    const damageProgress = logStore.todayDamage; // Only counts food

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
    const minionData = MINIONS_POOL[dateSeed % MINIONS_POOL.length] || MINIONS_POOL[0];
    const bossData = dailyMonster.value;

    const activeMonster = isOverloaded && bossData
      ? { ...bossData, name: `暴走·${bossData.name}`, icon: '🔥' }
      : bossData;

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

  const weeklyStats = computed(() => {
    // ... (Keep existing weeklyStats logic) ...
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

      const dayLogs = logStore.logs[dateStr] || [];
      const total = dayLogs.filter(l => l.mealType !== 'EXERCISE').reduce((sum, log) => sum + (Number(log.calories) || 0), 0);

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

  // ... (Keep checkAchievements, getHeroStatsForBattle, calculateCombo, spawnFloatingText) ...
  function checkAchievements(isInitCheck: boolean) {
    const stats = logStore.todayMacros;
    const list = logStore.todayLogs;

    collectionStore.achievements.forEach(ach => {
      if (ach.unlocked) return;
      let pass = false;

      if (ach.id===1 && list.length>0) pass=true;
      if (ach.id===2 && stats.p > 100) pass=true;
      if (ach.id===3 && list.some(l=>l.category==='VEG') && list.reduce((a,b)=>a+(b.grams||0),0)>300) pass=true;
      if (ach.id===7 && list.some(l=>l.tags?.includes('均衡'))) pass=true;
      if (ach.id===8 && comboState.count >= 10) pass=true;

      if (pass) {
        if(!isInitCheck) collectionStore.unlockAch(ach.id);
        else ach.unlocked = true;
      }
    });
  }

  // [工单02] 获取包含装备加成的英雄属性 - 修复战斗数值“裸奔”问题
  function getHeroStatsForBattle() {
    const user = heroStore.user;
    const raceKey = user.race || 'HUMAN';
    const race = RACES[raceKey] || RACES.HUMAN;
    const { totalP, totalC } = logStore.historyTotalMacros;

    // 基础属性（裸装）
    let rawStr = Math.floor(totalP / 70) + 10;
    let rawAgi = Math.floor(totalC / 180) + 10;

    rawStr = Math.floor(rawStr * (race?.growth?.str || 1));
    rawAgi = Math.floor(rawAgi * (race?.growth?.agi || 1));

    let blockValue = Math.floor(rawStr * 0.8);
    let dodgeChance = Math.min(rawAgi * 0.003, 0.60);

    // 关键修复：计算装备加成（屠龙刀、铠甲等）
    if (user.equipped) {
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
    }

    // 返回带装备加成的最终属性
    return { blockValue, dodgeChance };
  }

  // [New] 主动检查连击状态 (用于App启动时)
  function validateCombo() {
    const now = Date.now();
    const lastTime = comboState.lastLogTime || 0;
    let hasReset = false;

    // 1. 检查是否超时 (3小时)
    if (lastTime > 0 && (now - lastTime) > COMBO_WINDOW_MS) {
      if (comboState.count > 0) {
        console.log('[Combo] 连击已超时，自动重置');
        comboState.count = 0;
        hasReset = true;
      }
    }

    // 2. 检查是否跨天 (针对"昨天的连击显示在今天"的问题)
    if (lastTime > 0) {
      const lastDate = new Date(lastTime);
      const isToday = isSameDay(lastDate, new Date());
      if (!isToday && comboState.count > 0) {
        console.log('[Combo] 检测到跨天，连击自动重置');
        comboState.count = 0;
        hasReset = true;
      }
    }

    return hasReset;
  }

  function calculateCombo(tags: string[], timestamp: number) {
    const todayStr = getLocalDateStr();
    const systemDate = systemStore.currentDate;

    // [Log] 调试连击计算
    console.log('[Combo] 计算开始:', {
      currentCount: comboState.count,
      lastTime: comboState.lastLogTime,
      tags,
      systemDate,
      todayStr
    });

    if (systemDate !== todayStr) {
      return { newCombo: comboState.count, comboMultiplier: 1.0, comboMsg: '' };
    }

    const now = Date.now();
    const lastTime = comboState.lastLogTime || now;
    // [Fix] 首次记录时不应视为超时，应该允许连击开始
    const isFirstLogToday = comboState.count === 0 && (!comboState.lastLogTime || comboState.lastLogTime === 0);
    const isWithinWindow = isFirstLogToday ? true : (now - lastTime) < COMBO_WINDOW_MS;

    const isBadFood = tags.includes('高糖') || tags.includes('高油') || tags.includes('高盐');
    // [Modified] 放宽连击条件：只要不是坏食物，都算好食物（允许普通食物叠连击）
    const isGoodFood = !isBadFood;

    let newCombo = comboState.count;
    let comboMultiplier = 1.0;
    let comboMsg = '';

    if (isBadFood) {
      newCombo = 0;
      comboMsg = '💔 连击中断';
    } else if (isWithinWindow && isGoodFood) {
      newCombo += 1;
      // [Fix] 连击应该有正反馈
      if (newCombo > 1) comboMsg = `⚡ 连击 x${newCombo}`;
    } else if (!isWithinWindow) {
      // [V4.8 Feature] 连击保护逻辑
      if (newCombo > 1 && heroStore.consumeItem('item_combo_shield', 1)) {
        comboMsg = '⏳ 时光倒流！连击保护生效！';
        setTimeout(() => showNotify({ type: 'success', message: '✨ 使用了时光沙漏，连击未中断！', background: '#7c3aed' }), 500);
      } else {
        newCombo = isGoodFood ? 1 : 0;
        comboMsg = isGoodFood ? '⚡ 连击开始' : '⏱️ 连击超时';
      }
    }

    if (newCombo > 20) newCombo = 20;
    comboMultiplier = 1.0 + (newCombo > 1 ? Math.min((newCombo - 1) * 0.1, 1.0) : 0);

    console.log('[Combo] 计算结果:', { newCombo, comboMultiplier });
    return { newCombo, comboMultiplier, comboMsg };
  }

  function spawnFloatingText(text: string, type: 'DAMAGE' | 'HEAL' | 'CRIT' | 'BLOCK' | 'EXP') {
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
      if (systemStore.temp.floatingTexts && systemStore.temp.floatingTexts.length > 0) {
        systemStore.temp.floatingTexts.shift();
      }
    }, 1500);
  }

  // [New] 战术建议生成
  function getTacticalSuggestion() {
    const monster = dailyMonster.value;
    const wType = monster?.weaknessType;
    const macros = logStore.todayMacros;
    const isOverloaded = stageInfo.value.isOverloaded;

    if (isOverloaded) return { text: 'BOSS 已暴走！停止进食，或者只喝水！', type: 'DANGER', icon: '⛔', tags: ['纯净', '水'] };

    // 断食检测
    const now = Date.now();
    const lastMeal = logStore.lastMealTime;
    if (lastMeal > 0 && (now - lastMeal) > 16 * 60 * 60 * 1000) {
      return { text: '蓄力完成！现在进食必定暴击！建议摄入高热量主食！', type: 'GOOD', icon: '⚡', tags: ['高蛋白', '高碳'] };
    }

    if (wType === '低碳' || wType === 'LOW_CARB') {
      if (macros.c > 150) return { text: '碳水过量警告！请立刻停止摄入主食！', type: 'WARN', icon: '⚠️', tags: ['高蛋白', '纯净'] };
      return { text: '战术建议：多吃肉和蔬菜，少吃米饭。', type: 'INFO', icon: '🍖', tags: ['高蛋白', '纯净'] };
    }
    if (wType === '低脂' || wType === 'LOW_FAT') {
      if (macros.f > 60) return { text: '油脂过高！Boss 正在回血！', type: 'WARN', icon: '⚠️', tags: ['纯净', '低脂'] };
      return { text: '战术建议：选择清淡饮食，拒绝油炸。', type: 'INFO', icon: '🥗', tags: ['纯净', '低脂'] };
    }
    if (wType === '高蛋白' || wType === 'HIGH_PRO') {
      if (macros.p < 50) return { text: '攻击力不足！急需补充蛋白质！', type: 'INFO', icon: '🥩', tags: ['高蛋白'] };
      return { text: '状态良好！继续保持高蛋白摄入。', type: 'GOOD', icon: '✨', tags: ['高蛋白'] };
    }
    if (wType === '水' || wType === 'WATER') {
      return { text: 'Boss 厌恶水分！多喝水造成暴击！', type: 'INFO', icon: '💧', tags: ['水'] };
    }

    return { text: '保持均衡饮食，稳扎稳打。', type: 'INFO', icon: '🛡️', tags: ['均衡'] };
  }

  // [Fix] 支持 forcedMealType 参数，确保补水不变成零食
  function battleCommit(item: FoodItem, forcedMealType?: MealType) {
    if (!item) return;

    // [工单02] "僵尸英雄"禁入战场 - HP为0时禁止战斗
    // [UI欺诈修复] 必须给用户明确的反馈,不能静默拒绝
    if (!systemStore.isPureMode && heroStore.user.heroCurrentHp <= 0) {
      // 使用showNotify而不showToast, 提供更明显的视觉反馈
      showNotify({
        type: 'warning',
        message: '⚠️ 你已经精疲力尽，请先休息（回血）！',
        background: '#f59e0b',
        duration: 3000
      });
      return; // 终止执行
    }

    // [工单03] 时空穿越修正 - 判断是否为今日记录
    const isToday = isSameDay(new Date(systemStore.currentDate), new Date());

    // --- Special: Exercise Logic ---
    // 运动不计算伤害，而是治疗/增加Target
    if (item.isExercise || forcedMealType === 'EXERCISE') {
      const exerciseLog: FoodLog = {
        ...item,
        mealType: 'EXERCISE',
        timestamp: new Date().toISOString(),
        generatedGold: 0, // [指令1] 初始化为0,后面会赋值
        generatedExp: 0
      };

      const savedLog = logStore.addLog(exerciseLog);

      // 运动效果
      const healAmt = 50 + Math.floor((item.calories || 0) / 10);

      // [Modified Logic V6.2] 护盾转化机制
      const currentHp = heroStore.user.heroCurrentHp;
      const maxHp = heroStore.user.heroMaxHp;
      const missingHp = maxHp - currentHp;

      if (healAmt <= missingHp) {
        // 1. 未满血：全部用于治疗
        heroStore.heal(healAmt);
        if (!systemStore.isPureMode) {
          systemStore.triggerHealEffect();
          spawnFloatingText(`+${healAmt}`, 'HEAL');
          showNotify({ type: 'success', message: `🏋️ 运动恢复：HP +${healAmt}` });
        }
      } else {
        // 2. 溢出：先补满血，剩余转护盾/金币
        if (missingHp > 0) heroStore.heal(missingHp);
        const overflow = healAmt - missingHp;

        // 如果护盾未满，加护盾
        // 如果护盾已满，加金币
        const shieldCap = maxHp; // 护盾上限=血量上限
        const currentShield = heroStore.user.heroShield || 0;
        const shieldSpace = shieldCap - currentShield;

        if (shieldSpace > 0) {
          // 优先填补护盾
          const shieldGain = Math.min(overflow, shieldSpace);
          heroStore.addShield(shieldGain);

          if (!systemStore.isPureMode) {
            systemStore.triggerHealEffect();
            if (missingHp > 0) spawnFloatingText(`+${missingHp}`, 'HEAL');
            setTimeout(() => spawnFloatingText(`+${shieldGain}`, 'BLOCK'), 200); // 蓝色护盾飘字

            showNotify({
              type: 'primary',
              message: `🛡️ 状态绝佳！获得 ${shieldGain} 点护盾！`,
              background: '#0ea5e9',
              duration: 2500
            });
          }

          // 如果还有剩余溢出 (护盾也满了)，则转金币
          const remainingOverflow = overflow - shieldGain;
          if (remainingOverflow > 0) {
            const goldBonus = Math.floor(remainingOverflow * 0.5);
            if (goldBonus > 0) {
              heroStore.addGold(goldBonus, '运动转化', 'BATTLE_REWARD');
              exerciseLog.generatedGold = goldBonus; // [指令1] 记录运动产出的金币
              setTimeout(() => spawnFloatingText(`+${goldBonus}G`, 'EXP'), 400);
            }
          }

        } else {
          // 护盾已满，全额转金币 (50%比例)
          const goldBonus = Math.floor(overflow * 0.5);
          heroStore.addGold(goldBonus, '运动转化', 'BATTLE_REWARD');
          exerciseLog.generatedGold = goldBonus; // [指令1] 记录运动产出的金币
          if (!systemStore.isPureMode) {
            spawnFloatingText(`+${goldBonus}G`, 'EXP');
            showNotify({
              type: 'warning',
              message: `💪 巅峰状态！溢出的活力转化为 ${goldBonus} 金币！`,
              background: '#f59e0b',
              duration: 2500
            });
          }
        }
      }

      if (systemStore.isPureMode) {
        showToast(`运动记录成功，消耗 ${item.calories} kcal`);
      }
      return;
    }

    // ... (Existing tag logic) ...
    const tags = item.tags || [];
    const c = Number(item.c)||0, f = Number(item.f)||0, p = Number(item.p)||0;
    const grams = Number(item.grams)||100;
    const calories = Number(item.calories)||0;

    const newTags = new Set<string>();
    if (item.tags) item.tags.forEach((t: string) => newTags.add(t));

    const safeGrams = grams > 0 ? grams : 1;
    const densityC = c / safeGrams;
    const densityF = f / safeGrams;
    const densityP = p / safeGrams;

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

    // [Fix] 增加标签判定逻辑，支持更多怪物类型
    if (item.name.includes('水') || item.name.includes('茶') || item.name.includes('咖啡')) newTags.add('水');
    if (!newTags.has('高糖') && !newTags.has('高油') && !newTags.has('垃圾食品')) newTags.add('纯净');

    if (item.name.includes('糖') || item.name.includes('奶茶') || item.name.includes('蛋糕')) newTags.add('高糖');
    if (newTags.has('高碳') && newTags.has('高蛋白') && newTags.has('纯净')) newTags.add('均衡');

    const displayName = (systemStore.isPureMode && item.originalName) ? item.originalName : item.name;

    const battleItem: FoodLog = {
      ...item,
      name: displayName,
      tags: Array.from(newTags),
      mealType: forcedMealType || systemStore.temp.activeMealType || 'SNACK',
      timestamp: new Date().toISOString()
    };

    try {
      collectionStore.saveToFoodDb(battleItem);
    } catch (e) {
      console.warn('FoodDB save failed', e);
    }

    // Hydration Logic
    if (battleItem.mealType === 'HYDRATION') {
      const savedLog = logStore.addLog(battleItem);
      collectionStore.checkDailyQuests(savedLog);
      checkAchievements(false);
      return;
    }

    // [New V4.5] 触发投掷动画
    systemStore.triggerProjectile(item.icon);

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

    // [New] 断食蓄力机制 (Fasting Bonus)
    const now = Date.now();
    const lastMeal = logStore.lastMealTime;
    let fastingBonus = 0;
    if (lastMeal > 0) {
      const hours = (now - lastMeal) / (1000 * 60 * 60);
      if (hours > 16) fastingBonus = 1.0; // 16小时断食，伤害翻倍
      else if (hours > 12) fastingBonus = 0.5; // 12小时断食，伤害+50%

      if (fastingBonus > 0) {
        multiplier += fastingBonus;
        battleItem.fastingHours = parseFloat(hours.toFixed(1));
      }
    }

    // [Fix] 补全所有怪物类型的克制/抵抗逻辑
    if (monster && !ignoreResist) {
      const type = monster.weaknessType;

      // 1. 低碳怪 (糖霜魔像等)
      if (type === '低碳' || type === 'LOW_CARB') {
        if (newTags.has('高碳') || newTags.has('高糖')) {
          multiplier = 0.3; isResist = true; resistReason = 'Boss 厌恶碳水/糖分！';
        }
      }
      // 2. 低脂怪 (油腻史莱姆等)
      else if (type === '低脂' || type === 'LOW_FAT') {
        if (newTags.has('高油')) {
          multiplier = 0.3; isResist = true; resistReason = 'Boss 厌恶油腻！';
        }
      }
      // 3. 高蛋白怪 (饥饿幽灵等) - 奖励机制
      else if (type === '高蛋白' || type === 'HIGH_PRO') {
        if (newTags.has('高蛋白')) {
          multiplier *= 1.5; // 蛋白质暴击
        } else {
          multiplier *= 0.8; // 没肉没伤害
        }
      }
      // 4. 纯净怪 (垃圾桶怪等)
      else if (type === '纯净' || type === 'CLEAN') {
        if (newTags.has('高糖') || newTags.has('高油') || newTags.has('垃圾食品')) {
          multiplier = 0.2; isResist = true; resistReason = 'Boss 免疫垃圾食品！';
        } else if (newTags.has('纯净')) {
          multiplier *= 1.3; // 纯净加成
        }
      }
      // 5. 水怪 (荒芜旱怪等)
      else if (type === '水' || type === 'WATER') {
        if (battleItem.mealType === 'HYDRATION' || newTags.has('水')) {
          multiplier *= 2.0; // 水属性暴击
        } else if (battleItem.mealType === 'SNACK') {
          multiplier *= 0.5; // 干粮效果差
        }
      }
      // 6. 均衡怪 (暴食史莱姆等)
      else if (type === '均衡' || type === 'BALANCED') {
        if (newTags.has('均衡')) {
          multiplier *= 1.5;
        }
      }
    }

    const { newCombo, comboMultiplier, comboMsg } = calculateCombo(battleItem.tags || [], Date.now());

    // [Fix] 立即更新 ComboState 确保状态同步
    if (systemStore.currentDate === getLocalDateStr()) {
      comboState.count = newCombo;
      console.log('[BattleCommit] Combo Updated:', comboState.count);
    }

    if (!isResist) multiplier *= comboMultiplier;
    if (isExhausted) multiplier *= 0.5;

    const env = environment.value;
    multiplier *= env.multiplier;

    if (activeSkill?.effectType === 'CRIT_GUARANTEE') {
      if (activeSkill.id === 'ORC_RAGE') multiplier = 3.0;
      else multiplier = Math.max(multiplier, 1.5);
    }

    battleItem.multiplier = Number(multiplier.toFixed(2));
    battleItem.comboCount = newCombo;

    let xp = battleItem.isComposite ? 60 : 30;
    if (activeSkill?.effectType === 'DOUBLE_EXP') xp *= 2;
    if (isExhausted) xp = Math.floor(xp * 0.5);

    const damageVal = Math.floor(calories * multiplier);
    battleItem.finalDamageValue = damageVal;

    if (stageInfo.value.currentHpRemaining <= damageVal && !stageInfo.value.isOverloaded) {
      xp += 10;
      spawnFloatingText('OVERKILL!', 'EXP');
    }

    battleItem.gainedExp = xp;

    // Toast/Notify Logic
    if (systemStore.isPureMode) {
      showNotify({ type: 'success', message: `✅ 已记录: ${battleItem.name} (${calories} kcal)`, duration: 1500 });
    } else {
      if (activeSkill?.effectType === 'DOUBLE_EXP' && activeSkill.id === 'HUMAN_PRAYER') {
        const healAmt = Math.floor(calories * 0.5);
        heroStore.heal(healAmt);
        spawnFloatingText(`+${healAmt}`, 'HEAL');
        systemStore.triggerHealEffect(); // [V4.3]
        showNotify({ type: 'success', message: `🙏 圣光转化：恢复 ${healAmt} HP`, duration: 2000 });
      }
      else if (isResist || isBossOverloaded) {
        // ... (Keep Resist Logic) ...
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
              heroStore.damage(damage); // [Updated] Use new damage logic (shield first)
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
        let heal = Math.floor(calories/20);
        if (activeSkill?.effectType === 'LIFESTEAL') {
          heal += Math.floor(damageVal * 0.1);
        }

        if (activeSkill?.id === 'ORC_RAGE') {
          heroStore.damage(50);
          showNotify({ type: 'warning', message: '🩸 血祭：自身扣除 50 HP', duration: 2000 });
        }

        let msg = `✅ 已记录：${battleItem.name}`;

        // [New V4.3] 判断是否暴击
        const isCrit = multiplier > 1.2;
        // 延时飘字 (等待投掷物击中)
        setTimeout(() => {
          spawnFloatingText(`${damageVal}`, isCrit ? 'CRIT' : 'DAMAGE');
          if (isCrit) {
            systemStore.triggerCritEffect();
          }
        }, 550);

        if (heal > 0) {
          heroStore.heal(heal);
          setTimeout(() => spawnFloatingText(`+${heal}`, 'HEAL'), 600);
          msg += `\n❤️ 恢复 ${heal} HP`;
        }

        if (isExhausted) msg += `\n⚠️ 力竭状态：伤害减半`;
        if (newCombo > 1) msg += ` | 连击 x${newCombo}`;
        if (activeSkill) msg += ` | ${activeSkill.name}`;
        if (env.type === 'BUFF') msg += ` | ${env.icon}环境加成`;
        if (fastingBonus > 0) msg += ` | 🕒 蓄力一击!`; // [New]

        showNotify({ type: 'success', message: msg, duration: 2000 });
      }
    }

    const savedLog = logStore.addLog(battleItem);

    // [指令1] 记录产出的奖励 - 用于精确回滚
    let generatedGold = 0;
    let generatedExp = 0;

    // [工单03] 仅在今日记录时更新 combo 和给予奖励
    if (isToday) {
      if (systemStore.currentDate === getLocalDateStr()) {
        comboState.lastLogTime = Date.now();
        comboState.lastLogId = savedLog.id;
      }

      // 今日记录：正常给予 XP 和 Gold
      // [指令4] 纯净模式的数据隔离 - 防止用户在纯净模式下后台偷偷升级
      if (!systemStore.isPureMode) {
        generatedExp = xp; // [指令1] 记录产出的经验
        heroStore.addExp(xp, battleItem.name || '战斗结算', 'BATTLE_REWARD');
      }

      if (!systemStore.isPureMode) {
        let goldDrop = Math.floor(calories / 20);
        if (goldDrop < 1) goldDrop = 1;

        if (newCombo > 1) goldDrop = Math.floor(goldDrop * (1 + newCombo * 0.1));
        if (multiplier > 1.2) goldDrop = Math.floor(goldDrop * 1.5);

        generatedGold = goldDrop; // [指令1] 记录产出的金币
        heroStore.addGold(goldDrop, '战斗奖励', 'BATTLE_REWARD');
        if (Math.random() > 0.5) setTimeout(() => spawnFloatingText(`+${goldDrop}G`, 'EXP'), 700);
      }

      collectionStore.checkDailyQuests(savedLog);
      checkAchievements(false);

      const quests = collectionStore.quests.filter(q => q.status === 'ACCEPTED');
      const completedCount = quests.filter(q => q.current >= q.target).length;
      if (completedCount === quests.length && quests.length > 0) {
        setTimeout(() => {
          showNotify({ type: 'success', message: '🎉 今日任务全部完成！', background: '#f59e0b' });
          safeVibrate(200);
        }, 500);
      }
    } else {
      // 历史补录：仅保存数据，不触发战斗结算
      // 可选：给予少量安慰奖励
      const retroactiveXp = Math.floor(xp * 0.2); // 20%的经验作为补录奖励
      if (retroactiveXp > 0 && !systemStore.isPureMode) {
        generatedExp = retroactiveXp; // [指令1] 记录历史补录的经验
        heroStore.addExp(retroactiveXp, '历史补录', 'BATTLE_REWARD');
      }

      if (!systemStore.isPureMode) {
        showToast(`历史记录已保存 (+${retroactiveXp} XP 补录奖励)`);
      }
    }

    // [指令1] 更新已保存的日志，补充generated字段
    if (savedLog && (generatedGold > 0 || generatedExp > 0)) {
      logStore.updateLogRewards(savedLog.id, generatedGold, generatedExp);
    }
  }

  // [指令3] 删除记录处理 - 修复经济系统的"零元购"与"运动刷钱"漏洞
  function deleteLog(log: FoodLog) {
    // [移除熔断] 不再检查余额,允许用户负债删除(体验更好)

    // [读取账本] 直接读取log中保存的generatedGold和generatedExp
    const goldToRevert = log.generatedGold || 0;
    const expToRevert = log.generatedExp || 0;

    // 执行删除操作
    const removed = logStore.removeLog(log.id);
    if (removed) {
      // [指令1修复] 回滚 XP 时传入 source 参数
      if (expToRevert > 0) {
        heroStore.revertXp(expToRevert, '撤销操作');
      }

      // [指令1修复] 回滚 Gold 时传入 source 参数
      if (goldToRevert > 0) {
        heroStore.revertGold(goldToRevert, '撤销操作');
      }

      // [运动修正] 对于运动,除了扣血,必须增加扣除generatedGold的步骤
      if (removed.mealType === 'EXERCISE') {
        const healAmt = 50 + Math.floor((removed.calories || 0) / 10);
        heroStore.damage(healAmt);
        // 注意: generatedGold已经在上面执行了,不需要重复扣除
      } else {
        // 如果是饮食且有反伤,回血
        if (removed.damageTaken) heroStore.heal(removed.damageTaken);
      }

      // 回滚 combo
      if (systemStore.currentDate === getLocalDateStr()) {
        comboState.count = Math.max(0, comboState.count - 1);
      }

      showToast('记录已撤销');
      return true;
    }
    return false;
  }

  return {
    comboState,
    stageInfo,
    weeklyStats,
    dailyMonster,
    environment,
    battleCommit,
    deleteLog,
    checkAchievements,
    getTacticalSuggestion,
    validateCombo // 导出这个新方法
  };
});
