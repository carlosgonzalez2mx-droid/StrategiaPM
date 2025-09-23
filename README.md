# Dashboard de Gestión de Proyectos

Sistema integral de gestión de proyectos desarrollado en React con integración a Supabase para persistencia de datos y colaboración en tiempo real.

## 🚀 Características Principales

### 📊 Dashboard Ejecutivo
- Resumen ejecutivo con métricas clave del proyecto
- Indicadores de progreso y salud financiera
- Alertas y notificaciones importantes
- Visualización de tendencias y KPIs

### 🎯 Gestión de Proyectos
- Creación y administración de proyectos
- Seguimiento de progreso automático basado en tareas
- Gestión de estados y ciclo de vida del proyecto
- Cálculo automático de porcentajes de completado

### ⚠️ Gestión de Riesgos
- Identificación y registro de riesgos del proyecto
- Matriz de probabilidad vs impacto
- Planes de mitigación y seguimiento
- Categorización por severidad

### 📅 Cronograma y Tareas
- Gestión de cronograma de proyecto
- Creación y seguimiento de tareas
- Hitos y dependencias
- **Minutas de reunión** con tareas asignadas y seguimiento

### 💰 Gestión Financiera
- Control de presupuesto del proyecto
- Órdenes de compra y facturación
- Anticipos y control de gastos
- Flujo de caja y reportes financieros

### 👥 Gestión de Recursos
- Asignación de recursos humanos
- Control de disponibilidad y capacidad
- Seguimiento de participación por proyecto

### 🔄 Control de Cambios
- Registro de cambios del proyecto
- Aprobaciones y control de versiones
- Impacto en alcance, tiempo y costo

### 💸 Flujo de Caja
- Proyecciones financieras
- Control de ingresos y egresos
- Análisis de liquidez del proyecto

### 📋 Auditoría Documental
- **Sistema de auditoría completo con persistencia en Supabase**
- Registro automático de todos los movimientos del proyecto
- Tracking de cambios en minutas y tareas
- Exportación de reportes de auditoría
- Filtros por categoría, fecha y búsqueda
- Trazabilidad completa de acciones

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18 con Hooks
- **Base de Datos**: Supabase (PostgreSQL)
- **Estilos**: Tailwind CSS
- **Autenticación**: Supabase Auth
- **Estado**: React State & Context API
- **Iconos**: Emojis nativos para mejor rendimiento

## 📦 Estructura del Proyecto

```
src/
├── components/           # Componentes React
│   ├── ProjectAudit.js         # Auditoría documental
│   ├── ScheduleManagement.js   # Cronograma y minutas
│   ├── EditMinutaModal.js      # Modal de edición de minutas
│   └── ...
├── hooks/               # Custom Hooks
│   ├── useAuditLog.js          # Hook de auditoría con Supabase
│   └── ...
├── services/            # Servicios y APIs
│   ├── SupabaseService.js      # Servicio principal de Supabase
│   └── ...
└── ...
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm o yarn
- Cuenta en Supabase

### Configuración

1. **Clonar el repositorio**
```bash
git clone [repository-url]
cd mi-dashboard
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear archivo `.env.local` con:
```env
REACT_APP_SUPABASE_URL=tu_supabase_url
REACT_APP_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

4. **Configurar base de datos Supabase**
Ejecutar las migraciones SQL necesarias:
```sql
-- Tabla de eventos de auditoría
CREATE TABLE project_audit_events (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  details JSONB,
  severity TEXT DEFAULT 'medium',
  user_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX idx_audit_events_project_id ON project_audit_events(project_id);
CREATE INDEX idx_audit_events_timestamp ON project_audit_events(timestamp);
```

### Comandos Disponibles

#### `npm start`
Ejecuta la aplicación en modo desarrollo.\
Abre [http://localhost:3000](http://localhost:3000) en el navegador.

#### `npm test`
Ejecuta las pruebas en modo interactivo.

#### `npm run build`
Construye la aplicación para producción en la carpeta `build`.

## 📊 Funcionalidades de Auditoría

### Sistema de Auditoría Automática
El sistema registra automáticamente:

- ✅ **Cambios en minutas**: Creación y actualización de tareas de minutas
- ✅ **Cambios de estado**: Modificaciones en el estado del proyecto
- ✅ **Eventos financieros**: Órdenes de compra, facturas, anticipos
- ✅ **Asignación de recursos**: Cambios en el equipo del proyecto
- ✅ **Gestión de riesgos**: Identificación y mitigación de riesgos

### Persistencia en Supabase
- **UUID generation**: IDs únicos compatibles con PostgreSQL
- **UPSERT operations**: Prevención de duplicados
- **Row Level Security**: Seguridad a nivel de fila
- **Real-time updates**: Actualizaciones en tiempo real

### Exportación y Reportes
- Exportación a JSON con metadatos completos
- Filtros avanzados por categoría, fecha y búsqueda
- Reportes de cumplimiento regulatorio

## 🔧 Desarrollo

### Agregar Nuevos Eventos de Auditoría

1. **En el componente**:
```javascript
import useAuditLog from '../hooks/useAuditLog';

const { logCustomEvent } = useAuditLog(projectId, true);

// Registrar evento
logCustomEvent({
  category: 'custom-category',
  action: 'custom-action',
  description: 'Descripción del evento',
  details: { /* datos adicionales */ },
  severity: 'medium'
});
```

2. **Agregar categoría en ProjectAudit.js**:
```javascript
// En getCategoryIcon()
case 'custom-category': return '🔧';

// En el select de filtros
<option value="custom-category">Mi Categoría</option>
```

## 🚢 Despliegue

La aplicación está configurada para desplegarse fácilmente en:
- Vercel (recomendado)
- Netlify
- Heroku
- Servidores tradicionales

## 📋 Estado del Proyecto

- ✅ Sistema de auditoría completamente funcional
- ✅ Integración con Supabase estable
- ✅ Persistencia de datos confiable
- ✅ UI responsive y accesible
- ✅ Filtros y búsqueda avanzada
- ✅ Exportación de reportes

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama para nueva funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto es privado y propietario. Todos los derechos reservados.

---

**Última actualización**: Septiembre 2025
**Versión**: 2.1.0
**Estado**: Producción