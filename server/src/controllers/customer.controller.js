const prisma = require('../utils/prisma');
const { logActivity } = require('../middleware/auth.middleware');

const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { rfc: { contains: search } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { sales: true } }
      }
    });

    return res.json({ success: true, count: customers.length, customers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al listar clientes', error: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            items: {
              include: { product: { select: { name: true, sku: true } } }
            }
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    // Calcular estadísticas del cliente
    const totalSpent = customer.sales
      .filter(s => s.status === 'COMPLETED')
      .reduce((acc, s) => acc + s.total, 0);

    return res.json({
      success: true,
      customer: {
        ...customer,
        totalSpent,
        totalOrders: customer.sales.length
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar cliente', error: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, rfc, address, notes, creditBalance = 0 } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'El nombre del cliente es obligatorio.' });
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        rfc: rfc ? rfc.toUpperCase().trim() : null,
        address: address || null,
        notes: notes || null,
        creditBalance: parseFloat(creditBalance) || 0
      }
    });

    await logActivity(req.user.id, req.user.name, 'CLIENTE_CREADO', `Registró al cliente ${customer.name}`, req.ip);

    return res.status(201).json({ success: true, message: 'Cliente registrado con éxito', customer });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al registrar cliente', error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, rfc, address, notes, creditBalance } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        phone: phone !== undefined ? phone : existing.phone,
        email: email !== undefined ? email : existing.email,
        rfc: rfc !== undefined ? (rfc ? rfc.toUpperCase().trim() : null) : existing.rfc,
        address: address !== undefined ? address : existing.address,
        notes: notes !== undefined ? notes : existing.notes,
        creditBalance: creditBalance !== undefined ? parseFloat(creditBalance) : existing.creditBalance
      }
    });

    await logActivity(req.user.id, req.user.name, 'CLIENTE_ACTUALIZADO', `Actualizó cliente ${updated.name}`, req.ip);

    return res.json({ success: true, message: 'Cliente actualizado', customer: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar cliente', error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { sales: true }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    if (customer.sales && customer.sales.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No es posible eliminar el cliente porque tiene ventas asociadas en el historial.'
      });
    }

    await prisma.customer.delete({ where: { id } });
    await logActivity(req.user.id, req.user.name, 'CLIENTE_ELIMINADO', `Eliminó cliente ${customer.name}`, req.ip);

    return res.json({ success: true, message: 'Cliente eliminado correctamente' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al eliminar cliente', error: error.message });
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
