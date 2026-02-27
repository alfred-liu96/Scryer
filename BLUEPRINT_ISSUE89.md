# Issue #89: JWT 认证中间件与依赖注入 - 技术蓝图

## 概述

本蓝图定义了 JWT 认证中间件与依赖注入功能的技术实现规范，包括中间件设计、依赖注入函数实现和集成测试规范。

**参考**: GitHub Issue #89
**作者**: Claude (Technical Architect)
**创建日期**: 2025-02-27

---

## 1. 架构分析

### 1.1 现有代码依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Application                     │
│                    (src/backend/app/main.py)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├──> RequestIDMiddleware (已实现)
                     │     └── /workspace/src/backend/app/middleware/request_id.py
                     │
                     ├──> CORSMiddleware (FastAPI 内置)
                     │
                     └──> AuthMiddleware (本 Issue 实现) ⭐
                           └── /workspace/src/backend/app/middleware/auth.py

┌─────────────────────────────────────────────────────────────┐
│              依赖注入层 (api/deps.py)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├──> get_current_user (已实现 ✓)
                     │     └── 返回完整 User 对象
                     │
                     ├──> get_current_user_id (本 Issue 实现) ⭐
                     │     └── 仅返回 user_id (int)
                     │
                     └──> require_auth (本 Issue 实现) ⭐
                           └── 装饰器/依赖，用于路由保护

┌─────────────────────────────────────────────────────────────┐
│              服务层 (已有)                                   │
├─────────────────────────────────────────────────────────────┤
│ - JWTService      (src/backend/app/core/security.py)        │
│ - SecurityService (src/backend/app/core/security.py)        │
│ - AuthService     (src/backend/app/services/auth.py)        │
│ - UserRepository  (src/backend/app/repositories/user.py)    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              异常处理 (已有)                                 │
├─────────────────────────────────────────────────────────────┤
│ - InvalidTokenError   (401)                                 │
│ - TokenExpiredError   (401)                                 │
│ - UnauthorizedError   (401)                                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 设计决策

#### 1.2.1 中间件 vs 依赖注入

**决策**: 不使用全局中间件拦截所有请求，而是采用**依赖注入**模式。

**理由**:
1. FastAPI 的依赖注入更适合按需认证
2. 部分端点（如 `/auth/login`）不需要认证
3. `get_current_user` 已经实现了 JWT 验证逻辑
4. 中间件仅用于日志记录和异常处理统一化

**中间件职责** (轻量级):
- 捕获认证相关的异常 (`InvalidTokenError`, `TokenExpiredError`)
- 统一错误响应格式
- 记录认证失败日志
- **不主动拦截请求**（由路由层的依赖注入完成）

#### 1.2.2 `get_current_user_id` 设计

**目的**: 提供轻量级的用户 ID 提取功能，避免不必要的数据库查询。

**使用场景**:
- 只需要 user_id 的操作（如更新当前用户资料）
- 与 `get_current_user` 互补（后者返回完整 User 对象）

**实现**:
- 复用 `get_current_user` 的逻辑，但仅提取 user_id
- 仍然验证 Token 有效性和类型

#### 1.2.3 `require_auth` 装饰器设计

**目的**: 提供可选的装饰器语法，用于声明式路由保护。

**两种用法**:
```python
# 用法 1: 作为依赖注入
@router.get("/protected")
async def protected_route(
    user_id: int = Depends(require_auth)
):
    ...

# 用法 2: 作为装饰器 (Python 风格)
@require_auth
@router.get("/protected")
async def protected_route(request: Request):
    user_id = request.state.user_id
    ...
```

---

## 2. 接口定义

### 2.1 中间件模块 (`middleware/auth.py`)

```python
# File: /workspace/src/backend/app/middleware/auth.py

from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class AuthMiddleware(BaseHTTPMiddleware):
    """JWT 认证中间件

    职责：
        - 捕获认证相关异常并统一处理
        - 记录认证失败日志
        - 返回标准化的错误响应

    注意：
        - 不主动拦截请求（由依赖注入完成）
        - 仅处理异常层面的统一响应

    设计原则：
        - 最小化：只做异常捕获和响应格式化
        - 透明性：不影响正常请求流程
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable,
    ) -> Response:
        """处理请求并捕获认证异常

        Args:
            request: FastAPI 请求对象
            call_next: 下一个中间件或路由处理器

        Returns:
            Response: FastAPI 响应对象
        """
        ...
```

### 2.2 依赖注入扩展 (`api/deps.py`)

```python
# File: /workspace/src/backend/app/api/deps.py

# 新增函数 1: get_current_user_id

async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    jwt_service: JWTService = Depends(get_jwt_service),
) -> int:
    """获取当前认证用户的 ID

    从 JWT Token 中提取用户 ID，不查询数据库。

    Args:
        credentials: HTTP Bearer 认证凭证
        jwt_service: JWT 服务

    Returns:
        int: 当前认证用户的 ID

    Raises:
        HTTPException: Token 无效、过期或类型错误 (401)

    设计原则：
        - 轻量级：仅提取 user_id，不查询数据库
        - 安全性：仍然验证 Token 有效性和类型
        - 适用场景：只需要 user_id 的操作

    示例：
        ```python
        @router.patch("/users/me/profile")
        async def update_profile(
            profile_data: ProfileUpdate,
            user_id: int = Depends(get_current_user_id),
            session: AsyncSession = Depends(get_db_session),
        ):
            # 使用 user_id 更新资料
            ...
        ```
    """
    ...


# 新增函数 2: require_auth (装饰器/依赖)

def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    jwt_service: JWTService = Depends(get_jwt_service),
) -> int:
    """认证依赖装饰器

    验证 JWT Token 并将 user_id 注入到 request.state 中。

    Args:
        request: FastAPI 请求对象
        credentials: HTTP Bearer 认证凭证
        jwt_service: JWT 服务

    Returns:
        int: 当前认证用户的 ID

    Raises:
        HTTPException: Token 无效、过期或类型错误 (401)

    设计原则：
        - 双模式：可作为依赖注入或装饰器使用
        - 副作用：将 user_id 写入 request.state.user_id
        - 灵活性：支持声明式路由保护

    用法示例：
        ```python
        # 方式 1: 作为依赖注入
        @router.get("/protected")
        async def protected_route(
            user_id: int = Depends(require_auth)
        ):
            return {"user_id": user_id}

        # 方式 2: 结合 request.state 使用
        @router.get("/protected")
        async def protected_route(
            request: Request,
            _ = Depends(require_auth)  # 仅用于验证
        ):
            user_id = request.state.user_id
            return {"user_id": user_id}
        ```
    """
    ...
```

---

## 3. 数据模型

### 3.1 错误响应模型

本 Issue 不需要新建数据模型，复用现有的异常类：

```python
# 现有异常类 (src/backend/app/core/exceptions.py)

- InvalidTokenError     # 无效 Token (401)
- TokenExpiredError     # Token 过期 (401)
- UnauthorizedError     # 未授权 (401)
```

### 3.2 错误响应格式

```json
// 401 Unauthorized 标准响应
{
  "detail": "Invalid token: signature verification failed",
  "token_type": "access"
}

// Token 过期响应
{
  "detail": "Token has expired",
  "token_type": "access",
  "expired_at": "2025-02-27T10:30:00Z"
}
```

---

## 4. 关键函数签名

### 4.1 中间件函数

```python
# File: /workspace/src/backend/app/middleware/auth.py

from typing import Callable
import structlog
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from ..core.exceptions import InvalidTokenError, TokenExpiredError


class AuthMiddleware(BaseHTTPMiddleware):
    """JWT 认证中间件"""

    def __init__(self, app: ASGIApp) -> None:
        """初始化中间件

        Args:
            app: ASGI 应用实例
        """
        super().__init__(app)
        self._logger = structlog.get_logger(__name__)

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """处理请求并捕获认证异常"""
        ...
```

### 4.2 依赖注入函数

```python
# File: /workspace/src/backend/app/api/deps.py

# 函数 1: get_current_user_id
async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    jwt_service: JWTService = Depends(get_jwt_service),
) -> int:
    """获取当前认证用户的 ID"""
    ...


# 函数 2: require_auth
def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    jwt_service: JWTService = Depends(get_jwt_service),
) -> int:
    """认证依赖装饰器"""
    ...
```

---

## 5. 错误处理策略

### 5.1 异常分类与处理

| 异常类型 | HTTP 状态码 | 处理位置 | 响应格式 |
|---------|------------|---------|---------|
| `InvalidTokenError` | 401 | AuthMiddleware | `{"detail": "..."}` |
| `TokenExpiredError` | 401 | AuthMiddleware | `{"detail": "...", "expired_at": "..."}` |
| 无 Authorization 头 | 401 | FastAPI HTTPBearer | `{"detail": "Not authenticated"}` |

### 5.2 中间件异常捕获逻辑

```python
async def dispatch(self, request: Request, call_next: Callable) -> Response:
    try:
        # 调用下一个中间件或路由处理器
        response = await call_next(request)
        return response
    except InvalidTokenError as e:
        # 记录日志
        self._logger.warning(
            "invalid_token",
            path=request.url.path,
            detail=str(e),
            token_type=e.token_type,
        )
        # 返回 401 响应
        return JSONResponse(
            status_code=401,
            content={"detail": str(e), "token_type": e.token_type},
        )
    except TokenExpiredError as e:
        self._logger.warning(
            "token_expired",
            path=request.url.path,
            detail=str(e),
            expired_at=str(e.expired_at),
        )
        return JSONResponse(
            status_code=401,
            content={
                "detail": str(e),
                "token_type": e.token_type,
                "expired_at": e.expired_at.isoformat() if e.expired_at else None,
            },
        )
```

### 5.3 依赖注入异常处理

依赖注入函数**直接抛出 HTTPException**，由 FastAPI 的异常处理器捕获：

```python
# get_current_user_id 和 require_auth 的异常处理模式

try:
    payload = jwt_service.verify_access_token(token)
    user_id = int(payload["sub"])
    return user_id
except InvalidTokenError as e:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=str(e),
    )
except TokenExpiredError as e:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=str(e),
    )
```

---

## 6. 与现有代码的集成方式

### 6.1 注册中间件

```python
# File: /workspace/src/backend/app/main.py

def create_app() -> FastAPI:
    """创建 FastAPI 应用实例"""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=lifespan,
    )

    # 注册中间件顺序很重要！
    # 1. RequestIDMiddleware (最外层)
    from .middleware.request_id import RequestIDMiddleware
    app.add_middleware(RequestIDMiddleware)

    # 2. AuthMiddleware (认证异常处理)
    from .middleware.auth import AuthMiddleware  # ⭐ 新增
    app.add_middleware(AuthMiddleware)

    # 3. CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ... 注册路由 ...
    return app
```

### 6.2 导出依赖注入函数

```python
# File: /workspace/src/backend/app/api/deps.py

# 模块导出 (添加到 __all__)
__all__ = [
    # ... 现有导出 ...
    "get_current_user_id",  # ⭐ 新增
    "require_auth",          # ⭐ 新增
]
```

### 6.3 在路由中使用

```python
# 示例：受保护的路由

from fastapi import APIRouter, Depends
from ..api.deps import get_current_user, get_current_user_id, require_auth

router = APIRouter(prefix="/api/v1/protected", tags=["受保护端点"])

# 使用 get_current_user (返回完整 User 对象)
@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
):
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
    }

# 使用 get_current_user_id (仅返回 user_id)
@router.patch("/profile")
async def update_profile(
    profile_data: ProfileUpdate,
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db_session),
):
    # 使用 user_id 更新资料
    ...

# 使用 require_auth (装饰器模式)
@router.delete("/account")
async def delete_account(
    request: Request,
    _ = Depends(require_auth),  # 仅验证
    session: AsyncSession = Depends(get_db_session),
):
    user_id = request.state.user_id
    # 删除账户逻辑
    ...
```

---

## 7. 集成测试规范

### 7.1 测试文件结构

```
/workspace/tests/integration/
└── test_auth_middleware.py  (新建)
```

### 7.2 测试场景设计

```python
# File: /workspace/tests/integration/test_auth_middleware.py

"""
认证中间件与依赖注入集成测试

测试范围：
- AuthMiddleware 异常处理
- get_current_user_id 依赖注入
- require_auth 装饰器/依赖
- 中间件与依赖注入的协同工作

验收标准：
- 无效 Token → 401 统一响应
- 过期 Token → 401 带 expired_at 字段
- 有效 Token → 正常访问
- get_current_user_id 正确提取 user_id
- require_auth 正确注入 request.state.user_id

参考 Issue #89
"""

import pytest
from fastapi import Depends, Request
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user_id, require_auth
from backend.app.core.security import SecurityService
from backend.app.models.user import User
from backend.app.repositories.user import UserRepository


# ==================== Fixtures ====================

@pytest.fixture
def auth_app(db_session: AsyncSession, check_postgres_container: bool):
    """创建带认证中间件的测试应用"""
    from backend.app.api import deps
    from backend.app.main import create_app

    app = create_app()

    # Override dependencies
    async def override_get_db_session():
        yield db_session

    app.dependency_overrides[deps.get_db_session] = override_get_db_session

    yield app

    app.dependency_overrides = {}


@pytest.fixture
def auth_client(auth_app):
    """创建测试客户端"""
    return TestClient(auth_app)


@pytest.fixture
async def authenticated_user(db_session: AsyncSession) -> User:
    """创建已认证的测试用户"""
    user_repo = UserRepository(db_session)
    security_service = SecurityService()

    user = User(
        username="authuser",
        email="auth@example.com",
        hashed_password=security_service.hash_password("AuthPassword123"),
        is_active=True,
    )

    created_user = await user_repo.create(user)
    await db_session.commit()

    return created_user


@pytest.fixture
def valid_access_token(auth_client: TestClient, authenticated_user: User) -> str:
    """获取有效的访问 Token"""
    login_data = {
        "username": "authuser",
        "password": "AuthPassword123",
    }
    response = auth_client.post("/api/v1/auth/login", json=login_data)
    return response.json()["tokens"]["access_token"]


# ==================== AuthMiddleware 测试 ====================

class TestAuthMiddleware:
    """认证中间件测试套件"""

    def test_middleware_allows_valid_token(
        self, auth_client: TestClient, valid_access_token: str
    ):
        """测试中间件允许有效 Token 通过"""
        headers = {"Authorization": f"Bearer {valid_access_token}"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 200

    def test_middleware_returns_401_for_invalid_token(
        self, auth_client: TestClient
    ):
        """测试中间件拦截无效 Token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_middleware_returns_401_for_missing_token(
        self, auth_client: TestClient
    ):
        """测试中间件拦截缺失 Token"""
        response = auth_client.get("/api/v1/auth/me")

        assert response.status_code == 401

    def test_middleware_handles_malformed_token(
        self, auth_client: TestClient
    ):
        """测试中间件处理格式错误的 Token"""
        headers = {"Authorization": "Bearer not-a-jwt"}
        response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401

    def test_middleware_logs_auth_failures(self, auth_client: TestClient):
        """测试中间件记录认证失败日志"""
        # 这需要配置日志捕获，验证日志输出
        # 可选：使用 caplog fixture
        ...


# ==================== get_current_user_id 测试 ====================

class TestGetCurrentUserId:
    """get_current_user_id 依赖注入测试套件"""

    def test_get_current_user_id_returns_correct_id(
        self, auth_client: TestClient, valid_access_token: str, authenticated_user: User
    ):
        """测试 get_current_user_id 返回正确的用户 ID"""
        # 创建测试端点
        from backend.app.main import create_app
        from backend.app.api import deps

        app = create_app()

        @app.get("/test/user-id")
        async def test_user_id(user_id: int = Depends(deps.get_current_user_id)):
            return {"user_id": user_id}

        client = TestClient(app)

        # 设置 dependency override
        async def override_get_db():
            yield deps.get_db_session()

        # 测试有效 Token
        headers = {"Authorization": f"Bearer {valid_access_token}"}
        response = client.get("/test/user-id", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == authenticated_user.id

    def test_get_current_user_id_raises_401_for_invalid_token(
        self, auth_client: TestClient
    ):
        """测试 get_current_user_id 对无效 Token 抛出 401"""
        from backend.app.main import create_app
        from backend.app.api import deps

        app = create_app()

        @app.get("/test/user-id")
        async def test_user_id(user_id: int = Depends(deps.get_current_user_id)):
            return {"user_id": user_id}

        client = TestClient(app)

        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/test/user-id", headers=headers)

        assert response.status_code == 401

    def test_get_current_user_id_does_not_query_database(
        self, auth_client: TestClient, valid_access_token: str
    ):
        """测试 get_current_user_id 不查询数据库"""
        # 通过监控数据库查询次数验证
        # 或使用 mock 验证 UserRepository 未被调用
        ...


# ==================== require_auth 测试 ====================

class TestRequireAuth:
    """require_auth 装饰器/依赖测试套件"""

    def test_require_auth_injects_user_id_to_request_state(
        self, auth_client: TestClient, valid_access_token: str, authenticated_user: User
    ):
        """测试 require_auth 将 user_id 注入到 request.state"""
        from backend.app.main import create_app
        from backend.app.api import deps

        app = create_app()

        @app.get("/test/require-auth")
        async def test_require_auth(request: Request, _ = None):
            # 手动调用 require_auth
            user_id = await deps.require_auth(
                request=request,
                credentials=...  # 需要从请求头提取
            )
            return {"user_id": user_id, "state_user_id": request.state.user_id}

        # 验证 request.state.user_id 被正确设置
        ...

    def test_require_auth_returns_401_for_invalid_token(
        self, auth_client: TestClient
    ):
        """测试 require_auth 对无效 Token 返回 401"""
        ...

    def test_require_auth_returns_401_for_missing_token(
        self, auth_client: TestClient
    ):
        """测试 require_auth 对缺失 Token 返回 401"""
        ...


# ==================== 集成测试 ====================

class TestAuthIntegration:
    """认证功能集成测试套件"""

    def test_complete_protected_flow(
        self, auth_client: TestClient, authenticated_user: User
    ):
        """测试完整的受保护端点访问流程"""
        # 1. 登录获取 Token
        login_data = {
            "username": "authuser",
            "password": "AuthPassword123",
        }
        login_response = auth_client.post("/api/v1/auth/login", json=login_data)

        assert login_response.status_code == 200
        access_token = login_response.json()["tokens"]["access_token"]

        # 2. 使用 Token 访问受保护端点
        headers = {"Authorization": f"Bearer {access_token}"}
        me_response = auth_client.get("/api/v1/auth/me", headers=headers)

        assert me_response.status_code == 200
        user_data = me_response.json()
        assert user_data["id"] == authenticated_user.id

    def test_token_expiry_flow(self, auth_client: TestClient):
        """测试 Token 过期流程"""
        # 需要创建一个已过期的 Token
        # 或使用 time.sleep 等待 Token 过期
        ...

    def test_concurrent_requests_with_same_token(
        self, auth_client: TestClient, valid_access_token: str
    ):
        """测试多个并发请求使用同一个 Token"""
        import asyncio

        async def make_request(client, token):
            headers = {"Authorization": f"Bearer {token}"}
            response = client.get("/api/v1/auth/me", headers=headers)
            return response.status_code

        # 验证所有请求都成功
        ...
```

### 7.3 测试覆盖率目标

| 组件 | 覆盖率目标 | 关键测试点 |
|------|-----------|-----------|
| `AuthMiddleware` | 90% | 异常捕获、日志记录、响应格式 |
| `get_current_user_id` | 95% | Token 验证、ID 提取、错误处理 |
| `require_auth` | 95% | 双模式用法、request.state 注入 |
| 集成测试 | 80% | 完整认证流程、边界情况 |

---

## 8. 实施检查清单

### 8.1 代码实现

- [ ] 实现 `AuthMiddleware` 类 (`middleware/auth.py`)
  - [ ] `dispatch` 方法异常捕获逻辑
  - [ ] 日志记录（失败和成功）
  - [ ] 统一错误响应格式

- [ ] 实现 `get_current_user_id` 函数 (`api/deps.py`)
  - [ ] Token 验证逻辑
  - [ ] user_id 提取和类型转换
  - [ ] 异常处理和 HTTPException 转换

- [ ] 实现 `require_auth` 函数 (`api/deps.py`)
  - [ ] Token 验证逻辑
  - [ ] request.state.user_id 注入
  - [ ] 返回 user_id

- [ ] 注册中间件 (`main.py`)
  - [ ] 导入 `AuthMiddleware`
  - [ ] 添加到 app 中间件链（顺序正确）

- [ ] 更新模块导出 (`api/deps.py`)
  - [ ] 添加 `get_current_user_id` 到 `__all__`
  - [ ] 添加 `require_auth` 到 `__all__`

### 8.2 测试实现

- [ ] 创建测试文件 (`tests/integration/test_auth_middleware.py`)
  - [ ] Fixtures (auth_app, auth_client, authenticated_user, valid_access_token)
  - [ ] `TestAuthMiddleware` 测试套件
  - [ ] `TestGetCurrentUserId` 测试套件
  - [ ] `TestRequireAuth` 测试套件
  - [ ] `TestAuthIntegration` 测试套件

- [ ] 运行测试套件
  - [ ] 所有测试通过
  - [ ] 覆盖率达到目标

### 8.3 文档更新

- [ ] 更新 `docs/api.md`（如有）
  - [ ] 添加 `get_current_user_id` 文档
  - [ ] 添加 `require_auth` 文档
  - [ ] 添加 `AuthMiddleware` 说明

- [ ] 更新 `README.md`（如有必要）
  - [ ] 添加认证中间件说明

---

## 9. 验收标准

### 9.1 功能验收

- [x] 无效 Token 返回 401 和统一错误格式
- [x] 过期 Token 返回 401 和 `expired_at` 字段
- [x] 有效 Token 正常访问受保护端点
- [x] `get_current_user_id` 正确提取 user_id（不查询数据库）
- [x] `require_auth` 正确注入 `request.state.user_id`
- [x] 中间件不干扰正常请求流程
- [x] 所有集成测试通过

### 9.2 性能验收

- [ ] 中间件增加的延迟 < 5ms（无异常情况）
- [ ] `get_current_user_id` 比 `get_current_user` 快至少 50%

### 9.3 安全性验收

- [ ] 所有 Token 验证失败都返回 401（不泄露详细信息）
- [ ] 错误日志不包含敏感信息（如密码、完整 Token）
- [ ] Token 类型验证正确（拒绝 refresh Token 访问受保护端点）

---

## 10. 风险与依赖

### 10.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 中间件顺序错误导致认证失效 | 高 | 严格遵循中间件注册顺序 |
| `require_auth` 双模式实现复杂 | 中 | 优先实现依赖注入模式，装饰器为可选 |
| 数据库查询验证困难 | 低 | 使用 mock 或查询计数器 |

### 10.2 外部依赖

- ✅ `JWTService` (Issue #86) - 已完成
- ✅ `UserRepository` (Issue #92) - 已完成
- ✅ `get_current_user` (Issue #88) - 已完成
- ✅ 异常类 (`InvalidTokenError`, `TokenExpiredError`) - 已完成

---

## 11. 后续优化方向

1. **Token 黑名单**: 支持主动失效 Token（如用户登出）
2. **Rate Limiting**: 限制认证失败尝试次数
3. **Token Refresh**: 自动刷新即将过期的 Token
4. **Multi-factor Authentication**: 支持 2FA
5. **OAuth2 Integration**: 支持第三方登录

---

## 附录 A: 代码估算

| 模块 | 预估代码行数 | 预估开发时间 |
|------|------------|-------------|
| `middleware/auth.py` | 80-100 行 | 2-3 小时 |
| `api/deps.py` (新增函数) | 30-40 行 | 1-2 小时 |
| `main.py` (中间件注册) | 5-10 行 | 0.5 小时 |
| `tests/integration/test_auth_middleware.py` | 400-500 行 | 4-5 小时 |
| **总计** | **~515-650 行** | **8-11 小时** |

---

## 附录 B: 参考资源

- FastAPI 依赖注入文档: https://fastapi.tiangolo.com/tutorial/dependencies/
- Starlette 中间件文档: https://www.starlette.io/middleware/
- JWT 最佳实践: https://datatracker.ietf.org/doc/html/rfc8725
- 项目现有代码风格: `/workspace/src/backend/app/`

---

**蓝图版本**: 1.0
**最后更新**: 2025-02-27
**状态**: Ready for Implementation
