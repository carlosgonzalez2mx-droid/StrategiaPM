// ***********************************************
// Comandos personalizados de Cypress
// Reutilizables en todos los tests
// ***********************************************

/**
 * Comando para login (puedes ajustar según tu flujo de autenticación)
 * Uso: cy.login('email@example.com', 'password123')
 */
Cypress.Commands.add('login', (email, password) => {
  // Opción 1: Login mediante UI (más lento pero más realista)
  cy.visit('/')
  cy.get('input[type="email"]').type(email)
  cy.get('input[type="password"]').type(password)
  cy.get('button[type="submit"]').click()

  // Esperar a que se complete el login (ajustar selector según tu app)
  cy.contains('Dashboard', { timeout: 10000 }).should('be.visible')

  // Opción 2: Login mediante localStorage (más rápido)
  // Descomentar si prefieres este método:
  /*
  cy.visit('/')
  cy.window().then((win) => {
    win.localStorage.setItem('strategiapm_user', JSON.stringify({
      email: email,
      id: 'test-user-id',
      name: 'Test User',
      role: 'pmo_director',
      organizationId: 'test-org-id',
      supabaseUser: false
    }))
  })
  cy.reload()
  */
})

/**
 * Comando para logout
 * Uso: cy.logout()
 */
Cypress.Commands.add('logout', () => {
  // Buscar y hacer click en botón de logout
  // Ajustar selector según tu app
  cy.contains('Cerrar Sesión').click()

  // Verificar que volvió a la pantalla de login
  cy.url().should('include', '/login')
})

/**
 * Comando para crear un proyecto de prueba
 * Uso: cy.createProject('Mi Proyecto Test')
 */
Cypress.Commands.add('createProject', (projectName, options = {}) => {
  // Valores por defecto
  const {
    description = 'Proyecto de prueba creado automáticamente',
    budget = 100000,
    startDate = new Date().toISOString().split('T')[0],
    manager = 'Test Manager'
  } = options

  // Navegar a la sección de proyectos
  cy.contains('Portafolio').click()

  // Abrir modal de crear proyecto (ajustar selector)
  cy.contains('button', 'Nuevo Proyecto').click()

  // Llenar formulario
  cy.get('input[name="name"]').type(projectName)
  cy.get('textarea[name="description"]').type(description)
  cy.get('input[name="budget"]').type(budget.toString())
  cy.get('input[name="startDate"]').type(startDate)
  cy.get('input[name="manager"]').type(manager)

  // Guardar
  cy.contains('button', 'Crear').click()

  // Verificar que se creó
  cy.contains(projectName, { timeout: 5000 }).should('be.visible')
})

/**
 * Comando para limpiar todos los datos de prueba
 * Uso: cy.cleanupTestData()
 */
Cypress.Commands.add('cleanupTestData', () => {
  cy.clearLocalStorage()
  cy.clearCookies()

  // Si usas IndexedDB, también limpiarlo
  cy.window().then((win) => {
    const dbName = 'mi-dashboard-portfolio'
    const deleteRequest = win.indexedDB.deleteDatabase(dbName)

    deleteRequest.onsuccess = () => {
      console.log('IndexedDB limpiado')
    }
  })
})

/**
 * Comando para esperar a que Supabase esté listo
 * Uso: cy.waitForSupabase()
 */
Cypress.Commands.add('waitForSupabase', () => {
  cy.window().then((win) => {
    return new Cypress.Promise((resolve) => {
      const checkSupabase = () => {
        if (win.supabaseService?.isInitialized) {
          resolve()
        } else {
          setTimeout(checkSupabase, 100)
        }
      }
      checkSupabase()
    })
  })
})

/**
 * Comando para mockear respuesta de Supabase (útil para tests)
 * Uso: cy.mockSupabaseAuth(userData)
 */
Cypress.Commands.add('mockSupabaseAuth', (userData = {}) => {
  cy.intercept('POST', '**/auth/v1/**', {
    statusCode: 200,
    body: {
      access_token: 'mock-token',
      user: {
        id: userData.id || 'mock-user-id',
        email: userData.email || 'mock@example.com',
        user_metadata: userData.metadata || {}
      }
    }
  }).as('supabaseAuth')
})
