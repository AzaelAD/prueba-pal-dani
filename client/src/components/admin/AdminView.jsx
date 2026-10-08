import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  Settings,
  History,
  AlertOctagon,
  Database,
  Lock,
  Plus,
  Save,
  CheckCircle2,
  XCircle,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Key,
  Trash2,
  Building,
  Receipt
} from 'lucide-react';
import { api } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/Toast';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

export const AdminView = () => {
  const { settings, loadSettings, formatMoney } = useSettings();
  const { success, error, warning } = useToast();

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'settings' | 'audit' | 'backup'

  // Usuarios
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cajero',
    active: true
  });

  // Ajustes de negocio
  const [businessSettings, setBusinessSettings] = useState({ ...settings });
  const [savingSettings, setSavingSettings] = useState(false);

  // Auditoría y Logs
  const [logs, setLogs] = useState([]);
  const [criticalAudit, setCriticalAudit] = useState({ criticalLogs: [], cancelledSales: [] });
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Respaldo
  const [isBackingUp, setIsBackingUp] = useState(false);
  const restoreFileRef = useRef(null);

  // Cargar datos
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get('/admin/users');
      if (res.success) setUsers(res.users || []);
    } catch (err) {
      error('Error al listar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const [logsRes, critRes] = await Promise.all([
        api.get('/admin/logs'),
        api.get('/admin/critical-audit')
      ]);
      if (logsRes.success) setLogs(logsRes.logs || []);
      if (critRes.success) setCriticalAudit(critRes);
    } catch (err) {
      error('Error al cargar bitácora');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'settings') setBusinessSettings({ ...settings });
    if (activeTab === 'audit') fetchLogs();
  }, [activeTab]);

  // Guardar usuario
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const res = await api.put(`/admin/users/${editingUser.id}`, userFormData);
        if (res.success) {
          success(`Usuario "${res.user.name}" actualizado`);
          setIsUserModalOpen(false);
          fetchUsers();
        }
      } else {
        const res = await api.post('/admin/users', userFormData);
        if (res.success) {
          success(`Usuario "${res.user.name}" creado`);
          setIsUserModalOpen(false);
          fetchUsers();
        }
      }
    } catch (err) {
      error(err.message || 'Error al guardar usuario');
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const res = await api.put(`/admin/users/${user.id}`, { active: !user.active });
      if (res.success) {
        success(`Usuario ${user.active ? 'bloqueado' : 'reactivado'}`);
        fetchUsers();
      }
    } catch (err) {
      error('Error al actualizar estado del usuario');
    }
  };

  // Guardar configuración de negocio
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await api.put('/admin/settings', businessSettings);
      if (res.success) {
        success('Configuraciones guardadas exitosamente');
        loadSettings();
      }
    } catch (err) {
      error('Error al actualizar configuraciones');
    } finally {
      setSavingSettings(false);
    }
  };

  // Descargar respaldo JSON
  const handleDownloadBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await api.get('/admin/backup');
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CuraMed-Respaldo-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      success('Respaldo de base de datos descargado');
    } catch (err) {
      error('Error al generar respaldo');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restaurar respaldo desde JSON
  const handleRestoreFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        if (!json.data) throw new Error('Formato de archivo inválido');

        if (!confirm('¿Estás seguro de restaurar los datos? Se sincronizarán los registros existentes.')) return;

        const res = await api.post('/admin/restore', { data: json.data });
        if (res.success) {
          success(res.message);
        }
      } catch (err) {
        error('Error al restaurar archivo: ' + err.message);
      } finally {
        if (restoreFileRef.current) restoreFileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Panel de Administración y Seguridad</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Control de usuarios, datos fiscales, bitácora de auditoría y copias de seguridad
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto">
          {[
            { id: 'users', label: 'Usuarios y Roles', icon: Users },
            { id: 'settings', label: 'Configuración Fiscal', icon: Settings },
            { id: 'audit', label: 'Auditoría & Logs', icon: History },
            { id: 'backup', label: 'Respaldo BD', icon: Database },
          ].map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSel
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: USUARIOS Y ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingUser(null);
                setUserFormData({
                  name: '',
                  email: '',
                  password: '',
                  role: 'cajero',
                  active: true
                });
                setIsUserModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Usuario</span>
            </button>
          </div>

          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-white/10 text-slate-400 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Correo</th>
                    <th className="py-3 px-4">Rol Asignado</th>
                    <th className="py-3 px-4">Ventas Hechas</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80'}
                            alt={u.name}
                            className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10"
                          />
                          <span className="font-semibold text-white">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant={u.role === 'admin' ? 'purple' : 'cyan'}>
                          {u.role === 'admin' ? 'Administrador' : 'Cajero'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {u._count?.sales || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={u.active ? 'emerald' : 'rose'}>
                          {u.active ? 'Activo' : 'Bloqueado'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setUserFormData({
                                name: u.name,
                                email: u.email,
                                password: '',
                                role: u.role,
                                active: u.active
                              });
                              setIsUserModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                            title="Editar usuario"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.active
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                            }`}
                            title={u.active ? 'Bloquear acceso' : 'Desbloquear acceso'}
                          >
                            {u.active ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 2: CONFIGURACIÓN FISCAL Y DE NEGOCIO */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              <span>Datos Generales del Establecimiento</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Nombre Comercial del Negocio *
                </label>
                <input
                  type="text"
                  required
                  value={businessSettings.business_name || ''}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, business_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  RFC Fiscal *
                </label>
                <input
                  type="text"
                  required
                  value={businessSettings.business_rfc || ''}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, business_rfc: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Teléfono de Atención
                </label>
                <input
                  type="text"
                  value={businessSettings.business_phone || ''}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, business_phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Dirección Física Completa
                </label>
                <input
                  type="text"
                  value={businessSettings.business_address || ''}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, business_address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Leyenda / Pie de Ticket de Venta
                </label>
                <textarea
                  rows={2}
                  value={businessSettings.ticket_footer || ''}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, ticket_footer: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span>Impuestos y Parámetros de Cobro</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Tasa de Impuesto (IVA %)
                </label>
                <input
                  type="number"
                  step="any"
                  value={businessSettings.tax_rate || '16'}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, tax_rate: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Calcular y Desglosar IVA en POS
                </label>
                <select
                  value={businessSettings.apply_tax || 'true'}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, apply_tax: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="true" className="bg-slate-900">Sí (Aplicar 16% IVA)</option>
                  <option value="false" className="bg-slate-900">No (Precios netos directos)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Símbolo de Moneda
                </label>
                <input
                  type="text"
                  value={businessSettings.currency || 'MXN'}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, currency: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </GlassCard>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Guardando...' : 'Guardar Configuraciones'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: AUDITORÍA Y LOGS CRÍTICOS */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Alertas Críticas (Ventas Canceladas) */}
          {criticalAudit.cancelledSales?.length > 0 && (
            <GlassCard className="p-5 border-rose-500/20">
              <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2 text-rose-400">
                <AlertOctagon className="w-4 h-4" />
                <span>Auditoría de Ventas Canceladas Recientes</span>
              </h4>
              <div className="space-y-2 mt-3">
                {criticalAudit.cancelledSales.map((cs) => (
                  <div key={cs.id} className="p-3 rounded-xl bg-white/5 border border-rose-500/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-rose-400">{cs.folio}</span>
                      <span className="text-slate-400 ml-2">por {formatMoney(cs.total)}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Canceló: {cs.user?.name} • Motivo: <span className="italic text-slate-300">{cs.cancelReason}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(cs.updatedAt).toLocaleString('es-MX')}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Activity Logs Table */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Bitácora de Actividad General</h4>
              <button onClick={fetchLogs} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualizar</span>
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-white/10 text-slate-400 uppercase font-mono text-[11px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Fecha y Hora</th>
                    <th className="py-2.5 px-4">Responsable</th>
                    <th className="py-2.5 px-4">Acción</th>
                    <th className="py-2.5 px-4">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString('es-MX')}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-white whitespace-nowrap">
                        {l.userName}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 font-mono text-[10px] text-cyan-300 border border-white/10">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        {l.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 4: RESPALDO Y RESTAURACIÓN BD */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Descargar Copia de Seguridad</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Exporta un archivo JSON completo que contiene todos los productos, ventas, inventario, clientes, cortes de caja y configuraciones de CuraMed.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              disabled={isBackingUp}
              className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-98"
            >
              {isBackingUp ? 'Generando archivo...' : 'Exportar y Descargar Respaldo'}
            </button>
          </GlassCard>

          <GlassCard className="p-6 flex flex-col justify-between border-cyan-500/20">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Restaurar Base de Datos</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Restaura el sistema a partir de un archivo JSON previamente exportado. Sincroniza y preserva la integridad de los identificadores.
              </p>
            </div>

            <input
              type="file"
              ref={restoreFileRef}
              onChange={handleRestoreFile}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => restoreFileRef.current?.click()}
              className="mt-6 w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition-colors"
            >
              Seleccionar Archivo de Respaldo (.json)
            </button>
          </GlassCard>
        </div>
      )}

      {/* Modal Crear / Editar Usuario */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        subtitle="Asignación de credenciales y rol de acceso"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitUser} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Correo Electrónico *</label>
            <input
              type="email"
              required
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              {editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
            </label>
            <input
              type="password"
              required={!editingUser}
              placeholder="••••••••"
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Rol de Acceso *</label>
            <select
              value={userFormData.role}
              onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="cajero" className="bg-slate-900">Cajero (Punto de Venta e Inventario)</option>
              <option value="admin" className="bg-slate-900">Administrador (Acceso Total)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs"
            >
              Guardar Usuario
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
