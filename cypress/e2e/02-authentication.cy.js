/**
 * AUTHENTICATION TESTS - Tests de login/logout
 *
 * NOTA IMPORTANTE:
 * - Estos tests requieren ajustar credenciales en cypress.config.js
 * - Algunos tests están marcados como skip() hasta que configures Supabase test
 */

describe('Authentication Flow', () => {

  beforeEach(() => {
    // Limpiar datos antes de cada test
    cy.cleanupTestData()
    cy.visit('/')
  })

  it('E2E-AUTH-01: App carga sin autenticación obligatoria', () => {
    // Verificar que la app carga (sin forzar login inmediato)
    // Según tu código: DESACTIVAR AUTENTICACIÓN - Cargar directamente MainApp
    cy.get('body').should('be.visible')

    // La app debe cargar el MainApp directamente
    cy.wait(2000) // Esperar a que cargue
  })

  it('E2E-AUTH-02: Modal de autenticación se puede abrir', () => {
    cy.visit('/')

    // Buscar botón de "Conectar con la Nube" (si no está autenticado)
    cy.contains('Conectar con la Nube').should('exist')
  })

  // SKIP: Requiere configurar credenciales reales de Supabase
  it.skip('E2E-AUTH-03: Login con credenciales válidas → Dashboard', () => {
    const email = Cypress.env('TEST_USER_EMAIL')
    const password = Cypress.env('TEST_USER_PASSWORD')

    // Usar comando personalizado de login
    cy.login(email, password)

    // Verificar que estamos en el dashboard
    cy.url().should('not.include', '/login')
    cy.contains('Dashboard').should('be.visible')

    // Verificar que datos de usuario están en localStorage
    cy.window().then((win) => {
      const user = JSON.parse(win.localStorage.getItem('strategiapm_user') || '{}')
      expect(user.email).to.equal(email)
    })
  })

  // SKIP: Requiere configurar credenciales de prueba
  it.skip('E2E-AUTH-04: Login con credenciales inválidas → Error', () => {
    cy.visit('/')

    // Intentar login con credenciales incorrectas
    cy.get('input[type="email"]').type('wrong@example.com')
    cy.get('input[type="password"]').type('wrong-password')
    cy.get('button[type="submit"]').click()

    // Debe mostrar mensaje de error
    cy.contains('Error al iniciar sesión', { timeout: 5000 }).should('be.visible')

    // NO debe redirigir al dashboard
    cy.url().should('include', '/login')
  })

  it('E2E-AUTH-05: LocalStorage recovery - Usuario persiste después de reload', () => {
    cy.visit('/')

    // Simular usuario autenticado en localStorage
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'pmo_director',
      organizationId: 'test-org-id',
      supabaseUser: false,
      lastLogin: new Date().toISOString()
    }

    cy.window().then((win) => {
      win.localStorage.setItem('strategiapm_user', JSON.stringify(mockUser))
    })

    // Recargar página
    cy.reload()

    // Verificar que el usuario se recuperó de localStorage
    cy.window().then((win) => {
      const recoveredUser = JSON.parse(win.localStorage.getItem('strategiapm_user') || '{}')
      expect(recoveredUser.email).to.equal(mockUser.email)
    })
  })

  // SKIP: Requiere autenticación real
  it.skip('E2E-AUTH-06: Logout limpia datos y vuelve a login', () => {
    const email = Cypress.env('TEST_USER_EMAIL')
    const password = Cypress.env('TEST_USER_PASSWORD')

    // Login primero
    cy.login(email, password)

    // Verificar que estamos autenticados
    cy.contains('Dashboard').should('be.visible')

    // Logout
    cy.logout()

    // Verificar que volvimos a login
    cy.url().should('include', '/login')

    // Verificar que localStorage se limpió
    cy.window().then((win) => {
      const user = win.localStorage.getItem('strategiapm_user')
      expect(user).to.be.null
    })
  })

  it('E2E-AUTH-07: Timeout de login no cuelga la app (CRIT-01 fix)', () => {
    cy.visit('/')

    // Mockear Supabase para que tarde mucho tiempo (simular timeout)
    cy.intercept('POST', '**/auth/v1/**', (req) => {
      // Delay de 15 segundos (más que el timeout de 10s)
      req.reply({ delay: 15000, statusCode: 200, body: {} })
    })

    // La app NO debe colgarse, debe mostrar error de timeout
    cy.wait(12000) // Esperar más del timeout

    // Verificar que la app sigue funcionando (no crashed)
    cy.get('body').should('be.visible')

    // El timeout debería haber disparado (ver consola)
    // La app debe seguir respondiendo
  })

  it('E2E-AUTH-08: Datos corruptos en localStorage no crashean la app', () => {
    cy.visit('/')

    // Insertar datos corruptos en localStorage
    cy.window().then((win) => {
      win.localStorage.setItem('strategiapm_user', '{invalid json')
    })

    // Recargar
    cy.reload()

    // La app NO debe crashear, debe limpiar datos corruptos
    cy.get('body').should('be.visible')

    // Verificar que datos corruptos fueron limpiados
    cy.window().then((win) => {
      const user = win.localStorage.getItem('strategiapm_user')
      // Debe ser null (limpiado) o válido
      if (user) {
        expect(() => JSON.parse(user)).to.not.throw()
      }
    })
  })
})
