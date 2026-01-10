import { defineStore } from 'pinia';
import { reactive, computed, watch } from 'vue';
import type { UserState, InitUserForm, RaceType, DailyReportData, TargetConfig } from '@/types';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useLogStore } from '@/stores/useLogStore';
import { getLocalDateStr } from '@/utils/dateUtils';
import { RACES, RACE_SKILL_TREES, MONSTERS, SHOP_ITEMS } from '@/constants/gameData';
import { showToast, showNotify } from 'vant';

const MAX_LEVEL = 100;
const STORAGE_KEY = 'rpg_hero_data_v2';

export const useHeroStore = defineStore('hero', () => {
  const systemStore = useSystemStore();
  const collectionStore = useCollectionStore();
  const logStore = useLogStore();

  // --- State ---
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
    transactionHistory: [],
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

  // [Fix] 完整实现所有技能树效果的统计逻辑
  // 这里将所有 passive 类型的技能效果聚合成一个大的属性对象
  const passiveBonuses = computed(() => {
    // 初始属性结构
    const stats = {
      // 基础属性
      bmrBonus: 0,
      strMult: 0, // 力量百分比
      agiMult: 0, // 敏捷百分比
      vitMult: 0, // 体质百分比

      // 资源/发育
      expRate: 1.0,  // 经验倍率
      goldMult: 1.0, // 全局金币倍率
      questGold: 0,  // 任务金币加成
      questExp: 0,   // 任务经验加成
      battleGold: 0, // 战斗金币加成

      // 战斗属性
      blockPct: 0,    // 格挡率
      critRate: 0,    // 暴击率
      critDmg: 0,     // 暴击伤害 (基础通常是 1.5，这里存增量)
      dodgeFlat: 0,   // 闪避率 (直接数值)
      reflectDmg: 0,  // 反弹伤害比例
      lifesteal: 0,   // 吸血比例
      ignoreDef: 0,   // 无视防御概率
      dmgReduce: 0,   // 固定减伤
      healMult: 0,    // 治疗效果加成

      // 特殊机制
      comboWindow: 0, // 连击窗口延长时间(分钟)
      maxEatLimit: 0, // 进食上限提升
      meatHealBonus: 0, // 肉类回复加成
      vegExpBonus: 0,   // 蔬菜经验加成
      cleanFoodBonus: 0,// 纯净食物加成
      shieldDmgRate: 0, // 护盾转攻击比例
      lowHpDmg: 0,      // 低血量增伤
      lowHpBlock: 0     // 低血量格挡
    };

    // 1. 连击奖励 (基础机制)
    if (user.loginStreak > 1) {
      stats.expRate += Math.min((user.loginStreak - 1) * 0.01, 0.1);
    }

    // 2. 遍历所有已学习技能进行累加
    skillTree.value?.forEach(node => {
      const level = user.learnedSkills[node.id] || 0;
      if (level > 0) {
        // 计算当前等级的数值
        const val = node.effectParams.base + (level - 1) * node.effectParams.scale;

        // BMR 特殊处理
        if (node.type === 'PASSIVE_BMR') {
          stats.bmrBonus += val;
        }
        // 属性统计处理 (涵盖 skillTrees.ts 中所有 target)
        else if (node.type === 'PASSIVE_STAT') {
          const t = node.effectParams.target;

          switch (t) {
            // 三维
            case 'str_mult': stats.strMult += val; break;
            case 'agi_mult': stats.agiMult += val; break;
            case 'vit_mult': stats.vitMult += val; break;
            case 'all_stat':
              stats.strMult += val;
              stats.agiMult += val;
              stats.vitMult += val;
              break;

            // 资源
            case 'exp_rate': stats.expRate += val; break;
            case 'gold_mult': stats.goldMult += val; break;
            case 'quest_gold': stats.questGold += val; break;
            case 'quest_exp': stats.questExp += val; break;
            case 'battle_gold': stats.battleGold += val; break;

            // 战斗
            case 'block_pct': stats.blockPct += val; break;
            case 'crit_rate': stats.critRate += val; break;
            case 'crit_dmg': stats.critDmg += val; break;
            case 'dodge_flat': stats.dodgeFlat += val; break;
            case 'reflect_dmg': stats.reflectDmg += val; break;
            case 'lifesteal': stats.lifesteal += val; break;
            case 'ignore_def': stats.ignoreDef += val; break;
            case 'dmg_reduce': stats.dmgReduce += val; break;
            case 'heal_mult': stats.healMult += val; break;

            // 特殊
            case 'combo_window': stats.comboWindow += val; break;
            case 'max_eat': stats.maxEatLimit += val; break;
            case 'meat_heal': stats.meatHealBonus += val; break;
            case 'veg_exp': stats.vegExpBonus += val; break;
            case 'clean_bonus': stats.cleanFoodBonus += val; break;
            case 'shield_dmg': stats.shieldDmgRate += val; break;
            case 'low_hp_dmg': stats.lowHpDmg += val; break;
            case 'low_hp_block': stats.lowHpBlock += val; break;
          }
        }
      }
    });

    return stats;
  });

  const realMaxHp = computed(() => {
    const { totalF } = logStore.historyTotalMacros;
    const race = RACES[user.race] || RACES.HUMAN;
    const bonuses = passiveBonuses.value;

    let rawVit = Math.floor(totalF / 40) + 10;
    // 使用新的 bonuses.vitMult
    rawVit = Math.floor(rawVit * (race?.growth?.vit || 1) * (1 + bonuses.vitMult));

    const statCap = 50 + (user.level * 20);
    const finalVit = Math.min(rawVit, statCap);

    // 兽人天赋：泰坦之躯 (hp_double_no_dodge) 可能在逻辑层处理，或者直接在这里加倍
    // 这里暂保持基础公式，特殊翻倍建议在 GameStore 或具体战斗逻辑中判定
    return 200 + (finalVit * 10) + (bonuses.maxEatLimit * 0.5); // 稍微让暴饮暴食也加点血上限
  });

  watch(realMaxHp, (val) => {
    user.heroMaxHp = val;
    if (user.heroCurrentHp > val) {
      user.heroCurrentHp = val;
    }
  }, { immediate: true });

  const dailyTarget = computed(() => {
    let bonus = 0;
    Object.values(user.equipped).forEach(itemId => {
      if (itemId) {
        const item = collectionStore.achievements.find(a => a.id === itemId);
        if (item && item.bonusBMR) bonus += item.bonusBMR;
      }
    });
    bonus += passiveBonuses.value.bmrBonus;
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

  function logTransaction(
    type: import('@/types').TransactionType,
    currency: 'GOLD' | 'EXP' | 'ITEM',
    amount: number,
    source: string,
    itemId?: string,
    itemName?: string,
    balanceAfter?: number
  ): void {
    if (!user.transactionHistory) user.transactionHistory = [];

    if (balanceAfter === undefined) {
      if (currency === 'GOLD') {
        balanceAfter = user.gold;
      } else if (currency === 'EXP') {
        balanceAfter = user.currentExp;
      } else if (currency === 'ITEM' && itemId) {
        balanceAfter = user.inventory[itemId] || 0;
      }
    }

    const record: import('@/types').TransactionRecord = {
      timestamp: new Date().toISOString(),
      type,
      currency,
      amount,
      balanceAfter,
      source
    };

    if (currency === 'ITEM') {
      record.itemId = itemId;
      record.itemName = itemName || itemId;
    }

    user.transactionHistory.push(record);
  }

  function addGold(amount: number, source: string = '系统奖励', type: import('@/types').TransactionType = 'SYSTEM_GRANT'): void {
    if (!amount || amount <= 0) return;
    if (!user.gold) user.gold = 0;

    // 应用金币加成 (被动技能)
    const bonuses = passiveBonuses.value;
    let multiplier = bonuses.goldMult;

    // 特定来源加成
    if (type === 'BATTLE_REWARD' || type === 'CHECKIN_BONUS') {
      multiplier += bonuses.battleGold;
    } else if (type === 'QUEST_REWARD') {
      multiplier += bonuses.questGold;
    }

    const safeAmount = Math.floor(amount * multiplier);
    user.gold += safeAmount;
    logTransaction(type, 'GOLD', safeAmount, source);
  }

  function revertXp(amount: number, source: string = '系统回滚'): void {
    if (!amount || amount <= 0) return;
    const safeAmount = Math.floor(amount);
    user.currentExp -= safeAmount;
    logTransaction('SYSTEM_ROLLBACK', 'EXP', -safeAmount, source);

    while (user.currentExp < 0 && user.level > 1) {
      user.level -= 1;
      const prevLevelExp = Math.floor(100 * Math.pow(user.level, 2.2));
      user.currentExp += prevLevelExp;
      if (user.skillPoints > 0) {
        user.skillPoints -= 1;
      }
      user.nextLevelExp = Math.floor(100 * Math.pow(user.level, 2.2));
    }

    if (user.level < 1) {
      user.level = 1;
      user.currentExp = 0;
      user.nextLevelExp = Math.floor(100 * Math.pow(1, 2.2));
    }

    if (user.currentExp < 0) {
      user.currentExp = 0;
    }
  }

  function revertGold(amount: number, source: string = '系统回滚'): void {
    if (!amount || amount <= 0) return;
    if (!user.gold) user.gold = 0;
    const safeAmount = Math.floor(amount);
    user.gold -= safeAmount;
    logTransaction('SYSTEM_ROLLBACK', 'GOLD', -safeAmount, source);
  }

  function buyItem(itemId: string, price: number, itemName?: string): boolean {
    if (user.gold < price) {
      showToast('金币不足');
      return false;
    }

    user.gold -= price;
    logTransaction('ITEM_BUY', 'GOLD', -price, `购买${itemName || itemId}`, undefined, undefined, user.gold);

    if (!user.inventory) user.inventory = {};
    const newCount = (user.inventory[itemId] || 0) + 1;
    user.inventory[itemId] = newCount;
    logTransaction('ITEM_BUY', 'ITEM', 1, `商店购买`, itemId, itemName, newCount);

    showToast('购买成功');
    return true;
  }

  function consumeItem(itemId: string, count = 1, itemName?: string): boolean {
    if (!user.inventory || !user.inventory[itemId] || user.inventory[itemId] < count) return false;

    user.inventory[itemId] -= count;
    const newCount = user.inventory[itemId];
    if (newCount <= 0) delete user.inventory[itemId];

    logTransaction('ITEM_USE', 'ITEM', -count, `使用道具`, itemId, itemName, newCount > 0 ? newCount : 0);

    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (item?.effect === 'EXP' && item.value) {
      // logic handled elsewhere
    }

    return true;
  }

  // --- [New Actions for Shop Items] ---

  function resetSkills(): void {
    let totalRefund = 0;
    const currentTree = RACE_SKILL_TREES[user.race];
    if (currentTree) {
      currentTree.forEach(node => {
        const level = user.learnedSkills[node.id] || 0;
        if (level > 0) {
          totalRefund += (level * node.cost);
        }
      });
    }
    user.learnedSkills = {};
    user.skillPoints += totalRefund;
    showNotify({ type: 'success', message: `✨ 技能已重置，返还 ${totalRefund} 点技能点` });
  }

  function clearDebuffs(): void {
    if (user.heroCurrentHp <= 0) {
      user.heroCurrentHp = 1;
      showNotify({ type: 'success', message: '✨ 净化成功！你从力竭中恢复了知觉。' });
    } else {
      showNotify({ type: 'success', message: '✨ 身体变得轻盈了！(净化效果)' });
    }
  }

  function openBlindBox(type: 'COMMON' | 'RARE'): void {
    const isRare = type === 'RARE';
    const rand = Math.random();
    let rewardMsg = '';

    if (rand < 0.4) {
      const gold = isRare ? 1000 + Math.floor(Math.random() * 1000) : 50 + Math.floor(Math.random() * 100);
      addGold(gold, '盲盒奖励', 'ITEM_USE');
      rewardMsg = `获得 ${gold} 金币`;
    } else if (rand < 0.7) {
      const exp = isRare ? 500 : 50;
      addExp(exp, '盲盒奖励', 'ITEM_USE');
      rewardMsg = `获得 ${exp} 经验`;
    } else {
      const potionId = isRare ? 'item_hp_potion_large' : 'item_hp_potion';
      if (!user.inventory) user.inventory = {};
      user.inventory[potionId] = (user.inventory[potionId] || 0) + 1;
      const itemName = isRare ? '大型生命药剂' : '小型生命药剂';
      rewardMsg = `获得 ${itemName} x1`;
    }

    showNotify({ type: 'success', message: `🎁 打开盲盒：${rewardMsg}`, background: '#f59e0b' });
  }

  function rebirth(newRace: RaceType): void {
    if (!consumeItem('item_rebirth_potion', 1, '转生药水')) {
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

    const raceData = RACES[newRace];
    if (raceData) {
      showNotify({
        type: 'success',
        message: `✨ 转生成功！化身为 ${raceData.name}！\n返还 ${totalRefundSP} 点技能点。`,
        duration: 3000,
        background: '#7c3aed'
      });
    }
  }

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

    const final = Math.round(tdee + adjustment);
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
      updateWeight(user.weight);
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

  function updateWeight(
    newWeight: number,
    options?: {
      bmi?: number;
      bodyFatRate?: number;
      note?: string;
    }
  ): void {
    if (newWeight <= 0) return;
    user.weight = newWeight;

    if (user.targetConfig?.mode === 'AUTO' || !user.targetConfig) {
      recalcBMR();
    }

    if (!user.weightHistory) user.weightHistory = [];

    const today = getLocalDateStr();
    const timestamp = new Date().toISOString();
    const history = [...user.weightHistory];
    const existingIdx = history.findIndex(r => r.date === today);

    const bmi = options?.bmi || (user.height > 0
      ? newWeight / Math.pow(user.height / 100, 2)
      : undefined);

    const record: import('@/types').WeightRecord = {
      date: today,
      weight: newWeight,
      timestamp,
      ...(bmi && { bmi: parseFloat(bmi.toFixed(1)) }),
      ...(options?.bodyFatRate && { bodyFatRate: options.bodyFatRate }),
      ...(options?.note && { note: options.note })
    };

    if (existingIdx !== -1) {
      history[existingIdx] = record;
    } else {
      history.push(record);
    }

    if (history.length > 365) {
      history.shift();
    }

    user.weightHistory = [...history];
  }

  function addExp(amount: number, source: string = '战斗经验', type: import('@/types').TransactionType = 'BATTLE_REWARD'): void {
    if (user.level >= MAX_LEVEL) return;

    const safeAmount = Number.isNaN(amount) ? 0 : amount;
    const levelScaler = 1 + (user.level * 0.05);
    // [Fix] 使用新的 expRate 计算，包含技能加成
    const realAmount = Math.floor(safeAmount * passiveBonuses.value.expRate * levelScaler);
    user.currentExp += realAmount;

    logTransaction(type, 'EXP', realAmount, source);

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
    const newLearnedSkills = { ...user.learnedSkills };
    newLearnedSkills[node.id] = currentLv + 1;
    user.learnedSkills = newLearnedSkills;

    showToast(`✨ ${node.name} 升级成功！(Lv.${currentLv + 1})`);
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

  function heal(amount: number): void {
    let safeAmount = Number.isNaN(amount) ? 0 : amount;

    // 应用治疗加成
    if (safeAmount > 0) {
      safeAmount = Math.floor(safeAmount * (1 + passiveBonuses.value.healMult));
    }

    const max = realMaxHp.value;
    const deficit = Math.max(0, max - user.heroCurrentHp);

    if (safeAmount > deficit) {
      user.heroCurrentHp = max;
      const overflow = safeAmount - deficit;
      addShield(overflow);
    } else {
      user.heroCurrentHp += safeAmount;
    }
  }

  function addShield(amount: number): void {
    const safeAmount = Number.isNaN(amount) ? 0 : amount;
    if (!user.heroShield) user.heroShield = 0;
    user.heroShield += safeAmount;

    // 应用护盾上限加成 (如有)
    const shieldCap = realMaxHp.value * (1 + passiveBonuses.value.shieldDmgRate * 0.1); // 暂时假设盾转攻天赋也稍微加点盾上限，或者这里使用独立的 shield_cap
    if (user.heroShield > shieldCap) user.heroShield = shieldCap;
  }

  function damage(amount: number): void {
    let safeAmount = Number.isNaN(amount) ? 0 : amount;

    // 应用固定减伤
    const reduce = passiveBonuses.value.dmgReduce;
    if (reduce > 0) {
      safeAmount = Math.max(0, safeAmount - reduce);
    }

    if (user.heroShield > 0) {
      if (user.heroShield >= safeAmount) {
        user.heroShield -= safeAmount;
        safeAmount = 0;
      } else {
        safeAmount -= user.heroShield;
        user.heroShield = 0;
      }
    }

    if (safeAmount > 0) {
      user.heroCurrentHp = Math.floor(Math.max(0, user.heroCurrentHp - safeAmount));
    }
  }

  function checkLoginStreak(): void {
    if (!user.isInitialized) return;

    const today = getLocalDateStr();
    const last = user.lastLoginDate;

    if (today === last) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    let streakMaintained = false;

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

    const yLogs = logStore.logs[yesterdayStr] || [];

    if (yLogs.length === 0) {
      if (streakMaintained) {
        if (last === yesterdayStr) user.loginStreak += 1;
      }
      user.heroShield = 0;
      if (!systemStore.isPureMode) {
        showNotify({ type: 'warning', message: `📅 新的一天！连击天数: ${user.loginStreak}`, duration: 2000 });
      }
      return;
    }

    if (streakMaintained && last === yesterdayStr) {
      user.loginStreak += 1;
    }

    user.heroShield = 0;

    const totalCals = yLogs.reduce((sum, l) => sum + (l.calories || 0), 0);
    const targetBMR = dailyTarget.value;

    let status: 'VICTORY' | 'DEFEAT' | 'DRAW' = 'DRAW';
    if (totalCals > targetBMR * 1.1) status = 'DEFEAT';
    else if (totalCals < targetBMR * 0.6) status = 'DEFEAT';
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

    const seed = yesterdayStr.split('').reduce((a, b, i) => a + (b.charCodeAt(0) * (i + 1)), 0);
    const monster = MONSTERS[seed % MONSTERS.length] || MONSTERS[0];

    if (monster) {
      addExp(expGained, `昨日结算-${monster.name}`, 'CHECKIN_BONUS');
      addGold(goldGained, `昨日结算-${monster.name}`, 'CHECKIN_BONUS');
    }
    recoverStamina(100);

    if (!systemStore.isPureMode) {
      // [物资清单] 提取昨日Top8记录（按热量排序）
      const topItems = yLogs
        .filter(log => log.mealType !== 'EXERCISE') // 排除运动记录
        .sort((a, b) => (b.calories || 0) - (a.calories || 0))
        .slice(0, 8)
        .map(log => ({
          name: log.name,
          icon: log.icon || '❓',
          calories: log.calories || 0,
          tags: log.tags || []
        }));

      // [运动记录] 提取运动记录
      const exerciseItems = yLogs
        .filter(log => log.mealType === 'EXERCISE')
        .sort((a, b) => (b.calories || 0) - (a.calories || 0))
        .slice(0, 4) // 最多显示4个运动记录
        .map(log => ({
          name: log.name,
          icon: log.icon || '🏃',
          calories: log.calories || 0,
          tags: log.tags || []
        }));

      // 合并食物和运动记录
      const allItems = [...topItems, ...exerciseItems];

      const report: DailyReportData = {
        date: yesterdayStr,
        totalCalories: totalCals,
        targetBMR: targetBMR,
        status,
        expGained,
        goldGained,
        monsterName: monster ? monster.name : '未知生物',
        loginStreak: user.loginStreak,
        items: allItems.length > 0 ? allItems : undefined
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

  watch(
    () => user,
    (newUser) => {
      try {
        const dataToSave = JSON.stringify(newUser);
        localStorage.setItem(STORAGE_KEY, dataToSave);
      } catch (error) {
        console.error('[Hero Store] 实时保存失败:', error);
      }
    },
    { deep: true }
  );

  function loadHeroData(externalData?: Partial<UserState>): void {
    try {
      const localData = localStorage.getItem(STORAGE_KEY);

      if (localData) {
        const parsed = JSON.parse(localData);
        Object.assign(user, parsed);
        console.log('[Hero Store] 已加载本地数据，技能点:', user.skillPoints, '已学技能:', user.learnedSkills);
      } else {
        if (externalData) {
          Object.assign(user, externalData);
        }
        console.log('[Hero Store] 新用户初始化');
      }

      if (user.skillPoints === undefined) {
        let spentPoints = 0;
        if (user.learnedSkills) {
          const currentTree = RACE_SKILL_TREES[user.race] || RACE_SKILL_TREES['HUMAN'];
          if (currentTree) {
            currentTree.forEach(node => {
              const level = user.learnedSkills[node.id] || 0;
              if (level > 0) {
                spentPoints += level * node.cost;
              }
            });
          }
        }

        const totalEarned = (user.level || 1) - 1;
        user.skillPoints = Math.max(0, totalEarned - spentPoints);
        console.log('[Hero Store] 补发技能点，总获得:', totalEarned, '已花费:', spentPoints, '剩余:', user.skillPoints);
      }

      if (!user.learnedSkills) user.learnedSkills = {};
      if (!user.transactionHistory) user.transactionHistory = [];
      if (!user.inventory) user.inventory = { 'item_rebirth_potion': 1 };

    } catch (error) {
      console.error('[Hero Store] 数据加载失败:', error);
      if (externalData) {
        Object.assign(user, externalData);
      }
    }
  }

  loadHeroData();

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
    useStamina,
    recoverStamina,
    revertXp,
    revertGold,
    logTransaction,
    loadHeroData,
    resetSkills,
    clearDebuffs,
    openBlindBox
  };
}, {
  persist: false
});
