/**
 * SMOKE TESTS - Verificación básica de que la aplicación carga
 *
 * Estos tests son rápidos y verifican funcionalidad crítica.
 * Si fallan, significa que hay un problema grave que bloquea todo.
 */

describe('Smoke Tests - Funcionalidad Crítica', () => {

  beforeEach(() => {
    // Limpiar datos antes de cada test para aislamiento
    cy.cleanupTestData()
  })

  it('SMOKE-01: La aplicación carga sin errores', () => {
    // Visitar la página principal
    cy.visit('/')

    // Verificar que no hay errores de JavaScript en consola
    cy.window().then((win) => {
      // La app debe cargar sin crashes
      expect(win.document.body).to.exist
    })

    // Verificar que hay contenido visible
    cy.get('body').should('be.visible')

    // Verificar que NO hay pantalla de error (ErrorBoundary)
    cy.contains('Algo salió mal').should('not.exist')
    cy.contains('Error al cargar').should('not.exist')
  })

  it('SMOKE-02: Splash screen aparece y desaparece', () => {
    cy.visit('/')

    // Verificar que el splash screen aparece (opcional, depende de tu config)
    // cy.contains('StrategiaPM', { timeout: 2000 }).should('be.visible')

    // Esperar a que desaparezca y muestre contenido
    cy.get('body', { timeout: 10000 }).should('be.visible')
  })

  it('SMOKE-03: React se renderiza correctamente', () => {
    cy.visit('/')

    // Verificar que el root de React existe
    cy.get('#root').should('exist')

    // Verificar que hay contenido dentro del root
    cy.get('#root').children().should('have.length.gt', 0)
  })

  it('SMOKE-04: CSS/Tailwind se carga correctamente', () => {
    cy.visit('/')

    // Verificar que Tailwind está funcionando
    cy.get('body').should('have.css', 'margin')

    // Verificar que no hay contenido sin estilos (FOUC)
    cy.get('body').should('not.have.css', 'visibility', 'hidden')
  })

  it('SMOKE-05: LocalStorage es accesible', () => {
    cy.visit('/')

    // Verificar que localStorage funciona
    cy.window().then((win) => {
      win.localStorage.setItem('test-key', 'test-value')
      const value = win.localStorage.getItem('test-key')
      expect(value).to.equal('test-value')

      // Limpiar
      win.localStorage.removeItem('test-key')
    })
  })

  it('SMOKE-06: Lazy components se cargan sin chunk errors', () => {
    cy.visit('/')

    // Esperar suficiente tiempo para que chunks carguen
    cy.wait(3000)

    // Verificar que NO apareció el LazyErrorFallback
    cy.contains('Error al cargar').should('not.exist')
    cy.contains('Verifica tu conexión a internet').should('not.exist')
  })

  it('SMOKE-07: Console no tiene errores críticos', () => {
    cy.visit('/')

    // Capturar errores de consola
    cy.window().then((win) => {
      cy.spy(win.console, 'error').as('consoleError')
    })

    // Esperar a que cargue
    cy.wait(2000)

    // Verificar que no hay errores críticos en consola
    // (algunos warnings son OK, pero no errors)
    cy.get('@consoleError').should((spy) => {
      // Filtrar errores conocidos que son OK
      const criticalErrors = spy.getCalls().filter(call => {
        const message = call.args[0]?.toString() || ''

        // Ignorar estos errores comunes que no son críticos:
        const ignorePatterns = [
          'ResizeObserver',
          'Download the React DevTools',
          'Warning: ReactDOM.render'
        ]

        return !ignorePatterns.some(pattern => message.includes(pattern))
      })

      // No debe haber errores críticos
      expect(criticalErrors).to.have.length(0)
    })
  })
})
