#!/bin/bash
# =====================================================
# PREPARADOR DE SCRIPTS SQL PARA SUPABASE
# =====================================================

echo "🚀 PREPARANDO SCRIPTS SQL PARA SUPABASE"
echo "======================================================="
echo ""

# Directorio de scripts
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Crear directorio de salida
OUTPUT_DIR="$SCRIPT_DIR/ready-to-execute"
mkdir -p "$OUTPUT_DIR"

echo "📁 Directorio de trabajo: $SCRIPT_DIR"
echo "📁 Directorio de salida: $OUTPUT_DIR"
echo ""

# Lista de scripts en orden
SCRIPTS=(
  "diagnose-user-sync-issues.sql"
  "fix-user-sync-issues.sql"
  "create-sync-triggers.sql"
  "health-check-user-sync.sql"
)

# Copiar scripts al directorio de salida
echo "📋 Preparando scripts para ejecución..."
echo ""

for i in "${!SCRIPTS[@]}"; do
  script="${SCRIPTS[$i]}"
  num=$((i + 1))
  
  if [ -f "$SCRIPT_DIR/$script" ]; then
    # Copiar con prefijo numérico
    cp "$SCRIPT_DIR/$script" "$OUTPUT_DIR/${num}-$script"
    echo "✅ [$num/4] $script"
  else
    echo "❌ [$num/4] $script - NO ENCONTRADO"
  fi
done

echo ""
echo "======================================================="
echo "✅ SCRIPTS PREPARADOS"
echo "======================================================="
echo ""
echo "📁 Ubicación: $OUTPUT_DIR"
echo ""
echo "📖 INSTRUCCIONES PARA EJECUTAR EN SUPABASE:"
echo ""
echo "1. Abre tu proyecto en Supabase:"
echo "   https://supabase.com/dashboard"
echo ""
echo "2. Ve a SQL Editor:"
echo "   https://supabase.com/dashboard/project/_/sql/new"
echo ""
echo "3. Ejecuta los scripts en este orden:"
echo ""

for i in "${!SCRIPTS[@]}"; do
  script="${SCRIPTS[$i]}"
  num=$((i + 1))
  
  case $script in
    "diagnose-user-sync-issues.sql")
      desc="Diagnóstico de inconsistencias"
      ;;
    "fix-user-sync-issues.sql")
      desc="Reparación y sincronización de usuarios"
      ;;
    "create-sync-triggers.sql")
      desc="Triggers automáticos de sincronización"
      ;;
    "health-check-user-sync.sql")
      desc="Verificación de salud del sistema"
      ;;
  esac
  
  echo "   $num. ${num}-$script"
  echo "      → $desc"
  echo ""
done

echo "4. Copia el contenido de cada archivo"
echo "5. Pégalo en el SQL Editor de Supabase"
echo "6. Haz clic en 'Run' o presiona Ctrl+Enter"
echo "7. Verifica los resultados"
echo ""
echo "======================================================="
echo "🎯 SIGUIENTE PASO:"
echo "   Abre la carpeta: $OUTPUT_DIR"
echo "======================================================="
echo ""

