// AI 服务逻辑封装 (RPG 核心大脑)
import type { FoodItem } from '@/types';
import { useSystemStore } from '@/stores/useSystemStore';

// [Updated] 移除了对 Store 中 aiApiKey 的依赖，因为目前 AI 功能使用 Mock 数据

const RACE_STYLES: Record<string, { prefixes: string[], style: string }> = {
  HUMAN: {
    prefixes: ['皇家', '老式', '秘制', '家乡', '骑士团', '修道院', '农夫', '帝国'],
    style: '均衡、标准化、文明的食物名。'
  },
  ELF: {
    prefixes: ['月光', '森林', '晨露', '星辰', '自然', '远古', '精灵', '世界树'],
    style: '优雅、轻盈、素食为主、带有魔法气息的食物名。'
  },
  ORC: {
    prefixes: ['蛮荒', '狂暴', '巨魔', '血腥', '战歌', '部落', '碎骨', '雷霆'],
    style: '粗犷、肉食为主、高热量、充满野性的食物名。'
  },
  DWARF: {
    prefixes: ['岩石', '熔炉', '精钢', '深渊', '黑铁', '矿工', '山丘', '烈酒'],
    style: '厚实、重油重盐、保存期长、也就是硬核的食物名。'
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
    const race = RACE_STYLES[raceKey] || RACE_STYLES.HUMAN;
    const nameStr = item.name || '未知食物';
    const hash = nameStr.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
    const prefix = race?.prefixes?.[hash % (race.prefixes?.length || 1)] || '普通';

    const originalName = item.originalName || nameStr;
    const rpgName = `${prefix}·${originalName}`;
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
