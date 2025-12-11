// 核心数据接口定义 - V3.5.1 Refactored (Type Safe)
// PM Note: 修正 activeSlot 类型，移除模糊定义

export type RaceType = 'HUMAN' | 'ELF' | 'ORC' | 'DWARF';
export type SlotType = 'HEAD' | 'BODY' | 'LEGS' | 'WEAPON' | 'OFFHAND' | 'BACK' | 'ACCESSORY';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type Gender = 'MALE' | 'FEMALE';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

// V2.5: 技能节点定义 (增强版)
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
  // PM Note: 新增 effectType 用于明确技能效果逻辑，替代硬编码判断
  effectType?: string;
}

// V2.5: 任务定义
// [Fix V3.2] 增加 'SS' 稀有度
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

// [New] NPC 定义
export interface NpcConfig {
  name: string;
  title: string;
  icon: string;
  greeting: string;
}

// [New V2.1] 环境天气定义
export interface EnvironmentEffect {
  id: string;
  name: string;
  icon: string;
  desc: string;
  type: 'BUFF' | 'DEBUFF';
  multiplier: number; // 伤害倍率修正
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
  equipped: Record<SlotType, number | null>;
  skillPoints: number;
  learnedSkills: Record<string, number>;
  activeSkillId: string | null;
  activeSkillCd: number;
  // [New V2.1] 签到系统
  loginStreak: number;
  lastLoginDate: string; // YYYY-MM-DD
}

// [New] 初始化表单接口，替代 any
export interface InitUserForm {
  race: RaceType;
  nickname: string;
  gender: Gender;
  height: number;
  weight: number;
  age: number;
}

// [Fix 3.3] 严格化 FoodItem，避免 any
export interface FoodItem {
  id: number | string;
  name: string;
  originalName?: string;
  displayName?: string; // 增加显示名称字段
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
  // PM Note: 新增 isPreset，用于标记已保存的套餐，避免重复进入编辑模式
  isPreset?: boolean;
  usageCount?: number;
  // 制作模式下的额外字段
  ingredients?: FoodItem[];
}

// [Fix 3.3] FoodLog 继承 FoodItem 并添加日志特有字段
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
  // PM Note: 新增，用于 UI 展示此次造成的实际最终伤害（包含溢出）
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

// [Fix 3.5] 严格化 activeSlot 类型
export interface SystemTempState {
  activeMealType: MealType;
  isBuilding: boolean;
  basket: FoodItem[];
  isShaking: boolean;
  isDamaged: boolean;
  searchResetTrigger: number;
  activeSlot: SlotType | null; // [Fixed] Now strictly SlotType
  selectedHistoryDate: string | null;
  selectedItem: FoodItem | null;
  unlockedAchievement: Achievement | null;
  selectedLog: FoodLog | null;
  pendingItem?: FoodItem;
  floatingTexts: FloatingText[];
}

export interface FloatingText {
  id: number;
  text: string;
  type: 'DAMAGE' | 'HEAL' | 'CRIT' | 'BLOCK' | 'EXP';
  x: number; // 相对坐标 0-100
  y: number; // 相对坐标 0-100
}

export interface ModalState {
  addFood: boolean;
  quantity: boolean;
  levelUp: boolean;
  achievements: boolean;
  unlock: boolean;
  onboarding: boolean;
  itemDetail: boolean;
  equipmentSwap: boolean;
  historyDetail: boolean;
  logDetail: boolean;
  hpHistory: boolean;
  questBoard: boolean;
  skillTree: boolean;
  npcGuide: boolean;
  settings: boolean;
}
