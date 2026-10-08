const prisma = require('../utils/prisma');
const { logActivity } = require('../middleware/auth.middleware');

// Obtener turno actual de caja para el usuario o caja activa general
const getCurrentShift = async (req, res) => {
  try {
    const shift = await prisma.cashShift.findFirst({
      where: {
        userId: req.user.id,
        status: 'OPEN'
      },
      include: {
        movements: { orderBy: { createdAt: 'desc' } },
        sales: {
          select: { id: true, folio: true, total: true, paymentMethod: true, createdAt: true, status: true }
        }
      }
    });

    return res.json({ success: true, shift });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar corte de caja', error: error.message });
  }
};

// Abrir turno de caja
const openShift = async (req, res) => {
  try {
    const { openingAmount = 0, notes = '' } = req.body;

    const existing = await prisma.cashShift.findFirst({
      where: {
        userId: req.user.id,
        status: 'OPEN'
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Ya tienes un turno de caja abierto actualmente.' });
    }

    const openAmt = parseFloat(openingAmount) || 0;

    const newShift = await prisma.cashShift.create({
      data: {
        userId: req.user.id,
        openingAmount: openAmt,
        expectedCash: openAmt,
        notes: notes || '',
        status: 'OPEN'
      }
    });

    await logActivity(
      req.user.id,
      req.user.name,
      'CORTE_CAJA_APERTURA',
      `Apertura de turno de caja con fondo inicial de $${openAmt.toFixed(2)}`,
      req.ip
    );

    return res.status(201).json({ success: true, message: 'Turno de caja abierto correctamente', shift: newShift });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al abrir caja', error: error.message });
  }
};

// Registrar movimiento (Entrada extra o Retiro / Gasto de caja)
const addMovement = async (req, res) => {
  try {
    const { cashShiftId, type, amount, reason } = req.body;

    if (!cashShiftId || !type || !amount || !reason) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
    }

    const shift = await prisma.cashShift.findUnique({ where: { id: cashShiftId } });
    if (!shift || shift.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'El turno no existe o ya está cerrado.' });
    }

    const amt = parseFloat(amount);
    if (amt <= 0) {
      return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0.' });
    }

    const movement = await prisma.cashMovement.create({
      data: {
        cashShiftId,
        type, // 'INGRESO' o 'RETIRO'
        amount: amt,
        reason: reason.trim()
      }
    });

    // Actualizar esperado y retiros en el turno
    if (type === 'RETIRO') {
      await prisma.cashShift.update({
        where: { id: cashShiftId },
        data: {
          withdrawals: { increment: amt },
          expectedCash: { decrement: amt }
        }
      });
    } else {
      await prisma.cashShift.update({
        where: { id: cashShiftId },
        data: {
          expectedCash: { increment: amt }
        }
      });
    }

    await logActivity(
      req.user.id,
      req.user.name,
      'MOVIMIENTO_CAJA',
      `${type} de $${amt.toFixed(2)}. Motivo: ${reason}`,
      req.ip
    );

    return res.json({ success: true, message: 'Movimiento registrado con éxito', movement });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al registrar movimiento', error: error.message });
  }
};

// Cerrar turno de caja (Corte Z)
const closeShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualCash, notes } = req.body;

    const shift = await prisma.cashShift.findUnique({
      where: { id },
      include: {
        sales: { where: { status: 'COMPLETED' } },
        movements: true
      }
    });

    if (!shift || shift.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: 'El turno no existe o ya ha sido cerrado.' });
    }

    // Calcular ventas totales por método
    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;

    for (const sale of shift.sales) {
      if (sale.paymentMethod === 'Efectivo') cashSales += sale.total;
      else if (sale.paymentMethod === 'Tarjeta') cardSales += sale.total;
      else if (sale.paymentMethod === 'Transferencia') transferSales += sale.total;
    }

    // Calcular ingresos y retiros
    let extraIncome = 0;
    let withdrawals = 0;
    for (const m of shift.movements) {
      if (m.type === 'INGRESO') extraIncome += m.amount;
      if (m.type === 'RETIRO') withdrawals += m.amount;
    }

    const expectedCash = shift.openingAmount + cashSales + extraIncome - withdrawals;
    const countedCash = actualCash !== undefined ? parseFloat(actualCash) : expectedCash;
    const difference = countedCash - expectedCash;

    const closed = await prisma.cashShift.update({
      where: { id },
      data: {
        cashSales,
        cardSales,
        transferSales,
        withdrawals,
        expectedCash,
        actualCash: countedCash,
        difference,
        notes: notes !== undefined ? notes : shift.notes,
        status: 'CLOSED',
        closedAt: new Date()
      }
    });

    await logActivity(
      req.user.id,
      req.user.name,
      'CORTE_CAJA_CIERRE',
      `Cierre de caja. Efectivo esperado: $${expectedCash.toFixed(2)}, Contado: $${countedCash.toFixed(2)}, Diferencia: $${difference.toFixed(2)}`,
      req.ip
    );

    return res.json({ success: true, message: 'Caja cerrada exitosamente', shift: closed });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al cerrar caja', error: error.message });
  }
};

// Historial de cortes
const getShiftsHistory = async (req, res) => {
  try {
    const shifts = await prisma.cashShift.findMany({
      orderBy: { openedAt: 'desc' },
      take: 30,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { sales: true, movements: true } }
      }
    });

    return res.json({ success: true, shifts });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar historial de cajas' });
  }
};

module.exports = {
  getCurrentShift,
  openShift,
  addMovement,
  closeShift,
  getShiftsHistory
};
