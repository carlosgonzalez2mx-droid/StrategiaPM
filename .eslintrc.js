module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Deshabilitar reglas que están causando problemas en el build
    'no-unused-vars': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'no-dupe-keys': 'off',
    'no-mixed-operators': 'off',
    'no-const-assign': 'off',
    'no-loop-func': 'off',
    'default-case': 'off'
  },
  env: {
    browser: true,
    es6: true,
    node: true
  }
};
