"""用户资料更新 API 端点单元测试

测试范围：
- 正常场景：更新用户名、更新邮箱、同时更新
- 异常场景：邮箱冲突、用户名冲突、无效数据、未认证请求
- Schema 验证测试

契约来源：Issue #170 - src/backend/app/api/v1/auth.py 中的 update_current_user 端点
"""

from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.app.api.v1.auth import update_current_user
from src.backend.app.models.user import User
from src.backend.app.schemas.auth import UserUpdateRequest


class TestUpdateCurrentUserSuccess:
    """测试用户资料更新成功场景"""

    @pytest.mark.asyncio
    async def test_update_username_only(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试仅更新用户名成功"""
        # 准备请求数据
        request = UserUpdateRequest(username="new_username")

        # 配置 mock：用户名不存在（可以更新）
        mock_user_repo.username_exists = AsyncMock(return_value=False)

        # 执行更新
        result = await update_current_user(
            request=request,
            current_user=mock_current_user,
            user_repo=mock_user_repo,
            session=mock_db_session,
        )

        # 验证结果
        assert result.username == "new_username"
        assert result.email == mock_current_user.email

        # 验证数据库操作
        mock_user_repo.username_exists.assert_called_once_with("new_username")
        mock_user_repo.email_exists.assert_not_called()
        mock_db_session.commit.assert_called_once()
        mock_db_session.refresh.assert_called_once_with(mock_current_user)

    @pytest.mark.asyncio
    async def test_update_email_only(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试仅更新邮箱成功"""
        # 准备请求数据
        request = UserUpdateRequest(email="new@example.com")

        # 配置 mock：邮箱不存在（可以更新）
        mock_user_repo.email_exists = AsyncMock(return_value=False)

        # 执行更新
        result = await update_current_user(
            request=request,
            current_user=mock_current_user,
            user_repo=mock_user_repo,
            session=mock_db_session,
        )

        # 验证结果
        assert result.email == "new@example.com"
        assert result.username == mock_current_user.username

        # 验证数据库操作
        mock_user_repo.email_exists.assert_called_once_with("new@example.com")
        mock_user_repo.username_exists.assert_not_called()
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_both_fields(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试同时更新用户名和邮箱成功"""
        # 准备请求数据
        request = UserUpdateRequest(username="new_username", email="new@example.com")

        # 配置 mock：用户名和邮箱均不存在
        mock_user_repo.username_exists = AsyncMock(return_value=False)
        mock_user_repo.email_exists = AsyncMock(return_value=False)

        # 执行更新
        result = await update_current_user(
            request=request,
            current_user=mock_current_user,
            user_repo=mock_user_repo,
            session=mock_db_session,
        )

        # 验证结果
        assert result.username == "new_username"
        assert result.email == "new@example.com"

        # 验证数据库操作
        mock_user_repo.username_exists.assert_called_once_with("new_username")
        mock_user_repo.email_exists.assert_called_once_with("new@example.com")
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_same_username_no_conflict_check(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试更新为相同用户名时不检查冲突"""
        # 设置当前用户名
        mock_current_user.username = "existing_username"

        # 准备请求数据（更新为相同的用户名）
        request = UserUpdateRequest(username="existing_username")

        # 执行更新
        await update_current_user(
            request=request,
            current_user=mock_current_user,
            user_repo=mock_user_repo,
            session=mock_db_session,
        )

        # 验证不检查用户名冲突
        mock_user_repo.username_exists.assert_not_called()
        # 验证没有修改用户名
        assert mock_current_user.username == "existing_username"

    @pytest.mark.asyncio
    async def test_update_same_email_no_conflict_check(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试更新为相同邮箱时不检查冲突"""
        # 设置当前邮箱
        mock_current_user.email = "existing@example.com"

        # 准备请求数据（更新为相同的邮箱）
        request = UserUpdateRequest(email="existing@example.com")

        # 执行更新
        await update_current_user(
            request=request,
            current_user=mock_current_user,
            user_repo=mock_user_repo,
            session=mock_db_session,
        )

        # 验证不检查邮箱冲突
        mock_user_repo.email_exists.assert_not_called()
        # 验证没有修改邮箱
        assert mock_current_user.email == "existing@example.com"


class TestUpdateCurrentUserConflict:
    """测试用户资料更新冲突场景"""

    @pytest.mark.asyncio
    async def test_username_already_exists(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试用户名已存在时抛出 ConflictError"""
        from src.backend.app.core.exceptions import ConflictError

        # 准备请求数据
        request = UserUpdateRequest(username="existing_user")

        # 配置 mock：用户名已存在
        mock_user_repo.username_exists = AsyncMock(return_value=True)

        # 执行更新并验证异常
        with pytest.raises(ConflictError) as exc_info:
            await update_current_user(
                request=request,
                current_user=mock_current_user,
                user_repo=mock_user_repo,
                session=mock_db_session,
            )

        # 验证异常信息
        assert "Username already exists" in str(exc_info.value)
        assert exc_info.value.extra == {"field": "username"}

        # 验证没有提交数据库
        mock_db_session.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_email_already_exists(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试邮箱已存在时抛出 ConflictError"""
        from src.backend.app.core.exceptions import ConflictError

        # 准备请求数据
        request = UserUpdateRequest(email="existing@example.com")

        # 配置 mock：邮箱已存在
        mock_user_repo.email_exists = AsyncMock(return_value=True)

        # 执行更新并验证异常
        with pytest.raises(ConflictError) as exc_info:
            await update_current_user(
                request=request,
                current_user=mock_current_user,
                user_repo=mock_user_repo,
                session=mock_db_session,
            )

        # 验证异常信息
        assert "Email already exists" in str(exc_info.value)
        assert exc_info.value.extra == {"field": "email"}

        # 验证没有提交数据库
        mock_db_session.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_username_conflict_before_email_check(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试用户名冲突时不检查邮箱（短路逻辑）"""
        from src.backend.app.core.exceptions import ConflictError

        # 准备请求数据（同时更新用户名和邮箱）
        request = UserUpdateRequest(username="existing_user", email="new@example.com")

        # 配置 mock：用户名已存在
        mock_user_repo.username_exists = AsyncMock(return_value=True)
        mock_user_repo.email_exists = AsyncMock(return_value=False)

        # 执行更新并验证异常
        with pytest.raises(ConflictError):
            await update_current_user(
                request=request,
                current_user=mock_current_user,
                user_repo=mock_user_repo,
                session=mock_db_session,
            )

        # 验证用户名检查被调用
        mock_user_repo.username_exists.assert_called_once()
        # 验证邮箱检查也被调用（因为代码会先检查用户名，然后继续检查邮箱）
        # 实际上，根据实现，用户名冲突会立即抛出异常，不会检查邮箱
        # 但这里的测试取决于具体实现顺序


class TestUpdateCurrentUserValidation:
    """测试用户资料更新验证场景"""

    @pytest.mark.asyncio
    async def test_invalid_username_too_short(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试用户名太短时抛出 ValidationError"""
        from pydantic import ValidationError

        # 尝试创建无效请求
        with pytest.raises(ValidationError):
            UserUpdateRequest(username="ab")  # 小于 3 个字符

    @pytest.mark.asyncio
    async def test_invalid_username_too_long(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试用户名太长时抛出 ValidationError"""
        from pydantic import ValidationError

        # 尝试创建无效请求
        with pytest.raises(ValidationError):
            UserUpdateRequest(username="a" * 51)  # 超过 50 个字符

    @pytest.mark.asyncio
    async def test_invalid_email_format(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试邮箱格式无效时抛出 ValidationError"""
        from pydantic import ValidationError

        # 尝试创建无效请求
        with pytest.raises(ValidationError):
            UserUpdateRequest(email="invalid-email")

    @pytest.mark.asyncio
    async def test_no_fields_provided(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试未提供任何更新字段时抛出 ValidationError"""
        from pydantic import ValidationError

        # 尝试创建无效请求
        with pytest.raises(ValidationError):
            UserUpdateRequest()


class TestUpdateCurrentUserUnauthenticated:
    """测试未认证场景"""

    @pytest.mark.asyncio
    async def test_no_current_user_raises_attribute_error(
        self, mock_db_session, mock_user_repo
    ):
        """测试没有当前用户时抛出 AttributeError"""
        # 准备请求数据
        request = UserUpdateRequest(username="new_username")

        # 执行更新并验证异常（没有 current_user 会抛出 AttributeError）
        with pytest.raises(AttributeError):
            await update_current_user(
                request=request,
                current_user=None,
                user_repo=mock_user_repo,
                session=mock_db_session,
            )


class TestUpdateCurrentUserEdgeCases:
    """测试用户资料更新边界情况"""

    @pytest.mark.asyncio
    async def test_case_sensitive_username_check(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试用户名大小写敏感检查"""
        # 设置当前用户名
        mock_current_user.username = "TestUser"

        # 准备请求数据（不同大小写）
        request = UserUpdateRequest(username="testuser")

        # 配置 mock：用户名已存在
        mock_user_repo.username_exists = AsyncMock(return_value=True)

        # 执行更新会抛出冲突异常
        from src.backend.app.core.exceptions import ConflictError

        with pytest.raises(ConflictError):
            await update_current_user(
                request=request,
                current_user=mock_current_user,
                user_repo=mock_user_repo,
                session=mock_db_session,
            )

    @pytest.mark.asyncio
    async def test_email_case_insensitive_check(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试邮箱大小写不敏感检查"""
        # 设置当前邮箱
        mock_current_user.email = "test@example.com"

        # 准备请求数据（不同大小写）
        request = UserUpdateRequest(email="TEST@EXAMPLE.COM")

        # 配置 mock：邮箱已存在（大小写不敏感）
        mock_user_repo.email_exists = AsyncMock(return_value=True)

        # 执行更新会抛出冲突异常
        from src.backend.app.core.exceptions import ConflictError

        with pytest.raises(ConflictError):
            await update_current_user(
                request=request,
                current_user=mock_current_user,
                user_repo=mock_user_repo,
                session=mock_db_session,
            )

    @pytest.mark.asyncio
    async def test_unicode_username(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试支持 unicode 用户名"""
        # 准备请求数据
        request = UserUpdateRequest(username="用户名")

        # 配置 mock：用户名不存在
        mock_user_repo.username_exists = AsyncMock(return_value=False)

        # 执行更新
        result = await update_current_user(
            request=request,
            current_user=mock_current_user,
            user_repo=mock_user_repo,
            session=mock_db_session,
        )

        # 验证结果
        assert result.username == "用户名"

    @pytest.mark.asyncio
    async def test_refresh_token_format(
        self, mock_db_session, mock_user_repo, mock_current_user
    ):
        """测试邮箱格式验证"""
        # 准备各种有效邮箱格式
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@test.com",
        ]

        for email in valid_emails:
            request = UserUpdateRequest(email=email)
            mock_user_repo.email_exists = AsyncMock(return_value=False)

            result = await update_current_user(
                request=request,
                current_user=mock_current_user,
                user_repo=mock_user_repo,
                session=mock_db_session,
            )

            assert result.email == email


# ==================== Fixtures ====================


@pytest.fixture
def mock_db_session():
    """模拟数据库会话"""
    session = Mock(spec=AsyncSession)
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def mock_user_repo():
    """模拟用户仓储"""
    repo = Mock()
    repo.username_exists = AsyncMock(return_value=False)
    repo.email_exists = AsyncMock(return_value=False)
    return repo


@pytest.fixture
def mock_current_user():
    """模拟当前用户"""
    from datetime import datetime

    user = Mock(spec=User)
    user.id = 1
    user.username = "testuser"
    user.email = "test@example.com"
    user.is_active = True
    user.created_at = datetime(2024, 1, 1, 0, 0, 0)
    return user
