import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import type { UserState, FoodLog, Achievement } from '@/types';
import { RACES, MONSTERS } from '@/constants/gameData';
import { showToast } from 'vant';

// 辅助函数：获取当前日期 YYYY-MM-DD
const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 还原 Mock 数据生成逻辑
const generateMockLogs = () => {
  const logs: Record<string, FoodLog[]> = {};
  const today = new Date();
  for (let i = 1; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateStr(d);
    const cals = Math.floor(Math.random() * (2400 - 1500) + 1500);
    logs[dateStr] = [{
      id: Date.now() - i * 10000,
      name: '旧日口粮 (干粮)',
      calories: cals,
      p: Math.floor(cals * 0.2 / 4),
      c: Math.floor(cals * 0.5 / 4),
      f: Math.floor(cals * 0.3 / 9),
      quantity: 1,
      multiplier: 1,
      unit: '份',
      mealType: 'LUNCH',
      isComposite: false,
      icon: '🍞',
      tags: ['HIGH_CARB'],
      grams: 100
    }];
  }
  // 补一条昨天的测试数据
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = getLocalDateStr(d);
  if(!logs[yesterday]) logs[yesterday] = [{ id: 1, name: '测试高碳水饮食', calories: 2200, p: 50, c: 350, f: 20, multiplier: 1, tags: ['HIGH_CARB'], mealType: 'DINNER', grams: 500, unit: '份' }];

  const todayStr = getLocalDateStr();
  if (!logs[todayStr]) logs[todayStr] = [];
  return logs;
};

// 还原默认成就数据
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 1, name: "新手村毕业", desc: "首次记录", condition: "记录任意食物", icon: "🗡️", unlocked: false, reward: "生锈的铁剑", slot: "WEAPON", rarity: "common", flavor: "虽然锈迹斑斑，但它是你踏上旅途的见证。", stats: "攻击力 +1", combatPower: 10, bonusBMR: 0 },
  { id: 2, name: "肉食者", desc: "单日蛋白质>120g", condition: "今日蛋白质 > 120g", icon: "🛡️", unlocked: false, reward: "猛兽甲", slot: "BODY", rarity: "rare", flavor: "散发着野性的气息，能威慑素食动物。", stats: "力量 +3, 防御 +5", combatPower: 50, bonusBMR: 50 },
  { id: 3, name: "绿色守护者", desc: "蔬菜>400g", condition: "今日蔬菜记录 > 400g", icon: "🧿", unlocked: false, reward: "森林护符", slot: "ACCESSORY", rarity: "rare", flavor: "蕴含自然之力，让你感觉身体轻盈。", stats: "敏捷 +3, 消化速度 +10%", combatPower: 30, bonusBMR: 0 },
  { id: 4, name: "鹰眼", desc: "使用5次鉴定", condition: "使用AI鉴定功能 5 次", icon: "🥽", unlocked: false, reward: "真视之镜", slot: "HEAD", rarity: "epic", flavor: "传说中能直接看到食物卡路里数值的神器。", stats: "智力 +5, 鉴定准确率 +20%", combatPower: 60, bonusBMR: 10 },
  { id: 5, name: "晨曦之光", desc: "9点前早餐", condition: "在 9:00 前记录早餐", icon: "🦇", unlocked: false, reward: "黎明斗篷", slot: "BACK", rarity: "rare", flavor: "早起的鸟儿有虫吃，早起的英雄有披风。", stats: "体质 +3, 每日活力 +50", combatPower: 40, bonusBMR: 20 },
  { id: 6, name: "夜行者", desc: "22点后记录", condition: "在 22:00 后记录食物", icon: "🗡️", unlocked: false, reward: "暗影匕首", slot: "OFFHAND", rarity: "epic", flavor: "适合在深夜食堂切夜宵的利器。", stats: "敏捷 +5, 暴击伤害 +10%", combatPower: 55, bonusBMR: 0 },
  { id: 7, name: "均衡之道", desc: "P/C/F均衡", condition: "碳水/蛋白/脂肪 比例均衡", icon: "🥋", unlocked: false, reward: "武僧腰带", slot: "LEGS", rarity: "epic", flavor: "只有内心平静、饮食均衡的人才能系上它。", stats: "全属性 +2", combatPower: 70, bonusBMR: 30 },
  { id: 8, name: "暴饮暴食", desc: "单次>1000kcal", condition: "单条记录 > 1000大卡", icon: "🏋️", unlocked: false, reward: "巨人腰带", slot: "LEGS", rarity: "legendary", flavor: "为了撑住饱餐后的肚子而特制的伸缩腰带。", stats: "体质 +10, 移动速度 -5%", combatPower: 100, bonusBMR: 200 },
  { id: 9, name: "水分充足", desc: "每日喝水", condition: "记录饮品/水 ≥ 3次", icon: "🏺", unlocked: false, reward: "蔚蓝圣杯", slot: "OFFHAND", rarity: "rare", flavor: "永不干涸的圣杯，据说喝了皮肤会变好。", stats: "智力 +3, 代谢 +5%", combatPower: 45, bonusBMR: 0 },
  { id: 10, name: "持之以恒", desc: "连续3天记录", condition: "连续记录 3 天", icon: "👢", unlocked: false, reward: "旅者之靴", slot: "LEGS", rarity: "common", flavor: "这双鞋走过了很多路，虽然旧但很合脚。", stats: "敏捷 +2, 意志力 +1", combatPower: 15, bonusBMR: 0 },
  { id: 11, name: "碳水风暴", desc: "单日碳水>300g", condition: "今日碳水 > 300g", icon: "🪖", unlocked: false, reward: "疾风头带", slot: "HEAD", rarity: "common", flavor: "吃了这么多碳水，你应该很有力气跑步吧？", stats: "敏捷 +2, 爆发力 +3%", combatPower: 20, bonusBMR: 10 },
  { id: 12, name: "低脂苦行", desc: "单日脂肪<40g", condition: "今日脂肪 < 40g", icon: "👘", unlocked: false, reward: "苦行僧长袍", slot: "BODY", rarity: "rare", flavor: "轻薄透气，仿佛没有穿一样。", stats: "体质 +2, 闪避 +5%", combatPower: 35, bonusBMR: -50 },
  { id: 13, name: "饕餮盛宴", desc: "单日总热量>2500", condition: "今日总热量 > 2500kcal", icon: "🔱", unlocked: false, reward: "国王权杖", slot: "WEAPON", rarity: "epic", flavor: "只有真正的大胃王才配举起这根鸡腿...哦不，权杖。", stats: "力量 +8, 威严 +10", combatPower: 80, bonusBMR: 100 },
  { id: 14, name: "绝食艺人", desc: "单日<1200且非0", condition: "今日热量 1-1200kcal", icon: "🧣", unlocked: false, reward: "破旧围巾", slot: "BACK", rarity: "common", flavor: "在这个寒冷的世界里，至少还有围巾给你一丝温暖。", stats: "体质 -1, 敏捷 +3", combatPower: 5, bonusBMR: -100 },
  { id: 15, name: "屠龙勇士", desc: "蛋白质累计达标", condition: "历史蛋白质破纪录", icon: "⚔️", unlocked: false, reward: "屠龙大剑", slot: "WEAPON", rarity: "legendary", flavor: "由无数块鸡胸肉和牛排的灵魂铸造而成的传说之剑。", stats: "力量 +99, 对龙族伤害 +50%", combatPower: 200, bonusBMR: 150 }
];

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
  // 使用模拟数据初始化
  const logs = reactive<Record<string, FoodLog[]>>(generateMockLogs());
  const achievements = ref<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const foodDb = ref<any[]>([]);
  const analysisRefDate = ref(getLocalDateStr()); // 新增：分析页面的参考日期

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

  // 反序日志用于显示（新记录在顶部）
  const logsReverse = computed(() => [...todayLogs.value].reverse());

  const heroStats = computed(() => {
    let totalP = 0, totalC = 0, totalF = 0;
    // 遍历所有日志计算总属性（用于成长）
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

    // 计算装备加成
    let gearPower = 0;
    Object.values(user.equipped).forEach(id => {
      if(id) {
        const it = achievements.value.find(a => a.id === id);
        if(it && it.combatPower) gearPower += it.combatPower;
      }
    });

    const maxHp = 200 + (rawVit * 10);
    const blockValue = Math.floor(rawStr * 0.5);
    const dodgeChance = Math.min(rawAgi * 0.002, 0.5);
    const combatPower = Math.floor(user.currentExp * 1.5 + rawStr * 10 + rawAgi * 10 + rawVit * 10 + gearPower);

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
    let bonus = 0;
    Object.values(user.equipped).forEach(itemId => {
      if (itemId) {
        const item = achievements.value.find(a => a.id === itemId);
        if (item && item.bonusBMR) bonus += item.bonusBMR;
      }
    });
    return Math.round(user.baseBMR + bonus);
  });

  // 每日怪物逻辑
  const dailyMonster = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = getLocalDateStr(d);
    const yLogs = logs[yesterday] || [];
    const yMacros = yLogs.reduce((acc, l) => ({ p: acc.p + l.p, c: acc.c + l.c, f: acc.f + l.f }), { p:0, c:0, f:0 });
    if (yMacros.c > 300) return MONSTERS.find(m => m.weaknessType === 'LOW_CARB');
    if (yMacros.f > 100) return MONSTERS.find(m => m.weaknessType === 'LOW_FAT');
    if (yMacros.p > 150) return MONSTERS.find(m => m.weaknessType === 'HIGH_PRO');
    const now = new Date(currentDate.value);
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = (dayOfYear + 5) % MONSTERS.length;
    return MONSTERS[index];
  });

  const stageInfo = computed(() => {
    const target = dailyTarget.value;
    const consumed = todayMacros.value.cals;
    const minionHP = 500;
    const bossReserveHP = 1000;
    const minionPool = Math.max(0, target - bossReserveHP);
    const minionCount = Math.floor(minionPool / minionHP);
    let currentStageIndex = Math.floor(consumed / minionHP);
    if (currentStageIndex >= minionCount) currentStageIndex = minionCount;

    // 生成阶段数据
    const stages = [];
    // ... 简单起见，这里需要引用 CONSTANTS 里的 MINIONS，暂时简化
    const minionData = { name: '小怪', icon: '👾' };
    const bossData = dailyMonster.value || MONSTERS[0];

    const bossStartCals = minionCount * minionHP;
    const bossHP = target - bossStartCals;
    const currentStageObj = {
      type: currentStageIndex === minionCount ? 'BOSS' : 'MINION',
      data: currentStageIndex === minionCount ? bossData : minionData,
      maxHp: currentStageIndex === minionCount ? bossHP : minionHP,
      startCals: currentStageIndex === minionCount ? bossStartCals : (currentStageIndex * minionHP)
    };

    const stageDamage = consumed - currentStageObj.startCals;
    const currentHpRemaining = Math.max(0, currentStageObj.maxHp - stageDamage);

    return {
      stages: [], // 用于 UI 进度条
      currentIndex: currentStageIndex,
      currentObj: currentStageObj,
      currentHpRemaining,
      isBoss: currentStageObj.type === 'BOSS',
      isOverloaded: consumed > target,
      isCleared: consumed >= target && consumed <= target * 1.1
    };
  });

  // 周报 Getter
  const weeklyStats = computed(() => {
    const [y, m, d] = analysisRefDate.value.split('-').map(Number);
    const refDate = new Date(y, m - 1, d);
    const day = refDate.getDay() || 7;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() - day + 1);
    const days = [];
    const weekdays = ['一','二','三','四','五','六','日'];
    const todayStr = getLocalDateStr();
    const todayDate = new Date();
    todayDate.setHours(0,0,0,0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateStr(d);

      const checkDate = new Date(d);
      checkDate.setHours(0,0,0,0);
      const isFuture = checkDate > todayDate;

      const l = logs[dateStr] || [];
      const total = l.reduce((sum, log) => sum + (log.calories || 0), 0);

      let rpgStatus = 'UNKNOWN';
      if (total > 0) {
        if(total > dailyTarget.value * 1.1) { rpgStatus = 'DEFEAT'; }
        else if(total >= dailyTarget.value * 0.8) { rpgStatus = 'VICTORY'; }
        else { rpgStatus = 'ONGOING'; }
      } else if (dateStr < todayStr) {
        rpgStatus = 'SKIPPED';
      }
      days.push({ label: `${d.getMonth()+1}/${d.getDate()}`, val: total, weekday: weekdays[i], date: dateStr, isToday: dateStr === todayStr, rpgStatus, isFuture });
    }
    return days;
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
    // 检查成就
    checkAchievements();
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

  function checkAchievements() {
    // 简单实现几个成就检查
    const l = todayLogs.value;
    if (l.length > 0) unlockAch(1);
    const m = todayMacros.value;
    if (m.p > 120) unlockAch(2);
  }

  function unlockAch(id: number) {
    const ach = achievements.value.find(a => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      temp.unlockedAchievement = ach;
      modals.unlock = true;
      if (!user.equipped[ach.slot]) user.equipped[ach.slot] = ach.id;
      saveState();
    }
  }

  function equipItem(item: any) {
    user.equipped[item.slot] = item.id;
    modals.equipmentSwap = false;
    saveState();
    showToast(`已装备: ${item.reward}`);
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
      if (data.isDarkMode !== undefined) isDarkMode.value = data.isDarkMode;
      if (data.achievements) {
        // 合并成就状态
        data.achievements.forEach((oldAch: any) => {
          const exist = achievements.value.find(a => a.id === oldAch.id);
          if (exist) exist.unlocked = oldAch.unlocked;
        });
      }
    }
  }

  return {
    user, isDarkMode, currentDate, logs, achievements, foodDb, temp, modals, analysisRefDate,
    todayLogs, todayMacros, heroStats, dailyTarget, stageInfo, weeklyStats, logsReverse,
    setModal, initUser, commitLog, saveState, loadState, triggerShake, equipItem
  };
});
