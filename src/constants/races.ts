import type { Race, NpcConfig } from '@/types';

/**
 * 种族基础配置
 */
export const RACES: Record<string, Race> = {
  HUMAN: { name: '人类', icon: '🧑‍', desc: '适应力强的均衡种族', bonus: '全属性均衡成长', prefixes: ['皇家', '老式', '秘制', '家乡', '骑士', '帝国', '修道院'], growth: { str: 1.10, agi: 1.10, vit: 1.10 } },
  ELF: { name: '精灵', icon: '🧝‍♀️', desc: '森林之子，轻盈优雅', bonus: '高敏捷，低力量', prefixes: ['月光', '森林', '晨露', '星辰', '自然', '远古', '精灵', '世界树'], growth: { str: 0.95, agi: 1.30, vit: 1.00 } },
  ORC: { name: '兽人', icon: '🧟‍♂️', desc: '力量至上，热血沸腾', bonus: '高力量，低敏捷', prefixes: ['蛮荒', '狂暴', '巨魔', '血腥', '战歌', '碎骨', '雷霆'], growth: { str: 1.30, agi: 0.95, vit: 1.05 } },
  DWARF: { name: '矮人', icon: '🧔', desc: '坚如磐石，豪饮佳酿', bonus: '高体质，高力量', prefixes: ['岩石', '熔炉', '精钢', '深渊', '黑铁', '山丘', '符文'], growth: { str: 1.15, agi: 0.90, vit: 1.30 } }
};

/**
 * 种族 NPC 配置
 */
export const RACE_NPCS: Record<string, NpcConfig> = {
  HUMAN: { name: '莉安娜教官', title: '帝国骑士', icon: '👩‍✈️', greeting: '士兵！饮食也是战斗的一部分，保持纪律！' },
  ELF: { name: '艾瑞尔长老', title: '森林智者', icon: '🧝‍♂️', greeting: '年轻的旅人，愿自然之风指引你的饮食。' },
  ORC: { name: '格罗姆·地狱咆哮', title: '部落督军', icon: '👹', greeting: '吃肉！只有吃饱了才有力气粉碎敌人！' },
  DWARF: { name: '铜须·麦格尼', title: '铁炉堡王', icon: '🎅', greeting: '只要有啤酒和烤肉，就没有打不过的Boss！哈哈！' }
};
