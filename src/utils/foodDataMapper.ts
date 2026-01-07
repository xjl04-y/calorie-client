// 【重要】这里改为引入 Python 处理好的 json 文件
// 如果你还没跑脚本，TS 报错找不到文件，请先跑脚本或者暂时指回原文件
import optimizedFoodData from '@/constants/food_data_complete_with_icons.json';
import iconfontData from '@/assets/iconfont/iconfont.json';
import type { FoodItem } from '@/types';

// ==========================================
// 前端辅助逻辑
// 用于：处理图标映射、标签推断、安全数值转换
// ==========================================

const PREFIX = (iconfontData as any).css_prefix_text || 'icon-';
const ALL_ICONS = (iconfontData as any).glyphs || [];

// 【新增】坏图标黑名单
// 如果 iconfont.json 里有，但网页上显示为空，请把该图标的 font_class (不带 icon- 前缀) 加到这里
const BROKEN_ICONS = [
  'putaojiu2', // 已知损坏的图标
  'tianpin2',  // 预留位置
];

// 简化的哈希函数
const stringHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

/**
 * [验证] 图标是否存在于当前的 iconfont 库中
 * 增强逻辑：同时检查黑名单
 */
export const isValidIcon = (iconClass: string): boolean => {
  if (!iconClass || typeof iconClass !== 'string') return false;

  // 剥离前缀 (icon-apple -> apple) 进行比对
  const target = iconClass.startsWith(PREFIX) ? iconClass.slice(PREFIX.length) : iconClass;

  // 1. 检查黑名单：如果是坏图标，直接视为无效
  if (BROKEN_ICONS.includes(target)) {
    return false;
  }

  // 2. 检查 iconfont.json 是否包含
  return ALL_ICONS.some((i: any) => i.font_class === target);
};

// 简化的前端标签推断 (当 JSON 缺少 tags 时使用)
export const inferTags = (name: string): string[] => {
  const tags: string[] = [];
  if (/[酒啤酿醉饮茶咖奶汁露浆水]/.test(name)) tags.push('DRINK');
  else if (/[牛羊猪鹿排肠火腿肉鸡鸭鹅鸽蛋]/.test(name)) tags.push('MEAT');
  else if (/[鱼虾蟹贝蚝鱿参]/.test(name)) tags.push('SEAFOOD');
  else if (/[菜茄瓜豆菇笋藕葱姜蒜椒菠萝芹]/.test(name) && !/果/.test(name)) tags.push('VEGETABLE');
  else if (/[果莓蕉梨桃橘橙柚葡萄榴莲]/.test(name)) tags.push('FRUIT');
  else if (/[饭面粉粥饼包饺馒囊糕馍意面]/.test(name)) tags.push('STAPLE');
  else if (/[甜蜜糖糕冰点心]/.test(name)) tags.push('FLAVOR_SWEET');
  return tags;
};

// 简化的前端图标分配 (当 JSON 缺少 icon 或 icon 无效时使用)
export const assignIcon = (foodName: string, tags: string[] = []): string => {
  const target = foodName.trim();

  // 1. 尝试精准匹配
  const exact = ALL_ICONS.find((i: any) => i.name === target || i.font_class === target);
  if (exact && !BROKEN_ICONS.includes(exact.font_class)) {
    return `${PREFIX}${exact.font_class}`;
  }

  // 2. 尝试模糊匹配 (排除黑名单)
  const fuzzy = ALL_ICONS.find((i: any) => target.includes(i.name) && i.name.length > 1 && !BROKEN_ICONS.includes(i.font_class));
  if (fuzzy) return `${PREFIX}${fuzzy.font_class}`;

  // 3. 类别兜底 (确保这些图标是存在的)
  if (tags.includes('DRINK')) return `${PREFIX}drink`;
  if (tags.includes('MEAT')) return `${PREFIX}meat`;
  if (tags.includes('VEGETABLE')) return `${PREFIX}vegetable`;
  if (tags.includes('FRUIT')) return `${PREFIX}fruit`;
  if (tags.includes('STAPLE')) return `${PREFIX}fan`;

  return `${PREFIX}food`;
};

/**
 * 安全数值解析工具
 */
const safeNumber = (...values: any[]): number => {
  for (const val of values) {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 0;
};

/**
 * 获取初始食物数据
 * 增强：在加载数据时就过滤掉坏图标，直接替换为有效图标
 */
export const getInitialFoods = (): FoodItem[] => {
  const sourceData = optimizedFoodData;

  if (!sourceData || !Array.isArray(sourceData) || sourceData.length === 0) {
    return [];
  }

  return sourceData.map((item: any, index: number) => {
    // [Fix] 预先清洗图标
    let cleanIcon = item.icon;
    if (cleanIcon && typeof cleanIcon === 'string') {
      const match = cleanIcon.match(/icon-[a-zA-Z0-9-_]+/);
      if (match) {
        const iconId = match[0];
        if (!isValidIcon(iconId)) {
          cleanIcon = null;
        }
      }
    }

    const tags = Array.isArray(item.tags) ? item.tags : inferTags(item.name || '');

    // 解析数值
    const price = safeNumber(item.price, item.Price, item.cost);
    const calories = safeNumber(item.calories, item.Calories, item.cal, item.energy, item.Energy, item.kcal, item.Kcal);

    // 蛋白质尝试列表
    const protein = safeNumber(item.protein, item.Protein, item.prot, item.protein_g, item.Protein_g, item['Protein(g)']);

    // 脂肪尝试列表
    const fat = safeNumber(item.fat, item.Fat, item.fat_g, item.Fat_g, item.Total_Fat, item['Fat(g)']);

    // 碳水尝试列表
    const carbs = safeNumber(item.carbs, item.Carbs, item.carbohydrates, item.Carbohydrate, item.carbs_g, item.Carbs_g, item['Carbs(g)'], item['Carbohydrate(g)']);

    const fiber = safeNumber(item.fiber, item.Fiber, item.fibre, item.Fibre, item.fiber_g, item.Fiber_g, item['Fiber(g)']);

    return {
      ...item,
      id: item.id || `food_${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || 'Unknown',

      price,
      calories,

      // [FIX] 关键修复：同时提供全称和简写
      // UI 组件 (ModalQuantity 等) 使用 p, c, f
      protein,
      p: protein,

      fat,
      f: fat,

      carbs,
      c: carbs,

      fiber,

      tags: tags,
      category: item.category || 'DISH',

      icon: cleanIcon || `iconfont ${assignIcon(item.name || '', tags)}`,
      imgUrl: item.imgUrl || ''
    };
  });
};
