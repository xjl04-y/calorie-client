import type { SkillNode } from '@/types';

/**
 * 种族技能树配置
 * 扩充版 v3.0：海量技能节点，双路线设计
 */
export const RACE_SKILL_TREES: Record<string, SkillNode[]> = {
  // =================================================================
  // HUMAN (人类) - 均衡多面手，擅长生存、烹饪与统率
  // 路线 A: 圣殿骑士 (防御/格挡/信念/回复)
  // 路线 B: 帝国指挥官 (金币/经验/连击/战术)
  // =================================================================
  HUMAN: [
    // --- Tier 1 (Lv.1) ---
    { id: 'H_BMR_1', tier: 1, name: '生存本能', desc: '基础代谢(BMR)小幅永久提升', icon: '🔥', maxLevel: 5, reqLevel: 1, cost: 1, type: 'PASSIVE_BMR', effectParams: { target: 'bmr', base: 20, scale: 20 } },
    { id: 'H_STUDY_1', tier: 1, name: '快速学习', desc: '战斗获得经验值增加', icon: '📖', maxLevel: 5, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'exp_rate', base: 0.05, scale: 0.03 } },
    { id: 'H_DIPLOMACY', tier: 1, name: '外交术', desc: '任务获得的金币奖励提升', icon: '🤝', maxLevel: 3, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'quest_gold', base: 0.1, scale: 0.05 } },

    // --- Tier 2 (Lv.3) ---
    { id: 'H_COOK_1', tier: 2, parentId: 'H_BMR_1', name: '野战烹饪', desc: '自制食物效果提升', icon: '🍳', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'cook_exp', base: 0.1, scale: 0.05 } },
    { id: 'H_DEF_1', tier: 2, parentId: 'H_BMR_1', name: '盾牌训练', desc: '格挡值百分比提升', icon: '🛡️', maxLevel: 5, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'block_pct', base: 0.05, scale: 0.03 } },
    { id: 'H_ATK_1', tier: 2, parentId: 'H_STUDY_1', name: '弱点洞察', desc: '暴击率提升', icon: '👁️', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'crit_rate', base: 0.05, scale: 0.02 } },

    // --- Tier 3 (Lv.5) ---
    { id: 'H_ACTIVE_1', tier: 3, parentId: 'H_DEF_1', name: '圣光祈祷', desc: '主动：下一次进食转化为回复且双倍经验 (CD:12h)', icon: '🙏', maxLevel: 1, reqLevel: 5, reqCombatPower: 1000, cost: 3, type: 'ACTIVE_BUFF', effectParams: { target: 'HUMAN_PRAYER', base: 1, scale: 0 } },
    { id: 'H_STR_2', tier: 3, parentId: 'H_ATK_1', name: '骑士精神', desc: '全属性加成', icon: '⚔️', maxLevel: 3, reqLevel: 5, reqCombatPower: 800, cost: 3, type: 'PASSIVE_STAT', effectParams: { target: 'all_stat', base: 0.02, scale: 0.02 } },
    { id: 'H_COMBO', tier: 3, parentId: 'H_STUDY_1', name: '战术连携', desc: '连击判定的有效时间窗口延长', icon: '🔗', maxLevel: 3, reqLevel: 5, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'combo_window', base: 30, scale: 30 } }, // +30min

    // --- Tier 4 (Lv.10) ---
    { id: 'H_ULT_1', tier: 4, parentId: 'H_ACTIVE_1', name: '英雄赞歌', desc: '全属性大幅提升 10%，代谢大幅提升', icon: '👑', maxLevel: 1, reqLevel: 10, reqCombatPower: 3000, cost: 5, type: 'PASSIVE_STAT', effectParams: { target: 'all_stat', base: 0.1, scale: 0 } },
    { id: 'H_WILL', tier: 4, parentId: 'H_DEF_1', name: '钢铁意志', desc: 'HP越低，格挡率越高 (模拟)', icon: '🧠', maxLevel: 3, reqLevel: 10, cost: 4, type: 'PASSIVE_STAT', effectParams: { target: 'low_hp_block', base: 0.1, scale: 0.05 } },
    { id: 'H_MERCHANT', tier: 4, parentId: 'H_DIPLOMACY', name: '大航海家', desc: '所有来源的金币获取大幅提升', icon: '⛵', maxLevel: 3, reqLevel: 10, cost: 4, type: 'PASSIVE_STAT', effectParams: { target: 'gold_mult', base: 0.15, scale: 0.05 } },
    { id: 'H_HEAL_PLUS', tier: 4, parentId: 'H_ACTIVE_1', name: '神圣愈合', desc: '所有治疗效果提升', icon: '❤️‍🩹', maxLevel: 3, reqLevel: 10, cost: 3, type: 'PASSIVE_STAT', effectParams: { target: 'heal_mult', base: 0.2, scale: 0.1 } },

    // --- Tier 5 (Lv.15) ---
    { id: 'H_MASTER_1', tier: 5, parentId: 'H_ULT_1', name: '帝国传奇', desc: '每拥有1个成就，所有属性提升 1%', icon: '🏰', maxLevel: 1, reqLevel: 15, reqCombatPower: 5000, cost: 10, type: 'PASSIVE_STAT', effectParams: { target: 'ach_bonus', base: 0.01, scale: 0 } },
    { id: 'H_MASTER_2', tier: 5, parentId: 'H_COMBO', name: '无尽连击', desc: '连击不再因时间中断，只因错误饮食中断', icon: '♾️', maxLevel: 1, reqLevel: 15, cost: 10, type: 'PASSIVE_STAT', effectParams: { target: 'combo_lock', base: 1, scale: 0 } }
  ],

  // =================================================================
  // ELF (精灵) - 敏捷刺客/自然德鲁伊，擅长闪避、暴击与植物学
  // 路线 A: 丛林游侠 (暴击/闪避/精准/风行)
  // 路线 B: 月之德鲁伊 (回复/素食/自然/净化)
  // =================================================================
  ELF: [
    // --- Tier 1 ---
    { id: 'E_AGI_1', tier: 1, name: '风之子', desc: '敏捷属性(AGI)提升', icon: '🍃', maxLevel: 5, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'agi_mult', base: 0.05, scale: 0.02 } },
    { id: 'E_NATURE_1', tier: 1, name: '自然亲和', desc: '蔬菜水果类食物效果提升', icon: '🍏', maxLevel: 3, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'veg_exp', base: 0.15, scale: 0.05 } },
    { id: 'E_VISION', tier: 1, name: '夜视', desc: '夜间战斗命中率/暴击率提升', icon: '🌙', maxLevel: 1, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'night_crit', base: 0.1, scale: 0 } },

    // --- Tier 2 ---
    { id: 'E_DODGE_1', tier: 2, parentId: 'E_AGI_1', name: '幻影步', desc: '闪避率直接提升', icon: '🌫️', maxLevel: 5, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'dodge_flat', base: 0.03, scale: 0.01 } },
    { id: 'E_ACC_1', tier: 2, parentId: 'E_AGI_1', name: '鹰眼', desc: '暴击率提升', icon: '🏹', maxLevel: 5, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'crit_rate', base: 0.05, scale: 0.03 } },
    { id: 'E_REC_1', tier: 2, parentId: 'E_NATURE_1', name: '光合作用', desc: '日间进食额外回复HP', icon: '☀️', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'day_heal', base: 10, scale: 5 } },

    // --- Tier 3 ---
    { id: 'E_ACTIVE_1', tier: 3, parentId: 'E_ACC_1', name: '自然专注', desc: '主动：必定暴击且无视抗性 (CD:8h)', icon: '🎯', maxLevel: 1, reqLevel: 5, reqCombatPower: 1000, cost: 3, type: 'ACTIVE_BUFF', effectParams: { target: 'ELF_FOCUS', base: 1, scale: 0 } },
    { id: 'E_CLEAN', tier: 3, parentId: 'E_NATURE_1', name: '净化仪式', desc: '纯净标签食物的经验值加成', icon: '✨', maxLevel: 3, reqLevel: 5, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'clean_bonus', base: 0.2, scale: 0.05 } },
    { id: 'E_SNIPER', tier: 3, parentId: 'E_ACC_1', name: '弱点狙击', desc: '暴击伤害大幅提升', icon: '💥', maxLevel: 3, reqLevel: 5, cost: 3, type: 'PASSIVE_STAT', effectParams: { target: 'crit_dmg', base: 0.3, scale: 0.1 } },
    { id: 'E_FRUIT', tier: 3, parentId: 'E_NATURE_1', name: '浆果采集', desc: '水果提供的饱腹感(grams)计算值增加', icon: '🍇', maxLevel: 3, reqLevel: 5, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'fruit_bonus', base: 0.2, scale: 0.1 } },

    // --- Tier 4 ---
    { id: 'E_ULT_1', tier: 4, parentId: 'E_ACTIVE_1', name: '月神降临', desc: '闪避率上限突破至 80%，全属性+5%', icon: '🦉', maxLevel: 1, reqLevel: 10, reqCombatPower: 3000, cost: 5, type: 'PASSIVE_STAT', effectParams: { target: 'dodge_cap', base: 0.2, scale: 0 } },
    { id: 'E_WIND', tier: 4, parentId: 'E_DODGE_1', name: '风行者', desc: '每拥有1%闪避率，提供额外的敏捷加成', icon: '🌪️', maxLevel: 3, reqLevel: 10, cost: 4, type: 'PASSIVE_STAT', effectParams: { target: 'dodge_to_agi', base: 0.5, scale: 0.2 } },
    { id: 'E_LIFE', tier: 4, parentId: 'E_REC_1', name: '生命之树', desc: '所有回复效果提升 30%', icon: '🌳', maxLevel: 3, reqLevel: 10, cost: 4, type: 'PASSIVE_STAT', effectParams: { target: 'heal_mult', base: 0.3, scale: 0.1 } },

    // --- Tier 5 ---
    { id: 'E_MASTER_1', tier: 5, parentId: 'E_ULT_1', name: '自然化身', desc: '摄入"蔬菜"或"水果"时，10%概率全属性翻倍(本次)', icon: '🦌', maxLevel: 1, reqLevel: 15, reqCombatPower: 5000, cost: 10, type: 'PASSIVE_STAT', effectParams: { target: 'nature_wrath', base: 0.1, scale: 0 } },
    { id: 'E_MASTER_2', tier: 5, parentId: 'E_SNIPER', name: '星辰坠落', desc: '每连续暴击1次，伤害叠加10% (无限叠加)', icon: '🌠', maxLevel: 1, reqLevel: 15, cost: 10, type: 'PASSIVE_STAT', effectParams: { target: 'crit_stack', base: 0.1, scale: 0 } }
  ],

  // =================================================================
  // ORC (兽人) - 狂战士/掠夺者，擅长力量、高血量与肉食
  // 路线 A: 鲜血狂战 (高伤/吸血/卖血/暴击)
  // 路线 B: 钢铁壁垒 (高血/免伤/抗性/吞噬)
  // =================================================================
  ORC: [
    // --- Tier 1 ---
    { id: 'O_STR_1', tier: 1, name: '蛮力', desc: '力量属性(STR)提升', icon: '💪', maxLevel: 5, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'str_mult', base: 0.05, scale: 0.03 } },
    { id: 'O_EAT_1', tier: 1, name: '暴饮暴食', desc: '每餐可摄入热量上限提升', icon: '🍖', maxLevel: 3, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'max_eat', base: 100, scale: 50 } },
    { id: 'O_HP_1', tier: 1, name: '巨兽体质', desc: '最大HP上限提升', icon: '❤️', maxLevel: 5, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'hp_max', base: 50, scale: 50 } },

    // --- Tier 2 ---
    { id: 'O_MEAT_1', tier: 2, parentId: 'O_STR_1', name: '肉食者', desc: '肉类食物回复量大幅提升', icon: '🥩', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'meat_heal', base: 10, scale: 10 } },
    { id: 'O_RES_1', tier: 2, parentId: 'O_HP_1', name: '硬皮', desc: '受到反击伤害固定减少', icon: '🦏', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'dmg_reduce', base: 5, scale: 5 } },
    { id: 'O_DIGEST', tier: 2, parentId: 'O_EAT_1', name: '钢铁胃袋', desc: '减少"高油/高糖"食物带来的负面反击概率', icon: '🥣', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'bad_food_resist', base: 0.15, scale: 0.1 } },

    // --- Tier 3 ---
    { id: 'O_ACTIVE_1', tier: 3, parentId: 'O_MEAT_1', name: '血之狂怒', desc: '主动：伤害300%，但扣除50HP (CD:16h)', icon: '🩸', maxLevel: 1, reqLevel: 5, reqCombatPower: 1200, cost: 3, type: 'ACTIVE_BUFF', effectParams: { target: 'ORC_RAGE', base: 1, scale: 0 } },
    { id: 'O_CRIT_1', tier: 3, parentId: 'O_STR_1', name: '致命一击', desc: '暴击伤害倍率提升', icon: '🔨', maxLevel: 3, reqLevel: 5, reqCombatPower: 1000, cost: 3, type: 'PASSIVE_STAT', effectParams: { target: 'crit_dmg', base: 0.2, scale: 0.1 } },
    { id: 'O_VAMP', tier: 3, parentId: 'O_ACTIVE_1', name: '嗜血渴望', desc: '造成伤害时回复少量HP (吸血)', icon: '🧛', maxLevel: 3, reqLevel: 5, cost: 3, type: 'PASSIVE_STAT', effectParams: { target: 'lifesteal', base: 0.05, scale: 0.02 } },
    { id: 'O_SCAVENGER', tier: 3, parentId: 'O_EAT_1', name: '拾荒者', desc: '从任何食物中都能额外榨取 10% 经验', icon: '🦴', maxLevel: 3, reqLevel: 5, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'all_exp', base: 0.1, scale: 0.05 } },

    // --- Tier 4 ---
    { id: 'O_ULT_1', tier: 4, parentId: 'O_ACTIVE_1', name: '不灭战魂', desc: 'HP低于30%时伤害翻倍，免疫致死伤害1次', icon: '💀', maxLevel: 1, reqLevel: 10, reqCombatPower: 3000, cost: 5, type: 'PASSIVE_STAT', effectParams: { target: 'berserk', base: 1, scale: 0 } },
    { id: 'O_SMASH', tier: 4, parentId: 'O_CRIT_1', name: '破甲重击', desc: '一定概率无视敌人格挡/抗性', icon: '🧱', maxLevel: 3, reqLevel: 10, cost: 4, type: 'PASSIVE_STAT', effectParams: { target: 'ignore_def', base: 0.15, scale: 0.05 } },
    { id: 'O_TANK', tier: 4, parentId: 'O_RES_1', name: '战争机器', desc: '每损失1%血量，攻击力提升 0.5%', icon: '🤖', maxLevel: 3, reqLevel: 10, cost: 4, type: 'PASSIVE_STAT', effectParams: { target: 'low_hp_dmg', base: 0.5, scale: 0.1 } },

    // --- Tier 5 ---
    { id: 'O_MASTER_1', tier: 5, parentId: 'O_ULT_1', name: '部落大酋长', desc: '所有"肉类"标签食物获得双倍效果(经验/金币)', icon: '👹', maxLevel: 1, reqLevel: 15, reqCombatPower: 5000, cost: 10, type: 'PASSIVE_STAT', effectParams: { target: 'meat_master', base: 1, scale: 0 } },
    { id: 'O_MASTER_2', tier: 5, parentId: 'O_TANK', name: '泰坦之躯', desc: '生命上限翻倍，但不再能闪避攻击', icon: '🏔️', maxLevel: 1, reqLevel: 15, cost: 10, type: 'PASSIVE_STAT', effectParams: { target: 'hp_double_no_dodge', base: 1, scale: 0 } }
  ],

  // =================================================================
  // DWARF (矮人) - 坦克/工匠，擅长体质、格挡、饮酒与财宝
  // 路线 A: 山丘守卫 (高防/反伤/饮酒/护盾)
  // 路线 B: 符文工匠 (金币/寻宝/装备/转化)
  // =================================================================
  DWARF: [
    // --- Tier 1 ---
    { id: 'D_VIT_1', tier: 1, name: '岩石体魄', desc: '体质属性(VIT)提升', icon: '🗿', maxLevel: 5, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'vit_mult', base: 0.05, scale: 0.03 } },
    { id: 'D_DIG_1', tier: 1, name: '挖掘', desc: '更有几率发现稀有食物/道具', icon: '⛏️', maxLevel: 3, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'find_rare', base: 0.05, scale: 0.05 } },
    { id: 'D_STAMINA', tier: 1, name: '耐力训练', desc: '运动获得的护盾值增加', icon: '🏃', maxLevel: 3, reqLevel: 1, cost: 1, type: 'PASSIVE_STAT', effectParams: { target: 'exercise_shield', base: 0.1, scale: 0.05 } },

    // --- Tier 2 ---
    { id: 'D_DRINK_1', tier: 2, parentId: 'D_VIT_1', name: '千杯不醉', desc: '饮品类也能提供格挡值', icon: '🍺', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'drink_block', base: 3, scale: 2 } },
    { id: 'D_GOLD_1', tier: 2, parentId: 'D_DIG_1', name: '寻宝猎人', desc: '任务奖励经验提升', icon: '💰', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'quest_exp', base: 0.1, scale: 0.05 } },
    { id: 'D_CRAFT', tier: 2, parentId: 'D_VIT_1', name: '精工锻造', desc: '装备提供的属性加成提升', icon: '⚒️', maxLevel: 3, reqLevel: 3, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'equip_bonus', base: 0.1, scale: 0.05 } },

    // --- Tier 3 ---
    { id: 'D_ACTIVE_1', tier: 3, parentId: 'D_DRINK_1', name: '酒仙护体', desc: '主动：必定格挡反击并吸血 (CD:10h)', icon: '🍻', maxLevel: 1, reqLevel: 5, reqCombatPower: 1100, cost: 3, type: 'ACTIVE_BUFF', effectParams: { target: 'DWARF_DRINK', base: 1, scale: 0 } },
    { id: 'D_REFLECT', tier: 3, parentId: 'D_ACTIVE_1', name: '尖刺装甲', desc: '格挡成功时，对敌人造成反弹伤害', icon: '🌵', maxLevel: 3, reqLevel: 5, cost: 3, type: 'PASSIVE_STAT', effectParams: { target: 'reflect_dmg', base: 0.15, scale: 0.1 } },
    { id: 'D_GEM', tier: 3, parentId: 'D_GOLD_1', name: '宝石鉴赏', desc: '战斗获得的金币大幅提升', icon: '💎', maxLevel: 3, reqLevel: 5, cost: 2, type: 'PASSIVE_STAT', effectParams: { target: 'battle_gold', base: 0.2, scale: 0.1 } },
    { id: 'D_SHIELD', tier: 3, parentId: 'D_STAMINA', name: '盾牌猛击', desc: '当前护盾值的 10% 转化为额外攻击力', icon: '🛡️', maxLevel: 3, reqLevel: 5, cost: 3, type: 'PASSIVE_STAT', effectParams: { target: 'shield_dmg', base: 0.1, scale: 0.05 } },

    // --- Tier 4 ---
    { id: 'D_ULT_1', tier: 4, parentId: 'D_ACTIVE_1', name: '山丘之王', desc: '格挡成功时反弹 50% 伤害，体质+10%', icon: '🏔️', maxLevel: 1, reqLevel: 10, reqCombatPower: 3000, cost: 5, type: 'PASSIVE_STAT', effectParams: { target: 'reflect', base: 0.5, scale: 0 } },
    { id: 'D_FORTRESS', tier: 4, parentId: 'D_DRINK_1', name: '移动堡垒', desc: '护盾上限提升，且护盾不会随时间衰减(模拟)', icon: '🏰', maxLevel: 3, reqLevel: 10, cost: 4, type: 'PASSIVE_STAT', effectParams: { target: 'shield_cap', base: 0.3, scale: 0.1 } },
    { id: 'D_GREED', tier: 4, parentId: 'D_GOLD_1', name: '巨龙宝藏', desc: '每拥有 1000 金币，额外提升 1% 全属性', icon: '🐲', maxLevel: 1, reqLevel: 10, cost: 5, type: 'PASSIVE_STAT', effectParams: { target: 'gold_to_stat', base: 0.01, scale: 0 } },

    // --- Tier 5 ---
    { id: 'D_MASTER_1', tier: 5, parentId: 'D_ULT_1', name: '符文宗师', desc: '可以将多余的卡路里转化为金币 (比例 10:1)', icon: '📜', maxLevel: 1, reqLevel: 15, reqCombatPower: 5000, cost: 10, type: 'PASSIVE_STAT', effectParams: { target: 'cal_to_gold', base: 1, scale: 0 } },
    { id: 'D_MASTER_2', tier: 5, parentId: 'D_FORTRESS', name: '不朽之躯', desc: '只要有护盾存在，受到的所有伤害减少 50%', icon: '💎', maxLevel: 1, reqLevel: 15, cost: 10, type: 'PASSIVE_STAT', effectParams: { target: 'shield_dr', base: 0.5, scale: 0 } }
  ]
};
