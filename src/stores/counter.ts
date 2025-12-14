import { defineStore } from 'pinia';
import { computed } from 'vue';
import { RACES } from '@/constants/gameData';
import { getCombatRank, debounce } from '@/utils/gameUtils';
import type { FoodItem, FoodLog, Achievement, MealType, UserState } from '@/types';

import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore';
import { useBattleStore } from '@/stores/useBattleStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useLogStore } from '@/stores/useLogStore';

// 定义存档数据的接口，确保类型安全
interface SaveData {
  user?: Partial<UserState>;
  logs?: Record<string, FoodLog[]>;
  achievements?: Achievement[];
  foodDb?: FoodItem[];
  isDarkMode?: boolean;
  isPureMode?: boolean;
  activeQuests?: any[];
  questPoolDay?: string;
}

export const useGameStore = defineStore('game', () => {
  const system = useSystemStore();
  const hero = useHeroStore();
  const battle = useBattleStore();
  const collection = useCollectionStore();
  const logStore = useLogStore();

  const heroStats = computed(() => {
    const { totalP, totalC, totalF } = logStore.historyTotalMacros;
    const userData = hero.user;
    const race = RACES[userData.race] || RACES.HUMAN;
    const statCap = 50 + (userData.level * 20);

    const bonuses = hero.passiveBonuses;

    let rawStr = Math.floor(totalP / 70) + 10;
    let rawAgi = Math.floor(totalC / 180) + 10;
    let rawVit = Math.floor(totalF / 40) + 10;

    rawStr = Math.floor(rawStr * (race?.growth?.str || 1) * (1 + bonuses.statMult.str));
    rawAgi = Math.floor(rawAgi * (race?.growth?.agi || 1) * (1 + bonuses.statMult.agi));
    rawVit = Math.floor(rawVit * (race?.growth?.vit || 1) * (1 + bonuses.statMult.vit));

    let gearPower = 0;
    Object.values(userData.equipped).forEach(id => {
      if(id) {
        const it = collection.achievements.find(a => a.id === id);
        if(it && it.combatPower) gearPower += it.combatPower;
      }
    });

    const maxHp = 200 + (rawVit * 10);
    const blockValue = Math.floor(rawStr * 0.8);
    const dodgeChance = Math.min(rawAgi * 0.003, 0.60);

    const expContribution = Math.floor(Math.pow(userData.currentExp, 0.45) * 5);
    const levelContribution = userData.level * 100;
    const statContribution = (rawStr + rawAgi + rawVit) * 8;

    const combatPower = Math.floor(
      levelContribution +
      statContribution +
      gearPower +
      expContribution
    );

    const rank = getCombatRank(combatPower);

    return {
      str: Math.min(rawStr, statCap),
      agi: Math.min(rawAgi, statCap),
      vit: Math.min(rawVit, statCap),
      maxStat: statCap, rawStr, rawAgi, rawVit,
      combatPower, maxHp, blockValue, dodgeChance,
      raceName: race?.name || '人类', raceIcon: race?.icon || '👤',
      rankTitle: rank.title, rankColor: rank.color, rankIcon: rank.icon
    };
  });

  const _performSave = () => {
    try {
      const stateToSave: SaveData = {
        user: hero.user,
        logs: logStore.logs,
        achievements: collection.achievements,
        foodDb: collection.foodDb,
        isDarkMode: system.isDarkMode,
        isPureMode: system.isPureMode,
        activeQuests: collection.quests,
        questPoolDay: collection.questPoolDay
      };
      localStorage.setItem('health_rpg_save_v2', JSON.stringify(stateToSave));
    } catch (e) { console.error("Save failed:", e); }
  };

  const saveState = debounce(_performSave, 1000);
  const forceSave = () => _performSave();

  function loadState() {
    const saved = localStorage.getItem('health_rpg_save_v2');
    if (saved) {
      try {
        const data = JSON.parse(saved) as SaveData;

        if (data && typeof data === 'object') {
          if (data.user) {
            Object.assign(hero.user, data.user);
            if (!hero.user.skillPoints) hero.user.skillPoints = 0;
            if (!hero.user.learnedSkills) hero.user.learnedSkills = {};

            // [V4.0 Fix] 兼容旧存档：初始化金币和背包
            if (hero.user.gold === undefined) hero.user.gold = 0;
            if (!hero.user.inventory) hero.user.inventory = { 'item_rebirth_potion': 1 };

            // [V4.1 Fix] 兼容旧存档：初始化喝水数据
            if (!hero.user.hydration) {
              hero.user.hydration = {
                dailyTargetCups: 8,
                cupSizeMl: 250,
                reminderInterval: 60,
                enableNotifications: false
              };
            }
          }

          if (data.logs) Object.assign(logStore.logs, data.logs);
          logStore.recalculateGlobalStats();

          if (data.isDarkMode !== undefined) system.isDarkMode = !!data.isDarkMode;
          if (data.isPureMode !== undefined) system.isPureMode = !!data.isPureMode;

          if (data.activeQuests) collection.quests = data.activeQuests;
          if (data.questPoolDay) collection.questPoolDay = data.questPoolDay;

          let loadedFood = false;
          if (data.foodDb && Array.isArray(data.foodDb) && data.foodDb.length > 0) {
            collection.foodDb = data.foodDb;
            loadedFood = true;
          }

          if (!loadedFood || !collection.foodDb || collection.foodDb.length === 0) {
            collection.initFoodDb(hero.user.race || 'HUMAN', true);
          } else {
            // 确保即使有数据，也检查是否有缺失的默认数据
            collection.initFoodDb(hero.user.race || 'HUMAN', false);
          }

          if (data.achievements) {
            data.achievements.forEach((oldAch: Achievement) => {
              const e = collection.achievements.find(a => a.id === oldAch.id);
              if (e) e.unlocked = !!oldAch.unlocked;
            });
          }
        }

        if (hero.user.isInitialized) {
          system.modals.onboarding = false;
        } else {
          system.modals.onboarding = true;
        }

      } catch (e) {
        console.error('Save parse error', e);
        collection.initFoodDb(hero.user.race || 'HUMAN', true);
        hero.user.isInitialized = false;
        system.modals.onboarding = true;
      }
    } else {
      collection.initFoodDb(hero.user.race || 'HUMAN', true);
      hero.user.isInitialized = false;
      system.modals.onboarding = true;
    }
  }

  function initUser(formData: any) {
    hero.initUser(formData);
    collection.initFoodDb(hero.user.race || 'HUMAN', true);
    system.setModal('onboarding', false);
    forceSave();
  }

  return {
    isDarkMode: computed({ get: () => system.isDarkMode, set: (v) => system.isDarkMode = v }),
    isPureMode: computed({ get: () => system.isPureMode, set: (v) => system.isPureMode = v }),
    currentDate: computed({ get: () => system.currentDate, set: (v) => system.currentDate = v }),
    analysisRefDate: computed({ get: () => system.analysisRefDate, set: (v) => system.analysisRefDate = v }),

    modals: system.modals,
    temp: system.temp,
    user: hero.user,
    heroStore: hero,
    dailyTarget: hero.dailyTarget,
    heroStats,

    achievements: computed(() => collection.achievements),
    foodDb: computed(() => collection.foodDb),

    userQuests: computed(() => collection.quests),
    availableQuests: computed(() => collection.availableQuests),

    logs: computed(() => logStore.logs),
    todayLogs: computed(() => logStore.todayLogs),
    logsReverse: computed(() => logStore.logsReverse),
    todayMacros: computed(() => logStore.todayMacros),
    historyTotalMacros: computed(() => logStore.historyTotalMacros),

    weeklyStats: computed(() => battle.weeklyStats),
    stageInfo: computed(() => battle.stageInfo),
    comboState: computed(() => battle.comboState),
    environment: computed(() => battle.environment),
    todayDamage: computed(() => logStore.todayDamage),

    setModal: system.setModal,
    triggerShake: system.triggerShake,
    recalcBMR: hero.recalcBMR,
    updateWeight: hero.updateWeight,
    saveToDb: collection.saveToFoodDb,

    refreshQuestHall: collection.refreshQuestHall,
    acceptQuest: collection.acceptQuest,
    claimQuest: collection.claimQuest,

    // [Fix] 透传 optional mealType
    commitLog: (item: FoodItem, mealType?: MealType) => { battle.battleCommit(item, mealType); saveState(); },
    deleteLog: (log: FoodLog) => { battle.deleteLog(log); saveState(); },
    battleCommit: (item: FoodItem, mealType?: MealType) => { battle.battleCommit(item, mealType); saveState(); },

    saveState,
    forceSave,
    loadState,
    initUser,
    equipItem: (item: Achievement) => { hero.user.equipped[item.slot] = item.id; saveState(); },
    getExportData: () => { _performSave(); return JSON.parse(localStorage.getItem('health_rpg_save_v2') || '{}'); },
    importSaveDataObj: (data: any) => { localStorage.setItem('health_rpg_save_v2', JSON.stringify(data)); loadState(); return true; }
  };
});
