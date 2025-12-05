// AI 服务逻辑封装 (RPG 核心大脑)
// 负责处理 Gemini API 调用及本地沉浸式数据生成

// 这里预留 API Key，如果为空会自动降级使用强大的本地 RPG 数据库
const apiKey = "";

// --- 1. RPG 风格定义 (微调模型的基础) ---
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

// --- 2. 本地海量数据池 (兜底数据微调) ---
// 当 AI 不可用时，这些数据会被动态“附魔”成 RPG 物品
const MOCK_DB = [
  // 主食
  { name: '米饭', cals: 116, p: 2.6, c: 25, f: 0.3, unit: '碗', icon: '🍚', tags: ['HIGH_CARB'] },
  { name: '全麦面包', cals: 246, p: 10, c: 49, f: 3, unit: '片', icon: '🍞', tags: ['HIGH_CARB'] },
  { name: '拉面', cals: 400, p: 10, c: 60, f: 15, unit: '碗', icon: '🍜', tags: ['HIGH_CARB', 'HIGH_SODIUM'] },
  { name: '燕麦粥', cals: 68, p: 2.4, c: 12, f: 1.4, unit: '碗', icon: '🥣', tags: ['CLEAN'] },
  { name: '馒头', cals: 223, p: 7, c: 47, f: 1, unit: '个', icon: '🥯', tags: ['HIGH_CARB'] },
  { name: '肉夹馍', cals: 450, p: 15, c: 40, f: 25, unit: '个', icon: '🌮', tags: ['HIGH_FAT', 'HIGH_CARB'] },

  // 肉类 (高蛋白/高脂)
  { name: '鸡胸肉', cals: 165, p: 31, c: 0, f: 3.6, unit: '块', icon: '🥩', tags: ['HIGH_PRO', 'CLEAN'] },
  { name: '牛排', cals: 250, p: 26, c: 0, f: 15, unit: '份', icon: '🥩', tags: ['HIGH_PRO', 'HIGH_FAT'] },
  { name: '红烧肉', cals: 470, p: 13, c: 5, f: 45, unit: '份', icon: '🍖', tags: ['HIGH_FAT', 'HIGH_SODIUM'] },
  { name: '炸鸡', cals: 290, p: 20, c: 10, f: 20, unit: '块', icon: '🍗', tags: ['HIGH_FAT', 'HIGH_PRO'] },
  { name: '烤鱼', cals: 120, p: 20, c: 2, f: 4, unit: '条', icon: '🐟', tags: ['HIGH_PRO'] },
  { name: '香肠', cals: 300, p: 12, c: 5, f: 25, unit: '根', icon: '🌭', tags: ['HIGH_FAT', 'HIGH_SODIUM'] },

  // 蔬菜/素食
  { name: '沙拉', cals: 30, p: 1, c: 5, f: 0, unit: '盘', icon: '🥗', tags: ['CLEAN'] },
  { name: '西兰花', cals: 34, p: 2.8, c: 7, f: 0.4, unit: '份', icon: '🥦', tags: ['CLEAN'] },
  { name: '炒青菜', cals: 60, p: 2, c: 4, f: 4, unit: '盘', icon: '🥬', tags: ['CLEAN'] },
  { name: '玉米', cals: 86, p: 3, c: 19, f: 1, unit: '根', icon: '🌽', tags: ['HIGH_CARB', 'CLEAN'] },

  // 零食/饮品
  { name: '可乐', cals: 140, p: 0, c: 35, f: 0, unit: '罐', icon: '🥤', tags: ['HIGH_SUGAR'] },
  { name: '奶茶', cals: 400, p: 5, c: 50, f: 20, unit: '杯', icon: '🧋', tags: ['HIGH_SUGAR', 'HIGH_FAT'] },
  { name: '苹果', cals: 52, p: 0.3, c: 14, f: 0.2, unit: '个', icon: '🍎', tags: ['CLEAN'] },
  { name: '薯片', cals: 536, p: 7, c: 53, f: 35, unit: '包', icon: '🥔', tags: ['HIGH_FAT', 'HIGH_CARB'] },
  { name: '蛋糕', cals: 350, p: 6, c: 50, f: 15, unit: '块', icon: '🍰', tags: ['HIGH_SUGAR', 'HIGH_CARB', 'HIGH_FAT'] },
  { name: '黑咖啡', cals: 5, p: 0, c: 1, f: 0, unit: '杯', icon: '☕', tags: ['CLEAN'] },
  { name: '啤酒', cals: 43, p: 0.5, c: 3.6, f: 0, unit: '杯', icon: '🍺', tags: ['HIGH_CARB'] }
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
  // 基础 API 调用
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

  // 安全 JSON 解析
  safeParseJSON(text: string | null) {
    if (!text) return null;
    const cleanText = text.replace(/```json|```/g, '').trim(); // 清理 markdown
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      console.warn("JSON Parse Failed, attempting heuristic extraction");
      const match = cleanText.match(/\[[\s\S]*\]/) || cleanText.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch (e2) {}
      }
      return null;
    }
  },

  // --- 核心：RPG 数据附魔逻辑 (Local RPG Engine) ---
  rpgify(item: any, raceKey: string) {
    const race = RACE_STYLES[raceKey] || RACE_STYLES.HUMAN;

    // 随机选择前缀
    // 使用 item 名称的 hash 来保证同一个食物每次生成的前缀一致
    const hash = item.name.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
    const prefix = race?.prefixes?.[hash % (race.prefixes?.length || 1)] || 'Ancient';

    // 生成 RPG 风格名称
    const rpgName = `${prefix}·${item.name}`;

    // 根据种族微调提示语
    let tips = '';
    switch(raceKey) {
      case 'ELF': tips = item.tags?.includes('HIGH_FAT') ? '精灵对此感到油腻...' : '充满自然的气息。'; break;
      case 'ORC': tips = item.tags?.includes('HIGH_PRO') ? '这正是勇士的力量源泉！' : '这东西能吃饱吗？'; break;
      case 'DWARF': tips = item.tags?.includes('HIGH_CARB') ? '像石头一样顶饱！' : '不够劲，再来点酒！'; break;
      default: tips = '看起来很普通的食物。';
    }

    return {
      ...item,
      name: rpgName, // 界面显示 RPG 名
      originalName: item.name, // 保留原名备查
      displayName: `${rpgName} (${item.name})`, // 搜索列表显示
      tips: tips,
      grams: 100 // 默认基准
    };
  },

  // 本地模糊搜索 + RPG 化
  getMockResponse(query: string, raceKey: string) {
    const q = query.toLowerCase();
    // 过滤出匹配的项
    const matches = MOCK_DB.filter(item => item.name.includes(q));

    // 如果没有匹配，随机返回几个推荐
    const results = matches.length > 0
      ? matches
      : MOCK_DB.sort(() => 0.5 - Math.random()).slice(0, 3); // 随机3个

    // 对结果进行 RPG 附魔
    return results.map(item => this.rpgify(item, raceKey));
  },

  // 估算文本 (核心业务接口)
  async estimateText(query: string, userRaceName: string) {
    const raceInfo = RACE_STYLES[userRaceName] || RACE_STYLES.HUMAN;

    // --- Prompt Engineering (微调提示词) ---
    const systemPrompt = `
    Role: Professional RPG Dietitian & Chef.
    User Race: ${userRaceName} (Style: ${raceInfo?.style || 'fantasy'}).
    User Input: "${query}".

    Task: Identify food items from input and return a JSON Array.

    Requirements:
    1. **Strict JSON**: Return ONLY a JSON Array. No markdown, no comments.
    2. **RPG Naming**: Rename foods to fit the ${userRaceName} fantasy style using prefixes like [${raceInfo?.prefixes?.join(', ') || 'Ancient, Mystic, Royal'}].
       Example: "Apple" -> "Forest Whisper Apple" (for Elf).
    3. **Accuracy**: Estimate calories (cals), protein (p), carbs (c), fat (f) per 100g/unit.
    4. **Tags**: Add tags from [HIGH_CARB, HIGH_FAT, HIGH_SUGAR, HIGH_SODIUM, HIGH_PRO, CLEAN].
       - High Carb: >20g/100g
       - High Fat: >10g/100g
       - High Pro: >10g/100g
       - High Sugar: Candy, Soda, etc.
    5. **Diversity**: If the query is vague (e.g., "Lunch"), return 3-5 distinct RPG options suitable for this race.

    Output Format (Array of Objects):
    [
      {
        "name": "RPG Name",
        "originalName": "Real Name",
        "cals": 200,
        "p": 10, "c": 20, "f": 5,
        "grams": 100,
        "unit": "portion",
        "icon": "🍖",
        "tags": ["HIGH_PRO"],
        "tips": "Flavor text explaining why this suits the race."
      }
    ]
    `;

    // 优先调用 API
    const text = await this.callGemini({
      contents: [{ parts: [{ text: systemPrompt }] }]
    });

    // 如果 API 失败或未配置，使用强大的本地引擎
    if (!text) {
      console.log("Using Local RPG Engine...");
      // 模拟网络延迟，增加真实感
      await new Promise(r => setTimeout(r, 600));
      return this.getMockResponse(query, userRaceName);
    }

    return this.safeParseJSON(text);
  },

  // 识别图片 (核心业务接口)
  async identifyImage(fileContent: string, userRaceName: string) {
    const base64Data = fileContent.split(',')[1];
    const raceInfo = RACE_STYLES[userRaceName] || RACE_STYLES.HUMAN;

    const prompt = `
    Identify food in image for a ${userRaceName} character.
    Return JSON Array of detected items with RPG names (Style: ${raceInfo?.style || 'fantasy'}).
    Format: [{name, originalName, cals, p, c, f, grams, unit, icon, tags[], tips}].
    Strict JSON only.
    `;

    const text = await this.callGemini({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Data || '' } }
        ]
      }]
    });

    if (!text) {
      await new Promise(r => setTimeout(r, 800));
      // 图片识别失败的 Mock：随机返回一个“神秘料理”
      return [this.rpgify({
        name: '神秘黑暗料理', cals: 300, p: 10, c: 30, f: 15, unit: '盘', icon: '🍲', tags: ['HIGH_FAT', 'HIGH_SODIUM']
      }, userRaceName)];
    }
    return this.safeParseJSON(text);
  }
};
