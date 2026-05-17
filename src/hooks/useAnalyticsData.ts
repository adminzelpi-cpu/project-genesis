import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveStore } from "@/features/stores";
import { startOfDay, subDays, format, parseISO } from "date-fns";

interface Order {
  id: string;
  total: number;
  created_at: string;
  status_pedido: string;
  status_pagamento: string;
  forma_pagamento: string | null;
  customer_id: string | null;
  products: any;
}

interface Customer {
  id: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  stock_quantity: number | null;
  images: any;
  product_variations_v2?: { stock_quantity: number | null; is_active: boolean }[];
}

interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

export function useAnalyticsData() {
  const { store: activeStore, isLoading: storeLoading } = useActiveStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [abandonedCartsCount, setAbandonedCartsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // When store loading finishes and there's no store, stop loading
  useEffect(() => {
    if (!storeLoading && !activeStore?.id) {
      setLoading(false);
    }
  }, [storeLoading, activeStore?.id]);

  useEffect(() => {
    const loadData = async () => {
      if (!activeStore?.id) return;
      setLoading(true);

      const [ordersRes, customersRes, productsRes, abandonedRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total, created_at, status_pedido, status_pagamento, forma_pagamento, customer_id, products")
          .eq("store_id", activeStore.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("customers")
          .select("id, created_at")
          .eq("store_id", activeStore.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select(`id, name, stock_quantity, images, product_variations_v2(stock_quantity, is_active)`)
          .eq("store_id", activeStore.id)
          .eq("is_active", true),
        supabase
          .from("abandoned_carts")
          .select("id", { count: "exact", head: true })
          .eq("store_id", activeStore.id)
          .is("recovered_at", null),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (customersRes.data) setCustomers(customersRes.data as Customer[]);
      if (productsRes.data) setProducts(productsRes.data as Product[]);
      setAbandonedCartsCount(abandonedRes.count || 0);
      setLoading(false);
    };

    loadData();
  }, [activeStore?.id]);

  // Filter only paid orders (excluding cancelled)
  const validOrders = useMemo(() => 
    orders.filter(o => 
      o.status_pedido !== "cancelado" && 
      (o.status_pagamento === "pago" || o.status_pagamento === "aprovado")
    ), 
    [orders]
  );

  // Overview stats
  const overviewStats = useMemo(() => {
    const revenue = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const ordersCount = validOrders.length;
    const avgTicket = ordersCount > 0 ? revenue / ordersCount : 0;
    
    return {
      revenue,
      orders: ordersCount,
      avgTicket,
      customers: customers.length,
      products: products.length,
      abandonedCarts: abandonedCartsCount,
    };
  }, [validOrders, customers, products, abandonedCartsCount]);

  // Daily sales for last 7 days
  const last7DaysSales = useMemo(() => {
    const result: DailySales[] = [];
    const today = startOfDay(new Date());

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayOrders = validOrders.filter(o => {
        const orderDate = format(parseISO(o.created_at), "yyyy-MM-dd");
        return orderDate === dateStr;
      });
      
      result.push({
        date: format(date, "dd/MM"),
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
        orders: dayOrders.length,
      });
    }
    
    return result;
  }, [validOrders]);

  // Period comparison (current vs previous 30 days)
  const periodComparison = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 30);
    const sixtyDaysAgo = subDays(today, 60);

    const currentPeriod = validOrders.filter(o => {
      const d = parseISO(o.created_at);
      return d >= thirtyDaysAgo && d <= today;
    });
    
    const previousPeriod = validOrders.filter(o => {
      const d = parseISO(o.created_at);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    });

    const currentRevenue = currentPeriod.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const previousRevenue = previousPeriod.reduce((sum, o) => sum + Number(o.total || 0), 0);
    
    const currentCustomers = customers.filter(c => {
      const d = parseISO(c.created_at);
      return d >= thirtyDaysAgo && d <= today;
    }).length;
    
    const previousCustomers = customers.filter(c => {
      const d = parseISO(c.created_at);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).length;

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      revenueChange: calcChange(currentRevenue, previousRevenue),
      ordersChange: calcChange(currentPeriod.length, previousPeriod.length),
      customersChange: calcChange(currentCustomers, previousCustomers),
      ticketChange: calcChange(
        currentPeriod.length > 0 ? currentRevenue / currentPeriod.length : 0,
        previousPeriod.length > 0 ? previousRevenue / previousPeriod.length : 0
      ),
    };
  }, [validOrders, customers]);

  // Sales by payment method
  const salesByPaymentMethod = useMemo(() => {
    const methods: Record<string, { count: number; revenue: number }> = {};
    
    validOrders.forEach(o => {
      const method = o.forma_pagamento || "Não informado";
      if (!methods[method]) {
        methods[method] = { count: 0, revenue: 0 };
      }
      methods[method].count++;
      methods[method].revenue += Number(o.total || 0);
    });
    
    return Object.entries(methods).map(([name, data]) => ({
      name: formatPaymentMethod(name),
      value: data.count,
      revenue: data.revenue,
    }));
  }, [validOrders]);

  // Orders by status
  const ordersByStatus = useMemo(() => {
    const statuses: Record<string, number> = {};
    
    orders.forEach(o => {
      const status = o.status_pedido || "pendente";
      statuses[status] = (statuses[status] || 0) + 1;
    });
    
    return Object.entries(statuses).map(([name, value]) => ({
      name: formatOrderStatus(name),
      value,
      original: name,
    }));
  }, [orders]);

  // Top selling products
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; quantity: number; revenue: number; image?: string }> = {};
    
    validOrders.forEach(o => {
      const items = Array.isArray(o.products) ? o.products : [];
      items.forEach((item: any) => {
        const productId = item.product_id || item.id;
        const name = item.name || item.product_name || "Produto";
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        
        if (!productSales[productId]) {
          productSales[productId] = { name, quantity: 0, revenue: 0, image: item.image };
        }
        productSales[productId].quantity += qty;
        productSales[productId].revenue += price * qty;
      });
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [validOrders]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products
      .map(p => {
        const activeVariations = (p.product_variations_v2 || []).filter((v: any) => v.is_active);
        let totalStock: number | null = 0;
        
        if (activeVariations.length === 0) {
          totalStock = p.stock_quantity;
        } else {
          const hasInfiniteStock = activeVariations.some((v: any) => v.stock_quantity === null);
          if (hasInfiniteStock) {
            totalStock = null;
          } else {
            totalStock = activeVariations.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
          }
        }
        
        return {
          ...p,
          calculated_stock: totalStock
        };
      })
      .filter(p => p.calculated_stock !== null && p.calculated_stock <= 5)
      .sort((a, b) => (a.calculated_stock || 0) - (b.calculated_stock || 0))
      .map(p => ({
        ...p,
        stock_quantity: p.calculated_stock
      }))
      .slice(0, 10);
  }, [products]);

  // Customers by period (last 30 days)
  const customersByPeriod = useMemo(() => {
    const result: { date: string; count: number }[] = [];
    const today = startOfDay(new Date());

    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayCustomers = customers.filter(c => {
        const customerDate = format(parseISO(c.created_at), "yyyy-MM-dd");
        return customerDate === dateStr;
      });
      
      result.push({
        date: format(date, "dd/MM"),
        count: dayCustomers.length,
      });
    }
    
    return result;
  }, [customers]);

  // Repurchase rate
  const repurchaseRate = useMemo(() => {
    const customerOrders: Record<string, number> = {};
    
    validOrders.forEach(o => {
      if (o.customer_id) {
        customerOrders[o.customer_id] = (customerOrders[o.customer_id] || 0) + 1;
      }
    });
    
    const totalCustomersWithOrders = Object.keys(customerOrders).length;
    const repeatCustomers = Object.values(customerOrders).filter(count => count > 1).length;
    
    return totalCustomersWithOrders > 0 
      ? (repeatCustomers / totalCustomersWithOrders) * 100 
      : 0;
  }, [validOrders]);

  return {
    loading,
    overviewStats,
    last7DaysSales,
    periodComparison,
    salesByPaymentMethod,
    ordersByStatus,
    topProducts,
    lowStockProducts,
    customersByPeriod,
    repurchaseRate,
    validOrders,
  };
}

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    pix: "PIX",
    credit_card: "Cartão de Crédito",
    boleto: "Boleto",
    debit_card: "Cartão de Débito",
  };
  return map[method.toLowerCase()] || method;
}

function formatOrderStatus(status: string): string {
  const map: Record<string, string> = {
    novo: "Novo",
    em_preparo: "Em Preparo",
    enviado: "Enviado",
    entregue: "Entregue",
    cancelado: "Cancelado",
    devolvido: "Devolvido",
    pendente: "Pendente",
    confirmado: "Confirmado",
    preparando: "Preparando",
  };
  return map[status.toLowerCase()] || status;
}
