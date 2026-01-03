import type { SkillNode } from '@/types';

/**
 * 种族技能树配置
 */
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
