/**
 * 格式化工具函数
 */

/**
 * 格式化日期为本地字符串
 * @param date - 日期字符串或 Date 对象
 * @param locale - 地区代码，默认 'zh-CN'
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: string | Date, locale = 'zh-CN'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale);
}

/**
 * 格式化日期时间为本地字符串
 * @param date - 日期字符串或 Date 对象
 * @param locale - 地区代码，默认 'zh-CN'
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(date: string | Date, locale = 'zh-CN'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString(locale);
}

/**
 * 截断文本
 * @param text - 原始文本
 * @param maxLength - 最大长度
 * @param suffix - 后缀，默认 '...'
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}
