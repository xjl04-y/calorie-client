import type { Quest } from '@/types';

/**
 * 任务池配置
 * 扩充版 v2.0：75+ 任务，涵盖全难度与多种饮食风格
 */
export const QUEST_POOL: Omit<Quest, 'status' | 'current'>[] = [
  // ==========================================
  // D级任务 (日常/新手) - 简单打卡，养成习惯
  // ==========================================
  { id: 'q_d1', title: '轻度补给', desc: '记录 1 次任意食物', rarity: 'D', target: 1, type: 'COUNT', rewardExp: 30 },
  { id: 'q_d2', title: '多喝热水', desc: '记录 2 次饮水', rarity: 'D', target: 2, type: 'WATER', rewardExp: 40 },
  { id: 'q_d3', title: '小试牛刀', desc: '造成 500 点热量伤害', rarity: 'D', target: 500, type: 'CALORIE_CONTROL', rewardExp: 35 },
  { id: 'q_d4', title: '早餐打卡', desc: '记录 1 次早餐', rarity: 'D', target: 1, type: 'COUNT', rewardExp: 30 },
  { id: 'q_d5', title: '水果时间', desc: '记录 1 次水果/零食', rarity: 'D', target: 1, type: 'COUNT', rewardExp: 30 },
  { id: 'q_d6', title: '奶制品摄入', desc: '记录 1 次奶类/酸奶', rarity: 'D', target: 1, type: 'COUNT', rewardExp: 35 },
  { id: 'q_d7', title: '午餐汇报', desc: '记录 1 次午餐', rarity: 'D', target: 1, type: 'COUNT', rewardExp: 30 },
  { id: 'q_d8', title: '晚餐打卡', desc: '记录 1 次晚餐', rarity: 'D', target: 1, type: 'COUNT', rewardExp: 30 },
  { id: 'q_d9', title: '随便吃点', desc: '记录 3 次任意饮食', rarity: 'D', target: 3, type: 'COUNT', rewardExp: 45 },
  { id: 'q_d10', title: '看看状态', desc: '打开一次战报界面(自动完成)', rarity: 'D', target: 1, type: 'CUSTOM', rewardExp: 20 },

  // ==========================================
  // C级任务 (普通) - 基础营养目标
  // ==========================================
  { id: 'q_c1', title: '蛋白质补充', desc: '摄入 60g 蛋白质', rarity: 'C', target: 60, type: 'PROTEIN', rewardExp: 60 },
  { id: 'q_c2', title: '蔬菜猎人', desc: '记录 2 份蔬菜', rarity: 'C', target: 2, type: 'VEG', rewardExp: 50 },
  { id: 'q_c3', title: '均衡饮食', desc: '三种主要营养素都摄入至少 10g', rarity: 'C', target: 1, type: 'COUNT', rewardExp: 55 },
  { id: 'q_c4', title: '拒绝油腻', desc: '记录 2 次低脂食物', rarity: 'C', target: 2, type: 'LOW_FAT', rewardExp: 60 },
  { id: 'q_c5', title: '膳食纤维', desc: '记录 3 次蔬菜或水果', rarity: 'C', target: 3, type: 'VEG', rewardExp: 65 },
  { id: 'q_c6', title: '少吃一口', desc: '单餐热量低于 500 kcal', rarity: 'C', target: 1, type: 'CALORIE_CONTROL', rewardExp: 55 },
  { id: 'q_c7', title: '鸡蛋爱好者', desc: '记录 1 次蛋类食物', rarity: 'C', target: 1, type: 'PROTEIN', rewardExp: 50 },
  { id: 'q_c8', title: '肉食者', desc: '记录 1 次肉类食物', rarity: 'C', target: 1, type: 'PROTEIN', rewardExp: 50 },
  { id: 'q_c9', title: '水分补充', desc: '记录 3 次饮水', rarity: 'C', target: 3, type: 'WATER', rewardExp: 60 },
  { id: 'q_c10', title: '粗粮尝试', desc: '记录 1 次低GI主食(如玉米/红薯)', rarity: 'C', target: 1, type: 'LOW_CARB', rewardExp: 60 },
  // [New]
  { id: 'q_c11', title: '咖啡时间', desc: '记录 1 次咖啡或茶 (无糖)', rarity: 'C', target: 1, type: 'WATER', rewardExp: 50 },
  { id: 'q_c12', title: '坚果补给', desc: '记录 1 次坚果 (优质脂肪)', rarity: 'C', target: 1, type: 'LOW_CARB', rewardExp: 55 },

  // ==========================================
  // B级任务 (进阶) - 特定限制与挑战
  // ==========================================
  { id: 'q_b1', title: '控糖行动', desc: '今日不摄入高糖食物(需记录至少3次)', rarity: 'B', target: 3, type: 'LOW_CARB', rewardExp: 80 },
  { id: 'q_b2', title: '清淡饮食', desc: '今日不摄入高油食物(需记录3次)', rarity: 'B', target: 3, type: 'LOW_FAT', rewardExp: 80 },
  { id: 'q_b3', title: '能量控制', desc: '单餐热量不超过 600 kcal (记录2次)', rarity: 'B', target: 2, type: 'CALORIE_CONTROL', rewardExp: 90 },
  { id: 'q_b4', title: '海鲜大餐', desc: '摄入 1 次鱼虾蟹贝类 (高蛋白且低脂)', rarity: 'B', target: 1, type: 'PROTEIN', rewardExp: 85 },
  { id: 'q_b5', title: '优质蛋白', desc: '摄入 90g 蛋白质', rarity: 'B', target: 90, type: 'PROTEIN', rewardExp: 90 },
  { id: 'q_b6', title: '戒糖先锋', desc: '记录 3 次低糖食物', rarity: 'B', target: 3, type: 'LOW_SUGAR', rewardExp: 85 },
  { id: 'q_b7', title: '绿色心情', desc: '摄入 3 份蔬菜', rarity: 'B', target: 3, type: 'VEG', rewardExp: 80 },
  { id: 'q_b8', title: '主食减半', desc: '记录 2 次低碳饮食', rarity: 'B', target: 2, type: 'LOW_CARB', rewardExp: 85 },
  { id: 'q_b9', title: '饱腹感', desc: '记录 2 次“充饥”标签食物', rarity: 'B', target: 2, type: 'COUNT', rewardExp: 80 },
  { id: 'q_b10', title: '下午茶克制', desc: '下午不摄入高糖零食', rarity: 'B', target: 1, type: 'LOW_SUGAR', rewardExp: 80 },
  // [New]
  { id: 'q_b11', title: '五色饮食', desc: '记录 5 种不同颜色的食物', rarity: 'B', target: 5, type: 'COUNT', rewardExp: 100 },
  { id: 'q_b12', title: '拒绝加工', desc: '全天不摄入加工食品 (如火腿/饼干)', rarity: 'B', target: 3, type: 'CUSTOM', rewardExp: 95 },

  // ==========================================
  // A级任务 (稀有) - 严格的饮食纪律
  // ==========================================
  { id: 'q_a1', title: '肌肉狂热', desc: '摄入 120g 蛋白质', rarity: 'A', target: 120, type: 'PROTEIN', rewardExp: 150 },
  { id: 'q_a2', title: '热量赤字', desc: '总热量控制在 1800 以内 (需至少记录3餐)', rarity: 'A', target: 3, type: 'CALORIE_CONTROL', rewardExp: 200 },
  { id: 'q_a3', title: '完美一天', desc: '记录早中晚三餐且包含蔬菜', rarity: 'A', target: 3, type: 'VEG', rewardExp: 180 },
  { id: 'q_a4', title: '素食主义者', desc: '全天不摄入肉类但摄入足够蛋白质(>50g)', rarity: 'A', target: 50, type: 'PROTEIN', rewardExp: 160 },
  { id: 'q_a5', title: '低碳战士', desc: '全天碳水摄入低于 100g (记录3次)', rarity: 'A', target: 100, type: 'LOW_CARB', rewardExp: 180 },
  { id: 'q_a6', title: '低脂生活', desc: '全天脂肪摄入低于 40g (记录3次)', rarity: 'A', target: 40, type: 'LOW_FAT', rewardExp: 180 },
  { id: 'q_a7', title: '超级补水', desc: '记录 6 次饮水', rarity: 'A', target: 6, type: 'WATER', rewardExp: 150 },
  { id: 'q_a8', title: '无糖挑战', desc: '连续记录 4 次无糖/低糖饮食', rarity: 'A', target: 4, type: 'LOW_SUGAR', rewardExp: 170 },
  { id: 'q_a9', title: '纯净饮食', desc: '记录 3 次“纯净”标签食物', rarity: 'A', target: 3, type: 'COUNT', rewardExp: 160 },
  { id: 'q_a10', title: '轻断食', desc: '两餐间隔超过 12 小时', rarity: 'A', target: 12, type: 'CUSTOM', rewardExp: 190 },

  // ==========================================
  // S级任务 (史诗) - 极高难度的挑战
  // ==========================================
  { id: 'q_s1', title: '神之代谢', desc: '记录 8 次饮水且无高糖摄入', rarity: 'S', target: 8, type: 'WATER', rewardExp: 300 },
  { id: 'q_s2', title: '泰坦之握', desc: '单日蛋白质超过 150g', rarity: 'S', target: 150, type: 'PROTEIN', rewardExp: 350 },
  { id: 'q_s3', title: '自然之怒', desc: '摄入 5 份不同的蔬菜/水果', rarity: 'S', target: 5, type: 'VEG', rewardExp: 320 },
  { id: 'q_s4', title: '生酮大师', desc: '单日碳水低于 50g (需记录至少3餐)', rarity: 'S', target: 50, type: 'LOW_CARB', rewardExp: 350 },
  { id: 'q_s5', title: '苦行僧', desc: '全天记录 3 次且只吃素食和水', rarity: 'S', target: 3, type: 'VEG', rewardExp: 330 },
  { id: 'q_s6', title: '绝对纯净', desc: '全天所有记录均为“纯净”或“均衡”', rarity: 'S', target: 4, type: 'COUNT', rewardExp: 340 },
  { id: 'q_s7', title: '热量精密控制', desc: '总热量与目标偏差不超过 50 kcal', rarity: 'S', target: 1, type: 'CALORIE_CONTROL', rewardExp: 360 },
  { id: 'q_s8', title: '零食绝缘体', desc: '记录 4 餐且无任何零食摄入', rarity: 'S', target: 4, type: 'COUNT', rewardExp: 310 },

  // ==========================================
  // SS级任务 (传说) - 突破极限
  // ==========================================
  { id: 'q_ss1', title: '绝食暴徒 (慎用)', desc: '全天总热量低于 1000 (仅限减脂期)', rarity: 'SS', target: 1000, type: 'CALORIE_CONTROL', rewardExp: 500 },
  { id: 'q_ss2', title: '蛋白质之神', desc: '单日蛋白质超过 200g', rarity: 'SS', target: 200, type: 'PROTEIN', rewardExp: 600 },
  { id: 'q_ss3', title: '纯净圣体', desc: '记录 5 次食物且全部为「纯净」标签', rarity: 'SS', target: 5, type: 'VEG', rewardExp: 550 },
  { id: 'q_ss4', title: '流水光阴', desc: '单日饮水超过 10 次 (3L+)', rarity: 'SS', target: 10, type: 'WATER', rewardExp: 500 },
  { id: 'q_ss5', title: '断食宗师', desc: '完成一次 16 小时以上的断食', rarity: 'SS', target: 16, type: 'CUSTOM', rewardExp: 580 },
  { id: 'q_ss6', title: '完美均衡', desc: '碳水/蛋白/脂肪 比例控制在 4:3:3 (误差10%)', rarity: 'SS', target: 1, type: 'CUSTOM', rewardExp: 600 },
  // [New]
  { id: 'q_ss7', title: '深海猎手', desc: '全天摄入海鲜超过 300g', rarity: 'SS', target: 300, type: 'PROTEIN', rewardExp: 550 },
  { id: 'q_ss8', title: '绿巨人', desc: '单日蔬菜摄入超过 500g', rarity: 'SS', target: 500, type: 'VEG', rewardExp: 520 },
  { id: 'q_ss9', title: '液态生存', desc: '全天只摄入流食 (奶/豆浆/汤)', rarity: 'SS', target: 3, type: 'CUSTOM', rewardExp: 500 },
  { id: 'q_ss10', title: '0碳挑战', desc: '全天碳水摄入接近 0 (纯肉/油断)', rarity: 'SS', target: 10, type: 'LOW_CARB', rewardExp: 650 }
];
