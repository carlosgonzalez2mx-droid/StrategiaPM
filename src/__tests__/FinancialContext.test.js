/**
 * Tests para FinancialContext
 * Verifica la gestión de estado financiero
 */

import { renderHook, act } from '@testing-library/react';
import { FinancialProvider, useFinancial } from '../contexts/FinancialContext';
import { ProjectsProvider } from '../contexts/ProjectsContext';

// Wrapper que incluye ambos providers necesarios
const AllProviders = ({ children }) => (
  <ProjectsProvider>
    <FinancialProvider>
      {children}
    </FinancialProvider>
  </ProjectsProvider>
);

describe('FinancialContext', () => {
  const mockPurchaseOrder = {
    id: 'po-1',
    vendor: 'Vendor A',
    amount: 1000,
    status: 'pending'
  };

  const mockAdvance = {
    id: 'adv-1',
    amount: 500,
    date: '2025-01-01'
  };

  const mockInvoice = {
    id: 'inv-1',
    number: 'INV-001',
    amount: 2000
  };

  const mockContract = {
    id: 'cont-1',
    name: 'Contract A',
    value: 10000
  };

  const mockResource = {
    id: 'res-1',
    name: 'Resource A',
    type: 'person'
  };

  beforeEach(() => {
    localStorage.clear();
  });

  test('initializes with empty financial data', () => {
    const { result } = renderHook(() => useFinancial(), { wrapper: AllProviders });

    expect(result.current.purchaseOrdersByProject).toEqual({});
    expect(result.current.advancesByProject).toEqual({});
    expect(result.current.invoicesByProject).toEqual({});
    expect(result.current.contractsByProject).toEqual({});
    expect(result.current.globalResources).toEqual([]);
    expect(result.current.resourceAssignmentsByProject).toEqual({});
  });

  test('throws error when used outside provider', () => {
    const consoleError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useFinancial());
    }).toThrow('useFinancial debe usarse dentro de FinancialProvider');

    console.error = consoleError;
  });

  test('setPurchaseOrdersByProject updates state', () => {
    const { result } = renderHook(() => useFinancial(), { wrapper: AllProviders });

    const newData = { 'proj-1': [mockPurchaseOrder] };

    act(() => {
      result.current.setPurchaseOrdersByProject(newData);
    });

    expect(result.current.purchaseOrdersByProject).toEqual(newData);
  });

  test('addGlobalResource adds a resource', () => {
    const { result } = renderHook(() => useFinancial(), { wrapper: AllProviders });

    act(() => {
      result.current.addGlobalResource(mockResource);
    });

    expect(result.current.globalResources).toHaveLength(1);
    expect(result.current.globalResources[0]).toEqual(mockResource);
  });

  test('setGlobalResources updates global resources', () => {
    const { result } = renderHook(() => useFinancial(), { wrapper: AllProviders });

    const resources = [mockResource, { ...mockResource, id: 'res-2' }];

    act(() => {
      result.current.setGlobalResources(resources);
    });

    expect(result.current.globalResources).toEqual(resources);
  });

  test('provides all financial state setters', () => {
    const { result } = renderHook(() => useFinancial(), { wrapper: AllProviders });

    expect(typeof result.current.setPurchaseOrdersByProject).toBe('function');
    expect(typeof result.current.setAdvancesByProject).toBe('function');
    expect(typeof result.current.setInvoicesByProject).toBe('function');
    expect(typeof result.current.setContractsByProject).toBe('function');
    expect(typeof result.current.setGlobalResources).toBe('function');
    expect(typeof result.current.setResourceAssignmentsByProject).toBe('function');
  });

  test('provides all helper functions', () => {
    const { result } = renderHook(() => useFinancial(), { wrapper: AllProviders });

    expect(typeof result.current.getCurrentProjectPurchaseOrders).toBe('function');
    expect(typeof result.current.getCurrentProjectAdvances).toBe('function');
    expect(typeof result.current.getCurrentProjectInvoices).toBe('function');
    expect(typeof result.current.getCurrentProjectContracts).toBe('function');
    expect(typeof result.current.getCurrentProjectResourceAssignments).toBe('function');
  });

  test('getCurrentProjectPurchaseOrders returns empty array when no project', () => {
    const { result } = renderHook(() => useFinancial(), { wrapper: AllProviders });

    const purchaseOrders = result.current.getCurrentProjectPurchaseOrders();

    expect(purchaseOrders).toEqual([]);
  });
});
