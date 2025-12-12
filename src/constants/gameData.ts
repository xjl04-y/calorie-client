import type { Race, Monster, SkillNode, Quest, NpcConfig, ShopItem } from '@/types';

// [New V4.0] 商店商品配置
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'item_rebirth_potion',
    name: '转生药水',
    desc: '洗去凡尘，重塑肉身。允许你重新选择种族并返还所有技能点。',
    icon: '🧪',
    price: 1000,
    effect: 'REBIRTH'
  },
  {
    id: 'item_hp_potion',
    name: '生命药剂',
    desc: '恢复 50 点 HP。',
    icon: '🍷',
    price: 100,
    effect: 'HEAL',
    value: 50
  },
  {
    id: 'item_exp_scroll',
    name: '经验卷轴',
    desc: '获得 100 点经验值。',
    icon: '📜',
    price: 300,
    effect: 'EXP',
    value: 100
  }
];

export const RACE_SKILL_TREES: Record<string, SkillNode[]> = {
  HUMAN: [
    { id: 'H_BMR_1', tier: 1, name: '生存本能', desc: '基础代谢(BMR)小幅永久提升', icon: '🔥', maxLevel: 5, reqLevel: 1, cost: 1, type: 'PASSIVE_BMR', effectParams: { target: 'bmr', base: 20, scale: 20 } },
    { id: 'H_STUDY_1', tier: 1, name: '快速学习', desc: '战斗获得经验值增加', icon: '📖', maxLevel: 3, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'exp_rate', base: 0.05, scale: 0.05 } },
    { id: 'H_COOK_1', tier: 2, parentId: 'H_BMR_1', name: '野战烹饪', desc: '自制食物效果提升', icon: '🍳', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'cook_exp', base: 0.1, scale: 0.05 } },
    { id: 'H_DEF_1', tier: 2, parentId: 'H_BMR_1', name: '盾牌训练', desc: '格挡值百分比提升', icon: '🛡️', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'block_pct', base: 0.05, scale: 0.03 } },
    { id: 'H_ATK_1', tier: 2, parentId: 'H_STUDY_1', name: '弱点洞察', desc: '暴击率提升', icon: '👁️', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'crit_rate', base: 0.05, scale: 0.02 } },
    { id: 'H_ACTIVE_1', tier: 3, parentId: 'H_DEF_1', name: '圣光祈祷', desc: '主动：下一次进食转化为回复且双倍经验 (CD:12h)', icon: '🙏', maxLevel: 1, reqLevel: 5, reqCombatPower: 1000, cost: 3, type: 'ACTIVE_BUFF', effectParams: { target: 'HUMAN_PRAYER', base: 1, scale: 0 } },
    { id: 'H_STR_2', tier: 3, parentId: 'H_ATK_1', name: '骑士精神', desc: '全属性加成', icon: '⚔️', maxLevel: 3, reqLevel: 5, reqCombatPower: 800, cost: 3, type: 'PASSIVE_STAT', effectParams: { target: 'all_stat', base: 0.02, scale: 0.02 } },
    { id: 'H_ULT_1', tier: 4, parentId: 'H_ACTIVE_1', name: '英雄赞歌', desc: '全属性大幅提升 10%，代谢大幅提升', icon: '👑', maxLevel: 1, reqLevel: 10, reqCombatPower: 3000, cost: 5, type: 'PASSIVE_STAT', effectParams: { target: 'all_stat', base: 0.1, scale: 0 } }
  ],
  ELF: [
    { id: 'E_AGI_1', tier: 1, name: '风之子', desc: '敏捷属性(AGI)提升', icon: '🍃', maxLevel: 5, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'agi_mult', base: 0.05, scale: 0.02 } },
    { id: 'E_NATURE_1', tier: 1, name: '自然亲和', desc: '蔬菜水果类食物效果提升', icon: '🍏', maxLevel: 3, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'veg_exp', base: 0.1, scale: 0.05 } },
    { id: 'E_DODGE_1', tier: 2, parentId: 'E_AGI_1', name: '幻影步', desc: '闪避率直接提升', icon: '🌫️', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'dodge_flat', base: 0.02, scale: 0.01 } },
    { id: 'E_ACC_1', tier: 2, parentId: 'E_AGI_1', name: '鹰眼', desc: '暴击率提升', icon: '🏹', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'crit_rate', base: 0.05, scale: 0.03 } },
    { id: 'E_REC_1', tier: 2, parentId: 'E_NATURE_1', name: '光合作用', desc: '日间进食额外回复HP', icon: '☀️', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'day_heal', base: 5, scale: 5 } },
    { id: 'E_ACTIVE_1', tier: 3, parentId: 'E_ACC_1', name: '自然专注', desc: '主动：必定暴击且无视抗性 (CD:8h)', icon: '🎯', maxLevel: 1, reqLevel: 5, reqCombatPower: 1000, cost: 3, type: 'ACTIVE_BUFF', effectParams: { target: 'ELF_FOCUS', base: 1, scale: 0 } },
    { id: 'E_ULT_1', tier: 4, parentId: 'E_ACTIVE_1', name: '月神降临', desc: '闪避率上限突破至 80%，全属性+5%', icon: '🌙', maxLevel: 1, reqLevel: 10, reqCombatPower: 3000, cost: 5, type: 'PASSIVE_STAT', effectParams: { target: 'dodge_cap', base: 0.2, scale: 0 } }
  ],
  ORC: [
    { id: 'O_STR_1', tier: 1, name: '蛮力', desc: '力量属性(STR)提升', icon: '💪', maxLevel: 5, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'str_mult', base: 0.05, scale: 0.03 } },
    { id: 'O_EAT_1', tier: 1, name: '暴饮暴食', desc: '每餐可摄入热量上限提升', icon: '🍖', maxLevel: 3, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'max_eat', base: 100, scale: 50 } },
    { id: 'O_MEAT_1', tier: 2, parentId: 'O_STR_1', name: '肉食者', desc: '肉类食物回复量大幅提升', icon: '🥩', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'meat_heal', base: 10, scale: 10 } },
    { id: 'O_RES_1', tier: 2, parentId: 'O_STR_1', name: '硬皮', desc: '受到反击伤害固定减少', icon: '🦏', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'dmg_reduce', base: 5, scale: 5 } },
    { id: 'O_ACTIVE_1', tier: 3, parentId: 'O_MEAT_1', name: '血之狂怒', desc: '主动：伤害300%，但扣除50HP (CD:16h)', icon: '🩸', maxLevel: 1, reqLevel: 5, reqCombatPower: 1200, cost: 3, type: 'ACTIVE_BUFF', effectParams: { target: 'ORC_RAGE', base: 1, scale: 0 } },
    { id: 'O_CRIT_1', tier: 3, parentId: 'O_RES_1', name: '致命一击', desc: '暴击伤害倍率提升', icon: '🔨', maxLevel: 3, reqLevel: 5, reqCombatPower: 1000, cost: 3, type: 'PASSIVE_STAT', effectParams: { target: 'crit_dmg', base: 0.2, scale: 0.1 } },
    { id: 'O_ULT_1', tier: 4, parentId: 'O_ACTIVE_1', name: '不灭战魂', desc: 'HP低于30%时伤害翻倍，免疫致死伤害1次', icon: '💀', maxLevel: 1, reqLevel: 10, reqCombatPower: 3000, cost: 5, type: 'PASSIVE_STAT', effectParams: { target: 'berserk', base: 1, scale: 0 } }
  ],
  DWARF: [
    { id: 'D_VIT_1', tier: 1, name: '岩石体魄', desc: '体质属性(VIT)提升', icon: '🗿', maxLevel: 5, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'vit_mult', base: 0.05, scale: 0.03 } },
    { id: 'D_DIG_1', tier: 1, name: '挖掘', desc: '更有几率发现稀有食物', icon: '⛏️', maxLevel: 3, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'find_rare', base: 0.05, scale: 0.05 } },
    { id: 'D_DRINK_1', tier: 2, parentId: 'D_VIT_1', name: '千杯不醉', desc: '饮品类也能提供格挡值', icon: '🍺', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'drink_block', base: 2, scale: 2 } },
    { id: 'D_GOLD_1', tier: 2, parentId: 'D_DIG_1', name: '寻宝猎人', desc: '任务奖励经验提升', icon: '💰', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'quest_exp', base: 0.1, scale: 0.05 } },
    { id: 'D_ACTIVE_1', tier: 3, parentId: 'D_DRINK_1', name: '酒仙护体', desc: '主动：必定格挡反击并吸血 (CD:10h)', icon: '🍻', maxLevel: 1, reqLevel: 5, reqCombatPower: 1100, cost: 3, type: 'ACTIVE_BUFF', effectParams: { target: 'DWARF_DRINK', base: 1, scale: 0 } },
    { id: 'D_ULT_1', tier: 4, parentId: 'D_ACTIVE_1', name: '山丘之王', desc: '格挡成功时反弹 50% 伤害，体质+10%', icon: '🏔️', maxLevel: 1, reqLevel: 10, reqCombatPower: 3000, cost: 5, type: 'PASSIVE_STAT', effectParams: { target: 'reflect', base: 0.5, scale: 0 } }
  ]
};

export const QUEST_POOL: Omit<Quest, 'status' | 'current'>[] = [
  { id: 'q_d1', title: '轻度补给', desc: '记录 1 次任意食物', rarity: 'D', target: 1, type: 'COUNT', rewardExp: 30 },
  { id: 'q_d2', title: '多喝热水', desc: '记录 2 次饮水', rarity: 'D', target: 2, type: 'WATER', rewardExp: 40 },
  { id: 'q_d3', title: '小试牛刀', desc: '造成 500 点热量伤害', rarity: 'D', target: 500, type: 'CALORIE_CONTROL', rewardExp: 35 },
  { id: 'q_d4', title: '早餐打卡', desc: '记录 1 次早餐', rarity: 'D', target: 1, type: 'COUNT', rewardExp: 30 },
  { id: 'q_d5', title: '水果时间', desc: '记录 1 次水果/零食', rarity: 'D', target: 1, type: 'COUNT', rewardExp: 30 },
  { id: 'q_d6', title: '奶制品摄入', desc: '记录 1 次奶类/酸奶', rarity: 'D', target: 1, type: 'COUNT', rewardExp: 35 },
  { id: 'q_c1', title: '蛋白质补充', desc: '摄入 60g 蛋白质', rarity: 'C', target: 60, type: 'PROTEIN', rewardExp: 60 },
  { id: 'q_c2', title: '蔬菜猎人', desc: '记录 2 份蔬菜', rarity: 'C', target: 2, type: 'VEG', rewardExp: 50 },
  { id: 'q_c3', title: '均衡饮食', desc: '三种主要营养素都摄入至少 10g', rarity: 'C', target: 1, type: 'COUNT', rewardExp: 55 },
  { id: 'q_c4', title: '拒绝油腻', desc: '记录 2 次低脂食物', rarity: 'C', target: 2, type: 'LOW_FAT', rewardExp: 60 },
  { id: 'q_c5', title: '膳食纤维', desc: '记录 3 次蔬菜或水果', rarity: 'C', target: 3, type: 'VEG', rewardExp: 65 },
  { id: 'q_b1', title: '控糖行动', desc: '今日不摄入高糖食物', rarity: 'B', target: 3, type: 'LOW_CARB', rewardExp: 80 },
  { id: 'q_b2', title: '清淡饮食', desc: '今日不摄入高油食物', rarity: 'B', target: 3, type: 'LOW_FAT', rewardExp: 80 },
  { id: 'q_b3', title: '能量控制', desc: '单餐热量不超过 600 kcal (记录2次)', rarity: 'B', target: 2, type: 'CALORIE_CONTROL', rewardExp: 90 },
  { id: 'q_b4', title: '海鲜大餐', desc: '摄入 1 次鱼虾蟹贝类 (高蛋白且低脂)', rarity: 'B', target: 1, type: 'PROTEIN', rewardExp: 85 },
  { id: 'q_a1', title: '肌肉狂热', desc: '摄入 120g 蛋白质', rarity: 'A', target: 120, type: 'PROTEIN', rewardExp: 150 },
  { id: 'q_a2', title: '热量赤字', desc: '总热量控制在 1800 以内 (需至少记录3餐)', rarity: 'A', target: 3, type: 'CALORIE_CONTROL', rewardExp: 200 },
  { id: 'q_a3', title: '完美一天', desc: '记录早中晚三餐且包含蔬菜', rarity: 'A', target: 3, type: 'VEG', rewardExp: 180 },
  { id: 'q_a4', title: '素食主义者', desc: '全天不摄入肉类但摄入足够蛋白质(>50g)', rarity: 'A', target: 50, type: 'PROTEIN', rewardExp: 160 },
  { id: 'q_s1', title: '神之代谢', desc: '记录 5 次饮水且无高糖摄入', rarity: 'S', target: 5, type: 'WATER', rewardExp: 300 },
  { id: 'q_s2', title: '泰坦之握', desc: '单日蛋白质超过 150g', rarity: 'S', target: 150, type: 'PROTEIN', rewardExp: 350 },
  { id: 'q_s3', title: '自然之怒', desc: '摄入 5 份不同的蔬菜/水果', rarity: 'S', target: 5, type: 'VEG', rewardExp: 320 },
  { id: 'q_ss1', title: '绝食暴徒 (慎用)', desc: '全天总热量低于 1000 (仅限减脂期)', rarity: 'SS', target: 1000, type: 'CALORIE_CONTROL', rewardExp: 500 },
  { id: 'q_ss2', title: '蛋白质之神', desc: '单日蛋白质超过 200g', rarity: 'SS', target: 200, type: 'PROTEIN', rewardExp: 600 },
  { id: 'q_ss3', title: '纯净圣体', desc: '记录 5 次食物且全部为「纯净」标签', rarity: 'SS', target: 5, type: 'VEG', rewardExp: 550 },
  { id: 'q_ss4', title: '流水光阴', desc: '单日饮水超过 10 次 (3L+)', rarity: 'SS', target: 10, type: 'WATER', rewardExp: 500 }
];

export const RACES: Record<string, Race> = {
  HUMAN: { name: '人类', icon: '🧑‍', desc: '适应力强的均衡种族', bonus: '全属性均衡成长', prefixes: ['皇家', '老式', '秘制', '家乡', '骑士', '帝国', '修道院'], growth: { str: 1.10, agi: 1.10, vit: 1.10 } },
  ELF: { name: '精灵', icon: '🧝‍♀️', desc: '森林之子，轻盈优雅', bonus: '高敏捷，低力量', prefixes: ['月光', '森林', '晨露', '星辰', '自然', '远古', '世界树'], growth: { str: 0.95, agi: 1.30, vit: 1.00 } },
  ORC: { name: '兽人', icon: '🧟‍♂️', desc: '力量至上，热血沸腾', bonus: '高力量，低敏捷', prefixes: ['蛮荒', '狂暴', '巨魔', '血腥', '战歌', '碎骨', '雷霆'], growth: { str: 1.30, agi: 0.95, vit: 1.05 } },
  DWARF: { name: '矮人', icon: '🧔', desc: '坚如磐石，豪饮佳酿', bonus: '高体质，高力量', prefixes: ['岩石', '熔炉', '精钢', '深渊', '黑铁', '山丘', '符文'], growth: { str: 1.15, agi: 0.90, vit: 1.30 } }
};

export const RACE_NPCS: Record<string, NpcConfig> = {
  HUMAN: { name: '莉安娜教官', title: '帝国骑士', icon: '👩‍✈️', greeting: '士兵！饮食也是战斗的一部分，保持纪律！' },
  ELF: { name: '艾瑞尔长老', title: '森林智者', icon: '🧝‍♂️', greeting: '年轻的旅人，愿自然之风指引你的饮食。' },
  ORC: { name: '格罗姆·地狱咆哮', title: '部落督军', icon: '👹', greeting: '吃肉！只有吃饱了才有力气粉碎敌人！' },
  DWARF: { name: '铜须·麦格尼', title: '铁炉堡王', icon: '🎅', greeting: '只要有啤酒和烤肉，就没有打不过的Boss！哈哈！' }
};

export const MONSTERS: Monster[] = [
  { name: '暴食史莱姆', icon: '💧', weakness: '均衡饮食', weaknessType: '均衡', desc: '普通的贪吃怪物' },
  { name: '深渊巨口', icon: '🦈', weakness: '海鲜/白肉', weaknessType: '均衡', desc: '喜欢吞噬一切' },
  { name: '熔岩暴龙', icon: '🦖', weakness: '多喝水', weaknessType: '均衡', desc: '体内燃烧着火焰' },
  { name: '糖霜魔像', icon: '⛄', weakness: '忌糖/低碳', weaknessType: '低碳', desc: '昨日糖分摄入过高生成的怪物，必须断糖！' },
  { name: '碳水巨像', icon: '🗿', weakness: '低碳水', weaknessType: '低碳', desc: '由过剩的淀粉堆积而成，硬度极高' },
  { name: '油泥软怪', icon: '🦠', weakness: '忌油/低脂', weaknessType: '低脂', desc: '昨日油脂摄入过高生成的怪物，物理攻击无效' },
  { name: '油脂飞龙', icon: '🐉', weakness: '低脂饮食', weaknessType: '低脂', desc: '喷吐着高温油脂，非常危险' },
  { name: '饥饿幽灵', icon: '👻', weakness: '需肉/高蛋白', weaknessType: '高蛋白', desc: '昨日蛋白质不足引来的恶灵，渴望肌肉' },
  { name: '荒野暴徒', icon: '🐗', weakness: '红肉/高蛋白', weaknessType: '高蛋白', desc: '只有吃得像个战士才能击败它' },
];

const BASE_TAGS = {
  高糖: { label: '高糖', icon: '🍬', desc: '容易导致血糖飙升' },
  高油: { label: '高油', icon: '🛢️', desc: '脂肪含量高' },
  高盐: { label: '高盐', icon: '🧂', desc: '钠含量过高' },
  高碳: { label: '高碳', icon: '🍚', desc: '碳水化合物丰富' },
  高蛋白: { label: '高蛋白', icon: '💪', desc: '增肌首选' },
  纯净: { label: '纯净', icon: '✨', desc: '无添加健康' },
  均衡: { label: '均衡', icon: '⚖️', desc: '营养比例完美' }
};

export const TAG_DEFS: Record<string, any> = {
  ...BASE_TAGS,
  HIGH_SUGAR: BASE_TAGS.高糖,
  HIGH_FAT: BASE_TAGS.高油,
  HIGH_SODIUM: BASE_TAGS.高盐,
  HIGH_CARB: BASE_TAGS.高碳,
  HIGH_PRO: BASE_TAGS.高蛋白,
  CLEAN: BASE_TAGS.纯净,
  BALANCED: BASE_TAGS.均衡
};

export const RACE_DEFAULT_FOODS: Record<string, any[]> = {
  HUMAN: [
    { name: '全麦面包', category: 'STAPLE', calories: 150, p: 6, c: 25, f: 2, unit: '2片', grams: 60, icon: '🍞', tags: ['高碳'] },
    { name: '烤鸡胸肉', category: 'MEAT', calories: 165, p: 31, c: 0, f: 3.6, unit: '1块', grams: 150, icon: '🍗', tags: ['高蛋白', '纯净'] },
    { name: '炒土豆丝', category: 'DISH', calories: 120, p: 2, c: 18, f: 5, unit: '1盘', grams: 200, icon: '🥔', tags: ['高碳'] },
    { name: '番茄炒蛋', category: 'DISH', calories: 200, p: 12, c: 8, f: 14, unit: '1盘', grams: 250, icon: '🍅', tags: ['均衡'] },
    { name: '米饭', category: 'STAPLE', calories: 230, p: 5, c: 50, f: 0.5, unit: '1碗', grams: 200, icon: '🍚', tags: ['高碳'] },
    { name: '牛奶', category: 'DRINK', calories: 130, p: 6, c: 10, f: 7, unit: '1杯', grams: 250, icon: '🥛', tags: ['均衡'] },
    { name: '苹果', category: 'SNACK', calories: 50, p: 0, c: 14, f: 0, unit: '1个', grams: 150, icon: '🍎', tags: ['纯净'] },
    { name: '牛肉面', category: 'DISH', calories: 550, p: 25, c: 60, f: 20, unit: '1碗', grams: 400, icon: '🍜', tags: ['高碳', '高盐'] },
    { name: '燕麦粥', category: 'STAPLE', calories: 150, p: 5, c: 25, f: 3, unit: '1碗', grams: 200, icon: '🥣', tags: ['纯净', '高碳'] },
    { name: '三文鱼刺身', category: 'MEAT', calories: 200, p: 22, c: 0, f: 12, unit: '1份', grams: 100, icon: '🍣', tags: ['高蛋白', '纯净'] }
  ],
  ELF: [
    { name: '精灵面包', category: 'STAPLE', calories: 200, p: 5, c: 35, f: 4, unit: '1块', grams: 80, icon: '🍪', tags: ['高碳'] },
    { name: '森林沙拉', category: 'VEG', calories: 80, p: 3, c: 15, f: 1, unit: '1盘', grams: 250, icon: '🥬', tags: ['纯净'], isComposite: true },
    { name: '清泉水', category: 'DRINK', calories: 0, p: 0, c: 0, f: 0, unit: '1杯', grams: 300, icon: '💧', tags: ['纯净'] },
    { name: '蓝莓优格', category: 'SNACK', calories: 150, p: 8, c: 20, f: 4, unit: '1碗', grams: 150, icon: '🫐', tags: ['纯净'] },
    { name: '全麦饼干', category: 'SNACK', calories: 120, p: 2, c: 20, f: 4, unit: '3片', grams: 30, icon: '🍘', tags: ['高碳'] },
    { name: '花蜜茶', category: 'DRINK', calories: 40, p: 0, c: 10, f: 0, unit: '1杯', grams: 200, icon: '🍵', tags: ['纯净'] },
    { name: '月光果实', category: 'SNACK', calories: 60, p: 1, c: 15, f: 0, unit: '1个', grams: 100, icon: '🍈', tags: ['纯净'] },
    { name: '坚果拼盘', category: 'SNACK', calories: 300, p: 10, c: 10, f: 25, unit: '1把', grams: 50, icon: '🥜', tags: ['高油', '纯净'] }
  ],
  ORC: [
    { name: '烤牛排', category: 'MEAT', calories: 450, p: 40, c: 0, f: 30, unit: '1块', grams: 250, icon: '🥩', tags: ['高蛋白', '高油'] },
    { name: '大鸡腿', category: 'MEAT', calories: 300, p: 25, c: 0, f: 20, unit: '1个', grams: 200, icon: '🍗', tags: ['高蛋白', '高油'] },
    { name: '汉堡', category: 'STAPLE', calories: 600, p: 25, c: 50, f: 30, unit: '1个', grams: 300, icon: '🍔', tags: ['高油', '高碳'] },
    { name: '炸鸡块', category: 'SNACK', calories: 400, p: 20, c: 15, f: 25, unit: '1份', grams: 200, icon: '🍘', tags: ['高油'] },
    { name: '烤鱼', category: 'MEAT', calories: 200, p: 30, c: 0, f: 8, unit: '1条', grams: 200, icon: '🐟', tags: ['高蛋白'] },
    { name: '战斧牛排', category: 'MEAT', calories: 800, p: 70, c: 0, f: 55, unit: '1份', grams: 400, icon: '🍖', tags: ['高蛋白', '高油'] },
    { name: '野猪肉汤', category: 'DISH', calories: 400, p: 25, c: 10, f: 30, unit: '1桶', grams: 500, icon: '🍲', tags: ['高油'] },
    { name: '腊肉', category: 'SNACK', calories: 350, p: 20, c: 2, f: 30, unit: '1串', grams: 100, icon: '🥓', tags: ['高油', '高盐'] }
  ],
  DWARF: [
    { name: '黑啤酒', category: 'DRINK', calories: 150, p: 1, c: 12, f: 0, unit: '1杯', grams: 330, icon: '🍺', tags: ['高碳'] },
    { name: '黑麦面包', category: 'STAPLE', calories: 250, p: 8, c: 45, f: 3, unit: '1块', grams: 120, icon: '🥖', tags: ['高碳'] },
    { name: '烤猪肘', category: 'MEAT', calories: 600, p: 45, c: 0, f: 45, unit: '1份', grams: 350, icon: '🍖', tags: ['高油', '高蛋白'] },
    { name: '炸薯条', category: 'SNACK', calories: 350, p: 4, c: 45, f: 18, unit: '1份', grams: 150, icon: '🍟', tags: ['高油', '高碳'] },
    { name: '咸鱼干', category: 'SNACK', calories: 180, p: 30, c: 0, f: 5, unit: '2条', grams: 100, icon: '🐟', tags: ['高蛋白', '高盐'] },
    { name: '矿工馅饼', category: 'STAPLE', calories: 500, p: 15, c: 50, f: 25, unit: '1个', grams: 250, icon: '🥟', tags: ['高碳', '高油'], isComposite: true },
    { name: '奶酪火锅', category: 'DISH', calories: 600, p: 25, c: 10, f: 50, unit: '1锅', grams: 300, icon: '🧀', tags: ['高油', '高盐'] },
    { name: '烟熏香肠', category: 'SNACK', calories: 300, p: 15, c: 2, f: 25, unit: '1根', grams: 100, icon: '🌭', tags: ['高油', '高盐'] }
  ]
};
