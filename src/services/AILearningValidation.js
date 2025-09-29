// =====================================================
// AI LEARNING VALIDATION SERVICE
// Servicio para validaciones y fallbacks de seguridad
// =====================================================

class AILearningValidation {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    this.allowedExtensions = ['.xlsx', '.xls'];
    this.maxTasksPerFile = 500;
    this.maxProjectsPerOrganization = 1000;
  }

  /**
   * Validar archivo antes de procesarlo
   */
  validateFile(file) {
    const errors = [];

    // Validar tamaño
    if (file.size > this.maxFileSize) {
      errors.push(`El archivo es demasiado grande. Máximo permitido: ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Validar tipo MIME
    if (!this.allowedMimeTypes.includes(file.type)) {
      errors.push('Tipo de archivo no soportado. Solo se permiten archivos Excel (.xlsx, .xls)');
    }

    // Validar extensión
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!this.allowedExtensions.includes(fileExtension)) {
      errors.push('Extensión de archivo no válida. Solo se permiten .xlsx y .xls');
    }

    // Validar nombre
    if (file.name.length > 255) {
      errors.push('El nombre del archivo es demasiado largo');
    }

    // Validar caracteres especiales en nombre
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(file.name)) {
      errors.push('El nombre del archivo contiene caracteres no válidos');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validar datos extraídos del Excel
   */
  validateExtractedData(data, fileName) {
    console.log('🔍 DEBUG - Validando datos extraídos:', {
      fileName,
      dataLength: data?.length,
      dataType: typeof data,
      isArray: Array.isArray(data)
    });

    const errors = [];
    const warnings = [];

    // Validar que hay datos
    if (!data || !Array.isArray(data)) {
      errors.push('No se encontraron datos válidos en el archivo');
      return { isValid: false, errors, warnings };
    }

    // Validar número de filas
    if (data.length < 2) {
      errors.push('El archivo debe tener al menos una fila de headers y una fila de datos');
    }

    if (data.length > this.maxTasksPerFile) {
      errors.push(`Demasiadas tareas en el archivo. Máximo permitido: ${this.maxTasksPerFile}`);
    }

    // Validar headers
    const headers = this.findHeaders(data);
    if (!headers || Object.keys(headers).length < 2) {
      errors.push('No se encontraron headers válidos (se requieren al menos: Tarea, Duración)');
      console.log('❌ Headers no encontrados. Datos de muestra:', {
        firstRows: data.slice(0, 3).map((row, index) => ({
          rowIndex: index,
          cells: row?.slice(0, 10) || []
        }))
      });
    }

    // Validar contenido de datos
    const tasks = this.extractTasksFromData(data, headers);
    
    if (tasks.length === 0) {
      errors.push('No se encontraron tareas válidas en el archivo');
      console.log('❌ No se extrajeron tareas válidas. Headers encontrados:', headers);
    }

    // Validar tareas individuales
    tasks.forEach((task, index) => {
      if (!task.name || task.name.trim().length === 0) {
        errors.push(`Tarea en fila ${index + 2}: Nombre vacío o inválido`);
      }

      if (task.name && task.name.length > 255) {
        errors.push(`Tarea en fila ${index + 2}: Nombre demasiado largo (máximo 255 caracteres)`);
      }

      if (task.duration && (task.duration < 0 || task.duration > 365)) {
        warnings.push(`Tarea en fila ${index + 2}: Duración inusual (${task.duration} días)`);
      }

      if (task.startDate && !this.isValidDate(task.startDate)) {
        warnings.push(`Tarea en fila ${index + 2}: Fecha de inicio inválida`);
      }

      if (task.endDate && !this.isValidDate(task.endDate)) {
        warnings.push(`Tarea en fila ${index + 2}: Fecha de fin inválida`);
      }
    });

    console.log('🔍 DEBUG - Resultado de validación:', {
      isValid: errors.length === 0,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      tasksCount: tasks.length,
      headersCount: headers ? Object.keys(headers).length : 0
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalRows: data.length,
        validTasks: tasks.length,
        headersFound: headers ? Object.keys(headers).length : 0
      }
    };
  }

  /**
   * Validar patrones extraídos
   */
  validateExtractedPatterns(patterns, fileName) {
    const errors = [];
    const warnings = [];

    if (!patterns || typeof patterns !== 'object') {
      errors.push('Patrones extraídos no válidos');
      return { isValid: false, errors, warnings };
    }

    // Validar estructura de fases
    if (patterns.phaseStructure) {
      const { phases, phaseOrder, phaseDurations } = patterns.phaseStructure;
      
      if (phases && phases.length > 20) {
        warnings.push('Número inusual de fases detectadas');
      }

      if (phaseDurations) {
        Object.entries(phaseDurations).forEach(([phase, stats]) => {
          if (stats.avg > 365) {
            warnings.push(`Fase "${phase}": Duración promedio muy larga (${stats.avg} días)`);
          }
        });
      }
    }

    // Validar patrones de duración
    if (patterns.durationPatterns) {
      const { activityTypes, milestoneSpacing } = patterns.durationPatterns;
      
      if (activityTypes) {
        Object.entries(activityTypes).forEach(([type, stats]) => {
          if (stats.avg > 100) {
            warnings.push(`Actividad "${type}": Duración promedio muy larga (${stats.avg} días)`);
          }
        });
      }

      if (milestoneSpacing && milestoneSpacing.avgDaysBetween > 90) {
        warnings.push('Espaciado promedio entre hitos muy largo');
      }
    }

    // Validar metadatos
    if (patterns.metadata) {
      const { totalTasks, totalMilestones, projectDuration } = patterns.metadata;
      
      if (totalTasks > 200) {
        warnings.push('Número alto de tareas detectado');
      }

      if (projectDuration > 1095) { // 3 años
        warnings.push('Duración del proyecto muy larga (más de 3 años)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validar límites de organización
   */
  async validateOrganizationLimits(organizationId, supabase) {
    try {
      if (!supabase || !organizationId) {
        return { isValid: true, warnings: [] };
      }

      // Contar patrones existentes
      const { count: patternCount } = await supabase
        .from('ai_learning_patterns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const warnings = [];

      if (patternCount >= this.maxProjectsPerOrganization) {
        warnings.push('Límite de patrones de aprendizaje alcanzado para la organización');
      }

      if (patternCount > this.maxProjectsPerOrganization * 0.8) {
        warnings.push('Cerca del límite de patrones de aprendizaje');
      }

      return {
        isValid: patternCount < this.maxProjectsPerOrganization,
        warnings,
        currentCount: patternCount,
        maxAllowed: this.maxProjectsPerOrganization
      };

    } catch (error) {
      console.error('Error validando límites de organización:', error);
      return {
        isValid: true,
        warnings: ['No se pudieron validar los límites de la organización']
      };
    }
  }

  /**
   * Sanitizar datos antes de guardar
   */
  sanitizePatternData(patterns) {
    const sanitized = JSON.parse(JSON.stringify(patterns)); // Deep clone

    // Sanitizar nombres de fases
    if (sanitized.phaseStructure && sanitized.phaseStructure.phases) {
      sanitized.phaseStructure.phases = sanitized.phaseStructure.phases.map(phase => 
        this.sanitizeString(phase, 50)
      );
    }

    // Sanitizar nombres de actividades
    if (sanitized.durationPatterns && sanitized.durationPatterns.activityTypes) {
      const sanitizedTypes = {};
      Object.entries(sanitized.durationPatterns.activityTypes).forEach(([type, stats]) => {
        const sanitizedType = this.sanitizeString(type, 50);
        sanitizedTypes[sanitizedType] = stats;
      });
      sanitized.durationPatterns.activityTypes = sanitizedTypes;
    }

    // Sanitizar convenciones de nomenclatura
    if (sanitized.namingConventions) {
      if (sanitized.namingConventions.activityPrefixes) {
        sanitized.namingConventions.activityPrefixes = sanitized.namingConventions.activityPrefixes
          .map(prefix => this.sanitizeString(prefix, 30));
      }
      
      if (sanitized.namingConventions.milestonePrefixes) {
        sanitized.namingConventions.milestonePrefixes = sanitized.namingConventions.milestonePrefixes
          .map(prefix => this.sanitizeString(prefix, 30));
      }
      
      if (sanitized.namingConventions.commonTerms) {
        sanitized.namingConventions.commonTerms = sanitized.namingConventions.commonTerms
          .map(term => this.sanitizeString(term, 50));
      }
    }

    // Limitar números excesivos
    if (sanitized.metadata) {
      sanitized.metadata.totalTasks = Math.min(sanitized.metadata.totalTasks || 0, 1000);
      sanitized.metadata.totalMilestones = Math.min(sanitized.metadata.totalMilestones || 0, 100);
      sanitized.metadata.projectDuration = Math.min(sanitized.metadata.projectDuration || 0, 3650); // 10 años max
    }

    return sanitized;
  }

  /**
   * Sanitizar string
   */
  sanitizeString(str, maxLength = 255) {
    if (!str || typeof str !== 'string') return '';
    
    return str
      .trim()
      .substring(0, maxLength)
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remover caracteres peligrosos
      .replace(/\s+/g, ' '); // Normalizar espacios
  }

  /**
   * Validar fecha
   */
  isValidDate(dateString) {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100;
  }

  /**
   * Encontrar headers en datos (mejorado)
   */
  findHeaders(data) {
    console.log('🔍 DEBUG - Buscando headers en archivo Excel:', {
      totalRows: data.length,
      firstRows: data.slice(0, 5).map((row, index) => ({
        rowIndex: index,
        cells: row?.slice(0, 10) || []
      }))
    });

    // Implementación mejorada con más variaciones de headers
    for (let rowIndex = 0; rowIndex < Math.min(data.length, 10); rowIndex++) {
      const row = data[rowIndex];
      if (!row || !Array.isArray(row)) continue;

      const headers = {};
      let matchCount = 0;

      row.forEach((cell, colIndex) => {
        if (!cell || typeof cell !== 'string') return;

        const cellLower = cell.toLowerCase().trim();
        
        // Patrones más amplios para nombres de tareas
        if (cellLower.includes('tarea') || cellLower.includes('task') || 
            cellLower.includes('actividad') || cellLower.includes('activity') ||
            cellLower.includes('descripción') || cellLower.includes('description') ||
            cellLower.includes('nombre') || cellLower.includes('name') ||
            cellLower.includes('item') || cellLower.includes('elemento')) {
          headers.name = { index: colIndex, value: cell };
          matchCount++;
        } 
        // Patrones más amplios para duración
        else if (cellLower.includes('duración') || cellLower.includes('duration') || 
                 cellLower.includes('días') || cellLower.includes('days') ||
                 cellLower.includes('tiempo') || cellLower.includes('time') ||
                 cellLower.includes('dias') || cellLower.includes('dias laborales')) {
          headers.duration = { index: colIndex, value: cell };
          matchCount++;
        } 
        // Patrones más amplios para fechas de inicio
        else if (cellLower.includes('inicio') || cellLower.includes('start') ||
                 cellLower.includes('fecha inicio') || cellLower.includes('start date') ||
                 cellLower.includes('comienzo') || cellLower.includes('begin') ||
                 cellLower.includes('inicia') || cellLower.includes('fecha de inicio')) {
          headers.start = { index: colIndex, value: cell };
          matchCount++;
        } 
        // Patrones más amplios para fechas de fin
        else if (cellLower.includes('fin') || cellLower.includes('end') ||
                 cellLower.includes('fecha fin') || cellLower.includes('end date') ||
                 cellLower.includes('termina') || cellLower.includes('finaliza') ||
                 cellLower.includes('fecha de fin') || cellLower.includes('conclusión')) {
          headers.end = { index: colIndex, value: cell };
          matchCount++;
        }
        // Patrones para predecesoras
        else if (cellLower.includes('predecesora') || cellLower.includes('predecessor') ||
                 cellLower.includes('dependencia') || cellLower.includes('dependency') ||
                 cellLower.includes('antecesora') || cellLower.includes('anterior')) {
          headers.predecessors = { index: colIndex, value: cell };
          matchCount++;
        }
      });

      console.log('🔍 DEBUG - Fila analizada:', {
        rowIndex,
        matchCount,
        headers: Object.keys(headers),
        foundHeaders: headers
      });

      if (matchCount >= 2) {
        console.log('✅ Headers encontrados:', headers);
        return headers;
      }
    }

    console.log('❌ No se encontraron headers válidos');
    return null;
  }

  /**
   * Extraer tareas de datos (mejorado)
   */
  extractTasksFromData(data, headers) {
    if (!headers || !data) {
      console.log('❌ No hay headers o datos para extraer tareas');
      return [];
    }

    console.log('🔍 DEBUG - Extrayendo tareas con headers:', headers);

    const tasks = [];
    const headerRowIndex = this.findHeaderRowIndex(data, headers);

    console.log('🔍 DEBUG - Fila de headers encontrada en índice:', headerRowIndex);

    for (let rowIndex = headerRowIndex + 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || !Array.isArray(row)) continue;

      const task = {
        name: headers.name ? String(row[headers.name.index] || '').trim() : '',
        duration: headers.duration ? this.parseDuration(row[headers.duration.index]) : 1,
        startDate: headers.start ? this.parseDate(row[headers.start.index]) : null,
        endDate: headers.end ? this.parseDate(row[headers.end.index]) : null
      };

      // Log de las primeras tareas para debug
      if (rowIndex <= headerRowIndex + 5) {
        console.log('🔍 DEBUG - Tarea extraída:', {
          rowIndex,
          task,
          rawRow: row.slice(0, 10) // Primeras 10 columnas
        });
      }

      if (task.name && task.name.length > 0) {
        tasks.push(task);
      }
    }

    console.log(`📊 Total tareas extraídas: ${tasks.length}`);
    return tasks;
  }

  /**
   * Encontrar índice de fila de headers
   */
  findHeaderRowIndex(data, headers) {
    for (let rowIndex = 0; rowIndex < Math.min(data.length, 10); rowIndex++) {
      const row = data[rowIndex];
      if (!row || !Array.isArray(row)) continue;

      const hasHeaders = Object.values(headers).some(header => 
        row[header.index] === header.value
      );

      if (hasHeaders) {
        return rowIndex;
      }
    }
    return 0;
  }

  /**
   * Parsear duración
   */
  parseDuration(duration) {
    if (!duration) return 1;
    const num = parseFloat(duration);
    return isNaN(num) ? 1 : Math.max(1, Math.round(num));
  }

  /**
   * Parsear fecha
   */
  parseDate(dateValue) {
    if (!dateValue) return null;
    
    try {
      if (typeof dateValue === 'number') {
        const excelDate = new Date(1900, 0, dateValue - 2);
        return excelDate.toISOString().split('T')[0];
      }
      
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Crear fallback seguro cuando falla el aprendizaje
   */
  createSafeFallback(originalTemplate, errorMessage = 'Error en aprendizaje') {
    return {
      ...originalTemplate,
      learningMetadata: {
        enhanced: false,
        fallback: true,
        reason: 'validation-failed',
        errorMessage,
        fallbackAt: new Date().toISOString()
      }
    };
  }

  /**
   * Log de validación para auditoría
   */
  async logValidationResult(organizationId, userId, fileName, validationResult, supabase) {
    try {
      if (!supabase || !organizationId) return;

      await supabase
        .from('ai_learning_logs')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          file_name: fileName,
          analysis_status: validationResult.isValid ? 'completed' : 'failed',
          error_message: validationResult.errors.join('; '),
          patterns_extracted: validationResult.stats?.validTasks || 0
        });

    } catch (error) {
      console.error('Error guardando log de validación:', error);
    }
  }
}

// Exportar instancia singleton
const aiLearningValidation = new AILearningValidation();
export default aiLearningValidation;
