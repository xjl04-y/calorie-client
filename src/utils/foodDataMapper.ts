import rawFoodData from '@/constants/food-table.json';
import type { FoodItem } from '@/types';

// 辅助函数：提取字符串中的数字
const parseNumber = (str: string | number | undefined | null): number => {
  if (typeof str === 'number') return str;
  if (!str || typeof str !== 'string') return 0;
  const match = str.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[0]) : 0;
};

// 核心：智能推断标签和分类
const inferTags = (name: string): string[] => {
  const tags: string[] = [];

  // --- 1. 基础分类 (底层元数据，用于Tab筛选，不一定要显示) ---

  // 饮品识别
  if (/[酒啤酿醉饮茶咖奶汁露浆水]/.test(name)) tags.push('DRINK');
  if (/[酒啤酿醉]/.test(name) || /鸡尾酒/.test(name)) tags.push('ALCOHOL');

  // 肉类识别 [Bug Fix: 修复 "鸡尾酒" 被识别为禽肉的问题]
  // 逻辑：匹配肉类关键词，且不能包含 "鸡尾酒"、"牛油果" 等干扰词
  const isCocktail = /鸡尾酒/.test(name);
  const isAvocado = /牛油果/.test(name); // 防御性编程

  if (/牛|羊|猪|鹿|排|肠|火腿|肉/.test(name) && !isAvocado && !/果肉/.test(name)) {
    tags.push('MEAT', 'RED_MEAT');
  }
  else if (/[鸡鸭鹅禽蛋]/.test(name) && !isCocktail) {
    tags.push('MEAT', 'POULTRY');
  }
  else if (/[鱼虾蟹贝海]/.test(name)) {
    tags.push('MEAT', 'SEAFOOD');
  }

  // 素食识别
  if (/[菜瓜豆菇笋茄椒葱蒜]/.test(name)) tags.push('VEGETABLE');
  if (/[果莓蕉梨桃橘柑柚枣]/.test(name) && !isCocktail) tags.push('FRUIT'); // 鸡尾酒不算水果

  // 主食与零食
  if (/[饭面粉饼馍糕包米麦粥]/.test(name)) tags.push('STAPLE');
  if (/[糖巧酥蜜冻干糕]/.test(name)) tags.push('SNACK');

  // --- 2. 状态识别 (RPG 属性) ---
  if (/[干片脆]/.test(name)) tags.push('STATE_DRIED');
  if (/[酱腌泡咸腊]/.test(name)) tags.push('STATE_PRESERVED');
  if (/[烤熏烧炸煎炒]/.test(name)) tags.push('STATE_COOKED');
  if (/[鲜生刺身]/.test(name)) tags.push('STATE_RAW');

  // --- 3. [New] 感官风味与温度 (RPG 核心玩法标签) ---
  // 这些标签才是需要展示给用户看的 "Buff/Debuff 提示"

  // 辛辣: 火属性
  if (/[辣麻咖]/.test(name)) tags.push('FLAVOR_SPICY');

  // 酸味: 克制油腻
  if (/[酸醋柠]/.test(name)) tags.push('FLAVOR_SOUR');

  // 甜味: 治愈 (注意排除纯糖，更多指风味)
  if (/[甜蜜糖糕]/.test(name)) tags.push('FLAVOR_SWEET');

  // 苦味: 解毒
  if (/[苦咖茶]/.test(name)) tags.push('FLAVOR_BITTER');

  // 冰冷: 冰属性
  if (/[冰冻冷雪]/.test(name) || /鸡尾酒/.test(name)) tags.push('TEMP_COLD');

  // 热食: 抵抗严寒
  if (/[锅煲炖汤热]/.test(name)) tags.push('TEMP_HOT');

  return tags;
};

// 根据标签推断主分类（用于 Tab 筛选）
const inferCategory = (tags: string[]): string => {
  if (tags.includes('STAPLE')) return 'STAPLE';
  if (tags.includes('MEAT')) return 'MEAT';
  if (tags.includes('VEGETABLE') || tags.includes('FRUIT')) return 'VEG';
  if (tags.includes('DRINK')) return 'DRINK';
  return 'OTHER';
};

/**
 * 获取初始食物数据
 */
export const getInitialFoods = (): FoodItem[] => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rawFoodData.map((item: any, index: number) => {
    // 优先使用 JSON 中的 ID，如果没有则生成
    const id = item._id?.$oid || item._id || `food_${Date.now()}_${index}`;
    const info = item.info || {};
    const calories = parseNumber(info['能量']);
    const tags = inferTags(item.name);
    const category = inferCategory(tags);

    return {
      id: id,
      name: item.name,
      originalName: item.name,
      icon: '🍽️',
      calories: calories,
      p: parseNumber(info['蛋白质']),
      c: parseNumber(info['碳水化合物']),
      f: parseNumber(info['脂肪']),
      grams: 100,
      category: category,
      tags: tags,
      tips: `每100克含有${calories}千卡能量`,
      usageCount: 0
    } as FoodItem;
  });
};
