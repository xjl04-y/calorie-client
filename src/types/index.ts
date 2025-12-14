// 核心数据接口定义 - V4.2 Updated (PM: Merged & Cleaned)
export type RaceType = 'HUMAN' | 'ELF' | 'ORC' | 'DWARF';
export type SlotType = 'HEAD' | 'BODY' | 'LEGS' | 'WEAPON' | 'OFFHAND' | 'BACK' | 'ACCESSORY';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'HYDRATION';
export type Gender = 'MALE' | 'FEMALE';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

// V2.5: 技能节点
export interface SkillNode {
  id: string;
  tier: number;
  parentId?: string;
  name: string;
  desc: string;
  icon: string;
  maxLevel: number;
  reqLevel: number;
  reqCombatPower?: number;
  cost: number;
  type: 'PASSIVE_STAT' | 'PASSIVE_BMR' | 'ACTIVE_BUFF';
  effectParams: { target: string; base: number; scale: number };
  effectType?: string;
}

// V3.2: 任务定义
export interface Quest {
  id: string;
  title: string;
  desc: string;
  rarity: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';
  target: number;
  current: number;
  type: 'COUNT' | 'PROTEIN' | 'VEG' | 'WATER' | 'CALORIE_CONTROL' | 'LOW_CARB' | 'LOW_FAT';
  rewardExp: number;
  status: 'AVAILABLE' | 'ACCEPTED' | 'COMPLETED' | 'CLAIMED';
}

export interface WeightRecord {
  date: string;
  weight: number;
}

export interface Race {
  name: string;
  icon: string;
  desc: string;
  bonus: string;
  prefixes: string[];
  growth: { str: number; agi: number; vit: number };
}

export interface NpcConfig {
  name: string;
  title: string;
  icon: string;
  greeting: string;
}

export interface EnvironmentEffect {
  id: string;
  name: string;
  icon: string;
  desc: string;
  type: 'BUFF' | 'DEBUFF';
  multiplier: number;
  color: string;
}

// [V4.0 Update] 用户状态：新增金币与背包
export interface UserState {
  isInitialized: boolean;
  level: number;
  currentExp: number;
  nextLevelExp: number;
  baseBMR: number;
  nickname: string;
  avatarSeed: string;
  avatarType?: 'SEED' | 'CUSTOM';
  customAvatar?: string;
  race: RaceType;
  gender: Gender;
  height: number;
  weight: number;
  weightHistory: WeightRecord[];
  age: number;
  heroCurrentHp: number;
  heroMaxHp: number;
  equipped: Record<SlotType, number | null>;
  skillPoints: number;
  learnedSkills: Record<string, number>;
  activeSkillId: string | null;
  activeSkillCd: number;
  loginStreak: number;
  lastLoginDate: string;
  gold: number;
  inventory: Record<string, number>;
  // [New V4.1] 喝水计划配置
  hydration: {
    dailyTargetCups: number;
    cupSizeMl: number; // 默认 250
    reminderInterval: number; // 分钟，默认 60
    enableNotifications: boolean;
    lastDrinkTime?: number;
  };
}

// [Moved & Merged] 模态框状态定义 - 唯一的权威定义
export interface ModalState {
  // 核心功能
  addFood: boolean;
  quantity: boolean;
  manualAdd: boolean; // [New V4.7]
  hydration: boolean; // [New V4.1]

  // 角色成长
  levelUp: boolean;
  achievements: boolean;
  skillTree: boolean;
  rebirth: boolean; // [New V4.0]

  // 信息展示
  unlock: boolean;
  itemDetail: boolean;
  historyDetail: boolean;
  logDetail: boolean;
  hpHistory: boolean;
  dailyReport: boolean; // [New V4.2]

  // 系统与引导
  onboarding: boolean;
  equipmentSwap: boolean;
  questBoard: boolean;
  npcGuide: boolean;
  settings: boolean;
  shop: boolean; // [New V4.0]
}

// [New V4.0] 商店商品定义
export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  price: number;
  effect: 'REBIRTH' | 'HEAL' | 'EXP';
  value?: number;
}

export interface InitUserForm {
  race: RaceType;
  nickname: string;
  gender: Gender;
  height: number;
  weight: number;
  age: number;
}

export interface FoodItem {
  id: number | string;
  name: string;
  originalName?: string;
  displayName?: string;
  icon: string;
  calories: number;
  p: number;
  c: number;
  f: number;
  grams: number;
  unit?: string;
  category?: string;
  tags?: string[];
  tips?: string;
  isComposite?: boolean;
  isPreset?: boolean;
  usageCount?: number;
  ingredients?: FoodItem[];
}

export interface FoodLog extends FoodItem {
  mealType: MealType;
  quantity?: number;
  multiplier?: number;
  comboCount?: number;
  timestamp: string;
  damageTaken?: number;
  blocked?: number;
  dodged?: boolean;
  gainedExp?: number;
  healed?: number;
  skillEffect?: string;
  finalDamageValue?: number;
}

export interface Monster {
  name: string;
  icon: string;
  weakness: string;
  weaknessType: string;
  desc?: string;
}

export interface Achievement {
  id: number;
  name: string;
  desc: string;
  condition: string;
  icon: string;
  unlocked: boolean;
  reward: string;
  slot: SlotType;
  rarity: ItemRarity;
  flavor: string;
  stats: string;
  combatPower: number;
  bonusBMR: number;
}

// [New V4.2] 战报数据结构
export interface DailyReportData {
  date: string;
  totalCalories: number;
  targetBMR: number;
  status: 'VICTORY' | 'DEFEAT' | 'DRAW';
  expGained: number;
  goldGained: number;
  monsterName: string;
  loginStreak: number;
}

export interface SystemTempState {
  activeMealType: MealType;
  isBuilding: boolean;
  basket: FoodItem[];
  isShaking: boolean;
  isDamaged: boolean;
  searchResetTrigger: number;
  activeSlot: SlotType | null;
  selectedHistoryDate: string | null;
  selectedItem: FoodItem | null;
  unlockedAchievement: Achievement | null;
  selectedLog: FoodLog | null;
  pendingItem?: FoodItem;
  floatingTexts: FloatingText[];
  // [New V4.2] 暂存战报数据
  reportData: DailyReportData | null;

  // 动画状态
  isHealing: boolean;
  isCrit: boolean;
  attackVfx: string | null;
  projectile: { show: boolean, icon: string, id: number } | null;
}

export interface FloatingText {
  id: number;
  text: string;
  type: 'DAMAGE' | 'HEAL' | 'CRIT' | 'BLOCK' | 'EXP';
  x: number;
  y: number;
}
