// AI 服务逻辑封装 (RPG 核心大脑)
// 负责处理 Gemini API 调用及本地沉浸式数据生成

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

// --- 2. 种族专属数据池 (本地 RPG 引擎) ---
const RACE_MOCK_DB: Record<string, any[]> = {
  HUMAN: [
    { name: '烤鸡', cals: 200, p: 20, c: 0, f: 10, unit: '只', icon: '🍗', tags: ['HIGH_PRO'] },
    { name: '面包', cals: 150, p: 5, c: 30, f: 2, unit: '块', icon: '🍞', tags: ['HIGH_CARB'] },
    { name: '炖菜', cals: 180, p: 10, c: 15, f: 8, unit: '碗', icon: '🍲', tags: ['BALANCED'], isComposite: true },
    { name: '苹果派', cals: 300, p: 2, c: 40, f: 15, unit: '块', icon: '🥧', tags: ['HIGH_SUGAR', 'HIGH_CARB'] },
    { name: '啤酒', cals: 100, p: 1, c: 10, f: 0, unit: '杯', icon: '🍺', tags: ['HIGH_CARB'] }
  ],
  ELF: [
    { name: '精灵饼干', cals: 100, p: 2, c: 20, f: 2, unit: '块', icon: '🍪', tags: ['HIGH_CARB', 'CLEAN'] },
    { name: '森林沙拉', cals: 80, p: 2, c: 15, f: 1, unit: '盘', icon: '🥗', tags: ['CLEAN'], isComposite: true },
    { name: '月亮井水', cals: 0, p: 0, c: 0, f: 0, unit: '瓶', icon: '💧', tags: ['CLEAN'] },
    { name: '野果拼盘', cals: 120, p: 1, c: 25, f: 0, unit: '份', icon: '🍇', tags: ['CLEAN', 'HIGH_SUGAR'] },
    { name: '花蜜', cals: 50, p: 0, c: 12, f: 0, unit: '勺', icon: '🍯', tags: ['HIGH_SUGAR'] }
  ],
  ORC: [
    { name: '带骨肉排', cals: 400, p: 35, c: 0, f: 25, unit: '块', icon: '🍖', tags: ['HIGH_PRO', 'HIGH_FAT'] },
    { name: '烤全羊', cals: 800, p: 60, c: 0, f: 50, unit: '只', icon: '🐐', tags: ['HIGH_PRO', 'HIGH_FAT'] },
    { name: '乱炖肉汤', cals: 350, p: 25, c: 10, f: 20, unit: '桶', icon: '🥘', tags: ['HIGH_FAT'], isComposite: true },
    { name: '生鱼片', cals: 150, p: 20, c: 0, f: 5, unit: '条', icon: '🐟', tags: ['HIGH_PRO'] },
    { name: '大骨棒', cals: 100, p: 5, c: 0, f: 8, unit: '根', icon: '🦴', tags: ['HIGH_FAT'] }
  ],
  DWARF: [
    { name: '黑麦面包', cals: 250, p: 8, c: 45, f: 3, unit: '块', icon: '🥖', tags: ['HIGH_CARB'] },
    { name: '烤猪肘', cals: 600, p: 40, c: 0, f: 45, unit: '个', icon: '🥓', tags: ['HIGH_FAT', 'HIGH_PRO'] },
    { name: '烈酒', cals: 200, p: 0, c: 15, f: 0, unit: '桶', icon: '🍺', tags: ['HIGH_CARB'] },
    { name: '咸鱼干', cals: 180, p: 30, c: 0, f: 5, unit: '条', icon: '🐟', tags: ['HIGH_PRO', 'HIGH_SODIUM'] },
    { name: '矿工馅饼', cals: 400, p: 15, c: 40, f: 20, unit: '个', icon: '🥟', tags: ['HIGH_CARB', 'HIGH_FAT'], isComposite: true }
  ]
};

const COMMON_DB = [
  { name: '米饭', cals: 116, p: 2.6, c: 25, f: 0.3, unit: '碗', icon: '🍚', tags: ['HIGH_CARB'] },
  { name: '鸡蛋', cals: 70, p: 6, c: 0.6, f: 5, unit: '个', icon: '🥚', tags: ['HIGH_PRO', 'BALANCED'] }
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
    if (!apiKey) return null;
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

  safeParseJSON(text: string | null) {
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

  // 核心：强制格式命名逻辑
  rpgify(item: any, raceKey: string) {
    const race = RACE_STYLES[raceKey] || RACE_STYLES.HUMAN;
    const hash = item.name.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
    const prefix = race?.prefixes?.[hash % (race.prefixes?.length || 1)] || '普通';

    // 严谨格式：前缀·名字 (原名)
    const originalName = item.originalName || item.name;
    const rpgName = `${prefix}·${originalName}`;
    const displayName = `${rpgName} (${originalName})`;

    let tips = '';
    switch(raceKey) {
      case 'ELF': tips = item.tags?.includes('HIGH_FAT') ? '这种油腻的东西...精灵无法下咽。' : '充满了自然的魔力。'; break;
      case 'ORC': tips = item.tags?.includes('HIGH_PRO') ? '这就对了！吃肉！长肌肉！' : '这玩意塞牙缝都不够。'; break;
      case 'DWARF': tips = item.tags?.includes('HIGH_CARB') ? '像石头一样顶饱！好极了！' : '不够劲，再来点酒！'; break;
      default: tips = '看起来很普通的补给品。';
    }

    return {
      ...item,
      name: displayName, // UI 显示用这个复合名字
      originalName: originalName,
      tips: tips,
      grams: 100
    };
  },

  getMockResponse(query: string, raceKey: string) {
    const q = query.toLowerCase();
    const raceDB = RACE_MOCK_DB[raceKey] || RACE_MOCK_DB.HUMAN;
    const fullDB = [...raceDB, ...COMMON_DB];

    const matches = fullDB.filter(item => item.name.includes(q));
    const results = matches.length > 0
      ? matches
      : fullDB.sort(() => 0.5 - Math.random()).slice(0, 3);

    return results.map(item => this.rpgify(item, raceKey));
  },

  async estimateText(query: string, userRaceName: string) {
    const raceInfo = RACE_STYLES[userRaceName] || RACE_STYLES.HUMAN;
    // 提示词要求返回标准原名，后续由 rpgify 统一包装格式
    const systemPrompt = `
    Role: RPG Dietitian. Race: ${userRaceName}. Input: "${query}".
    Return strict JSON Array.
    Rename foods to fit theme, but keep original name key.
    Format: [{"name": "Steak", "cals": 200, "p": 20, "c": 0, "f": 10, "tags": ["HIGH_PRO"]}]
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

  async identifyImage(fileContent: string, userRaceName: string) {
    const base64Data = fileContent.split(',')[1];
    const text = await this.callGemini({
      contents: [{
        parts: [
          { text: "Identify food, return JSON array. Format: [{'name': '...', 'cals': ...}]" },
          { inlineData: { mimeType: "image/jpeg", data: base64Data || '' } }
        ]
      }]
    });

    if (!text) {
      await new Promise(r => setTimeout(r, 800));
      return [this.rpgify({
        name: '神秘黑暗料理', cals: 300, p: 10, c: 30, f: 15, unit: '盘', icon: '🍲', tags: ['HIGH_FAT'], isComposite: true
      }, userRaceName)];
    }
    const data = this.safeParseJSON(text);
    if (Array.isArray(data)) {
      return data.map(item => this.rpgify(item, userRaceName));
    }
    return [];
  }
};
