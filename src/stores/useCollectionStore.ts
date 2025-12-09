import { defineStore } from 'pinia';
import { ref, toRaw } from 'vue';
import type { Achievement } from '@/types';
import { RACE_DEFAULT_FOODS } from '@/constants/gameData';
import { useSystemStore } from './useSystemStore';
import { showToast } from 'vant';

// ... (Achievemnts 定义保持不变，略去以节省篇幅) ...
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 1, name: "初出茅庐", desc: "完成首次食物记录", condition: "记录 1 次食物", icon: "🗡️", unlocked: false, reward: "训练剑", slot: "WEAPON", rarity: "common", flavor: "你的冒险开始了。", stats: "攻击 +5", combatPower: 10, bonusBMR: 0 },
  { id: 2, name: "肉食主义", desc: "单日蛋白质 > 100g", condition: "蛋白质 > 100g", icon: "🍖", unlocked: false, reward: "猛兽护腕", slot: "OFFHAND", rarity: "rare", flavor: "充满了野性的力量。", stats: "格挡 +5", combatPower: 50, bonusBMR: 50 },
  { id: 3, name: "维他命卫士", desc: "记录蔬菜/水果 > 300g", condition: "蔬果 > 300g", icon: "🥦", unlocked: false, reward: "森林斗篷", slot: "BACK", rarity: "rare", flavor: "轻盈且充满生机。", stats: "闪避 +2%", combatPower: 30, bonusBMR: 0 },
  { id: 4, name: "鉴定大师", desc: "使用 5 次 AI 鉴定", condition: "鉴定 5 次", icon: "🔮", unlocked: false, reward: "真视之镜", slot: "HEAD", rarity: "epic", flavor: "看穿卡路里的本质。", stats: "智力 +5, 暴击 +5%", combatPower: 60, bonusBMR: 10 },
  { id: 5, name: "早起的鸟儿", desc: "9点前完成早餐记录", condition: "9点前早餐", icon: "🌅", unlocked: false, reward: "晨曦之靴", slot: "LEGS", rarity: "rare", flavor: "一日之计在于晨。", stats: "敏捷 +3", combatPower: 40, bonusBMR: 20 },
  { id: 6, name: "深夜食堂", desc: "21点后记录一份健康夜宵", condition: "21点后低卡", icon: "🌙", unlocked: false, reward: "暗影匕首", slot: "WEAPON", rarity: "epic", flavor: "在黑夜中也能保持自律。", stats: "暴击 +10%", combatPower: 55, bonusBMR: 0 },
  { id: 7, name: "营养均衡", desc: "碳水/蛋白/脂肪 比例均衡", condition: "P/C/F 均衡", icon: "⚖️", unlocked: false, reward: "武僧腰带", slot: "LEGS", rarity: "epic", flavor: "身心合一。", stats: "全属性 +2", combatPower: 70, bonusBMR: 30 },
  { id: 8, name: "盛宴", desc: "单次摄入 > 800kcal", condition: "大餐一顿", icon: "🍗", unlocked: false, reward: "巨人重甲", slot: "BODY", rarity: "legendary", flavor: "为了承受更多伤害。", stats: "生命 +200, 格挡 +10", combatPower: 100, bonusBMR: 200 },
  { id: 9, name: "水之主宰", desc: "记录 3 次饮水", condition: "饮水 >= 3", icon: "💧", unlocked: false, reward: "深蓝圣杯", slot: "ACCESSORY", rarity: "rare", flavor: "生命之源。", stats: "代谢 +5%", combatPower: 45, bonusBMR: 0 },
  { id: 10, name: "坚持不懈", desc: "连续 3 天记录", condition: "连续 3 天", icon: "🔥", unlocked: false, reward: "行者长裤", slot: "LEGS", rarity: "common", flavor: "路在脚下。", stats: "体质 +2", combatPower: 15, bonusBMR: 0 }
];

export interface DailyQuest {
  id: string;
  desc: string;
  target: number;
  current: number;
  completed: boolean;
  type: 'COUNT' | 'PROTEIN' | 'VEG' | 'WATER' | 'CALORIE_CONTROL';
  rewardExp: number;
}

export const useCollectionStore = defineStore('collection', () => {
  const systemStore = useSystemStore();

  const achievements = ref<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const foodDb = ref<any[]>([]);
  const dailyQuests = ref<DailyQuest[]>([]);
  const lastQuestDate = ref('');
  const questTemplate = ref<'BALANCED' | 'MUSCLE' | 'FAT_LOSS'>('BALANCED');

  function initFoodDb(race: string) {
    const defaultFoods = RACE_DEFAULT_FOODS[race] || RACE_DEFAULT_FOODS.HUMAN;
    const newFoods = (defaultFoods || []).map(f => ({ ...f, id: Date.now() + Math.random() }));
    const currentDb = Array.isArray(foodDb.value) ? foodDb.value : [];
    const newFoodNames = new Set(newFoods.map(f => f.name));
    const cleanCurrentDb = currentDb.filter(f => !newFoodNames.has(f.name));
    foodDb.value = [...newFoods, ...cleanCurrentDb];
  }

  function saveToFoodDb(item: any) {
    // 简化去重逻辑，直接推
    if (!Array.isArray(foodDb.value)) foodDb.value = [];
    // 检查是否已存在同名
    const exists = foodDb.value.some(f => f.name === item.name);
    if (!exists) {
      const cleanItem = JSON.parse(JSON.stringify(toRaw(item)));
      cleanItem.id = Date.now() + Math.random();
      cleanItem.usageCount = 1;
      foodDb.value.unshift(cleanItem);
      if (foodDb.value.length > 60) foodDb.value = foodDb.value.slice(0, 60);
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

  // --- V2.3: 任务生成逻辑更新 ---
  // 改名为 selectTemplateAndGenerate 以明确这是用户操作触发的
  function selectTemplateAndGenerate(template: 'BALANCED' | 'MUSCLE' | 'FAT_LOSS') {
    const today = systemStore.currentDate;
    questTemplate.value = template;

    let pool: DailyQuest[] = [];

    if (template === 'MUSCLE') {
      pool = [
        { id: 'm1', desc: '摄入 80g 蛋白质', target: 80, current: 0, completed: false, type: 'PROTEIN', rewardExp: 100 },
        { id: 'm2', desc: '记录 3 次肉类/蛋奶', target: 3, current: 0, completed: false, type: 'COUNT', rewardExp: 60 },
        { id: 'm3', desc: '热量达标 (摄入 > 2000)', target: 2000, current: 0, completed: false, type: 'CALORIE_CONTROL', rewardExp: 50 },
      ];
    } else if (template === 'FAT_LOSS') {
      pool = [
        { id: 'f1', desc: '吃 2 份蔬菜', target: 2, current: 0, completed: false, type: 'VEG', rewardExp: 60 },
        { id: 'f2', desc: '喝 3 杯水', target: 3, current: 0, completed: false, type: 'WATER', rewardExp: 40 },
        { id: 'f3', desc: '记录 1 次低碳饮食', target: 1, current: 0, completed: false, type: 'COUNT', rewardExp: 50 },
      ];
    } else { // BALANCED
      pool = [
        { id: 'b1', desc: '记录 3 次食物', target: 3, current: 0, completed: false, type: 'COUNT', rewardExp: 50 },
        { id: 'b2', desc: '摄入 60g 蛋白质', target: 60, current: 0, completed: false, type: 'PROTEIN', rewardExp: 70 },
        { id: 'b3', desc: '吃 1 份蔬菜/水果', target: 1, current: 0, completed: false, type: 'VEG', rewardExp: 40 },
      ];
    }

    const commonPool: DailyQuest[] = [
      { id: 'c1', desc: '使用 1 次 AI 鉴定', target: 1, current: 0, completed: false, type: 'COUNT', rewardExp: 30 },
      { id: 'c2', desc: '记录早餐', target: 1, current: 0, completed: false, type: 'COUNT', rewardExp: 30 },
    ];

    const combined = [...pool, ...commonPool];
    dailyQuests.value = combined.sort(() => 0.5 - Math.random()).slice(0, 3);
    lastQuestDate.value = today;
    showToast(`契约已签订！当前目标：${template === 'MUSCLE' ? '增肌' : (template === 'FAT_LOSS' ? '减脂' : '均衡')}`);
  }

  // 旧的 generate 方法，现在只作为 fallback
  function generateDailyQuests(force: boolean = false) {
    // 这里的逻辑可以保留，但 HomeView 不会主动调用它了，除非检测到今天还没选任务
  }

  function checkDailyQuests(log: any) {
    let updated = false;
    dailyQuests.value.forEach(q => {
      if (q.completed) return;

      if (q.type === 'COUNT') q.current += 1;
      if (q.type === 'PROTEIN') q.current += (log.p || 0);
      if (q.type === 'VEG' && (log.category === 'VEG' || log.tags?.includes('CLEAN'))) q.current += 1;
      if (q.type === 'WATER' && (log.category === 'DRINK' || log.name.includes('水'))) q.current += 1;

      if (q.current >= q.target) {
        q.current = q.target;
        q.completed = true;
        showToast(`任务完成：${q.desc}\n经验 +${q.rewardExp}`);
        updated = true;
      }
    });
    return updated;
  }

  return { achievements, foodDb, dailyQuests, lastQuestDate, questTemplate, initFoodDb, saveToFoodDb, unlockAch, generateDailyQuests, selectTemplateAndGenerate, checkDailyQuests };
});
