import { defineStore } from 'pinia';
import { computed } from 'vue';
import { RACES } from '@/constants/gameData';
import { getCombatRank, debounce } from '@/utils/gameUtils';
import type { FoodItem, FoodLog, Achievement } from '@/types'; // 引入类型

import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore';
import { useBattleStore } from '@/stores/useBattleStore';
import { useCollectionStore } from '@/stores/useCollectionStore';

export const useGameStore = defineStore('game', () => {
  const system = useSystemStore();
  const hero = useHeroStore();
  const battle = useBattleStore();
  const collection = useCollectionStore();

  const heroStats = computed(() => {
    const { totalP, totalC, totalF } = battle.historyTotalMacros;
    const userData = hero.user;
    const race = RACES[userData.race] || RACES.HUMAN;
    const statCap = 50 + (userData.level * 20);

    const bonuses = hero.passiveBonuses;

    // 基础属性计算
    let rawStr = Math.floor(totalP / 70) + 10;
    let rawAgi = Math.floor(totalC / 180) + 10;
    let rawVit = Math.floor(totalF / 40) + 10;

    // 应用种族和被动加成
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

    // [Fix 3.2] 数值压缩算法
    // 原公式: (Exp * 0.5) + (Level * 50) + ... -> 线性叠加导致 EXP 权重过大
    // 新公式: 基础 + (等级 * 权重) + (属性总和 * 权重) + (装备) + (经验值的对数加成)
    // 这里的 Math.pow(exp, 0.45) 确保经验值依然有贡献，但不会导致几百万战力
    const expContribution = Math.floor(Math.pow(userData.currentExp, 0.45) * 5);
    const levelContribution = userData.level * 100; // 提高等级权重
    const statContribution = (rawStr + rawAgi + rawVit) * 8; // 属性权重

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
      const stateToSave = {
        user: hero.user,
        logs: battle.logs,
        achievements: collection.achievements,
        foodDb: collection.foodDb,
        isDarkMode: system.isDarkMode,
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
        const data = JSON.parse(saved);
        if (data.user) {
          Object.assign(hero.user, data.user);
          if (!hero.user.skillPoints) hero.user.skillPoints = 0;
          if (!hero.user.learnedSkills) hero.user.learnedSkills = {};
        }

        if (data.logs) Object.assign(battle.logs, data.logs);
        battle.recalculateGlobalStats();

        if (data.isDarkMode !== undefined) system.isDarkMode = data.isDarkMode;

        if (data.activeQuests) collection.quests = data.activeQuests;
        if (data.questPoolDay) collection.questPoolDay = data.questPoolDay;

        let loadedFood = false;
        if (data.foodDb && Array.isArray(data.foodDb) && data.foodDb.length > 0) {
          collection.foodDb = data.foodDb;
          loadedFood = true;
        }

        if (!loadedFood || !collection.foodDb || collection.foodDb.length === 0) {
          console.warn('[GameStore] FoodDB empty/invalid, forcing init...');
          collection.initFoodDb(hero.user.race || 'HUMAN', true);
        } else {
          collection.initFoodDb(hero.user.race || 'HUMAN', false);
        }

        if (data.achievements) {
          data.achievements.forEach((oldAch: any) => {
            const e = collection.achievements.find(a => a.id === oldAch.id);
            if (e) e.unlocked = oldAch.unlocked;
          });
        }

        if (hero.user.isInitialized) {
          system.modals.onboarding = false;
        }

      } catch (e) {
        console.error('Save parse error', e);
        collection.initFoodDb(hero.user.race || 'HUMAN', true);
      }
    } else {
      collection.initFoodDb(hero.user.race || 'HUMAN', true);
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

    logs: computed(() => battle.logs),
    todayLogs: computed(() => battle.todayLogs),
    logsReverse: computed(() => battle.logsReverse),

    todayMacros: computed(() => battle.todayMacros),
    weeklyStats: computed(() => battle.weeklyStats),
    historyTotalMacros: computed(() => battle.historyTotalMacros),
    stageInfo: computed(() => battle.stageInfo),
    comboState: computed(() => battle.comboState),

    setModal: system.setModal,
    triggerShake: system.triggerShake,
    recalcBMR: hero.recalcBMR,
    updateWeight: hero.updateWeight,
    saveToDb: collection.saveToFoodDb,

    refreshQuestHall: collection.refreshQuestHall,
    acceptQuest: collection.acceptQuest,
    claimQuest: collection.claimQuest,

    // [Fix 3.3] 为参数添加具体类型
    commitLog: (item: FoodLog) => { battle.commitLog(item); saveState(); },
    deleteLog: (log: FoodLog) => { battle.deleteLog(log); saveState(); },
    battleCommit: (item: FoodItem) => { battle.battleCommit(item); saveState(); },

    saveState,
    forceSave,
    loadState,
    initUser,
    equipItem: (item: Achievement) => { hero.user.equipped[item.slot] = item.id; saveState(); },
    getExportData: () => { _performSave(); return JSON.parse(localStorage.getItem('health_rpg_save_v2') || '{}'); },
    importSaveDataObj: (data: any) => { localStorage.setItem('health_rpg_save_v2', JSON.stringify(data)); loadState(); return true; }
  };
});
