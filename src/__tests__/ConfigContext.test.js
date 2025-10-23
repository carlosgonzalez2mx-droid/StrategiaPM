/**
 * Tests para ConfigContext
 * Verifica la gestión de estado de configuración y UI
 */

import { renderHook, act } from '@testing-library/react';
import { ConfigProvider, useConfig } from '../contexts/ConfigContext';

describe('ConfigContext', () => {
  test('initializes with default values', () => {
    const { result } = renderHook(() => useConfig(), { wrapper: ConfigProvider });

    expect(result.current.portfolioViewMode).toBe('portfolio');
    expect(result.current.viewMode).toBe('dashboard');
    expect(result.current.useSupabase).toBe(false);
    expect(result.current.supabaseInitialized).toBe(false);
    expect(result.current.showAuthModal).toBe(false);
    expect(result.current.dataLoaded).toBe(false);
  });

  test('throws error when used outside provider', () => {
    const consoleError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useConfig());
    }).toThrow('useConfig debe usarse dentro de ConfigProvider');

    console.error = consoleError;
  });

  test('setPortfolioViewMode updates state', () => {
    const { result } = renderHook(() => useConfig(), { wrapper: ConfigProvider });

    act(() => {
      result.current.setPortfolioViewMode('project');
    });

    expect(result.current.portfolioViewMode).toBe('project');
  });

  test('setViewMode updates state', () => {
    const { result } = renderHook(() => useConfig(), { wrapper: ConfigProvider });

    act(() => {
      result.current.setViewMode('schedule');
    });

    expect(result.current.viewMode).toBe('schedule');
  });

  test('setUseSupabase updates state', () => {
    const { result } = renderHook(() => useConfig(), { wrapper: ConfigProvider });

    act(() => {
      result.current.setUseSupabase(true);
    });

    expect(result.current.useSupabase).toBe(true);
  });

  test('setSupabaseInitialized updates state', () => {
    const { result } = renderHook(() => useConfig(), { wrapper: ConfigProvider });

    act(() => {
      result.current.setSupabaseInitialized(true);
    });

    expect(result.current.supabaseInitialized).toBe(true);
  });

  test('setShowAuthModal updates state', () => {
    const { result } = renderHook(() => useConfig(), { wrapper: ConfigProvider });

    act(() => {
      result.current.setShowAuthModal(true);
    });

    expect(result.current.showAuthModal).toBe(true);
  });

  test('setDataLoaded updates state', () => {
    const { result } = renderHook(() => useConfig(), { wrapper: ConfigProvider });

    act(() => {
      result.current.setDataLoaded(true);
    });

    expect(result.current.dataLoaded).toBe(true);
  });

  test('provides all state setters and getters', () => {
    const { result } = renderHook(() => useConfig(), { wrapper: ConfigProvider });

    // View state
    expect(typeof result.current.setPortfolioViewMode).toBe('function');
    expect(typeof result.current.setViewMode).toBe('function');

    // Supabase config
    expect(typeof result.current.setUseSupabase).toBe('function');
    expect(typeof result.current.setSupabaseInitialized).toBe('function');
    expect(typeof result.current.setShowAuthModal).toBe('function');

    // Data loading state
    expect(typeof result.current.setDataLoaded).toBe('function');
  });

  test('can update multiple states independently', () => {
    const { result } = renderHook(() => useConfig(), { wrapper: ConfigProvider });

    act(() => {
      result.current.setViewMode('portfolio');
      result.current.setUseSupabase(true);
      result.current.setDataLoaded(true);
    });

    expect(result.current.viewMode).toBe('portfolio');
    expect(result.current.useSupabase).toBe(true);
    expect(result.current.dataLoaded).toBe(true);
    // Other states should remain at defaults
    expect(result.current.showAuthModal).toBe(false);
    expect(result.current.supabaseInitialized).toBe(false);
  });
});
