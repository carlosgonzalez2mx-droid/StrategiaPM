const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // URL base de la aplicación
    baseUrl: 'http://localhost:3000',

    // Configuración de viewport (resolución de prueba)
    viewportWidth: 1280,
    viewportHeight: 720,

    // Timeouts
    defaultCommandTimeout: 10000, // 10 segundos para comandos
    pageLoadTimeout: 30000, // 30 segundos para cargar páginas

    // Configuración de video y screenshots
    video: true, // Grabar videos de los tests
    screenshotOnRunFailure: true, // Screenshot cuando falla

    // Carpeta de resultados
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',

    // Patrón de archivos de test
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',

    // Variables de entorno para tests
    env: {
      // Credenciales de prueba (CAMBIAR por reales)
      TEST_USER_EMAIL: 'test@example.com',
      TEST_USER_PASSWORD: 'test-password-123',
    },

    // Configuración de retry (reintentar tests fallidos)
    retries: {
      runMode: 2, // 2 reintentos en CI
      openMode: 0, // 0 reintentos en modo interactivo
    },

    setupNodeEvents(on, config) {
      // Aquí puedes agregar plugins si necesitas
      return config
    },
  },
})
