/**
 * Tests para usePermissions hook
 * Hook para permisos organizacionales basados en roles
 */

import { renderHook, waitFor } from '@testing-library/react';
import usePermissions from '../hooks/usePermissions';
import useAuthUser from '../hooks/useAuthUser';
import supabaseService from '../services/SupabaseService';

// Mocks
jest.mock('../hooks/useAuthUser');
jest.mock('../services/SupabaseService');

describe('usePermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock básico de supabase
    supabaseService.supabase = {
      from: jest.fn()
    };
  });

  describe('Roles de propietario (owner)', () => {
    test('owner debe tener todos los permisos', async () => {
      // Mock: usuario autenticado con organización
      useAuthUser.mockReturnValue({
        currentUser: { id: 'user-1', email: 'owner@example.com' },
        organizationId: 'org-1',
        isLoading: false,
        isAuthenticated: true,
        userEmail: 'owner@example.com'
      });

      // Mock: membership con rol owner
      supabaseService.supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { role: 'owner', status: 'active' },
                  error: null
                })
              })
            })
          })
        })
      });

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userRole).toBe('owner');
      expect(result.current.permissions.canEdit).toBe(true);
      expect(result.current.permissions.canDelete).toBe(true);
      expect(result.current.permissions.canInvite).toBe(true);
      expect(result.current.permissions.canManageUsers).toBe(true);
      expect(result.current.permissions.canArchive).toBe(true);
      expect(result.current.permissions.canExport).toBe(true);
      expect(result.current.isReadOnly()).toBe(false);
    });
  });

  describe('Roles de administrador (admin)', () => {
    test('admin debe tener todos los permisos', async () => {
      useAuthUser.mockReturnValue({
        currentUser: { id: 'user-1', email: 'admin@example.com' },
        organizationId: 'org-1',
        isLoading: false,
        isAuthenticated: true,
        userEmail: 'admin@example.com'
      });

      supabaseService.supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { role: 'admin', status: 'active' },
                  error: null
                })
              })
            })
          })
        })
      });

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userRole).toBe('admin');
      expect(result.current.permissions.canEdit).toBe(true);
      expect(result.current.permissions.canDelete).toBe(true);
      expect(result.current.permissions.canInvite).toBe(true);
      expect(result.current.permissions.canManageUsers).toBe(true);
      expect(result.current.permissions.canArchive).toBe(true);
      expect(result.current.permissions.canExport).toBe(true);
      expect(result.current.isReadOnly()).toBe(false);
    });
  });

  describe('Roles de miembro con escritura (organization_member_write)', () => {
    test('member_write debe tener permisos limitados', async () => {
      useAuthUser.mockReturnValue({
        currentUser: { id: 'user-1', email: 'member@example.com' },
        organizationId: 'org-1',
        isLoading: false,
        isAuthenticated: true,
        userEmail: 'member@example.com'
      });

      supabaseService.supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { role: 'organization_member_write', status: 'active' },
                  error: null
                })
              })
            })
          })
        })
      });

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userRole).toBe('organization_member_write');
      expect(result.current.permissions.canEdit).toBe(true);
      expect(result.current.permissions.canDelete).toBe(false);
      expect(result.current.permissions.canInvite).toBe(false);
      expect(result.current.permissions.canManageUsers).toBe(false);
      expect(result.current.permissions.canArchive).toBe(false);
      expect(result.current.permissions.canExport).toBe(true);
      expect(result.current.isReadOnly()).toBe(false);
    });
  });

  describe('Roles de solo lectura (organization_member_read)', () => {
    test('member_read debe tener solo permiso de exportar', async () => {
      useAuthUser.mockReturnValue({
        currentUser: { id: 'user-1', email: 'reader@example.com' },
        organizationId: 'org-1',
        isLoading: false,
        isAuthenticated: true,
        userEmail: 'reader@example.com'
      });

      supabaseService.supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { role: 'organization_member_read', status: 'active' },
                  error: null
                })
              })
            })
          })
        })
      });

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userRole).toBe('organization_member_read');
      expect(result.current.permissions.canEdit).toBe(false);
      expect(result.current.permissions.canDelete).toBe(false);
      expect(result.current.permissions.canInvite).toBe(false);
      expect(result.current.permissions.canManageUsers).toBe(false);
      expect(result.current.permissions.canArchive).toBe(false);
      expect(result.current.permissions.canExport).toBe(true);
      expect(result.current.isReadOnly()).toBe(true);
    });
  });

  describe('Usuario sin autenticación', () => {
    test('usuario no autenticado debe tener permisos restrictivos', async () => {
      useAuthUser.mockReturnValue({
        currentUser: null,
        organizationId: null,
        isLoading: false,
        isAuthenticated: false,
        userEmail: null
      });

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userRole).toBeNull();
      expect(result.current.permissions.canEdit).toBe(false);
      expect(result.current.permissions.canDelete).toBe(false);
      expect(result.current.permissions.canInvite).toBe(false);
      expect(result.current.permissions.canManageUsers).toBe(false);
      expect(result.current.permissions.canArchive).toBe(false);
      expect(result.current.permissions.canExport).toBe(false);
    });
  });

  describe('Usuario sin organización', () => {
    test('usuario sin organización debe tener permisos restrictivos', async () => {
      useAuthUser.mockReturnValue({
        currentUser: { id: 'user-1', email: 'user@example.com' },
        organizationId: null,
        isLoading: false,
        isAuthenticated: true,
        userEmail: 'user@example.com'
      });

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userRole).toBeNull();
      expect(result.current.permissions.canEdit).toBe(false);
      expect(result.current.permissions.canDelete).toBe(false);
      expect(result.current.permissions.canInvite).toBe(false);
      expect(result.current.permissions.canManageUsers).toBe(false);
      expect(result.current.permissions.canArchive).toBe(false);
      expect(result.current.permissions.canExport).toBe(false);
    });
  });

  describe('Errores de Supabase', () => {
    test('debe manejar error de Supabase correctamente', async () => {
      useAuthUser.mockReturnValue({
        currentUser: { id: 'user-1', email: 'user@example.com' },
        organizationId: 'org-1',
        isLoading: false,
        isAuthenticated: true,
        userEmail: 'user@example.com'
      });

      supabaseService.supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error', code: '500' }
                })
              })
            })
          })
        })
      });

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userRole).toBeNull();
      expect(result.current.permissions.canEdit).toBe(false);
    });
  });

  describe('Usuario sin membership', () => {
    test('debe manejar usuario sin membership correctamente', async () => {
      useAuthUser.mockReturnValue({
        currentUser: { id: 'user-1', email: 'user@example.com' },
        organizationId: 'org-1',
        isLoading: false,
        isAuthenticated: true,
        userEmail: 'user@example.com'
      });

      supabaseService.supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            })
          })
        })
      });

      const { result } = renderHook(() => usePermissions());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userRole).toBeNull();
      expect(result.current.permissions.canEdit).toBe(false);
      expect(result.current.permissions.canDelete).toBe(false);
      expect(result.current.permissions.canInvite).toBe(false);
      expect(result.current.permissions.canManageUsers).toBe(false);
      expect(result.current.permissions.canArchive).toBe(false);
      expect(result.current.permissions.canExport).toBe(false);
    });
  });
});
