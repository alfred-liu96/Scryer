/**
 * Playwright E2E 测试全局清理配置
 *
 * 负责关闭测试期间启动的所有服务：
 * 1. 后端 API 服务
 * 2. Docker Compose 基础设施
 *
 * @see https://playwright.dev/docs/test-configuration#global-setup-and-teardown
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

/**
 * 执行命令并输出日志
 */
function execCommand(command, cwd = projectRoot) {
  console.log(`\n🔧 执行命令: ${command}`);
  try {
    const options = {
      cwd: cwd,
      encoding: 'utf-8',
      stdio: 'inherit',
    };
    execSync(command, options);
  } catch (error) {
    // teardown 中出错不应该导致流程失败
    console.warn(`⚠️  命令执行警告: ${error.message}`);
  }
}

/**
 * 停止后端服务
 */
function stopBackend() {
  const backendPid = process.env.E2E_BACKEND_PID;

  if (backendPid) {
    console.log('\n🛑 停止后端服务...');
    try {
      // 在 Unix 系统上，使用进程组来确保所有子进程也被终止
      if (process.platform !== 'win32') {
        execCommand(`pkill -P ${backendPid} 2>/dev/null || true`);
      }
      execCommand(`kill ${backendPid} 2>/dev/null || true`);
      console.log('✅ 后端服务已停止');
    } catch (error) {
      console.warn(`⚠️  停止后端服务时出错: ${error.message}`);
    }
  } else {
    console.log('\nℹ️  未发现后端服务进程，跳过停止');
  }

  // 清理环境变量
  delete process.env.E2E_BACKEND_PID;
}

/**
 * 停止 Docker Compose 基础设施
 */
function stopDockerInfrastructure() {
  if (process.env.E2E_DOCKER_COMPOSE === 'true') {
    console.log('\n🐳 停止 Docker Compose 基础设施...');

    const dockerComposeFile = path.join(projectRoot, 'docker-compose.test.yml');

    if (fs.existsSync(dockerComposeFile)) {
      // 确定使用哪个命令
      let composeCommand = 'docker compose';
      try {
        execSync('docker compose version', { encoding: 'utf-8', stdio: 'pipe' });
      } catch {
        composeCommand = 'docker-compose';
      }

      // 停止并删除容器、网络
      execCommand(`${composeCommand} -f docker-compose.test.yml down -v`);
      console.log('✅ Docker Compose 已停止');
    } else {
      console.warn('⚠️  Docker Compose 配置文件不存在，跳过停止');
    }
  } else {
    console.log('\nℹ️  Docker Compose 未启动，跳过停止');
  }

  // 清理环境变量
  delete process.env.E2E_DOCKER_COMPOSE;
}

/**
 * 全局清理入口
 */
async function globalTeardown() {
  console.log('\n========================================');
  console.log('🧹 Playwright E2E 全局清理');
  console.log('========================================');

  try {
    // 1. 停止后端服务
    stopBackend();

    // 2. 停止 Docker 基础设施
    stopDockerInfrastructure();

    console.log('\n========================================');
    console.log('✅ 清理完成');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ 全局清理出错:', error.message);
    // teardown 中出错不应该抛出异常
  }
}

module.exports = globalTeardown;
