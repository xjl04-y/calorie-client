import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import type { UserState, InitUserForm } from '@/types';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { getLocalDateStr } from '@/utils/dateUtils';
import { RACES, RACE_SKILL_TREES } from '@/constants/gameData';
import { showToast, showNotify } from 'vant';

export const useHeroStore = defineStore('hero', () => {
  const systemStore = useSystemStore();
  const collectionStore = useCollectionStore();

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
    lastLoginDate: getLocalDateStr()
  });

  // --- Getters ---
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
          if (node.effectParams.target === 'str_mult') statMult.str += node.effectParams.base + (level - 1) * node.effectParams.scale;
          if (node.effectParams.target === 'agi_mult') statMult.agi += node.effectParams.base + (level - 1) * node.effectParams.scale;
          if (node.effectParams.target === 'vit_mult') statMult.vit += node.effectParams.base + (level - 1) * node.effectParams.scale;
          if (node.effectParams.target === 'exp_rate') expRate += node.effectParams.base + (level - 1) * node.effectParams.scale;
          if (node.effectParams.target === 'all_stat') {
            const val = node.effectParams.base + (level - 1) * node.effectParams.scale;
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
    const realAmount = Math.floor(amount * passiveBonuses.value.expRate);
    user.currentExp += realAmount;

    let leveledUp = false;
    while (user.currentExp >= user.nextLevelExp) {
      user.currentExp -= user.nextLevelExp;
      user.level++;

      // PM Fix: 升级难度调整，防止数值膨胀
      // 旧公式: nextLevelExp * 1.5
      // 新公式: 基础100 * (等级^2.2)，后期更难升级
      user.nextLevelExp = Math.floor(100 * Math.pow(user.level, 2.2));

      user.skillPoints += 1;
      leveledUp = true;
    }

    if (leveledUp) {
      systemStore.setModal('levelUp', true);
      // PM Fix: 升级不再回满血，只回复 20%
      const healAmount = Math.floor(user.heroMaxHp * 0.2);
      heal(healAmount);
      setTimeout(() => {
        showToast(`升级奖励：HP 恢复 ${healAmount} (未满)`);
      }, 1000);
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
    user.heroCurrentHp += amount;
    // 实际上限 clamp 逻辑通常在 store 外部或 computed 中处理显示，
    // 但为了数据一致性，这里最好也 clamp。不过 heroMaxHp 是 computed 出来的，这里无法直接获取最新 maxHp
    // 暂且允许溢出一点，会在下次 update 或 UI 显示时被 clamp
  }

  function damage(amount: number) {
    user.heroCurrentHp = Math.floor(Math.max(0, user.heroCurrentHp - amount));
  }

  function checkLoginStreak() {
    if (!user.isInitialized) return;

    const today = getLocalDateStr();
    const last = user.lastLoginDate;

    if (today === last) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    if (last === yesterdayStr) {
      user.loginStreak += 1;
      showNotify({ type: 'primary', message: `🔥 连续签到 ${user.loginStreak} 天！经验获取提升！`, duration: 3000 });
    } else {
      user.loginStreak = 1;
      showNotify({ type: 'warning', message: '📅 欢迎回来！新的冒险开始了！', duration: 2000 });
    }
    user.lastLoginDate = today;
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
    upgradeSkill,
    activateSkill,
    consumeSkillEffect,
    heal,
    damage,
    updateWeight,
    checkLoginStreak
  };
});
