/**
 * Select 下拉选择器组件
 *
 * 这是一个简化版本的实现，仅作为示例
 * 完整实现需要更多的功能和优化
 */

import { cn } from '@/lib/utils';
import { type ReactNode, useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  [key: string]: any;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[], option: SelectOption) => void;
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function Select({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  multiple = false,
  searchable = false,
  disabled = false,
  placeholder = '请选择',
  className,
}: SelectProps) {
  const [internalValue, setInternalValue] = useState<string | string[]>(
    defaultValue || (multiple ? [] : '')
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  // 过滤选项
  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // 获取显示文本
  const getDisplayLabel = () => {
    if (multiple && Array.isArray(currentValue)) {
      if (currentValue.length === 0) return placeholder;
      return options
        .filter((opt) => currentValue.includes(opt.value))
        .map((opt) => opt.label)
        .join(', ');
    }
    const option = options.find((opt) => opt.value === currentValue);
    return option?.label || placeholder;
  };

  // 处理选项点击
  const handleOptionClick = (option: SelectOption) => {
    if (option.disabled) return;

    let newValue: string | string[];
    if (multiple) {
      const values = Array.isArray(currentValue) ? currentValue : [];
      newValue = values.includes(option.value)
        ? values.filter((v) => v !== option.value)
        : [...values, option.value];
    } else {
      newValue = option.value;
      setIsOpen(false);
    }

    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue, option);
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        dropdownRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative select">
      {/* 触发器 */}
      <div
        ref={triggerRef}
        className={cn(
          'select-trigger flex items-center justify-between px-3 py-2 border rounded-lg cursor-pointer',
          'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
          'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {getDisplayLabel()}
        </span>
        <svg
          className={cn(
            'w-5 h-5 text-gray-400 transition-transform',
            isOpen && 'transform rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'select-dropdown absolute z-50 w-full mt-1 bg-white dark:bg-gray-800',
            'border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg',
            'max-h-60 overflow-auto'
          )}
          role="listbox"
        >
          {/* 搜索框 */}
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* 选项列表 */}
          {filteredOptions.map((option) => {
            const isSelected = multiple
              ? Array.isArray(currentValue) && currentValue.includes(option.value)
              : currentValue === option.value;

            return (
              <div
                key={option.value}
                className={cn(
                  'select-option px-3 py-2 text-sm cursor-pointer',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  isSelected && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleOptionClick(option)}
              >
                {option.label}
              </div>
            );
          })}

          {filteredOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              无匹配项
            </div>
          )}
        </div>
      )}
    </div>
  );
}
