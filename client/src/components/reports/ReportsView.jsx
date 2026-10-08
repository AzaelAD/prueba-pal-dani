import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/Toast';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { TableSkeleton } from '../common/Skeleton';
import { Badge } from '../common/Badge';

export const ReportsView = () => {
  const { formatMoney } = useSettings();
  const { success, error, warning } = useToast();

  const [activeSubTab, setActiveSubTab] = useState('sales'); // 'sales' | 'cash'

  // Rango de fechas
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [reportData, setReportData] = useState(null);
  const [salesList, setSalesList] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Módulo Corte de Caja
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftsHistory, setShiftsHistory] = useState([]);
  const [loadingShift, setLoadingShift] = useState(false);

  // Modales de Caja
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('1000');
  const [openShiftNotes, setOpenShiftNotes] = useState('');

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState('RETIRO'); // 'RETIRO' | 'INGRESO'
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [actualCashCounted, setActualCashCounted] = useState('');
  const [closeShiftNotes, setCloseShiftNotes] = useState('');

  // Cargar Reporte de Ventas
  const fetchSalesReport = async () => {
    try {
      setLoadingReport(true);
      const res = await api.get('/reports/detailed', { startDate, endDate });
      if (res.success) {
        setReportData(res.summary);
        setSalesList(res.sales || []);
      }
    } catch (err) {
      error('Error al generar reporte de ventas');
    } finally {
      setLoadingReport(false);
    }
  };

  // Cargar Estado de Caja
  const fetchCashShiftData = async () => {
    try {
      setLoadingShift(true);
      const [curRes, histRes] = await Promise.all([
        api.get('/cash/current'),
        api.get('/cash/history')
      ]);

      if (curRes.success) setCurrentShift(curRes.shift);
      if (histRes.success) setShiftsHistory(histRes.shifts || []);
    } catch (err) {
      error('Error al consultar caja');
    } finally {
      setLoadingShift(false);
    }
  };

  useEffect(() => {
    fetchSalesReport();
    fetchCashShiftData();
  }, []);

  // Abrir Turno de Caja
  const handleOpenShift = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/cash/open', {
        openingAmount: parseFloat(openingAmount) || 0,
        notes: openShiftNotes
      });
      if (res.success) {
        success('Turno de caja abierto correctamente');
        setIsOpenShiftModalOpen(false);
        fetchCashShiftData();
      }
    } catch (err) {
      error(err.message || 'Error al abrir caja');
    }
  };

  // Registrar Movimiento de Caja (Ingreso / Retiro)
  const handleAddMovement = async (e) => {
    e.preventDefault();
    if (!currentShift) return;
    if (!movementAmount || !movementReason.trim()) {
      warning('Monto y motivo son requeridos');
      return;
    }

    try {
      const res = await api.post('/cash/movement', {
        cashShiftId: currentShift.id,
        type: movementType,
        amount: parseFloat(movementAmount),
        reason: movementReason
      });
      if (res.success) {
        success(`Movimiento (${movementType}) registrado`);
        setIsMovementModalOpen(false);
        setMovementAmount('');
        setMovementReason('');
        fetchCashShiftData();
      }
    } catch (err) {
      error(err.message || 'Error al registrar movimiento');
    }
  };

  // Cerrar Turno de Caja (Corte Z)
  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!currentShift) return;

    try {
      const res = await api.post(`/cash/close/${currentShift.id}`, {
        actualCash: parseFloat(actualCashCounted) || 0,
        notes: closeShiftNotes
      });
      if (res.success) {
        success('Corte de caja completado');
        setIsCloseShiftModalOpen(false);
        fetchCashShiftData();
      }
    } catch (err) {
      error(err.message || 'Error al cerrar caja');
    }
  };

  // Exportar Reporte a Excel
  const handleExportExcel = () => {
    try {
      const rows = salesList.map((s) => ({
        'Folio': s.folio,
        'Fecha': new Date(s.createdAt).toLocaleString('es-MX'),
        'Cliente': s.customer?.name || 'Público General',
        'Cajero': s.user?.name || '',
        'Método Pago': s.paymentMethod,
        'Subtotal ($)': s.subtotal,
        'Descuento ($)': s.discount,
        'IVA ($)': s.tax,
        'Total ($)': s.total,
        'Estado': s.status
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ReporteVentas');
      XLSX.writeFile(wb, `Reporte-Ventas-${startDate}-al-${endDate}.xlsx`);
      success('Reporte Excel generado');
    } catch (err) {
      error('Error al exportar reporte a Excel');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Reportes Financieros y Cortes de Caja</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Análisis de rentabilidad médica, flujo de efectivo y cierres de turno
          </p>
        </div>

        {/* SubTab Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10">
          <button
            onClick={() => setActiveSubTab('sales')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'sales'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Ventas y Utilidad</span>
          </button>
          <button
            onClick={() => setActiveSubTab('cash')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'cash'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Corte de Caja</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: REPORTE DE VENTAS Y UTILIDAD */}
      {activeSubTab === 'sales' && (
        <div className="space-y-6">
          {/* Date Filter Bar & Export */}
          <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Desde:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Hasta:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={fetchSalesReport}
                className="px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors"
              >
                Filtrar
              </button>
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium border border-white/10 transition-colors self-start md:self-auto"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Descargar Excel</span>
            </button>
          </GlassCard>

          {/* Metric Cards Summary */}
          {reportData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassCard hoverGlow className="p-5">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Ingresos Totales (Ventas)
                </span>
                <h3 className="text-2xl font-bold font-mono text-white">
                  {formatMoney(reportData.totalRevenue)}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  {reportData.totalSales} transacciones registradas
                </p>
              </GlassCard>

              <GlassCard hoverGlow className="p-5">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Costo de Adquisición
                </span>
                <h3 className="text-2xl font-bold font-mono text-slate-300">
                  {formatMoney(reportData.totalCost)}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Costo de materiales vendidos
                </p>
              </GlassCard>

              <GlassCard hoverGlow className="p-5 border-emerald-500/30">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Utilidad Bruta
                </span>
                <h3 className="text-2xl font-bold font-mono text-emerald-400">
                  {formatMoney(reportData.grossProfit)}
                </h3>
                <p className="text-[11px] text-emerald-300 font-mono mt-1">
                  Margen de ganancia: {reportData.profitMargin}%
                </p>
              </GlassCard>

              <GlassCard hoverGlow className="p-5">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Métodos de Pago
                </span>
                <div className="space-y-1 text-xs font-mono mt-2 text-slate-300">
                  <div className="flex justify-between">
                    <span>Efectivo:</span>
                    <span>{formatMoney(reportData.paymentMethodsSummary?.Efectivo || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tarjeta:</span>
                    <span>{formatMoney(reportData.paymentMethodsSummary?.Tarjeta || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transferencia:</span>
                    <span>{formatMoney(reportData.paymentMethodsSummary?.Transferencia || 0)}</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Sales List Table */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Ventas del Periodo Seleccionado</h4>
              <span className="text-xs text-slate-400 font-mono">{salesList.length} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-white/10 text-slate-400 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Folio</th>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Método</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">IVA</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {salesList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-500">
                        No se encontraron ventas en el rango de fechas seleccionado.
                      </td>
                    </tr>
                  ) : (
                    salesList.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {s.folio}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(s.createdAt).toLocaleString('es-MX')}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">
                          {s.customer?.name || 'Público General'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-mono text-[10px]">
                            {s.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatMoney(s.subtotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatMoney(s.tax)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatMoney(s.total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={s.status === 'COMPLETED' ? 'emerald' : 'rose'}>
                            {s.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* SUBTAB 2: CORTE DE CAJA (CASH REGISTER MANAGEMENT) */}
      {activeSubTab === 'cash' && (
        <div className="space-y-6">
          {/* Current Shift Status Card */}
          <GlassCard className="p-6 border-emerald-500/20 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  currentShift
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {currentShift ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {currentShift ? 'Turno de Caja Activo' : 'Caja Cerrada'}
                    </h3>
                    <Badge variant={currentShift ? 'emerald' : 'slate'} pulse={Boolean(currentShift)}>
                      {currentShift ? 'Operando' : 'Sin turno abierto'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentShift
                      ? `Abierta desde: ${new Date(currentShift.openedAt).toLocaleTimeString('es-MX')} • Fondo inicial: ${formatMoney(currentShift.openingAmount)}`
                      : 'No hay turno activo para este usuario. Inicia un nuevo turno con un fondo de apertura.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                {currentShift ? (
                  <>
                    <button
                      onClick={() => setIsMovementModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5"
                    >
                      <ArrowDownCircle className="w-4 h-4 text-cyan-400" />
                      <span>Ingreso / Retiro</span>
                    </button>
                    <button
                      onClick={() => {
                        setActualCashCounted(currentShift.expectedCash.toFixed(2));
                        setIsCloseShiftModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 transition-colors flex items-center gap-1.5"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Cerrar Turno (Corte)</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsOpenShiftModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Abrir Turno de Caja
                  </button>
                )}
              </div>
            </div>

            {/* Shift Real-Time Metrics */}
            {currentShift && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[11px] text-slate-400 block font-mono">Fondo Inicial</span>
                  <span className="text-base font-bold font-mono text-white">
                    {formatMoney(currentShift.openingAmount)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[11px] text-slate-400 block font-mono">Ventas en Efectivo</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    +{formatMoney(currentShift.cashSales)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[11px] text-slate-400 block font-mono">Retiros / Gastos</span>
                  <span className="text-base font-bold font-mono text-rose-400">
                    -{formatMoney(currentShift.withdrawals)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-[11px] text-emerald-400 block font-mono font-semibold">
                    Efectivo Esperado en Caja
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-300">
                    {formatMoney(currentShift.expectedCash)}
                  </span>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Past Shifts History */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/10">
              <h4 className="text-sm font-semibold text-white">Historial de Cortes de Caja Anteriores</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-white/10 text-slate-400 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Fecha Apertura</th>
                    <th className="py-3 px-4">Fecha Cierre</th>
                    <th className="py-3 px-4">Responsable</th>
                    <th className="py-3 px-4 text-right">Fondo Apertura</th>
                    <th className="py-3 px-4 text-right">Vtas Efectivo</th>
                    <th className="py-3 px-4 text-right">Retiros</th>
                    <th className="py-3 px-4 text-right">Efectivo Esperado</th>
                    <th className="py-3 px-4 text-right">Efectivo Contado</th>
                    <th className="py-3 px-4 text-right">Diferencia</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {shiftsHistory.map((sh) => (
                    <tr key={sh.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                        {new Date(sh.openedAt).toLocaleString('es-MX')}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {sh.closedAt ? new Date(sh.closedAt).toLocaleString('es-MX') : 'En curso'}
                      </td>
                      <td className="py-3 px-4 text-white font-medium">
                        {sh.user?.name}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatMoney(sh.openingAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400">
                        {formatMoney(sh.cashSales)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-400">
                        {formatMoney(sh.withdrawals)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300 font-bold">
                        {formatMoney(sh.expectedCash)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-white font-bold">
                        {sh.actualCash !== null ? formatMoney(sh.actualCash) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {sh.difference !== null ? (
                          <span className={sh.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {sh.difference > 0 ? '+' : ''}{formatMoney(sh.difference)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={sh.status === 'OPEN' ? 'emerald' : 'slate'} pulse={sh.status === 'OPEN'}>
                          {sh.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Modal Abrir Turno */}
      <Modal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        title="Apertura de Turno de Caja"
        subtitle="Ingresa el fondo inicial en efectivo"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleOpenShift} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Fondo Inicial en Efectivo ($) *
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              placeholder="1000.00"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              className="w-full text-xl font-mono font-bold px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-emerald-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Notas de Apertura
            </label>
            <input
              type="text"
              placeholder="Ej. Turno matutino, billetes chicos y monedas"
              value={openShiftNotes}
              onChange={(e) => setOpenShiftNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25"
          >
            Confirmar Apertura de Caja
          </button>
        </form>
      </Modal>

      {/* Modal Registrar Movimiento (Ingreso / Retiro) */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Movimiento de Caja"
        subtitle="Registrar un retiro o ingreso extraordinario"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddMovement} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMovementType('RETIRO')}
              className={`p-3 rounded-xl border text-xs font-bold transition-colors ${
                movementType === 'RETIRO'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              Retiro / Gasto
            </button>
            <button
              type="button"
              onClick={() => setMovementType('INGRESO')}
              className={`p-3 rounded-xl border text-xs font-bold transition-colors ${
                movementType === 'INGRESO'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              Ingreso Extra
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Monto ($) *
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              placeholder="0.00"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              className="w-full text-lg font-mono font-bold px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Motivo o Justificación *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Pago a proveedor de gasas, compra de papelería"
              value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25"
          >
            Registrar Movimiento
          </button>
        </form>
      </Modal>

      {/* Modal Cerrar Turno (Corte Z) */}
      <Modal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        title="Cierre de Turno de Caja (Corte Z)"
        subtitle="Ingresa el monto de efectivo físico contado en el cajón"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCloseShift} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Efectivo Esperado en Sistema:</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatMoney(currentShift?.expectedCash || 0)}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Efectivo Físico Contado ($) *
            </label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              placeholder="0.00"
              value={actualCashCounted}
              onChange={(e) => setActualCashCounted(e.target.value)}
              className="w-full text-2xl font-mono font-bold px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-emerald-400 focus:outline-none focus:border-emerald-500 text-center"
            />
          </div>

          {actualCashCounted !== '' && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-400">Diferencia (Sobrante/Faltante):</span>
              <span className={`font-mono font-bold ${
                parseFloat(actualCashCounted) - (currentShift?.expectedCash || 0) >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}>
                {formatMoney(parseFloat(actualCashCounted) - (currentShift?.expectedCash || 0))}
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Observaciones de Cierre
            </label>
            <textarea
              rows={2}
              placeholder="Notas sobre el corte, billetes retenidos, etc."
              value={closeShiftNotes}
              onChange={(e) => setCloseShiftNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30"
          >
            Confirmar y Cerrar Caja
          </button>
        </form>
      </Modal>
    </div>
  );
};
