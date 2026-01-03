import type { Quest } from '@/types';

/**
 * 任务池配置
 */
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
