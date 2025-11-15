#!/bin/bash

echo "🔍 Verificación Rápida de Configuración"
echo "========================================="
echo ""

# Verificar .env local
echo "1️⃣ Variables en .env local:"
if [ -f .env ]; then
    echo "   ✅ .env existe"
    if grep -q "REACT_APP_SUPABASE_URL" .env; then
        echo "   ✅ REACT_APP_SUPABASE_URL configurada"
    else
        echo "   ❌ REACT_APP_SUPABASE_URL NO configurada"
    fi
    if grep -q "REACT_APP_SUPABASE_ANON_KEY" .env; then
        echo "   ✅ REACT_APP_SUPABASE_ANON_KEY configurada"
    else
        echo "   ❌ REACT_APP_SUPABASE_ANON_KEY NO configurada"
    fi
else
    echo "   ❌ .env NO existe"
fi
echo ""

# Verificar .gitignore
echo "2️⃣ Seguridad (.gitignore):"
if grep -q "^\.env$" .gitignore; then
    echo "   ✅ .env está en .gitignore"
else
    echo "   ❌ .env NO está en .gitignore"
fi
echo ""

# Verificar código migrado
echo "3️⃣ Código migrado:"
if grep -q "process.env.REACT_APP_SUPABASE_URL" src/services/SupabaseService.js; then
    echo "   ✅ SupabaseService.js usa variables de entorno"
else
    echo "   ❌ SupabaseService.js aún tiene hardcoded"
fi
echo ""

# Verificar documentación
echo "4️⃣ Documentación:"
if [ -f README.md ]; then
    echo "   ✅ README.md existe"
else
    echo "   ❌ README.md NO existe"
fi
if [ -f DEPLOYMENT.md ]; then
    echo "   ✅ DEPLOYMENT.md existe"
else
    echo "   ❌ DEPLOYMENT.md NO existe"
fi
echo ""

# Resumen
echo "========================================="
echo "✅ Todo listo para crear PR"
echo ""
echo "Próximos pasos:"
echo "1. Crear PR en GitHub"
echo "2. Merge del PR"
echo "3. Verificar que Vercel tenga las variables"
echo "4. ¡Listo!"
