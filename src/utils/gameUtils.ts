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

// --- 食物命名逻辑 ---
export const formatRpgFoodName = (foodName: string, raceKey: string, originalName?: string): string => {
  const race = RACES[raceKey] || RACES.HUMAN;

  if (foodName && foodName.includes('·') && foodName.includes('(')) return foodName;

  const realOrigin = (originalName || foodName).trim();
  if (!realOrigin) return '未知食物';

  const seed = realOrigin.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const prefix = race?.prefixes?.[seed % (race.prefixes?.length || 1)] || '普通';

  return `${prefix}·${realOrigin} (${realOrigin})`;
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
