/**
 * Jest 配置文件
 *
 * 为 Next.js + React Testing Library 配置测试环境
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // 提供 Next.js 应用的路径
  dir: './',
})

// 添加自定义配置
const customJestConfig = {
  // 测试环境设置
  testEnvironment: 'jest-environment-jsdom',

  // 模块路径别名（与 tsconfig.json 保持一致）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',

    // CSS 模块 mock
    '.*\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',

    // 静态资源 mock
    '.*\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/__mocks__/fileMock.js',
    '.*\\.(woff|woff2|ttf|eot)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // 测试覆盖率收集
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],

  // 转换配置 - 移除自定义转换，使用 Next.js 默认配置
  // transform: {
  //   '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
  //     jsc: {
  //       transform: {
  //         react: {
  //           runtime: 'automatic',
  //         },
  //       },
  //     },
  //   }],
  // },

  // 忽略转换的文件
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],

  // Setup 文件
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // 快照测试序列化器
  snapshotSerializers: [],
}

// 导出 Jest 配置
module.exports = createJestConfig(customJestConfig)
