import type { Race, Monster, NPC } from '@/types';

// 种族数据
export const RACES: Record<string, Race> = {
  HUMAN: { name: '人类', icon: '🧑‍', desc: '适应力强的均衡种族', bonus: '全属性均衡成长', prefixes: ['皇家', '老式', '秘制', '家乡', '骑士', '帝国', '修道院'], growth: { str: 1.10, agi: 1.10, vit: 1.10 } },
  ELF: { name: '精灵', icon: '🧝‍♀️', desc: '森林之子，轻盈优雅', bonus: '高敏捷，低力量', prefixes: ['月光', '森林', '晨露', '星辰', '自然', '远古', '世界树'], growth: { str: 0.95, agi: 1.30, vit: 1.00 } },
  ORC: { name: '兽人', icon: '🧟‍♂️', desc: '力量至上，热血沸腾', bonus: '高力量，低敏捷', prefixes: ['蛮荒', '狂暴', '巨魔', '血腥', '战歌', '碎骨', '雷霆'], growth: { str: 1.30, agi: 0.95, vit: 1.05 } },
  DWARF: { name: '矮人', icon: '🧔', desc: '坚如磐石，豪饮佳酿', bonus: '高体质，高力量', prefixes: ['岩石', '熔炉', '精钢', '深渊', '黑铁', '山丘', '符文'], growth: { str: 1.15, agi: 0.90, vit: 1.30 } }
};

// 种族导师 NPC
export const RACE_NPCS: Record<string, NPC> = {
  HUMAN: {
    name: '亚瑟·光辉',
    title: '王国骑士长',
    icon: '🛡️',
    color: 'text-blue-600',
    dialogue: ["新兵，欢迎来到讨伐战场！"]
  },
  ELF: {
    name: '艾琳娜·月语',
    title: '月之大祭司',
    icon: '🌙',
    color: 'text-green-600',
    dialogue: ["愿月光指引你的饮食之路。"]
  },
  ORC: {
    name: '格罗姆·咆哮',
    title: '部落督军',
    icon: '🪓',
    color: 'text-red-700',
    dialogue: ["力量！我们需要更多的肉！"]
  },
  DWARF: {
    name: '穆拉丁·铜须',
    title: '酒馆老板',
    icon: '🍺',
    color: 'text-orange-700',
    dialogue: ["这就是生活！再来一杯！"]
  }
};

// 怪物数据
export const MONSTERS: Monster[] = [
  // 均衡型
  { name: '暴食史莱姆', icon: '💧', weakness: '均衡饮食', weaknessType: 'BALANCED', desc: '普通的贪吃怪物' },
  { name: '深渊巨口', icon: '🦈', weakness: '海鲜/白肉', weaknessType: 'BALANCED', desc: '喜欢吞噬一切' },
  { name: '熔岩暴龙', icon: '🦖', weakness: '多喝水', weaknessType: 'BALANCED', desc: '体内燃烧着火焰' },

  // 惩罚型 (针对高糖)
  { name: '糖霜魔像', icon: '⛄', weakness: '忌糖/低碳', weaknessType: 'LOW_CARB', desc: '昨日糖分摄入过高生成的怪物，必须断糖！' },
  { name: '碳水巨像', icon: '🗿', weakness: '低碳水', weaknessType: 'LOW_CARB', desc: '由过剩的淀粉堆积而成，硬度极高' },

  // 惩罚型 (针对高脂)
  { name: '油泥软怪', icon: '🦠', weakness: '忌油/低脂', weaknessType: 'LOW_FAT', desc: '昨日油脂摄入过高生成的怪物，物理攻击无效' },
  { name: '油脂飞龙', icon: '🐉', weakness: '低脂饮食', weaknessType: 'LOW_FAT', desc: '喷吐着高温油脂，非常危险' },

  // 惩罚型 (针对低蛋白/虚弱)
  { name: '饥饿幽灵', icon: '👻', weakness: '需肉/高蛋白', weaknessType: 'HIGH_PRO', desc: '昨日蛋白质不足引来的恶灵，渴望肌肉' },
  { name: '荒野暴徒', icon: '🐗', weakness: '红肉/高蛋白', weaknessType: 'HIGH_PRO', desc: '只有吃得像个战士才能击败它' },
];

export const TAG_DEFS = {
  HIGH_SUGAR: { label: '高糖', icon: '🍬', desc: '容易导致血糖飙升' },
  HIGH_FAT: { label: '高油', icon: '🛢️', desc: '脂肪含量高' },
  HIGH_SODIUM: { label: '高盐', icon: '🧂', desc: '钠含量过高' },
  HIGH_CARB: { label: '高碳', icon: '🍚', desc: '碳水化合物丰富' },
  HIGH_PRO: { label: '高蛋白', icon: '💪', desc: '增肌首选' },
  CLEAN: { label: '纯净', icon: '✨', desc: '无添加健康' }
};

// 扩充食物库 - V2.2 Expanded
export const RACE_DEFAULT_FOODS: Record<string, any[]> = {
  HUMAN: [
    { name: '全麦面包', category: 'STAPLE', cals: 150, p: 6, c: 25, f: 2, unit: '2片', grams: 60, icon: '🍞', tags: ['HIGH_CARB'] },
    { name: '烤鸡胸肉', category: 'MEAT', cals: 165, p: 31, c: 0, f: 3.6, unit: '1块', grams: 150, icon: '🍗', tags: ['HIGH_PRO', 'CLEAN'] },
    { name: '炒土豆丝', category: 'DISH', cals: 120, p: 2, c: 18, f: 5, unit: '1盘', grams: 200, icon: '🥔', tags: ['HIGH_CARB'] },
    { name: '番茄炒蛋', category: 'DISH', cals: 200, p: 12, c: 8, f: 14, unit: '1盘', grams: 250, icon: '🍅', tags: ['BALANCED'] },
    { name: '米饭', category: 'STAPLE', cals: 230, p: 5, c: 50, f: 0.5, unit: '1碗', grams: 200, icon: '🍚', tags: ['HIGH_CARB'] },
    { name: '牛奶', category: 'DRINK', cals: 130, p: 6, c: 10, f: 7, unit: '1杯', grams: 250, icon: '🥛', tags: ['BALANCED'] },
    { name: '苹果', category: 'VEG', cals: 50, p: 0, c: 14, f: 0, unit: '1个', grams: 150, icon: '🍎', tags: ['CLEAN'] },
    { name: '牛肉面', category: 'STAPLE', cals: 550, p: 25, c: 70, f: 20, unit: '1碗', grams: 400, icon: '🍜', tags: ['HIGH_CARB', 'HIGH_SODIUM'] },
    { name: '燕麦粥', category: 'STAPLE', cals: 150, p: 5, c: 27, f: 3, unit: '1碗', grams: 200, icon: '🥣', tags: ['CLEAN', 'HIGH_CARB'] },
    { name: '三明治', category: 'STAPLE', cals: 300, p: 12, c: 30, f: 10, unit: '1个', grams: 180, icon: '🥪', tags: ['BALANCED'] },
    { name: '黑咖啡', category: 'DRINK', cals: 5, p: 0, c: 1, f: 0, unit: '1杯', grams: 250, icon: '☕', tags: ['CLEAN'] },
    { name: '煎饺', category: 'STAPLE', cals: 400, p: 10, c: 45, f: 18, unit: '1份', grams: 200, icon: '🥟', tags: ['HIGH_CARB', 'HIGH_FAT'] }
  ],
  ELF: [
    { name: '精灵面包', category: 'STAPLE', cals: 200, p: 5, c: 35, f: 4, unit: '1块', grams: 80, icon: '🍪', tags: ['HIGH_CARB'] },
    { name: '森林沙拉', category: 'VEG', cals: 80, p: 3, c: 15, f: 1, unit: '1盘', grams: 250, icon: '🥬', tags: ['CLEAN'], isComposite: true },
    { name: '清泉水', category: 'DRINK', cals: 0, p: 0, c: 0, f: 0, unit: '1杯', grams: 300, icon: '💧', tags: ['CLEAN'] },
    { name: '坚果拼盘', category: 'SNACK', cals: 300, p: 10, c: 15, f: 25, unit: '1把', grams: 50, icon: '🌰', tags: ['HIGH_FAT', 'CLEAN'] },
    { name: '蓝莓优格', category: 'SNACK', cals: 150, p: 8, c: 20, f: 4, unit: '1碗', grams: 150, icon: '🫐', tags: ['CLEAN'] },
    { name: '蘑菇汤', category: 'DISH', cals: 120, p: 4, c: 10, f: 6, unit: '1碗', grams: 250, icon: '🍄', tags: ['CLEAN'] },
    { name: '花蜜茶', category: 'DRINK', cals: 40, p: 0, c: 10, f: 0, unit: '1杯', grams: 200, icon: '🍵', tags: ['HIGH_SUGAR'] },
    { name: '水果塔', category: 'SNACK', cals: 250, p: 3, c: 40, f: 10, unit: '1个', grams: 120, icon: '🥧', tags: ['HIGH_SUGAR'] },
    { name: '鳄梨', category: 'VEG', cals: 160, p: 2, c: 9, f: 15, unit: '1个', grams: 100, icon: '🥑', tags: ['HIGH_FAT', 'CLEAN'] },
    { name: '玉米', category: 'STAPLE', cals: 100, p: 3, c: 20, f: 1, unit: '1根', grams: 150, icon: '🌽', tags: ['CLEAN', 'HIGH_CARB'] }
  ],
  ORC: [
    { name: '烤牛排', category: 'MEAT', cals: 450, p: 40, c: 0, f: 30, unit: '1块', grams: 250, icon: '🥩', tags: ['HIGH_PRO', 'HIGH_FAT'] },
    { name: '大鸡腿', category: 'MEAT', cals: 300, p: 25, c: 0, f: 20, unit: '1个', grams: 200, icon: '🍗', tags: ['HIGH_PRO', 'HIGH_FAT'] },
    { name: '肉汤', category: 'DISH', cals: 500, p: 35, c: 20, f: 30, unit: '1碗', grams: 400, icon: '🍲', tags: ['HIGH_FAT', 'HIGH_SODIUM'] },
    { name: '烤全羊', category: 'MEAT', cals: 800, p: 60, c: 0, f: 60, unit: '1份', grams: 500, icon: '🍖', tags: ['HIGH_PRO', 'HIGH_FAT'] },
    { name: '生鱼片', category: 'MEAT', cals: 180, p: 25, c: 0, f: 8, unit: '1盘', grams: 200, icon: '🐟', tags: ['HIGH_PRO'] },
    { name: '汉堡', category: 'STAPLE', cals: 600, p: 25, c: 50, f: 30, unit: '1个', grams: 300, icon: '🍔', tags: ['HIGH_FAT', 'HIGH_CARB'] },
    { name: '炸鸡块', category: 'SNACK', cals: 400, p: 20, c: 15, f: 25, unit: '1份', grams: 200, icon: '🍘', tags: ['HIGH_FAT'] },
    { name: '培根', category: 'MEAT', cals: 200, p: 10, c: 1, f: 18, unit: '3片', grams: 50, icon: '🥓', tags: ['HIGH_FAT'] },
    { name: '披萨', category: 'STAPLE', cals: 700, p: 30, c: 80, f: 25, unit: '半个', grams: 300, icon: '🍕', tags: ['HIGH_CARB', 'HIGH_SODIUM'] }
  ],
  DWARF: [
    { name: '黑啤酒', category: 'DRINK', cals: 150, p: 1, c: 12, f: 0, unit: '1杯', grams: 330, icon: '🍺', tags: ['HIGH_CARB'] },
    { name: '黑麦面包', category: 'STAPLE', cals: 250, p: 8, c: 45, f: 3, unit: '1块', grams: 120, icon: '🥖', tags: ['HIGH_CARB'] },
    { name: '烤猪肘', category: 'MEAT', cals: 600, p: 45, c: 0, f: 45, unit: '1份', grams: 350, icon: '🍖', tags: ['HIGH_FAT', 'HIGH_PRO'] },
    { name: '咸鱼干', category: 'SNACK', cals: 200, p: 40, c: 0, f: 5, unit: '1条', grams: 100, icon: '🐟', tags: ['HIGH_PRO', 'HIGH_SODIUM'] },
    { name: '奶酪', category: 'SNACK', cals: 120, p: 8, c: 1, f: 10, unit: '1块', grams: 30, icon: '🧀', tags: ['HIGH_FAT', 'HIGH_PRO'] },
    { name: '香肠', category: 'MEAT', cals: 300, p: 15, c: 2, f: 25, unit: '1根', grams: 100, icon: '🌭', tags: ['HIGH_FAT', 'HIGH_SODIUM'] },
    { name: '炸薯条', category: 'SNACK', cals: 350, p: 4, c: 45, f: 18, unit: '1份', grams: 150, icon: '🍟', tags: ['HIGH_FAT', 'HIGH_CARB'] },
    { name: '烈酒', category: 'DRINK', cals: 250, p: 0, c: 10, f: 0, unit: '1杯', grams: 100, icon: '🥃', tags: ['HIGH_SUGAR'] }
  ]
};
