// ***********************************************************
// Este archivo se ejecuta ANTES de cada test
// Aquí puedes configurar comportamiento global de Cypress
// ***********************************************************

// Importar comandos personalizados
import './commands'

// Desactivar verificación de HTTP no cacheado (mejora performance)
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevenir que errores no manejados de la app fallen los tests
  // SOLO para errors conocidos que no afectan el test

  // Ejemplo: Ignorar errores de ResizeObserver (común en React)
  if (err.message.includes('ResizeObserver')) {
    return false
  }

  // Permitir que otros errores sí fallen el test
  return true
})

// Configuración global de Cypress
beforeEach(() => {
  // Limpiar localStorage antes de cada test (aislamiento)
  // COMENTAR esta línea si necesitas persistencia entre tests
  // cy.clearLocalStorage()
})

afterEach(() => {
  // Aquí puedes agregar limpieza después de cada test
  // Por ejemplo: limpiar cookies, sesiones, etc.
})
