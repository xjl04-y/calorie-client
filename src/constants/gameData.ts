import type { Race, Monster } from '@/types';

// 种族数据
export const RACES: Record<string, Race> = {
  HUMAN: { name: '人类', icon: '🧑‍🚀', desc: '适应力强的均衡种族', bonus: '全属性均衡成长', prefixes: ['皇家', '老式', '秘制', '家乡', '骑士'], growth: { str: 1.10, agi: 1.10, vit: 1.10 } },
  ELF: { name: '精灵', icon: '🧝‍♀️', desc: '森林之子，轻盈优雅', bonus: '高敏捷，低力量', prefixes: ['月光', '森林', '晨露', '星辰', '自然'], growth: { str: 0.95, agi: 1.30, vit: 1.00 } },
  ORC: { name: '兽人', icon: '🧟‍♂️', desc: '力量至上，热血沸腾', bonus: '高力量，低敏捷', prefixes: ['蛮荒', '狂暴', '巨魔', '血腥', '战歌'], growth: { str: 1.30, agi: 0.95, vit: 1.05 } },
  DWARF: { name: '矮人', icon: '🧔', desc: '坚如磐石，豪饮佳酿', bonus: '高体质，高力量', prefixes: ['岩石', '熔炉', '精钢', '深渊', '黑铁'], growth: { str: 1.15, agi: 0.90, vit: 1.30 } }
};

// 怪物数据
export const MONSTERS: Monster[] = [
  { name: '暴食史莱姆', icon: '💧', weakness: '均衡饮食', weaknessType: 'BALANCED' },
  { name: '糖霜魔像', icon: '⛄', weakness: '忌糖/低碳', weaknessType: 'LOW_CARB', desc: '反击: 高糖食物会触发糖分冲击' },
  { name: '油泥软怪', icon: '🦠', weakness: '忌油/低脂', weaknessType: 'LOW_FAT', desc: '反击: 油腻食物会滑倒英雄' },
  { name: '饥饿幽灵', icon: '👻', weakness: '需肉/高蛋白', weaknessType: 'HIGH_PRO', desc: '反击: 只有蛋白质能平息怨念' },
  { name: '碳水巨像', icon: '🗿', weakness: '低碳水', weaknessType: 'LOW_CARB' },
  { name: '油脂飞龙', icon: '🐉', weakness: '低脂', weaknessType: 'LOW_FAT' },
  { name: '深渊巨口', icon: '🦈', weakness: '海鲜', weaknessType: 'BALANCED' },
  { name: '荒野暴徒', icon: '🐗', weakness: '肉类', weaknessType: 'HIGH_PRO' },
  { name: '熔岩暴龙', icon: '🦖', weakness: '多喝水', weaknessType: 'BALANCED' },
  { name: '混沌观察者', icon: '👁️', weakness: '维生素', weaknessType: 'BALANCED' }
];

export const TAG_DEFS = {
  HIGH_SUGAR: { label: '高糖', icon: '🍬', desc: '容易导致血糖飙升' },
  HIGH_FAT: { label: '高油', icon: '🛢️', desc: '脂肪含量高' },
  HIGH_SODIUM: { label: '高盐', icon: '🧂', desc: '钠含量过高' },
  HIGH_CARB: { label: '高碳', icon: '🍚', desc: '碳水化合物丰富' },
  HIGH_PRO: { label: '高蛋白', icon: '💪', desc: '增肌首选' },
  CLEAN: { label: '纯净', icon: '✨', desc: '无添加健康' }
};

// ...其余常量（MINIONS, RACE_DEFAULT_FOODS）可以按需在此补充
