// AI 服务逻辑封装 (RPG 核心大脑)
// PM Note: 全面移除 any，增强接口定义的健壮性

import type { FoodItem } from '@/types';

const apiKey = "";

// --- 1. RPG 风格定义 ---
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

// --- 2. 种族专属数据池 (本地 RPG 引擎 - 中文标签版) ---
// [Fixed] 类型严格化为 Partial<FoodItem>[]，因为 mock 数据可能缺少部分字段由 rpgify 补全
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
  async callGemini(payload: AiPayload): Promise<string | null> {
    // [Fix Bug] 优雅降级：如果没有 API Key，直接返回 null，不进行网络请求
    if (!apiKey) {
      console.warn("AiService: No API Key provided. Returning mock data.");
      return null;
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) {
      console.error("Gemini API Error:", e);
      return null;
    }
  },

  safeParseJSON(text: string | null): Partial<FoodItem>[] | null {
    if (!text) return null;
    const cleanText = text.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      console.warn("JSON Parse Failed");
      const match = cleanText.match(/\[[\s\S]*\]/) || cleanText.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch (e2) {}
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
    // Tip 逻辑也适配中文标签
    switch(raceKey) {
      case 'ELF': tips = item.tags?.includes('高油') ? '这种油腻的东西...精灵无法下咽。' : '充满了自然的魔力。'; break;
      case 'ORC': tips = item.tags?.includes('高蛋白') ? '这就对了！吃肉！长肌肉！' : '这玩意塞牙缝都不够。'; break;
      case 'DWARF': tips = item.tags?.includes('高碳') ? '像石头一样顶饱！好极了！' : '不够劲，再来点酒！'; break;
      default: tips = '看起来很普通的补给品。';
    }

    return {
      id: Date.now() + Math.random(), // Ensure ID
      ...item,
      name: displayName,
      originalName: originalName,
      tips: tips,
      grams: item.grams || 100,
      calories: item.calories || 0,
      p: item.p || 0,
      c: item.c || 0,
      f: item.f || 0,
      icon: item.icon || '🥘'
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
    // 提示词要求返回中文标签，并且使用 calories
    const systemPrompt = `
    Role: RPG Dietitian. Race: ${userRaceName}. Input: "${query}".
    Return strict JSON Array.
    Rename foods to fit theme, but keep original name key.
    Use Chinese tags only: ["高糖", "高油", "高盐", "高碳", "高蛋白", "纯净", "均衡"]
    Format: [{"name": "Steak", "calories": 200, "p": 20, "c": 0, "f": 10, "tags": ["高蛋白"]}]
    `;

    const text = await this.callGemini({
      contents: [{ parts: [{ text: systemPrompt }] }]
    });

    if (!text) {
      await new Promise(r => setTimeout(r, 600));
      return this.getMockResponse(query, userRaceName);
    }

    const data = this.safeParseJSON(text);
    if (Array.isArray(data)) {
      return data.map(item => this.rpgify(item, userRaceName));
    }
    return this.getMockResponse(query, userRaceName);
  },

  async identifyImage(fileContent: string, userRaceName: string): Promise<FoodItem[]> {
    const base64Data = fileContent.split(',')[1];
    const text = await this.callGemini({
      contents: [{
        parts: [
          { text: "Identify food, return JSON array. Tags must be one of: 高糖, 高油, 高盐, 高碳, 高蛋白, 纯净, 均衡. Format: [{'name': '...', 'calories': ..., 'tags': ['高蛋白']}]" },
          { inlineData: { mimeType: "image/jpeg", data: base64Data || '' } }
        ]
      }]
    });

    if (!text) {
      await new Promise(r => setTimeout(r, 800));
      // [Fix] 这里的模拟返回值也需要修正
      return [this.rpgify({
        name: '神秘黑暗料理', calories: 300, p: 10, c: 30, f: 15, unit: '盘', icon: '🍲', tags: ['高油'], isComposite: true
      }, userRaceName)];
    }
    const data = this.safeParseJSON(text);
    if (Array.isArray(data)) {
      return data.map(item => this.rpgify(item, userRaceName));
    }
    return [];
  }
};
