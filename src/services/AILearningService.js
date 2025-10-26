// =====================================================
// DEPRECATED - no se usa en v1.0
// AI LEARNING SERVICE
// Servicio para análisis de patrones de cronogramas Excel
// Este archivo será eliminado en futuras versiones
// =====================================================

import * as XLSX from 'xlsx';
import aiLearningValidation from './AILearningValidation';

class AILearningService {
  constructor() {
    this.supabase = null;
    this.organizationId = null;
    this.userId = null;
  }

  /**
   * Inicializar el servicio con conexión a Supabase
   */
  async initialize(supabase, organizationId, userId) {
    this.supabase = supabase;
    this.organizationId = organizationId;
    this.userId = userId;
    console.log('🤖 AILearningService inicializado:', { organizationId, userId });
  }

  /**
   * Analizar archivo Excel y extraer patrones
   */
  async analyzeScheduleFile(file, projectType = 'general') {
    try {
      console.log('🔍 Analizando archivo Excel:', file.name);

      // 1. Validar archivo
      const fileValidation = aiLearningValidation.validateFile(file);
      if (!fileValidation.isValid) {
        const errorMessage = `Archivo inválido: ${fileValidation.errors.join(', ')}`;
        console.error('❌ Validación de archivo fallida:', errorMessage);
        await this.logAnalysisError(file.name, errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }

      // 2. Validar límites de organización
      const orgLimits = await aiLearningValidation.validateOrganizationLimits(
        this.organizationId, 
        this.supabase
      );
      if (!orgLimits.isValid) {
        const errorMessage = 'Límite de patrones de aprendizaje alcanzado para la organización';
        console.error('❌ Límite de organización alcanzado');
        await this.logAnalysisError(file.name, errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }

      // 3. Leer archivo Excel
      const workbook = XLSX.read(await file.arrayBuffer());
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 4. Validar datos extraídos
      const dataValidation = aiLearningValidation.validateExtractedData(data, file.name);
      if (!dataValidation.isValid) {
        const errorMessage = `Datos inválidos: ${dataValidation.errors.join(', ')}`;
        console.error('❌ Validación de datos fallida:', errorMessage);
        await this.logAnalysisError(file.name, errorMessage);
        await aiLearningValidation.logValidationResult(
          this.organizationId, 
          this.userId, 
          file.name, 
          dataValidation, 
          this.supabase
        );
        return {
          success: false,
          error: errorMessage
        };
      }

      // 5. Extraer patrones
      const patterns = this.extractPatternsFromData(data, projectType);

      // 6. Validar patrones extraídos
      const patternsValidation = aiLearningValidation.validateExtractedPatterns(patterns, file.name);
      if (!patternsValidation.isValid) {
        const errorMessage = `Patrones inválidos: ${patternsValidation.errors.join(', ')}`;
        console.error('❌ Validación de patrones fallida:', errorMessage);
        await this.logAnalysisError(file.name, errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }

      // 7. Sanitizar patrones
      const sanitizedPatterns = aiLearningValidation.sanitizePatternData(patterns);

      // 8. Guardar patrón en base de datos
      await this.saveLearningPattern(sanitizedPatterns, projectType, file.name);

      // 9. Registrar análisis exitoso
      await this.logAnalysisSuccess(file.name, sanitizedPatterns.length, file.size);

      console.log('✅ Patrones extraídos exitosamente:', sanitizedPatterns);
      return {
        success: true,
        patterns: sanitizedPatterns,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          projectType,
          extractedAt: new Date().toISOString(),
          validationWarnings: [
            ...dataValidation.warnings,
            ...patternsValidation.warnings,
            ...orgLimits.warnings
          ]
        }
      };

    } catch (error) {
      console.error('❌ Error analizando archivo:', error);
      await this.logAnalysisError(file.name, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extraer patrones de estructura de datos Excel
   */
  extractPatternsFromData(data, projectType) {
    if (!data || data.length < 2) {
      throw new Error('Archivo Excel vacío o sin datos válidos');
    }

    // Encontrar headers
    const headers = this.findHeaders(data);
    if (!headers) {
      throw new Error('No se encontraron headers válidos en el Excel');
    }

    // Extraer tareas y hitos
    const tasks = this.extractTasks(data, headers);
    const milestones = tasks.filter(task => this.isMilestone(task));

    // Analizar patrones
    const patterns = {
      phaseStructure: this.analyzePhaseStructure(tasks, milestones),
      durationPatterns: this.analyzeDurationPatterns(tasks),
      dependencyPatterns: this.analyzeDependencyPatterns(tasks),
      namingConventions: this.analyzeNamingConventions(tasks, milestones),
      activities: tasks.map(task => ({
        name: task.name,
        duration: task.duration,
        isMilestone: task.isMilestone || false,
        category: task.category || 'general',
        phase: task.phase || 'General'
      })),
      metadata: {
        totalTasks: tasks.length,
        totalMilestones: milestones.length,
        projectDuration: this.calculateProjectDuration(tasks),
        complexity: this.assessComplexity(tasks, milestones)
      }
    };

    return patterns;
  }

  /**
   * Encontrar headers en el archivo Excel
   */
  findHeaders(data) {
    console.log(`🔍 Buscando headers en ${data.length} filas de datos`);
    
    const headerCandidates = [
      ['Tarea', 'Actividad', 'Task', 'Activity', 'Nombre', 'Name', 'Descripción', 'Description', 'Trabajo', 'Work', 'Item', 'Elemento'],
      ['Duración', 'Duration', 'Días', 'Days', 'Tiempo', 'Time', 'Horas', 'Hours'],
      ['Inicio', 'Start', 'Fecha Inicio', 'Start Date', 'Comienzo', 'Beginning', 'Inicio', 'Fecha de Inicio'],
      ['Fin', 'End', 'Fecha Fin', 'End Date', 'Final', 'Finalización', 'Termino', 'Fecha de Fin'],
      ['Predecesoras', 'Predecessors', 'Dependencias', 'Dependencies', 'Antecesores', 'Precedentes']
    ];
    
    console.log(`📋 Candidatos de headers:`, headerCandidates);

    for (let rowIndex = 0; rowIndex < Math.min(data.length, 10); rowIndex++) {
      const row = data[rowIndex];
      if (!row || !Array.isArray(row)) continue;

      const foundHeaders = {};
      let matchCount = 0;

      row.forEach((cell, colIndex) => {
        if (!cell || typeof cell !== 'string') return;

        const cellLower = cell.toLowerCase().trim();
        
        headerCandidates.forEach(candidateGroup => {
          candidateGroup.forEach(candidate => {
            const candidateLower = candidate.toLowerCase();
            // Buscar coincidencia exacta o parcial
            if (cellLower === candidateLower || cellLower.includes(candidateLower) || candidateLower.includes(cellLower)) {
              const category = this.getHeaderCategory(candidate);
              if (category) {
                foundHeaders[category] = { index: colIndex, value: cell };
                matchCount++;
                console.log(`✅ Header encontrado: "${cell}" -> ${category} (índice ${colIndex})`);
              }
            }
          });
        });
      });

      if (matchCount >= 3) {
        console.log('✅ Headers encontrados:', foundHeaders);
        console.log(`📊 Match count: ${matchCount}, Mínimo requerido: 3`);
        
        // Si no se encontró el header de nombre, asumir que la primera columna es el nombre
        if (!foundHeaders.name) {
          console.log('⚠️ No se encontró header de nombre, asumiendo que la primera columna es el nombre');
          foundHeaders.name = { index: 0, value: 'Nombre (asumido)' };
        }
        
        return foundHeaders;
      } else {
        console.log(`⚠️ Fila ${rowIndex}: Solo ${matchCount} headers encontrados (mínimo 3)`, foundHeaders);
      }
    }

    return null;
  }

  /**
   * Categorizar header encontrado
   */
  getHeaderCategory(candidate) {
    const categoryMap = {
      'Tarea': 'name', 'Actividad': 'name', 'Task': 'name', 'Activity': 'name',
      'Nombre': 'name', 'Name': 'name', 'Descripción': 'name', 'Description': 'name',
      'Trabajo': 'name', 'Work': 'name', 'Item': 'name', 'Elemento': 'name',
      'Duración': 'duration', 'Duration': 'duration', 'Días': 'duration', 'Days': 'duration',
      'Tiempo': 'duration', 'Time': 'duration', 'Horas': 'duration', 'Hours': 'duration',
      'Inicio': 'start', 'Start': 'start', 'Fecha Inicio': 'start', 'Start Date': 'start',
      'Comienzo': 'start', 'Beginning': 'start', 'Fecha de Inicio': 'start',
      'Fin': 'end', 'End': 'end', 'Fecha Fin': 'end', 'End Date': 'end',
      'Final': 'end', 'Finalización': 'end', 'Termino': 'end', 'Fecha de Fin': 'end',
      'Predecesoras': 'predecessors', 'Predecessors': 'predecessors', 'Dependencias': 'predecessors', 'Dependencies': 'predecessors',
      'Antecesores': 'predecessors', 'Precedentes': 'predecessors'
    };

    return categoryMap[candidate] || null;
  }

  /**
   * Extraer tareas de los datos Excel
   */
  extractTasks(data, headers) {
    const tasks = [];
    const headerRowIndex = this.findHeaderRowIndex(data, headers);
    
    console.log(`🔍 Buscando tareas desde fila ${headerRowIndex + 1} de ${data.length}`);

    for (let rowIndex = headerRowIndex + 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || !Array.isArray(row)) {
        console.log(`⚠️ Fila ${rowIndex}: no es un array válido`);
        continue;
      }

      const task = this.parseTaskRow(row, headers);
      if (task && task.name) {
        tasks.push(task);
        console.log(`✅ Tarea extraída: ${task.name}`);
      } else {
        console.log(`❌ Fila ${rowIndex}: tarea inválida`, row);
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

      // Verificar si esta fila contiene los headers
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
   * Parsear fila individual de tarea
   */
  parseTaskRow(row, headers) {
    try {
      const task = {};
      
      // Debug: mostrar información de la fila y headers
      console.log(`🔍 Parsing fila con ${row.length} elementos:`, row.slice(0, 3));
      console.log(`📋 Headers disponibles:`, Object.keys(headers).map(key => `${key}: ${headers[key].index}`));

      // Extraer nombre con mejor manejo de valores undefined
      if (headers.name && headers.name.index !== undefined) {
        const rawName = row[headers.name.index];
        console.log(`📝 Nombre raw en índice ${headers.name.index}:`, rawName);
        if (rawName !== undefined && rawName !== null && rawName !== '') {
          task.name = String(rawName).trim();
          console.log(`✅ Nombre procesado:`, task.name);
        }
      }
      
      // Validar que la tarea tenga un nombre válido
      if (!task.name || task.name === '' || task.name === 'undefined' || task.name === 'null') {
        console.log(`⚠️ Tarea sin nombre válido: "${task.name}" en fila ${row.length} elementos:`, row.slice(0, 5));
        return null;
      }

      // Extraer duración
      if (headers.duration) {
        const duration = row[headers.duration.index];
        task.duration = this.parseDuration(duration);
      }

      // Extraer fechas
      if (headers.start) {
        task.startDate = this.parseDate(row[headers.start.index]);
      }
      if (headers.end) {
        task.endDate = this.parseDate(row[headers.end.index]);
      }

      // Extraer predecesoras
      if (headers.predecessors) {
        task.predecessors = this.parsePredecessors(row[headers.predecessors.index]);
      }

      // Determinar si es hito
      task.isMilestone = this.isMilestone(task);

      return task;
    } catch (error) {
      console.warn('⚠️ Error parseando fila:', error);
      return null;
    }
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
      // Si es número (días desde 1900 en Excel)
      if (typeof dateValue === 'number') {
        const excelDate = new Date(1900, 0, dateValue - 2);
        return excelDate.toISOString().split('T')[0];
      }
      
      // Si es string de fecha
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
   * Parsear predecesoras
   */
  parsePredecessors(predecessorsValue) {
    if (!predecessorsValue) return [];
    
    const str = String(predecessorsValue);
    return str.split(/[,;]/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Determinar si es hito
   */
  isMilestone(task) {
    if (!task.name) return false;
    
    const name = task.name.toLowerCase();
    const milestoneKeywords = ['hito', 'milestone', 'entregable', 'deliverable', 'revisión', 'aprobación'];
    
    return milestoneKeywords.some(keyword => name.includes(keyword)) ||
           task.duration === 0;
  }

  /**
   * Analizar estructura de fases
   */
  analyzePhaseStructure(tasks, milestones) {
    const phases = new Set();
    const phaseOrder = [];
    const phaseDurations = {};

    tasks.forEach(task => {
      // Extraer fase del nombre o inferirla
      const phase = this.extractPhaseFromName(task.name);
      if (phase) {
        phases.add(phase);
        if (!phaseOrder.includes(phase)) {
          phaseOrder.push(phase);
        }
      }
    });

    // Calcular duraciones por fase
    phases.forEach(phase => {
      const phaseTasks = tasks.filter(task => 
        this.extractPhaseFromName(task.name) === phase
      );
      
      const durations = phaseTasks.map(task => task.duration || 1);
      if (durations.length > 0) {
        phaseDurations[phase] = {
          min: Math.min(...durations),
          max: Math.max(...durations),
          avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        };
      }
    });

    return {
      phases: Array.from(phases),
      phaseOrder,
      phaseDurations
    };
  }

  /**
   * Extraer fase del nombre de tarea
   */
  extractPhaseFromName(taskName) {
    if (!taskName) return null;
    
    const name = taskName.toLowerCase();
    
    const phaseKeywords = {
      'inicio': ['inicio', 'start', 'kickoff', 'lanzamiento'],
      'planificación': ['planificación', 'planning', 'plan', 'diseño'],
      'ejecución': ['ejecución', 'execution', 'implementación', 'desarrollo'],
      'cierre': ['cierre', 'close', 'finalización', 'entrega']
    };

    for (const [phase, keywords] of Object.entries(phaseKeywords)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return phase;
      }
    }

    return null;
  }

  /**
   * Analizar patrones de duración
   */
  analyzeDurationPatterns(tasks) {
    const activityTypes = {};
    const milestoneSpacing = [];

    tasks.forEach(task => {
      if (task.isMilestone) {
        milestoneSpacing.push(task.duration || 0);
      } else {
        const activityType = this.categorizeActivityType(task.name);
        if (!activityTypes[activityType]) {
          activityTypes[activityType] = [];
        }
        activityTypes[activityType].push(task.duration || 1);
      }
    });

    // Calcular estadísticas por tipo de actividad
    Object.keys(activityTypes).forEach(type => {
      const durations = activityTypes[type];
      if (durations.length > 0) {
        activityTypes[type] = {
          min: Math.min(...durations),
          max: Math.max(...durations),
          avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        };
      }
    });

    // Calcular espaciado entre hitos
    const avgSpacing = milestoneSpacing.length > 0 
      ? Math.round(milestoneSpacing.reduce((a, b) => a + b, 0) / milestoneSpacing.length)
      : 15;

    return {
      activityTypes,
      milestoneSpacing: {
        avgDaysBetween: avgSpacing,
        commonIntervals: this.findCommonIntervals(milestoneSpacing)
      }
    };
  }

  /**
   * Categorizar tipo de actividad
   */
  categorizeActivityType(taskName) {
    if (!taskName) return 'General';
    
    const name = taskName.toLowerCase();
    
    const typeKeywords = {
      'Análisis': ['análisis', 'analysis', 'estudio', 'investigación'],
      'Diseño': ['diseño', 'design', 'arquitectura', 'plan'],
      'Implementación': ['implementación', 'implementation', 'desarrollo', 'construcción'],
      'Pruebas': ['prueba', 'test', 'validación', 'verificación'],
      'Documentación': ['documentación', 'documentation', 'manual', 'guía']
    };

    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return type;
      }
    }

    return 'General';
  }

  /**
   * Encontrar intervalos comunes
   */
  findCommonIntervals(spacings) {
    const intervals = [7, 14, 21, 30, 45, 60];
    const common = [];
    
    spacings.forEach(spacing => {
      intervals.forEach(interval => {
        if (Math.abs(spacing - interval) <= 2 && !common.includes(interval)) {
          common.push(interval);
        }
      });
    });
    
    return common.length > 0 ? common : [14, 21, 30];
  }

  /**
   * Analizar patrones de dependencias
   */
  analyzeDependencyPatterns(tasks) {
    const commonDependencies = [];
    const dependencyCounts = {};

    tasks.forEach(task => {
      if (task.predecessors && task.predecessors.length > 0) {
        const taskType = this.categorizeActivityType(task.name);
        
        task.predecessors.forEach(pred => {
          const predTask = tasks.find(t => t.name === pred);
          if (predTask) {
            const predType = this.categorizeActivityType(predTask.name);
            const key = `${predType}->${taskType}`;
            dependencyCounts[key] = (dependencyCounts[key] || 0) + 1;
          }
        });
      }
    });

    // Convertir a porcentajes
    const totalTasks = tasks.length;
    Object.entries(dependencyCounts).forEach(([key, count]) => {
      const [from, to] = key.split('->');
      commonDependencies.push({
        from,
        to,
        frequency: Math.round((count / totalTasks) * 100) / 100
      });
    });

    // Calcular profundidad promedio de dependencias
    const depths = tasks.map(task => this.calculateDependencyDepth(task, tasks));
    const avgDepth = depths.length > 0 
      ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length * 10) / 10
      : 0;

    return {
      commonDependencies: commonDependencies.sort((a, b) => b.frequency - a.frequency),
      dependencyDepth: {
        avg: avgDepth,
        max: Math.max(...depths)
      }
    };
  }

  /**
   * Calcular profundidad de dependencias
   */
  calculateDependencyDepth(task, allTasks, visited = new Set()) {
    if (visited.has(task.name)) return 0; // Evitar ciclos
    
    visited.add(task.name);
    
    if (!task.predecessors || task.predecessors.length === 0) {
      return 0;
    }

    let maxDepth = 0;
    task.predecessors.forEach(pred => {
      const predTask = allTasks.find(t => t.name === pred);
      if (predTask) {
        const depth = 1 + this.calculateDependencyDepth(predTask, allTasks, new Set(visited));
        maxDepth = Math.max(maxDepth, depth);
      }
    });

    return maxDepth;
  }

  /**
   * Analizar convenciones de nomenclatura
   */
  analyzeNamingConventions(tasks, milestones) {
    const activityPrefixes = new Set();
    const milestonePrefixes = new Set();
    const commonTerms = new Set();

    tasks.forEach(task => {
      const name = task.name;
      const words = name.split(/[\s\-_]+/).filter(w => w.length > 0);
      
      if (words.length > 0) {
        const firstWord = words[0];
        
        if (task.isMilestone) {
          milestonePrefixes.add(firstWord);
        } else {
          activityPrefixes.add(firstWord);
        }
      }

      // Extraer términos comunes
      words.forEach(word => {
        if (word.length > 3) {
          commonTerms.add(word.toLowerCase());
        }
      });
    });

    return {
      activityPrefixes: Array.from(activityPrefixes),
      milestonePrefixes: Array.from(milestonePrefixes),
      commonTerms: Array.from(commonTerms).slice(0, 20) // Top 20 términos
    };
  }

  /**
   * Calcular duración del proyecto
   */
  calculateProjectDuration(tasks) {
    if (tasks.length === 0) return 0;

    const dates = tasks
      .filter(task => task.startDate || task.endDate)
      .flatMap(task => [task.startDate, task.endDate])
      .filter(date => date)
      .map(date => new Date(date))
      .filter(date => !isNaN(date.getTime()));

    if (dates.length === 0) return 0;

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Evaluar complejidad del proyecto
   */
  assessComplexity(tasks, milestones) {
    const totalTasks = tasks.length;
    const totalMilestones = milestones.length;
    const avgDuration = tasks.reduce((sum, task) => sum + (task.duration || 1), 0) / totalTasks;
    const dependencyCount = tasks.reduce((sum, task) => sum + (task.predecessors?.length || 0), 0);

    let complexityScore = 0;
    
    if (totalTasks > 50) complexityScore += 3;
    else if (totalTasks > 25) complexityScore += 2;
    else if (totalTasks > 10) complexityScore += 1;

    if (avgDuration > 10) complexityScore += 2;
    else if (avgDuration > 5) complexityScore += 1;

    if (dependencyCount > totalTasks * 0.5) complexityScore += 2;
    else if (dependencyCount > totalTasks * 0.3) complexityScore += 1;

    if (complexityScore >= 5) return 'high';
    if (complexityScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Guardar patrón de aprendizaje en base de datos
   */
  async saveLearningPattern(patterns, projectType, fileName) {
    if (!this.supabase || !this.organizationId) {
      throw new Error('Servicio no inicializado');
    }

    try {
      const { data, error } = await this.supabase
        .from('ai_learning_patterns')
        .insert({
          organization_id: this.organizationId,
          created_by: this.userId,
          user_id: this.userId,
          pattern_name: `Patrón de ${projectType} - ${fileName}`,
          pattern_type: 'schedule_pattern',
          project_type: projectType,
          pattern_data: patterns,
          analysis_data: patterns,
          source_file: fileName,
          confidence_score: 0.8,
          usage_count: 0
        })
        .select();

      if (error) throw error;

      console.log('✅ Patrón guardado en base de datos:', data[0]?.id);
      
      // Actualizar estadísticas
      await this.updateLearningStats(projectType);
      
      return data[0];
    } catch (error) {
      console.error('❌ Error guardando patrón:', error);
      throw error;
    }
  }

  /**
   * Actualizar estadísticas de aprendizaje
   */
  async updateLearningStats(projectType) {
    try {
      // Contar patrones existentes
      const { count } = await this.supabase
        .from('ai_learning_patterns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', this.organizationId)
        .eq('project_type', projectType);

      // Upsert estadísticas
      const { error } = await this.supabase
        .from('ai_learning_stats')
        .upsert({
          organization_id: this.organizationId,
          project_type: projectType,
          total_patterns: count || 0,
          last_analysis_date: new Date().toISOString()
        });

      if (error) throw error;
      
    } catch (error) {
      console.error('❌ Error actualizando estadísticas:', error);
    }
  }

  /**
   * Obtener patrones de aprendizaje por tipo de proyecto
   */
  async getLearningPatterns(projectType) {
    if (!this.supabase || !this.organizationId) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('ai_learning_patterns')
        .select('*')
        .eq('organization_id', this.organizationId)
        .eq('project_type', projectType)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('❌ Error obteniendo patrones:', error);
      return [];
    }
  }

  /**
   * Log de error de análisis
   */
  async logAnalysisError(fileName, errorMessage) {
    if (!this.supabase || !this.organizationId) {
      return;
    }

    try {
      await this.supabase
        .from('ai_learning_logs')
        .insert({
          organization_id: this.organizationId,
          created_by: this.userId,
          user_id: this.userId,
          file_name: fileName,
          analysis_status: 'failed',
          error_message: errorMessage,
          tasks_extracted: 0,
          patterns_found: 0,
          processing_time_ms: 0
        });
    } catch (error) {
      console.error('❌ Error guardando log:', error);
    }
  }

  /**
   * Log de análisis exitoso
   */
  async logAnalysisSuccess(fileName, patternsCount, fileSize) {
    if (!this.supabase || !this.organizationId) {
      return;
    }

    try {
      await this.supabase
        .from('ai_learning_logs')
        .insert({
          organization_id: this.organizationId,
          created_by: this.userId,
          user_id: this.userId,
          file_name: fileName,
          file_size: fileSize,
          analysis_status: 'completed',
          tasks_extracted: 0, // Se puede mejorar para contar tareas reales
          patterns_found: patternsCount,
          processing_time_ms: 0, // Se puede mejorar para medir tiempo real
          analysis_data: {
            success: true,
            patterns_count: patternsCount,
            completed_at: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('❌ Error guardando log de éxito:', error);
    }
  }

  /**
   * Obtener estadísticas de aprendizaje
   */
  async getLearningStats() {
    if (!this.supabase || !this.organizationId) {
      return {};
    }

    try {
      const { data, error } = await this.supabase
        .from('ai_learning_stats')
        .select('*')
        .eq('organization_id', this.organizationId);

      if (error) throw error;
      
      const stats = {};
      data?.forEach(stat => {
        stats[stat.project_type] = stat;
      });
      
      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {};
    }
  }
}

// Exportar instancia singleton
const aiLearningService = new AILearningService();
export default aiLearningService;
