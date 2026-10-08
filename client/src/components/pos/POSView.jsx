import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Percent,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  User,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Tag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/Toast';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../common/Modal';
import { TicketModal } from './TicketModal';

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

export const POSView = ({ initialProductToAdd }) => {
  const { settings, formatMoney } = useSettings();
  const { success, error, warning } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Carrito de compras
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customersList, setCustomersList] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Descuento global
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' | 'percent'
  const [discountValue, setDiscountValue] = useState(0);

  // Modal de cobro
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [amountPaid, setAmountPaid] = useState('');
  const [processingSale, setProcessingSale] = useState(false);

  // Ticket Modal
  const [completedSale, setCompletedSale] = useState(null);
  const [isTicketOpen, setIsTicketOpen] = useState(false);

  const searchInputRef = useRef(null);

  // Cargar productos y clientes
  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const [prodRes, custRes] = await Promise.all([
        api.get('/products', { status: 'true' }),
        api.get('/customers')
      ]);

      if (prodRes.success) setProducts(prodRes.products || []);
      if (custRes.success) setCustomersList(custRes.customers || []);
    } catch (err) {
      error('Error al cargar catálogo de productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Si se envió un producto desde Command Palette
  useEffect(() => {
    if (initialProductToAdd) {
      addToCart(initialProductToAdd);
    }
  }, [initialProductToAdd]);

  // Manejo de lector de código de barras
  const handleBarcodeSubmit = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchQuery.trim();
      if (!code) return;

      try {
        const res = await api.get(`/products/barcode/${code}`);
        if (res.success && res.product) {
          addToCart(res.product);
          setSearchQuery('');
          success(`Agregado: ${res.product.name}`);
        } else {
          // Búsqueda regular por texto ya filtra la lista
        }
      } catch {
        // Continuar con filtrado normal
      }
    }
  };

  const addToCart = (product) => {
    if (product.currentStock <= 0) {
      warning(`"${product.name}" está agotado en inventario.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          warning(`No hay más stock disponible para "${product.name}" (Máximo: ${product.currentStock})`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          unitPrice: product.salePrice,
          purchasePrice: product.purchasePrice,
          stock: product.currentStock,
          image: product.image,
          quantity: 1,
          discount: 0
        }
      ];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.stock) {
              warning(`Stock máximo alcanzado para este producto (${item.stock})`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const setItemDiscount = (productId, discAmount) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, discount: Math.max(0, parseFloat(discAmount) || 0) }
          : item
      )
    );
  };

  // Cálculos de Totales
  const subtotal = cart.reduce((acc, item) => {
    const lineTotal = item.unitPrice * item.quantity - (item.discount || 0);
    return acc + Math.max(0, lineTotal);
  }, 0);

  const calculatedGlobalDiscount =
    discountType === 'percent'
      ? subtotal * (Math.min(100, Math.max(0, discountValue)) / 100)
      : Math.min(subtotal, Math.max(0, discountValue));

  const taxableAmount = Math.max(0, subtotal - calculatedGlobalDiscount);
  const taxRate = parseFloat(settings.tax_rate) || 16;
  const applyTax = settings.apply_tax === 'true';
  const tax = applyTax ? taxableAmount * (taxRate / 100) : 0;
  const total = taxableAmount + tax;

  const numericPaid = parseFloat(amountPaid) || (paymentMethod !== 'Efectivo' ? total : 0);
  const change = Math.max(0, numericPaid - total);

  // Abrir modal de pago y prellenar con el monto exacto
  const handleOpenPay = () => {
    if (cart.length === 0) {
      warning('El carrito está vacío. Agregue productos antes de cobrar.');
      return;
    }
    setAmountPaid(total.toFixed(2));
    setIsPayModalOpen(true);
  };

  // Procesar venta
  const handleExecuteSale = async () => {
    if (paymentMethod === 'Efectivo' && numericPaid < total) {
      warning(`Monto insuficiente. Faltan ${formatMoney(total - numericPaid)} para completar el pago.`);
      return;
    }

    try {
      setProcessingSale(true);

      const salePayload = {
        customerId: selectedCustomer ? selectedCustomer.id : null,
        items: cart.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount || 0
        })),
        discount: calculatedGlobalDiscount,
        paymentMethod,
        amountPaid: numericPaid,
        notes: ''
      };

      const res = await api.post('/sales', salePayload);

      if (res.success && res.sale) {
        // Disparar confetti de éxito
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#ffffff']
        });

        success(`¡Venta ${res.sale.folio} completada exitosamente!`);
        setCompletedSale(res.sale);
        setIsPayModalOpen(false);
        setCart([]);
        setSelectedCustomer(null);
        setDiscountValue(0);
        setIsTicketOpen(true);

        // Actualizar catálogo local de stock
        fetchCatalog();
      }
    } catch (err) {
      error(err.message || 'Error al procesar la venta');
    } finally {
      setProcessingSale(false);
    }
  };

  // Filtrado de productos
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));

    const matchesCategory =
      selectedCategory === 'Todas' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col gap-5">
      {/* Top Bar: Categorías y Buscador con soporte de escáner */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Buscador Rápido con Icono de Barcode */}
        <div className="relative flex-1 max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-emerald-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar por nombre, SKU o escanear código de barras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleBarcodeSubmit}
            className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 backdrop-blur-xl shadow-inner transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 pointer-events-none">
            <Barcode className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-mono text-slate-400 uppercase">Enter</span>
          </div>
        </div>

        {/* Categorías Chip Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-2xl no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all
                ${selectedCategory === cat
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/20 font-semibold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Products Catalog (Left) & Shopping Cart Drawer (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Products Grid (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <ShoppingBag className="w-12 h-12 text-slate-600 mb-3" />
                <p className="text-sm font-medium">No se encontraron productos médicos</p>
                <p className="text-xs text-slate-500 mt-1">Prueba cambiando la categoría o término de búsqueda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
                {filteredProducts.map((p) => {
                  const inCartItem = cart.find((it) => it.productId === p.id);
                  const isOutOfStock = p.currentStock <= 0;

                  return (
                    <motion.div
                      key={p.id}
                      whileHover={!isOutOfStock ? { y: -3 } : undefined}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      className={`
                        relative rounded-2xl p-3 flex flex-col justify-between select-none transition-all
                        border backdrop-blur-xl group cursor-pointer
                        ${isOutOfStock
                          ? 'bg-slate-900/40 border-rose-500/20 opacity-60 cursor-not-allowed'
                          : 'bg-slate-900/70 border-white/10 hover:border-emerald-500/40 hover:shadow-glow-emerald'
                        }
                      `}
                    >
                      {/* Product Image / Icon */}
                      <div className="w-full h-28 rounded-xl bg-slate-800/80 overflow-hidden relative mb-2.5">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-emerald-400">
                            <Tag className="w-8 h-8 opacity-40" />
                          </div>
                        )}

                        {/* Category Badge */}
                        <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-slate-200 border border-white/10">
                          {p.category}
                        </span>

                        {/* In Cart Indicator */}
                        {inCartItem && (
                          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white font-mono text-xs font-bold flex items-center justify-center shadow-lg">
                            {inCartItem.quantity}
                          </span>
                        )}

                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                              Agotado
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-emerald-300 transition-colors">
                          {p.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                          SKU: {p.sku}
                        </p>
                      </div>

                      {/* Price & Stock */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                        <div>
                          <span className="text-sm font-bold font-mono text-emerald-400">
                            {formatMoney(p.salePrice)}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-sans">
                            por {p.unit}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                          p.currentStock <= p.minStock
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-white/5 text-slate-300'
                        }`}>
                          Disp: {p.currentStock}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Shopping Cart Drawer (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full bg-slate-900/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl overflow-hidden justify-between">
          {/* Cart Header */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white text-base">Orden Actual</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Customer Selector */}
            <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">
                    {selectedCustomer ? selectedCustomer.name : 'Público General'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {selectedCustomer ? `RFC: ${selectedCustomer.rfc || 'Sin RFC'}` : 'Venta de mostrador'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors shrink-0"
              >
                {selectedCustomer ? 'Cambiar' : '+ Asignar'}
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto my-3 pr-1 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShoppingBag className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-xs font-medium">El carrito está vacío</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Selecciona productos del catálogo para comenzar</p>
              </div>
            ) : (
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate flex-1">
                        <h5 className="text-xs font-semibold text-white truncate">
                          {item.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {formatMoney(item.unitPrice)} / {item.unit}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-white">
                        {formatMoney((item.unitPrice * item.quantity) - (item.discount || 0))}
                      </span>
                    </div>

                    {/* Quantity controls + delete */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-xs text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Descuento por item */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="Desc $"
                          value={item.discount || ''}
                          onChange={(e) => setItemDiscount(item.productId, e.target.value)}
                          className="w-16 px-2 py-0.5 text-[11px] font-mono rounded-lg bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-right"
                        />
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Totals & Cobrar Button */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            {/* Descuento global */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                Descuento Global:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="0"
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-xs font-mono rounded-lg bg-black/40 border border-white/10 text-white text-right focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => setDiscountType(discountType === 'fixed' ? 'percent' : 'fixed')}
                  className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-mono font-bold text-cyan-400 hover:bg-white/15"
                >
                  {discountType === 'fixed' ? '$' : '%'}
                </button>
              </div>
            </div>

            {/* Subtotal, IVA, Total */}
            <div className="space-y-1 text-xs pt-1">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200">{formatMoney(subtotal)}</span>
              </div>
              {calculatedGlobalDiscount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Descuento:</span>
                  <span className="font-mono">-{formatMoney(calculatedGlobalDiscount)}</span>
                </div>
              )}
              {applyTax && (
                <div className="flex justify-between text-slate-400">
                  <span>IVA ({taxRate}%):</span>
                  <span className="font-mono text-slate-200">{formatMoney(tax)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                <span className="text-sm font-semibold text-white">TOTAL:</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                  {formatMoney(total)}
                </span>
              </div>
            </div>

            {/* Prominent Cobrar Button */}
            <button
              disabled={cart.length === 0}
              onClick={handleOpenPay}
              className={`
                w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300
                flex items-center justify-center gap-2 mt-2 select-none shadow-xl
                ${cart.length > 0
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25 active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                }
              `}
            >
              <Sparkles className="w-5 h-5 fill-current" />
              <span>COBRAR ({formatMoney(total)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pay Modal (Slide-Up Spring Modal) */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Procesar Cobro"
        subtitle={`Total a Pagar: ${formatMoney(total)}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          {/* Métodos de Pago */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-2">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
                { id: 'Tarjeta', label: 'Tarjeta', icon: CreditCard },
                { id: 'Transferencia', label: 'Transferencia', icon: ArrowRightLeft },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPaymentMethod(m.id);
                      if (m.id !== 'Efectivo') {
                        setAmountPaid(total.toFixed(2));
                      }
                    }}
                    className={`
                      p-3 rounded-2xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all
                      ${isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Si es Efectivo: Monto Recibido y Botones de Denominación Rápida */}
          {paymentMethod === 'Efectivo' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Monto Recibido ($)
                </label>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full text-2xl font-mono font-bold px-4 py-3 rounded-2xl bg-black/50 border border-white/15 text-emerald-400 text-center focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Botones de Denominación Rápida */}
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setAmountPaid(total.toFixed(2))}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300"
                >
                  Exacto
                </button>
                {[50, 100, 200, 500, 1000].map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => setAmountPaid(String(bill))}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300"
                  >
                    ${bill}
                  </button>
                ))}
              </div>

              {/* Cambio Calculado */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Cambio a Entregar:</span>
                <span className={`text-2xl font-bold font-mono ${numericPaid >= total ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatMoney(change)}
                </span>
              </div>
            </div>
          )}

          {/* Confirmar Cobro */}
          <button
            disabled={processingSale || (paymentMethod === 'Efectivo' && numericPaid < total)}
            onClick={handleExecuteSale}
            className={`
              w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl
              flex items-center justify-center gap-2
              ${numericPaid >= total || paymentMethod !== 'Efectivo'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {processingSale ? (
              <span className="animate-spin text-lg">◌</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>CONFIRMAR VENTA ({formatMoney(total)})</span>
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* Customer Selection Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Seleccionar Cliente"
        subtitle="Asignar venta a un cliente registrado"
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <button
            onClick={() => {
              setSelectedCustomer(null);
              setShowCustomerModal(false);
            }}
            className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-left text-xs font-medium text-slate-300 transition-colors flex items-center justify-between"
          >
            <span>Público General (Sin cliente asignado)</span>
            {!selectedCustomer && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <div className="max-h-60 overflow-y-auto space-y-1.5">
            {customersList.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCustomer(c);
                  setShowCustomerModal(false);
                }}
                className={`w-full p-3 rounded-2xl border text-left transition-colors flex items-center justify-between ${
                  selectedCustomer?.id === c.id
                    ? 'bg-emerald-500/20 border-emerald-500 text-white'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold text-white">{c.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Tel: {c.phone || 'N/A'} • RFC: {c.rfc || 'N/A'}
                  </p>
                </div>
                {selectedCustomer?.id === c.id && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Ticket Modal */}
      <TicketModal
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
        sale={completedSale}
      />
    </div>
  );
};
