# Funcionalidades Deshabilitadas

Este documento lista las funcionalidades que han sido temporalmente deshabilitadas o removidas del proyecto, junto con las razones y planes futuros.

---

## AI Schedule Generator (Generador de Cronogramas con IA)

**Estado:** ❌ Deshabilitado  
**Desde:** 22 de diciembre, 2025  
**Commit de Deshabilitación:** `d60fe9e`  
**Último Commit Funcional:** `f498b2a`  

### Descripción

El Asistente de IA permitía generar cronogramas automáticamente usando modelos de lenguaje (OpenAI, Anthropic, Gemini). Incluía:
- Wizard paso a paso para configuración
- Soporte multi-provider (OpenAI, Anthropic, Gemini)
- Generación automática de tareas basada en descripción del proyecto
- Configuración just-in-time de API keys

### Razón de Deshabilitación

1. **Complejidad Excesiva:** +2,781 líneas de código agregadas
2. **Problemas de Performance:** Causaba ciclos infinitos de re-render
3. **Conflictos con Lazy Loading:** Incompatible con optimizaciones de Disk IO
4. **Mantenibilidad:** Demasiadas dependencias y puntos de falla

### Impacto en Usuarios

- ✅ **Sin pérdida de funcionalidad core:** Los usuarios pueden seguir creando cronogramas manualmente
- ✅ **Alternativa disponible:** Importación desde Excel funciona perfectamente
- ⚠️ **Pérdida de conveniencia:** Ya no hay generación automática

### Archivos Afectados

#### Eliminados Completamente
- `anthropic-proxy.js` - Proxy CORS para Anthropic
- `src/components/ai-scheduler/AIConfigModal.jsx` - Modal de configuración
- `src/hooks/useAIConfig.js` - Hook de configuración
- `src/services/ai/AIConfigService.js` - Servicio de persistencia
- `src/services/ai/AIProviderService.js` - Factory de proveedores
- `src/services/ai/AISchedulerService.js` - Servicio principal
- `src/services/ai/providers/AnthropicProvider.js` - Proveedor Anthropic
- `src/services/ai/providers/GeminiProvider.js` - Proveedor Gemini
- `src/services/ai/providers/OpenAIProvider.js` - Proveedor OpenAI

#### Modificados
- `src/components/ScheduleManagement.js`
  - Líneas 5945-5956: Botón de IA removido (commit `8860e8c`)
  - Líneas 3746-3894: Lógica de wizard removida
- `package.json`
  - Dependencias de IA removidas

### Alternativas Actuales

1. **Importación desde Excel**
   - Usar el botón "Importar" en ScheduleManagement
   - Descargar plantilla con "Ejemplo"

2. **Creación Manual**
   - Usar botón "Nueva Tarea" en vista Tabla
   - Editar directamente en la tabla tipo Excel

### Cómo Reactivar (No Recomendado)

```bash
# Ver última versión funcional
git show f498b2a

# Revertir deshabilitación (causará problemas)
git revert d60fe9e

# Restaurar archivos específicos
git checkout f498b2a -- src/services/ai/
git checkout f498b2a -- anthropic-proxy.js
```

⚠️ **ADVERTENCIA:** Reactivar esta funcionalidad sin resolver los problemas de arquitectura causará los mismos issues.

### Roadmap Futuro

**v2.0 (Planeado para Q2 2026)**

Rediseño completo con:
- ✅ Arquitectura desacoplada (sin re-renders)
- ✅ State management mejorado (Redux/Zustand)
- ✅ Generación en background (Web Workers)
- ✅ Preview antes de aplicar
- ✅ Mejor manejo de errores
- ✅ Tests unitarios completos

### Contacto

Para preguntas sobre esta funcionalidad:
- **Desarrollador:** @carlosgonzalez
- **Issue Tracker:** [GitHub Issues](https://github.com/carlosgonzalez2mx-droid/StrategiaPM/issues)

---

## Lazy Loading (Carga Diferida)

**Estado:** ❌ Deshabilitado  
**Desde:** 22 de diciembre, 2025  
**Commit de Deshabilitación:** `d60fe9e`  
**Último Commit Funcional:** `477ae31`  

### Descripción

Sistema de carga diferida que cargaba solo los datos del proyecto activo, reduciendo Disk IO en 85%.

### Razón de Deshabilitación

1. **Dashboard Vacío:** El dashboard ejecutivo mostraba datos vacíos
2. **Hybrid Loading Fallido:** El intento de fix causó ciclos infinitos
3. **Complejidad vs Beneficio:** Demasiado complejo para el beneficio obtenido

### Impacto

- ⚠️ **Mayor uso de Disk IO:** Vuelta a carga completa
- ✅ **Optimización mantenida:** SELECT queries optimizados (60% reducción)
- ✅ **Dashboard funcional:** Todos los datos disponibles

### Alternativa Actual

Carga completa con SELECT queries optimizados:
- Solo columnas necesarias
- ~60% reducción vs original
- Sin lazy loading

### Roadmap Futuro

**v2.0:** Considerar lazy loading solo si Disk IO se vuelve problema crítico.

---

## Historial de Cambios

| Fecha | Feature | Acción | Commit | Razón |
|-------|---------|--------|--------|-------|
| 2025-12-22 | AI Scheduler | Deshabilitado | d60fe9e | Performance issues |
| 2025-12-22 | Lazy Loading | Deshabilitado | d60fe9e | Dashboard vacío |
| 2025-12-22 | AI Button | Removido | 8860e8c | Cleanup UI |

---

**Última actualización:** 22 de diciembre, 2025
