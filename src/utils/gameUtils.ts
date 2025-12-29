import { RACES } from '@/constants/gameData';
import { v4 as uuidv4 } from 'uuid'; // [技术工单02] UUID库导入

// [指令5] ID升级 - 直接使用UUID字符串,绝对防止ID冲突
export const generateId = (): string => {
  return uuidv4();
};

// [技术工单02] 移动端底层兼容性补丁 - UUID生成器
// 使用uuid库代替crypto.randomUUID()，避免旧版Android WebView崩溃
export const generateUUID = (): string => {
  return uuidv4();
};

// --- 工具函数：安全震动 ---
// 兼容 Capacitor Haptics 和 Web Vibration API
export const safeVibrate = (pattern: number | number[] = 200) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // 忽略不支持的情况
    }
  }
};

// --- 工具函数：防抖 ---
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function(this: any, ...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

// --- 存档混淆逻辑 (Enhanced Types) ---
export const encodeSaveData = (data: unknown): string => {
  try {
    const jsonStr = JSON.stringify(data);
    const uriEncoded = encodeURIComponent(jsonStr);
    const base64 = btoa(uriEncoded);
    return `RPG_V2$${base64}$END`;
  } catch (e) {
    console.error('Save encoding failed', e);
    return '';
  }
};

export const decodeSaveData = <T = unknown>(saveStr: string): T | null => {
  try {
    if (!saveStr.startsWith('RPG_V2$')) throw new Error('Invalid format');
    const base64 = saveStr.replace('RPG_V2$', '').replace('$END', '');
    const uriEncoded = atob(base64);
    const jsonStr = decodeURIComponent(uriEncoded);
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error('Save decoding failed', e);
    return null;
  }
};

// --- 文件操作工具 ---
export const downloadJsonFile = (filename: string, data: unknown) => {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error('File download failed', e);
    return false;
  }
};

export const readJsonFile = (file: File): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        resolve(data);
      } catch (err) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
};

// 食物名称映射规则 - 根据种族和食物类型生成RPG名称（体现种族特色）
const FOOD_NAME_MAPPING: Record<string, { 
  keywords: string[], 
  names: { HUMAN: string, ELF: string, ORC: string, DWARF: string } 
}> = {
  // 饮品类 - 不同种族的独特理解
  water: { 
    keywords: ['水', '纯净水', '矿泉水', '白开水', '清泉'],
    names: { HUMAN: '圣泉净水', ELF: '月井清泉', ORC: '野溪活水', DWARF: '山泉烈酿' }
  },
  milk: { 
    keywords: ['牛奶', '鲜奶'],
    names: { HUMAN: '贵族鲜奶', ELF: '自然之乳', ORC: '野牛浓奶', DWARF: '矿工厚奶' }
  },
  tea: { 
    keywords: ['茶', '绿茶', '红茶', '花茶'],
    names: { HUMAN: '宫廷茶饮', ELF: '星辰花茶', ORC: '草原苦茶', DWARF: '烟熏浓茶' }
  },
  coffee: { 
    keywords: ['咖啡'],
    names: { HUMAN: '学者咖啡', ELF: '晨露咖啡', ORC: '觉醒黑液', DWARF: '工匠浓咖' }
  },
  beer: { 
    keywords: ['啤酒', '麦酒', '黄酒'],
    names: { HUMAN: '皇家麦酒', ELF: '月光蜜酒', ORC: '战吼烈酒', DWARF: '岩石浓啤' }
  },
  yogurt: { 
    keywords: ['酸奶', '优格'],
    names: { HUMAN: '发酵酸乳', ELF: '花蜜酸奶', ORC: '兽奶发酵', DWARF: '地窖酸乳' }
  },
  
  // 主食类 - 体现种族饮食文化
  rice: { 
    keywords: ['米饭', '大米', '白饭'],
    names: { HUMAN: '精制白米', ELF: '谷灵之饭', ORC: '战士饱粮', DWARF: '熔炉蒸饭' }
  },
  bread: { 
    keywords: ['面包', '全麦', '黑麦'],
    names: { HUMAN: '骑士面包', ELF: '森之薄饼', ORC: '部落厚饼', DWARF: '矿工硬面包' }
  },
  noodle: { 
    keywords: ['面条', '拉面', '意面', '面'],
    names: { HUMAN: '贵族细面', ELF: '藤蔓灵面', ORC: '粗筋面条', DWARF: '铁炉劲面' }
  },
  dumpling: { 
    keywords: ['饺子'],
    names: { HUMAN: '宴会饺子', ELF: '月牙灵饺', ORC: '肉团战饺', DWARF: '金块饺子' }
  },
  
  // 肉类 - 强调力量与能量
  beef: { 
    keywords: ['牛肉', '牛排'],
    names: { HUMAN: '贵族牛排', ELF: '禁忌兽肉', ORC: '狂牛巨排', DWARF: '炭烤牛块' }
  },
  pork: { 
    keywords: ['猪肉', '猪排'],
    names: { HUMAN: '农家猪肉', ELF: '禁忌畜肉', ORC: '野猪厚肉', DWARF: '盐渍猪排' }
  },
  chicken: { 
    keywords: ['鸡肉', '烤鸡', '鸡胸', '鸡腿'],
    names: { HUMAN: '烤制鸡肉', ELF: '林禽之肉', ORC: '狩猎鸡腿', DWARF: '烟熏鸡块' }
  },
  fish: { 
    keywords: ['鱼', '三文鱼', '鲈鱼'],
    names: { HUMAN: '鲜嫩鱼排', ELF: '溪流之赠', ORC: '生啃鱼肉', DWARF: '腌制咸鱼' }
  },
  
  // 蛋奶类
  egg: { 
    keywords: ['鸡蛋', '蛋'],
    names: { HUMAN: '农场鲜蛋', ELF: '林禽之卵', ORC: '鸟巢大蛋', DWARF: '煥炉炖蛋' }
  },
  cheese: { 
    keywords: ['奶酪', '芝士'],
    names: { HUMAN: '陈年奶酪', ELF: '凝乳之石', ORC: '硬块奶酪', DWARF: '窖藏老酪' }
  },
  
  // 蔬菜类 - 精灵偏爱，兽人不屑
  vegetable: { 
    keywords: ['蔬菜', '青菜', '小白菜'],
    names: { HUMAN: '园圃蔬菜', ELF: '森林之赠', ORC: '兔子草料', DWARF: '腌制青菜' }
  },
  tomato: { 
    keywords: ['番茄', '西红柿'],
    names: { HUMAN: '红玉番茄', ELF: '红宝石果', ORC: '血浆果子', DWARF: '火炉番茄' }
  },
  potato: { 
    keywords: ['土豆', '马铃薯'],
    names: { HUMAN: '农田土豆', ELF: '大地之实', ORC: '填肚薯块', DWARF: '矿工主粮' }
  },
  
  // 水果类 - 自然的馈赠
  apple: { 
    keywords: ['苹果'],
    names: { HUMAN: '果园苹果', ELF: '智慧之果', ORC: '脆响野果', DWARF: '酿酒苹果' }
  },
  banana: { 
    keywords: ['香蕉'],
    names: { HUMAN: '热带香蕉', ELF: '月牙灵果', ORC: '黄皮长果', DWARF: '能量蕉条' }
  },
  orange: { 
    keywords: ['橙子', '橘子'],
    names: { HUMAN: '阳光橙子', ELF: '金阳之果', ORC: '酸汁圆果', DWARF: '维生素球' }
  },
  
  // 零食类 - 甜蜜的诱惑
  chocolate: { 
    keywords: ['巧克力'],
    names: { HUMAN: '贵族巧克力', ELF: '可可之泪', ORC: '能量黑块', DWARF: '糖铸金砖' }
  },
  cookie: { 
    keywords: ['饼干'],
    names: { HUMAN: '茶点饼干', ELF: '星辰薄片', ORC: '快充干粮', DWARF: '铁板脆饼' }
  },
  cake: { 
    keywords: ['蛋糕'],
    names: { HUMAN: '庆典蛋糕', ELF: '花瓣糕点', ORC: '甜腻软饼', DWARF: '烤炉糕点' }
  },
  nut: { 
    keywords: ['坚果', '核桃', '杏仁'],
    names: { HUMAN: '混合坚果', ELF: '森林硬果', ORC: '牙缝补给', DWARF: '岩石硬壳' }
  }
};

// --- 食物命名逻辑 ---
export const formatRpgFoodName = (foodName: string, raceKey: string, originalName?: string): string => {
  const race = RACES[raceKey] || RACES.HUMAN;

  // 如果已经是RPG格式，直接返回
  if (foodName && foodName.includes('(') && foodName.includes(')')) return foodName;

  const realOrigin = (originalName || foodName).trim();
  if (!realOrigin) return '未知食物';
  
  // 尝试根据食物类型和种族生成RPG名称
  let rpgName = '';
  const lowerName = realOrigin.toLowerCase();
  
  // 先尝试从预定义映射中查找（按关键词精确度排序）
  const matchedMapping = Object.entries(FOOD_NAME_MAPPING).find(([_, mapping]) => {
    const sortedKeywords = mapping.keywords.sort((a, b) => b.length - a.length);
    return sortedKeywords.some(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      return lowerName.includes(lowerKeyword);
    });
  });
  
  if (matchedMapping) {
    // 根据种族选择对应的名称
    const names = matchedMapping[1].names;
    rpgName = names[raceKey as keyof typeof names] || names.HUMAN;
  } else {
    // 如果没有匹配，使用原名
    rpgName = realOrigin;
  }
  
  return `${rpgName} (${realOrigin})`;
};

// --- 战力阶位与特权 ---
export const getCombatRank = (cp: number) => {
  if (cp < 500) return {
    title: '见习冒险者', color: 'text-slate-500', icon: '🪵',
    passive: '无被动效果', desc: '继续努力，从砍柴开始。',
    next: 500
  };
  if (cp < 1200) return {
    title: '资深猎人', color: 'text-green-500', icon: '🏹',
    passive: '野性直觉', desc: '每日任务经验 +5%',
    next: 1200
  };
  if (cp < 2500) return {
    title: '皇家护卫', color: 'text-blue-500', icon: '🛡️',
    passive: '坚韧体魄', desc: '连击判定时间延长 30分钟',
    next: 2500
  };
  if (cp < 5000) return {
    title: '战争领主', color: 'text-purple-500', icon: '👑',
    passive: '统御之力', desc: '全属性加成 +5%',
    next: 5000
  };
  return {
    title: '传说英雄', color: 'text-orange-500', icon: '🌟',
    passive: '半神之躯', desc: '基础代谢 (BMR) 计算值 +100',
    next: null
  };
};
