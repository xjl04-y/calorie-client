// 核心数据接口定义 - V2.0 Enhanced

export type RaceType = 'HUMAN' | 'ELF' | 'ORC' | 'DWARF';
export type SlotType = 'HEAD' | 'BODY' | 'LEGS' | 'WEAPON' | 'OFFHAND' | 'BACK' | 'ACCESSORY';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type Gender = 'MALE' | 'FEMALE';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

// 新增：体重记录接口
export interface WeightRecord {
  date: string; // YYYY-MM-DD
  weight: number;
}

// 种族定义
export interface Race {
  name: string;
  icon: string;
  desc: string;
  bonus: string;
  prefixes: string[];
  growth: { str: number; agi: number; vit: number };
}

// 用户状态
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
  // 新增：体重历史 (V2.1 Feature)
  weightHistory: WeightRecord[];
  age: number;
  heroCurrentHp: number;
  heroMaxHp: number;
  equipped: Record<SlotType, number | null>;
}

// 基础食物物品接口 (DB 中存储的静态数据)
export interface FoodItem {
  id: number | string; // 兼容 string ID
  name: string;
  originalName?: string;
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
  usageCount?: number;
}

// 战斗日志接口 (继承自 FoodItem，增加动态状态)
export interface FoodLog extends FoodItem {
  mealType: MealType;
  quantity?: number;
  multiplier?: number; // 伤害倍率
  comboCount?: number; // 新增：连击数
  timestamp: string;   // ISO String

  // 战斗/RPG 结算相关
  damageTaken?: number;
  blocked?: number;
  dodged?: boolean;
  gainedExp?: number;
  healed?: number;

  ingredients?: FoodItem[]; // 复合食物的成分
}

// 怪物/Boss
export interface Monster {
  name: string;
  icon: string;
  weakness: string;
  weaknessType: string;
  desc?: string;
}

// 成就/物品
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

// NPC 接口定义
export interface NPC {
  name: string;
  title: string;
  icon: string;
  color: string;
  dialogue: string[];
}
