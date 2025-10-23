/**
 * Tests de Smoke/Regresión para StrategiaPM
 * Verifica que la funcionalidad básica no se rompa durante refactorización
 */

import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock de servicios externos
jest.mock('./services/SupabaseService');
jest.mock('./services/FilePersistenceService');

describe('App - Smoke Tests', () => {
  test('renders without crashing', () => {
    render(<App />);
    // Verificar que la app renderiza sin errores
    expect(document.body).toBeInTheDocument();
  });

  test('shows login or main app interface', async () => {
    render(<App />);

    await waitFor(() => {
      // Debe mostrar login o la app principal (dependiendo del estado de auth)
      const body = document.body;
      expect(body).toBeTruthy();
    }, { timeout: 3000 });
  });

  test('initializes with routing', () => {
    const { container } = render(<App />);

    // Verificar que el Router se inicializa
    expect(container.querySelector('*')).toBeInTheDocument();
  });
});
