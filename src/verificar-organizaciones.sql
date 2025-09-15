-- Script para verificar el estado actual de organizaciones y proyectos
-- Ayuda a diagnosticar si ya tienes organization_id configurado

-- ===== 1. VERIFICAR ORGANIZACIONES EXISTENTES =====
SELECT 
  'ORGANIZACIONES' as tabla,
  COUNT(*) as total,
  STRING_AGG(id::text, ', ') as ids
FROM organizations;

-- ===== 2. VERIFICAR PROYECTOS Y SU ORGANIZATION_ID =====
SELECT 
  'PROYECTOS' as tabla,
  COUNT(*) as total,
  COUNT(organization_id) as con_organization_id,
  COUNT(*) - COUNT(organization_id) as sin_organization_id
FROM projects;

-- ===== 3. VERIFICAR MIEMBROS DE ORGANIZACIÓN =====
SELECT 
  'ORGANIZATION_MEMBERS' as tabla,
  COUNT(*) as total,
  STRING_AGG(DISTINCT organization_id::text, ', ') as organizaciones_con_miembros
FROM organization_members;

-- ===== 4. MOSTRAR DETALLES DE ORGANIZACIONES =====
SELECT 
  'DETALLES_ORGANIZACIONES' as seccion,
  id,
  name,
  description,
  created_at
FROM organizations
ORDER BY created_at;

-- ===== 5. MOSTRAR PROYECTOS SIN ORGANIZATION_ID =====
SELECT 
  'PROYECTOS_SIN_ORGANIZACION' as seccion,
  id,
  name,
  status,
  organization_id
FROM projects
WHERE organization_id IS NULL;

-- ===== 6. MOSTRAR POLÍTICAS RLS ACTIVAS =====
SELECT 
  'POLITICAS_RLS_PROJECTS' as seccion,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY policyname;
