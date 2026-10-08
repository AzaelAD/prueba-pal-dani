const prisma = require('../utils/prisma');
const { logActivity } = require('../middleware/auth.middleware');

// Obtener todos los productos con filtros avanzados
const getProducts = async (req, res) => {
  try {
    const { search, category, status, lowStock } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { description: { contains: search } }
      ];
    }

    if (category && category !== 'Todas') {
      where.category = category;
    }

    if (status !== undefined && status !== '') {
      where.status = status === 'true';
    }

    let products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    if (lowStock === 'true') {
      products = products.filter(p => p.currentStock <= p.minStock);
    }

    return res.json({ success: true, count: products.length, products });
  } catch (error) {
    console.error('Error al listar productos:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar catálogo', error: error.message });
  }
};

// Buscar producto individual por id o barcode
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al buscar producto', error: error.message });
  }
};

const getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: barcode },
          { sku: barcode }
        ],
        status: true
      }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Código no encontrado en catálogo activo' });
    }
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al buscar código de barras', error: error.message });
  }
};

// Crear producto
const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      barcode,
      description,
      category,
      purchasePrice,
      salePrice,
      currentStock,
      minStock,
      unit,
      supplier,
      image,
      status
    } = req.body;

    if (!name || !sku || salePrice === undefined) {
      return res.status(400).json({ success: false, message: 'Nombre, SKU y precio de venta son obligatorios.' });
    }

    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return res.status(400).json({ success: false, message: 'El SKU ya existe.' });
    }

    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode } });
      if (existingBarcode) {
        return res.status(400).json({ success: false, message: 'El código de barras ya está asignado a otro producto.' });
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        sku: sku.toUpperCase().trim(),
        barcode: barcode ? barcode.trim() : null,
        description: description || '',
        category: category || 'Varios',
        purchasePrice: parseFloat(purchasePrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        currentStock: parseInt(currentStock) || 0,
        minStock: parseInt(minStock) || 5,
        unit: unit || 'Pza',
        supplier: supplier || '',
        image: image || null,
        status: status !== undefined ? Boolean(status) : true
      }
    });

    await logActivity(
      req.user.id,
      req.user.name,
      'PRODUCTO_CREADO',
      `Creó el producto ${newProduct.name} (SKU: ${newProduct.sku})`,
      req.ip
    );

    return res.status(201).json({ success: true, message: 'Producto registrado exitosamente', product: newProduct });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return res.status(500).json({ success: false, message: 'Error al guardar producto', error: error.message });
  }
};

// Actualizar producto completo
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    // Comprobar colisiones de SKU
    if (data.sku && data.sku !== existing.sku) {
      const dup = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (dup) return res.status(400).json({ success: false, message: 'El SKU ya existe' });
    }

    // Comprobar colisiones de código de barras
    if (data.barcode && data.barcode !== existing.barcode) {
      const dup = await prisma.product.findUnique({ where: { barcode: data.barcode } });
      if (dup) return res.status(400).json({ success: false, message: 'El código de barras ya existe' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        sku: data.sku ? data.sku.toUpperCase().trim() : existing.sku,
        barcode: data.barcode !== undefined ? data.barcode : existing.barcode,
        description: data.description !== undefined ? data.description : existing.description,
        category: data.category || existing.category,
        purchasePrice: data.purchasePrice !== undefined ? parseFloat(data.purchasePrice) : existing.purchasePrice,
        salePrice: data.salePrice !== undefined ? parseFloat(data.salePrice) : existing.salePrice,
        currentStock: data.currentStock !== undefined ? parseInt(data.currentStock) : existing.currentStock,
        minStock: data.minStock !== undefined ? parseInt(data.minStock) : existing.minStock,
        unit: data.unit || existing.unit,
        supplier: data.supplier !== undefined ? data.supplier : existing.supplier,
        image: data.image !== undefined ? data.image : existing.image,
        status: data.status !== undefined ? Boolean(data.status) : existing.status
      }
    });

    await logActivity(
      req.user.id,
      req.user.name,
      'PRODUCTO_ACTUALIZADO',
      `Actualizó producto ${updated.name} (SKU: ${updated.sku})`,
      req.ip
    );

    return res.json({ success: true, message: 'Producto actualizado exitosamente', product: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al actualizar producto', error: error.message });
  }
};

// Edición inline rápida (precio de venta y stock)
const inlineUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { salePrice, currentStock } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const updateData = {};
    let auditMsg = `Edición rápida de ${existing.name}: `;

    if (salePrice !== undefined) {
      updateData.salePrice = parseFloat(salePrice);
      auditMsg += `Precio anterior $${existing.salePrice} -> nuevo $${salePrice}. `;
    }

    if (currentStock !== undefined) {
      updateData.currentStock = parseInt(currentStock);
      auditMsg += `Stock anterior ${existing.currentStock} -> nuevo ${currentStock}. `;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData
    });

    await logActivity(
      req.user.id,
      req.user.name,
      'AJUSTE_STOCK',
      auditMsg,
      req.ip
    );

    return res.json({ success: true, message: 'Actualizado rápidamente', product: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error en actualización inline', error: error.message });
  }
};

// Eliminar producto
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { saleItems: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    // Si tiene ventas asociadas, desactivamos en vez de borrar para preservar integridad histórica
    if (existing.saleItems && existing.saleItems.length > 0) {
      const deactivated = await prisma.product.update({
        where: { id },
        data: { status: false }
      });
      await logActivity(req.user.id, req.user.name, 'PRODUCTO_DESACTIVADO', `Desactivó ${existing.name} (tiene ventas históricas)`, req.ip);
      return res.json({ success: true, message: 'El producto tiene ventas históricas asociadas. Se marcó como Inactivo para conservar reportes.', product: deactivated });
    }

    await prisma.product.delete({ where: { id } });
    await logActivity(req.user.id, req.user.name, 'PRODUCTO_ELIMINADO', `Eliminó producto ${existing.name}`, req.ip);
    return res.json({ success: true, message: 'Producto eliminado del catálogo' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al eliminar producto', error: error.message });
  }
};

// Importar masivamente desde array de productos (JSON / CSV procesado)
const batchImportProducts = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Se esperaba una lista de productos para importar.' });
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      if (!item.name || !item.sku) continue;

      const sku = String(item.sku).toUpperCase().trim();
      const existing = await prisma.product.findUnique({ where: { sku } });

      const dataObj = {
        name: item.name,
        sku,
        barcode: item.barcode ? String(item.barcode).trim() : null,
        description: item.description || '',
        category: item.category || 'Varios',
        purchasePrice: parseFloat(item.purchasePrice) || 0,
        salePrice: parseFloat(item.salePrice) || 0,
        currentStock: parseInt(item.currentStock) || 0,
        minStock: parseInt(item.minStock) || 5,
        unit: item.unit || 'Pza',
        supplier: item.supplier || '',
        status: true
      };

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: dataObj
        });
        updatedCount++;
      } else {
        await prisma.product.create({
          data: dataObj
        });
        createdCount++;
      }
    }

    await logActivity(
      req.user.id,
      req.user.name,
      'IMPORTACION_PRODUCTOS',
      `Importación masiva: ${createdCount} creados, ${updatedCount} actualizados`,
      req.ip
    );

    return res.json({
      success: true,
      message: `Importación completada: ${createdCount} agregados nuevos, ${updatedCount} actualizados.`,
      createdCount,
      updatedCount
    });
  } catch (error) {
    console.error('Error en batchImport:', error);
    return res.status(500).json({ success: false, message: 'Error al importar productos', error: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  inlineUpdate,
  deleteProduct,
  batchImportProducts
};
