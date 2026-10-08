import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  LayoutGrid,
  Table as TableIcon,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  ArrowUpDown,
  Barcode,
  Save,
  Tag
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/Toast';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { TableSkeleton } from '../common/Skeleton';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  'Todas',
  'Material de Curación y Fijación',
  'Guantes y Protección',
  'Jeringas y Agujas',
  'Terapia IV y Soluciones',
  'Suturas y Cirugía Menor',
  'Antisepsia y Cuidado de Heridas',
  'Diagnóstico y Signos Vitales',
  'Toma de Muestras',
  'Vía Aérea y Oxígeno',
  'Inmovilización y Apoyo',
  'Higiene, Desechables y RPBI'
];

export const InventoryView = () => {
  const { settings, formatMoney } = useSettings();
  const { success, error, warning } = useToast();
  const { isAdmin } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Inline editing state: { [productId]: { salePrice, currentStock } }
  const [inlineEdits, setInlineEdits] = useState({});
  const [savingInlineId, setSavingInlineId] = useState(null);

  // Modal Crear / Editar Producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    category: 'Material de Curación y Fijación',
    purchasePrice: '',
    salePrice: '',
    currentStock: '',
    minStock: '5',
    unit: 'Pza',
    supplier: '',
    image: '',
    status: true
  });
  const [savingProduct, setSavingProduct] = useState(false);

  const fileInputRef = useRef(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err) {
      error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Ordenamiento
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Guardar edición inline
  const handleSaveInline = async (productId) => {
    const edit = inlineEdits[productId];
    if (!edit) return;

    try {
      setSavingInlineId(productId);
      const res = await api.patch(`/products/${productId}/inline`, edit);
      if (res.success) {
        setProducts(prev =>
          prev.map(p => (p.id === productId ? { ...p, ...edit } : p))
        );
        setInlineEdits(prev => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
        success('Precio y stock actualizados correctamente');
      }
    } catch (err) {
      error(err.message || 'Error al guardar cambio');
    } finally {
      setSavingInlineId(null);
    }
  };

  const handleInlineChange = (productId, field, value) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setInlineEdits(prev => ({
      ...prev,
      [productId]: {
        salePrice: prev[productId]?.salePrice !== undefined ? prev[productId].salePrice : product.salePrice,
        currentStock: prev[productId]?.currentStock !== undefined ? prev[productId].currentStock : product.currentStock,
        [field]: value === '' ? '' : Number(value)
      }
    }));
  };

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      description: '',
      category: 'Material de Curación y Fijación',
      purchasePrice: '',
      salePrice: '',
      currentStock: '10',
      minStock: '5',
      unit: 'Pza',
      supplier: '',
      image: '',
      status: true
    });
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      description: p.description || '',
      category: p.category || 'Gasas',
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      currentStock: p.currentStock,
      minStock: p.minStock,
      unit: p.unit || 'Pza',
      supplier: p.supplier || '',
      image: p.image || '',
      status: p.status
    });
    setIsModalOpen(true);
  };

  // Guardar formulario de producto
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.salePrice) {
      warning('Nombre, SKU y precio de venta son requeridos');
      return;
    }

    try {
      setSavingProduct(true);
      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct.id}`, formData);
        if (res.success) {
          success(`Producto "${res.product.name}" actualizado`);
          setIsModalOpen(false);
          fetchProducts();
        }
      } else {
        const res = await api.post('/products', formData);
        if (res.success) {
          success(`Producto "${res.product.name}" registrado con éxito`);
          setIsModalOpen(false);
          fetchProducts();
        }
      }
    } catch (err) {
      error(err.message || 'Error al guardar producto');
    } finally {
      setSavingProduct(false);
    }
  };

  // Eliminar producto
  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`¿Estás seguro de eliminar "${name}" del catálogo?`)) return;

    try {
      const res = await api.delete(`/products/${id}`);
      if (res.success) {
        success(res.message || 'Producto eliminado');
        fetchProducts();
      }
    } catch (err) {
      error(err.message || 'Error al eliminar producto');
    }
  };

  // Exportar a Excel
  const handleExportExcel = () => {
    try {
      const exportData = products.map((p) => ({
        'SKU': p.sku,
        'Código de Barras': p.barcode || '',
        'Nombre del Producto': p.name,
        'Categoría': p.category,
        'Precio Compra ($)': p.purchasePrice,
        'Precio Venta ($)': p.salePrice,
        'Stock Actual': p.currentStock,
        'Stock Mínimo': p.minStock,
        'Unidad': p.unit,
        'Proveedor': p.supplier || '',
        'Estado': p.status ? 'Activo' : 'Inactivo'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      XLSX.writeFile(wb, `CuraMed-Inventario-${new Date().toISOString().split('T')[0]}.xlsx`);
      success('Inventario exportado a Excel exitosamente');
    } catch (err) {
      error('Error al exportar inventario');
    }
  };

  // Importar desde Excel / CSV
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rows.length === 0) {
          warning('El archivo seleccionado está vacío.');
          return;
        }

        const itemsToImport = rows.map((r) => ({
          name: r['Nombre del Producto'] || r['Nombre'] || r['name'],
          sku: r['SKU'] || r['sku'],
          barcode: r['Código de Barras'] || r['CodigoBarras'] || r['barcode'],
          category: r['Categoría'] || r['Categoria'] || 'Varios',
          purchasePrice: r['Precio Compra ($)'] || r['PrecioCompra'] || 0,
          salePrice: r['Precio Venta ($)'] || r['PrecioVenta'] || 0,
          currentStock: r['Stock Actual'] || r['Stock'] || 0,
          minStock: r['Stock Mínimo'] || 5,
          unit: r['Unidad'] || 'Pza',
          supplier: r['Proveedor'] || ''
        }));

        const res = await api.post('/products/batch-import', { items: itemsToImport });
        if (res.success) {
          success(res.message);
          fetchProducts();
        }
      } catch (err) {
        error('Error al procesar archivo de Excel');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Filtrado y Ordenamiento
  const processedProducts = products
    .filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery)) ||
        (p.supplier && p.supplier.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'Todas' || p.category === selectedCategory;

      const matchLow = filterLowStock ? p.currentStock <= p.minStock : true;

      return matchSearch && matchCategory && matchLow;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <span>Inventario y Catálogo Médico</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestión completa de stock, códigos de barras y precios
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Input oculto para importación */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          {isAdmin && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors"
              title="Importar catálogo desde archivo Excel o CSV"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Importar Excel</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors"
            title="Descargar catálogo en formato Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Producto</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters and View Toggle Bar */}
      <GlassCard className="p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU, código de barras..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Categoría Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-slate-900 text-white">
                {c === 'Todas' ? 'Todas las Categorías' : c}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle Button */}
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              filterLowStock
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Stock Bajo</span>
          </button>
        </div>

        {/* View Mode Toggle: Table or Grid */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10 self-end md:self-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'table'
                ? 'bg-white/10 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Vista Tabla"
          >
            <TableIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-white/10 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Vista Tarjetas (Grid)"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>

      {/* Main Content: Table or Grid */}
      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : processedProducts.length === 0 ? (
        <GlassCard className="p-12 text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-white">No hay productos que coincidan</p>
          <p className="text-xs text-slate-500 mt-1">Modifica los filtros o agrega un nuevo producto al catálogo.</p>
        </GlassCard>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW WITH ROW HOVER GLOW AND INLINE EDITING */
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-white/10 text-slate-400 uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1.5">
                      <span>Producto</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1.5">
                      <span>Categoría</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('sku')}>
                    <div className="flex items-center gap-1.5">
                      <span>SKU / Barras</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white text-right" onClick={() => handleSort('purchasePrice')}>
                    <span>P. Compra</span>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white text-right" onClick={() => handleSort('salePrice')}>
                    <span>P. Venta (Inline)</span>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-white text-center" onClick={() => handleSort('currentStock')}>
                    <span>Stock Actual (Inline)</span>
                  </th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {processedProducts.map((p) => {
                  const isLow = p.currentStock <= p.minStock;
                  const isEditingInline = inlineEdits[p.id] !== undefined;

                  const currentSalePrice =
                    inlineEdits[p.id]?.salePrice !== undefined
                      ? inlineEdits[p.id].salePrice
                      : p.salePrice;

                  const currentStockVal =
                    inlineEdits[p.id]?.currentStock !== undefined
                      ? inlineEdits[p.id].currentStock
                      : p.currentStock;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-emerald-500/[0.04] transition-colors group"
                    >
                      {/* Producto */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Tag className="w-4 h-4 text-emerald-400 opacity-50" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                              {p.supplier || 'Proveedor estándar'} • Unidad: {p.unit}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[11px] font-medium">
                          {p.category}
                        </span>
                      </td>

                      {/* SKU / Código de barras */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-emerald-400 font-semibold block">{p.sku}</span>
                        <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                          <Barcode className="w-3 h-3" /> {p.barcode || 'Sin código'}
                        </span>
                      </td>

                      {/* P. Compra */}
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatMoney(p.purchasePrice)}
                      </td>

                      {/* P. Venta (Inline Editable) */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="any"
                            value={currentSalePrice}
                            onChange={(e) => handleInlineChange(p.id, 'salePrice', e.target.value)}
                            className="w-20 px-2 py-1 text-xs font-mono font-bold text-right rounded-lg bg-black/40 border border-white/10 focus:border-emerald-500 focus:outline-none text-emerald-400"
                          />
                        </div>
                      </td>

                      {/* Stock Actual (Inline Editable) */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            value={currentStockVal}
                            onChange={(e) => handleInlineChange(p.id, 'currentStock', e.target.value)}
                            className={`w-16 px-2 py-1 text-xs font-mono font-bold text-center rounded-lg bg-black/40 border focus:outline-none ${
                              isLow
                                ? 'border-rose-500/50 text-rose-400 focus:border-rose-400'
                                : 'border-white/10 text-white focus:border-emerald-500'
                            }`}
                          />
                          <span className="text-[11px] text-slate-400 font-mono">
                            / mín {p.minStock}
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        <Badge variant={p.status ? (isLow ? 'amber' : 'emerald') : 'slate'} pulse={isLow}>
                          {p.status ? (isLow ? 'Bajo' : 'Óptimo') : 'Inactivo'}
                        </Badge>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditingInline && (
                            <button
                              onClick={() => handleSaveInline(p.id)}
                              disabled={savingInlineId === p.id}
                              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
                              title="Guardar edición rápida"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Editar completo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ) : (
        /* GRID VIEW (CARDS CON IMAGEN) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {processedProducts.map((p) => {
            const isLow = p.currentStock <= p.minStock;

            return (
              <GlassCard key={p.id} hoverGlow className="p-4 flex flex-col justify-between">
                <div>
                  <div className="w-full h-36 rounded-xl bg-slate-800 overflow-hidden relative mb-3">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-emerald-400 opacity-40">
                        <Tag className="w-10 h-10" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white border border-white/10">
                      {p.category}
                    </span>
                    <Badge
                      variant={isLow ? 'rose' : 'emerald'}
                      pulse={isLow}
                      className="absolute top-2 right-2"
                    >
                      {isLow ? 'Stock Bajo' : 'Disponible'}
                    </Badge>
                  </div>

                  <h4 className="text-sm font-semibold text-white leading-snug">{p.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    SKU: {p.sku} {p.barcode ? `• Barcode: ${p.barcode}` : ''}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {formatMoney(p.salePrice)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Stock: {p.currentStock} {p.unit} (mín: {p.minStock})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Producto */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Editar Producto Médico' : 'Registrar Nuevo Producto'}
        subtitle="Complete los datos para el catálogo de material de curación"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Gasas Estériles 10x10 cm c/10"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                SKU (Identificador Único) *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. GAS-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Código de barras */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Código de Barras (EAN-13 / Scanner)
              </label>
              <input
                type="text"
                placeholder="Ej. 7501000100018"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Categoría *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.filter((c) => c !== 'Todas').map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Unidad de Medida */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Unidad de Medida
              </label>
              <input
                type="text"
                placeholder="Pza, Caja, Paquete, Frasco, Rollo"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Precio Compra */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Precio de Compra / Costo ($)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Precio Venta */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Precio de Venta al Público ($) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/40 border border-white/10 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Stock Actual */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Stock Actual
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Stock Mínimo */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Stock Mínimo (Alerta)
              </label>
              <input
                type="number"
                placeholder="5"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Proveedor */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Laboratorio / Proveedor
              </label>
              <input
                type="text"
                placeholder="Ej. Becton Dickinson, 3M, Pisa"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* URL Imagen */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                URL de Imagen
              </label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Descripción */}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Descripción / Especificaciones Médicas
              </label>
              <textarea
                rows={2}
                placeholder="Detalles sobre esterilización, medidas y material..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
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
              disabled={savingProduct}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{savingProduct ? 'Guardando...' : 'Guardar Producto'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
