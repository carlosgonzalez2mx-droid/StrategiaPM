# 🧪 Tests E2E - StrategiaPM

Tests end-to-end automatizados usando **Cypress** para verificar funcionalidad crítica de la aplicación.

---

## 📋 Tabla de Contenidos

- [Instalación](#instalación)
- [Ejecutar Tests](#ejecutar-tests)
- [Estructura de Tests](#estructura-de-tests)
- [Tests Disponibles](#tests-disponibles)
- [Configuración](#configuración)
- [Tips y Mejores Prácticas](#tips-y-mejores-prácticas)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Instalación

### 1. Instalar Cypress

```bash
# En la raíz del proyecto
npm install --save-dev cypress@13.6.4
```

### 2. Verificar instalación

```bash
npx cypress verify
```

Deberías ver:
```
✅ Verified Cypress!
```

---

## ▶️ Ejecutar Tests

### Modo Interactivo (Recomendado para desarrollo)

```bash
# Abrir Cypress Test Runner
npm run test:e2e

# O directamente
npx cypress open
```

Esto abre una ventana donde puedes:
- ✅ Ver todos los tests disponibles
- ✅ Ejecutar tests individualmente
- ✅ Ver tests en tiempo real
- ✅ Debuggear fácilmente

### Modo Headless (Para CI/CD)

```bash
# Ejecutar todos los tests sin UI
npm run test:e2e:ci

# O directamente
npx cypress run
```

### Ejecutar un test específico

```bash
# Solo smoke tests
npx cypress run --spec "cypress/e2e/01-smoke.cy.js"

# Solo authentication tests
npx cypress run --spec "cypress/e2e/02-authentication.cy.js"
```

---

## 📁 Estructura de Tests

```
cypress/
├── e2e/                          # Tests end-to-end
│   ├── 01-smoke.cy.js            # ✅ Tests básicos (app carga)
│   ├── 02-authentication.cy.js   # 🔐 Tests de login/logout
│   ├── 03-projects.cy.js         # 📂 Tests de CRUD de proyectos
│   └── 04-subscription.cy.js     # 💳 Tests de Stripe/suscripción
├── fixtures/                     # Datos de ejemplo para tests
│   └── example-project.json      # Proyecto de ejemplo
├── support/                      # Archivos de soporte
│   ├── commands.js               # Comandos personalizados
│   └── e2e.js                    # Configuración global
├── screenshots/                  # Screenshots de tests fallidos
└── videos/                       # Videos de ejecución de tests
```

---

## 🧪 Tests Disponibles

### 1. Smoke Tests (01-smoke.cy.js)

**Propósito:** Verificar que la app carga sin crashear

**Tests incluidos:**
- ✅ SMOKE-01: App carga sin errores
- ✅ SMOKE-02: Splash screen funciona
- ✅ SMOKE-03: React se renderiza
- ✅ SMOKE-04: CSS/Tailwind carga
- ✅ SMOKE-05: LocalStorage funciona
- ✅ SMOKE-06: Lazy components cargan
- ✅ SMOKE-07: No hay errores críticos en consola

**Tiempo estimado:** ~30 segundos

---

### 2. Authentication Tests (02-authentication.cy.js)

**Propósito:** Verificar flujo de login/logout y recuperación de sesión

**Tests incluidos:**
- ✅ E2E-AUTH-01: App carga sin login obligatorio
- ✅ E2E-AUTH-02: Modal de auth se abre
- ⏸️ E2E-AUTH-03: Login válido (SKIP - requiere credenciales)
- ⏸️ E2E-AUTH-04: Login inválido muestra error (SKIP)
- ✅ E2E-AUTH-05: Usuario persiste en localStorage
- ⏸️ E2E-AUTH-06: Logout limpia datos (SKIP)
- ✅ E2E-AUTH-07: Timeout de login no cuelga app (CRIT-01 fix)
- ✅ E2E-AUTH-08: Datos corruptos no crashean

**Tiempo estimado:** ~1 minuto

**Nota:** Algunos tests están en `skip` hasta configurar credenciales reales.

---

### 3. Projects Tests (03-projects.cy.js)

**Propósito:** Verificar CRUD de proyectos

**Tests incluidos:**
- ✅ E2E-PROJ-01: Navegar a Portafolio
- ✅ E2E-PROJ-02: Modal de crear proyecto se abre
- ⏸️ E2E-PROJ-03: Crear proyecto funciona (SKIP - requiere UI)
- ✅ E2E-PROJ-04: LocalStorage guarda proyectos
- ⏸️ E2E-PROJ-05: Plan Free bloquea 2do proyecto (SKIP)
- ✅ E2E-PROJ-06: Fail-closed previene bypass (CRIT-03 fix)
- ✅ E2E-PROJ-07: Progress auto-calculado

**Tiempo estimado:** ~1 minuto

---

### 4. Subscription Tests (04-subscription.cy.js)

**Propósito:** Verificar integración con Stripe y suscripciones

**Tests incluidos:**
- ✅ E2E-SUB-01: UpgradeModal se abre
- ✅ E2E-SUB-02: Timeout de Stripe 30s (CRIT-04 fix)
- ✅ E2E-SUB-03: LocalStorage corrupto no crashea
- ⏸️ E2E-SUB-04: Checkout redirecciona (SKIP)
- ✅ E2E-SUB-05: Plan Free muestra límites
- ✅ E2E-SUB-06: Plan Professional sin límites
- ✅ E2E-SUB-07: Trial status banner
- ✅ E2E-SUB-08: Over limit banner

**Tiempo estimado:** ~1-2 minutos

---

## ⚙️ Configuración

### Variables de Entorno

Editar `cypress.config.js`:

```javascript
env: {
  TEST_USER_EMAIL: 'tu-email-de-prueba@example.com',
  TEST_USER_PASSWORD: 'tu-password-de-prueba',
}
```

### Base URL

Por defecto: `http://localhost:3000`

Para cambiar, editar `cypress.config.js`:

```javascript
e2e: {
  baseUrl: 'https://tu-app-en-staging.com',
}
```

### Credenciales de Supabase Test

Para ejecutar tests con Supabase real:

1. Crear cuenta de prueba en Supabase
2. Configurar variables en `cypress.config.js`
3. Descomentar tests marcados como `skip`

---

## 💡 Tips y Mejores Prácticas

### 1. Ejecutar tests antes de commits

```bash
# Agregar a tu workflow
npm run test:e2e:ci
git add .
git commit -m "feature: ..."
```

### 2. Debuggear tests fallidos

- Revisar screenshots en `cypress/screenshots/`
- Revisar videos en `cypress/videos/`
- Usar `cy.pause()` para detener ejecución

### 3. Comandos personalizados

Ya disponibles en `cypress/support/commands.js`:

```javascript
// Login rápido
cy.login('email@example.com', 'password')

// Crear proyecto
cy.createProject('Mi Proyecto', { budget: 50000 })

// Limpiar datos
cy.cleanupTestData()

// Mockear Supabase
cy.mockSupabaseAuth({ email: 'mock@test.com' })
```

### 4. Fixtures para datos de prueba

```javascript
// Cargar datos de ejemplo
cy.fixture('example-project').then((project) => {
  // Usar project en tu test
})
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'cypress'"

```bash
npm install --save-dev cypress
```

### Tests fallan en CI pero pasan local

- Verificar URL base
- Verificar timeouts (aumentar si red es lenta)
- Verificar variables de entorno

### "Timed out waiting for element"

- Aumentar timeout en `cypress.config.js`
- Verificar que selectores son correctos
- Usar `{ timeout: 10000 }` en comandos específicos

### Videos/Screenshots no se generan

- Verificar permisos de carpeta
- Verificar configuración en `cypress.config.js`

---

## 📊 Cobertura Actual

| Categoría | Tests Totales | Tests Activos | Cobertura |
|-----------|---------------|---------------|-----------|
| Smoke | 7 | 7 | 100% |
| Authentication | 8 | 5 | 62% |
| Projects | 7 | 4 | 57% |
| Subscription | 8 | 6 | 75% |
| **TOTAL** | **30** | **22** | **73%** |

**Nota:** Tests en `skip` requieren configuración adicional (credenciales, Supabase test, etc.)

---

## 🎯 Próximos Pasos

1. ✅ Instalar Cypress localmente
2. ✅ Ejecutar smoke tests
3. ⏳ Configurar credenciales de prueba
4. ⏳ Habilitar tests con `skip`
5. ⏳ Agregar tests de cronograma (CPM, Excel import)
6. ⏳ Integrar con CI/CD (GitHub Actions)

---

## 📞 Soporte

Si tienes problemas con los tests:

1. Revisar [Cypress Docs](https://docs.cypress.io)
2. Revisar logs en `cypress/screenshots/` y `cypress/videos/`
3. Ejecutar en modo interactivo para debuggear

---

**Última actualización:** 2025-11-15
**Versión de Cypress:** 13.6.4
**Autor:** Claude AI (Setup inicial)
