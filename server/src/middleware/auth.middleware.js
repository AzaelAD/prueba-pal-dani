const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'curamed_secret_jwt_key_2026';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Acceso no autorizado. Token faltante.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, active: true, avatar: true }
    });

    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'Usuario no válido o suspendido.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado.', error: error.message });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Permisos insuficientes. Requiere rol: ${roles.join(' o ')}` 
      });
    }
    next();
  };
};

// Auditoría automática en logs
const logActivity = async (userId, userName, action, details, ip) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        userName: userName || 'Sistema',
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : String(details),
        ip: ip || '127.0.0.1'
      }
    });
  } catch (err) {
    console.error('Error al registrar ActivityLog:', err);
  }
};

module.exports = {
  authenticate,
  requireRole,
  logActivity
};
