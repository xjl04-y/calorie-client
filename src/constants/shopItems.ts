import type { ShopItem } from '@/types';

/**
 * 商店物品配置
 */
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
    id: 'item_streak_freeze',
    name: '时光怀表',
    desc: '能够冻结时间的魔法道具。如果不小心断签，它会自动消耗并保住你的连续登录天数。',
    icon: '🕰️',
    price: 800,
    effect: 'HEAL',
    value: 0
  },
  {
    id: 'item_combo_shield',
    name: '时光沙漏',
    desc: '连击保护神器。当连击即将中断时自动消耗，冻结时间保住连击数。',
    icon: '⏳',
    price: 500,
    effect: 'HEAL',
    value: 0
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
