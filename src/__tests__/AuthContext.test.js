/**
 * Tests para AuthContext
 * Verifica autenticación y gestión de permisos
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, ROLE_PERMISSIONS } from '../contexts/AuthContext';

// Mock de Supabase
jest.mock('../services/SupabaseService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  getCurrentUser: jest.fn().mockResolvedValue(null),
  isAuthenticated: jest.fn().mockResolvedValue(false),
  getCurrentOrganization: jest.fn().mockResolvedValue(null),
}));

describe('AuthContext', () => {
  test('provides default auth state', async () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('permissions');
      expect(result.current).toHaveProperty('loading');
    });
  });

  test('ROLE_PERMISSIONS has all required roles', () => {
    expect(ROLE_PERMISSIONS).toHaveProperty('project_manager');
    expect(ROLE_PERMISSIONS).toHaveProperty('executive_manager');
    expect(ROLE_PERMISSIONS).toHaveProperty('pmo_assistant');
    expect(ROLE_PERMISSIONS).toHaveProperty('financial_analyst');
    expect(ROLE_PERMISSIONS).toHaveProperty('project_coordinator');
    expect(ROLE_PERMISSIONS).toHaveProperty('auditor');
  });

  test('project_manager has full permissions', () => {
    const pmPerms = ROLE_PERMISSIONS.project_manager;
    expect(pmPerms.permissions).toContain('*:*');
  });

  test('auditor has read-only permissions', () => {
    const auditorPerms = ROLE_PERMISSIONS.auditor;
    const hasWritePerms = auditorPerms.permissions.some(p =>
      p.includes('write') || p.includes('full')
    );
    expect(hasWritePerms).toBe(false);
  });
});
