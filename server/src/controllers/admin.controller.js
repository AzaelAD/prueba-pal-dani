const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { logActivity } = require('../middleware/auth.middleware');

// Listar usuarios
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        avatar: true,
        createdAt: true,
        _count: { select: { sales: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al listar usuarios' });
  }
};

// Crear usuario
const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'cajero' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role.toLowerCase(),
        active: true
      },
      select: { id: true, name: true, email: true, role: true, active: true }
    });

    await logActivity(req.user.id, req.user.name, 'USUARIO_CREADO', `Creó al usuario ${newUser.name} (${newUser.role})`, req.ip);

    return res.status(201).json({ success: true, message: 'Usuario creado exitosamente', user: newUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al crear usuario', error: error.message });
  }
};

// Modificar usuario / cambiar estado activo
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, active, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (active !== undefined) updateData.active = Boolean(active);
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, active: true }
    });

    await logActivity(req.user.id, req.user.name, 'USUARIO_ACTUALIZADO', `Actualizó usuario ${updated.name} (Activo: ${updated.active})`, req.ip);

    return res.json({ success: true, message: 'Usuario actualizado', user: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
  }
};

// Obtener y guardar configuraciones de negocio
const getSettings = async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    // Valores por defecto si aún no existen en DB
    const defaults = {
      business_name: 'CuraMed - Material de Curación',
      business_rfc: 'MED240101XYZ',
      business_phone: '+52 (55) 5123-4567',
      business_address: 'Av. Médicos 405, Col. Centro Hospitalario, CDMX',
      business_logo: '',
      ticket_footer: '¡Gracias por su compra! Material médico esterilizado y garantizado.',
      tax_rate: '16',
      apply_tax: 'false',
      currency: 'MXN',
      accent_color: '#10b981'
    };

    return res.json({ success: true, settings: { ...defaults, ...settingsMap } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener configuraciones' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const settings = req.body; // { business_name: '...', tax_rate: '16', ... }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }

    await logActivity(req.user.id, req.user.name, 'CONFIGURACION_MODIFICADA', 'Actualizó configuración del sistema', req.ip);

    return res.json({ success: true, message: 'Configuración guardada exitosamente' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar configuraciones' });
  }
};

// Obtener logs de auditoría
const getActivityLogs = async (req, res) => {
  try {
    const { action, limit = 100 } = req.query;
    const where = {};
    if (action) where.action = action;

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    return res.json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener bitácora' });
  }
};

// Auditoría de movimientos críticos (Ventas canceladas y ajustes manuales de stock)
const getCriticalAudit = async (req, res) => {
  try {
    const criticalLogs = await prisma.activityLog.findMany({
      where: {
        action: {
          in: ['VENTA_CANCELADA', 'AJUSTE_STOCK', 'PRODUCTO_ELIMINADO', 'USUARIO_ACTUALIZADO']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const cancelledSales = await prisma.sale.findMany({
      where: { status: 'CANCELLED' },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { name: true } },
        customer: { select: { name: true } }
      },
      take: 20
    });

    return res.json({ success: true, criticalLogs, cancelledSales });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener auditoría crítica' });
  }
};

// Notificaciones del sistema para eventos importantes (stock bajo, ventas altas)
const getSystemNotifications = async (req, res) => {
  try {
    const notifications = [];

    // 1. Productos con stock crítico (stock <= minStock)
    const lowStock = await prisma.product.findMany({
      where: { status: true },
      take: 10
    });
    const criticalStock = lowStock.filter(p => p.currentStock <= p.minStock);

    criticalStock.forEach(p => {
      notifications.push({
        id: `stock-${p.id}`,
        type: 'CRITICAL_STOCK',
        title: 'Stock Crítico',
        message: `El producto "${p.name}" tiene ${p.currentStock} ${p.unit} (mínimo ${p.minStock}).`,
        priority: p.currentStock === 0 ? 'high' : 'medium',
        timestamp: p.updatedAt
      });
    });

    // 2. Ventas grandes recientes (> $1,000 MXN)
    const largeSales = await prisma.sale.findMany({
      where: {
        total: { gte: 1000 },
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    largeSales.forEach(s => {
      notifications.push({
        id: `sale-${s.id}`,
        type: 'HIGH_SALE',
        title: 'Venta Destacada',
        message: `Venta ${s.folio} registrada por un total de $${s.total.toFixed(2)}.`,
        priority: 'info',
        timestamp: s.createdAt
      });
    });

    return res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener notificaciones' });
  }
};

// Respaldo de Base de Datos (Export JSON completo)
const backupDatabase = async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true } });
    const products = await prisma.product.findMany();
    const customers = await prisma.customer.findMany();
    const sales = await prisma.sale.findMany({ include: { items: true } });
    const cashShifts = await prisma.cashShift.findMany({ include: { movements: true } });
    const settings = await prisma.setting.findMany();

    const backupData = {
      system: 'CuraMed POS',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        users,
        products,
        customers,
        sales,
        cashShifts,
        settings
      }
    };

    await logActivity(req.user.id, req.user.name, 'RESPALDO_BD', 'Exportó respaldo completo de la base de datos', req.ip);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=curamed-backup-${new Date().toISOString().split('T')[0]}.json`);
    return res.json(backupData);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al generar respaldo' });
  }
};

// Restaurar Base de Datos desde JSON
const restoreDatabase = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !data.products) {
      return res.status(400).json({ success: false, message: 'Formato de respaldo inválido.' });
    }

    // Restaurar productos
    if (data.products && Array.isArray(data.products)) {
      for (const p of data.products) {
        const { id, ...pData } = p;
        await prisma.product.upsert({
          where: { sku: p.sku },
          update: pData,
          create: { ...pData, id }
        });
      }
    }

    // Restaurar clientes
    if (data.customers && Array.isArray(data.customers)) {
      for (const c of data.customers) {
        const { id, ...cData } = c;
        if (c.email) {
          await prisma.customer.upsert({
            where: { id },
            update: cData,
            create: { ...cData, id }
          });
        }
      }
    }

    await logActivity(req.user.id, req.user.name, 'RESTAURACION_BD', 'Restauró base de datos desde respaldo', req.ip);

    return res.json({ success: true, message: 'Base de datos restaurada correctamente' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al restaurar base de datos', error: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  getSettings,
  updateSettings,
  getActivityLogs,
  getCriticalAudit,
  getSystemNotifications,
  backupDatabase,
  restoreDatabase
};
