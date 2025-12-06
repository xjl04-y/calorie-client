// 核心数据接口定义

export type RaceType = 'HUMAN' | 'ELF' | 'ORC' | 'DWARF';
export type SlotType = 'HEAD' | 'BODY' | 'LEGS' | 'WEAPON' | 'OFFHAND' | 'BACK' | 'ACCESSORY';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export type Gender = 'MALE' | 'FEMALE';

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
  // 新增：头像自定义支持
  avatarType?: 'SEED' | 'CUSTOM';
  customAvatar?: string; // Base64 字符串
  race: RaceType;
  gender: Gender;
  height: number;
  weight: number;
  age: number;
  heroCurrentHp: number;
  heroMaxHp: number;
  equipped: Record<SlotType, number | null>;
}

// 食物记录
export interface FoodLog {
  id: number;
  name: string;
  calories: number;
  p: number;
  c: number;
  f: number;
  grams: number;
  quantity?: number;
  multiplier?: number;
  unit?: string;
  mealType: MealType;
  isComposite?: boolean;
  icon?: string;
  tags?: string[];
  timestamp?: string;
  // 战斗相关
  damageTaken?: number;
  blocked?: number;
  dodged?: boolean;
  ingredients?: any[];
  // 数据库相关
  category?: string;
  usageCount?: number;
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
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  flavor: string;
  stats: string;
  combatPower: number;
  bonusBMR: number;
}

// 新增：NPC 接口定义
export interface NPC {
  name: string;
  title: string;
  icon: string;
  color: string;
  dialogue: string[]; // 引导话术
}
