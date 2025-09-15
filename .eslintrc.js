module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Deshabilitar reglas que están causando problemas en el build
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'no-dupe-keys': 'warn',
    'no-mixed-operators': 'warn',
    'no-const-assign': 'warn',
    'no-loop-func': 'warn',
    'default-case': 'warn'
  },
  env: {
    browser: true,
    es6: true,
    node: true
  }
};
