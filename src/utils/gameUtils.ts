import { RACES } from '@/constants/gameData';

// --- 存档混淆逻辑 (保持不变) ---
export const encodeSaveData = (data: any): string => {
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

export const decodeSaveData = (saveStr: string): any | null => {
  try {
    if (!saveStr.startsWith('RPG_V2$')) throw new Error('Invalid format');
    const base64 = saveStr.replace('RPG_V2$', '').replace('$END', '');
    const uriEncoded = atob(base64);
    const jsonStr = decodeURIComponent(uriEncoded);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Save decoding failed', e);
    return null;
  }
};

// --- V2.4 Feature: 文件操作工具 ---
// 更加专业的文件下载与读取逻辑，替代不稳定的剪贴板操作

export const downloadJsonFile = (filename: string, data: any) => {
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

export const readJsonFile = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // 尝试解析 JSON
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

// --- 食物命名逻辑 ---
// 格式：种族前缀·食物名 (原名)
export const formatRpgFoodName = (foodName: string, raceKey: string, originalName?: string): string => {
  const race = RACES[raceKey] || RACES.HUMAN;

  // 1. 如果名字里已经包含"·"和"(...)"，说明已经是格式化过的，直接返回
  if (foodName && foodName.includes('·') && foodName.includes('(')) return foodName;

  // 2. 确定原名
  const realOrigin = originalName || foodName;
  if (!realOrigin) return '未知食物';

  // 3. 计算前缀 (基于原名的 Hash，保证同一个食物前缀固定)
  const seed = realOrigin.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const prefix = race.prefixes[seed % race.prefixes.length];

  // 4. 组装
  return `${prefix}·${realOrigin} (${realOrigin})`;
};

// --- 战力阶位与特权 (RPG Features) ---
export const getCombatRank = (cp: number) => {
  if (cp < 500) return {
    title: '见习冒险者', color: 'text-slate-500', icon: '🪵',
    passive: '无被动效果', desc: '继续努力，从砍柴开始。'
  };
  if (cp < 1200) return {
    title: '资深猎人', color: 'text-green-500', icon: '🏹',
    passive: '野性直觉', desc: '每日任务经验 +5%'
  };
  if (cp < 2500) return {
    title: '皇家护卫', color: 'text-blue-500', icon: '🛡️',
    passive: '坚韧体魄', desc: '连击判定时间延长 30分钟'
  };
  if (cp < 5000) return {
    title: '战争领主', color: 'text-purple-500', icon: '👑',
    passive: '统御之力', desc: '全属性加成 +5%'
  };
  return {
    title: '传说英雄', color: 'text-orange-500', icon: '🌟',
    passive: '半神之躯', desc: '基础代谢 (BMR) 计算值 +100'
  };
};
