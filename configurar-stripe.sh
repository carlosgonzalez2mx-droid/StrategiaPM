#!/bin/bash

# ================================================================
# Script Simplificado para Configurar Stripe
# ================================================================

echo "🔧 Configuración de Stripe para StrategiaPM"
echo "============================================"
echo ""

# Primero obtén tu Stripe Secret Key
echo "📋 Paso 1: Obtén tu Stripe Secret Key"
echo ""
echo "   1. Ve a: https://dashboard.stripe.com/test/apikeys"
echo "   2. Haz click en 'Reveal test key' en la sección 'Secret key'"
echo "   3. Copia la clave (empieza con sk_test_...)"
echo ""
echo "Cuando tengas la clave, presiona Enter para continuar..."
read -p ""

# Solicitar la clave
echo ""
read -p "Pega tu Stripe Secret Key aquí: " STRIPE_SECRET_KEY
echo ""

# Validar que no esté vacía
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ No se proporcionó ninguna clave. Abortando."
    exit 1
fi

# Validar formato
if [[ ! $STRIPE_SECRET_KEY == sk_test_* ]] && [[ ! $STRIPE_SECRET_KEY == sk_live_* ]]; then
    echo "❌ La clave no parece válida (debe empezar con sk_test_ o sk_live_)"
    exit 1
fi

echo "✅ Clave válida detectada"
echo ""

# Configurar el secret
echo "📋 Configurando secret en Supabase..."
/opt/homebrew/bin/supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
echo ""

# Verificar
echo "📋 Verificando secrets configurados..."
/opt/homebrew/bin/supabase secrets list
echo ""

# Desplegar funciones
echo "📋 Desplegando Edge Functions..."
echo ""
/opt/homebrew/bin/supabase functions deploy create-checkout-session
echo ""
/opt/homebrew/bin/supabase functions deploy stripe-webhook
echo ""

echo "✅ ¡Configuración completada!"
echo ""
echo "🧪 Ahora puedes probar:"
echo "   1. Abre tu app: npm start"
echo "   2. Intenta hacer upgrade al Plan Professional"
echo "   3. Deberías ser redirigido a Stripe Checkout"
echo ""
echo "📊 Para ver logs en tiempo real:"
echo "   /opt/homebrew/bin/supabase functions logs create-checkout-session --tail"
echo ""
