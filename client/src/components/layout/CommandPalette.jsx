import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  ShieldCheck,
  PlusCircle,
  Wallet,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';

export const CommandPalette = ({ isOpen, onClose, onNavigate, onAddToCart }) => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { formatMoney } = useSettings();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(true); // toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Buscar productos cuando escribe
  useEffect(() => {
    if (!query.trim() || !isOpen) {
      setProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/products', { search: query });
        if (res.success) {
          setProducts((res.products || []).slice(0, 6));
        }
      } catch {
        // Silencioso
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const defaultActions = [
    { id: 'pos', title: 'Ir al Punto de Venta (POS)', icon: ShoppingCart, category: 'Navegación', action: () => { onNavigate('pos'); onClose(); } },
    { id: 'inventory', title: 'Ver Catálogo e Inventario', icon: Package, category: 'Navegación', action: () => { onNavigate('inventory'); onClose(); } },
    { id: 'customers', title: 'Consultar Directorio de Clientes', icon: Users, category: 'Navegación', action: () => { onNavigate('customers'); onClose(); } },
    { id: 'reports', title: 'Reportes y Cortes de Caja', icon: BarChart3, category: 'Navegación', action: () => { onNavigate('reports'); onClose(); } },
    { id: 'admin', title: 'Panel de Administración y Ajustes', icon: ShieldCheck, category: 'Navegación', action: () => { onNavigate('admin'); onClose(); } },
  ];

  const filteredActions = defaultActions.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl shadow-black/70 overflow-hidden z-10"
          >
            {/* Input Search */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
              <Search className="w-5 h-5 text-emerald-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Escribe un comando, producto, código de barras..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
              />
              <span className="text-[10px] font-mono uppercase px-2 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/5">
                ESC salir
              </span>
            </div>

            {/* List Results */}
            <div className="p-3 max-h-96 overflow-y-auto space-y-4">
              {/* Productos coincidentes */}
              {products.length > 0 && (
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 px-3 py-1">
                    Productos Encontrados ({products.length})
                  </p>
                  <div className="space-y-1">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (onAddToCart) onAddToCart(p);
                          onNavigate('pos');
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white group-hover:text-emerald-300">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              SKU: {p.sku} • Stock: {p.currentStock} {p.unit}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {formatMoney(p.salePrice)}
                          </span>
                          <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-medium">
                            + Al Carrito
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones y navegación */}
              {filteredActions.length > 0 && (
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 px-3 py-1">
                    Acciones Rápidas
                  </p>
                  <div className="space-y-1">
                    {filteredActions.map((act) => {
                      const Icon = act.icon;
                      return (
                        <button
                          key={act.id}
                          onClick={act.action}
                          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 text-left transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 group-hover:text-emerald-400">
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                              {act.title}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {products.length === 0 && filteredActions.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No se encontraron comandos o productos para "{query}"
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
