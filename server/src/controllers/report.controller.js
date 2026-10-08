const prisma = require('../utils/prisma');

// Métricas completas para el Dashboard
const getDashboardMetrics = async (req, res) => {
  try {
    const now = new Date();

    // Rango hoy
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Rango ayer
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfToday);
    endOfYesterday.setMilliseconds(-1);

    // Rango últimos 7 días
    const startOf7DaysAgo = new Date(startOfToday);
    startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);

    // Rango este mes
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    // 1. Ventas de Hoy
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: 'COMPLETED'
      },
      include: { items: true }
    });

    const totalTodaySales = todaySales.reduce((acc, s) => acc + s.total, 0);
    const todayCount = todaySales.length;

    // Utilidad de Hoy (Venta - Costo)
    let todayCost = 0;
    for (const s of todaySales) {
      for (const item of s.items) {
        todayCost += (item.purchasePrice || 0) * item.quantity;
      }
    }
    const todayProfit = totalTodaySales - todayCost;

    // 2. Ventas de Ayer (para calcular indicador ↑↓)
    const yesterdaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startOfYesterday, lte: endOfYesterday },
        status: 'COMPLETED'
      },
      include: { items: true }
    });

    const totalYesterdaySales = yesterdaySales.reduce((acc, s) => acc + s.total, 0);
    let yesterdayCost = 0;
    for (const s of yesterdaySales) {
      for (const item of s.items) {
        yesterdayCost += (item.purchasePrice || 0) * item.quantity;
      }
    }
    const yesterdayProfit = totalYesterdaySales - yesterdayCost;

    // Porcentaje de cambio en utilidad
    let profitChangePct = 0;
    if (yesterdayProfit > 0) {
      profitChangePct = ((todayProfit - yesterdayProfit) / yesterdayProfit) * 100;
    } else if (todayProfit > 0) {
      profitChangePct = 100;
    }

    // 3. Ventas de este mes
    const monthSales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startOfMonth },
        status: 'COMPLETED'
      }
    });
    const totalMonthSales = monthSales.reduce((acc, s) => acc + s.total, 0);

    // 4. Alertas de stock bajo
    const allProducts = await prisma.product.findMany({
      where: { status: true }
    });
    const lowStockProducts = allProducts.filter(p => p.currentStock <= p.minStock);

    // 5. Gráfico de últimos 7 días
    const last7DaysSales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startOf7DaysAgo },
        status: 'COMPLETED'
      }
    });

    // Mapear días
    const daysMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOf7DaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
      daysMap[key] = { dia: key, ventas: 0, transacciones: 0 };
    }

    for (const s of last7DaysSales) {
      const d = new Date(s.createdAt);
      const key = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
      if (daysMap[key]) {
        daysMap[key].ventas += s.total;
        daysMap[key].transacciones += 1;
      }
    }
    const weeklyChartData = Object.values(daysMap);

    // 6. Top productos más vendidos
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: { status: 'COMPLETED' }
      },
      include: {
        product: { select: { id: true, name: true, category: true } }
      }
    });

    const productAgg = {};
    for (const item of saleItems) {
      const pId = item.productId;
      if (!productAgg[pId]) {
        productAgg[pId] = {
          id: pId,
          name: item.product?.name || 'Desconocido',
          category: item.product?.category || 'Varios',
          totalUnits: 0,
          totalRevenue: 0
        };
      }
      productAgg[pId].totalUnits += item.quantity;
      productAgg[pId].totalRevenue += item.subtotal;
    }

    const topProducts = Object.values(productAgg)
      .sort((a, b) => b.totalUnits - a.totalUnits)
      .slice(0, 5);

    // 7. Ticker última venta
    const latestSale = await prisma.sale.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        items: {
          take: 2,
          include: { product: { select: { name: true } } }
        }
      }
    });

    return res.json({
      success: true,
      metrics: {
        todaySales: totalTodaySales,
        todayCount,
        todayProfit,
        yesterdayProfit,
        profitChangePct: parseFloat(profitChangePct.toFixed(1)),
        monthSales: totalMonthSales,
        lowStockCount: lowStockProducts.length,
        lowStockItems: lowStockProducts.slice(0, 8),
        weeklyChartData,
        topProducts,
        latestSale
      }
    });
  } catch (error) {
    console.error('Error al calcular métricas de dashboard:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar métricas', error: error.message });
  }
};

// Reporte detallado por rango de fechas
const getDetailedReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = { status: 'COMPLETED' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        user: { select: { name: true } },
        items: {
          include: { product: true }
        }
      }
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    const paymentMethodsSummary = { Efectivo: 0, Tarjeta: 0, Transferencia: 0 };

    for (const s of sales) {
      totalRevenue += s.total;
      totalDiscount += s.discount;
      totalTax += s.tax;

      if (paymentMethodsSummary[s.paymentMethod] !== undefined) {
        paymentMethodsSummary[s.paymentMethod] += s.total;
      } else {
        paymentMethodsSummary[s.paymentMethod] = s.total;
      }

      for (const it of s.items) {
        totalCost += (it.purchasePrice || 0) * it.quantity;
      }
    }

    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return res.json({
      success: true,
      summary: {
        totalSales: sales.length,
        totalRevenue,
        totalCost,
        grossProfit,
        profitMargin: parseFloat(profitMargin.toFixed(1)),
        totalDiscount,
        totalTax,
        paymentMethodsSummary
      },
      sales
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al generar reporte', error: error.message });
  }
};

module.exports = {
  getDashboardMetrics,
  getDetailedReport
};
