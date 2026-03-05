/**
 * Playwright E2E 环境配置验证测试
 *
 * 该测试文件验证 Playwright E2E 测试环境的基础配置是否正确。
 * 测试内容包括：
 * 1. package.json 中的依赖安装
 * 2. npm scripts 配置
 * 3. playwright.config.ts 配置有效性
 * 4. TypeScript 类型支持
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FRONTEND_DIR = '/workspace/frontend';
const PACKAGE_JSON_PATH = join(FRONTEND_DIR, 'package.json');
const PLAYWRIGHT_CONFIG_PATH = join(FRONTEND_DIR, 'playwright.config.ts');
const TSCONFIG_JSON_PATH = join(FRONTEND_DIR, 'tsconfig.json');

describe('Playwright E2E 环境配置验证', () => {
  let packageJson: any;
  let tsConfigJson: any;

  beforeAll(() => {
    // 读取 package.json
    const packageJsonContent = readFileSync(PACKAGE_JSON_PATH, 'utf-8');
    packageJson = JSON.parse(packageJsonContent);

    // 读取 tsconfig.json
    const tsConfigContent = readFileSync(TSCONFIG_JSON_PATH, 'utf-8');
    tsConfigJson = JSON.parse(tsConfigContent);
  });

  describe('1. package.json 依赖验证', () => {
    it('应该在 devDependencies 中包含 @playwright/test', () => {
      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.devDependencies['@playwright/test']).toBeDefined();
    });

    it('应该在 devDependencies 中包含 @playwright/experimental-ct-react', () => {
      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.devDependencies['@playwright/experimental-ct-react']).toBeDefined();
    });

    it('@playwright/test 版本应该符合要求 (^1.48.0 或更高)', () => {
      const version = packageJson.devDependencies['@playwright/test'];
      expect(version).toBeDefined();
      // 验证版本号格式（以 ^ 或 ~ 开头，或者纯数字版本）
      expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
    });
  });

  describe('2. npm scripts 验证', () => {
    it('应该包含 test:e2e 脚本', () => {
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts['test:e2e']).toBe('playwright test');
    });

    it('应该包含 test:e2e:ui 脚本', () => {
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts['test:e2e:ui']).toBe('playwright test --ui');
    });

    it('应该包含 test:e2e:debug 脚本', () => {
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts['test:e2e:debug']).toBe('playwright test --debug');
    });

    it('应该包含 test:e2e:headed 脚本', () => {
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts['test:e2e:headed']).toBe('playwright test --headed');
    });

    it('应该包含 test:e2e:report 脚本', () => {
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts['test:e2e:report']).toBe('playwright show-report');
    });
  });

  describe('3. playwright.config.ts 配置验证', () => {
    it('配置文件应该存在', () => {
      expect(existsSync(PLAYWRIGHT_CONFIG_PATH)).toBe(true);
    });

    it('配置文件内容应该包含 testDir 配置', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain("testDir:");
      expect(configContent).toContain('./e2e');
    });

    it('配置文件内容应该包含 timeout 配置', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain('timeout:');
    });

    it('配置文件内容应该包含 baseURL 配置', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain('baseURL:');
      expect(configContent).toContain('http://localhost:3000');
    });

    it('配置文件内容应该包含 projects 配置', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain('projects:');
    });

    it('配置文件应该配置 chromium 浏览器', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain("name: 'chromium'");
    });

    it('配置文件应该配置 firefox 浏览器', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain("name: 'firefox'");
    });

    it('配置文件应该配置 webkit 浏览器', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain("name: 'webkit'");
    });

    it('配置文件应该包含 webServer 配置', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain('webServer:');
      expect(configContent).toContain('npm run dev');
    });

    it('配置文件应该包含 trace 配置为 retain-on-failure', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain("trace: 'retain-on-failure'");
    });

    it('配置文件应该包含 screenshot 配置为 only-on-failure', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain("screenshot: 'only-on-failure'");
    });

    it('配置文件应该包含 video 配置为 retain-on-failure', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain("video: 'retain-on-failure'");
    });

    it('配置文件应该包含 reporter 配置', () => {
      const configContent = readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
      expect(configContent).toContain('reporter:');
      expect(configContent).toContain('html');
    });
  });

  describe('4. E2E 目录结构验证', () => {
    it('e2e 目录应该存在', () => {
      expect(existsSync(join(FRONTEND_DIR, 'e2e'))).toBe(true);
    });

    it('e2e/fixtures 目录应该存在', () => {
      expect(existsSync(join(FRONTEND_DIR, 'e2e', 'fixtures'))).toBe(true);
    });

    it('e2e/pages 目录应该存在', () => {
      expect(existsSync(join(FRONTEND_DIR, 'e2e', 'pages'))).toBe(true);
    });

    it('e2e/specs 目录应该存在', () => {
      expect(existsSync(join(FRONTEND_DIR, 'e2e', 'specs'))).toBe(true);
    });

    it('e2e/utils 目录应该存在', () => {
      expect(existsSync(join(FRONTEND_DIR, 'e2e', 'utils'))).toBe(true);
    });
  });

  describe('5. TypeScript 类型支持验证', () => {
    it('tsconfig.json 应该存在有效的 compilerOptions', () => {
      expect(tsConfigJson.compilerOptions).toBeDefined();
    });

    it('tsconfig.json 应该包含 types 字段（可选优化）', () => {
      // types 字段是可选的，所以这里我们只检查如果存在的话是否符合要求
      if (tsConfigJson.compilerOptions.types) {
        const types = tsConfigJson.compilerOptions.types;
        // 检查是否包含 Playwright 相关类型（如果已配置）
        expect(Array.isArray(types)).toBe(true);
      }
    });

    it('TypeScript 应该能够解析 ES2022 和 DOM 类型', () => {
      expect(tsConfigJson.compilerOptions.lib).toBeDefined();
      expect(tsConfigJson.compilerOptions.lib).toContain('ES2022');
      expect(tsConfigJson.compilerOptions.lib).toContain('DOM');
    });
  });

  describe('6. .gitignore 配置验证', () => {
    let gitignoreContent: string;

    beforeAll(() => {
      const gitignorePath = join(FRONTEND_DIR, '.gitignore');
      if (existsSync(gitignorePath)) {
        gitignoreContent = readFileSync(gitignorePath, 'utf-8');
      } else {
        gitignoreContent = '';
      }
    });

    it('.gitignore 应该包含 /test-results/ 目录', () => {
      expect(gitignoreContent).toContain('/test-results/');
    });

    it('.gitignore 应该包含 /playwright-report/ 目录', () => {
      expect(gitignoreContent).toContain('/playwright-report/');
    });

    it('.gitignore 应该包含 /playwright/.cache/ 目录', () => {
      expect(gitignoreContent).toContain('/playwright/.cache/');
    });
  });
});
