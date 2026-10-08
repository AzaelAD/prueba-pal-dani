import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Command,
  Wallet,
  AlertCircle,
  TrendingUp,
  Clock,
  X
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { api } from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';

export const Header = ({ onOpenCommandPalette, onOpenShiftModal }) => {
  const { darkMode, toggleTheme } = useTheme();
  const { settings, formatMoney } = useSettings();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);

  const fetchHeaderData = async () => {
    try {
      const [notifRes, shiftRes] = await Promise.all([
        api.get('/admin/notifications'),
        api.get('/cash/current')
      ]);

      if (notifRes.success) setNotifications(notifRes.notifications || []);
      if (shiftRes.success) setCurrentShift(shiftRes.shift);
    } catch {
      // Header fetch silencioso
    }
  };

  useEffect(() => {
    fetchHeaderData();
    const interval = setInterval(fetchHeaderData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <header className="h-16 px-6 bg-slate-900/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between sticky top-0 z-20">
      {/* Search / Command Palette Trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 transition-all text-xs group w-60 md:w-72 justify-between shadow-inner"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Buscar producto, cliente o folio...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-black/40 text-[10px] font-mono text-slate-400 border border-white/10">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>
      </div>

      {/* Center Live Date & Time for System & Receipts Control */}
      <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-black/40 border border-white/10 text-xs">
        <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span className="capitalize text-slate-300 font-medium">{formattedDate}</span>
        <span className="text-slate-600 font-mono">•</span>
        <span className="font-mono font-bold text-emerald-400 tracking-wider">{formattedTime}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Shift / Caja Status */}
        <button
          onClick={onOpenShiftModal}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium transition-all group"
          title="Ver estado de caja y turno"
        >
          <Wallet className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          <span>
            {currentShift
              ? `Caja Abierta: ${formatMoney(currentShift.expectedCash)}`
              : 'Abrir Turno de Caja'}
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
          title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-cyan-300" />}
        </button>

        {/* Notifications Center */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors relative"
            title="Notificaciones internas"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] text-white font-bold flex items-center justify-center animate-pulse">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Dropdown Notificaciones */}
          <AnimatePresence>
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl z-50 p-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-semibold text-white">Centro de Alertas</h4>
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        No hay alertas pendientes en este momento.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors flex gap-3 items-start"
                        >
                          {n.type === 'CRITICAL_STOCK' ? (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{n.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
