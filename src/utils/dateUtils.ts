/**
 * 核心日期工具库 - 解决跨时区日期偏移问题 (Fixed for CST/Local Time)
 * * 架构原则：
 * 1. 本应用为本地优先 (Local-First) 应用，所有日期计算必须基于用户设备的本地系统时间。
 * 2. 严禁直接使用 .toISOString().split('T')[0] 获取日期字符串，这会导致 UTC+8 用户在 0点-8点 期间遭遇日期回退问题。
 */

// 类型定义：支持 Date 对象或时间戳数字
type DateInput = Date | number;

// 获取本地日期的 YYYY-MM-DD 字符串
export const getLocalDateStr = (date: DateInput = new Date(), offsetDays: number = 0): string => {
  const targetDate = new Date(date);
  if (offsetDays !== 0) {
    targetDate.setDate(targetDate.getDate() + offsetDays);
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// 获取某日凌晨 00:00:00 的时间戳 (Local Time)
export const getStartOfDay = (date: DateInput = new Date()): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const formatTime = (isoString: string | number | Date): string => {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  // 强制使用 24小时制，符合中国用户习惯
  return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
};

// 判断是否为同一天 (基于本地时间)
export const isSameDay = (d1: DateInput | string, d2: DateInput | string): boolean => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// 友好的相对时间描述
export const getRelativeTimeDesc = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  return getLocalDateStr(new Date(timestamp)); // 超过24小时直接显示日期
};

// 将 YYYY-MM-DD 字符串安全转换为 Date 对象 (避免时区偏移)
// new Date('2023-01-01') 在某些浏览器会被解析为 UTC，导致本地显示为 2022-12-31
// 此函数确保解析为 "本地该日的 00:00:00"
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();

  // 容错处理：如果是 ISO 格式 (2023-01-01T...)，只取前半部分
  const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

  const [y, m, d] = cleanDateStr.split('-').map(Number);
  // 注意：Month 是 0-11
  // 添加简单的有效性检查，防止 NaN
  if (!y || !m || !d) return new Date();

  return new Date(y, m - 1, d);
};
