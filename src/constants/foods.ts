import type { FoodItem } from '@/types';

/**
 * 种族默认食物配置
 */
export const RACE_DEFAULT_FOODS: Record<string, Partial<FoodItem>[]> = {
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
