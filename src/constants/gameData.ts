import type { Race, Monster } from '@/types';

// 种族数据
export const RACES: Record<string, Race> = {
  HUMAN: { name: '人类', icon: '🧑‍', desc: '适应力强的均衡种族', bonus: '全属性均衡成长', prefixes: ['皇家', '老式', '秘制', '家乡', '骑士'], growth: { str: 1.10, agi: 1.10, vit: 1.10 } },
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

// 种族默认食物
export const RACE_DEFAULT_FOODS: Record<string, any[]> = {
  HUMAN: [
    { name: '皇家全麦面包 (全麦面包)', category: 'STAPLE', cals: 150, p: 6, c: 25, f: 2, unit: '2片', grams: 60, icon: '🍞', isComposite: false, usageCount: 5, tags: ['HIGH_CARB'] },
    { name: '骑士烤鸡胸 (鸡胸肉)', category: 'MEAT', cals: 165, p: 31, c: 0, f: 3.6, unit: '1块', grams: 150, icon: '🍗', isComposite: false, usageCount: 5, tags: ['HIGH_PRO'] },
    { name: '王国特供沙拉 (蔬菜沙拉)', category: 'VEG', cals: 120, p: 2, c: 10, f: 5, unit: '1碗', grams: 200, icon: '🥗', isComposite: true, usageCount: 3, tags: ['CLEAN'] }
  ],
  ELF: [
    { name: '月光兰巴斯 (精灵面包)', category: 'STAPLE', cals: 200, p: 5, c: 35, f: 4, unit: '1块', grams: 80, icon: '🍪', isComposite: false, usageCount: 5, tags: ['HIGH_CARB'] },
    { name: '晨露森林沙拉 (混合蔬菜)', category: 'VEG', cals: 80, p: 3, c: 15, f: 1, unit: '1盘', grams: 250, icon: '🥬', isComposite: true, usageCount: 5, tags: ['CLEAN'] },
    { name: '星辰甘露 (清泉水)', category: 'DRINK', cals: 0, p: 0, c: 0, f: 0, unit: '1杯', grams: 300, icon: '💧', isComposite: false, usageCount: 5, tags: ['CLEAN'] }
  ],
  ORC: [
    { name: '蛮荒烤肉排 (牛排)', category: 'MEAT', cals: 450, p: 40, c: 0, f: 30, unit: '1块', grams: 250, icon: '🥩', isComposite: false, usageCount: 5, tags: ['HIGH_PRO', 'HIGH_FAT'] },
    { name: '战歌巨兽腿 (鸡腿)', category: 'MEAT', cals: 300, p: 25, c: 0, f: 20, unit: '1个', grams: 200, icon: '🍗', isComposite: false, usageCount: 5, tags: ['HIGH_PRO', 'HIGH_FAT'] },
    { name: '狂暴大乱炖 (肉汤)', category: 'DISH', cals: 500, p: 35, c: 20, f: 30, unit: '1碗', grams: 400, icon: '🍲', isComposite: true, usageCount: 3, tags: ['HIGH_FAT', 'HIGH_SODIUM'] }
  ],
  DWARF: [
    { name: '深渊黑啤酒 (啤酒)', category: 'DRINK', cals: 150, p: 1, c: 12, f: 0, unit: '1杯', grams: 330, icon: '🍺', isComposite: false, usageCount: 5, tags: ['HIGH_CARB'] },
    { name: '岩石硬面包 (黑麦面包)', category: 'STAPLE', cals: 250, p: 8, c: 45, f: 3, unit: '1块', grams: 120, icon: '🥖', isComposite: false, usageCount: 5, tags: ['HIGH_CARB'] },
    { name: '熔炉烤猪肘 (猪肘)', category: 'MEAT', cals: 600, p: 45, c: 0, f: 45, unit: '1份', grams: 350, icon: '🍖', isComposite: false, usageCount: 3, tags: ['HIGH_FAT', 'HIGH_PRO'] }
  ]
};
