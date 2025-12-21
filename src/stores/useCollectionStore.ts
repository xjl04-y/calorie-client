import { defineStore } from 'pinia';
import { ref, toRaw } from 'vue';
import type { Achievement, Quest, FoodItem, FoodLog } from '@/types'; // Import FoodLog
import { RACE_DEFAULT_FOODS, QUEST_POOL } from '@/constants/gameData';
import { useSystemStore } from './useSystemStore';
import { useHeroStore } from './useHeroStore';
import { showToast } from 'vant';

// ... (Existing DEFAULT_ACHIEVEMENTS code) ...
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
  { id: 8, name: "连击之王", desc: "达成 10 连击", condition: "Combo >= 10", icon: "⚡", unlocked: false, reward: "风暴战甲", slot: "BODY", rarity: "legendary", flavor: "你的动作快如闪电。", stats: "闪避 +10%", combatPower: 120, bonusBMR: 60 },

  // [PM Add V6.0] 留存奖励
  { id: 9, name: "坚持不懈", desc: "连续登录 7 天", condition: "连续登录 >= 7", icon: "🗓️", unlocked: false, reward: "时光行者徽章", slot: "ACCESSORY", rarity: "epic", flavor: "时间是你最忠实的盟友。", stats: "全属性 +3%", combatPower: 80, bonusBMR: 30 },
  { id: 10, name: "传奇旅者", desc: "连续登录 30 天", condition: "连续登录 >= 30", icon: "🌟", unlocked: false, reward: "永恒之翼", slot: "BACK", rarity: "legendary", flavor: "你的传说将永远流传。", stats: "全属性 +10%", combatPower: 200, bonusBMR: 100 }
];

// [PM Feature] 扩充后的自定义任务模板
export const CUSTOM_QUEST_TEMPLATES = [
  // 基础类
  { type: 'WATER', title: '补水挑战', label: '饮水次数', desc: '记录饮水', unit: '次', icon: '💧', baseReward: 20, min: 1, max: 20, default: 5 },
  { type: 'VEG', title: '蔬菜达人', label: '蔬菜/纯净', desc: '摄入蔬菜', unit: '份', icon: '🥦', baseReward: 30, min: 1, max: 10, default: 3 },
  { type: 'COUNT', title: '自律打卡', label: '记录次数', desc: '饮食记录', unit: '次', icon: '📝', baseReward: 15, min: 1, max: 10, default: 3 },

  // 进阶类
  { type: 'PROTEIN', title: '蛋白冲刺', label: '蛋白质', desc: '摄入蛋白', unit: 'g', icon: '🥩', baseReward: 2, min: 10, max: 200, default: 60 },
  { type: 'CALORIE_CONTROL', title: '热量控制', label: '摄入上限', desc: '全天低于', unit: 'kcal', icon: '🔥', baseReward: 0.1, min: 1000, max: 3000, default: 1800 },

  // 挑战类
  { type: 'LOW_CARB', title: '低碳行动', label: '低碳餐数', desc: '低碳且无糖', unit: '餐', icon: '🥑', baseReward: 40, min: 1, max: 5, default: 2 },
  { type: 'LOW_FAT', title: '清淡饮食', label: '低脂餐数', desc: '低脂且无油', unit: '餐', icon: '🥗', baseReward: 40, min: 1, max: 5, default: 2 },
  { type: 'LOW_SUGAR', title: '戒糖挑战', label: '无糖餐数', desc: '无高糖食物', unit: '餐', icon: '🚫', baseReward: 45, min: 1, max: 5, default: 3 },
];

export const useCollectionStore = defineStore('collection', () => {
  const systemStore = useSystemStore();

  const achievements = ref<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const foodDb = ref<FoodItem[]>([]);

  const quests = ref<Quest[]>([]);
  const questPoolDay = ref('');
  const availableQuests = ref<Quest[]>([]);

  // ... (initFoodDb, saveToFoodDb, unlockAch, refreshQuestHall, acceptQuest remain unchanged) ...
  function initFoodDb(race: string, force = false) {
    const safeRace = (race && RACE_DEFAULT_FOODS[race]) ? race : 'HUMAN';
    const isEmpty = !foodDb.value || foodDb.value.length === 0;

    if (!force && !isEmpty) return;

    const defaultFoods = RACE_DEFAULT_FOODS[safeRace];
    if (!defaultFoods || defaultFoods.length === 0) {
      console.warn('Race foods missing, loading Human defaults');
      const humanFoods = RACE_DEFAULT_FOODS['HUMAN'];
      if (humanFoods && humanFoods.length > 0) {
        foodDb.value = humanFoods.map((f, index) => ({
          ...f, id: Date.now() + index, usageCount: 0
        }));
      }
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
      if (existing) {
        existing.usageCount = (existing.usageCount || 0) + 1;
        if (item.tags && item.tags.length > 0) {
          const newTags = new Set([...(existing.tags || []), ...item.tags]);
          existing.tags = Array.from(newTags);
        }
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

      const count = Math.min(candidates.length, 5);
      const newQuests: Quest[] = [...candidates]
        .sort(() => 0.5 - Math.random())
        .slice(0, count)
        .map(q => ({
          ...q,
          status: 'AVAILABLE',
          current: 0
        } as Quest));

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
      if (quest) {
        quest.status = 'ACCEPTED';
        quests.value.push(quest);
        availableQuests.value.splice(idx, 1);
        showToast('⚔️ 接取成功！');
      }
    }
  }

  // [PM Feature] 增强版自定义任务添加
  function addCustomQuest(type: string, target: number) {
    if (quests.value.length >= 4) {
      showToast('任务栏已满，请先完成或放弃现有任务');
      return false;
    }

    const template = CUSTOM_QUEST_TEMPLATES.find(t => t.type === type);
    if (!template) {
      showToast('未知任务类型');
      return false;
    }

    // 计算奖励：基础 * (目标/默认) * 系数
    // 例如：目标 100g 蛋白，默认 60g。奖励 = 2 * 100 = 200XP
    // 热量控制：目标越低奖励越高 -> 逻辑特殊处理
    let rewardExp = 0;
    if (type === 'CALORIE_CONTROL') {
      // 目标越低越难 (2000为基准)
      const diff = Math.max(0, 2500 - target);
      rewardExp = Math.floor(diff * 0.1) + 50;
    } else {
      rewardExp = Math.floor(template.baseReward * target);
    }

    // 限制奖励
    rewardExp = Math.min(Math.max(10, rewardExp), 800);

    let rarity: 'C' | 'B' | 'A' | 'S' | 'SS' = 'B';
    if (rewardExp > 400) rarity = 'SS';
    else if (rewardExp > 250) rarity = 'S';
    else if (rewardExp > 150) rarity = 'A';

    const newQuest: Quest = {
      id: `custom_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      title: systemStore.isPureMode ? template.title : `[自选] ${template.title}`,
      desc: `${template.desc} ${target} ${template.unit}`,
      rarity: rarity,
      target: target,
      current: 0,
      type: type as any,
      rewardExp: rewardExp,
      status: 'ACCEPTED'
    };

    quests.value.push(newQuest);
    showToast(systemStore.isPureMode ? '计划已添加' : '📜 契约已签订！');
    return true;
  }

  function abandonQuest(questId: string) {
    const idx = quests.value.findIndex(q => q.id === questId);
    if (idx !== -1) {
      quests.value.splice(idx, 1);
      showToast('已放弃');
    }
  }

  function checkDailyQuests(log: FoodLog) {
    let updated = false;
    quests.value.forEach(q => {
      if (q.status !== 'ACCEPTED') return;

      // 1. 基础计数
      if (q.type === 'COUNT') q.current += 1;

      // 2. 营养素累积
      if (q.type === 'PROTEIN') q.current += (log.p || 0);
      if (q.type === 'CALORIE_CONTROL') q.current += (log.calories || 0);

      // 3. 分类/标签判定
      if (q.type === 'VEG' && (log.category === 'VEG' || log.tags?.includes('纯净'))) q.current += 1;
      if (q.type === 'WATER' && (log.category === 'DRINK' || log.name.includes('水'))) q.current += 1;

      // 4. 避雷/挑战类 (单次判定)
      // LOW_CARB: 本次记录不能是高糖，且碳水较低
      if (q.type === 'LOW_CARB') {
        if (log.tags?.includes('高糖')) q.current = -99; // 惩罚：失败
        else if ((log.c || 0) < 20) q.current += 1;
      }
      // LOW_FAT: 本次记录不能是高油，且脂肪较低
      if (q.type === 'LOW_FAT') {
        if (log.tags?.includes('高油')) q.current = -99;
        else if ((log.f || 0) < 10) q.current += 1;
      }
      // [New] LOW_SUGAR: 只要不是高糖就算成功
      if (q.type === 'LOW_SUGAR') {
        if (log.tags?.includes('高糖')) q.current = -99;
        else q.current += 1;
      }

      // 保护逻辑
      if (q.current < 0) q.current = 0;

      // 结算逻辑 (热量控制类是 "不超过"，其他是 "达到")
      // 注意：CALORIE_CONTROL 的任务描述如果是 "不超过"，这里的 current >= target 其实是代表 "累计热量"
      // 为了简化，我们假设 CALORIE_CONTROL 是 "累计消耗" 或者 "累计摄入"
      // 如果是 "限制摄入"，通常逻辑是全天结束结算。但为了即时反馈，这里暂时作为 "累计记录热量" (反向逻辑需配合每日结算)
      // 修正：对于自定义的 CALORIE_CONTROL，我们将目标视为 "累计记录热量"，达到目标即完成 (例如：我要吃够 2000 卡)
      // 如果用户想要 "限制"，那是 "Limit" 类型，目前 Quest 系统是 "Progress" 类型。
      // 这里的逻辑保持为 "累计达到目标值" 视为完成。

      if (q.current >= q.target) {
        q.current = q.target;
        q.status = 'COMPLETED';
        showToast(systemStore.isPureMode ? `✅ 目标达成：${q.title}` : `✅ 委托完成：${q.title}`);
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

  // [优先级三] 预防性措施：出售物品前检查是否已装备
  function sellItem(itemId: string, price: number): boolean {
    const heroStore = useHeroStore();
    
    // 检查物品是否正在被装备
    const isEquipped = Object.values(heroStore.user.equipped).includes(itemId as any);
    if (isEquipped) {
      showToast('请先卸下装备再出售');
      return false;
    }
    
    // 检查库存
    if (!heroStore.user.inventory || !heroStore.user.inventory[itemId] || heroStore.user.inventory[itemId] <= 0) {
      showToast('物品不存在或数量不足');
      return false;
    }
    
    // 执行出售
    heroStore.user.inventory[itemId] -= 1;
    if (heroStore.user.inventory[itemId] <= 0) {
      delete heroStore.user.inventory[itemId];
    }
    heroStore.addGold(price, `出售${itemId}`, 'SHOP_PURCHASE');
    showToast(`出售成功，获得 ${price} 金币`);
    return true;
  }

  return {
    achievements, foodDb, quests, availableQuests, questPoolDay,
    initFoodDb, saveToFoodDb, unlockAch,
    refreshQuestHall, acceptQuest, checkDailyQuests, claimQuest,
    addCustomQuest, abandonQuest,
    sellItem // [优先级三] 导出出售方法
  };
});
