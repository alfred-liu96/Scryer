/**
 * E2E 测试辅助函数统一导出
 *
 * @module e2e/helpers
 */

export {
  registerUser,
  loginUser,
  logoutUser,
  clearAuth,
  waitForAuthState,
  getAuthState,
  AUTH_SELECTORS,
  STORAGE_KEYS,
  DEFAULT_TIMEOUTS,
  type UserCredentials,
  type LoginCredentials,
  type RegisterUserOptions,
  type LoginUserOptions,
  type LogoutUserOptions,
  type WaitForAuthStateOptions,
  type ClearAuthOptions,
  AuthHelperError,
  AuthHelperErrorType,
} from './auth-helpers';
