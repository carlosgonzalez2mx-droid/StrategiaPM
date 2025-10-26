#!/bin/bash

# 🚀 Script de Deploy Automático para StrategiaPM
# Este script te ayuda a desplegar tu aplicación en Vercel

echo "🚀 Iniciando deploy de StrategiaPM..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

print_status "Verificando que la aplicación funciona localmente..."

# Verificar que no hay errores de compilación
print_status "Ejecutando npm run build..."
if npm run build; then
    print_success "Build exitoso ✅"
else
    print_error "Error en el build. Por favor, corrige los errores antes de continuar."
    exit 1
fi

# Verificar que Vercel CLI está instalado
print_status "Verificando Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI no está instalado. Instalando..."
    npm install -g vercel
    if [ $? -eq 0 ]; then
        print_success "Vercel CLI instalado exitosamente ✅"
    else
        print_error "Error instalando Vercel CLI. Por favor, instálalo manualmente: npm install -g vercel"
        exit 1
    fi
else
    print_success "Vercel CLI ya está instalado ✅"
fi

# Verificar autenticación con Vercel
print_status "Verificando autenticación con Vercel..."
if vercel whoami &> /dev/null; then
    print_success "Autenticado con Vercel ✅"
else
    print_warning "No estás autenticado con Vercel. Iniciando proceso de autenticación..."
    vercel login
    if [ $? -eq 0 ]; then
        print_success "Autenticación exitosa ✅"
    else
        print_error "Error en la autenticación. Por favor, inténtalo de nuevo."
        exit 1
    fi
fi

# Hacer deploy
print_status "Iniciando deploy en Vercel..."
if vercel --prod; then
    print_success "Deploy exitoso ✅"
    print_success "Tu aplicación está ahora disponible en internet!"
    print_status "Puedes ver la URL en el output anterior."
else
    print_error "Error en el deploy. Por favor, revisa los logs y inténtalo de nuevo."
    exit 1
fi

print_success "🎉 ¡Deploy completado exitosamente!"
print_status "Ahora puedes compartir la URL con otros usuarios."
print_status "Recuerda ejecutar el script SQL en Supabase para habilitar la colaboración."
