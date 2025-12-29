// AI 服务逻辑封装 (RPG 核心大脑)
import type { FoodItem } from '@/types';
import { useSystemStore } from '@/stores/useSystemStore';

// [Updated] 移除了对 Store 中 aiApiKey 的依赖，因为目前 AI 功能使用 Mock 数据

// 种族命名风格 - 每个种族对食物的独特理解
const RACE_STYLES: Record<string, { style: string }> = {
  HUMAN: { style: '文明、规范、注重仪式感的命名' },
  ELF: { style: '自然、优雅、带有魔法气息的命名' },
  ORC: { style: '粗犷、直接、充满力量感的命名' },
  DWARF: { style: '厚重、实在、工匠精神的命名' }
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
    names: { HUMAN: '鲜嫩鱼排', ELF: '溪流之赐', ORC: '生啃鱼肉', DWARF: '腌制咸鱼' }
  },
  
  // 蛋奶类
  egg: { 
    keywords: ['鸡蛋', '蛋'],
    names: { HUMAN: '农场鲜蛋', ELF: '林禽之卵', ORC: '鸟巢大蛋', DWARF: '煤炉炖蛋' }
  },
  cheese: { 
    keywords: ['奶酪', '芝士'],
    names: { HUMAN: '陈年奶酪', ELF: '凝乳之石', ORC: '硬块奶酪', DWARF: '窖藏老酪' }
  },
  
  // 蔬菜类 - 精灵偏爱，兽人不屑
  vegetable: { 
    keywords: ['蔬菜', '青菜', '小白菜'],
    names: { HUMAN: '园圃蔬菜', ELF: '森林之赐', ORC: '兔子草料', DWARF: '腌制青菜' }
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

const RACE_MOCK_DB: Record<string, Partial<FoodItem>[]> = {
  HUMAN: [
    { name: '烤鸡', calories: 200, p: 20, c: 0, f: 10, unit: '只', icon: '🍗', tags: ['高蛋白'] },
    { name: '面包', calories: 150, p: 5, c: 30, f: 2, unit: '块', icon: '🍞', tags: ['高碳'] },
    { name: '炖菜', calories: 180, p: 10, c: 15, f: 8, unit: '碗', icon: '🍲', tags: ['均衡'], isComposite: true },
    { name: '苹果派', calories: 300, p: 2, c: 40, f: 15, unit: '块', icon: '🥧', tags: ['高糖', '高碳'] },
    { name: '啤酒', calories: 100, p: 1, c: 10, f: 0, unit: '杯', icon: '🍺', tags: ['高碳'] }
  ],
  ELF: [
    { name: '精灵饼干', calories: 100, p: 2, c: 20, f: 2, unit: '块', icon: '🍪', tags: ['高碳', '纯净'] },
    { name: '森林沙拉', calories: 80, p: 2, c: 15, f: 1, unit: '盘', icon: '🥗', tags: ['纯净'], isComposite: true },
    { name: '月亮井水', calories: 0, p: 0, c: 0, f: 0, unit: '瓶', icon: '💧', tags: ['纯净'] },
    { name: '野果拼盘', calories: 120, p: 1, c: 25, f: 0, unit: '份', icon: '🍇', tags: ['纯净', '高糖'] },
    { name: '花蜜', calories: 50, p: 0, c: 12, f: 0, unit: '勺', icon: '🍯', tags: ['高糖'] }
  ],
  ORC: [
    { name: '带骨肉排', calories: 400, p: 35, c: 0, f: 25, unit: '块', icon: '🍖', tags: ['高蛋白', '高油'] },
    { name: '烤全羊', calories: 800, p: 60, c: 0, f: 50, unit: '只', icon: '🐐', tags: ['高蛋白', '高油'] },
    { name: '乱炖肉汤', calories: 350, p: 25, c: 10, f: 20, unit: '桶', icon: '🥘', tags: ['高油'], isComposite: true },
    { name: '生鱼片', calories: 150, p: 20, c: 0, f: 5, unit: '条', icon: '🐟', tags: ['高蛋白'] },
    { name: '大骨棒', calories: 100, p: 5, c: 0, f: 8, unit: '根', icon: '🦴', tags: ['高油'] }
  ],
  DWARF: [
    { name: '黑麦面包', calories: 250, p: 8, c: 45, f: 3, unit: '块', icon: '🥖', tags: ['高碳'] },
    { name: '烤猪肘', calories: 600, p: 40, c: 0, f: 45, unit: '个', icon: '🥓', tags: ['高油', '高蛋白'] },
    { name: '烈酒', calories: 200, p: 0, c: 15, f: 0, unit: '桶', icon: '🍺', tags: ['高碳'] },
    { name: '咸鱼干', calories: 180, p: 30, c: 0, f: 5, unit: '条', icon: '🐟', tags: ['高蛋白', '高盐'] },
    { name: '矿工馅饼', calories: 400, p: 15, c: 40, f: 20, unit: '个', icon: '🥟', tags: ['高碳', '高油'], isComposite: true }
  ]
};

const COMMON_DB: Partial<FoodItem>[] = [
  { name: '米饭', calories: 116, p: 2.6, c: 25, f: 0.3, unit: '碗', icon: '🍚', tags: ['高碳'] },
  { name: '鸡蛋', calories: 70, p: 6, c: 0.6, f: 5, unit: '个', icon: '🥚', tags: ['高蛋白', '均衡'] }
];

interface AiPayload {
  contents: {
    parts: {
      text?: string;
      inlineData?: { mimeType: string; data: string; };
    }[];
  }[];
}

export const AiService = {
  getApiKey(): string {
    // 强制返回空字符串，触发 Mock 逻辑
    return '';
  },

  async callGemini(payload: AiPayload): Promise<string | null> {
    const key = this.getApiKey();
    if (!key) {
      // 这里的 warn 是预期的，表示走 Mock 逻辑
      // console.warn("AiService: No API Key provided. Returning mock data.");
      return null;
    }

    try {
      // 增加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.error(`Gemini API Error: ${res.status} ${res.statusText}`);
        return null;
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) {
      console.error("Gemini API Network/Timeout Error:", e);
      return null;
    }
  },

  safeParseJSON(text: string | null): Partial<FoodItem>[] | null {
    if (!text) return null;

    let cleanText = text.trim();
    // 移除 markdown 代码块标记
    cleanText = cleanText.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      return JSON.parse(cleanText);
    } catch (e) {
      console.warn("Standard JSON Parse Failed, attempting Regex recovery");
      // 尝试提取数组部分
      const match = cleanText.match(/\[[\s\S]*\]/);
      if (match) {
        try { return JSON.parse(match[0]); } catch (e2) {}
      }
      // 尝试提取单个对象并放入数组
      const objMatch = cleanText.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          const obj = JSON.parse(objMatch[0]);
          return [obj];
        } catch (e3) {}
      }
      return null;
    }
  },

  rpgify(item: Partial<FoodItem>, raceKey: string): FoodItem {
    const nameStr = item.name || '未知食物';
    const originalName = item.originalName || nameStr;
    
    // 尝试根据食物类型和种族生成RPG名称
    let rpgName = '';
    const lowerName = originalName.toLowerCase();
    
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
      rpgName = originalName;
    }
    
    const displayName = `${rpgName} (${originalName})`;

    let tips = '';
    switch(raceKey) {
      case 'ELF': tips = item.tags?.includes('高油') ? '这种油腻的东西...精灵无法下咽。' : '充满了自然的魔力。'; break;
      case 'ORC': tips = item.tags?.includes('高蛋白') ? '这就对了！吃肉！长肌肉！' : '这玩意塞牙缝都不够。'; break;
      case 'DWARF': tips = item.tags?.includes('高碳') ? '像石头一样顶饱！好极了！' : '不够劲，再来点酒！'; break;
      default: tips = '看起来很普通的补给品。';
    }

    return {
      id: Date.now() + Math.random(),
      ...item,
      name: displayName,
      originalName: originalName,
      tips: tips,
      grams: Number(item.grams) || 100,
      calories: Number(item.calories) || 0,
      p: Number(item.p) || 0,
      c: Number(item.c) || 0,
      f: Number(item.f) || 0,
      icon: item.icon || '🥘',
      tags: item.tags || []
    } as FoodItem;
  },

  getMockResponse(query: string, raceKey: string): FoodItem[] {
    const q = query.toLowerCase();
    const raceDB = RACE_MOCK_DB[raceKey] || RACE_MOCK_DB.HUMAN;
    const fullDB = [...(Array.isArray(raceDB) ? raceDB : []), ...COMMON_DB];

    const matches = fullDB.filter(item => item.name && item.name.includes(q));
    const results = matches.length > 0
      ? matches
      : fullDB.sort(() => 0.5 - Math.random()).slice(0, 3);

    return results.map(item => this.rpgify(item, raceKey));
  },

  async estimateText(query: string, userRaceName: string): Promise<FoodItem[]> {
    const systemPrompt = `
    Role: RPG Dietitian. Race: ${userRaceName}. Input: "${query}".
    Task: Identify food, estimate calories/macros for 100g or 1 unit.
    Return ONLY valid JSON Array. No markdown, no explanations.
    Tags allowed: ["高糖", "高油", "高盐", "高碳", "高蛋白", "纯净", "均衡"]
    Example: [{"name": "Beef", "calories": 250, "p": 26, "c": 0, "f": 15, "unit": "slice", "icon": "🥩", "tags": ["高蛋白", "纯净"]}]
    `;

    const text = await this.callGemini({
      contents: [{ parts: [{ text: systemPrompt }] }]
    });

    if (!text) {
      await new Promise(r => setTimeout(r, 600));
      return this.getMockResponse(query, userRaceName);
    }

    const data = this.safeParseJSON(text);
    if (Array.isArray(data) && data.length > 0) {
      return data.map(item => this.rpgify(item, userRaceName));
    }
    return this.getMockResponse(query, userRaceName);
  },

  async identifyImage(fileContent: string, userRaceName: string): Promise<FoodItem[]> {
    const base64Data = fileContent.split(',')[1];
    const text = await this.callGemini({
      contents: [{
        parts: [
          { text: "Identify food items from image. Return strict JSON Array. Keys: name, calories, p, c, f, grams(default 100), unit, tags. Tags: 高糖, 高油, 高盐, 高碳, 高蛋白, 纯净, 均衡." },
          { inlineData: { mimeType: "image/jpeg", data: base64Data || '' } }
        ]
      }]
    });

    if (!text) {
      await new Promise(r => setTimeout(r, 800));
      // Fallback for image failure
      return [this.rpgify({
        name: '未识别物体', calories: 100, p: 0, c: 0, f: 0, unit: '个', icon: '❓', tags: []
      }, userRaceName)];
    }

    const data = this.safeParseJSON(text);
    if (Array.isArray(data) && data.length > 0) {
      return data.map(item => this.rpgify(item, userRaceName));
    }
    return [];
  }
};
