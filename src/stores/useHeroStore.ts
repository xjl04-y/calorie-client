import { defineStore } from 'pinia';
import { reactive, computed, watch } from 'vue';
import type { UserState, InitUserForm, RaceType, DailyReportData, TargetConfig } from '@/types';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useLogStore } from '@/stores/useLogStore';
import { getLocalDateStr } from '@/utils/dateUtils';
import { RACES, RACE_SKILL_TREES, MONSTERS } from '@/constants/gameData';
import { showToast, showNotify } from 'vant';

const MAX_LEVEL = 100;

export const useHeroStore = defineStore('hero', () => {
  const systemStore = useSystemStore();
  const collectionStore = useCollectionStore();
  const logStore = useLogStore();

  // --- State ---
  // 注意：请确保 types/index.ts 中的 UserState 接口已包含 stamina 和 maxStamina 字段
  const user = reactive<UserState>({
    isInitialized: false,
    level: 1,
    currentExp: 0,
    nextLevelExp: 100,
    baseBMR: 2000,
    nickname: '',
    avatarSeed: 'Felix',
    avatarType: 'SEED',
    customAvatar: '',
    race: 'HUMAN',
    gender: 'MALE',
    height: 170,
    weight: 65,
    age: 25,
    heroCurrentHp: 200,
    heroMaxHp: 200,
    heroShield: 0,

    // [PM Add] 新增体力系统，配合 UI 显示
    stamina: 100,
    maxStamina: 100,

    equipped: { HEAD: null, BODY: null, LEGS: null, WEAPON: null, OFFHAND: null, BACK: null, ACCESSORY: null },
    weightHistory: [],
    skillPoints: 0,
    learnedSkills: {},
    activeSkillId: null,
    activeSkillCd: 0,
    loginStreak: 1,
    lastLoginDate: getLocalDateStr(),
    gold: 0,
    inventory: { 'item_rebirth_potion': 1 },
    hydration: {
      dailyTargetCups: 8,
      cupSizeMl: 250,
      reminderInterval: 60,
      enableNotifications: false
    },
    fasting: {
      isFasting: false,
      startTime: 0,
      targetHours: 16
    },
    targetConfig: {
      mode: 'AUTO',
      goal: 'MAINTAIN',
      activityLevel: 1.2
    }
  });

  // --- Getters ---

  const skillTree = computed(() => {
    return RACE_SKILL_TREES[user.race] || RACE_SKILL_TREES['HUMAN'];
  });

  // 计算被动加成 (Complex Logic Preserved)
  const passiveBonuses = computed(() => {
    let bmrBonus = 0;
    let statMult = { str: 0, agi: 0, vit: 0 };
    let expRate = 1.0;

    // 连胜经验加成：每多一天 +1%，最高 10%
    if (user.loginStreak > 1) {
      expRate += Math.min((user.loginStreak - 1) * 0.01, 0.1);
    }

    skillTree.value?.forEach(node => {
      const level = user.learnedSkills[node.id] || 0;
      if (level > 0) {
        if (node.type === 'PASSIVE_BMR') {
          bmrBonus += node.effectParams.base + (level - 1) * node.effectParams.scale;
        } else if (node.type === 'PASSIVE_STAT') {
          const target = node.effectParams.target;
          const val = node.effectParams.base + (level - 1) * node.effectParams.scale;

          if (target === 'str_mult') statMult.str += val;
          else if (target === 'agi_mult') statMult.agi += val;
          else if (target === 'vit_mult') statMult.vit += val;
          else if (target === 'exp_rate') expRate += val;
          else if (target === 'all_stat') {
            statMult.str += val; statMult.agi += val; statMult.vit += val;
          }
        }
      }
    });

    return { bmrBonus, statMult, expRate };
  });

  // 动态真实最大生命值
  const realMaxHp = computed(() => {
    const { totalF } = logStore.historyTotalMacros;
    const race = RACES[user.race] || RACES.HUMAN;
    const bonuses = passiveBonuses.value;

    // 基础体力由总脂肪摄入决定 (RPG 设定：脂肪储备转化为生命力)
    let rawVit = Math.floor(totalF / 40) + 10;
    rawVit = Math.floor(rawVit * (race?.growth?.vit || 1) * (1 + bonuses.statMult.vit));

    // 等级上限防止数值膨胀
    const statCap = 50 + (user.level * 20);
    const finalVit = Math.min(rawVit, statCap);

    return 200 + (finalVit * 10);
  });

  // 同步 MaxHp 到 State
  watch(realMaxHp, (val) => {
    user.heroMaxHp = val;
    // 如果最大生命值上限降低，当前血量需要截断，但保留护盾
    if (user.heroCurrentHp > val) {
      user.heroCurrentHp = val;
    }
  }, { immediate: true });

  // 每日热量目标 (Boss 血量)
  const dailyTarget = computed(() => {
    let bonus = 0;
    // 装备加成
    Object.values(user.equipped).forEach(itemId => {
      if (itemId) {
        const item = collectionStore.achievements.find(a => a.id === itemId);
        if (item && item.bonusBMR) bonus += item.bonusBMR;
      }
    });
    // 被动技能加成
    bonus += passiveBonuses.value.bmrBonus;
    // 运动消耗加成 (运动越多，Boss 血量/可摄入量越高)
    const exerciseBurn = logStore.todayBurn || 0;

    let base = 2000;
    if (user.baseBMR && typeof user.baseBMR === 'number' && user.baseBMR > 500 && !isNaN(user.baseBMR)) {
      base = user.baseBMR;
    }

    return Math.round(base + bonus + exerciseBurn);
  });

  const activeSkill = computed(() => {
    return skillTree.value?.find(n => n.type === 'ACTIVE_BUFF' && (user.learnedSkills[n.id] || 0) > 0) || null;
  });

  const skillStatus = computed(() => {
    const skill = activeSkill.value;
    if (!skill) return { ready: false, text: '无技能', percent: 0, active: false };

    const now = systemStore.timestamp;
    const isActive = user.activeSkillId !== null;
    if (isActive) {
      return { ready: false, text: '生效中', percent: 100, active: true };
    }

    // 种族技能 CD 逻辑
    let cdHours = 12;
    if (skill.id.includes('ELF')) cdHours = 8;
    if (skill.id.includes('ORC')) cdHours = 16;
    if (skill.id.includes('DWARF')) cdHours = 10;

    const cdMs = cdHours * 60 * 60 * 1000;
    const elapsed = now - user.activeSkillCd;

    if (elapsed >= cdMs) {
      return { ready: true, text: '就绪', percent: 100, active: false };
    }

    const remainingSec = Math.ceil((cdMs - elapsed) / 1000);
    const percent = Math.min(100, (elapsed / cdMs) * 100);

    let timeText = '';
    if (remainingSec > 3600) timeText = `${Math.ceil(remainingSec / 3600)}h`;
    else if (remainingSec > 60) timeText = `${Math.ceil(remainingSec / 60)}m`;
    else timeText = `${remainingSec}s`;

    return { ready: false, text: timeText, percent, active: false };
  });

  const raceSkill = computed(() => {
    return skillTree.value?.find(n => n.type === 'ACTIVE_BUFF') || null;
  });

  const isExhausted = computed(() => user.heroCurrentHp <= 0);

  // --- Actions ---

  // [PM Add] 体力相关操作
  function useStamina(amount: number): boolean {
    if (!user.stamina) user.stamina = 0;
    if (user.stamina >= amount) {
      user.stamina -= amount;
      return true;
    }
    return false;
  }

  function recoverStamina(amount: number): void {
    const max = user.maxStamina || 100;
    if (!user.stamina) user.stamina = 0;
    user.stamina = Math.min(max, user.stamina + amount);
  }

  function addGold(amount: number): void {
    if (!amount || amount <= 0) return;
    if (!user.gold) user.gold = 0;
    user.gold += Math.floor(amount);
  }

  function buyItem(itemId: string, price: number): boolean {
    if (user.gold < price) {
      showToast('金币不足');
      return false;
    }
    user.gold -= price;
    if (!user.inventory) user.inventory = {};
    user.inventory[itemId] = (user.inventory[itemId] || 0) + 1;
    showToast('购买成功');
    return true;
  }

  function consumeItem(itemId: string, count = 1): boolean {
    if (!user.inventory || !user.inventory[itemId] || user.inventory[itemId] < count) return false;
    user.inventory[itemId] -= count;
    if (user.inventory[itemId] <= 0) delete user.inventory[itemId];
    return true;
  }

  function rebirth(newRace: RaceType): void {
    if (!consumeItem('item_rebirth_potion')) {
      showToast('缺少转生药水');
      return;
    }

    let totalRefundSP = 0;
    const currentTree = RACE_SKILL_TREES[user.race];
    if (currentTree) {
      currentTree.forEach(node => {
        const level = user.learnedSkills[node.id] || 0;
        if (level > 0) {
          totalRefundSP += (level * node.cost);
        }
      });
    }

    user.skillPoints += totalRefundSP;
    user.learnedSkills = {};
    user.activeSkillId = null;
    user.activeSkillCd = 0;
    user.race = newRace;

    systemStore.setModal('rebirth', false);
    showNotify({
      type: 'success',
      message: `✨ 转生成功！化身为${RACES[newRace].name}！\n返还 ${totalRefundSP} 点技能点。`,
      duration: 3000,
      background: '#7c3aed'
    });
  }

  // 私有辅助方法：计算 TDEE
  function _calculateRecommendedBMR(weight: number, height: number, age: number, gender: string, activityLevel: number, goal: string): number {
    const w = Number(weight) || 60;
    const h = Number(height) || 170;
    const a = Number(age) || 25;
    const level = Number(activityLevel) || 1.2;

    const s = gender === 'MALE' ? 5 : -161;
    const bmr = 10 * w + 6.25 * h - 5 * a + s;
    const tdee = bmr * level;

    let adjustment = 0;
    if (goal === 'LOSE') adjustment = -400;
    if (goal === 'GAIN') adjustment = 300;

    let final = Math.round(tdee + adjustment);
    if (isNaN(final)) return 2000;
    return Math.max(1200, final);
  }

  function recalcBMR(): void {
    if (!user.targetConfig) {
      user.targetConfig = { mode: 'AUTO', goal: 'MAINTAIN', activityLevel: 1.2 };
    }

    if (String(user.targetConfig.mode) === 'MANUAL') {
      const manual = Number(user.targetConfig.manualBMR);
      if (manual && manual > 500 && !isNaN(manual)) {
        user.baseBMR = manual;
      }
      return;
    }

    const w = Number(user.weight) || 60;
    const h = Number(user.height) || 170;
    const a = Number(user.age) || 25;
    const g = user.gender || 'MALE';
    const level = Number(user.targetConfig.activityLevel) || 1.2;
    const goal = user.targetConfig.goal || 'MAINTAIN';

    const recommended = _calculateRecommendedBMR(w, h, a, g, level, goal);
    user.baseBMR = recommended;
  }

  function updateTargetConfig(config: Partial<TargetConfig>): void {
    if (!user.targetConfig) {
      user.targetConfig = { mode: 'AUTO', goal: 'MAINTAIN', activityLevel: 1.2 };
    }
    Object.assign(user.targetConfig, config);
    recalcBMR();
    if (!systemStore.isPureMode && config.goal) {
      const msgs: Record<string, string> = {
        LOSE: `轻装上阵！Boss 血量已削减至 ${user.baseBMR}`,
        GAIN: `重装突击！Boss 血量提升至 ${user.baseBMR}，需要更多能量！`,
        MAINTAIN: `平衡姿态。目标调整为 ${user.baseBMR}`
      };
      if (config.goal in msgs) {
        showToast(msgs[config.goal as string] || '目标已更新');
      }
    } else {
      showToast(`目标热量已更新: ${user.baseBMR} kcal`);
    }
  }

  function initUser(formData: InitUserForm): void {
    Object.assign(user, formData);

    user.targetConfig = {
      mode: 'AUTO',
      goal: 'MAINTAIN',
      activityLevel: 1.2
    };

    if (user.weight > 0) {
      updateWeight(user.weight, true);
    } else {
      recalcBMR();
    }

    user.skillPoints = 0;
    user.learnedSkills = {};
    user.activeSkillId = null;
    user.activeSkillCd = 0;
    user.loginStreak = 1;
    user.lastLoginDate = getLocalDateStr();
    user.gold = 0;
    user.inventory = { 'item_rebirth_potion': 1 };

    // 初始化体力
    user.stamina = 100;
    user.maxStamina = 100;

    user.hydration = {
      dailyTargetCups: 8,
      cupSizeMl: 250,
      reminderInterval: 60,
      enableNotifications: false
    };

    user.fasting = {
      isFasting: false,
      startTime: 0,
      targetHours: 16
    };

    user.heroMaxHp = 200;
    user.heroCurrentHp = user.heroMaxHp;
    user.heroShield = 0;
    user.isInitialized = true;
  }

  function updateWeight(newWeight: number, isInit = false): void {
    if (newWeight <= 0) return;
    user.weight = newWeight;

    if (user.targetConfig?.mode === 'AUTO' || !user.targetConfig) {
      recalcBMR();
    }

    if (!user.weightHistory) user.weightHistory = [];

    const today = getLocalDateStr();
    const history = [...user.weightHistory];
    const existingIdx = history.findIndex(r => r.date === today);

    if (existingIdx !== -1) {
      history[existingIdx]!.weight = newWeight;
    } else {
      history.push({ date: today, weight: newWeight });
    }

    if (history.length > 365) {
      history.shift();
    }

    user.weightHistory = history;
  }

  function addExp(amount: number): void {
    if (user.level >= MAX_LEVEL) return;

    const safeAmount = Number.isNaN(amount) ? 0 : amount;
    const realAmount = Math.floor(safeAmount * passiveBonuses.value.expRate);
    user.currentExp += realAmount;

    let leveledUp = false;
    let safetyCounter = 0;

    while (user.currentExp >= user.nextLevelExp && safetyCounter < 5) {
      user.currentExp -= user.nextLevelExp;
      user.level++;
      user.nextLevelExp = Math.floor(100 * Math.pow(user.level, 2.2));
      user.skillPoints += 1;
      leveledUp = true;
      safetyCounter++;

      if (user.level >= MAX_LEVEL) {
        user.currentExp = 0;
        break;
      }
    }

    if (leveledUp) {
      if (!systemStore.isPureMode) {
        systemStore.setModal('levelUp', true);
        const healAmount = Math.floor(realMaxHp.value * 0.2);
        heal(healAmount);
        // 回复部分体力
        recoverStamina(50);
        setTimeout(() => {
          showToast(`升级奖励：HP 恢复 ${healAmount}, 体力恢复 50`);
        }, 1000);
      }
    }
  }

  function upgradeSkill(nodeId: string, combatPower: number): void {
    const node = skillTree.value?.find(n => n.id === nodeId);
    if (!node) return;

    const currentLv = user.learnedSkills[node.id] || 0;
    if (currentLv >= node.maxLevel) {
      showToast('已达到最大等级');
      return;
    }
    if (user.skillPoints < node.cost) {
      showToast('技能点不足');
      return;
    }
    if (user.level < node.reqLevel) {
      showToast(`等级不足 (需 Lv.${node.reqLevel})`);
      return;
    }
    if (node.reqCombatPower && combatPower < node.reqCombatPower) {
      showToast(`战力不足 (需 ${node.reqCombatPower})`);
      return;
    }
    if (node.parentId && (user.learnedSkills[node.parentId] || 0) === 0) {
      showToast('前置技能未学习');
      return;
    }

    user.skillPoints -= node.cost;
    user.learnedSkills[node.id] = currentLv + 1;
    showToast(`技能 ${node.name} 升级成功！`);
  }

  function activateSkill(): void {
    if (skillStatus.value.ready) {
      user.activeSkillCd = Date.now();
      user.activeSkillId = raceSkill.value?.id || null;
      showToast('技能已激活！下一次进食将触发效果');
    }
  }

  function consumeSkillEffect() {
    if (user.activeSkillId) {
      const skillId = user.activeSkillId;
      const skillNode = skillTree.value?.find(n => n.id === skillId);
      user.activeSkillId = null;
      return skillNode ? { ...skillNode, effectType: skillNode.type === 'ACTIVE_BUFF' ? skillNode.effectParams.target : '' } : null;
    }
    return null;
  }

  // [Fix Bug] 核心修复：治疗溢出转护盾逻辑
  // 逻辑说明：如果当前血量+治疗量 > 上限，则补满血，并将多余部分转为护盾
  function heal(amount: number): void {
    const safeAmount = Number.isNaN(amount) ? 0 : amount;
    const max = realMaxHp.value;

    // 1. 计算当前距离满血还差多少
    const deficit = Math.max(0, max - user.heroCurrentHp);

    if (safeAmount > deficit) {
      // 2. 如果治疗量足够补满还有剩余
      user.heroCurrentHp = max; // 补满
      const overflow = safeAmount - deficit; // 计算溢出
      addShield(overflow); // 溢出转护盾
    } else {
      // 3. 如果不够补满，正常加血
      user.heroCurrentHp += safeAmount;
    }
  }

  // [New] 增加护盾逻辑 (上限 = MaxHP)
  function addShield(amount: number): void {
    const safeAmount = Number.isNaN(amount) ? 0 : amount;
    if (!user.heroShield) user.heroShield = 0;
    user.heroShield += safeAmount;

    // 护盾上限设定为最大生命值的 100%
    const shieldCap = realMaxHp.value;
    if (user.heroShield > shieldCap) user.heroShield = shieldCap;
  }

  function damage(amount: number): void {
    let safeAmount = Number.isNaN(amount) ? 0 : amount;

    if (user.heroShield > 0) {
      if (user.heroShield >= safeAmount) {
        user.heroShield -= safeAmount;
        safeAmount = 0; // 护盾完全吸收
      } else {
        safeAmount -= user.heroShield;
        user.heroShield = 0; // 护盾破碎
      }
    }

    if (safeAmount > 0) {
      user.heroCurrentHp = Math.floor(Math.max(0, user.heroCurrentHp - safeAmount));
    }
  }

  // 核心业务：检查连胜与结算昨日战斗
  function checkLoginStreak(): void {
    if (!user.isInitialized) return;

    const today = getLocalDateStr();
    const last = user.lastLoginDate;

    if (today === last) return; // 今天已经处理过了

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    let streakMaintained = false;

    // 逻辑：如果上次登录就是昨天，则连胜保持；否则检查是否有“时间冻结道具”
    if (last === yesterdayStr) {
      streakMaintained = true;
    } else {
      if (consumeItem('item_streak_freeze', 1)) {
        streakMaintained = true;
        if (!systemStore.isPureMode) {
          showNotify({ type: 'success', message: '🕰️ 时光怀表生效！连续登录已保留。', background: '#7c3aed', duration: 4000 });
        }
      } else {
        user.loginStreak = 1;
      }
    }

    user.lastLoginDate = today;

    // 获取昨天的记录来结算
    const yLogs = logStore.logs[yesterdayStr] || [];

    if (yLogs.length === 0) {
      // 昨天没记录
      if (streakMaintained) {
        if (last === yesterdayStr) user.loginStreak += 1;
      }
      user.heroShield = 0; // 隔天护盾清零
      if (!systemStore.isPureMode) {
        showNotify({ type: 'warning', message: `📅 新的一天！连击天数: ${user.loginStreak}`, duration: 2000 });
      }
      return;
    }

    if (streakMaintained && last === yesterdayStr) {
      user.loginStreak += 1;
    }

    user.heroShield = 0;

    // 核心结算：卡路里 vs 目标
    const totalCals = yLogs.reduce((sum, l) => sum + (l.calories || 0), 0);
    const targetBMR = dailyTarget.value;

    let status: 'VICTORY' | 'DEFEAT' | 'DRAW' = 'DRAW';
    if (totalCals > targetBMR * 1.1) status = 'DEFEAT';      // 摄入超标 10% -> 失败
    else if (totalCals < targetBMR * 0.6) status = 'DEFEAT'; // 摄入过低 60% -> 失败 (节食过度)
    else status = 'VICTORY';

    let expGained = 0;
    let goldGained = 0;

    if (status === 'VICTORY') {
      expGained = 100 + (user.loginStreak * 10);
      goldGained = 50 + (user.loginStreak * 5);
    } else {
      expGained = 20;
      goldGained = 10;
    }

    // 生成随机怪物名作为“昨日Boss”
    const seed = yesterdayStr.split('').reduce((a, b, i) => a + (b.charCodeAt(0) * (i + 1)), 0);
    const monster = MONSTERS[seed % MONSTERS.length] || MONSTERS[0];

    addExp(expGained);
    addGold(goldGained);
    // 每日结算恢复体力
    recoverStamina(100);

    if (!systemStore.isPureMode) {
      const report: DailyReportData = {
        date: yesterdayStr,
        totalCalories: totalCals,
        targetBMR: targetBMR,
        status,
        expGained,
        goldGained,
        monsterName: monster.name,
        loginStreak: user.loginStreak
      };

      systemStore.temp.reportData = report;
      systemStore.setModal('dailyReport', true);
    } else {
      showNotify({ type: 'success', message: `📅 昨日结算完成：+${expGained} XP`, duration: 2000 });
    }
  }

  function startFasting(startTime?: number, targetHours = 16): void {
    user.fasting.isFasting = true;
    if (startTime) {
      user.fasting.startTime = startTime;
    } else if (logStore.lastMealTime > 0) {
      user.fasting.startTime = logStore.lastMealTime;
    } else {
      user.fasting.startTime = Date.now();
    }
    user.fasting.targetHours = targetHours;
  }

  function stopFasting(): void {
    user.fasting.isFasting = false;
    user.fasting.startTime = 0;
  }

  function updateFastingStartTime(time: number): void {
    user.fasting.startTime = time;
  }

  return {
    user,
    skillTree,
    passiveBonuses,
    activeSkill,
    raceSkill,
    skillStatus,
    dailyTarget,
    isExhausted,
    recalcBMR,
    initUser,
    addExp,
    addGold,
    buyItem,
    consumeItem,
    rebirth,
    upgradeSkill,
    activateSkill,
    consumeSkillEffect,
    heal,
    damage,
    updateWeight,
    checkLoginStreak,
    startFasting,
    stopFasting,
    updateFastingStartTime,
    updateTargetConfig,
    addShield,
    realMaxHp,
    // 新增导出
    useStamina,
    recoverStamina
  };
}, {
  persist: true
});
