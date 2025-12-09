import { defineStore } from 'pinia';
import { ref, toRaw } from 'vue';
import type { Achievement, Quest, FoodItem } from '@/types';
import { RACE_DEFAULT_FOODS, QUEST_POOL } from '@/constants/gameData';
import { useSystemStore } from './useSystemStore';
import { showToast } from 'vant';

// V2.9: 扩充成就列表 (使用中文逻辑)
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  // 新手村
  { id: 1, name: "初出茅庐", desc: "完成首次食物记录", condition: "记录 1 次食物", icon: "🗡️", unlocked: false, reward: "训练剑", slot: "WEAPON", rarity: "common", flavor: "你的冒险开始了。", stats: "攻击 +5", combatPower: 10, bonusBMR: 0 },
  { id: 2, name: "肉食主义", desc: "单日蛋白质摄入超100g", condition: "蛋白质 > 100g", icon: "🍖", unlocked: false, reward: "蛮族护腕", slot: "OFFHAND", rarity: "rare", flavor: "力量涌入体内！", stats: "格挡 +10", combatPower: 30, bonusBMR: 0 },
  { id: 3, name: "素食主义", desc: "单日蔬菜摄入超300g", condition: "蔬菜 > 300g", icon: "🥦", unlocked: false, reward: "精灵披风", slot: "BACK", rarity: "epic", flavor: "轻盈如风。", stats: "闪避 +5%", combatPower: 40, bonusBMR: 20 },

  // 进阶成就
  { id: 4, name: "控糖大师", desc: "连续3天没有摄入高糖食物", condition: "无高糖记录", icon: "🦷", unlocked: false, reward: "纯净护符", slot: "ACCESSORY", rarity: "rare", flavor: "清心寡欲，方得始终。", stats: "全属性 +2", combatPower: 35, bonusBMR: 10 },
  { id: 5, name: "海量豪饮", desc: "单日饮水超过 2500ml (约8杯)", condition: "水 > 8次", icon: "🌊", unlocked: false, reward: "深渊水壶", slot: "OFFHAND", rarity: "rare", flavor: "水是生命之源。", stats: "生命 +50", combatPower: 30, bonusBMR: 30 },
  { id: 6, name: "热量燃烧", desc: "单日热量赤字达标 (摄入<目标)", condition: "热量 < BMR", icon: "🔥", unlocked: false, reward: "火焰行者长靴", slot: "LEGS", rarity: "epic", flavor: "燃烧吧，卡路里！", stats: "敏捷 +8", combatPower: 50, bonusBMR: 50 },

  // 史诗成就
  { id: 7, name: "营养均衡", desc: "同时摄入碳水、蛋白质、脂肪且比例适中", condition: "均衡标签记录", icon: "⚖️", unlocked: false, reward: "大贤者之冠", slot: "HEAD", rarity: "legendary", flavor: "万物皆有度。", stats: "全属性 +5%", combatPower: 100, bonusBMR: 80 },
  { id: 8, name: "连击之王", desc: "达成 10 连击", condition: "Combo >= 10", icon: "⚡", unlocked: false, reward: "风暴战甲", slot: "BODY", rarity: "legendary", flavor: "你的动作快如闪电。", stats: "闪避 +10%", combatPower: 120, bonusBMR: 60 }
];

export const useCollectionStore = defineStore('collection', () => {
  const systemStore = useSystemStore();

  const achievements = ref<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const foodDb = ref<FoodItem[]>([]);

  const quests = ref<Quest[]>([]);
  const questPoolDay = ref('');
  const availableQuests = ref<Quest[]>([]);

  function initFoodDb(race: string, force = false) {
    const safeRace = (race && RACE_DEFAULT_FOODS[race]) ? race : 'HUMAN';
    const isEmpty = !foodDb.value || foodDb.value.length === 0;

    if (!force && !isEmpty) return;

    const defaultFoods = RACE_DEFAULT_FOODS[safeRace];
    // 确保默认有数据
    if (!defaultFoods || defaultFoods.length === 0) {
      console.warn('Race foods missing, loading Human defaults');
      foodDb.value = RACE_DEFAULT_FOODS['HUMAN'].map((f, index) => ({
        ...f, id: Date.now() + index, usageCount: 0
      }));
      return;
    }

    foodDb.value = defaultFoods.map((f, index) => ({
      ...f,
      id: Date.now() + index + Math.random(),
      usageCount: 0
    }));
  }

  function saveToFoodDb(item: FoodItem) {
    if (!foodDb.value) foodDb.value = [];
    const targetId = item.id;
    const targetName = (item.name || '').trim();
    if (!targetName) return;

    let existingIdx = foodDb.value.findIndex(f => f.id === targetId);
    if (existingIdx === -1) {
      existingIdx = foodDb.value.findIndex(f => f.name === targetName);
    }

    if (existingIdx !== -1) {
      const existing = foodDb.value[existingIdx];
      existing.usageCount = (existing.usageCount || 0) + 1;
      // 合并标签
      if (item.tags && item.tags.length > 0) {
        const newTags = new Set([...(existing.tags || []), ...item.tags]);
        existing.tags = Array.from(newTags);
      }
    } else {
      const cleanItem = JSON.parse(JSON.stringify(toRaw(item)));
      cleanItem.id = Date.now() + Math.random();
      cleanItem.usageCount = 1;
      foodDb.value.unshift(cleanItem);
      if (foodDb.value.length > 300) foodDb.value = foodDb.value.slice(0, 300);
    }
  }

  function unlockAch(id: number) {
    const ach = achievements.value.find(a => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      systemStore.temp.unlockedAchievement = ach;
      systemStore.setModal('unlock', true);
      return true;
    }
    return false;
  }

  function refreshQuestHall() {
    const today = systemStore.currentDate;
    quests.value = quests.value.filter(q => q.status !== 'CLAIMED');
    const needsRefill = questPoolDay.value !== today || availableQuests.value.length === 0;

    if (needsRefill) {
      if (!QUEST_POOL || QUEST_POOL.length === 0) return;
      const currentQuestIds = new Set(quests.value.map(q => q.id));
      const candidates = QUEST_POOL.filter(q => !currentQuestIds.has(q.id));

      if (candidates.length === 0) return;

      // 抽取任务逻辑：权重？暂时随机
      const count = Math.min(candidates.length, 5);
      const newQuests = [...candidates]
        .sort(() => 0.5 - Math.random())
        .slice(0, count)
        .map(q => ({
          ...q,
          status: 'AVAILABLE' as const,
          current: 0
        }));

      // @ts-ignore
      availableQuests.value = newQuests;
      questPoolDay.value = today;
    }
  }

  function acceptQuest(questId: string) {
    if (quests.value.length >= 4) {
      showToast('任务栏已满 (4/4)');
      return;
    }
    const idx = availableQuests.value.findIndex(q => q.id === questId);
    if (idx !== -1) {
      const quest = availableQuests.value[idx];
      quest.status = 'ACCEPTED';
      quests.value.push(quest);
      availableQuests.value.splice(idx, 1);
      showToast('⚔️ 接取成功！');
    }
  }

  // [Fix: Chinese Tag Logic] 适配中文标签
  function checkDailyQuests(log: any) {
    let updated = false;
    quests.value.forEach(q => {
      if (q.status !== 'ACCEPTED') return;

      if (q.type === 'COUNT') q.current += 1;
      if (q.type === 'PROTEIN') q.current += (log.p || 0);

      // 中文标签判定
      if (q.type === 'VEG' && (log.category === 'VEG' || log.tags?.includes('纯净'))) q.current += 1;
      if (q.type === 'WATER' && (log.category === 'DRINK' || log.name.includes('水'))) q.current += 1;

      // 反向任务逻辑 (避开特定标签)
      if (q.type === 'LOW_CARB') {
        if (log.tags?.includes('高糖')) q.current = -99; // 惩罚
        else if ((log.c || 0) < 20) q.current += 1;
      }
      if (q.type === 'LOW_FAT') {
        if (log.tags?.includes('高油')) q.current = -99;
        else if ((log.f || 0) < 10) q.current += 1;
      }
      if (q.type === 'CALORIE_CONTROL') q.current += (log.calories || 0);

      if (q.current < 0) q.current = 0;

      if (q.current >= q.target) {
        q.current = q.target;
        q.status = 'COMPLETED';
        showToast(`✅ 委托完成：${q.title}`);
        updated = true;
      }
    });
    return updated;
  }

  function claimQuest(questId: string) {
    const q = quests.value.find(q => q.id === questId);
    if (q && q.status === 'COMPLETED') {
      q.status = 'CLAIMED';
      return q.rewardExp;
    }
    return 0;
  }

  return {
    achievements, foodDb, quests, availableQuests, questPoolDay,
    initFoodDb, saveToFoodDb, unlockAch,
    refreshQuestHall, acceptQuest, checkDailyQuests, claimQuest
  };
});
