# Dashboard de Gestión de Proyectos

Sistema integral de gestión de proyectos desarrollado en React con integración a Supabase para persistencia de datos y colaboración en tiempo real.

## 🚀 Características Principales

### 📊 Dashboard Ejecutivo
- Resumen ejecutivo con métricas clave del proyecto
- Indicadores de progreso y salud financiera
- **Alertas unificadas de tareas por vencer** (cronograma + minutas)
- **Detección automática de tareas huérfanas** con interfaz de reasignación
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
- Gestión de cronograma de proyecto con vista Gantt mejorada
- Creación y seguimiento de tareas con fechas precisas
- Hitos y dependencias con cálculo automático de ruta crítica
- **Minutas de reunión** con tareas asignadas y seguimiento
- **Dashboard unificado** que combina tareas del cronograma y minutas
- **Manejo inteligente de tareas huérfanas** cuando se modifican hitos
- **Eliminación inteligente de tareas** con manejo automático de dependencias
- **Importación de cronogramas** con reemplazo completo (no mezcla)

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

### 📁 Gestión de Archivos
- **Almacenamiento en Supabase Storage** con bucket `project-files`
- **Filtrado por proyecto**: Cada proyecto muestra solo sus propios archivos
- **Nombres originales**: Muestra el nombre asignado al archivo, no el técnico
- **Metadatos completos**: Tamaño, fecha de subida y tipo de archivo
- **Descarga directa**: Acceso inmediato a archivos desde la interfaz
- **Eliminación segura**: Borrado tanto de la interfaz como de Supabase Storage

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

## 📅 Mejoras del Cronograma y Dashboard

### Vista Gantt Mejorada
- **Fechas precisas**: Las barras del Gantt se alinean exactamente con las fechas de la tabla
- **Headers fijos**: Los encabezados de fechas permanecen visibles durante el scroll vertical
- **Scroll sincronizado**: Navegación horizontal sincronizada entre headers y contenido
- **Cálculo de ruta crítica**: Identificación automática de tareas críticas del proyecto

### Dashboard Unificado de Tareas
- **Vista consolidada**: Combina tareas del cronograma y minutas en una sola sección
- **Badges diferenciadores**: 
  - 📋 **Cronograma** (azul) para tareas del cronograma
  - 📝 **Minuta** (verde) para tareas de minutas
- **Agrupación por hitos**: Mantiene la organización por hitos del proyecto
- **Filtrado inteligente**: Muestra solo tareas próximas a vencer (15 días)

### Manejo de Tareas Huérfanas
- **Detección automática**: Identifica tareas de minuta que perdieron su hito asignado
- **Interfaz de reasignación**: Dropdown para seleccionar nuevo hito
- **Persistencia robusta**: Actualiza tanto en Supabase como en localStorage
- **Casos cubiertos**:
  - Modificación de hitos existentes
  - Carga de cronogramas diferentes
  - Cambio de IDs de hitos
  - Eliminación de hitos

### Funcionalidades Técnicas
- **Compatibilidad dual**: Funciona con Supabase y localStorage
- **Estados de carga**: Indicadores visuales durante operaciones
- **Manejo de errores**: Captura y maneja errores de actualización
- **Feedback visual**: Confirmaciones y alertas de estado

### Gestión Inteligente de Tareas
- **Eliminación con dependencias**: Advertencia detallada antes de eliminar tareas con dependencias
- **Limpieza automática**: Remoción automática de referencias a tareas eliminadas
- **Recálculo automático**: Actualización automática del cronograma después de eliminaciones
- **Confirmación informada**: Mensajes detallados sobre el impacto de la eliminación

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
- ✅ **Vista Gantt mejorada con fechas precisas**
- ✅ **Dashboard unificado de tareas (cronograma + minutas)**
- ✅ **Manejo inteligente de tareas huérfanas**
- ✅ **Headers fijos y scroll sincronizado en Gantt**
- ✅ **Gestión de archivos con Supabase Storage**
- ✅ **Eliminación inteligente de tareas con manejo de dependencias**
- ✅ **Importación de cronogramas con reemplazo completo**

## 📝 Changelog

### v2.3.0 (Enero 2025)
#### 🗑️ Gestión Inteligente de Tareas
- **Eliminación con dependencias**: Advertencia detallada antes de eliminar tareas con dependencias
- **Limpieza automática**: Remoción automática de referencias a tareas eliminadas
- **Recálculo automático**: Actualización automática del cronograma después de eliminaciones
- **Confirmación informada**: Mensajes detallados sobre el impacto de la eliminación
- **Botón de eliminar**: Reemplazo del botón de editar redundante por funcionalidad de eliminar

#### 📁 Gestión de Archivos
- **Almacenamiento en Supabase Storage**: Integración completa con bucket `project-files`
- **Filtrado por proyecto**: Cada proyecto muestra solo sus propios archivos
- **Nombres originales**: Muestra el nombre asignado al archivo, no el técnico
- **Metadatos completos**: Tamaño, fecha de subida y tipo de archivo correctos
- **Descarga directa**: Acceso inmediato a archivos desde la interfaz
- **Eliminación segura**: Borrado tanto de la interfaz como de Supabase Storage

#### 📊 Importación de Cronogramas
- **Reemplazo completo**: Los nuevos cronogramas reemplazan completamente los anteriores
- **Confirmación de usuario**: Advertencia antes de reemplazar cronograma existente
- **Prevención de mezcla**: Evita mezclar tareas de cronogramas diferentes
- **Manejo de tareas huérfanas**: Advertencia sobre posibles tareas de minuta sin hito

### v2.2.0 (Enero 2025)
#### 🎯 Mejoras del Cronograma
- **Vista Gantt mejorada**: Fechas precisas alineadas con la tabla
- **Headers fijos**: Encabezados de fechas permanecen visibles durante scroll
- **Scroll sincronizado**: Navegación horizontal sincronizada
- **Eliminación de botones redundantes**: Navegación, Guardar Proyecto, Corregir Hitos
- **Deshabilitación de vista Red**: Diagrama de red deshabilitado

#### 📊 Dashboard Unificado
- **Vista consolidada**: Combina tareas del cronograma y minutas
- **Badges diferenciadores**: 📋 Cronograma (azul) y 📝 Minuta (verde)
- **Agrupación inteligente**: Mantiene organización por hitos
- **Filtrado automático**: Solo tareas próximas a vencer (15 días)

#### 🔧 Manejo de Tareas Huérfanas
- **Detección automática**: Identifica tareas sin hito asignado
- **Interfaz de reasignación**: Dropdown para seleccionar nuevo hito
- **Persistencia robusta**: Compatible con Supabase y localStorage
- **Casos edge cubiertos**: Modificación de hitos, cronogramas diferentes

### v2.1.0 (Septiembre 2025)
- Sistema de auditoría completo
- Integración con Supabase
- Persistencia de datos confiable
- UI responsive y accesible

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama para nueva funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto es privado y propietario. Todos los derechos reservados.

---

**Última actualización**: Enero 2025
**Versión**: 2.3.0
**Estado**: Producción