module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // ===== REGLAS HABILITADAS COMO WARNINGS (NO BLOQUEAN BUILD) =====
    // Esto ayuda a identificar código mejorable sin romper la funcionalidad

    // Variables no usadas - ignorar las que empiezan con _
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }],

    // Dependencias de hooks - advertir pero no bloquear
    'react-hooks/exhaustive-deps': 'warn',

    // Claves duplicadas en objetos - esto puede causar bugs sutiles
    'no-dupe-keys': 'warn', // Mantener como error (bug real)

    // Operadores mixtos - solo advertencia
    'no-mixed-operators': 'warn',

    // Reasignación de const - esto es un error de lógica
    'no-const-assign': 'error', // Mantener como error (bug real)

    // Funciones en loops - advertencia
    'no-loop-func': 'warn',

    // Switch sin default - advertencia
    'default-case': 'warn',

    // ===== REGLAS ADICIONALES RECOMENDADAS =====
    'no-console': ['warn', {
      allow: ['warn', 'error'] // Permitir console.warn y console.error
    }],
    'no-debugger': 'warn',
    'no-alert': 'warn',
  },
  env: {
    browser: true,
    es6: true,
    node: true
  }
};
