// ============================================
// CORRECCIÓN PRIORIDAD 1: organization_id=eq.[object Object]
// ============================================
// Script para corregir el bug donde organization_id se pasa como objeto

/**
 * VALIDACIÓN SEGURA DE UUID
 * Verifica que un valor sea un UUID válido
 */
function isValidUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * CONVERSIÓN SEGURA A STRING UUID
 * Convierte cualquier valor a string UUID válido
 */
function safeConvertToUUID(value) {
  // Caso 1: Ya es string UUID válido
  if (isValidUUID(value)) {
    return value;
  }
  
  // Caso 2: Es string pero no UUID válido
  if (typeof value === 'string') {
    console.warn('⚠️ Valor string no es UUID válido:', value);
    return null;
  }
  
  // Caso 3: Es objeto - extraer id si existe
  if (typeof value === 'object' && value !== null) {
    if (value.id && isValidUUID(value.id)) {
      console.log('✅ Extrayendo UUID de objeto:', { objeto: value, id: value.id });
      return value.id;
    }
    
    if (value.organization_id && isValidUUID(value.organization_id)) {
      console.log('✅ Extrayendo organization_id de objeto:', { objeto: value, organization_id: value.organization_id });
      return value.organization_id;
    }
    
    console.warn('⚠️ Objeto no contiene UUID válido:', value);
    return null;
  }
  
  // Caso 4: Es null o undefined
  if (value === null || value === undefined) {
    console.warn('⚠️ Valor es null/undefined');
    return null;
  }
  
  // Caso 5: Otros tipos
  console.warn('⚠️ Tipo de dato no soportado:', typeof value, value);
  return null;
}

/**
 * PATCH SEGURO PARA detectUserOrganization
 * Aplica la corrección de forma segura
 */
function applySafePatch() {
  console.log('🔧 APLICANDO PATCH SEGURO PARA organization_id...');
  
  // Verificar que SupabaseService existe
  if (typeof window !== 'undefined' && window.supabaseService) {
    const originalDetectUserOrganization = window.supabaseService.detectUserOrganization;
    
    if (originalDetectUserOrganization) {
      // Crear versión parcheada
      window.supabaseService.detectUserOrganization = async function(emailToUse) {
        console.log('🔧 PATCH ACTIVO - detectUserOrganization con validación UUID');
        
        try {
          // Llamar función original
          const result = await originalDetectUserOrganization.call(this, emailToUse);
          
          if (!result) {
            console.log('⚠️ detectUserOrganization retornó null/undefined');
            return null;
          }
          
          // Validar y corregir organization_id
          const originalId = result.id;
          const safeId = safeConvertToUUID(originalId);
          
          if (!safeId) {
            console.error('❌ No se pudo obtener UUID válido de organization_id:', originalId);
            return null;
          }
          
          // Crear resultado corregido
          const correctedResult = {
            ...result,
            id: safeId
          };
          
          console.log('✅ PATCH EXITOSO - organization_id corregido:', {
            original: originalId,
            corrected: safeId,
            type: typeof safeId,
            isValid: isValidUUID(safeId)
          });
          
          return correctedResult;
          
        } catch (error) {
          console.error('❌ Error en detectUserOrganization parcheado:', error);
          return null;
        }
      };
      
      console.log('✅ PATCH APLICADO EXITOSAMENTE');
      return true;
    } else {
      console.error('❌ No se encontró detectUserOrganization en SupabaseService');
      return false;
    }
  } else {
    console.error('❌ SupabaseService no está disponible');
    return false;
  }
}

/**
 * PATCH SEGURO PARA getCurrentOrganization
 * Asegura que siempre retorne string UUID
 */
function applyGetCurrentOrganizationPatch() {
  console.log('🔧 APLICANDO PATCH SEGURO PARA getCurrentOrganization...');
  
  if (typeof window !== 'undefined' && window.supabaseService) {
    const originalGetCurrentOrganization = window.supabaseService.getCurrentOrganization;
    
    if (originalGetCurrentOrganization) {
      window.supabaseService.getCurrentOrganization = function() {
        const result = originalGetCurrentOrganization.call(this);
        const safeResult = safeConvertToUUID(result);
        
        if (safeResult) {
          console.log('✅ getCurrentOrganization corregido:', {
            original: result,
            corrected: safeResult,
            type: typeof safeResult
          });
          return safeResult;
        } else {
          console.warn('⚠️ getCurrentOrganization retornó valor inválido:', result);
          return null;
        }
      };
      
      console.log('✅ PATCH getCurrentOrganization APLICADO');
      return true;
    } else {
      console.error('❌ No se encontró getCurrentOrganization');
      return false;
    }
  } else {
    console.error('❌ SupabaseService no está disponible');
    return false;
  }
}

/**
 * VERIFICACIÓN DE ESTADO ACTUAL
 * Verifica el estado actual del bug
 */
async function verifyCurrentState() {
  console.log('🔍 VERIFICANDO ESTADO ACTUAL...');
  
  if (typeof window !== 'undefined' && window.supabaseService) {
    try {
      const currentOrg = window.supabaseService.getCurrentOrganization();
      console.log('📊 Estado actual getCurrentOrganization:', {
        value: currentOrg,
        type: typeof currentOrg,
        isString: typeof currentOrg === 'string',
        isObject: typeof currentOrg === 'object',
        isValidUUID: isValidUUID(currentOrg)
      });
      
      // Probar detectUserOrganization si hay usuario
      const currentUser = window.supabaseService.getCurrentUser();
      if (currentUser && currentUser.email) {
        console.log('🔍 Probando detectUserOrganization...');
        const orgData = await window.supabaseService.detectUserOrganization(currentUser.email);
        console.log('📊 Resultado detectUserOrganization:', {
          hasResult: !!orgData,
          id: orgData?.id,
          idType: typeof orgData?.id,
          isValidUUID: isValidUUID(orgData?.id)
        });
      }
      
    } catch (error) {
      console.error('❌ Error verificando estado:', error);
    }
  } else {
    console.error('❌ SupabaseService no disponible para verificación');
  }
}

/**
 * APLICAR TODAS LAS CORRECCIONES
 * Función principal que aplica todos los patches
 */
async function applyAllFixes() {
  console.log('🚀 INICIANDO CORRECCIÓN PRIORIDAD 1...');
  
  try {
    // Verificar estado actual
    await verifyCurrentState();
    
    // Aplicar patches
    const patch1 = applySafePatch();
    const patch2 = applyGetCurrentOrganizationPatch();
    
    if (patch1 && patch2) {
      console.log('✅ TODOS LOS PATCHES APLICADOS EXITOSAMENTE');
      
      // Verificar estado después de aplicar patches
      console.log('🔍 VERIFICANDO ESTADO DESPUÉS DE PATCHES...');
      await verifyCurrentState();
      
      return { success: true, message: 'Corrección aplicada exitosamente' };
    } else {
      console.error('❌ ALGUNOS PATCHES FALLARON');
      return { success: false, error: 'Algunos patches fallaron' };
    }
    
  } catch (error) {
    console.error('❌ Error aplicando correcciones:', error);
    return { success: false, error: error.message };
  }
}

// Exportar funciones para uso en consola
if (typeof window !== 'undefined') {
  window.fixOrganizationIdBug = applyAllFixes;
  window.verifyOrganizationIdState = verifyCurrentState;
  window.testUUIDValidation = (value) => {
    console.log('🧪 Probando validación UUID:', {
      value,
      type: typeof value,
      isValid: isValidUUID(value),
      converted: safeConvertToUUID(value)
    });
  };
  
  console.log('🔧 Funciones disponibles:');
  console.log('  - fixOrganizationIdBug() - Aplicar corrección completa');
  console.log('  - verifyOrganizationIdState() - Verificar estado actual');
  console.log('  - testUUIDValidation(value) - Probar validación UUID');
}

// Auto-ejecutar si se carga directamente
if (typeof window !== 'undefined') {
  console.log('🚀 Ejecutando corrección automática...');
  applyAllFixes().then(result => {
    if (result.success) {
      console.log('✅ Corrección completada exitosamente');
      console.log('🔄 Por favor, recarga la página (F5) para aplicar los cambios');
    } else {
      console.error('❌ Error en la corrección:', result.error);
    }
  });
}
