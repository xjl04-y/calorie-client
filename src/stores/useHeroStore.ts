import { defineStore } from 'pinia';
import { reactive, computed, watch } from 'vue'; // [Fix] Add watch
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
  const user = reactive<UserState>({
    isInitialized: false, level: 1, currentExp: 0, nextLevelExp: 100,
    baseBMR: 2000, nickname: '',
    avatarSeed: 'Felix', avatarType: 'SEED', customAvatar: '',
    race: 'HUMAN', gender: 'MALE',
    height: 170, weight: 65, age: 25,
    heroCurrentHp: 200, heroMaxHp: 200,
    heroShield: 0, // [New] 初始化
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
    // 初始化默认配置，防止 undefined
    targetConfig: {
      mode: 'AUTO',
      goal: 'MAINTAIN',
      activityLevel: 1.2
    }
  });

  const skillTree = computed(() => {
    return RACE_SKILL_TREES[user.race] || RACE_SKILL_TREES['HUMAN'];
  });

  const passiveBonuses = computed(() => {
    let bmrBonus = 0;
    let statMult = { str: 0, agi: 0, vit: 0 };
    let expRate = 1.0;

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

  // [Fix Bug] 内部计算真实 MaxHP，解决回血卡在 200 的问题
  // 逻辑复用自 counter.ts，确保 HeroStore 内部逻辑闭环
  const realMaxHp = computed(() => {
    const { totalF } = logStore.historyTotalMacros;
    const race = RACES[user.race] || RACES.HUMAN;
    const bonuses = passiveBonuses.value;

    // 计算体质 (VIT)
    let rawVit = Math.floor(totalF / 40) + 10;
    rawVit = Math.floor(rawVit * (race?.growth?.vit || 1) * (1 + bonuses.statMult.vit));

    // 属性上限限制
    const statCap = 50 + (user.level * 20);
    const finalVit = Math.min(rawVit, statCap);

    return 200 + (finalVit * 10);
  });

  // [Fix Bug] 监听并同步 MaxHP 到 state，确保外部(如BattleStore)读取 user.heroMaxHp 时也是正确的
  watch(realMaxHp, (val) => {
    user.heroMaxHp = val;
    // 确保当前血量不超过新上限（如果是降低上限的情况）
    if (user.heroCurrentHp > val) {
      user.heroCurrentHp = val;
    }
  }, { immediate: true });

  // Daily Target = BaseBMR + Equipment + Skill + EXERCISE
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

    // [Fix] 优先使用计算出的 baseBMR，只有当它异常小（比如 < 500）时才回退到 2000
    // 这样避免了默认值覆盖了用户的高 BMR 设置
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

  function addGold(amount: number) {
    if (!amount || amount <= 0) return;
    if (!user.gold) user.gold = 0;
    user.gold += Math.floor(amount);
  }

  function buyItem(itemId: string, price: number) {
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

  function consumeItem(itemId: string, count = 1) {
    if (!user.inventory || !user.inventory[itemId] || user.inventory[itemId] < count) return false;
    user.inventory[itemId] -= count;
    if (user.inventory[itemId] <= 0) delete user.inventory[itemId];
    return true;
  }

  function rebirth(newRace: RaceType) {
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

  // [Fix] 纯函数：计算推荐 BMR，增强类型转换安全性
  function _calculateRecommendedBMR(weight: number, height: number, age: number, gender: string, activityLevel: number, goal: string) {
    const w = Number(weight) || 60;
    const h = Number(height) || 170;
    const a = Number(age) || 25;
    const level = Number(activityLevel) || 1.2;

    // Mifflin-St Jeor 公式
    const s = gender === 'MALE' ? 5 : -161;
    const bmr = 10 * w + 6.25 * h - 5 * a + s;

    // TDEE
    const tdee = bmr * level;

    // Goal Adjustment
    let adjustment = 0;
    if (goal === 'LOSE') adjustment = -400;
    if (goal === 'GAIN') adjustment = 300;

    let final = Math.round(tdee + adjustment);

    // [PM Fix] 确保不出现 NaN，并设定最低阈值
    if (isNaN(final)) return 2000;
    return Math.max(1200, final);
  }

  // [Fix] 核心修复：应用 BMR 设置，并明确更新 user.baseBMR
  function recalcBMR() {
    // 1. 确保 targetConfig 存在
    if (!user.targetConfig) {
      user.targetConfig = { mode: 'AUTO', goal: 'MAINTAIN', activityLevel: 1.2 };
    }

    // 2. 手动模式：直接使用手动值
    // 强制转换为 String 进行比较，避免类型隐患
    if (String(user.targetConfig.mode) === 'MANUAL') {
      const manual = Number(user.targetConfig.manualBMR);
      // 只有当手动值有效时才应用
      if (manual && manual > 500 && !isNaN(manual)) {
        user.baseBMR = manual;
        // console.log('BMR Updated (Manual):', user.baseBMR);
      }
      return;
    }

    // 3. 自动模式：根据身体数据重新计算
    const w = Number(user.weight) || 60;
    const h = Number(user.height) || 170;
    const a = Number(user.age) || 25;
    const g = user.gender || 'MALE';
    const level = Number(user.targetConfig.activityLevel) || 1.2;
    const goal = user.targetConfig.goal || 'MAINTAIN';

    const recommended = _calculateRecommendedBMR(w, h, a, g, level, goal);
    user.baseBMR = recommended;
    // console.log('BMR Updated (Auto):', user.baseBMR);
  }

  // [Fix] 更新配置入口，增加反馈
  function updateTargetConfig(config: Partial<TargetConfig>) {
    if (!user.targetConfig) {
      user.targetConfig = { mode: 'AUTO', goal: 'MAINTAIN', activityLevel: 1.2 };
    }

    // 合并配置
    Object.assign(user.targetConfig, config);

    // 强制重算并应用
    recalcBMR();

    // 提示用户数值已更新
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
      // 纯净模式下也给个提示
      showToast(`目标热量已更新: ${user.baseBMR} kcal`);
    }
  }

  function initUser(formData: InitUserForm) {
    Object.assign(user, formData);

    // [Fix] 初始化时就根据填写的身体数据计算一次推荐值
    user.targetConfig = {
      mode: 'AUTO',
      goal: 'MAINTAIN',
      activityLevel: 1.2
    };

    if (user.weight > 0) {
      // 这会自动调用 recalcBMR
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
    user.heroShield = 0; // [New] 重置护盾
    user.isInitialized = true;
  }

  function updateWeight(newWeight: number, isInit = false) {
    if (newWeight <= 0) return;
    user.weight = newWeight;

    // [Fix] 只有在 AUTO 模式下，体重变化才会触发 BMR 自动更新
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

  // ... (其余方法保持不变)
  function addExp(amount: number) {
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
        // [Fix Bug] 使用计算后的 realMaxHp
        const healAmount = Math.floor(realMaxHp.value * 0.2);
        heal(healAmount);
        setTimeout(() => {
          showToast(`升级奖励：HP 恢复 ${healAmount}`);
        }, 1000);
      }
    }
  }

  function upgradeSkill(nodeId: string, combatPower: number) {
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

  function activateSkill() {
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

  function heal(amount: number) {
    const safeAmount = Number.isNaN(amount) ? 0 : amount;
    // [Fix Bug] 使用 computed realMaxHp 替代静态的 user.heroMaxHp
    user.heroCurrentHp = Math.min(realMaxHp.value, user.heroCurrentHp + safeAmount);
  }

  // [New] 增加护盾逻辑 (上限 = MaxHP)
  function addShield(amount: number) {
    const safeAmount = Number.isNaN(amount) ? 0 : amount;
    if (!user.heroShield) user.heroShield = 0;
    user.heroShield += safeAmount;

    // [Fix Bug] 护盾上限设定为最大生命值的 100% (使用 realMaxHp)
    const shieldCap = realMaxHp.value;
    if (user.heroShield > shieldCap) user.heroShield = shieldCap;
  }

  // [Modified] 伤害逻辑：优先扣除护盾
  function damage(amount: number) {
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

  function checkLoginStreak() {
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

      // [New] 每日重置：新的一天，护盾清零
      user.heroShield = 0;

      if (!systemStore.isPureMode) {
        showNotify({ type: 'warning', message: `📅 新的一天！连击天数: ${user.loginStreak}`, duration: 2000 });
      }
      return;
    }

    if (streakMaintained && last === yesterdayStr) {
      user.loginStreak += 1;
    }

    // [New] 结算重置：结算昨日数据后，护盾清零
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

    addExp(expGained);
    addGold(goldGained);

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

  function startFasting(startTime?: number, targetHours = 16) {
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

  function stopFasting() {
    user.fasting.isFasting = false;
    user.fasting.startTime = 0;
  }

  function updateFastingStartTime(time: number) {
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
    addShield, // Export
    realMaxHp // [New] Export computed MaxHP if needed externally
  };
});
