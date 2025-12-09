import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import type { UserState } from '@/types';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { getLocalDateStr } from '@/utils/dateUtils'; // 引入日期工具

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
    // V2.1 Feature: Initialize empty history
    weightHistory: []
  });

  // --- Actions ---
  function recalcBMR() {
    const s = user.gender === 'MALE' ? 5 : -161;
    const bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + s;
    user.baseBMR = Math.round(bmr * 1.375);
  }

  function initUser(formData: any) {
    Object.assign(user, formData);
    // V2.1: 初始化时记录第一笔体重
    if (user.weight > 0) {
      updateWeight(user.weight, true);
    } else {
      recalcBMR();
    }

    user.heroMaxHp = 200;
    user.heroCurrentHp = user.heroMaxHp;
    user.isInitialized = true;
  }

  // V2.1 New Feature: 更新体重并记录历史
  function updateWeight(newWeight: number, isInit = false) {
    if (newWeight <= 0) return;

    user.weight = newWeight;
    recalcBMR();

    // 确保历史记录数组存在
    if (!user.weightHistory) user.weightHistory = [];

    const today = getLocalDateStr();
    const existingIdx = user.weightHistory.findIndex(r => r.date === today);

    if (existingIdx !== -1) {
      // 如果今天已经记录过，更新它
      user.weightHistory[existingIdx].weight = newWeight;
    } else {
      // 否则添加新记录
      user.weightHistory.push({ date: today, weight: newWeight });
      // 保持数组按日期排序 (简单优化：假设添加的总是今天，通常不需要重排，但为了严谨可以做)
      // user.weightHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // 限制历史记录长度，比如最近 365 条，避免 localstorage 膨胀
    if (user.weightHistory.length > 365) {
      user.weightHistory.shift();
    }
  }

  // 修复：使用 while 循环处理连续升级的情况
  function addExp(amount: number) {
    user.currentExp += amount;

    let leveledUp = false;
    // 只要当前经验大于升级所需，就持续升级
    while (user.currentExp >= user.nextLevelExp) {
      user.currentExp -= user.nextLevelExp;
      user.level++;
      // 每一级的经验需求增加 20%
      user.nextLevelExp = Math.floor(user.nextLevelExp * 1.2);
      leveledUp = true;
    }

    if (leveledUp) {
      systemStore.setModal('levelUp', true);
      // 升级回满血
      user.heroCurrentHp = user.heroMaxHp;
    }
  }

  function heal(amount: number) {
    user.heroCurrentHp = Math.min(200 + (user.level * 20), user.heroCurrentHp + amount);
  }

  // --- Getters ---
  const dailyTarget = computed(() => {
    let bonus = 0;
    Object.values(user.equipped).forEach(itemId => {
      if (itemId) {
        const item = collectionStore.achievements.find(a => a.id === itemId);
        if (item && item.bonusBMR) bonus += item.bonusBMR;
      }
    });
    return Math.round(user.baseBMR + bonus);
  });

  return { user, recalcBMR, initUser, addExp, heal, dailyTarget, updateWeight };
});
