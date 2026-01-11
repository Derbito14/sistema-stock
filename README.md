# Sistema de Stock - Login Base

Sistema web básico con autenticación JWT para gestión de stock de comercio.

## Stack Tecnológico

- **Backend**: Node.js + Express
- **Base de datos**: MongoDB + Mongoose
- **Autenticación**: bcrypt + JWT
- **Frontend**: HTML + CSS + JavaScript vanilla

## Estructura del Proyecto

```
SistemaStock/
├── backend/
│   ├── src/
│   │   ├── models/          # Modelos de Mongoose
│   │   ├── middleware/      # Middleware de autenticación
│   │   ├── routes/          # Rutas de la API
│   │   ├── config/          # Configuración (DB)
│   │   └── server.js        # Servidor principal
│   ├── scripts/
│   │   └── createAdmin.js   # Script para crear usuario admin
│   ├── package.json
│   └── .env                 # Variables de entorno (crear manualmente)
└── frontend/
    └── public/
        ├── index.html       # Página de login
        ├── dashboard.html   # Dashboard principal
        ├── css/
        │   └── style.css
        └── js/
            ├── login.js
            └── dashboard.js
```

## Requisitos Previos

1. **Node.js** (v16 o superior)
2. **MongoDB** instalado y corriendo localmente

### Verificar instalaciones

```bash
node --version
npm --version
mongod --version
```

## Instalación y Configuración

### 1. Instalar MongoDB (si no lo tienes)

**Windows:**
- Descarga desde: https://www.mongodb.com/try/download/community
- Instala con las opciones por defecto
- MongoDB se ejecutará como servicio automáticamente

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

### 2. Configurar el Backend

```bash
cd backend
npm install
```

### 3. Crear archivo de configuración

Copia el archivo de ejemplo y configúralo:

```bash
cp .env.example .env
```

Edita el archivo `.env` si necesitas cambiar algún valor (los valores por defecto funcionan para desarrollo local).

### 4. Crear usuario administrador

```bash
npm run create-admin
```

Este comando crea un usuario admin con las siguientes credenciales:
- **Usuario**: `admin`
- **Contraseña**: `admin123`

## Ejecutar el Proyecto

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

### 2. Abrir el Frontend

Abre el archivo `frontend/public/index.html` en tu navegador, o usa un servidor estático:

**Opción 1: Abrir directamente**
- Navega a `frontend/public/` y abre `index.html` con tu navegador

**Opción 2: Usar servidor estático (recomendado)**

```bash
# Instalar servidor estático global
npm install -g http-server

# Ir a la carpeta del frontend
cd frontend/public

# Iniciar servidor
http-server -p 8080
```

Luego abre: `http://localhost:8080`

### 3. Iniciar Sesión

1. Abre `http://localhost:8080` (o el archivo `index.html`)
2. Ingresa las credenciales:
   - Usuario: `admin`
   - Contraseña: `admin123`
3. Serás redirigido al dashboard

## Endpoints de la API

### Autenticación

**POST** `/api/auth/login`
```json
{
  "username": "admin",
  "password": "admin123"
}
```

Respuesta:
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

**GET** `/api/auth/verify`

Headers:
```
Authorization: Bearer {token}
```

Respuesta:
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

### Health Check

**GET** `/api/health`

Respuesta:
```json
{
  "success": true,
  "message": "API funcionando correctamente"
}
```

## Funcionalidades Implementadas

- Login con usuario y contraseña
- Autenticación con JWT
- Protección de rutas en el backend
- Redirección automática al dashboard después del login
- Verificación de token al cargar el dashboard
- Cierre de sesión
- Manejo de errores y validaciones básicas

## Próximos Pasos Sugeridos

- Agregar gestión de productos
- Implementar CRUD de inventario
- Crear reportes de stock
- Agregar categorías de productos
- Implementar búsqueda y filtros
- Agregar paginación
- Crear sistema de alertas de stock bajo

## Solución de Problemas

### Error: "Cannot connect to MongoDB"

1. Verifica que MongoDB esté corriendo:
   ```bash
   # Windows
   net start MongoDB

   # macOS/Linux
   sudo systemctl status mongodb
   ```

2. Verifica la URI en el archivo `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/sistema-stock
   ```

### Error: "CORS policy"

Si ves errores de CORS, verifica que:
1. El backend esté corriendo en el puerto 5000
2. El frontend esté accediendo a `http://localhost:5000`

### El login no funciona

1. Verifica que el servidor backend esté corriendo
2. Abre la consola del navegador (F12) para ver errores
3. Verifica que hayas creado el usuario admin con `npm run create-admin`

## Seguridad

Este proyecto es una base para desarrollo. Para producción, considera:

- Cambiar el `JWT_SECRET` a un valor seguro
- Implementar rate limiting
- Agregar validación de inputs más robusta
- Usar HTTPS
- Implementar refresh tokens
- Agregar logging de accesos
- Cambiar las credenciales por defecto

## Licencia

Este proyecto es de uso libre para aprendizaje y desarrollo.
