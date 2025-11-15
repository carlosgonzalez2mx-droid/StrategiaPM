#!/bin/bash

# Script para crear el Pull Request automáticamente
# Ejecuta: bash create-pr-now.sh

set -e

echo "🚀 Creando Pull Request..."
echo ""

# Verificar que estamos en el branch correcto
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "claude/review-application-01PJXeDFUBVADBqr8QW3Y8de" ]; then
    echo "❌ Error: No estás en el branch correcto"
    echo "   Branch actual: $CURRENT_BRANCH"
    echo "   Branch esperado: claude/review-application-01PJXeDFUBVADBqr8QW3Y8de"
    exit 1
fi

echo "✅ Branch correcto: $CURRENT_BRANCH"
echo ""

# Verificar que todo está pusheado
if git status --porcelain | grep -q .; then
    echo "❌ Error: Hay cambios sin commitear"
    git status
    exit 1
fi

echo "✅ No hay cambios pendientes"
echo ""

# Intentar crear PR con gh CLI
if command -v gh &> /dev/null; then
    echo "📝 Creando PR con GitHub CLI..."

    gh pr create \
        --title "🔒 Migración de Claves a Variables de Entorno + Documentación Completa" \
        --body-file PR_DESCRIPTION.md \
        --base main \
        --head claude/review-application-01PJXeDFUBVADBqr8QW3Y8de \
        --label security,documentation,enhancement

    echo ""
    echo "✅ Pull Request creado exitosamente!"
    echo ""
    echo "Ver PR:"
    gh pr view --web
else
    echo "⚠️  GitHub CLI no disponible"
    echo ""
    echo "📋 Abre esta URL en tu navegador para crear el PR:"
    echo ""
    echo "https://github.com/carlosgonzalez2mx-droid/StrategiaPM/compare/main...claude/review-application-01PJXeDFUBVADBqr8QW3Y8de?expand=1&title=%F0%9F%94%92%20Migraci%C3%B3n%20de%20Claves%20a%20Variables%20de%20Entorno%20%2B%20Documentaci%C3%B3n%20Completa"
    echo ""
    echo "El título y descripción ya están preparados en PR_DESCRIPTION.md"
    echo ""

    # Intentar abrir en navegador
    if command -v xdg-open &> /dev/null; then
        echo "🌐 Abriendo en navegador..."
        xdg-open "https://github.com/carlosgonzalez2mx-droid/StrategiaPM/compare/main...claude/review-application-01PJXeDFUBVADBqr8QW3Y8de?expand=1" 2>/dev/null || true
    elif command -v open &> /dev/null; then
        echo "🌐 Abriendo en navegador..."
        open "https://github.com/carlosgonzalez2mx-droid/StrategiaPM/compare/main...claude/review-application-01PJXeDFUBVADBqr8QW3Y8de?expand=1" 2>/dev/null || true
    fi
fi

echo ""
echo "=========================="
echo "✅ Todo listo para el PR"
echo "=========================="
