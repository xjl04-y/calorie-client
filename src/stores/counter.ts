import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import type { UserState, FoodLog, Achievement } from '@/types';
import { RACES, MONSTERS } from '@/constants/gameData.ts';
import { showToast } from 'vant';

// 辅助函数：获取当前日期 YYYY-MM-DD
const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useGameStore = defineStore('game', () => {
  // --- State ---
  const user = reactive<UserState>({
    isInitialized: false, level: 1, currentExp: 0, nextLevelExp: 100,
    baseBMR: 2000, nickname: '', avatarSeed: 'Felix', race: 'HUMAN',
    height: 170, weight: 65, age: 25,
    heroCurrentHp: 200, heroMaxHp: 200,
    equipped: { HEAD: null, BODY: null, LEGS: null, WEAPON: null, OFFHAND: null, BACK: null, ACCESSORY: null }
  });

  const isDarkMode = ref(true);
  const currentDate = ref(getLocalDateStr());
  const logs = reactive<Record<string, FoodLog[]>>({});
  const achievements = ref<Achievement[]>([]); // 此处应初始化默认成就列表
  const foodDb = ref<any[]>([]);

  // 临时状态 (UI State)
  const temp = reactive({
    activeMealType: 'SNACK' as const,
    pendingItem: null as any,
    basket: [] as any[],
    isBuilding: false,
    buildingName: '',
    isShaking: false,
    isDamaged: false,
    selectedLog: null as FoodLog | null,
    selectedItem: null as any,
    activeSlot: null as string | null,
    unlockedAchievement: null as Achievement | null,
    selectedHistoryDate: null as string | null
  });

  // 模态框状态管理
  const modals = reactive({
    addFood: false, quantity: false, levelUp: false, achievements: false,
    unlock: false, onboarding: true, itemDetail: false, equipmentSwap: false,
    historyDetail: false, logDetail: false, hpHistory: false
  });

  // --- Getters ---
  const todayLogs = computed(() => logs[currentDate.value] || []);

  const todayMacros = computed(() => {
    return todayLogs.value.reduce((acc, log) => ({
      cals: acc.cals + (log.calories || 0),
      p: acc.p + (log.p || 0),
      c: acc.c + (log.c || 0),
      f: acc.f + (log.f || 0)
    }), { cals: 0, p: 0, c: 0, f: 0 });
  });

  const heroStats = computed(() => {
    // 计算属性逻辑：基础属性 + 装备加成 + 种族修正
    let totalP = 0, totalC = 0, totalF = 0;
    Object.keys(logs).forEach(date => { logs[date].forEach(l => { totalP += l.p||0; totalC += l.c||0; totalF += l.f||0; }); });

    const race = RACES[user.race] || RACES.HUMAN;
    const lvl = user.level;
    const statCap = 50 + (lvl * 20);

    let rawStr = Math.floor(totalP / 70) + 10;
    let rawAgi = Math.floor(totalC / 180) + 10;
    let rawVit = Math.floor(totalF / 40) + 10;

    rawStr = Math.floor(rawStr * race.growth.str);
    rawAgi = Math.floor(rawAgi * race.growth.agi);
    rawVit = Math.floor(rawVit * race.growth.vit);

    // ... (省略部分计算细节，逻辑与原代码保持一致)

    const maxHp = 200 + (rawVit * 10);
    const blockValue = Math.floor(rawStr * 0.5);
    const dodgeChance = Math.min(rawAgi * 0.002, 0.5);
    const combatPower = Math.floor(user.currentExp * 1.5 + rawStr * 10 + rawAgi * 10 + rawVit * 10); // 简化计算演示

    return {
      str: Math.min(rawStr, statCap),
      agi: Math.min(rawAgi, statCap),
      vit: Math.min(rawVit, statCap),
      maxStat: statCap, rawStr, rawAgi, rawVit,
      combatPower, maxHp, blockValue, dodgeChance,
      raceName: race.name, raceIcon: race.icon
    };
  });

  const dailyTarget = computed(() => {
    // 计算 BMR + 装备加成
    let bonus = 0;
    // 遍历 equipped 查找 bonusBMR...
    return Math.round(user.baseBMR + bonus);
  });

  const stageInfo = computed(() => {
    // 战斗阶段逻辑：Minion -> Boss
    const target = dailyTarget.value;
    const consumed = todayMacros.value.cals;
    // ... (逻辑与原代码一致，计算当前是打小怪还是打BOSS)
    // 简化返回，实际迁移时需完整复制 stageInfo 逻辑
    return {
      isBoss: true,
      currentObj: { data: MONSTERS[0], maxHp: 1000 },
      currentHpRemaining: Math.max(0, 1000 - consumed),
      isOverloaded: consumed > target,
      isCleared: consumed >= target && consumed <= target * 1.1
    };
  });

  // --- Actions ---
  function setModal(key: keyof typeof modals, val: boolean) {
    modals[key] = val;
  }

  function initUser(formData: any) {
    Object.assign(user, formData);
    user.isInitialized = true;
    modals.onboarding = false;
    saveState();
    showToast(`欢迎来到健康乐园，${formData.nickname}！`);
  }

  function triggerShake() {
    temp.isShaking = true;
    temp.isDamaged = true;
    if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => { temp.isShaking = false; temp.isDamaged = false; }, 500);
  }

  function commitLog(logItem: any) {
    const dateKey = currentDate.value;
    if (!logs[dateKey]) logs[dateKey] = [];
    logs[dateKey].unshift({
      id: Date.now(),
      ...logItem,
      mealType: temp.activeMealType,
      timestamp: new Date().toISOString()
    });

    // 经验值处理
    addExp(logItem.isComposite ? 50 : 30);
    saveState();
  }

  function addExp(amount: number) {
    user.currentExp += amount;
    if (user.currentExp >= user.nextLevelExp) {
      user.level++;
      user.currentExp -= user.nextLevelExp;
      user.nextLevelExp = Math.floor(user.nextLevelExp * 1.2);
      modals.levelUp = true;
      user.heroCurrentHp = user.heroMaxHp; // 升级回血
    }
  }

  // 持久化
  function saveState() {
    localStorage.setItem('health_rpg_save_v2', JSON.stringify({ user, logs, achievements, foodDb, isDarkMode: isDarkMode.value }));
  }

  function loadState() {
    const saved = localStorage.getItem('health_rpg_save_v2');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.user) Object.assign(user, data.user);
      if (data.logs) Object.assign(logs, data.logs);
      // ... load others
    }
  }

  return {
    user, isDarkMode, currentDate, logs, achievements, foodDb, temp, modals,
    todayLogs, todayMacros, heroStats, dailyTarget, stageInfo,
    setModal, initUser, commitLog, saveState, loadState, triggerShake
  };
});
