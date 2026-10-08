# 🏥 CuraMed POS — Sistema de Punto de Venta para Material de Curación Médico

Sistema POS (Punto de Venta) web full-stack completo, moderno y de alto rendimiento diseñado específicamente para tiendas de **material de curación, equipo médico e insumos hospitalarios**.

---

## 💎 Diseño UI/UX y Estética Apple

- **Estilo:** Glassmorphism ultra-elegante + Neomorfismo sutil + diseño minimalista inspirado en interfaces Apple.
- **Paleta de Colores:** 
  - Fondo oscuro base: `#090d16` y `#0f172a` (Slate-900)
  - Acento médico principal: `#10b981` (Emerald-500)
  - Acento secundario: `#06b6d4` (Cyan)
  - Tarjetas de cristal: `bg-white/5 backdrop-blur-xl border border-white/10`
- **Tipografía:** 
  - `Inter` para toda la interfaz gráfica y etiquetas
  - `JetBrains Mono` para números, cantidades, SKUs y precios
- **Interacciones:**
  - Micro-animaciones fluidas con **Framer Motion**
  - Modales tipo "Slide-up" con física *spring*
  - Barra de comandos **Command Palette (Ctrl + K / ⌘ + K)** estilo Spotlight
  - Notificaciones flotantes tipo Toast (esquina inferior derecha)
  - Impresión y descarga de tickets térmicos de 80mm y compartición directa a WhatsApp
  - Animación de celebración (*confetti*) al concretar una venta

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, Framer Motion, Lucide React, Recharts, Canvas-Confetti, jsPDF, html2canvas, SheetJS (XLSX) |
| **Backend** | Node.js, Express, Prisma ORM, JWT, BcryptJS, CORS, Dotenv |
| **Base de Datos** | PostgreSQL (con fallback automático a SQLite para desarrollo local sin fricción) |
| **Deploy Ready** | Railway, Render, Docker & Docker Compose, VPS |

---

## 📦 Módulos Incluidos

### 1. 📊 Dashboard
- Ventas en tiempo real: hoy, semana y mes.
- Gráficas interactivas con **Recharts** (Área de tendencia de ingresos de los últimos 7 días).
- Ranking de productos más vendidos (Gráfico de barras horizontales).
- Ticker de última venta en tiempo real con indicador verde pulsante.
- Card de utilidad bruta del día con comparador dinámico `↑ / ↓` contra el día anterior.
- Alertas de stock crítico con badges pulsantes en rojo y acceso directo al inventario.

### 2. 🛒 Punto de Venta (POS)
- Búsqueda instantánea de productos por nombre, SKU o **lector de código de barras físico**.
- Filtro por categorías médicas: *Gasas, Vendajes, Antisépticos, Suturas, Guantes, Instrumental, Ortopedia, Varios*.
- Carrito de compras con control de cantidades `+` y `-`, validación en tiempo real de existencias.
- Aplicación de descuentos por producto o globales (en `%` o monto fijo `$`).
- Métodos de pago: **Efectivo**, **Tarjeta** y **Transferencia**.
- Calculadora de cambio automática con botones de denominaciones rápidas ($50, $100, $200, $500, Exacto).
- Botón prominente de **Cobrar** con animación de éxito.
- Generación instantánea de **Ticket de Venta (80mm)** con vista previa, descarga en **PDF**, impresión directa y envío por **WhatsApp**.

### 3. 📦 Inventario y Catálogo Médico
- CRUD completo de productos con campos clínicos:
  - Nombre, SKU, Código de barras, Descripción técnica, Categoría, Precio compra, Precio venta, Stock actual, Stock mínimo, Unidad de medida (*Pza, Caja, Paquete, Frasco, Rollo*), Proveedor/Laboratorio, Imagen y Estatus.
- Alternador de vistas: **Vista Tabla** (con filas que hacen glow sutil en hover) y **Vista Grid** (tarjetas visuales).
- **Edición rápida inline**: modifica precio de venta y existencias directamente en la tabla sin abrir modales.
- **Importación masiva** desde archivos Excel (`.xlsx`, `.csv`).
- **Exportación completa** del catálogo a Excel con un clic.
- Badges de semaforización de inventario (*Óptimo, Stock Bajo, Agotado*).

### 4. 👥 Directorio de Clientes y Médicos
- Registro de clientes, consultorios, clínicas y hospitales.
- Datos fiscales (RFC, razón social, dirección de entrega).
- **Historial completo de compras** por cliente con folios, fechas y desglose de materiales adquiridos.
- Control de saldo a favor y línea de crédito autorizado.
- Notas internas clínicas y preferencias de suministro.

### 5. 📋 Reportes Financieros y Cortes de Caja
- Reporte de ventas filtrable por rango de fechas (Desde / Hasta).
- Cálculo automático de **utilidad bruta** (Ingresos - Costos de adquisición) y margen porcentual.
- Desglose de ingresos por método de pago.
- **Corte de Caja Completo (Arqueo / Turno Z):**
  - Apertura con fondo inicial en efectivo.
  - Registro de ingresos y retiros/gastos con motivo.
  - Cierre de caja con conteo de efectivo físico y cálculo de sobrante/faltante.
  - Historial de cortes pasados con fecha, hora y responsable.
- Exportación de reportes a Excel.

### 6. ⚙️ Administración y Seguridad (Rol Admin)
- Gestión de usuarios y asignación de roles (**Administrador** o **Cajero**).
- Bloqueo y reactivación instantánea de cuentas de usuario.
- Configuración fiscal del negocio: Razón social, RFC, teléfono, dirección, pie de ticket.
- Parámetros de cobro: Configuración de tasa de IVA (16%) y switch para aplicarlo o manejar precios netos.
- **Bitácora de Auditoría (Activity Logs):** Registro de quién hizo qué, cuándo y desde qué IP.
- **Auditoría de Movimientos Críticos:** Monitoreo especial de ventas canceladas (con restitución de stock) y ajustes manuales.
- **Copia de Seguridad y Restauración:** Exporta e importa la base de datos completa en formato JSON estructurado.

---

## 🚀 Inicio Rápido en Desarrollo Local

### Prerrequisitos
- Node.js 18+ instalado
- npm 9+ instalado

### Pasos de Instalación

1. **Instalar dependencias del Backend:**
   ```bash
   cd server
   npm install
   ```

2. **Configurar la base de datos y cargar la semilla médica:**
   ```bash
   npx prisma generate
   npx prisma db push
   node src/utils/seed.js
   ```

3. **Instalar dependencias del Frontend:**
   ```bash
   cd ../client
   npm install
   ```

4. **Ejecutar el sistema:**
   - **Terminal 1 (Backend en puerto 5000):**
     ```bash
     cd server
     npm start
     ```
   - **Terminal 2 (Frontend en puerto 5173):**
     ```bash
     cd client
     npm run dev
     ```

5. Abrir en el navegador: **`http://localhost:5173`**

---

## 🔑 Credenciales de Acceso de Demostración

| Usuario | Correo Electrónico | Contraseña | Rol | Acceso |
|---|---|---|---|---|
| **Dr. Roberto Mendoza** | `admin@curamed.com` | `admin123` | **admin** | Acceso Total (POS, Inventario, Clientes, Reportes, Administración) |
| **Lic. Laura Ríos** | `cajero@curamed.com` | `cajero123` | **cajero** | Operativo (POS, Inventario, Clientes, Reportes de Caja) |

*Nota: La pantalla de login incluye botones de "Acceso Rápido" para ingresar con un solo clic.*

---

## 🌐 Despliegue en Producción (Deploy-Ready)

### Opción 1: Railway
1. Sube el repositorio a GitHub.
2. Crea un nuevo proyecto en [Railway](https://railway.app/).
3. Agrega un servicio **PostgreSQL** y copia la variable `DATABASE_URL`.
4. Agrega un servicio desde el repositorio de GitHub; Railway detectará automáticamente el archivo `railway.json` y el `Dockerfile`.
5. En las variables de entorno de la app, añade:
   - `DATABASE_URL`: Pegar la URL de PostgreSQL
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: Llave secreta para tokens JWT

### Opción 2: Render
1. En [Render](https://render.com/), selecciona **Blueprints** y enlaza tu repositorio.
2. Render leerá el archivo `render.yaml`, aprovisionará la base de datos PostgreSQL administrada y compilará la aplicación automáticamente.

### Opción 3: Docker & Docker Compose (VPS / Servidor Propio)
Ejecuta con un solo comando en tu VPS:
```bash
docker-compose up -d --build
```
El sistema iniciará automáticamente:
- Contenedor PostgreSQL 16
- Contenedor Node.js con frontend compilado y API en puerto 5000.

---

## 📄 Licencia
Este software ha sido desarrollado con estándares de calidad médica y comercial. Licencia MIT.
