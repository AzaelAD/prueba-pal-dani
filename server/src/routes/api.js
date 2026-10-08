const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth.middleware');
const authCtrl = require('../controllers/auth.controller');
const productCtrl = require('../controllers/product.controller');
const saleCtrl = require('../controllers/sale.controller');
const customerCtrl = require('../controllers/customer.controller');
const cashCtrl = require('../controllers/cash.controller');
const reportCtrl = require('../controllers/report.controller');
const adminCtrl = require('../controllers/admin.controller');

// =================== AUTENTICACIÓN ===================
router.post('/auth/login', authCtrl.login);
router.get('/auth/profile', authenticate, authCtrl.getProfile);
router.put('/auth/profile', authenticate, authCtrl.updateProfile);

// =================== PRODUCTOS / INVENTARIO ===================
router.get('/products', authenticate, productCtrl.getProducts);
router.get('/products/barcode/:barcode', authenticate, productCtrl.getProductByBarcode);
router.get('/products/:id', authenticate, productCtrl.getProductById);
router.post('/products', authenticate, productCtrl.createProduct);
router.put('/products/:id', authenticate, productCtrl.updateProduct);
router.patch('/products/:id/inline', authenticate, productCtrl.inlineUpdate);
router.delete('/products/:id', authenticate, requireRole('admin'), productCtrl.deleteProduct);
router.post('/products/batch-import', authenticate, requireRole('admin'), productCtrl.batchImportProducts);

// =================== VENTAS (POS) ===================
router.post('/sales', authenticate, saleCtrl.createSale);
router.get('/sales', authenticate, saleCtrl.getSales);
router.get('/sales/ticker/latest', authenticate, saleCtrl.getLatestSaleTicker);
router.get('/sales/:id', authenticate, saleCtrl.getSaleById);
router.post('/sales/:id/cancel', authenticate, requireRole('admin'), saleCtrl.cancelSale);

// =================== CLIENTES ===================
router.get('/customers', authenticate, customerCtrl.getCustomers);
router.get('/customers/:id', authenticate, customerCtrl.getCustomerById);
router.post('/customers', authenticate, customerCtrl.createCustomer);
router.put('/customers/:id', authenticate, customerCtrl.updateCustomer);
router.delete('/customers/:id', authenticate, requireRole('admin'), customerCtrl.deleteCustomer);

// =================== CORTE DE CAJA ===================
router.get('/cash/current', authenticate, cashCtrl.getCurrentShift);
router.post('/cash/open', authenticate, cashCtrl.openShift);
router.post('/cash/movement', authenticate, cashCtrl.addMovement);
router.post('/cash/close/:id', authenticate, cashCtrl.closeShift);
router.get('/cash/history', authenticate, cashCtrl.getShiftsHistory);

// =================== REPORTES Y DASHBOARD ===================
router.get('/reports/dashboard', authenticate, reportCtrl.getDashboardMetrics);
router.get('/reports/detailed', authenticate, reportCtrl.getDetailedReport);

// =================== ADMINISTRACIÓN (Solo rol admin) ===================
router.get('/admin/users', authenticate, requireRole('admin'), adminCtrl.getUsers);
router.post('/admin/users', authenticate, requireRole('admin'), adminCtrl.createUser);
router.put('/admin/users/:id', authenticate, requireRole('admin'), adminCtrl.updateUser);

router.get('/admin/settings', authenticate, adminCtrl.getSettings);
router.put('/admin/settings', authenticate, requireRole('admin'), adminCtrl.updateSettings);

router.get('/admin/logs', authenticate, requireRole('admin'), adminCtrl.getActivityLogs);
router.get('/admin/critical-audit', authenticate, requireRole('admin'), adminCtrl.getCriticalAudit);
router.get('/admin/notifications', authenticate, adminCtrl.getSystemNotifications);
router.get('/admin/backup', authenticate, requireRole('admin'), adminCtrl.backupDatabase);
router.post('/admin/restore', authenticate, requireRole('admin'), adminCtrl.restoreDatabase);

module.exports = router;
