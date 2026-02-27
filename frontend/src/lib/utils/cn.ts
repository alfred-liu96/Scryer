/**
 * className 合并工具
 * 使用 clsx 和 tailwind-merge 合并类名
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 TailwindCSS 类名
 * @param inputs - 类名数组
 * @returns 合并后的类名字符串
 *
 * @example
 * cn('px-2', 'px-4') // => 'px-4' (后者覆盖前者)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
