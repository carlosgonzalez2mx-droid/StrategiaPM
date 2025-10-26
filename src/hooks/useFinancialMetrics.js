import { useMemo } from 'react';

export const useFinancialMetrics = (purchaseOrders, advances, invoices) => {
  return useMemo(() => {
    const totalPurchaseOrders = purchaseOrders?.reduce((sum, po) => sum + (po.totalAmount || 0), 0) || 0;
    const totalAdvances = advances?.reduce((sum, adv) => sum + (adv.amount || 0), 0) || 0;
    const totalInvoices = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

    return {
      totalPurchaseOrders,
      totalAdvances,
      totalInvoices
    };
  }, [purchaseOrders, advances, invoices]);
};
