# Server Dealer

API para gestionar servidores de juegos con capacidad de levantar, reiniciar y detener procesos .exe. Incluye frontend web ligero para administración.

## Características

- **Gestión de Servidores**: Crear, listar y eliminar configuraciones de servidores
- **Control de Procesos**: Iniciar, detener y reiniciar servidores ejecutables
- **Sistema de Autenticación**: Tokens para usuarios y administrador
- **Roles**: Admin (acceso total) y Usuarios (solo control de servidores)
- **Frontend Ligero**: 3 páginas (Login, Servidores, Admin) usando Alpine.js
- **Almacenamiento Local**: Configuraciones guardadas en archivos JSON

## Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn
- Windows (para gestión de procesos .exe)

## Instalación

1. **Clonar o navegar al directorio del proyecto**
   ```bash
   cd server-dealer/backend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Verificar archivos de datos**
   Los archivos de configuración se crean automáticamente en la carpeta `backend/data/`:
   - `servers.json`: Configuraciones de servidores
   - `running-servers.json`: Servidores en ejecución
   - `users.json`: Usuarios y token de admin

## Ejecución

### Modo Desarrollo
```bash
npm run start:dev
```

### Modo Producción
```bash
npm run build
npm run start:prod
```

El servidor API se ejecutará en `http://localhost:3000/api`

## Uso del Frontend

1. **Abrir el frontend**
   - Navega a la carpeta `frontend/`
   - Abre `index.html` en tu navegador

2. **Iniciar Sesión**
   - Usa el token de admin (por defecto: `admin-secret-token-123`)
   - Si eres admin, serás redirigido a `admin.html`
   - Si eres usuario regular, serás redirigido a `servers.html`

3. **Panel de Admin**
   - **Pestaña Servidores**: Crear y eliminar configuraciones de servidores
   - **Pestaña Usuarios**: Crear usuarios con nombre y token
   - Tu token de admin se muestra en la parte superior

4. **Panel de Servidores**
   - Ver lista de servidores configurados
   - Iniciar servidores (especificando puerto)
   - Detener servidores en ejecución
   - Reiniciar servidores
   - Ver estado de servidores (en ejecución/detenido)

## API Endpoints

### Servidores

- `GET /api/servers` - Listar todos los servidores configurados (requiere token)
- `GET /api/servers/running` - Listar servidores en ejecución (requiere token)
- `POST /api/servers` - Crear nuevo servidor (requiere token admin)
  - Body: `{ "name": "string", "exePath": "string" }`
- `POST /api/servers/start` - Iniciar servidor (requiere token)
  - Body: `{ "name": "string", "port": number }`
- `POST /api/servers/stop/:name` - Detener servidor (requiere token)
- `POST /api/servers/restart/:name` - Reiniciar servidor (requiere token)
- `DELETE /api/servers/:name` - Eliminar servidor (requiere token admin)

### Usuarios

- `GET /api/users` - Listar todos los usuarios (requiere token admin)
- `POST /api/users` - Crear nuevo usuario (requiere token admin)
  - Body: `{ "name": "string", "token": "string" }`
- `DELETE /api/users/:name` - Eliminar usuario (requiere token admin)

## Configuración Inicial

El token de admin por defecto es: `admin-secret-token-123`

**IMPORTANTE**: Cambia este token en el archivo `backend/data/users.json` antes de usar en producción:

```json
{
  "adminToken": "tu-token-seguro-aqui",
  "users": []
}
```

## Estructura del Proyecto

```
server-dealer/
├── backend/                    # API NestJS (ejecutar npm aquí)
│   ├── src/
│   │   ├── main.ts             # Punto de entrada
│   │   ├── app.module.ts       # Módulo principal
│   │   ├── servers/            # Módulo de servidores
│   │   ├── auth/               # Middleware de autenticación
│   │   └── users/              # Módulo de usuarios
│   ├── data/                   # servers.json, running-servers.json, users.json
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # Frontend web (Alpine.js)
│   ├── index.html              # Login
│   ├── servers.html            # Panel de servidores
│   └── admin.html              # Panel de admin
└── README.md
```

## Notas Importantes

- La API está configurada para aceptar conexiones desde cualquier origen (CORS)
- Los procesos se ejecutan en Windows usando `taskkill` para detenerlos
- Los servidores se inician en modo detached (independientes del proceso principal)
- Asegúrate de que las rutas de los .exe sean correctas y accesibles
- Los puertos deben estar disponibles antes de iniciar un servidor

## Seguridad

- Cambia el token de admin por defecto
- Usa tokens seguros para los usuarios
- No expongas la API públicamente sin autenticación adicional
- Considera usar HTTPS en producción

## Troubleshooting

**Error: Cannot find module**
- Ejecuta `npm install` para instalar dependencias

**Error: EACCES permission denied**
- Asegúrate de tener permisos para ejecutar los .exe
- Ejecuta la terminal como administrador si es necesario

**El servidor no inicia**
- Verifica que la ruta del .exe sea correcta
- Asegúrate de que el puerto esté disponible
- Revisa los logs del servidor para más detalles

## Licencia

MIT
