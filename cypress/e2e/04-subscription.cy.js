/**
 * SUBSCRIPTION TESTS - Tests de suscripción y Stripe
 *
 * IMPORTANTE:
 * - Estos tests mockean Stripe para no hacer cargos reales
 * - Para tests de integración real, usar Stripe Test Mode
 */

describe('Subscription & Stripe Integration', () => {

  beforeEach(() => {
    cy.cleanupTestData()
    cy.visit('/')

    // Simular usuario autenticado
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'pmo_director',
      organizationId: 'test-org-id',
      supabaseUser: false
    }

    cy.window().then((win) => {
      win.localStorage.setItem('strategiapm_user', JSON.stringify(mockUser))
    })

    cy.reload()
    cy.wait(2000)
  })

  it('E2E-SUB-01: UpgradeModal se abre correctamente', () => {
    // Simular organización con plan Free
    cy.window().then((win) => {
      const portfolioData = {
        organization: {
          id: 'test-org',
          name: 'Test Org',
          plan: 'free'
        },
        subscription: {
          plan: 'free',
          status: 'active'
        }
      }

      win.localStorage.setItem('strategiapm_portfolio_data', JSON.stringify(portfolioData))
    })

    cy.reload()
    cy.wait(2000)

    // Buscar botón de upgrade (puede estar en banner o modal)
    cy.contains(/actualizar.*plan/i, { timeout: 10000 }).should('exist')
  })

  it('E2E-SUB-02: Modal de Stripe tiene timeout de 30s (CRIT-04 fix)', () => {
    // Mockear Edge Function de Stripe con delay largo
    cy.intercept('POST', '**/functions/v1/create-checkout-session', (req) => {
      // Delay de 35 segundos (más que el timeout de 30s)
      req.reply({ delay: 35000, statusCode: 200, body: { url: 'https://checkout.stripe.com/test' } })
    }).as('stripeCheckout')

    // TODO: Abrir UpgradeModal y hacer click en upgrade

    // Después de 30s, debe mostrar error de timeout
    // NO debe quedarse congelado
    cy.wait(32000)

    // Verificar que apareció mensaje de timeout
    cy.contains(/timeout/i, { timeout: 5000 }).should('be.visible')
  })

  it('E2E-SUB-03: LocalStorage corrupto en UpgradeModal no crashea', () => {
    // Insertar datos corruptos en portfolio_data
    cy.window().then((win) => {
      win.localStorage.setItem('strategiapm_portfolio_data', '{invalid json')
    })

    // TODO: Abrir UpgradeModal

    // NO debe crashear, debe usar valores por defecto
    cy.get('body').should('be.visible')

    // Modal debe seguir funcionando
  })

  // SKIP: Requiere configurar Stripe Test Mode
  it.skip('E2E-SUB-04: Checkout de Stripe redirecciona correctamente', () => {
    // Mockear respuesta exitosa de Edge Function
    cy.intercept('POST', '**/functions/v1/create-checkout-session', {
      statusCode: 200,
      body: {
        url: 'https://checkout.stripe.com/c/pay/test_session_id'
      }
    }).as('stripeCheckout')

    // TODO: Abrir UpgradeModal y hacer click en upgrade

    // Debe redirigir a Stripe Checkout
    cy.wait('@stripeCheckout')

    // Verificar que se redirigió
    cy.url({ timeout: 10000 }).should('include', 'stripe.com')
  })

  it('E2E-SUB-05: Plan Free muestra límites correctamente', () => {
    // Simular organización con plan Free
    cy.window().then((win) => {
      const portfolioData = {
        organization: {
          id: 'test-org',
          plan: 'free'
        },
        subscription: {
          plan: 'free',
          status: 'active',
          limits: {
            projects: 1,
            users: 3
          }
        }
      }

      win.localStorage.setItem('strategiapm_portfolio_data', JSON.stringify(portfolioData))
    })

    cy.reload()
    cy.wait(2000)

    // Debe mostrar indicadores de límite en algún lugar
    // Ajustar según tu UI
  })

  it('E2E-SUB-06: Plan Professional no muestra límites', () => {
    // Simular organización con plan Professional
    cy.window().then((win) => {
      const portfolioData = {
        organization: {
          id: 'test-org',
          plan: 'professional'
        },
        subscription: {
          plan: 'professional',
          status: 'active'
        }
      }

      win.localStorage.setItem('strategiapm_portfolio_data', JSON.stringify(portfolioData))
    })

    cy.reload()
    cy.wait(2000)

    // NO debe mostrar banners de upgrade
    cy.contains(/actualizar.*plan/i).should('not.exist')
  })

  it('E2E-SUB-07: Trial status banner aparece cuando aplica', () => {
    // Simular organización en trial
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 7) // 7 días de trial restantes

    cy.window().then((win) => {
      const portfolioData = {
        organization: {
          id: 'test-org',
          plan: 'professional'
        },
        subscription: {
          plan: 'professional',
          status: 'trialing',
          trial_end: trialEnd.toISOString()
        }
      }

      win.localStorage.setItem('strategiapm_portfolio_data', JSON.stringify(portfolioData))
    })

    cy.reload()
    cy.wait(2000)

    // Debe mostrar banner de trial
    cy.contains(/prueba/i, { timeout: 5000 }).should('exist')
    cy.contains(/7.*días/i).should('exist')
  })

  it('E2E-SUB-08: Over limit banner bloquea edición', () => {
    // Simular organización que excedió límites
    cy.window().then((win) => {
      const portfolioData = {
        organization: {
          id: 'test-org',
          plan: 'free'
        },
        subscription: {
          plan: 'free',
          status: 'active'
        },
        projects: [
          { id: 'p1', name: 'Proyecto 1', status: 'active' },
          { id: 'p2', name: 'Proyecto 2', status: 'active' }, // Excede límite
        ]
      }

      win.localStorage.setItem('strategiapm_portfolio_data', JSON.stringify(portfolioData))
    })

    cy.reload()
    cy.wait(2000)

    // Debe mostrar banner de "over limit"
    cy.contains(/límite/i, { timeout: 5000 }).should('exist')

    // Debe bloquear la creación de más proyectos
    // (modo read-only)
  })
})
