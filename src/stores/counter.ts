import { defineStore } from 'pinia';
import { ref, reactive, computed, toRaw } from 'vue';
import type { UserState, FoodLog, Achievement } from '@/types';
import { RACES, MONSTERS, RACE_DEFAULT_FOODS } from '@/constants/gameData';
import { showToast, showNotify, showConfirmDialog } from 'vant';

// 简易的小怪数据池
const MINIONS_POOL = [
  { name: '糖分小鬼', icon: '🍬', weakness: '忌高糖', weaknessType: 'LOW_CARB' },
  { name: '油腻史莱姆', icon: '💧', weakness: '忌油腻', weaknessType: 'LOW_FAT' },
  { name: '碳水强盗', icon: '🍞', weakness: '忌高碳', weaknessType: 'LOW_CARB' },
  { name: '懒惰炸弹', icon: '💣', weakness: '需高蛋白', weaknessType: 'HIGH_PRO' }
];

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateMockLogs = () => {
  const logs: Record<string, FoodLog[]> = {};
  const todayStr = getLocalDateStr();
  if (!logs[todayStr]) logs[todayStr] = [];
  return logs;
};

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
    baseBMR: 2000, nickname: '',
    // 头像相关
    avatarSeed: 'Felix', avatarType: 'SEED', customAvatar: '',
    race: 'HUMAN', gender: 'MALE',
    height: 170, weight: 65, age: 25,
    heroCurrentHp: 200, heroMaxHp: 200,
    equipped: { HEAD: null, BODY: null, LEGS: null, WEAPON: null, OFFHAND: null, BACK: null, ACCESSORY: null },
    lastLoginDate: ''
  });

  const isDarkMode = ref(true);
  const currentDate = ref(getLocalDateStr());
  const logs = reactive<Record<string, FoodLog[]>>(generateMockLogs());
  const achievements = ref<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const foodDb = ref<any[]>([]);
  const analysisRefDate = ref(getLocalDateStr());

  // 临时状态 (UI State)
  const temp = reactive({
    activeMealType: 'SNACK' as const,
    pendingItem: null as any,
    // 配餐系统核心状态
    basket: [] as any[], // 存放食材的餐篮
    isBuilding: false,   // 是否正在配餐
    buildingName: '', isShaking: false, isDamaged: false,
    selectedLog: null as FoodLog | null, selectedItem: null as any,
    activeSlot: null as string | null, unlockedAchievement: null as Achievement | null,
    selectedHistoryDate: null as string | null, searchResetTrigger: 0, aiSuggestions: [] as any[]
  });

  // 模态框
  const modals = reactive({
    addFood: false, quantity: false, levelUp: false, achievements: false,
    unlock: false, onboarding: true, itemDetail: false, equipmentSwap: false,
    historyDetail: false, logDetail: false, hpHistory: false,
    npcGuide: false // 新增 NPC 弹窗状态
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

  const logsReverse = computed(() => [...todayLogs.value].reverse());

  const heroStats = computed(() => {
    let totalP = 0, totalC = 0, totalF = 0;
    Object.keys(logs).forEach(date => { (logs[date] || []).forEach(l => { totalP += l.p||0; totalC += l.c||0; totalF += l.f||0; }); });

    const race = RACES[user.race] || RACES.HUMAN;
    const statCap = 50 + (user.level * 20);

    let rawStr = Math.floor(totalP / 70) + 10;
    let rawAgi = Math.floor(totalC / 180) + 10;
    let rawVit = Math.floor(totalF / 40) + 10;

    rawStr = Math.floor(rawStr * (race?.growth?.str || 1));
    rawAgi = Math.floor(rawAgi * (race?.growth?.agi || 1));
    rawVit = Math.floor(rawVit * (race?.growth?.vit || 1));

    let gearPower = 0;
    Object.values(user.equipped).forEach(id => {
      if(id) {
        const it = achievements.value.find(a => a.id === id);
        if(it && it.combatPower) gearPower += it.combatPower;
      }
    });

    const maxHp = 200 + (rawVit * 10);
    const blockValue = Math.floor(rawStr * 0.8);
    const dodgeChance = Math.min(rawAgi * 0.003, 0.60);
    const combatPower = Math.floor(user.currentExp * 1.5 + rawStr * 10 + rawAgi * 10 + rawVit * 10 + gearPower);

    return {
      str: Math.min(rawStr, statCap),
      agi: Math.min(rawAgi, statCap),
      vit: Math.min(rawVit, statCap),
      maxStat: statCap, rawStr, rawAgi, rawVit,
      combatPower, maxHp, blockValue, dodgeChance,
      raceName: race?.name || '人类', raceIcon: race?.icon || '👤'
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

  const dailyMonster = computed(() => {
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

    const daySeed = parseInt(currentDate.value.replace(/-/g, '')) + currentStageIndex;
    const minionData = MINIONS_POOL[daySeed % MINIONS_POOL.length];

    const bossData = dailyMonster.value || MONSTERS[0];

    const bossStartCals = minionCount * minionHP;
    const bossHP = target - bossStartCals;

    const isBoss = currentStageIndex === minionCount;
    const currentStageObj = {
      type: isBoss ? 'BOSS' : 'MINION',
      data: isBoss ? bossData : minionData,
      maxHp: isBoss ? bossHP : minionHP,
      startCals: isBoss ? bossStartCals : (currentStageIndex * minionHP)
    };

    const stageDamage = consumed - currentStageObj.startCals;
    const currentHpRemaining = Math.max(0, currentStageObj.maxHp - stageDamage);

    return {
      stages: Array(minionCount + 1).fill(0),
      currentIndex: currentStageIndex,
      currentObj: currentStageObj,
      currentHpRemaining,
      isBoss,
      isOverloaded: consumed > target,
      isCleared: consumed >= target && consumed <= target * 1.1
    };
  });

  const weeklyStats = computed(() => {
    const [y, m, d] = analysisRefDate.value.split('-').map(Number);
    const refDate = new Date(y || 2024, (m || 1) - 1, d || 1);
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

  function setModal(key: keyof typeof modals, val: boolean) { modals[key] = val; }

  function recalcBMR() {
    const s = user.gender === 'MALE' ? 5 : -161;
    const bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + s;
    user.baseBMR = Math.round(bmr * 1.375);
  }

  function initUser(formData: any) {
    Object.assign(user, formData);
    recalcBMR();
    const defaultFoods = RACE_DEFAULT_FOODS[user.race] || RACE_DEFAULT_FOODS.HUMAN;
    const newFoods = (defaultFoods || []).map(f => ({ ...f, id: Date.now() + Math.random() }));
    const currentDb = Array.isArray(foodDb.value) ? foodDb.value : [];
    const newFoodNames = new Set(newFoods.map(f => f.name));
    const cleanCurrentDb = currentDb.filter(f => !newFoodNames.has(f.name));
    foodDb.value = [...newFoods, ...cleanCurrentDb];
    user.isInitialized = true;
    modals.onboarding = false;
    modals.npcGuide = true; // 开启 NPC 引导
    saveState();
    showToast(`欢迎来到健康乐园，${formData.nickname}！`);
  }

  function triggerShake() {
    temp.isShaking = true;
    temp.isDamaged = true;
    if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(() => { temp.isShaking = false; temp.isDamaged = false; }, 500);
  }

  function saveToDb(item: any) {
    const getCleanName = (i: any) => {
      if (i.originalName) return i.originalName.trim();
      const match = i.name.match(/[\(（](.*?)[\)）]/);
      if (match) return match[1].trim();
      if (i.name.includes('·')) return i.name.split('·')[1].trim();
      return i.name.trim();
    };
    const targetCleanName = getCleanName(item);
    if (!Array.isArray(foodDb.value)) foodDb.value = [];
    const existingIndex = foodDb.value.findIndex(f => getCleanName(f) === targetCleanName);
    const cleanItem = JSON.parse(JSON.stringify(toRaw(item)));
    if (existingIndex !== -1) {
      const existingItem = foodDb.value[existingIndex];
      existingItem.usageCount = (existingItem.usageCount || 0) + 1;
      const newTags = cleanItem.tags || [];
      const oldTags = existingItem.tags || [];
      existingItem.tags = [...new Set([...oldTags, ...newTags])];
      foodDb.value.splice(existingIndex, 1);
      foodDb.value.unshift(existingItem);
    } else {
      cleanItem.id = Date.now() + Math.random();
      cleanItem.originalName = targetCleanName;
      cleanItem.category = cleanItem.category || 'STAPLE';
      cleanItem.usageCount = 1;
      cleanItem.tags = [...new Set(cleanItem.tags || [])];
      foodDb.value.unshift(cleanItem);
    }
    if (foodDb.value.length > 60) foodDb.value = foodDb.value.slice(0, 60);
    saveState();
  }

  function battleCommit(item: any) {
    let tags = item.tags || [];
    if (item.c > 40) tags.push('HIGH_CARB');
    if (item.f > 20) tags.push('HIGH_FAT');
    if (item.p > 25) tags.push('HIGH_PRO');
    if (item.name.includes('糖') || item.name.includes('奶茶')) tags.push('HIGH_SUGAR');
    item.tags = [...new Set(tags)];
    saveToDb(item);

    const monster = stageInfo.value.currentObj?.data;
    const stats = heroStats.value;
    let multiplier = 1.0;
    let isResist = false;
    let resistReason = '';
    const uniqueTags = item.tags;

    if (monster?.weaknessType === 'LOW_CARB') {
      if (uniqueTags.includes('HIGH_CARB') || uniqueTags.includes('HIGH_SUGAR')) {
        multiplier = 0.3; isResist = true; resistReason = '触犯禁忌(高碳)';
      } else if (item.c < 15) { multiplier = 1.5; }
    } else if (monster?.weaknessType === 'LOW_FAT') {
      if (uniqueTags.includes('HIGH_FAT')) {
        multiplier = 0.3; isResist = true; resistReason = '触犯禁忌(高油)';
      } else if (item.f < 5) { multiplier = 1.5; }
    } else if (monster?.weaknessType === 'HIGH_PRO') {
      if (uniqueTags.includes('HIGH_PRO')) { multiplier = 1.5; }
    }

    item.multiplier = multiplier;
    // 复合食物经验加成
    const xp = item.isComposite ? 50 : 30;
    item.gainedExp = xp;

    if (isResist || Math.random() < 0.1) {
      triggerShake();
      const baseDamage = isResist ? 50 : 15;
      const block = stats.blockValue;
      const dodge = stats.dodgeChance;
      if (Math.random() < dodge) {
        item.dodged = true;
        showNotify({ type: 'success', message: '身手敏捷！完美闪避了攻击！' });
      } else {
        const finalDamage = Math.max(1, baseDamage - block);
        user.heroCurrentHp = Math.max(0, user.heroCurrentHp - finalDamage);
        item.damageTaken = finalDamage;
        item.blocked = block;
        showNotify({ type: 'danger', message: `💔 ${resistReason || '不慎'} 受到 ${finalDamage} 点伤害 (格挡${block})` });
      }
    } else {
      if (multiplier > 1) showToast('🔥 效果拔群！造成了巨额伤害！');
      else showToast('攻击有效');
    }
    commitLog(item);
    addExp(xp);
    saveState();
  }

  function commitLog(logItem: any) {
    const dateKey = currentDate.value;
    if (!logs[dateKey]) logs[dateKey] = [];
    const cleanLogItem = JSON.parse(JSON.stringify(toRaw(logItem)));
    logs[dateKey].unshift({
      id: Date.now(),
      ...cleanLogItem,
      mealType: temp.activeMealType,
      timestamp: new Date().toISOString()
    });
    // 修复：提交日志时只触发即时成就检查
    checkAchievements(false);
  }

  function deleteLog(log: FoodLog) {
    const dateKey = currentDate.value;
    const dayLogs = logs[dateKey];
    if (!dayLogs) return;
    const idx = dayLogs.findIndex(l => l.id === log.id);
    if (idx === -1) return;

    if (log.gainedExp) {
      user.currentExp -= log.gainedExp;
      while (user.currentExp < 0 && user.level > 1) {
        user.level--;
        const prevLevelMaxExp = Math.ceil(user.nextLevelExp / 1.2);
        user.nextLevelExp = prevLevelMaxExp;
        user.currentExp += user.nextLevelExp;
        showNotify({ type: 'warning', message: '经验回退，等级下降！' });
      }
      if (user.level === 1 && user.currentExp < 0) user.currentExp = 0;
    }

    if (log.damageTaken) {
      user.heroCurrentHp = Math.min(user.heroMaxHp, user.heroCurrentHp + log.damageTaken);
      showNotify({ type: 'primary', message: `✨ 时光倒流：恢复了 ${log.damageTaken} 点生命值` });
    }

    dayLogs.splice(idx, 1);
    modals.logDetail = false;
    showToast('记录已湮灭在时间长河中');
    saveState();
  }

  function addExp(amount: number) {
    user.currentExp += amount;
    if (user.currentExp >= user.nextLevelExp) {
      user.level++; user.currentExp -= user.nextLevelExp;
      user.nextLevelExp = Math.floor(user.nextLevelExp * 1.2);
      modals.levelUp = true; user.heroCurrentHp = user.heroMaxHp;
    }
  }

  function checkAchievements(isInitCheck: boolean = false) {
    const stats = todayMacros.value;
    const todayLogList = todayLogs.value;
    achievements.value.forEach(ach => {
      if (ach.unlocked) return;

      // 如果是初始化检查，跳过那些容易误触发的即时成就（比如“新手村毕业”这种只要有一条记录就触发的，可能需要更严谨的判断）
      // 但对于大多数成就，如果条件满足就应该触发
      // 这里可以根据需求加限制，比如 if (isInitCheck && ach.type === 'INSTANT') return;

      let unlocked = false;
      switch (ach.id) {
        case 1: if (todayLogList.length > 0) unlocked = true; break;
        case 2: if (stats.p > 120) unlocked = true; break;
        case 3: const veg = todayLogList.filter(l => l.category === 'VEG' || l.tags?.includes('CLEAN')).reduce((s, l) => s + (l.grams || 0), 0); if (veg > 400) unlocked = true; break;
        case 5: if (todayLogList.some(l => l.mealType === 'BREAKFAST' && new Date(l.timestamp || '').getHours() < 9)) unlocked = true; break;
        case 6: if (todayLogList.some(l => new Date(l.timestamp || '').getHours() >= 22)) unlocked = true; break;
        case 8: if (todayLogList.some(l => l.calories > 1000)) unlocked = true; break;
        case 9: if (todayLogList.filter(l => l.category === 'DRINK' || l.name.includes('水')).length >= 3) unlocked = true; break;
        case 10: if (todayLogList.length >= 3) unlocked = true; break;
        case 11: if (stats.c > 300) unlocked = true; break;
        case 12: if (stats.f > 0 && stats.f < 40 && todayLogList.length > 2) unlocked = true; break;
        case 13: if (stats.cals > 2500) unlocked = true; break;
        case 14: if (stats.cals > 0 && stats.cals < 1200 && todayLogList.length > 0) unlocked = true; break;
      }
      // 只有在非初始化检查（即用户操作触发）或者成就确实未解锁时才弹窗
      // 为了防止一进页面就弹窗，我们可以在 loadState 时不调用 checkAchievements，或者传入参数控制不弹窗只静默解锁
      if (unlocked) {
        if (!isInitCheck) {
          unlockAch(ach.id);
        } else {
          // 静默解锁，不弹窗
          ach.unlocked = true;
        }
      }
    });
  }

  function unlockAch(id: number) {
    const ach = achievements.value.find(a => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      temp.unlockedAchievement = ach;
      modals.unlock = true;
      saveState();
    }
  }

  function equipItem(item: any) { /* ... */ }

  function saveState() {
    try {
      const stateToSave = { user: toRaw(user), logs: toRaw(logs), achievements: toRaw(achievements.value), foodDb: Array.isArray(foodDb.value) ? toRaw(foodDb.value) : [], isDarkMode: isDarkMode.value };
      localStorage.setItem('health_rpg_save_v2', JSON.stringify(stateToSave));
    } catch (e) { console.error("Save failed:", e); }
  }

  function loadState() {
    const saved = localStorage.getItem('health_rpg_save_v2');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.user) Object.assign(user, data.user);
        if (data.logs) Object.assign(logs, data.logs);
        if (data.foodDb && Array.isArray(data.foodDb)) {
          const uniqueMap = new Map();
          data.foodDb.forEach((item: any) => uniqueMap.set(item.name.trim(), item));
          foodDb.value = Array.from(uniqueMap.values());
        } else { foodDb.value = []; }
        if (data.isDarkMode !== undefined) isDarkMode.value = data.isDarkMode;
        if (data.achievements) data.achievements.forEach((oldAch: any) => { const e = achievements.value.find(a => a.id === oldAch.id); if (e) e.unlocked = oldAch.unlocked; });
      } catch (e) { console.error('Failed to parse', e); foodDb.value = []; }
    }
    // 严谨逻辑：加载时不触发弹窗，只做静默检查或不检查
    // checkAchievements(true);
  }

  return { user, isDarkMode, currentDate, logs, achievements, foodDb, temp, modals, analysisRefDate, todayLogs, todayMacros, heroStats, dailyTarget, stageInfo, weeklyStats, logsReverse, setModal, initUser, commitLog, deleteLog, saveState, loadState, triggerShake, equipItem, battleCommit, recalcBMR };
});
