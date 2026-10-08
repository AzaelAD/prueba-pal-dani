import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  ShoppingBag,
  Edit2,
  Trash2,
  Save,
  Clock,
  CheckCircle2,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { api } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/Toast';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { TableSkeleton } from '../common/Skeleton';
import { useAuth } from '../../context/AuthContext';

export const CustomersView = () => {
  const { formatMoney } = useSettings();
  const { success, error, warning } = useToast();
  const { isAdmin } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Cliente (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    rfc: '',
    address: '',
    creditBalance: '0',
    notes: ''
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Modal Detalle / Historial de Compras
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers');
      if (res.success) {
        setCustomers(res.customers || []);
      }
    } catch (err) {
      error('Error al cargar directorio de clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      rfc: '',
      address: '',
      creditBalance: '0',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      rfc: c.rfc || '',
      address: c.address || '',
      creditBalance: c.creditBalance || '0',
      notes: c.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      warning('El nombre del cliente es obligatorio');
      return;
    }

    try {
      setSavingCustomer(true);
      if (editingCustomer) {
        const res = await api.put(`/customers/${editingCustomer.id}`, formData);
        if (res.success) {
          success(`Cliente "${res.customer.name}" actualizado`);
          setIsModalOpen(false);
          fetchCustomers();
        }
      } else {
        const res = await api.post('/customers', formData);
        if (res.success) {
          success(`Cliente "${res.customer.name}" registrado`);
          setIsModalOpen(false);
          fetchCustomers();
        }
      }
    } catch (err) {
      error(err.message || 'Error al guardar cliente');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (id, name) => {
    if (!confirm(`¿Deseas eliminar al cliente "${name}"?`)) return;

    try {
      const res = await api.delete(`/customers/${id}`);
      if (res.success) {
        success('Cliente eliminado');
        fetchCustomers();
      }
    } catch (err) {
      error(err.message || 'No se puede eliminar el cliente');
    }
  };

  // Ver historial de compras
  const handleViewHistory = async (c) => {
    try {
      setHistoryLoading(true);
      setIsDetailModalOpen(true);
      const res = await api.get(`/customers/${c.id}`);
      if (res.success) {
        setSelectedCustomerDetail(res.customer);
      }
    } catch (err) {
      error('Error al cargar historial del cliente');
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.rfc && c.rfc.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Directorio de Clientes y Médicos</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro de clínicas, doctores particulares y saldo de crédito
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <GlassCard className="p-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre, teléfono, RFC o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </GlassCard>

      {/* Customers List Cards */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filteredCustomers.length === 0 ? (
        <GlassCard className="p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-white">No hay clientes registrados</p>
          <p className="text-xs text-slate-500 mt-1">Registra clínicas o doctores para vincular compras y créditos.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => (
            <GlassCard key={c.id} hoverGlow className="p-5 flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                        {c.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        RFC: {c.rfc || 'XEXX010101000'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    {c._count?.sales || 0} compras
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-300 mt-3 pt-3 border-t border-white/5">
                  {c.phone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px] font-mono">{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-[11px] truncate">{c.email}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] truncate">{c.address}</span>
                    </div>
                  )}
                  {c.notes && (
                    <div className="mt-2 p-2 rounded-xl bg-black/30 border border-white/5 text-[11px] text-slate-400 italic">
                      "{c.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions & Balance */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">
                    Saldo a Favor / Crédito
                  </span>
                  <span className={`text-sm font-bold font-mono ${c.creditBalance > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {formatMoney(c.creditBalance)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleViewHistory(c)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1"
                    title="Ver Historial de Compras"
                  >
                    <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Historial</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteCustomer(c.id, c.name)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Cliente */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Editar Cliente' : 'Registrar Cliente'}
        subtitle="Datos de contacto y condiciones comerciales"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitCustomer} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Nombre Completo / Razón Social *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Clínica Santa María o Dr. Alejandro Morales"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                RFC (Facturación)
              </label>
              <input
                type="text"
                placeholder="CSM980512KL1"
                value={formData.rfc}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                placeholder="55-1234-5678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              placeholder="contacto@clinica.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Dirección de Entrega
            </label>
            <input
              type="text"
              placeholder="Calle, Número, Colonia, Municipio"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Saldo a Favor / Límite de Crédito ($)
            </label>
            <input
              type="number"
              step="any"
              value={formData.creditBalance}
              onChange={(e) => setFormData({ ...formData, creditBalance: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Notas Internas
            </label>
            <textarea
              rows={2}
              placeholder="Preferencias de entrega, material recurrente..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingCustomer}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{savingCustomer ? 'Guardando...' : 'Guardar Cliente'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Historial de Compras */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedCustomerDetail ? `Historial: ${selectedCustomerDetail.name}` : 'Historial de Compras'}
        subtitle={selectedCustomerDetail ? `Total Histórico: ${formatMoney(selectedCustomerDetail.totalSpent || 0)} (${selectedCustomerDetail.totalOrders} órdenes)` : ''}
        maxWidth="max-w-2xl"
      >
        {historyLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : !selectedCustomerDetail?.sales || selectedCustomerDetail.sales.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Este cliente no tiene compras registradas en el historial.
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {selectedCustomerDetail.sales.map((sale) => (
              <div
                key={sale.id}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {sale.folio}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(sale.createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white">
                      {formatMoney(sale.total)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">
                      {sale.paymentMethod}
                    </span>
                  </div>
                </div>

                {/* Items breakdown */}
                <div className="text-[11px] text-slate-400 pl-2 border-l border-white/10 space-y-0.5">
                  {sale.items?.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>• {it.quantity}x {it.product?.name || 'Material médico'}</span>
                      <span className="font-mono">{formatMoney(it.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
