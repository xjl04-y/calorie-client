import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import type { UserState, InitUserForm, RaceType, DailyReportData } from '@/types';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useLogStore } from '@/stores/useLogStore'; // [New] Need log access
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
    equipped: { HEAD: null, BODY: null, LEGS: null, WEAPON: null, OFFHAND: null, BACK: null, ACCESSORY: null },
    weightHistory: [],
    skillPoints: 0,
    learnedSkills: {},
    activeSkillId: null,
    activeSkillCd: 0,
    loginStreak: 1,
    lastLoginDate: getLocalDateStr(),
    // [V4.0] 初始资金与背包
    gold: 0,
    inventory: { 'item_rebirth_potion': 1 },
    // [New V4.1] 喝水初始配置
    hydration: {
      dailyTargetCups: 8,
      cupSizeMl: 250,
      reminderInterval: 60,
      enableNotifications: false
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

  const dailyTarget = computed(() => {
    let bonus = 0;
    Object.values(user.equipped).forEach(itemId => {
      if (itemId) {
        const item = collectionStore.achievements.find(a => a.id === itemId);
        if (item && item.bonusBMR) bonus += item.bonusBMR;
      }
    });
    bonus += passiveBonuses.value.bmrBonus;
    return Math.round(user.baseBMR + bonus);
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

  // [New V4.0] 增加金币
  function addGold(amount: number) {
    if (!amount || amount <= 0) return;
    if (!user.gold) user.gold = 0;
    user.gold += Math.floor(amount);
  }

  // [New V4.0] 购买物品
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

  // [New V4.0] 消耗物品
  function consumeItem(itemId: string, count = 1) {
    if (!user.inventory || !user.inventory[itemId] || user.inventory[itemId] < count) return false;
    user.inventory[itemId] -= count;
    if (user.inventory[itemId] <= 0) delete user.inventory[itemId];
    return true;
  }

  // [New V4.0] 核心转生逻辑
  function rebirth(newRace: RaceType) {
    // 1. 消耗药水
    if (!consumeItem('item_rebirth_potion')) {
      showToast('缺少转生药水');
      return;
    }

    // 2. 计算返还的 SP
    // 遍历当前种族的技能树，检查已学习的技能
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

    // 3. 执行重置
    user.skillPoints += totalRefundSP;
    user.learnedSkills = {}; // 清空技能
    user.activeSkillId = null; // 清除激活状态
    user.activeSkillCd = 0;

    // 4. 切换种族
    user.race = newRace;

    // 5. 反馈
    systemStore.setModal('rebirth', false);
    showNotify({
      type: 'success',
      message: `✨ 转生成功！化身为${RACES[newRace].name}！\n返还 ${totalRefundSP} 点技能点。`,
      duration: 3000,
      background: '#7c3aed'
    });
  }

  function recalcBMR() {
    const s = user.gender === 'MALE' ? 5 : -161;
    const bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + s;
    user.baseBMR = Math.round(bmr * 1.375);
  }

  function initUser(formData: InitUserForm) {
    Object.assign(user, formData);
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

    // [New]
    user.hydration = {
      dailyTargetCups: 8,
      cupSizeMl: 250,
      reminderInterval: 60,
      enableNotifications: false
    };

    user.heroMaxHp = 200;
    user.heroCurrentHp = user.heroMaxHp;
    user.isInitialized = true;
  }

  function updateWeight(newWeight: number, isInit = false) {
    if (newWeight <= 0) return;
    user.weight = newWeight;
    recalcBMR();

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
        const healAmount = Math.floor(user.heroMaxHp * 0.2);
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
    user.heroCurrentHp = Math.min(user.heroMaxHp, user.heroCurrentHp + safeAmount);
  }

  function damage(amount: number) {
    const safeAmount = Number.isNaN(amount) ? 0 : amount;
    user.heroCurrentHp = Math.floor(Math.max(0, user.heroCurrentHp - safeAmount));
  }

  // [V4.2 Upgrade] 增强版登录检查：生成战报
  function checkLoginStreak() {
    if (!user.isInitialized) return;

    const today = getLocalDateStr();
    const last = user.lastLoginDate;

    if (today === last) return; // 还是今天，不处理

    // 计算昨天的日期字符串
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    // 只有当上次登录正好是昨天（连续），或者上次登录早于昨天（断签），都需要结算昨天的战斗（如果昨天有数据的话）
    // 为了简化逻辑：只要是跨天第一次打开，我们都尝试结算“最近一个活跃日”的战报，或者仅仅结算昨天
    // PM决定：只结算严格意义上的“昨天”。如果昨天没登录没记录，则不算战斗。

    if (last === yesterdayStr) {
      // 连续登录
      user.loginStreak += 1;
    } else {
      // 断签，重置
      user.loginStreak = 1;
    }

    // 更新最后登录日期
    user.lastLoginDate = today;

    // --- 生成战报逻辑 ---
    // 1. 获取昨天的日志
    const yLogs = logStore.logs[yesterdayStr] || [];

    // 如果昨天完全没有记录，不弹出战报，只提示
    if (yLogs.length === 0) {
      if (!systemStore.isPureMode) {
        showNotify({ type: 'warning', message: `📅 新的一天！连击天数: ${user.loginStreak}`, duration: 2000 });
      }
      return;
    }

    // 2. 计算昨天的数据
    const totalCals = yLogs.reduce((sum, l) => sum + (l.calories || 0), 0);
    // 这里简化逻辑：用今天的 BMR 作为昨天的参考（因为 BMR 变化不大）
    const targetBMR = dailyTarget.value;

    let status: 'VICTORY' | 'DEFEAT' | 'DRAW' = 'DRAW';
    if (totalCals > targetBMR * 1.1) status = 'DEFEAT'; // 暴食
    else if (totalCals < targetBMR * 0.6) status = 'DEFEAT'; // 节食
    else status = 'VICTORY'; // 达标

    // 3. 计算奖励
    let expGained = 0;
    let goldGained = 0;

    if (status === 'VICTORY') {
      expGained = 100 + (user.loginStreak * 10);
      goldGained = 50 + (user.loginStreak * 5);
    } else {
      expGained = 20; // 安慰奖
      goldGained = 10;
    }

    // 4. 确定昨天的 Boss
    const seed = yesterdayStr.split('').reduce((a, b, i) => a + (b.charCodeAt(0) * (i + 1)), 0);
    const monster = MONSTERS[seed % MONSTERS.length] || MONSTERS[0];

    // 5. 发放奖励
    addExp(expGained);
    addGold(goldGained);

    // 6. 弹出战报 (仅 RPG 模式)
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
    checkLoginStreak
  };
});
