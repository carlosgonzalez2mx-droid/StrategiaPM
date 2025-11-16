# 🔧 Instrucciones para Corregir Error 400 en organization_members

## 🎯 Objetivo
Corregir el error 400 que aparece en la consola al intentar contar usuarios en `organization_members`.

## 📋 Pasos a Seguir

### 1. Abrir Supabase Dashboard
1. Ve a [https://supabase.com](https://supabase.com)
2. Abre tu proyecto: `ogqpsrsssrrytrqoyyph`
3. En el menú lateral, selecciona **SQL Editor**

### 2. Ejecutar el Script de Corrección
1. Haz clic en **"New Query"**
2. Copia y pega el contenido del archivo `fix-organization-members-rls.sql`
3. Haz clic en **"Run"** (o presiona Cmd/Ctrl + Enter)

### 3. Verificar que Funcionó
Ejecuta esta consulta de prueba en el SQL Editor:

```sql
SELECT COUNT(*) FROM organization_members
WHERE organization_id = '73bf164f-f3e8-4207-95a6-e3e3d385148d'
AND status = 'active';
```

**Resultado esperado**: Debería retornar `6` (el número real de usuarios activos)

### 4. Probar en la Aplicación
1. Abre tu aplicación en el navegador
2. Abre la consola del navegador (F12)
3. Recarga la página
4. Verifica que **YA NO aparezcan** los errores:
   - ❌ `Failed to load resource: the server responded with a status of 400 (organization_members)`
   - ❌ `⚠️ Error contando tabla users`

### 5. Verificar el Contador de Usuarios
En los logs de la consola deberías ver:

```
[isOverLimit] Usuarios: 6 / null
```

En lugar de:

```
[isOverLimit] Usuarios: 0 / null  ❌ INCORRECTO
```

## ✅ Señales de Éxito

1. ✅ No hay errores 400 en la consola
2. ✅ El contador muestra 6 usuarios (no 0)
3. ✅ Los logs muestran el número correcto de usuarios

## ⚠️ Si Sigue Fallando

Si después de ejecutar el script sigues viendo el error, por favor:

1. Copia el mensaje de error completo de la consola
2. Ejecuta esta consulta en Supabase SQL Editor y comparte el resultado:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'organization_members';
```

3. Envíame la información para investigar más a fondo

## 📚 Contexto Técnico

**¿Por qué ocurría este error?**
- Las políticas RLS (Row Level Security) estaban bloqueando las consultas COUNT
- Supabase requiere que las políticas permitan explícitamente el acceso SELECT
- La nueva política permite a los usuarios ver miembros de organizaciones donde son miembros

**¿Qué hace el fix?**
1. Elimina políticas antiguas conflictivas
2. Crea una nueva política que permite SELECT basado en membership
3. Habilita RLS en la tabla
4. Permite consultas COUNT correctamente
