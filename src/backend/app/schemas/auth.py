"""认证相关模式模块

定义用户注册、登录和响应的数据验证模型
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator
from pydantic.config import ConfigDict


class RegisterRequest(BaseModel):
    """用户注册请求模型

    用于验证用户注册请求的输入数据

    Attributes:
        username (str): 用户名，3-50 字符
        email (EmailStr): 邮箱地址，自动验证格式
        password (str): 密码，最少 8 字符，最多 100 字符
    """

    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=8, max_length=100, description="密码")


class LoginRequest(BaseModel):
    """用户登录请求模型

    支持用户名或邮箱登录

    Attributes:
        username (str | None): 用户名（与 email 二选一）
        email (EmailStr | None): 邮箱地址（与 username 二选一）
        password (str): 密码，最少 1 字符
    """

    username: str | None = Field(
        default=None, min_length=3, max_length=50, description="用户名"
    )
    email: EmailStr | None = Field(default=None, description="邮箱地址")
    password: str = Field(..., min_length=1, description="密码")

    @model_validator(mode="after")
    def validate_username_or_email(self) -> "LoginRequest":
        """验证 username 和 email 至少提供一个

        Returns:
            验证通过的实例

        Raises:
            ValueError: 当 username 和 email 均为 None 时抛出
        """
        if self.username is None and self.email is None:
            raise ValueError("必须提供 username 或 email 其中一个")
        return self


class UserResponse(BaseModel):
    """用户信息响应模型

    用于将 User ORM 模型转换为 API 响应

    Attributes:
        id (int): 用户 ID
        username (str): 用户名
        email (EmailStr): 邮箱地址
        is_active (bool): 账户激活状态
        created_at (datetime): 创建时间
    """

    id: int = Field(..., description="用户 ID")
    username: str = Field(..., description="用户名")
    email: EmailStr = Field(..., description="邮箱地址")
    is_active: bool = Field(..., description="账户激活状态")
    created_at: datetime = Field(..., description="创建时间")

    model_config = ConfigDict(from_attributes=True)
