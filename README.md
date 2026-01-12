# Sistema de Gestión de Stock

Sistema web completo para gestión de inventario de comercios con autenticación JWT, gestión de productos y control de movimientos de stock.

## Stack Tecnológico

- **Backend**: Node.js + Express
- **Base de datos**: MongoDB + Mongoose (MongoDB Atlas)
- **Autenticación**: bcrypt + JWT
- **Frontend**: HTML + CSS + JavaScript vanilla
- **Despliegue**:
  - Backend: Render
  - Frontend: Vercel

## Estructura del Proyecto

```
SistemaStock/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js              # Modelo de usuarios
│   │   │   ├── Product.js           # Modelo de productos
│   │   │   └── StockMovement.js     # Modelo de movimientos de stock
│   │   ├── middleware/
│   │   │   └── auth.js              # Middleware de autenticación JWT
│   │   ├── routes/
│   │   │   ├── auth.js              # Rutas de autenticación
│   │   │   ├── products.js          # CRUD de productos
│   │   │   └── stockMovements.js    # Registro de movimientos
│   │   ├── utils/
│   │   │   └── stockCalculator.js   # Cálculo dinámico de stock
│   │   ├── config/
│   │   │   └── database.js          # Configuración de MongoDB
│   │   └── server.js                # Servidor principal
│   ├── scripts/
│   │   ├── createAdmin.js           # Crear usuario administrador
│   │   ├── testCodigoInterno.js     # Test de códigos internos
│   │   └── cleanOrphanMovements.js  # Limpieza de movimientos huérfanos
│   ├── package.json
│   └── .env                         # Variables de entorno
└── frontend/
    └── public/
        ├── index.html               # Login
        ├── dashboard.html           # Dashboard principal
        ├── product-list.html        # Listado de productos
        ├── product-form.html        # Formulario nuevo producto
        ├── movement-register.html   # Registro de movimientos
        ├── stock-movements.html     # Historial de movimientos
        ├── css/
        │   └── style.css            # Estilos globales
        └── js/
            ├── login.js             # Lógica de login
            ├── dashboard.js         # Lógica del dashboard
            ├── common.js            # Funciones compartidas
            ├── product-list.js      # Listado de productos
            ├── product-form.js      # Alta de productos
            ├── movement-register.js # Registro de movimientos
            └── stock-movements.js   # Historial de movimientos
```

## Funcionalidades Implementadas

### Autenticación
- Login con usuario y contraseña
- Autenticación con JWT
- Protección de rutas en backend y frontend
- Verificación automática de token
- Cierre de sesión

### Gestión de Productos
- **Alta de productos** con código de barras opcional
- **Código interno autogenerado** (formato: PROD-XXXXX)
- **Edición de productos** (nombre, precio, stock mínimo, código de barras)
- **Eliminación de productos** (solo si no tiene movimientos asociados)
- **Listado completo** con stock actual calculado en tiempo real
- **Alertas de stock bajo** cuando está por debajo del mínimo
- **Búsqueda por código** (código interno o código de barras)

### Gestión de Stock
- **Registro de movimientos** (entradas y salidas)
- **Cálculo dinámico de stock** basado en movimientos
- **Historial completo** de movimientos por producto
- **Validaciones de stock** (no permite salidas mayores al stock disponible)
- **Trazabilidad completa** de todos los movimientos

### Características Técnicas
- Arquitectura de código interno único y secuencial
- Stock calculado dinámicamente (no almacenado en campo)
- Protección contra eliminación de productos con historial
- Validaciones en frontend y backend
- Manejo robusto de errores
- CORS configurado para producción
- Responsive design

## Requisitos Previos

### Para desarrollo local:
1. **Node.js** (v16 o superior)
2. **MongoDB Atlas** (cuenta gratuita) o MongoDB local

### Para producción:
1. **Cuenta en Render** (backend)
2. **Cuenta en Vercel** (frontend)
3. **MongoDB Atlas** (base de datos en la nube)

## Instalación y Configuración Local

### 1. Configurar el Backend

```bash
cd backend
npm install
```

### 2. Crear archivo de configuración

Crea un archivo `.env` en la carpeta `backend/`:

```env
PORT=5000

# MongoDB Atlas (reemplaza con tu connection string)
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/sistema-stock?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=tu_secreto_super_seguro_aqui
JWT_EXPIRE=7d
```

### 3. Crear usuario administrador

```bash
npm run create-admin
```

Esto crea:
- **Usuario**: `admin`
- **Contraseña**: `admin123`

### 4. Configurar el Frontend

Edita `frontend/public/js/common.js` y asegúrate de que apunte a tu backend local:

```javascript
const API_URL = 'http://localhost:5000/api';
```

También actualiza `login.js` y `dashboard.js` con la misma URL.

## Ejecutar el Proyecto Localmente

### 1. Iniciar el Backend

```bash
cd backend
npm run dev
```

Deberías ver:
```
✓ MongoDB conectado exitosamente
✓ Servidor corriendo en puerto 5000
```

### 2. Iniciar el Frontend

```bash
cd frontend/public
npx http-server -p 8080
```

O simplemente abre `frontend/public/index.html` en tu navegador.

### 3. Acceder a la aplicación

1. Abre `http://localhost:8080`
2. Ingresa:
   - Usuario: `admin`
   - Contraseña: `admin123`
3. Serás redirigido al dashboard

## Despliegue en Producción

### Backend en Render

1. Crea una cuenta en [Render](https://render.com)
2. Crea un nuevo **Web Service**
3. Conecta tu repositorio
4. Configura:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment Variables**:
     ```
     MONGODB_URI=mongodb+srv://...
     JWT_SECRET=tu_secreto_seguro
     JWT_EXPIRE=7d
     PORT=5000
     ```
5. Despliega

Tu backend estará en: `https://tu-servicio.onrender.com`

### Frontend en Vercel

1. Crea una cuenta en [Vercel](https://vercel.com)
2. Importa tu repositorio
3. Configura:
   - **Root Directory**: `frontend/public`
4. Antes de desplegar, actualiza las URLs en:
   - `frontend/public/js/common.js`
   - `frontend/public/js/login.js`
   - `frontend/public/js/dashboard.js`

   Cambia:
   ```javascript
   const API_URL = 'https://tu-backend.onrender.com/api';
   ```
5. Despliega

Tu frontend estará en: `https://tu-proyecto.vercel.app`

## API Endpoints

### Autenticación

#### POST `/api/auth/login`
Login de usuario

**Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "username": "admin",
    "role": "admin"
  }
}
```

#### GET `/api/auth/verify`
Verificar token

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "admin",
    "role": "admin"
  }
}
```

### Productos

#### GET `/api/products`
Obtener todos los productos con stock calculado

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "products": [
    {
      "_id": "...",
      "codigoInterno": "PROD-00001",
      "barcode": "1234567890",
      "name": "Producto Ejemplo",
      "price": 100.50,
      "minStock": 10,
      "stock": 25,
      "activo": true
    }
  ]
}
```

#### POST `/api/products`
Crear nuevo producto

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "barcode": "1234567890",
  "name": "Producto Nuevo",
  "price": 150.00,
  "minStock": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Producto creado exitosamente",
  "product": {
    "_id": "...",
    "codigoInterno": "PROD-00002",
    "barcode": "1234567890",
    "name": "Producto Nuevo",
    "price": 150.00,
    "minStock": 5
  }
}
```

#### GET `/api/products/search?code={codigo}`
Buscar producto por código interno o código de barras

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "product": { ... }
}
```

#### PUT `/api/products/:id`
Actualizar producto

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Producto Actualizado",
  "price": 200.00,
  "minStock": 15,
  "barcode": "0987654321"
}
```

#### DELETE `/api/products/:id`
Eliminar producto (solo si no tiene movimientos)

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Producto eliminado exitosamente"
}
```

### Movimientos de Stock

#### GET `/api/stock-movements`
Obtener historial de movimientos

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "count": 50,
  "movements": [
    {
      "_id": "...",
      "producto": {
        "_id": "...",
        "codigoInterno": "PROD-00001",
        "name": "Producto Ejemplo"
      },
      "tipo": "entrada",
      "cantidad": 10,
      "motivo": "Compra a proveedor",
      "fecha": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### POST `/api/stock-movements`
Registrar nuevo movimiento

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "codigoProducto": "PROD-00001",
  "tipo": "entrada",
  "cantidad": 10,
  "motivo": "Compra a proveedor"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Movimiento registrado exitosamente",
  "movement": { ... },
  "stockActual": 35
}
```

### Health Check

#### GET `/api/health`
Verificar estado del servidor

**Response:**
```json
{
  "success": true,
  "message": "API funcionando correctamente"
}
```

## Scripts Disponibles

### Backend

```bash
# Iniciar servidor en modo desarrollo (con nodemon)
npm run dev

# Iniciar servidor en modo producción
npm start

# Crear usuario administrador
npm run create-admin

# Test de códigos internos
npm run test-codigo

# Limpiar movimientos huérfanos
npm run clean-orphan
```

## Solución de Problemas

### Error: "Cannot connect to MongoDB"

1. Verifica tu connection string en `.env`
2. Asegúrate de que tu IP esté permitida en MongoDB Atlas (Network Access)
3. Verifica que el usuario y contraseña sean correctos

### Error de CORS en producción

1. Verifica que la URL del backend en el frontend sea correcta
2. Asegúrate de que CORS esté configurado en el backend para aceptar tu dominio de Vercel

### El login no funciona

1. Verifica que el backend esté corriendo
2. Abre la consola del navegador (F12) para ver errores detallados
3. Verifica que hayas creado el usuario admin
4. Asegúrate de que las variables de entorno estén configuradas

### Los productos no cargan

1. Verifica que el token sea válido
2. Asegúrate de que la URL del API en `common.js` sea correcta
3. Revisa los logs del backend en Render

### Error 500 en el servidor

1. Revisa los logs en Render o tu consola local
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que MongoDB esté conectado

## Seguridad

### Para producción, considera:

- ✅ Cambiar credenciales por defecto del admin
- ✅ Usar un `JWT_SECRET` fuerte y único
- ✅ Configurar HTTPS (Render y Vercel lo hacen automáticamente)
- ⚠️ Implementar rate limiting
- ⚠️ Agregar validación de inputs más robusta
- ⚠️ Implementar refresh tokens
- ⚠️ Agregar logging de accesos
- ⚠️ Implementar roles de usuario más granulares

## Próximas Mejoras Sugeridas

- [ ] Reportes y estadísticas de stock
- [ ] Exportación de datos (CSV, Excel)
- [ ] Categorías de productos
- [ ] Múltiples usuarios con diferentes roles
- [ ] Sistema de proveedores
- [ ] Historial de cambios de precios
- [ ] Notificaciones de stock bajo
- [ ] Búsqueda avanzada y filtros
- [ ] Paginación en listados
- [ ] Códigos QR para productos
- [ ] App móvil

## Tecnologías y Dependencias

### Backend
- express: ^4.18.2
- mongoose: ^8.0.0
- bcryptjs: ^2.4.3
- jsonwebtoken: ^9.0.2
- dotenv: ^16.3.1
- cors: ^2.8.5

### DevDependencies
- nodemon: ^3.0.1

## Licencia

Este proyecto es de uso libre para aprendizaje y desarrollo.

## Soporte

Para reportar problemas o sugerencias:
- Abre un issue en el repositorio
- Contacta al equipo de desarrollo

---

**Desarrollado con ❤️ para la gestión eficiente de inventarios**
