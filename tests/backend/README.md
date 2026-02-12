# Backend Tests

本目录包含 Scryer 后端服务的单元测试和集成测试。

## 测试范围

### 1. 配置管理系统 (`test_config.py`)
- Settings 类的加载和验证
- 环境变量读取
- 默认值设置
- 配置验证逻辑
- 不同环境下的配置

### 2. 日志系统 (`test_logger.py`)
- Logger 配置和初始化
- 日志格式化
- 日志级别控制
- 结构化日志输出
- 日志文件输出和轮转

### 3. FastAPI 应用主入口 (`test_main.py`)
- FastAPI 应用创建
- 应用配置
- CORS 中间件
- 路由注册
- 生命周期事件

### 4. API 路由 (`test_api_router.py`)
- 健康检查端点
- API 路由注册
- 请求参数验证
- 响应格式
- 错误处理

## 运行测试

### 运行所有后端测试
```bash
pytest tests/backend/
```

### 运行特定测试文件
```bash
pytest tests/backend/test_config.py
```

### 运行特定测试函数
```bash
pytest tests/backend/test_config.py::TestSettingsModel::test_settings_with_default_values
```

### 带覆盖率报告运行
```bash
pytest tests/backend/ --cov=src/backend/app --cov-report=html
```

### 详细输出
```bash
pytest tests/backend/ -v
```

## 测试原则

这些测试遵循 **TDD (Test-Driven Development)** 原则：

1. **Red First**: 测试在当前阶段运行是**失败的 (RED)**，因为实现代码尚未存在
2. **Keep It Simple**: 测试代码比业务代码更简单，避免复杂逻辑
3. **独立性**: 每个测试用例独立，不依赖执行顺序
4. **直线逻辑**: 测试代码线性执行，避免嵌套逻辑
5. **硬编码期望**: 使用字面量作为断言的预期值

## 当前状态

⚠️ **重要提示**: 这些测试目前是**失败**的，这是预期行为！

**原因**:
- 实现代码 (`src/backend/app/`) 尚未创建
- 这是 TDD 的 "Red First" 阶段

**下一步**:
1. 运行测试查看失败情况
2. 根据 Issue #33 实现相应的模块
3. 再次运行测试，使测试变为**绿色 (GREEN)**

## 测试契约

这些测试定义了以下代码契约：

### `src/backend/app/core/config.py`
```python
class Settings(BaseSettings):
    app_name: str = "Scryer"
    app_version: str = "0.1.0"
    debug: bool = False
    api_prefix: str = "/api"
    environment: str = "production"
    database_url: str
    redis_url: str
    secret_key: str  # 最少 32 字符
    log_level: str = "INFO"
    port: int = 8000
    cors_origins: list = []

def get_settings() -> Settings:
    """返回 Settings 单例"""
```

### `src/backend/app/core/logger.py`
```python
def setup_logging(log_level: str = "INFO", log_file: str = None) -> logging.Logger:
    """配置并返回 logger 实例"""

def get_logger(name: str) -> logging.Logger:
    """获取指定名称的 logger"""
```

### `src/backend/app/main.py`
```python
def create_app() -> FastAPI:
    """创建并配置 FastAPI 应用"""

def get_application() -> FastAPI:
    """返回 FastAPI 应用单例"""

app: FastAPI = create_app()
```

### `src/backend/app/api/router.py`
```python
api_router = APIRouter(prefix="/api")

@api_router.get("/health")
def health_check():
    """健康检查端点"""
```

## 验收标准

参考 Issue #33，测试覆盖以下验收标准：

- [ ] 配置系统能正确加载环境变量
- [ ] 日志系统正常输出
- [ ] FastAPI 应用正确创建
- [ ] 健康检查端点可访问
- [ ] 所有目录已创建
- [ ] `__init__.py` 文件已添加
- [ ] 基础占位文件已创建

## 技术参考

- **Issue**: #33 - Sub-task 1.1: 项目目录结构创建
- **父 Issue**: #29 - Sub-issue 1: 项目结构初始化与配置系统
- **设计文档**: `docs/software-design.md`
- **技术栈**:
  - FastAPI
  - Pydantic Settings
  - Structlog / Python logging
  - Pytest
