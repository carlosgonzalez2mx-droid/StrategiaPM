#!/bin/bash
# Script para corregir duplicados automáticamente usando un enfoque conservador

echo "Corrigiendo duplicados en archivos..."

# Función para eliminar líneas duplicadas en objetos
fix_duplicates() {
    local file=$1
    echo "Procesando: $file"
    
    # Crear backup adicional
    cp "$file" "$file.pre-auto-fix"
    
    # Usar Python para eliminar duplicados de forma inteligente
    python3 << 'PYTHON_SCRIPT'
import re
import sys

def remove_duplicate_keys_in_objects(content):
    """
    Encuentra objetos JavaScript y elimina claves duplicadas,
    manteniendo solo la última ocurrencia (comportamiento de JS)
    """
    lines = content.split('\n')
    result_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        result_lines.append(line)
        
        # Detectar inicio de objeto con setSelectedTask o similar
        if 'setSelectedTask(prev => ({' in line or 'setSelectedTask(prev => {' in line:
            # Recolectar todas las líneas del objeto
            obj_lines = [line]
            brace_count = line.count('{') - line.count('}')
            i += 1
            
            while i < len(lines) and brace_count > 0:
                obj_line = lines[i]
                obj_lines.append(obj_line)
                brace_count += obj_line.count('{') - obj_line.count('}')
                i += 1
            
            # Analizar y eliminar duplicados
            seen_keys = {}
            cleaned_lines = []
            
            for obj_line in obj_lines:
                # Detectar clave de propiedad
                match = re.match(r'(\s*)(\w+):\s*', obj_line)
                if match:
                    indent = match.group(1)
                    key = match.group(2)
                    
                    if key in seen_keys:
                        # Duplicado encontrado - eliminar la línea anterior
                        cleaned_lines = [l for l in cleaned_lines if not (match.group(2) + ':' in l and l.startswith(indent))]
                    
                    seen_keys[key] = obj_line
                    cleaned_lines.append(obj_line)
                else:
                    cleaned_lines.append(obj_line)
            
            result_lines.extend(cleaned_lines[1:])  # Skip first line (already added)
            continue
        
        i += 1
    
    return '\n'.join(result_lines)

# Leer archivo desde stdin
content = sys.stdin.read()
print(remove_duplicate_keys_in_objects(content))
PYTHON_SCRIPT
}

# No ejecutar - solo preparar
echo "Script preparado pero no ejecutado"
echo "Usar enfoque manual más seguro"
