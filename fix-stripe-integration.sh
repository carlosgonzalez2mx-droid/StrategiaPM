#!/bin/bash

# ================================================================
# Script para Solucionar Integración de Stripe con Supabase
# ================================================================

set -e  # Salir si hay errores

echo "🔧 Fix Stripe Integration - StrategiaPM"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_REF="ogqpsrsssrrytrqoyyph"
SUPABASE_BIN="/opt/homebrew/bin/supabase"

echo -e "${BLUE}📋 Paso 1: Verificando Supabase CLI${NC}"
if ! command -v $SUPABASE_BIN &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI no encontrado${NC}"
    echo "Instalando..."
    /opt/homebrew/bin/brew install supabase/tap/supabase
else
    echo -e "${GREEN}✓ Supabase CLI encontrado: $($SUPABASE_BIN --version)${NC}"
fi
echo ""

echo -e "${BLUE}📋 Paso 2: Login en Supabase${NC}"
echo "Por favor, completa el login en tu navegador..."
$SUPABASE_BIN login || {
    echo -e "${YELLOW}⚠️  Si ya estás logueado, esto es normal${NC}"
}
echo ""

echo -e "${BLUE}📋 Paso 3: Linking proyecto${NC}"
$SUPABASE_BIN link --project-ref $PROJECT_REF || {
    echo -e "${YELLOW}⚠️  Si ya está linked, esto es normal${NC}"
}
echo ""

echo -e "${BLUE}📋 Paso 4: Configurar Stripe Secret Key${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Necesitas tu Stripe Secret Key${NC}"
echo "   1. Ve a: https://dashboard.stripe.com/test/apikeys"
echo "   2. Copia tu 'Secret key' (empieza con sk_test_...)"
echo ""
read -p "Pega tu Stripe Secret Key aquí: " STRIPE_SECRET_KEY
echo ""

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo -e "${RED}❌ No se proporcionó Secret Key. Abortando.${NC}"
    exit 1
fi

if [[ ! $STRIPE_SECRET_KEY == sk_test_* ]] && [[ ! $STRIPE_SECRET_KEY == sk_live_* ]]; then
    echo -e "${RED}❌ La clave no parece ser válida (debe empezar con sk_test_ o sk_live_)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configurando STRIPE_SECRET_KEY...${NC}"
$SUPABASE_BIN secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
echo ""

echo -e "${BLUE}📋 Paso 5: Verificar secrets configurados${NC}"
$SUPABASE_BIN secrets list
echo ""

echo -e "${BLUE}📋 Paso 6: Desplegando Edge Functions${NC}"
echo ""
echo "Desplegando create-checkout-session..."
$SUPABASE_BIN functions deploy create-checkout-session
echo ""
echo "Desplegando stripe-webhook..."
$SUPABASE_BIN functions deploy stripe-webhook
echo ""

echo -e "${GREEN}✅ ¡Configuración completada!${NC}"
echo ""
echo -e "${BLUE}📊 Para ver logs en tiempo real:${NC}"
echo "   $SUPABASE_BIN functions logs create-checkout-session --tail"
echo ""
echo -e "${BLUE}🧪 Ahora puedes:${NC}"
echo "   1. Abrir tu aplicación en localhost:3000"
echo "   2. Intentar hacer upgrade al Plan Professional"
echo "   3. Deberías ser redirigido a Stripe Checkout"
echo ""
echo -e "${YELLOW}⚠️  Si aún hay errores, ejecuta los logs y envía el output:${NC}"
echo "   $SUPABASE_BIN functions logs create-checkout-session"
echo ""
