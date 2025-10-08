// =====================================================
// DEPRECATED - no se usa en v1.0
// AI LEARNING ENGINE
// Motor de aprendizaje que mejora templates basado en patrones
// Este archivo será eliminado en futuras versiones
// =====================================================

import aiLearningService from './AILearningService';
import aiLearningValidation from './AILearningValidation';

class AILearningEngine {
  constructor() {
    this.supabase = null;
    this.organizationId = null;
    this.userId = null;
  }

  /**
   * Inicializar el motor de aprendizaje
   */
  async initialize(supabase, organizationId, userId) {
    this.supabase = supabase;
    this.organizationId = organizationId;
    this.userId = userId;
    await aiLearningService.initialize(supabase, organizationId, userId);
    console.log('🧠 AILearningEngine inicializado');
  }

  /**
   * Generar template mejorado basado en patrones aprendidos
   */
  async generateEnhancedTemplate(baseTemplate, projectType, projectContext = {}) {
    try {
      console.log('🧠 Generando template mejorado para:', projectType);

      // 1. Obtener patrones de aprendizaje
      const learnedPatterns = await aiLearningService.getLearningPatterns(projectType);
      
      if (!learnedPatterns || learnedPatterns.length === 0) {
        console.log('📋 No hay patrones aprendidos, usando template base');
        return this.addFallbackMetadata(baseTemplate, 'no-patterns');
      }

      // 2. Analizar patrones y generar mejoras
      const patternAnalysis = this.analyzeLearnedPatterns(learnedPatterns);
      
      // 3. Aplicar mejoras al template base
      const enhancedTemplate = this.applyPatternEnhancements(
        baseTemplate, 
        patternAnalysis, 
        projectContext
      );

      console.log('✅ Template mejorado generado');
      return enhancedTemplate;

    } catch (error) {
      console.error('❌ Error generando template mejorado:', error);
      return this.addFallbackMetadata(baseTemplate, 'error', error.message);
    }
  }

  /**
   * Analizar patrones aprendidos y extraer insights
   */
  analyzeLearnedPatterns(learnedPatterns) {
    const analysis = {
      phaseStructure: this.analyzePhasePatterns(learnedPatterns),
      durationPatterns: this.analyzeDurationInsights(learnedPatterns),
      dependencyPatterns: this.analyzeDependencyInsights(learnedPatterns),
      namingConventions: this.analyzeNamingInsights(learnedPatterns),
      complexityFactors: this.analyzeComplexityFactors(learnedPatterns),
      learnedActivities: this.extractLearnedActivities(learnedPatterns),
      confidence: this.calculateConfidenceScore(learnedPatterns)
    };

    console.log('🔍 Análisis de patrones completado:', {
      confidence: analysis.confidence,
      patternsAnalyzed: learnedPatterns.length,
      learnedActivities: analysis.learnedActivities?.length || 0
    });

    return analysis;
  }

  /**
   * Analizar patrones de estructura de fases
   */
  analyzePhasePatterns(patterns) {
    const phaseFrequency = {};
    const phaseOrders = [];
    const phaseDurations = {};

    patterns.forEach(pattern => {
      const data = pattern.analysis_data;
      if (data.phaseStructure) {
        const { phases, phaseOrder, phaseDurations: durations } = data.phaseStructure;
        
        // Contar frecuencia de fases
        phases.forEach(phase => {
          phaseFrequency[phase] = (phaseFrequency[phase] || 0) + 1;
        });

        // Recopilar órdenes de fase
        if (phaseOrder && phaseOrder.length > 0) {
          phaseOrders.push(phaseOrder);
        }

        // Recopilar duraciones
        Object.entries(durations || {}).forEach(([phase, stats]) => {
          if (!phaseDurations[phase]) {
            phaseDurations[phase] = { durations: [], counts: [] };
          }
          phaseDurations[phase].durations.push(stats.avg);
          phaseDurations[phase].counts.push(1);
        });
      }
    });

    // Calcular fases más comunes
    const sortedPhases = Object.entries(phaseFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6);

    // Calcular orden más común
    const mostCommonOrder = this.findMostCommonPhaseOrder(phaseOrders);

    // Calcular duraciones promedio
    const avgPhaseDurations = {};
    Object.entries(phaseDurations).forEach(([phase, data]) => {
      const totalDuration = data.durations.reduce((sum, duration, index) => 
        sum + (duration * data.counts[index]), 0);
      const totalCount = data.counts.reduce((sum, count) => sum + count, 0);
      avgPhaseDurations[phase] = totalCount > 0 ? Math.round(totalDuration / totalCount) : 15;
    });

    return {
      commonPhases: sortedPhases.map(([phase]) => phase),
      recommendedOrder: mostCommonOrder,
      avgDurations: avgPhaseDurations,
      confidence: Math.min(sortedPhases.length / 3, 1.0)
    };
  }

  /**
   * Encontrar el orden de fases más común
   */
  findMostCommonPhaseOrder(phaseOrders) {
    if (phaseOrders.length === 0) {
      return ['Inicio', 'Planificación', 'Ejecución', 'Cierre'];
    }

    const orderCounts = {};
    phaseOrders.forEach(order => {
      const key = order.join('->');
      orderCounts[key] = (orderCounts[key] || 0) + 1;
    });

    const mostCommon = Object.entries(orderCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return mostCommon ? mostCommon[0].split('->') : phaseOrders[0];
  }

  /**
   * Analizar insights de duración
   */
  analyzeDurationInsights(patterns) {
    const activityTypeDurations = {};
    const milestoneSpacings = [];

    patterns.forEach(pattern => {
      const data = pattern.analysis_data;
      
      if (data.durationPatterns) {
        const { activityTypes, milestoneSpacing } = data.durationPatterns;
        
        // Recopilar duraciones por tipo de actividad
        Object.entries(activityTypes || {}).forEach(([type, stats]) => {
          if (!activityTypeDurations[type]) {
            activityTypeDurations[type] = { durations: [], counts: [] };
          }
          activityTypeDurations[type].durations.push(stats.avg);
          activityTypeDurations[type].counts.push(1);
        });

        // Recopilar espaciado de hitos
        if (milestoneSpacing && milestoneSpacing.avgDaysBetween) {
          milestoneSpacings.push(milestoneSpacing.avgDaysBetween);
        }
      }
    });

    // Calcular duraciones promedio por tipo
    const avgDurationsByType = {};
    Object.entries(activityTypeDurations).forEach(([type, data]) => {
      const totalDuration = data.durations.reduce((sum, duration, index) => 
        sum + (duration * data.counts[index]), 0);
      const totalCount = data.counts.reduce((sum, count) => sum + count, 0);
      avgDurationsByType[type] = totalCount > 0 ? Math.round(totalDuration / totalCount) : 5;
    });

    // Calcular espaciado promedio de hitos
    const avgMilestoneSpacing = milestoneSpacings.length > 0
      ? Math.round(milestoneSpacings.reduce((sum, spacing) => sum + spacing, 0) / milestoneSpacings.length)
      : 14;

    return {
      avgDurationsByType,
      avgMilestoneSpacing,
      confidence: Math.min(Object.keys(avgDurationsByType).length / 5, 1.0)
    };
  }

  /**
   * Analizar insights de dependencias
   */
  analyzeDependencyInsights(patterns) {
    const commonDependencies = {};
    const avgDependencyDepths = [];

    patterns.forEach(pattern => {
      const data = pattern.analysis_data;
      
      if (data.dependencyPatterns) {
        const { commonDependencies: deps, dependencyDepth } = data.dependencyPatterns;
        
        // Recopilar dependencias comunes
        deps.forEach(dep => {
          const key = `${dep.from}->${dep.to}`;
          if (!commonDependencies[key]) {
            commonDependencies[key] = { frequency: 0, count: 0 };
          }
          commonDependencies[key].frequency += dep.frequency;
          commonDependencies[key].count += 1;
        });

        // Recopilar profundidades
        if (dependencyDepth && dependencyDepth.avg) {
          avgDependencyDepths.push(dependencyDepth.avg);
        }
      }
    });

    // Calcular dependencias más comunes
    const sortedDependencies = Object.entries(commonDependencies)
      .map(([key, data]) => ({
        dependency: key,
        avgFrequency: data.frequency / data.count,
        confidence: data.count
      }))
      .sort((a, b) => b.avgFrequency - a.avgFrequency)
      .slice(0, 10);

    // Calcular profundidad promedio
    const avgDepth = avgDependencyDepths.length > 0
      ? Math.round(avgDependencyDepths.reduce((sum, depth) => sum + depth, 0) / avgDependencyDepths.length * 10) / 10
      : 2.0;

    return {
      commonDependencies: sortedDependencies,
      avgDependencyDepth: avgDepth,
      confidence: Math.min(sortedDependencies.length / 5, 1.0)
    };
  }

  /**
   * Analizar insights de nomenclatura
   */
  analyzeNamingInsights(patterns) {
    const activityPrefixes = {};
    const milestonePrefixes = {};
    const commonTerms = {};

    patterns.forEach(pattern => {
      const data = pattern.analysis_data;
      
      if (data.namingConventions) {
        const { activityPrefixes: actPrefixes, milestonePrefixes: milPrefixes, commonTerms: terms } = data.namingConventions;
        
        // Contar prefijos de actividades
        actPrefixes.forEach(prefix => {
          activityPrefixes[prefix] = (activityPrefixes[prefix] || 0) + 1;
        });

        // Contar prefijos de hitos
        milPrefixes.forEach(prefix => {
          milestonePrefixes[prefix] = (milestonePrefixes[prefix] || 0) + 1;
        });

        // Contar términos comunes
        terms.forEach(term => {
          commonTerms[term] = (commonTerms[term] || 0) + 1;
        });
      }
    });

    // Obtener prefijos más comunes
    const topActivityPrefixes = Object.entries(activityPrefixes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([prefix]) => prefix);

    const topMilestonePrefixes = Object.entries(milestonePrefixes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([prefix]) => prefix);

    const topCommonTerms = Object.entries(commonTerms)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([term]) => term);

    return {
      recommendedActivityPrefixes: topActivityPrefixes,
      recommendedMilestonePrefixes: topMilestonePrefixes,
      commonTerms: topCommonTerms,
      confidence: Math.min(topActivityPrefixes.length / 3, 1.0)
    };
  }

  /**
   * Analizar factores de complejidad
   */
  analyzeComplexityFactors(patterns) {
    const complexityDistribution = { low: 0, medium: 0, high: 0 };
    const avgTaskCounts = [];
    const avgDurations = [];

    patterns.forEach(pattern => {
      const data = pattern.analysis_data;
      
      if (data.metadata) {
        const { complexity, totalTasks, projectDuration } = data.metadata;
        
        if (complexity) {
          complexityDistribution[complexity] = (complexityDistribution[complexity] || 0) + 1;
        }
        
        if (totalTasks) {
          avgTaskCounts.push(totalTasks);
        }
        
        if (projectDuration) {
          avgDurations.push(projectDuration);
        }
      }
    });

    // Calcular promedios
    const avgTaskCount = avgTaskCounts.length > 0
      ? Math.round(avgTaskCounts.reduce((sum, count) => sum + count, 0) / avgTaskCounts.length)
      : 20;

    const avgProjectDuration = avgDurations.length > 0
      ? Math.round(avgDurations.reduce((sum, duration) => sum + duration, 0) / avgDurations.length)
      : 90;

    // Determinar complejidad más común
    const mostCommonComplexity = Object.entries(complexityDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'medium';

    return {
      mostCommonComplexity,
      avgTaskCount,
      avgProjectDuration,
      complexityDistribution,
      confidence: Math.min(patterns.length / 5, 1.0)
    };
  }

  /**
   * Calcular puntuación de confianza
   */
  calculateConfidenceScore(patterns) {
    const patternCount = patterns.length;
    
    if (patternCount === 0) return 0;
    if (patternCount < 3) return 0.3;
    if (patternCount < 5) return 0.5;
    if (patternCount < 10) return 0.7;
    return 0.9;
  }

  /**
   * Aplicar mejoras de patrones al template base
   */
  applyPatternEnhancements(baseTemplate, patternAnalysis, projectContext) {
    console.log('🔍 Template base recibido:', {
      hasActivities: !!baseTemplate.activities,
      activitiesType: typeof baseTemplate.activities,
      activitiesLength: baseTemplate.activities?.length || 0,
      templateKeys: Object.keys(baseTemplate)
    });
    
    const enhancedTemplate = JSON.parse(JSON.stringify(baseTemplate)); // Deep clone

    // Solo aplicar mejoras si la confianza es suficiente
    if (patternAnalysis.confidence < 0.3) {
      console.log('⚠️ Confianza insuficiente, usando template base');
      return this.addFallbackMetadata(enhancedTemplate, 'low-confidence');
    }

    try {
      // 1. Mejorar estructura de fases
      if (patternAnalysis.phaseStructure.confidence > 0.5) {
        enhancedTemplate.phases = this.enhancePhaseStructure(
          enhancedTemplate.phases,
          patternAnalysis.phaseStructure
        );
      }

      // 2. Mejorar actividades con duraciones aprendidas
      if (patternAnalysis.durationPatterns.confidence > 0.5) {
        console.log('🔍 Template antes de mejorar actividades:', {
          hasActivities: !!enhancedTemplate.activities,
          activitiesType: typeof enhancedTemplate.activities,
          activitiesLength: enhancedTemplate.activities?.length || 0
        });
        
        enhancedTemplate.activities = this.enhanceActivityDurations(
          enhancedTemplate.activities,
          patternAnalysis.durationPatterns
        );
      }

      // 2.5. Agregar actividades aprendidas de los archivos
      if (patternAnalysis.learnedActivities && patternAnalysis.learnedActivities.length > 0) {
        console.log('🧠 Agregando actividades aprendidas:', patternAnalysis.learnedActivities.length);
        enhancedTemplate.activities = this.addLearnedActivities(
          enhancedTemplate.activities,
          patternAnalysis.learnedActivities,
          projectContext
        );
      }

      // 3. Mejorar hitos con espaciado aprendido
      if (patternAnalysis.durationPatterns.avgMilestoneSpacing) {
        enhancedTemplate.milestones = this.enhanceMilestoneSpacing(
          enhancedTemplate.milestones,
          patternAnalysis.durationPatterns.avgMilestoneSpacing
        );
      }

      // 4. Aplicar convenciones de nomenclatura
      if (patternAnalysis.namingConventions.confidence > 0.5) {
        enhancedTemplate.activities = this.applyNamingConventions(
          enhancedTemplate.activities,
          patternAnalysis.namingConventions,
          'activity'
        );
        
        enhancedTemplate.milestones = this.applyNamingConventions(
          enhancedTemplate.milestones,
          patternAnalysis.namingConventions,
          'milestone'
        );
      }

      // 5. Ajustar complejidad basada en patrones
      if (patternAnalysis.complexityFactors.confidence > 0.5) {
        enhancedTemplate.metadata = this.enhanceComplexityMetadata(
          enhancedTemplate.metadata,
          patternAnalysis.complexityFactors,
          projectContext
        );
      }

      // 6. Agregar metadata de aprendizaje
      enhancedTemplate.learningMetadata = {
        enhanced: true,
        confidence: patternAnalysis.confidence,
        patternsUsed: Object.keys(patternAnalysis).length,
        enhancedAt: new Date().toISOString()
      };

      console.log('✅ Mejoras aplicadas al template:', {
        confidence: patternAnalysis.confidence,
        phasesEnhanced: !!patternAnalysis.phaseStructure.confidence,
        durationsEnhanced: !!patternAnalysis.durationPatterns.confidence,
        namingEnhanced: !!patternAnalysis.namingConventions.confidence
      });

      return enhancedTemplate;

    } catch (error) {
      console.error('❌ Error aplicando mejoras:', error);
      return this.addFallbackMetadata(baseTemplate, 'enhancement-error', error.message);
    }
  }

  /**
   * Mejorar estructura de fases
   */
  enhancePhaseStructure(originalPhases, phaseInsights) {
    const enhancedPhases = originalPhases ? [...originalPhases] : [];

    // Reordenar fases según patrones aprendidos
    if (phaseInsights.recommendedOrder && phaseInsights.recommendedOrder.length > 0) {
      const recommendedOrder = phaseInsights.recommendedOrder;
      const reorderedPhases = [];

      // Agregar fases en el orden recomendado
      recommendedOrder.forEach(recommendedPhase => {
        const matchingPhase = enhancedPhases.find(phase => 
          phase.name.toLowerCase().includes(recommendedPhase.toLowerCase()) ||
          recommendedPhase.toLowerCase().includes(phase.name.toLowerCase())
        );
        if (matchingPhase) {
          reorderedPhases.push(matchingPhase);
        }
      });

      // Agregar fases no encontradas al final
      enhancedPhases.forEach(phase => {
        if (!reorderedPhases.find(p => p.id === phase.id)) {
          reorderedPhases.push(phase);
        }
      });

      return reorderedPhases;
    }

    return enhancedPhases;
  }

  /**
   * Mejorar duraciones de actividades
   */
  enhanceActivityDurations(activities, durationInsights) {
    if (!activities || !Array.isArray(activities)) {
      console.warn('⚠️ Activities no es un array válido:', activities);
      return [];
    }
    
    return activities.map(activity => {
      const activityType = this.categorizeActivityType(activity.name);
      const learnedDuration = durationInsights.avgDurationsByType[activityType];
      
      if (learnedDuration && Math.abs(learnedDuration - activity.duration) > 2) {
        return {
          ...activity,
          duration: learnedDuration,
          originalDuration: activity.duration,
          enhancedBy: 'learning'
        };
      }
      
      return activity;
    });
  }

  /**
   * Mejorar espaciado de hitos
   */
  enhanceMilestoneSpacing(milestones, avgSpacing) {
    return milestones.map((milestone, index) => {
      const newSpacing = avgSpacing + (index * 5); // Variación pequeña
      return {
        ...milestone,
        spacing: newSpacing,
        originalSpacing: milestone.spacing || 14,
        enhancedBy: 'learning'
      };
    });
  }

  /**
   * Aplicar convenciones de nomenclatura
   */
  applyNamingConventions(items, namingInsights, type) {
    return items.map((item, index) => {
      let enhancedName = item.name;
      
      if (type === 'activity' && namingInsights.recommendedActivityPrefixes.length > 0) {
        const prefix = namingInsights.recommendedActivityPrefixes[index % namingInsights.recommendedActivityPrefixes.length];
        if (!enhancedName.toLowerCase().startsWith(prefix.toLowerCase())) {
          enhancedName = `${prefix} ${enhancedName}`;
        }
      } else if (type === 'milestone' && namingInsights.recommendedMilestonePrefixes.length > 0) {
        const prefix = namingInsights.recommendedMilestonePrefixes[0];
        if (!enhancedName.toLowerCase().includes(prefix.toLowerCase())) {
          enhancedName = `${prefix}: ${enhancedName}`;
        }
      }

      return enhancedName !== item.name ? {
        ...item,
        name: enhancedName,
        originalName: item.name,
        enhancedBy: 'learning'
      } : item;
    });
  }

  /**
   * Mejorar metadata de complejidad
   */
  enhanceComplexityMetadata(originalMetadata, complexityInsights, projectContext) {
    return {
      ...originalMetadata,
      complexity: complexityInsights.mostCommonComplexity,
      estimatedTaskCount: complexityInsights.avgTaskCount,
      estimatedDuration: complexityInsights.avgProjectDuration,
      learningBased: true,
      complexityDistribution: complexityInsights.complexityDistribution
    };
  }

  /**
   * Categorizar tipo de actividad
   */
  categorizeActivityType(activityName) {
    const name = activityName.toLowerCase();
    
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
   * Agregar metadata de fallback
   */
  addFallbackMetadata(template, reason, errorMessage = null) {
    return aiLearningValidation.createSafeFallback(template, errorMessage);
  }

  /**
   * Obtener estadísticas de aprendizaje
   */
  async getLearningStatistics() {
    try {
      const stats = await aiLearningService.getLearningStats();
      return {
        success: true,
        statistics: stats
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extraer actividades aprendidas de los patrones
   */
  extractLearnedActivities(learnedPatterns) {
    const activities = [];
    
    learnedPatterns.forEach(pattern => {
      if (pattern.pattern_data && pattern.pattern_data.activities) {
        pattern.pattern_data.activities.forEach(activity => {
          // Solo agregar actividades únicas y significativas
          if (activity.name && activity.name.trim().length > 0) {
            const existingActivity = activities.find(a => 
              this.areActivitiesSimilar(a.name, activity.name)
            );
            
            if (!existingActivity) {
              activities.push({
                name: activity.name,
                duration: activity.duration || 5,
                isMilestone: activity.isMilestone || false,
                confidence: pattern.confidence_score || 0.8,
                source: pattern.source_file || 'unknown'
              });
            }
          }
        });
      }
    });
    
    console.log(`📋 Actividades extraídas para aprendizaje: ${activities.length}`);
    if (activities.length > 0) {
      console.log('🔍 Primeras 3 actividades aprendidas:', activities.slice(0, 3).map(a => a.name));
    }
    return activities;
  }

  /**
   * Agregar actividades aprendidas de los archivos al template
   */
  addLearnedActivities(existingActivities, learnedActivities, projectContext) {
    if (!learnedActivities || learnedActivities.length === 0) {
      return existingActivities || [];
    }

    console.log('🧠 Agregando actividades aprendidas:', learnedActivities.length);
    
    const enhancedActivities = [...(existingActivities || [])];
    let activityId = enhancedActivities.length + 1;

    learnedActivities.forEach(learnedActivity => {
      // Crear actividad basada en el aprendizaje
      const newActivity = {
        id: `learned-${activityId++}`,
        name: learnedActivity.name,
        duration: learnedActivity.duration || 5,
        category: this.categorizeActivityType(learnedActivity.name),
        phase: this.determinePhase(learnedActivity.name, projectContext),
        isMilestone: learnedActivity.isMilestone || false,
        priority: this.determinePriority(learnedActivity.name),
        generatedBy: 'ai-learning',
        learnedFrom: true,
        confidence: learnedActivity.confidence || 0.8,
        originalName: learnedActivity.name
      };

      // Solo agregar si no existe una actividad similar
      const similarActivity = enhancedActivities.find(activity => 
        this.areActivitiesSimilar(activity.name, learnedActivity.name)
      );

      if (!similarActivity) {
        enhancedActivities.push(newActivity);
        console.log(`✅ Actividad aprendida agregada: ${learnedActivity.name}`);
      } else {
        console.log(`⚠️ Actividad similar ya existe: ${learnedActivity.name}`);
      }
    });

    console.log(`📊 Total actividades después de aprendizaje: ${enhancedActivities.length}`);
    return enhancedActivities;
  }

  /**
   * Determinar si dos actividades son similares
   */
  areActivitiesSimilar(name1, name2) {
    const similarity = this.calculateStringSimilarity(name1.toLowerCase(), name2.toLowerCase());
    return similarity > 0.7; // 70% de similitud
  }

  /**
   * Calcular similitud entre dos strings
   */
  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcular distancia de Levenshtein
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Determinar la fase de una actividad basada en su nombre
   */
  determinePhase(activityName, projectContext) {
    const name = activityName.toLowerCase();
    
    if (name.includes('planificación') || name.includes('análisis') || name.includes('requerimientos')) {
      return 'Planificación';
    } else if (name.includes('diseño') || name.includes('especificaciones') || name.includes('cotización')) {
      return 'Diseño';
    } else if (name.includes('compra') || name.includes('adquisición') || name.includes('licitación')) {
      return 'Adquisición';
    } else if (name.includes('instalación') || name.includes('montaje') || name.includes('configuración')) {
      return 'Implementación';
    } else if (name.includes('prueba') || name.includes('test') || name.includes('verificación')) {
      return 'Pruebas';
    } else if (name.includes('capacitación') || name.includes('entrenamiento') || name.includes('documentación')) {
      return 'Cierre';
    }
    
    return 'Ejecución';
  }

  /**
   * Determinar prioridad basada en el nombre de la actividad
   */
  determinePriority(activityName) {
    const name = activityName.toLowerCase();
    
    if (name.includes('hito') || name.includes('crítico') || name.includes('urgente')) {
      return 'high';
    } else if (name.includes('importante') || name.includes('clave')) {
      return 'medium';
    }
    
    return 'medium';
  }
}

// Exportar instancia singleton
const aiLearningEngine = new AILearningEngine();
export default aiLearningEngine;
