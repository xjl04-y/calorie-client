// AI 服务逻辑封装
// 负责处理 Gemini API 调用及本地 Mock 数据回退

const apiKey = ""; // 留空则启用本地模拟模式 (Local Mock Mode)

interface AiPayload {
  contents: {
    role?: string;
    parts: {
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }[];
  }[];
}

export const AiService = {
  // 基础 API 调用
  async callGemini(payload: AiPayload): Promise<string | null> {
    if (!apiKey) return null; // 无 Key 立即返回
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
    try { return JSON.parse(text); } catch (e) {
      // 尝试提取 Markdown 代码块中的 JSON
      const match = text.match(/```json([\s\S]*?)```/);
      if (match) { try { return JSON.parse(match[1]); } catch (e2) {} }

      // 尝试提取纯对象或数组字符串
      const objectMatch = text.match(/\{[\s\S]*\}/);
      const arrayMatch = text.match(/\[[\s\S]*\]/);

      if (arrayMatch && (!objectMatch || arrayMatch.index! < objectMatch.index!)) {
        try { return JSON.parse(arrayMatch[0]); } catch(e3) {}
      }
      if (objectMatch) {
        try { return JSON.parse(objectMatch[0]); } catch(e3) {}
      }
      return null;
    }
  },

  // 本地模拟逻辑 (Mock Strategy)
  getMockResponse(query: string) {
    const q = query.toLowerCase();
    if (q.includes('糖') || q.includes('甜') || q.includes('sugar') || q.includes('cake')) {
      return { name: query, cals: 400, p: 2, c: 80, f: 10, grams: 100, unit: '份', icon: '🍰', tags: ['HIGH_SUGAR', 'HIGH_CARB'], tips: '贤者(模拟): 甜度爆表！' };
    }
    if (q.includes('肉') || q.includes('鸡') || q.includes('牛') || q.includes('meat')) {
      return { name: query, cals: 250, p: 25, c: 0, f: 15, grams: 100, unit: '份', icon: '🥩', tags: ['HIGH_PRO', 'HIGH_FAT'], tips: '贤者(模拟): 充满力量！' };
    }
    if (q.includes('菜') || q.includes('瓜') || q.includes('veg')) {
      return { name: query, cals: 30, p: 2, c: 5, f: 0, grams: 100, unit: '份', icon: '🥬', tags: ['CLEAN'], tips: '贤者(模拟): 清爽健康。' };
    }
    if (q.includes('饭') || q.includes('面') || q.includes('rice')) {
      return { name: query, cals: 180, p: 4, c: 40, f: 1, grams: 100, unit: '碗', icon: '🍚', tags: ['HIGH_CARB'], tips: '贤者(模拟): 碳水炸弹。' };
    }
    // 默认随机
    return { name: query, cals: Math.floor(Math.random()*300)+100, p: 10, c: 20, f: 10, grams: 100, unit: '份', icon: '🍱', tags: [], tips: '贤者(模拟): 似乎可以吃...' };
  },

  // 估算文本 (核心业务接口)
  async estimateText(query: string, userRaceName: string) {
    // 优先 API，失败则回退 Mock
    let text = await this.callGemini({
      contents: [{ parts: [{ text: `Estimate food: ${query} for race ${userRaceName} return valid JSON only. format: {name, cals, p, c, f, grams, unit, icon, tags[], tips}.` }] }]
    });

    if (!text) {
      await new Promise(r => setTimeout(r, 600)); // Simulate delay
      return this.getMockResponse(query);
    }
    return this.safeParseJSON(text || "");
  },

  // 识别图片 (核心业务接口)
  async identifyImage(fileContent: string, userRaceName: string) {
    // fileContent 是 base64 字符串 (data:image/jpeg;base64,...)
    const base64Data = fileContent.split(',')[1];
    let text = await this.callGemini({
      contents: [{
        parts: [
          { text: `Identify food in image for race ${userRaceName}. Return JSON: {name, cals, p, c, f, grams, unit, icon, tags[], tips}` },
          { inlineData: { mimeType: "image/jpeg", data: base64Data } }
        ]
      }]
    });

    if (!text) {
      await new Promise(r => setTimeout(r, 1000));
      return { name: '神秘料理(识别模拟)', cals: 300, p: 15, c: 30, f: 12, grams: 100, icon: '🥘', tags: [], tips: '贤者: 眼花看不清，随便吃点吧' };
    }
    return this.safeParseJSON(text || "");
  }
};
