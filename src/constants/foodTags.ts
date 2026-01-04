/**
 * 食物标签定义
 */

// 标签定义接口
export interface TagDefinition {
  label: string;
  icon: string;
  desc: string;
}

const BASE_TAGS: Record<string, TagDefinition> = {
  // --- 核心营养 (数值导向) ---
  高糖: { label: '高糖', icon: '🍬', desc: '容易导致血糖飙升' },
  高油: { label: '高油', icon: '🛢️', desc: '脂肪含量高' },
  高盐: { label: '高盐', icon: '🧂', desc: '钠含量过高' },
  高碳: { label: '高碳', icon: '🍚', desc: '碳水化合物丰富' },
  高蛋白: { label: '高蛋白', icon: '💪', desc: '增肌首选' },
  纯净: { label: '纯净', icon: '✨', desc: '无添加健康' },
  均衡: { label: '均衡', icon: '⚖️', desc: '营养比例完美' },

  // --- 基础分类 (物品类型) ---
  DRINK: { label: '饮品', icon: '🥤', desc: '液体食物' },
  ALCOHOL: { label: '酒精', icon: '🍺', desc: '含酒精饮料' },
  MEAT: { label: '肉类', icon: '🥩', desc: '肉类食物' },
  RED_MEAT: { label: '红肉', icon: '🥩', desc: '牛羊猪肉' },
  POULTRY: { label: '禽肉', icon: '🍗', desc: '鸡鸭鹅肉' },
  SEAFOOD: { label: '海鲜', icon: '🦐', desc: '鱼虾蟹贝' },
  VEGETABLE: { label: '蔬菜', icon: '🥦', desc: '蔬菜类' },
  FRUIT: { label: '水果', icon: '🍎', desc: '水果类' },
  STAPLE: { label: '主食', icon: '🍚', desc: '主食类' },
  SNACK: { label: '零食', icon: '🍪', desc: '零食类' },

  // --- 物理状态 (加工方式) ---
  STATE_DRIED: { label: '干货', icon: '🍂', desc: '干燥制品' },
  STATE_PRESERVED: { label: '腌制', icon: '🧂', desc: '腌制食品' },
  STATE_COOKED: { label: '熟食', icon: '🔥', desc: '烹饪熟食' },
  STATE_RAW: { label: '生食', icon: '🍣', desc: '生鲜食物' },

  // --- [New] 感官风味 (RPG 元素克制) ---
  FLAVOR_SPICY: { label: '辛辣', icon: '🌶️', desc: '火元素亲和，驱散寒冷' },
  FLAVOR_SOUR: { label: '酸味', icon: '🍋', desc: '刺激性，克制油腻怪物' },
  FLAVOR_SWEET: { label: '甜味', icon: '🍯', desc: '提供幸福感，安抚狂暴' },
  FLAVOR_BITTER: { label: '苦味', icon: '☕', desc: '清醒头脑，解除负面状态' },

  // --- [New] 物理温度 (环境互动) ---
  TEMP_COLD: { label: '冰冷', icon: '🧊', desc: '冰元素亲和，降低体温' },
  TEMP_HOT: { label: '热食', icon: '🍲', desc: '暖胃，抵抗严寒天气' }
};

export const TAG_DEFS: Record<string, TagDefinition> = {
  ...BASE_TAGS,
  // 英文别名映射
  HIGH_SUGAR: BASE_TAGS.高糖,
  HIGH_FAT: BASE_TAGS.高油,
  HIGH_SODIUM: BASE_TAGS.高盐,
  HIGH_CARB: BASE_TAGS.高碳,
  HIGH_PRO: BASE_TAGS.高蛋白,
  CLEAN: BASE_TAGS.纯净,
  BALANCED: BASE_TAGS.均衡
};
