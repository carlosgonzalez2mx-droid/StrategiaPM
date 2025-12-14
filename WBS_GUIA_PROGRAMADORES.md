# ⚠️ Guía de Código WBS - Para Programadores

**Fecha:** 14 de Diciembre de 2025  
**Propósito:** Evitar confusión sobre código relacionado con Work Packages (WBS)

---

## 📌 Resumen Ejecutivo

La funcionalidad de gestión de **Work Packages (WBS)** fue **descontinuada**. La aplicación ahora trabaja **directamente con el Cronograma** (`ScheduleManagement.js`).

Los códigos WBS se generan **automáticamente** como secuencias numéricas simples: `1, 2, 3, 4...`

---

## ❌ Archivos COMPLETAMENTE NO UTILIZADOS

### 🔴 NO tocar, NO actualizar, NO expandir

| Archivo | Ubicación | Estado |
|---------|-----------|--------|
| `WorkPackagesManagement.js` | `/src/components/` | **NO se importa** en ningún lugar |
| `update-project-wbs.js` | `/src/` | **NO se ejecuta** ni se referencia |
| `execute-wbs-update.js` | `/src/` | **NO se ejecuta** ni se referencia |
| `update-wbs-direct.js` | `/src/` | **NO se ejecuta** ni se referencia |
| `update-wbs-script.js` | `/src/` | **NO se ejecuta** ni se referencia |

### Función NO Utilizada

```javascript
// En: src/components/ScheduleManagement.js (líneas 235-336)
const handleWBSUpdate = (action, data) => { ... }
```

- ✅ Está definida
- ❌ **NUNCA se llama**
- ❌ No hay referencias en todo el código

**Instrucción:** NO actualizar ni modificar esta función.

---

## ⚠️ Código LEGACY (Existe pero Inactivo)

### Variables que SIEMPRE están vacías

```javascript
// En: src/App.js (múltiples líneas)
workPackages={[]}  // ← SIEMPRE es un array vacío

// En: src/App.js (línea 1824)
setWorkPackages={() => { }}  // ← Función vacía que no hace nada
```

### Componentes que reciben datos vacíos

1. **ProjectManagement.js**
   - Recibe `workPackages` pero siempre es `[]`
   - Líneas 1069-1080: Itera sobre workPackages (nunca ejecuta)
   - Tab "Detalles WBS" existe en UI pero sin funcionalidad real

2. **FinancialManagement.js**
   - Recibe `workPackages` como prop (línea 90)
   - Función `syncWithSchedule` (línea 145): existe pero nunca ejecuta porque `workPackages.length === 0`

**Instrucción:** Este código se mantiene solo para **compatibilidad**. NO actualizar ni expandir.

---

## ✅ Qué SÍ se Usa - Funcionalidad Actual

### Cronograma (ScheduleManagement.js)

La gestión completa del proyecto ahora se hace en el **Cronograma**:

```javascript
// Ubicación: src/components/ScheduleManagement.js
// Prop principal: tasks (arreglo de tareas)
```

### Códigos WBS Automáticos

Los `wbsCode` se generan automáticamente como números secuenciales:

```javascript
// Ejemplos de wbsCode en tareas:
{ id: "abc123", wbsCode: "1", name: "Tarea 1", ... }
{ id: "def456", wbsCode: "2", name: "Tarea 2", ... }
{ id: "ghi789", wbsCode: "3", name: "Tarea 3", ... }
```

**NO hay jerarquía de paquetes de trabajo.** Solo secuencias simples.

### Cálculos Financieros

Los cálculos de EVM (Earned Value Management) se basan en:
- ✅ **Tareas del cronograma** (`tasks`)
- ❌ NO en work packages

```javascript
// En: src/components/FinancialManagement.js
// Se usa: scheduleData.tasks
// NO se usa: workPackages (siempre está vacío)
```

---

## 🎯 Reglas para Programadores

### ✅ SI puedes:
- Modificar y expandir funcionalidad del **Cronograma** (`ScheduleManagement.js`)
- Usar la propiedad `wbsCode` en tareas (es un simple número secuencial)
- Actualizar cálculos financieros basados en `tasks` del cronograma

### ❌ NO debes:
- Importar o usar `WorkPackagesManagement.js`
- Llamar a la función `handleWBSUpdate()`
- Ejecutar scripts de WBS (`update-project-wbs.js`, etc.)
- Actualizar o expandir código relacionado con `workPackages` (array vacío)
- Crear nueva funcionalidad basada en Work Packages

### 🔄 Si encuentras código de workPackages:
1. **NO lo elimines** (se mantiene por compatibilidad)
2. **NO lo actualices** (está deprecado)
3. **NO lo uses** como referencia para nueva funcionalidad
4. Usa el **Cronograma** en su lugar

---

## 📖 Referencia Rápida

| Concepto | Estado Actual |
|----------|---------------|
| Work Packages Management | ❌ Descontinuado |
| Tab "Detalles WBS" en UI | ⚠️ Legacy (sin datos) |
| Variable `workPackages` | ⚠️ Legacy (siempre `[]`) |
| Función `handleWBSUpdate` | ❌ No se usa |
| Scripts WBS | ❌ No se ejecutan |
| **Cronograma** | ✅ **FUNCIONALIDAD ACTUAL** |
| Propiedad `wbsCode` en tasks | ✅ Se usa (números: 1,2,3...) |
| Cálculos en base a `tasks` | ✅ **CORRECTO** |

---

## 🆘 ¿Necesitas agregar funcionalidad de paquetes?

**NO uses código de Work Packages.**

En su lugar:
1. Trabaja directamente con el **Cronograma**
2. Usa las **tareas** (`tasks`) del proyecto
3. Aprovecha los `wbsCode` automáticos si necesitas identificadores

---

## 📞 Contacto

Si tienes dudas sobre qué código usar, consulta este documento o pregunta al equipo.

**Regla de oro:** Cuando veas código de `workPackages`, piensa "esto está deprecado, usar Cronograma".

---

**Última actualización:** 2025-12-14
