/**
 * Playwright E2E 测试全局启动配置
 *
 * 负责启动测试所需的所有服务：
 * 1. Docker Compose 基础设施（PostgreSQL + Redis）
 * 2. 后端 API 服务（FastAPI）
 *
 * @see https://playwright.dev/docs/test-configuration#global-setup-and-teardown
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

// 服务健康检查配置
const HEALTH_CHECKS = {
  backend: { url: 'http://localhost:8000/api/health', retries: 30, delay: 2000 },
  postgres: { host: 'localhost', port: 5433, retries: 30, delay: 2000 },
  redis: { host: 'localhost', port: 6380, retries: 30, delay: 2000 },
};

// 进程引用（用于 teardown）
process.env.E2E_BACKEND_PID = '';
process.env.E2E_DOCKER_COMPOSE = 'false';

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 执行命令并输出日志
 */
function execCommand(command, cwd = projectRoot) {
  console.log(`\n🔧 执行命令: ${command}`);
  console.log(`📁 工作目录: ${cwd}`);
  try {
    const options = {
      cwd: cwd,
      encoding: 'utf-8',
      stdio: 'inherit',
    };
    execSync(command, options);
  } catch (error) {
    console.error(`❌ 命令执行失败: ${error.message}`);
    throw error;
  }
}

/**
 * 检查端口是否可用
 */
async function isPortOpen(host, port) {
  const net = await import('net');
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(2000);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * HTTP 健康检查
 */
async function checkHttpHealth(url) {
  try {
    const response = await fetch(url);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

/**
 * 等待服务就绪
 */
async function waitForService(name, check, retries, delayMs) {
  console.log(`\n⏳ 等待 ${name} 就绪...`);

  for (let i = 0; i < retries; i++) {
    if (await check()) {
      console.log(`✅ ${name} 已就绪`);
      return;
    }
    if (i < retries - 1) {
      process.stdout.write(`.`);
      await delay(delayMs);
    }
  }

  throw new Error(`❌ ${name} 启动超时`);
}

/**
 * 启动 Docker Compose 基础设施
 */
async function startDockerInfrastructure() {
  console.log('\n🐳 检查 Docker 环境...');

  const dockerComposeFile = path.join(projectRoot, 'docker-compose.test.yml');

  if (!fs.existsSync(dockerComposeFile)) {
    console.log('ℹ️  Docker Compose 配置文件不存在，跳过 Docker 启动');
    return;
  }

  // 检查 docker 是否可用
  try {
    execSync('docker --version', { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    console.log('ℹ️  Docker 未安装，跳过 Docker 基础设施启动');
    console.log('💡 提示: E2E 测试需要 PostgreSQL 和 Redis 服务运行');
    return;
  }

  console.log('启动 Docker Compose 基础设施...');

  // 优先使用 docker compose (V2)，回退到 docker-compose (V1)
  let composeCommand = 'docker compose';
  try {
    execSync('docker compose version', { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    composeCommand = 'docker-compose';
  }

  try {
    execCommand(`${composeCommand} -f docker-compose.test.yml up -d`);
    process.env.E2E_DOCKER_COMPOSE = 'true';

    // 等待 PostgreSQL
    await waitForService(
      'PostgreSQL',
      () => isPortOpen(HEALTH_CHECKS.postgres.host, HEALTH_CHECKS.postgres.port),
      HEALTH_CHECKS.postgres.retries,
      HEALTH_CHECKS.postgres.delay
    );

    // 等待 Redis
    await waitForService(
      'Redis',
      () => isPortOpen(HEALTH_CHECKS.redis.host, HEALTH_CHECKS.redis.port),
      HEALTH_CHECKS.redis.retries,
      HEALTH_CHECKS.redis.delay
    );
  } catch (error) {
    console.warn('⚠️  Docker 基础设施启动失败:', error.message);
    console.log('💡 将尝试直接连接现有服务');
  }
}

/**
 * 启动后端服务
 */
async function startBackend() {
  console.log('\n🚀 启动后端服务...');

  // 检查 .env 文件
  const envFile = path.join(projectRoot, '.env');
  if (!fs.existsSync(envFile)) {
    console.warn('⚠️  警告: .env 文件不存在，尝试使用 .env.example');
    const envExample = path.join(projectRoot, '.env.example');
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envFile);
      console.log('✅ 已复制 .env.example 到 .env');
    }
  }

  // 启动后端服务（使用 spawn 保持进程运行）
  const backendProcess = spawn(
    'python',
    ['-m', 'uvicorn', 'src.backend.app.main:app', '--port', '8000', '--host', '0.0.0.0'],
    {
      cwd: projectRoot,
      stdio: 'pipe',
      detached: true,
    }
  );

  // 保存 PID 供 teardown 使用
  process.env.E2E_BACKEND_PID = String(backendProcess.pid);

  // 输出后端日志（用于调试）
  backendProcess.stdout?.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });

  // 等待后端健康检查
  await waitForService(
    'Backend API',
    () => checkHttpHealth(HEALTH_CHECKS.backend.url),
    HEALTH_CHECKS.backend.retries,
    HEALTH_CHECKS.backend.delay
  );
}

/**
 * 全局启动入口
 */
async function globalSetup() {
  console.log('\n========================================');
  console.log('🎭 Playwright E2E 全局启动');
  console.log('========================================');

  try {
    // 1. 启动 Docker 基础设施
    await startDockerInfrastructure();

    // 2. 启动后端服务
    await startBackend();

    console.log('\n========================================');
    console.log('✅ 所有服务已就绪，开始测试...');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ 全局启动失败:', error.message);
    throw error;
  }
}

module.exports = globalSetup;
