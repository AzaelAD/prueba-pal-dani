const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { logActivity } = require('../middleware/auth.middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'curamed_secret_jwt_key_2026';

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    if (!user.active) {
      return res.status(403).json({ success: false, message: 'Esta cuenta ha sido desactivada. Contacte al administrador.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logActivity(user.id, user.name, 'INICIO_SESION', `Inicio de sesión exitoso`, req.ip);

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true }
    });
    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener perfil', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, password, avatar } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, avatar: true }
    });

    await logActivity(req.user.id, req.user.name, 'PERFIL_ACTUALIZADO', 'Actualizó sus datos de perfil', req.ip);

    return res.json({ success: true, message: 'Perfil actualizado exitosamente', user: updatedUser });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar perfil', error: error.message });
  }
};

module.exports = {
  login,
  getProfile,
  updateProfile
};
