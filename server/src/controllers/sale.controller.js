const prisma = require('../utils/prisma');
const { logActivity } = require('../middleware/auth.middleware');

// Crear una venta (Punto de Venta)
const createSale = async (req, res) => {
  try {
    const {
      customerId,
      items,
      discount = 0,
      paymentMethod = 'Efectivo',
      amountPaid = 0,
      notes = ''
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'El carrito no puede estar vacío.' });
    }

    // Buscar caja abierta para este usuario o cualquier caja activa
    const openShift = await prisma.cashShift.findFirst({
      where: {
        userId: req.user.id,
        status: 'OPEN'
      }
    });

    // Validar productos y existencias
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(400).json({ success: false, message: `Producto no encontrado (ID: ${item.productId})` });
      }

      const qty = parseInt(item.quantity);
      if (qty <= 0) {
        return res.status(400).json({ success: false, message: `Cantidad inválida para ${product.name}` });
      }

      if (product.currentStock < qty) {
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para "${product.name}". Disponible: ${product.currentStock}, Solicitado: ${qty}`
        });
      }

      const unitPrice = parseFloat(item.unitPrice !== undefined ? item.unitPrice : product.salePrice);
      const itemDiscount = parseFloat(item.discount || 0);
      const itemSubtotal = (unitPrice * qty) - itemDiscount;

      calculatedSubtotal += itemSubtotal;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice,
        purchasePrice: product.purchasePrice,
        discount: itemDiscount,
        subtotal: Math.max(0, itemSubtotal)
      });
    }

    // Configuración de impuestos (obtenemos de Setting o default 16% IVA opcional)
    const taxSetting = await prisma.setting.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxSetting ? parseFloat(taxSetting.value) : 16;
    const applyTaxSetting = await prisma.setting.findUnique({ where: { key: 'apply_tax' } });
    const applyTax = applyTaxSetting ? applyTaxSetting.value === 'true' : true;

    const globalDiscount = parseFloat(discount || 0);
    const taxableBase = Math.max(0, calculatedSubtotal - globalDiscount);
    const taxAmount = applyTax ? (taxableBase * (taxRate / 100)) : 0;
    const total = taxableBase + taxAmount;

    const paid = parseFloat(amountPaid) || total;
    const change = Math.max(0, paid - total);

    // Generar Folio consecutivo único
    const countSales = await prisma.sale.count();
    const dateStr = new Date().getFullYear();
    const folio = `VTA-${dateStr}-${String(countSales + 1).padStart(5, '0')}`;

    // Ejecutar transacción atómica: Crear venta, items, decrementar stock
    const saleResult = await prisma.$transaction(async (tx) => {
      // 1. Crear venta
      const sale = await tx.sale.create({
        data: {
          folio,
          customerId: customerId || null,
          userId: req.user.id,
          subtotal: calculatedSubtotal,
          discount: globalDiscount,
          tax: taxAmount,
          total,
          paymentMethod,
          amountPaid: paid,
          change,
          notes: notes || '',
          cashShiftId: openShift ? openShift.id : null,
          status: 'COMPLETED'
        }
      });

      // 2. Crear items y descontar inventario
      for (const item of validatedItems) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            purchasePrice: item.purchasePrice,
            discount: item.discount,
            subtotal: item.subtotal
          }
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { decrement: item.quantity }
          }
        });
      }

      // 3. Si hay caja abierta, acumular en el balance de la sesión
      if (openShift) {
        const updateShift = {};
        if (paymentMethod === 'Efectivo') {
          updateShift.cashSales = { increment: total };
          updateShift.expectedCash = { increment: total };
        } else if (paymentMethod === 'Tarjeta') {
          updateShift.cardSales = { increment: total };
        } else if (paymentMethod === 'Transferencia') {
          updateShift.transferSales = { increment: total };
        }

        await tx.cashShift.update({
          where: { id: openShift.id },
          data: updateShift
        });
      }

      return sale;
    });

    // Consultar la venta completa para retornar al cliente con items y relaciones
    const fullSale = await prisma.sale.findUnique({
      where: { id: saleResult.id },
      include: {
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true }
        }
      }
    });

    await logActivity(
      req.user.id,
      req.user.name,
      'VENTA_CREADA',
      `Registró venta ${fullSale.folio} por $${fullSale.total.toFixed(2)} (${fullSale.paymentMethod})`,
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: 'Venta completada con éxito',
      sale: fullSale
    });
  } catch (error) {
    console.error('Error al registrar venta:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar la venta', error: error.message });
  }
};

// Obtener listado de ventas
const getSales = async (req, res) => {
  try {
    const { startDate, endDate, customerId, paymentMethod, status, limit = 50 } = req.query;

    const where = {};

    if (customerId) where.customerId = customerId;
    if (paymentMethod && paymentMethod !== 'Todos') where.paymentMethod = paymentMethod;
    if (status && status !== 'Todos') where.status = status;

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
      take: parseInt(limit),
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } }
          }
        }
      }
    });

    return res.json({ success: true, count: sales.length, sales });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar ventas', error: error.message });
  }
};

// Obtener detalle de venta por ID o Folio
const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [{ id }, { folio: id }]
      },
      include: {
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Venta no encontrada' });
    }

    return res.json({ success: true, sale });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar venta', error: error.message });
  }
};

// Cancelar venta (Restitución de inventario y auditoría)
const cancelSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Debe especificar el motivo de cancelación.' });
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Venta no encontrada' });
    }

    if (sale.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Esta venta ya se encuentra cancelada.' });
    }

    // Transacción para revertir stock y actualizar estado
    await prisma.$transaction(async (tx) => {
      // 1. Restaurar stock de cada producto
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity }
          }
        });
      }

      // 2. Marcar venta cancelada
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason
        }
      });

      // 3. Si pertenecía a un turno de caja abierto, ajustar esperado
      if (sale.cashShiftId) {
        if (sale.paymentMethod === 'Efectivo') {
          await tx.cashShift.update({
            where: { id: sale.cashShiftId },
            data: {
              cashSales: { decrement: sale.total },
              expectedCash: { decrement: sale.total }
            }
          });
        }
      }
    });

    await logActivity(
      req.user.id,
      req.user.name,
      'VENTA_CANCELADA',
      `Canceló venta ${sale.folio} de $${sale.total.toFixed(2)}. Motivo: ${reason}`,
      req.ip
    );

    return res.json({ success: true, message: `Venta ${sale.folio} cancelada e inventario restablecido.` });
  } catch (error) {
    console.error('Error al cancelar venta:', error);
    return res.status(500).json({ success: false, message: 'Error al cancelar venta', error: error.message });
  }
};

// Ticker de última venta en tiempo real para Dashboard
const getLatestSaleTicker = async (req, res) => {
  try {
    const latest = await prisma.sale.findFirst({
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

    return res.json({ success: true, latest });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar última venta' });
  }
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
  cancelSale,
  getLatestSaleTicker
};
