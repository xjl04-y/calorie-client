import { defineStore } from 'pinia';
import { computed } from 'vue';
import { RACES } from '@/constants/gameData';
import { getLocalDateStr } from '@/utils/dateUtils';
import { encodeSaveData, decodeSaveData, getCombatRank } from '@/utils/gameUtils';

// 引入子 Stores
import { useSystemStore } from '@/stores/useSystemStore';
import { useHeroStore } from '@/stores/useHeroStore';
import { useBattleStore } from '@/stores/useBattleStore';
import { useCollectionStore } from '@/stores/useCollectionStore';

export const useGameStore = defineStore('game', () => {
  // 1. 初始化所有子 Store
  const system = useSystemStore();
  const hero = useHeroStore();
  const battle = useBattleStore();
  const collection = useCollectionStore();

  // 2. 暴露 State (通过 getter 或直接返回 reactive 对象)
  // 注意：在 Setup Store 中，直接返回 system.isDarkMode 即可保持响应式，
  // 无需在此处解构。外部组件使用 store.isDarkMode 时会自动解包。

  // Computed: 聚合英雄属性 (Performance Optimized)
  const heroStats = computed(() => {
    // 这里 battle.historyTotalMacros 已经是 O(1) 的缓存读取了
    const { totalP, totalC, totalF } = battle.historyTotalMacros;
    const userData = hero.user;
    const race = RACES[userData.race] || RACES.HUMAN;
    const statCap = 50 + (userData.level * 20);

    let rawStr = Math.floor(totalP / 70) + 10;
    let rawAgi = Math.floor(totalC / 180) + 10;
    let rawVit = Math.floor(totalF / 40) + 10;

    rawStr = Math.floor(rawStr * (race?.growth?.str || 1));
    rawAgi = Math.floor(rawAgi * (race?.growth?.agi || 1));
    rawVit = Math.floor(rawVit * (race?.growth?.vit || 1));

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

    const combatPower = Math.floor((userData.currentExp * 0.5) + (userData.level * 50) + (rawStr * 5) + (rawAgi * 5) + (rawVit * 5) + gearPower);
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

  function saveState() {
    try {
      const stateToSave = {
        user: hero.user,
        logs: battle.logs,
        achievements: collection.achievements,
        foodDb: collection.foodDb,
        isDarkMode: system.isDarkMode,
        guideStep: system.guideStep,
        dailyQuests: collection.dailyQuests,
        lastQuestDate: collection.lastQuestDate,
        questTemplate: collection.questTemplate
      };
      localStorage.setItem('health_rpg_save_v2', JSON.stringify(stateToSave));
    } catch (e) { console.error("Save failed:", e); }
  }

  function loadState() {
    const saved = localStorage.getItem('health_rpg_save_v2');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.user) Object.assign(hero.user, data.user);

        // V2.1 Migration Fix
        if (!hero.user.weightHistory) {
          hero.user.weightHistory = [];
        }
        if (hero.user.weightHistory.length === 0 && hero.user.weight > 0) {
          hero.user.weightHistory.push({
            date: getLocalDateStr(),
            weight: hero.user.weight
          });
        }

        if (data.logs) Object.assign(battle.logs, data.logs);
        // 重要：加载日志后，立即重算统计缓存
        battle.recalculateGlobalStats();

        if (data.isDarkMode !== undefined) system.isDarkMode = data.isDarkMode;
        if (data.guideStep !== undefined) system.guideStep = data.guideStep;

        if (data.dailyQuests) collection.dailyQuests = data.dailyQuests;
        if (data.lastQuestDate) collection.lastQuestDate = data.lastQuestDate;
        if (data.questTemplate) collection.questTemplate = data.questTemplate;

        if (data.foodDb && Array.isArray(data.foodDb)) {
          const uniqueMap = new Map();
          data.foodDb.forEach((item: any) => uniqueMap.set(item.name.trim(), item));
          collection.foodDb = Array.from(uniqueMap.values());
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
      } catch (e) { console.error('Failed to parse', e); }
    }
  }

  // V2.4 废弃旧的字符串导出，改为对象导出给 ProfileView 下载文件
  function getExportData() {
    saveState(); // 确保最新
    const rawJson = localStorage.getItem('health_rpg_save_v2');
    return rawJson ? JSON.parse(rawJson) : null;
  }

  // 保留旧方法以兼容
  function exportSaveData() {
    const data = getExportData();
    return data ? encodeSaveData(data) : '';
  }

  function importSaveDataObj(data: any) {
    try {
      if (!data.user || !data.logs) throw new Error('Invalid Save Data Structure');
      localStorage.setItem('health_rpg_save_v2', JSON.stringify(data));
      loadState();
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  // 兼容旧的 Base64 导入
  function importSaveData(encryptedStr: string) {
    try {
      const data = decodeSaveData(encryptedStr);
      if (!data) throw new Error('Decryption failed');
      return importSaveDataObj(data);
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }

  function initUser(formData: any) {
    hero.initUser(formData);
    collection.initFoodDb(hero.user.race);
    system.setModal('onboarding', false);
    system.setModal('npcGuide', true);
    saveState();
  }

  function equipItem(item: any) {
    // @ts-ignore
    hero.user.equipped[item.slot] = item.id;
    saveState();
  }

  return {
    // State Proxies (直接暴露 Refs)
    isDarkMode: computed({ get: () => system.isDarkMode, set: (v) => system.isDarkMode = v }),
    currentDate: computed({ get: () => system.currentDate, set: (v) => system.currentDate = v }),
    analysisRefDate: computed({ get: () => system.analysisRefDate, set: (v) => system.analysisRefDate = v }),
    modals: system.modals,
    temp: system.temp,
    guideStep: computed({ get: () => system.guideStep, set: (v) => system.guideStep = v }),

    // User & Stats
    user: hero.user,
    dailyTarget: hero.dailyTarget,
    heroStats,

    // Collection
    achievements: collection.achievements,
    foodDb: collection.foodDb,
    dailyQuests: collection.dailyQuests,
    questTemplate: computed(() => collection.questTemplate), // Readonly access via game store usually
    lastQuestDate: computed(() => collection.lastQuestDate),

    // Battle
    logs: battle.logs,
    todayLogs: battle.todayLogs,
    todayMacros: battle.todayMacros,
    logsReverse: battle.logsReverse,
    stageInfo: battle.stageInfo,
    weeklyStats: battle.weeklyStats,
    comboState: battle.comboState,

    // Actions
    setModal: system.setModal,
    triggerShake: system.triggerShake,
    recalcBMR: hero.recalcBMR,
    updateWeight: hero.updateWeight,
    saveToDb: collection.saveToFoodDb,
    unlockAch: collection.unlockAch,
    generateDailyQuests: collection.generateDailyQuests,
    selectTemplateAndGenerate: collection.selectTemplateAndGenerate,
    setQuestTemplate: collection.setQuestTemplate,
    checkAchievements: battle.checkAchievements,

    // Wrapped Actions
    commitLog: (item: any) => { battle.commitLog(item); saveState(); },
    deleteLog: (log: any) => { battle.deleteLog(log); saveState(); },
    battleCommit: (item: any) => { battle.battleCommit(item); saveState(); },

    // System Actions
    saveState,
    loadState,
    exportSaveData,
    importSaveData,
    getExportData, // New V2.4
    importSaveDataObj, // New V2.4
    initUser,
    equipItem
  };
});
