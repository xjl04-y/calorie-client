// 核心数据接口定义 - V5.2 Updated (Quest Types)
export type RaceType = 'HUMAN' | 'ELF' | 'ORC' | 'DWARF';
export type SlotType = 'HEAD' | 'BODY' | 'LEGS' | 'WEAPON' | 'OFFHAND' | 'BACK' | 'ACCESSORY';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'HYDRATION' | 'EXERCISE';
export type Gender = 'MALE' | 'FEMALE';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

// [New V5.8] 目标与推荐设置
export type DietGoal = 'LOSE' | 'MAINTAIN' | 'GAIN';
export type ActivityLevel = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;

export interface TargetConfig {
  mode: 'AUTO' | 'MANUAL'; // 自动推荐 or 手动锁定
  goal: DietGoal;          // 目标
  activityLevel: ActivityLevel; // 活动系数
  manualBMR?: number;      // 手动设定的值
}

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
// [PM Fix] 扩充任务类型：LOW_SUGAR, CUSTOM
export interface Quest {
  id: string;
  title: string;
  desc: string;
  rarity: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';
  target: number;
  current: number;
  type: 'COUNT' | 'PROTEIN' | 'VEG' | 'WATER' | 'CALORIE_CONTROL' | 'LOW_CARB' | 'LOW_FAT' | 'LOW_SUGAR' | 'CUSTOM';
  rewardExp: number;
  status: 'AVAILABLE' | 'ACCEPTED' | 'COMPLETED' | 'CLAIMED';
  // 自定义任务的额外校验规则
  template?: {
    keyword?: string;
    tag?: string;
    excludeTag?: string;
    metric?: 'COUNT' | 'CALORIES';
  };
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
  heroShield: number; // [New V6.2] 护盾值
  equipped: Record<SlotType, number | null>;
  skillPoints: number;
  learnedSkills: Record<string, number>;
  activeSkillId: string | null;
  activeSkillCd: number;
  loginStreak: number;
  lastLoginDate: string;
  gold: number;
  inventory: Record<string, number>;
  hydration: {
    dailyTargetCups: number;
    cupSizeMl: number;
    reminderInterval: number;
    enableNotifications: boolean;
    lastDrinkTime?: number;
  };
  fasting: {
    isFasting: boolean;
    startTime: number;
    targetHours: number;
  };
  targetConfig: TargetConfig;
}

export interface ModalState {
  addFood: boolean;
  addExercise: boolean;
  quantity: boolean;
  manualAdd: boolean;
  hydration: boolean;
  fasting: boolean;
  targetConfig: boolean;

  levelUp: boolean;
  achievements: boolean;
  skillTree: boolean;
  rebirth: boolean;

  unlock: boolean;
  itemDetail: boolean;
  historyDetail: boolean;
  logDetail: boolean;
  hpHistory: boolean;
  dailyReport: boolean;

  onboarding: boolean;
  equipmentSwap: boolean;
  questBoard: boolean;
  npcGuide: boolean;
  settings: boolean;
  shop: boolean;
}

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
  isExercise?: boolean;
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
  fastingHours?: number;
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
  reportData: DailyReportData | null;
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

// --- [PM Add] 新增：AI 分析服务接口 ---
// 用于 aiService.ts 的类型检查，完全独立，不影响上方任何类型

export interface AIAnalysisRequest {
  user: UserState;         // 传入完整用户状态以便 AI 判断等级、种族、BMR
  logs: FoodLog[];         // 传入今日记录
  targetBMR: number;       // 今日目标热量
  prompt?: string;         // 用户自定义提问
}

export interface AIAnalysisResponse {
  success: boolean;
  analysis: string;        // 核心分析文本
  suggestions: string[];   // 建议列表 ( bullet points )
  score: number;           // 健康评分 0-100
  buffGranted?: {          // AI 可能会给予的临时 Buff
    type: 'EXP' | 'GOLD' | 'ATK';
    value: number;
    desc: string;
  };
  error?: string;
}

// [PM Add] 连胜系统辅助接口 (State 中已有 UserState.loginStreak，此接口用于 UI 展示)
export interface DailyStreakInfo {
  days: number;
  bonusExp: number;
  bonusGold: number;
  isFrozen: boolean; // 是否使用了时光怀表
}

// [PM Add] 连胜系统核心状态接口 (Fix: 之前遗漏的接口定义)
export interface DailyStreak {
  currentStreak: number;
  lastLoginDate: string; // ISO Date String YYYY-MM-DD
  maxStreak: number;
}
