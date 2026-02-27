"""认证路由模块

提供用户注册、登录和获取当前用户信息的端点
参考 Issue #88
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.exceptions import ConflictError
from ...core.security import SecurityService
from ...models.user import User
from ...repositories.user import UserRepository
from ...schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, UserResponse
from ...services.auth import AuthService, TokenResponse
from ..deps import (
    get_auth_service,
    get_current_user,
    get_db_session,
    get_user_repository,
)

# ==================== 响应模型 ====================


class RegisterResponse(BaseModel):
    """注册响应模型

    包含创建的用户信息和 Token
    """

    user: UserResponse
    tokens: TokenResponse


class LoginResponse(BaseModel):
    """登录响应模型

    包含用户信息和 Token
    """

    user: UserResponse
    tokens: TokenResponse


# ==================== 路由定义 ====================

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="用户注册",
    description="创建新用户并返回访问 Token",
    responses={
        409: {
            "description": "用户名或邮箱已存在",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Username already exists",
                        "field": "username",
                    }
                }
            },
        }
    },
)
async def register(
    request: RegisterRequest,
    auth_service: AuthService = Depends(get_auth_service),
    user_repo: UserRepository = Depends(get_user_repository),
    session: AsyncSession = Depends(get_db_session),
) -> RegisterResponse:
    """用户注册端点

    业务逻辑：
    1. 验证请求体（Pydantic 自动验证）
    2. 检查用户名是否已存在
    3. 检查邮箱是否已存在
    4. 加密密码并创建用户
    5. 生成 Token
    6. 返回用户信息和 Token
    """
    # 检查用户名是否存在
    if await user_repo.username_exists(request.username):
        raise ConflictError("Username already exists", extra={"field": "username"})

    # 检查邮箱是否存在
    if await user_repo.email_exists(request.email):
        raise ConflictError("Email already exists", extra={"field": "email"})

    # 加密密码
    security_service = SecurityService()
    hashed_password = security_service.hash_password(request.password)

    # 创建用户对象
    user = User(
        username=request.username,
        email=request.email,
        hashed_password=hashed_password,
        is_active=True,
    )

    # 保存到数据库
    created_user = await user_repo.create(user)

    # 生成 Token
    tokens = auth_service._create_tokens(created_user.id)

    # 构建响应
    return RegisterResponse(
        user=UserResponse.model_validate(created_user),
        tokens=tokens,
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="用户登录",
    description="验证用户凭证并返回访问 Token，支持用户名或邮箱登录",
    responses={
        401: {
            "description": "用户名或密码错误",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid username or password"}
                }
            },
        },
        403: {
            "description": "用户账户未激活",
            "content": {
                "application/json": {
                    "example": {"detail": "User account is inactive", "user_id": 1}
                }
            },
        },
    },
)
async def login(
    request: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
    user_repo: UserRepository = Depends(get_user_repository),
) -> LoginResponse:
    """用户登录端点

    业务逻辑：
    1. 验证请求体（Pydantic 自动验证 username/email 二选一）
    2. 根据 username 或 email 查询用户
    3. 验证密码
    4. 检查用户状态
    5. 生成 Token
    6. 返回用户信息和 Token
    """
    # 确定使用用户名还是邮箱登录
    identifier: str = request.username or request.email  # type: ignore[assignment]

    # 定义获取用户的回调函数
    async def get_user(username_or_email: str) -> User | None:
        """根据用户名或邮箱获取用户"""
        if request.username:
            return await user_repo.get_by_username(username_or_email)
        else:
            return await user_repo.get_by_email(username_or_email)

    # 调用认证服务
    auth_response = await auth_service.authenticate(
        username=identifier,
        plain_password=request.password,
        get_user_func=get_user,
    )

    # 查询完整用户信息
    user = await get_user(identifier)
    if user is None:
        # 这不应该发生，因为 authenticate 已经验证了用户
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )

    # 构建响应
    return LoginResponse(
        user=UserResponse.model_validate(user),
        tokens=auth_response.tokens,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="刷新访问 Token",
    description="使用有效的 refresh_token 获取新的 access_token 和 refresh_token",
    responses={
        200: {
            "description": "Token 刷新成功",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "Bearer",
                        "expires_in": 1800,
                    }
                }
            },
        },
        401: {
            "description": "refresh_token 无效或已过期",
            "content": {
                "application/json": {
                    "examples": {
                        "invalid_token": {
                            "summary": "Token 无效",
                            "value": {
                                "detail": "Invalid token: signature failed",
                                "token_type": "refresh",
                            },
                        },
                        "expired_token": {
                            "summary": "Token 已过期",
                            "value": {
                                "detail": "Token has expired",
                                "token_type": "refresh",
                                "expired_at": "2026-02-27T10:30:00Z",
                            },
                        },
                    }
                }
            },
        },
        422: {
            "description": "请求体验证失败",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Validation error",
                        "errors": [
                            {
                                "loc": ["body", "refresh_token"],
                                "msg": "field required",
                                "type": "value_error.missing",
                            }
                        ],
                    }
                }
            },
        },
    },
)
async def refresh_tokens(
    request: RefreshRequest, auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """Token 刷新端点

    业务逻辑：
    1. 验证请求体（Pydantic 自动验证）
    2. 调用 AuthService.refresh_tokens() 验证并刷新 Token
    3. 返回新的 Token 对（包含新的 access_token 和 refresh_token）
    4. 异常由全局异常处理器统一处理

    Args:
        request: 刷新请求对象，包含 refresh_token
        auth_service: 认证服务（依赖注入）

    Returns:
        TokenResponse: 新的 Token 对

    Raises:
        InvalidTokenError: refresh_token 无效（由全局异常处理器处理）
        TokenExpiredError: refresh_token 已过期（由全局异常处理器处理）
    """
    # 调用认证服务刷新 Token
    tokens = auth_service.refresh_tokens(request.refresh_token)

    return tokens


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="获取当前用户信息",
    description="获取当前认证用户的基本信息（需要提供有效的 JWT Token）",
    responses={
        401: {
            "description": "未认证或 Token 无效",
            "content": {"application/json": {"example": {"detail": "Invalid token"}}},
        }
    },
)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """获取当前用户信息端点

    业务逻辑：
    1. 从 JWT Token 中提取用户 ID（由 get_current_user 依赖完成）
    2. 验证 Token 有效性（由 get_current_user 依赖完成）
    3. 查询用户信息（由 get_current_user 依赖完成）
    4. 返回用户信息
    """
    response: UserResponse = UserResponse.model_validate(current_user)
    return response
