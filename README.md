# Sistema de Gestión de Stock

Sistema web completo para gestión de inventario de comercios con autenticación JWT, gestión de productos por familias, control de movimientos de stock y soporte para productos pesables.

## Stack Tecnológico

- **Backend**: Node.js + Express
- **Base de datos**: MongoDB + Mongoose (MongoDB Atlas)
- **Autenticación**: bcrypt + JWT
- **Frontend**: HTML + CSS + JavaScript vanilla
- **UI Components**: SweetAlert2 para alertas y confirmaciones
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
│   │   │   ├── Product.js           # Modelo de productos (con familia y unidad)
│   │   │   ├── Family.js            # Modelo de familias/categorías
│   │   │   └── StockMovement.js     # Modelo de movimientos de stock
│   │   ├── middleware/
│   │   │   └── auth.js              # Middleware de autenticación JWT
│   │   ├── routes/
│   │   │   ├── auth.js              # Rutas de autenticación
│   │   │   ├── products.js          # CRUD de productos
│   │   │   ├── families.js          # CRUD de familias
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
        ├── dashboard.html           # Dashboard principal con accesos rápidos
        ├── family-list.html         # Gestión de familias
        ├── product-form.html        # Alta de productos
        ├── product-list.html        # Listado de productos con paginación
        ├── ingresos.html            # Registro de ingresos (compras/ajustes+)
        ├── egresos.html             # Registro de egresos (ventas/ajustes-)
        ├── stock-movements.html     # Historial de movimientos
        ├── css/
        │   └── style.css            # Estilos globales responsive
        └── js/
            ├── login.js             # Lógica de login
            ├── dashboard.js         # Lógica del dashboard
            ├── common.js            # Funciones compartidas y helpers
            ├── family-list.js       # Gestión de familias
            ├── product-list.js      # Listado con filtros y paginación
            ├── product-form.js      # Alta de productos
            ├── movement-register.js # Registro de movimientos (ingresos/egresos)
            └── stock-movements.js   # Historial con filtros y exportación
```

## Funcionalidades Implementadas

### Autenticación y Seguridad
- Login con usuario y contraseña
- Autenticación con JWT (tokens de 7 días)
- Protección de rutas en backend y frontend
- Verificación automática de token en cada página
- Cierre de sesión con limpieza de localStorage
- Redirección automática si el token expira

### Gestión de Familias (Categorías)
- **Alta de familias** (ej: Fiambres, Carnes, Lácteos, Bebidas)
- **Edición de familias** (nombre y descripción)
- **Eliminación de familias** (solo si no tiene productos asociados)
- **Contador de productos** por familia
- Familia opcional al crear productos

### Gestión de Productos
- **Alta de productos** con los siguientes campos:
  - Código de barras (opcional, único si se ingresa)
  - Nombre del producto (obligatorio, único - no permite duplicados)
  - Familia/Categoría (opcional)
  - Unidad de medida: Unidad o Kilogramos
  - Precio
  - Stock mínimo (para alertas)
- **Código interno autogenerado** (formato: P-000001, P-000002, etc.)
- **Validación de nombre duplicado** (case insensitive)
- **Soporte para productos sin código de barras** (múltiples productos pueden no tener código)
- **Edición completa** de todos los campos
- **Eliminación de productos** (solo si no tiene movimientos asociados)
- **Activar/Desactivar productos**

### Listado de Productos
- **Paginación** (10 productos por página)
- **Ordenamiento** por código interno ascendente
- **Indicador de rango** (ej: "Mostrando 1-10 de 45")
- **Filtros múltiples**:
  - Por código (busca en código interno y código de barras)
  - Por nombre
  - Por familia
  - Por estado de stock (bajo mínimo, sin stock)
  - Por estado (activo/inactivo)
- **Stock actual calculado** en tiempo real
- **Alertas visuales** de stock bajo (badge rojo)
- **Formato de stock según unidad**:
  - Unidades: números enteros
  - Kilogramos: 3 decimales (ej: 1.500 kg)

### Registro de Movimientos (Estilo Comprobante)
- **Pantallas separadas**:
  - **Ingresos**: Para compras y ajustes positivos (AC+) - Tipo "Compra" por defecto
  - **Egresos**: Para ventas y ajustes negativos (AC-) - Tipo "Venta" por defecto
- **Múltiples productos por comprobante**
- **Número de comprobante automático** (formato: MOV-00001)
- **Búsqueda de productos**:
  - Por código interno (ENTER para buscar)
  - Por código de barras
  - Por nombre (modal de búsqueda con F2 o botón 🔍)
- **Visualización de precios**:
  - Precio unitario por producto
  - Subtotal por línea (cantidad × precio)
  - **Total general** actualizado en tiempo real
- **Validaciones**:
  - No permite egresos mayores al stock disponible
  - No permite productos duplicados en el mismo comprobante
  - Cantidad mínima según unidad (1 para unidades, 0.001 para kg)
- **ENTER en cantidad** agrega nueva línea automáticamente
- **Fecha con zona horaria local** (no UTC)
- **Campo de observaciones** para notas

### Historial de Movimientos
- **Vista tabular** de todos los movimientos
- **Columna Tipo** ubicada después del producto para mejor lectura
- **Egresos en negativo** para facilitar neteo en Excel
- **Filtros**:
  - Por tipo (Ingreso/Egreso)
  - Por rango de fechas
  - Por código (busca en código interno y código de barras)
  - Por nombre de producto
- **Fecha por defecto**: día actual
- **Totales calculados**:
  - Total de entradas
  - Total de salidas
  - Balance
- **Exportación de datos**:
  - CSV (compatible con Excel)
  - Excel (formato .xls)
- **Tipos de movimiento diferenciados**:
  - Ingreso (compra)
  - Egreso (venta)
  - Ajuste + (AC+)
  - Ajuste - (AC-)

### Interfaz de Usuario
- **Dashboard con accesos rápidos** (2 columnas)
- **Menú lateral** con navegación completa
- **SweetAlert2** para:
  - Confirmaciones de acciones
  - Alertas de éxito
  - Mensajes de error
  - Advertencias
- **Diseño responsive** (adaptable a móviles)
- **Temas de color**:
  - Verde para ingresos
  - Rojo para egresos
- **Iconos emoji** para mejor UX

### Características Técnicas
- Arquitectura de código interno único y secuencial
- Stock calculado dinámicamente (suma de ingresos - suma de egresos)
- Índice sparse en código de barras (permite múltiples null)
- Auto-reparación de índices al iniciar el servidor
- Protección contra eliminación de productos con historial
- Validaciones en frontend y backend
- Manejo robusto de errores
- CORS configurado para producción
- Zona horaria local para fechas (no UTC)

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

Edita `frontend/public/js/common.js` y cambia la URL del API:

```javascript
const API_URL = 'http://localhost:5000/api';
```

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
4. Antes de desplegar, actualiza la URL en `frontend/public/js/common.js`:
   ```javascript
   const API_URL = 'https://tu-backend.onrender.com/api';
   ```
5. Despliega

Tu frontend estará en: `https://tu-proyecto.vercel.app`

## API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login de usuario |
| GET | `/api/auth/verify` | Verificar token |

### Familias

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/families` | Listar todas las familias |
| POST | `/api/families` | Crear nueva familia |
| PUT | `/api/families/:id` | Actualizar familia |
| DELETE | `/api/families/:id` | Eliminar familia |

### Productos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Listar productos con stock calculado |
| POST | `/api/products` | Crear nuevo producto |
| GET | `/api/products/search?code={codigo}` | Buscar por código |
| PUT | `/api/products/:id` | Actualizar producto |
| DELETE | `/api/products/:id` | Eliminar producto |

### Movimientos de Stock

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/stock-movements` | Listar movimientos con filtros |
| POST | `/api/stock-movements` | Registrar movimiento(s) |
| GET | `/api/stock-movements/next-comprobante` | Obtener próximo número de comprobante |

### Health Check

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Verificar estado del servidor |

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
2. Asegúrate de que CORS esté configurado en el backend

### El login no funciona
1. Verifica que el backend esté corriendo
2. Abre la consola del navegador (F12) para ver errores
3. Verifica que hayas creado el usuario admin

### La fecha muestra el día siguiente
- Esto ocurría por usar UTC. Ya está corregido con `getTodayLocal()`
- Si persiste, limpia la caché del navegador (Ctrl+F5)

### No puedo crear productos sin código de barras
- El sistema ya permite múltiples productos sin código de barras
- El índice sparse se auto-repara al iniciar el servidor

## Seguridad

### Para producción, considera:

- ✅ Cambiar credenciales por defecto del admin
- ✅ Usar un `JWT_SECRET` fuerte y único
- ✅ Configurar HTTPS (Render y Vercel lo hacen automáticamente)
- ✅ Validación de inputs en frontend y backend
- ⚠️ Implementar rate limiting
- ⚠️ Implementar refresh tokens
- ⚠️ Agregar logging de accesos
- ⚠️ Implementar roles de usuario más granulares

## Funcionalidades Completadas

- [x] Autenticación JWT
- [x] CRUD de productos
- [x] CRUD de familias/categorías
- [x] Validación de nombre duplicado en productos
- [x] Unidad de medida (unidad/kg)
- [x] Productos sin código de barras
- [x] Registro de ingresos (compras + ajustes positivos)
- [x] Registro de egresos (ventas + ajustes negativos)
- [x] Múltiples productos por comprobante
- [x] Precios y totales en comprobantes de movimiento
- [x] Historial de movimientos con filtros
- [x] Egresos en negativo para facilitar neteo
- [x] Filtro unificado de código (interno y barras)
- [x] Exportación a CSV y Excel
- [x] Paginación en listados
- [x] Filtro por familia
- [x] Alertas con SweetAlert2
- [x] Diseño responsive
- [x] Zona horaria local para fechas

## Próximas Mejoras Sugeridas

- [ ] Reportes y estadísticas de stock
- [ ] Gráficos de movimientos
- [ ] Múltiples usuarios con diferentes roles
- [ ] Sistema de proveedores
- [ ] Sistema de clientes
- [ ] Historial de cambios de precios
- [ ] Notificaciones de stock bajo por email
- [ ] Códigos QR para productos
- [ ] App móvil (React Native / Flutter)
- [ ] Backup automático de datos

## Tecnologías y Dependencias

### Backend
- express: ^4.18.2
- mongoose: ^8.0.0
- bcryptjs: ^2.4.3
- jsonwebtoken: ^9.0.2
- dotenv: ^16.3.1
- cors: ^2.8.5

### Frontend
- HTML5 + CSS3
- JavaScript ES6+
- SweetAlert2 (CDN)

### DevDependencies
- nodemon: ^3.0.1

## Licencia

Este proyecto es de uso libre para aprendizaje y desarrollo.

## Soporte

Para reportar problemas o sugerencias:
- Abre un issue en el repositorio
- Contacta al equipo de desarrollo

---

**Desarrollado con Node.js, MongoDB y JavaScript vanilla**
