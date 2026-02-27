"""
UserRepository 单元测试

测试范围：
- get_by_username() - 用户名查询（区分大小写）
- get_by_email() - 邮箱查询（不区分大小写）
- username_exists() - 用户名存在性检查
- email_exists() - 邮箱存在性检查（不区分大小写）
- 边界情况（空值、不存在记录、大小写敏感性）

参考 Issue #92
"""

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.backend.app.models.base import Base
from src.backend.app.models.user import User
from src.backend.app.repositories.user import UserRepository

# ==================== 共享 Fixtures ====================


@pytest.fixture
async def async_engine():
    """创建异步测试引擎"""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    await engine.dispose()


@pytest.fixture
async def async_session(async_engine):
    """创建异步测试会话"""
    async_session_maker = async_sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session


@pytest.fixture
def repository(async_session):
    """创建 UserRepository 实例"""
    return UserRepository(async_session)


@pytest.fixture
async def sample_user(async_session):
    """创建测试用户"""
    user = User(
        id=str(uuid4()),
        username="alice",
        email="alice@example.com",
        hashed_password="hashed_password_123",
        is_active=True,
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest.fixture
async def multiple_users(async_session):
    """创建多个测试用户"""
    users = [
        User(
            id=str(uuid4()),
            username="alice",
            email="alice@example.com",
            hashed_password="hash1",
            is_active=True,
        ),
        User(
            id=str(uuid4()),
            username="bob",
            email="bob@example.com",
            hashed_password="hash2",
            is_active=True,
        ),
        User(
            id=str(uuid4()),
            username="charlie",
            email="charlie@example.com",
            hashed_password="hash3",
            is_active=True,
        ),
    ]
    for user in users:
        async_session.add(user)
    await async_session.commit()
    return users


# ==================== get_by_username 测试 ====================


class TestUserRepositoryGetByUsername:
    """测试 get_by_username() 方法"""

    @pytest.mark.asyncio
    async def test_get_by_username_returns_user_when_exists(
        self, repository, sample_user
    ):
        """测试查询存在的用户名"""
        user = await repository.get_by_username("alice")

        assert user is not None
        assert user.username == "alice"
        assert user.email == "alice@example.com"

    @pytest.mark.asyncio
    async def test_get_by_username_returns_none_when_not_exists(self, repository):
        """测试查询不存在的用户名"""
        user = await repository.get_by_username("nonexistent")

        assert user is None

    @pytest.mark.asyncio
    async def test_get_by_username_is_case_sensitive(self, repository, sample_user):
        """测试用户名区分大小写"""
        user = await repository.get_by_username("Alice")

        assert user is None

    @pytest.mark.asyncio
    async def test_get_by_username_with_empty_string(self, repository):
        """测试空字符串用户名"""
        user = await repository.get_by_username("")

        assert user is None


# ==================== get_by_email 测试 ====================


class TestUserRepositoryGetByEmail:
    """测试 get_by_email() 方法"""

    @pytest.mark.asyncio
    async def test_get_by_email_returns_user_when_exists(self, repository, sample_user):
        """测试查询存在的邮箱"""
        user = await repository.get_by_email("alice@example.com")

        assert user is not None
        assert user.email == "alice@example.com"
        assert user.username == "alice"

    @pytest.mark.asyncio
    async def test_get_by_email_returns_none_when_not_exists(self, repository):
        """测试查询不存在的邮箱"""
        user = await repository.get_by_email("nonexistent@example.com")

        assert user is None

    @pytest.mark.asyncio
    async def test_get_by_email_is_case_insensitive(self, repository, sample_user):
        """测试邮箱不区分大小写"""
        user = await repository.get_by_email("ALICE@EXAMPLE.COM")

        assert user is not None
        assert user.email == "alice@example.com"

    @pytest.mark.asyncio
    async def test_get_by_email_with_mixed_case(self, repository, sample_user):
        """测试邮箱混合大小写"""
        user = await repository.get_by_email("AlIcE@ExAmPlE.cOm")

        assert user is not None

    @pytest.mark.asyncio
    async def test_get_by_email_with_empty_string(self, repository):
        """测试空字符串邮箱"""
        user = await repository.get_by_email("")

        assert user is None


# ==================== username_exists 测试 ====================


class TestUserRepositoryUsernameExists:
    """测试 username_exists() 方法"""

    @pytest.mark.asyncio
    async def test_username_exists_returns_true_when_exists(
        self, repository, sample_user
    ):
        """测试存在的用户名返回 True"""
        exists = await repository.username_exists("alice")

        assert exists is True

    @pytest.mark.asyncio
    async def test_username_exists_returns_false_when_not_exists(self, repository):
        """测试不存在的用户名返回 False"""
        exists = await repository.username_exists("nonexistent")

        assert exists is False

    @pytest.mark.asyncio
    async def test_username_exists_is_case_sensitive(self, repository, sample_user):
        """测试用户名检查区分大小写"""
        exists = await repository.username_exists("Alice")

        assert exists is False

    @pytest.mark.asyncio
    async def test_username_exists_with_empty_string(self, repository):
        """测试空字符串返回 False"""
        exists = await repository.username_exists("")

        assert exists is False


# ==================== email_exists 测试 ====================


class TestUserRepositoryEmailExists:
    """测试 email_exists() 方法"""

    @pytest.mark.asyncio
    async def test_email_exists_returns_true_when_exists(self, repository, sample_user):
        """测试存在的邮箱返回 True"""
        exists = await repository.email_exists("alice@example.com")

        assert exists is True

    @pytest.mark.asyncio
    async def test_email_exists_returns_false_when_not_exists(self, repository):
        """测试不存在的邮箱返回 False"""
        exists = await repository.email_exists("nonexistent@example.com")

        assert exists is False

    @pytest.mark.asyncio
    async def test_email_exists_is_case_insensitive(self, repository, sample_user):
        """测试邮箱检查不区分大小写"""
        exists = await repository.email_exists("ALICE@EXAMPLE.COM")

        assert exists is True

    @pytest.mark.asyncio
    async def test_email_exists_with_mixed_case(self, repository, sample_user):
        """测试邮箱混合大小写"""
        exists = await repository.email_exists("AlIcE@ExAmPlE.cOm")

        assert exists is True

    @pytest.mark.asyncio
    async def test_email_exists_with_empty_string(self, repository):
        """测试空字符串返回 False"""
        exists = await repository.email_exists("")

        assert exists is False


# ==================== 多用户场景测试 ====================


class TestUserRepositoryWithMultipleUsers:
    """测试多用户场景"""

    @pytest.mark.asyncio
    async def test_get_by_username_returns_correct_user(
        self, repository, multiple_users
    ):
        """测试从多个用户中获取正确的用户"""
        user = await repository.get_by_username("bob")

        assert user is not None
        assert user.username == "bob"
        assert user.email == "bob@example.com"

    @pytest.mark.asyncio
    async def test_get_by_email_returns_correct_user(self, repository, multiple_users):
        """测试从多个用户中通过邮箱获取正确的用户"""
        user = await repository.get_by_email("charlie@example.com")

        assert user is not None
        assert user.username == "charlie"

    @pytest.mark.asyncio
    async def test_username_exists_checks_all_users(self, repository, multiple_users):
        """测试存在性检查覆盖所有用户"""
        assert await repository.username_exists("alice") is True
        assert await repository.username_exists("bob") is True
        assert await repository.username_exists("charlie") is True
        assert await repository.username_exists("david") is False

    @pytest.mark.asyncio
    async def test_email_exists_checks_all_users(self, repository, multiple_users):
        """测试邮箱存在性检查覆盖所有用户"""
        assert await repository.email_exists("alice@example.com") is True
        assert await repository.email_exists("bob@example.com") is True
        assert await repository.email_exists("charlie@example.com") is True
        assert await repository.email_exists("david@example.com") is False


# ==================== 边界情况测试 ====================


class TestUserRepositoryEdgeCases:
    """测试边界情况"""

    @pytest.mark.asyncio
    async def test_get_by_username_with_whitespace(self, repository):
        """测试纯空格用户名"""
        user = await repository.get_by_username("   ")

        assert user is None

    @pytest.mark.asyncio
    async def test_get_by_email_with_invalid_format(self, repository):
        """测试无效格式的邮箱"""
        user = await repository.get_by_email("invalid-email")

        assert user is None

    @pytest.mark.asyncio
    async def test_get_by_email_with_whitespace(self, repository):
        """测试纯空格邮箱"""
        user = await repository.get_by_email("   ")

        assert user is None

    @pytest.mark.asyncio
    async def test_username_exists_with_whitespace(self, repository):
        """测试纯空格用户名存在性检查"""
        exists = await repository.username_exists("   ")

        assert exists is False

    @pytest.mark.asyncio
    async def test_email_exists_with_invalid_format(self, repository):
        """测试无效格式邮箱的存在性检查"""
        exists = await repository.email_exists("invalid-email")

        assert exists is False

    @pytest.mark.asyncio
    async def test_email_exists_with_whitespace(self, repository):
        """测试纯空格邮箱存在性检查"""
        exists = await repository.email_exists("   ")

        assert exists is False

    @pytest.mark.asyncio
    async def test_get_by_username_with_none_input(self, repository):
        """测试 None 输入（虽然类型注解是 str）"""
        # 这里测试的是防御性编程，虽然类型注解是 str
        # 但实际运行时可能传入 None
        user = await repository.get_by_username(None)  # type: ignore

        assert user is None

    @pytest.mark.asyncio
    async def test_get_by_email_with_none_input(self, repository):
        """测试邮箱 None 输入"""
        user = await repository.get_by_email(None)  # type: ignore

        assert user is None

    @pytest.mark.asyncio
    async def test_username_exists_with_none_input(self, repository):
        """测试用户名 None 输入存在性检查"""
        exists = await repository.username_exists(None)  # type: ignore

        assert exists is False

    @pytest.mark.asyncio
    async def test_email_exists_with_none_input(self, repository):
        """测试邮箱 None 输入存在性检查"""
        exists = await repository.email_exists(None)  # type: ignore

        assert exists is False
