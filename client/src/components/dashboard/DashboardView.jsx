import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { api } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { GlassCard } from '../common/GlassCard';
import { Badge } from '../common/Badge';
import { Skeleton } from '../common/Skeleton';

export const DashboardView = ({ onNavigateToPos, onNavigateToInventory }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const { formatMoney } = useSettings();

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard');
      if (res.success) {
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 20000); // 20s auto-refresh
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton count={4} className="h-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const isProfitUp = (metrics?.profitChangePct || 0) >= 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Real-time Last Sale Ticker */}
      {metrics?.latestSale && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/20 backdrop-blur-xl text-xs text-slate-300"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-white">Última Venta Registrada:</span>
            <span className="font-mono text-emerald-400 font-bold">{metrics.latestSale.folio}</span>
            <span className="text-slate-400">•</span>
            <span>{metrics.latestSale.customer?.name || 'Venta al Mostrador'}</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-white font-semibold">
              {formatMoney(metrics.latestSale.total)} ({metrics.latestSale.paymentMethod})
            </span>
          </div>
          <button
            onClick={onNavigateToPos}
            className="hidden md:flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
          >
            <span>Ir al POS</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Ventas de Hoy */}
        <GlassCard hoverGlow className="p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Ventas de Hoy
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-bold font-mono text-white tracking-tight">
              {formatMoney(metrics?.todaySales || 0)}
            </h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <span className="text-emerald-400 font-semibold">{metrics?.todayCount || 0}</span> transacciones hoy
            </p>
          </div>
        </GlassCard>

        {/* 2. Utilidad Bruta del Día con indicador ↑↓ vs ayer */}
        <GlassCard hoverGlow className="p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Utilidad Bruta Hoy
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isProfitUp
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}>
              {isProfitUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-bold font-mono text-white tracking-tight">
              {formatMoney(metrics?.todayProfit || 0)}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              {(metrics?.todayCount || 0) > 0 ? (
                <>
                  <span className={`text-xs font-bold font-mono flex items-center gap-0.5 ${
                    isProfitUp ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isProfitUp ? '↑ +' : '↓ '}{metrics?.profitChangePct || 0}%
                  </span>
                  <span className="text-[11px] text-slate-400">vs ayer ({formatMoney(metrics?.yesterdayProfit || 0)})</span>
                </>
              ) : (
                <span className="text-[11px] text-slate-500 font-mono">Esperando primera venta</span>
              )}
            </div>
          </div>
        </GlassCard>

        {/* 3. Ventas del Mes */}
        <GlassCard hoverGlow className="p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Este Mes
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-bold font-mono text-white tracking-tight">
              {formatMoney(metrics?.monthSales || 0)}
            </h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Acumulado del mes actual</span>
            </p>
          </div>
        </GlassCard>

        {/* 4. Alerta de Stock Bajo (Badge Pulsante) */}
        <GlassCard
          hoverGlow
          onClick={onNavigateToInventory}
          className="p-5 relative overflow-hidden group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Stock Crítico
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold font-mono text-white tracking-tight">
                {metrics?.lowStockCount || 0}
              </h2>
              {metrics?.lowStockCount > 0 && (
                <Badge variant="rose" pulse>
                  Acción Requerida
                </Badge>
              )}
            </div>
            <p className="text-xs text-rose-300/80 mt-1 flex items-center gap-1">
              <span>Productos con inventario mínimo o agotado</span>
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tendencia de ventas últimos 7 días */}
        <GlassCard className="p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                Tendencia de Ventas (Últimos 7 Días)
              </h3>
              <p className="text-xs text-slate-400">Ingresos diarios registrados en el sistema</p>
            </div>
            <Badge variant="cyan">Tiempo Real</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.weeklyChartData || []}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="dia" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    borderRadius: '1rem',
                    color: '#fff',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Ventas']}
                />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Productos más vendidos (Horizontal Bar Chart) */}
        <GlassCard className="p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Más Vendidos</h3>
              <p className="text-xs text-slate-400">Unidades colocadas históricamente</p>
            </div>
            <Badge variant="emerald">Top 5</Badge>
          </div>

          {metrics?.topProducts && metrics.topProducts.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={metrics.topProducts}
                  margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={10}
                    width={90}
                    tickFormatter={(name) => name.length > 12 ? `${name.substring(0, 10)}...` : name}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'rgba(6, 182, 212, 0.3)',
                      borderRadius: '1rem',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                    formatter={(val, name, item) => [`${val} unidades ($${item.payload.totalRevenue.toFixed(2)})`, 'Total']}
                  />
                  <Bar dataKey="totalUnits" fill="#06b6d4" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              No hay datos suficientes de ventas aún.
            </div>
          )}
        </GlassCard>
      </div>

      {/* Low Stock Alert Table Preview */}
      {metrics?.lowStockItems && metrics.lowStockItems.length > 0 && (
        <GlassCard className="p-5 border-rose-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
              <div>
                <h4 className="text-sm font-semibold text-white">Atención: Productos con Stock Bajo</h4>
                <p className="text-xs text-slate-400">Material de curación próximo a agotarse</p>
              </div>
            </div>
            <button
              onClick={onNavigateToInventory}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
            >
              <span>Gestionar en Inventario</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {metrics.lowStockItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-white/5 border border-rose-500/20 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-medium text-slate-200 truncate max-w-[140px]">{item.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Mín: {item.minStock} {item.unit}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-rose-400">
                    {item.currentStock}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};
