/**
 * AISchedulerService - Servicio para generación inteligente de cronogramas
 * StrategiaPM - MVP Implementation
 * 
 * Este servicio maneja la lógica de IA para generar cronogramas automáticamente
 * basándose en templates, patrones aprendidos y contexto del proyecto.
 */

import aiLearningEngine from './AILearningEngine';
import TemplateBasedSchedulerService from './TemplateBasedSchedulerService.js';

class AISchedulerService {
  constructor() {
    this.supabase = null;
    this.organizationId = null;
    this.currentUser = null;
  }

  // Inicializar el servicio con Supabase
  async initialize(supabase, organizationId, currentUser) {
    this.supabase = supabase;
    this.organizationId = organizationId;
    this.currentUser = currentUser;
    
    // Inicializar también el motor de aprendizaje
    await aiLearningEngine.initialize(supabase, organizationId, currentUser?.id);
    
    console.log('🤖 AISchedulerService inicializado:', { organizationId, userId: currentUser?.id });
  }

  /**
   * Generar cronograma inteligente basado en las respuestas del wizard
   * @param {Object} wizardData - Datos del wizard (respuestas del usuario)
   * @returns {Object} Cronograma generado con actividades, hitos y recomendaciones
   */
  async generateSmartSchedule(wizardData) {
    try {
      console.log('🤖 AISchedulerService: Generando cronograma inteligente:', wizardData);
      console.log('🔍 AISchedulerService: projectType =', wizardData.projectType);
      console.log('🔍 AISchedulerService: projectType === "equipment_installation"?', wizardData.projectType === 'equipment_installation');

      // Si es un proyecto de compra de equipos, usar el template real
      if (wizardData.projectType === 'equipment_installation') {
        console.log('🏭 AISchedulerService: Proyecto de compra de equipos detectado - usando template real');
        return await TemplateBasedSchedulerService.generateTemplateBasedSchedule(wizardData);
      }

      // 1. Seleccionar el mejor template basado en los inputs
      const template = await this.selectBestTemplate(wizardData);
      console.log('📋 Template seleccionado:', template?.name);
      
      if (!template) {
        throw new Error('No se pudo seleccionar un template válido');
      }

      // 2. Ajustar actividades por contexto del proyecto
      console.log('🔍 Template antes de ajustar actividades:', {
        hasTemplateData: !!template.template_data,
        hasActivities: !!template.activities,
        activitiesLength: template.activities?.length || 0,
        templateKeys: Object.keys(template)
      });
      
      // Usar actividades del template base
      console.log('📋 Usando actividades del template base');
      const activitiesToAdjust = await this.extractActivitiesFromTemplate(template, wizardData);
      
      const adjustedActivities = await this.adjustActivitiesByContext(template, wizardData, activitiesToAdjust);
      console.log('⚙️ Actividades ajustadas:', adjustedActivities.length);

      // 3. Generar hitos inteligentes
      const smartMilestones = await this.generateSmartMilestones(adjustedActivities, wizardData);
      console.log('🎯 Hitos generados:', smartMilestones.length);

      // 4. Calcular ruta crítica
      const criticalPath = this.calculateCriticalPath(adjustedActivities);
      console.log('🔗 Ruta crítica calculada:', criticalPath.length, 'actividades');

      // 5. Generar recomendaciones
      const recommendations = this.generateRecommendations(wizardData, adjustedActivities);
      console.log('💡 Recomendaciones generadas:', recommendations.length);

      // 6. Ordenar actividades lógicamente para maquinaria
      let finalActivities = adjustedActivities;
      if (wizardData.projectType === 'equipment_installation') {
        finalActivities = this.sortMachineryActivities(adjustedActivities, wizardData);
        console.log('📋 Actividades ordenadas lógicamente');
      }

      // 7. Crear el cronograma final
      const generatedSchedule = {
        activities: finalActivities,
        milestones: smartMilestones,
        criticalPath: criticalPath,
        recommendations: recommendations,
        metadata: {
          templateUsed: template?.name,
          templateId: template?.id,
          generatedAt: new Date().toISOString(),
          wizardData: wizardData,
          estimatedDuration: this.calculateTotalDuration(finalActivities),
          complexity: this.assessComplexity(wizardData, finalActivities)
        }
      };

      // 7. Guardar en historial para aprendizaje
      await this.saveGenerationHistory(wizardData, generatedSchedule);

      console.log('✅ Cronograma generado exitosamente');
      return generatedSchedule;

    } catch (error) {
      console.error('❌ Error generando cronograma:', error);
      throw new Error(`Error generando cronograma: ${error.message}`);
    }
  }

  /**
   * Seleccionar el mejor template basado en los inputs del wizard
   */
  async selectBestTemplate(wizardData) {
    try {
      console.log('🔍 Seleccionando template para:', wizardData.projectType, wizardData.industry);

      // Obtener template base
      let baseTemplate = await this.getBaseTemplate(wizardData);
      
      if (!baseTemplate) {
        console.warn('No se pudo obtener template base');
        return null;
      }

      // Usar template base sin aprendizaje (Opción 3)
      console.log('📋 Usando template base sin aprendizaje');
      const finalTemplate = baseTemplate;
      
      console.log('📋 Template final seleccionado:', {
        name: finalTemplate.name,
        enhanced: false,
        confidence: 0
      });

      return finalTemplate;

    } catch (error) {
      console.error('Error seleccionando template:', error);
      return null;
    }
  }

  /**
   * Obtener template base (lógica original)
   */
  async getBaseTemplate(wizardData) {
    try {
      const { projectType, industry, methodology } = wizardData;

      if (!this.supabase) {
        console.log('📋 Usando template genérico (Sin Supabase)');
        const genericTemplate = {
          id: 'generic-template',
          name: 'Template Genérico de Proyecto',
          description: 'Template genérico basado en mejores prácticas de gestión de proyectos',
          project_type: wizardData.projectType || 'general',
          industry: wizardData.industry || 'general',
          methodology: wizardData.methodology || 'waterfall',
          template_data: this.getGenericTemplateData(wizardData)
        };
        
        // Extraer actividades de las fases para el aprendizaje
        if (genericTemplate.template_data && genericTemplate.template_data.phases) {
          genericTemplate.activities = this.extractActivitiesFromPhases(genericTemplate.template_data.phases);
          genericTemplate.milestones = this.extractMilestonesFromPhases(genericTemplate.template_data.phases);
        }
        
        return genericTemplate;
      }

      // Buscar templates que coincidan con los criterios
      let query = this.supabase
        .from('schedule_templates')
        .select('*');
      
      // Solo filtrar por organization_id si está definido
      if (this.organizationId) {
        query = query.or(`organization_id.eq.${this.organizationId},organization_id.is.null`);
      } else {
        query = query.is('organization_id', null);
      }

      // Filtrar por tipo de proyecto si está disponible
      if (projectType) {
        query = query.eq('project_type', projectType);
      }

      // Filtrar por industria si está disponible
      if (industry) {
        query = query.eq('industry', industry);
      }

      // Filtrar por metodología si está disponible
      if (methodology) {
        query = query.eq('methodology', methodology);
      }

      const { data: templates, error } = await query;

      if (error) {
        console.error('Error obteniendo templates:', error);
        throw error;
      }

      console.log('📋 Templates encontrados:', templates?.length || 0);

      if (!templates || templates.length === 0) {
        console.warn('No se encontraron templates específicos, usando template genérico');
        // Buscar template genérico o el más usado
        let genericQuery = this.supabase
          .from('schedule_templates')
          .select('*');
        
        if (this.organizationId) {
          genericQuery = genericQuery.or(`organization_id.eq.${this.organizationId},organization_id.is.null`);
        } else {
          genericQuery = genericQuery.is('organization_id', null);
        }
        
        const { data: genericTemplates } = await genericQuery.limit(1);
        
        if (genericTemplates?.[0]) {
          return genericTemplates[0];
        }
        
        // Si no hay templates en la base de datos, crear uno genérico
        console.log('📋 Creando template genérico para el proyecto');
        const genericTemplate = {
          id: 'generic-template',
          name: 'Template Genérico de Proyecto',
          description: 'Template genérico basado en mejores prácticas de gestión de proyectos',
          project_type: wizardData.projectType || 'general',
          industry: wizardData.industry || 'general',
          methodology: wizardData.methodology || 'waterfall',
          template_data: this.getGenericTemplateData(wizardData)
        };
        
        // Extraer actividades de las fases para el aprendizaje
        if (genericTemplate.template_data && genericTemplate.template_data.phases) {
          genericTemplate.activities = this.extractActivitiesFromPhases(genericTemplate.template_data.phases);
          genericTemplate.milestones = this.extractMilestonesFromPhases(genericTemplate.template_data.phases);
        }
        
        return genericTemplate;
      }

      // Seleccionar el template más apropiado
      const bestTemplate = this.rankTemplates(templates, wizardData)[0];
      
      // Extraer actividades de las fases para el aprendizaje
      if (bestTemplate && bestTemplate.template_data && bestTemplate.template_data.phases) {
        bestTemplate.activities = this.extractActivitiesFromPhases(bestTemplate.template_data.phases);
        bestTemplate.milestones = this.extractMilestonesFromPhases(bestTemplate.template_data.phases);
      }
      
      return bestTemplate;

    } catch (error) {
      console.error('Error obteniendo template base:', error);
      return null;
    }
  }

  /**
   * Ajustar actividades del template por contexto del proyecto
   */
  async adjustActivitiesByContext(template, context, activitiesToAdjust = null) {
    if (!template) {
      console.warn('Template no válido para ajustar actividades');
      return [];
    }

    // Usar actividades proporcionadas, o extraer del template
    let activities = activitiesToAdjust;
    if (!activities) {
      activities = template.activities;
      if (!activities && template.template_data && template.template_data.phases) {
        activities = this.extractActivitiesFromPhases(template.template_data.phases);
      }
    }
    
    if (!activities || activities.length === 0) {
      console.warn('No hay actividades disponibles en el template');
      return [];
    }

    const adjustedActivities = [];
    let activityId = 1;

    // Ajustar duraciones basado en el tamaño del equipo
    const teamSizeMultiplier = this.calculateTeamSizeMultiplier(context.teamSize);
    
    // Ajustar duraciones basado en la experiencia del equipo
    const experienceMultiplier = this.calculateExperienceMultiplier(context.teamExperience);

    activities.forEach((activity, activityIndex) => {
      // Calcular duración ajustada
      let adjustedDuration = activity.duration;
      
      // Aplicar multiplicadores
      adjustedDuration = Math.ceil(adjustedDuration * teamSizeMultiplier * experienceMultiplier);
      
      // Aplicar ajustes específicos para maquinaria
      if (context.projectType === 'equipment_installation') {
        adjustedDuration = this.adjustMachineryActivityDuration(activity, adjustedDuration, context);
      }
      
      // Aplicar buffer de riesgo si es necesario
      if (context.riskTolerance === 'low') {
        adjustedDuration = Math.ceil(adjustedDuration * 1.2); // 20% más tiempo
      } else if (context.riskTolerance === 'high') {
        adjustedDuration = Math.ceil(adjustedDuration * 0.8); // 20% menos tiempo
      }

      // Crear actividad ajustada
      const adjustedActivity = {
        id: `ai-${activityId++}`,
        name: activity.name,
        description: this.generateActivityDescription(activity, context),
        duration: Math.max(1, adjustedDuration), // Mínimo 1 día
        category: activity.category || 'execution',
        phase: activity.phase || 'General',
        phaseIndex: activity.phaseIndex || 0,
        activityIndex: activityIndex,
        isMilestone: activity.isMilestone || false,
        priority: this.determinePriority(activity, context),
          assignedTo: this.suggestAssignee(activity, context),
          dependencies: this.adjustDependencies(activity.dependencies, adjustedActivities),
          estimatedCost: this.estimateCost(activity, context),
          requiredSkills: activity.requiredSkills || [],
          parallel: activity.parallel || false,
          generatedBy: 'ai',
          confidence: this.calculateConfidence(activity, context)
        };

        adjustedActivities.push(adjustedActivity);
    });

    return adjustedActivities;
  }

  /**
   * Generar hitos inteligentes basados en las actividades
   */
  async generateSmartMilestones(activities, context) {
    const milestones = [];
    let milestoneId = 1;

    // Agrupar actividades por fase
    const activitiesByPhase = {};
    activities.forEach(activity => {
      if (!activitiesByPhase[activity.phase]) {
        activitiesByPhase[activity.phase] = [];
      }
      activitiesByPhase[activity.phase].push(activity);
    });

    // Crear hitos por fase
    Object.entries(activitiesByPhase).forEach(([phaseName, phaseActivities]) => {
      const phaseMilestone = {
        id: `milestone-${milestoneId++}`,
        name: `HITO: ${phaseName} Completada`,
        description: `Completar todas las actividades de la fase: ${phaseName}`,
        phase: phaseName,
        isMilestone: true,
        duration: 0, // Los hitos no tienen duración
        startDate: null, // Se calculará después
        endDate: null, // Se calculará después
        progress: 0,
        status: 'pending',
        priority: 'high',
        assignedTo: context.projectManager || 'Pendiente',
        dependencies: [],
        criteria: this.generateMilestoneCriteria(phaseName, phaseActivities),
        generatedBy: 'ai',
        confidence: 0.9
      };

      milestones.push(phaseMilestone);
    });

    // Agregar hitos específicos por tipo de proyecto
    const specificMilestones = this.generateSpecificMilestones(context, activities);
    milestones.push(...specificMilestones);

    return milestones;
  }

  /**
   * Calcular ruta crítica del proyecto
   */
  calculateCriticalPath(activities) {
    // Implementación simplificada de CPM
    const criticalActivities = activities.filter(activity => {
      // Actividades con alta prioridad o sin flexibilidad en fechas
      return activity.priority === 'high' || 
             activity.dependencies.length > 2 ||
             activity.estimatedCost > 10000;
    });

    return criticalActivities.map(activity => activity.id);
  }

  /**
   * Generar recomendaciones basadas en el análisis
   */
  generateRecommendations(wizardData, activities) {
    const recommendations = [];

    // Recomendación basada en tamaño del equipo
    if (wizardData.teamSize < 3) {
      recommendations.push({
        type: 'team',
        priority: 'high',
        title: 'Equipo Pequeño',
        description: 'Con un equipo pequeño, considera reducir el paralelismo de actividades para evitar sobrecarga.',
        action: 'Revisar actividades paralelas y secuencializar si es necesario'
      });
    }

    // Recomendación basada en experiencia
    if (wizardData.teamExperience === 'junior') {
      recommendations.push({
        type: 'experience',
        priority: 'medium',
        title: 'Equipo Junior',
        description: 'Equipo con poca experiencia. Considera agregar tiempo de capacitación y mentoría.',
        action: 'Agregar actividades de capacitación y revisión adicional'
      });
    }

    // Recomendación basada en duración del proyecto
    const totalDuration = this.calculateTotalDuration(activities);
    if (totalDuration > 180) {
      recommendations.push({
        type: 'duration',
        priority: 'high',
        title: 'Proyecto de Larga Duración',
        description: 'Proyecto de más de 6 meses. Considera dividir en fases más pequeñas.',
        action: 'Implementar hitos de control mensuales'
      });
    }

    // Recomendación basada en complejidad
    const highComplexityActivities = activities.filter(a => a.priority === 'high').length;
    if (highComplexityActivities > activities.length * 0.3) {
      recommendations.push({
        type: 'complexity',
        priority: 'medium',
        title: 'Alta Complejidad',
        description: 'Muchas actividades de alta complejidad. Considera agregar buffers de tiempo.',
        action: 'Agregar 15% de buffer en estimaciones de tiempo'
      });
    }

    return recommendations;
  }

  /**
   * Guardar historial de generación para aprendizaje
   */
  async saveGenerationHistory(wizardData, generatedSchedule) {
    try {
      const generationRecord = {
        project_id: wizardData.projectId,
        template_id: generatedSchedule.metadata.templateId || null, // Usar ID del template, no el nombre
        input_data: wizardData,
        generated_schedule: generatedSchedule,
        created_by: this.currentUser.id,
        organization_id: this.organizationId
      };

      const { error } = await this.supabase
        .from('ai_schedule_generations')
        .insert(generationRecord);

      if (error) {
        console.error('Error guardando historial de generación:', error);
      } else {
        console.log('✅ Historial de generación guardado');
      }
    } catch (error) {
      console.error('Error guardando historial:', error);
    }
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  /**
   * Calcular multiplicador basado en tamaño del equipo
   */
  calculateTeamSizeMultiplier(teamSize) {
    if (teamSize <= 2) return 1.3; // 30% más tiempo
    if (teamSize <= 5) return 1.0; // Tiempo normal
    if (teamSize <= 8) return 0.9; // 10% menos tiempo
    return 0.8; // 20% menos tiempo para equipos grandes
  }

  /**
   * Calcular multiplicador basado en experiencia del equipo
   */
  calculateExperienceMultiplier(experience) {
    switch (experience) {
      case 'junior': return 1.4; // 40% más tiempo
      case 'intermediate': return 1.1; // 10% más tiempo
      case 'senior': return 0.9; // 10% menos tiempo
      case 'expert': return 0.8; // 20% menos tiempo
      default: return 1.0;
    }
  }

  /**
   * Generar descripción de actividad
   */
  generateActivityDescription(activity, context) {
    const baseDescription = activity.description || `Ejecutar ${activity.name}`;
    
    if (context.projectDescription) {
      return `${baseDescription} para el proyecto: ${context.projectDescription}`;
    }
    
    return baseDescription;
  }

  /**
   * Determinar prioridad de actividad
   */
  determinePriority(activity, context) {
    if (activity.category === 'planning') return 'high';
    if (activity.category === 'testing') return 'high';
    if (activity.isMilestone) return 'high';
    if (activity.parallel) return 'medium';
    return 'medium';
  }

  /**
   * Sugerir asignación de actividad
   */
  suggestAssignee(activity, context) {
    if (context.projectManager) return context.projectManager;
    
    // Sugerencias basadas en categoría
    switch (activity.category) {
      case 'planning': return 'Project Manager';
      case 'execution': return 'Team Lead';
      case 'testing': return 'QA Lead';
      case 'delivery': return 'Project Manager';
      default: return 'Pendiente';
    }
  }

  /**
   * Ajustar dependencias
   */
  adjustDependencies(dependencies, existingActivities) {
    if (!dependencies || !Array.isArray(dependencies)) return [];
    
    // Convertir nombres de dependencias a IDs si es necesario
    return dependencies.map(dep => {
      const existingActivity = existingActivities.find(a => a.name === dep);
      return existingActivity ? existingActivity.id : dep;
    });
  }

  /**
   * Estimar costo de actividad
   */
  estimateCost(activity, context) {
    const baseCost = activity.estimatedCost || 1000;
    const teamSize = context.teamSize || 1;
    const duration = activity.duration || 1;
    
    return baseCost * teamSize * duration * 0.1; // Estimación simplificada
  }

  /**
   * Calcular confianza en la actividad
   */
  calculateConfidence(activity, context) {
    let confidence = 0.7; // Base confidence
    
    // Aumentar confianza si hay template específico
    if (context.projectType && context.industry) confidence += 0.2;
    
    // Aumentar confianza si hay experiencia en el equipo
    if (context.teamExperience === 'senior' || context.teamExperience === 'expert') {
      confidence += 0.1;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Generar criterios de hito
   */
  generateMilestoneCriteria(phaseName, activities) {
    const activityNames = activities.map(a => a.name).join(', ');
    return `Completar exitosamente: ${activityNames}`;
  }

  /**
   * Generar hitos específicos por tipo de proyecto
   */
  generateSpecificMilestones(context, activities) {
    const specificMilestones = [];
    let milestoneId = 1000; // IDs altos para hitos específicos

    switch (context.projectType) {
      case 'equipment_installation':
        specificMilestones.push({
          id: `milestone-${milestoneId++}`,
          name: 'HITO: Equipo Recibido y Verificado',
          description: 'Equipo recibido, inspeccionado y verificado según especificaciones',
          isMilestone: true,
          duration: 0,
          progress: 0,
          status: 'pending',
          priority: 'high',
          assignedTo: 'Quality Inspector',
          criteria: 'Equipo recibido, inspección de calidad aprobada, documentación verificada',
          generatedBy: 'ai',
          confidence: 0.9
        });
        break;
        
      case 'development':
        specificMilestones.push({
          id: `milestone-${milestoneId++}`,
          name: 'HITO: Código en Producción',
          description: 'Código desplegado y funcionando en ambiente de producción',
          isMilestone: true,
          duration: 0,
          progress: 0,
          status: 'pending',
          priority: 'high',
          assignedTo: 'DevOps Lead',
          criteria: 'Deployment exitoso, pruebas de humo pasando, monitoreo activo',
          generatedBy: 'ai',
          confidence: 0.9
        });
        break;
    }

    return specificMilestones;
  }


  /**
   * Calcular duración total del proyecto
   */
  calculateTotalDuration(activities) {
    return activities.reduce((total, activity) => total + (activity.duration || 0), 0);
  }

  /**
   * Evaluar complejidad del proyecto
   */
  assessComplexity(wizardData, activities) {
    let complexity = 'medium';
    
    const totalDuration = this.calculateTotalDuration(activities);
    const highPriorityActivities = activities.filter(a => a.priority === 'high').length;
    const teamSize = wizardData.teamSize || 1;
    
    if (totalDuration > 120 || highPriorityActivities > 5 || teamSize < 3) {
      complexity = 'high';
    } else if (totalDuration < 30 && highPriorityActivities < 3 && teamSize >= 5) {
      complexity = 'low';
    }
    
    return complexity;
  }

  /**
   * Clasificar templates por relevancia
   */
  rankTemplates(templates, wizardData) {
    return templates.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      // Puntuar por coincidencia de tipo de proyecto
      if (a.project_type === wizardData.projectType) scoreA += 3;
      if (b.project_type === wizardData.projectType) scoreB += 3;
      
      // Puntuar por coincidencia de industria
      if (a.industry === wizardData.industry) scoreA += 2;
      if (b.industry === wizardData.industry) scoreB += 2;
      
      // Puntuar por coincidencia de metodología
      if (a.methodology === wizardData.methodology) scoreA += 1;
      if (b.methodology === wizardData.methodology) scoreB += 1;
      
      return scoreB - scoreA; // Orden descendente
    });
  }

  /**
   * Obtener template genérico cuando no hay templates específicos
   */
  getGenericTemplateData(wizardData) {
    const { projectType = 'general', teamSize = 5 } = wizardData;
    
    // Template genérico basado en el tipo de proyecto
    const genericPhases = {
      'manufacturing': [
        {
          name: 'Planificación',
          activities: [
            { name: 'Definición de requerimientos', duration: 5, category: 'planning' },
            { name: 'Diseño conceptual', duration: 10, category: 'design' },
            { name: 'Planificación de recursos', duration: 3, category: 'planning' }
          ]
        },
        {
          name: 'Diseño y Desarrollo',
          activities: [
            { name: 'Diseño detallado', duration: 15, category: 'design' },
            { name: 'Especificaciones técnicas', duration: 8, category: 'design' },
            { name: 'Prototipo', duration: 20, category: 'development' }
          ]
        },
        {
          name: 'Implementación',
          activities: [
            { name: 'Compra e instalación de maquinas y equipos', duration: 30, category: 'procurement', isMilestone: true },
            { name: 'Instalación y configuración', duration: 15, category: 'implementation' },
            { name: 'Pruebas de funcionamiento', duration: 10, category: 'testing' }
          ]
        },
        {
          name: 'Cierre',
          activities: [
            { name: 'Capacitación del personal', duration: 5, category: 'training' },
            { name: 'Documentación final', duration: 3, category: 'documentation' },
            { name: 'Entrega del proyecto', duration: 2, category: 'delivery', isMilestone: true }
          ]
        }
      ],
      'general': [
        {
          name: 'Inicio',
          activities: [
            { name: 'Kick-off del proyecto', duration: 1, category: 'planning', isMilestone: true },
            { name: 'Definición de alcance', duration: 5, category: 'planning' },
            { name: 'Planificación inicial', duration: 7, category: 'planning' }
          ]
        },
        {
          name: 'Ejecución',
          activities: [
            { name: 'Desarrollo de actividades principales', duration: 20, category: 'execution' },
            { name: 'Seguimiento y control', duration: 15, category: 'monitoring' },
            { name: 'Gestión de cambios', duration: 8, category: 'management' }
          ]
        },
        {
          name: 'Cierre',
          activities: [
            { name: 'Pruebas finales', duration: 5, category: 'testing' },
            { name: 'Entrega del proyecto', duration: 3, category: 'delivery', isMilestone: true }
          ]
        }
      ]
    };

    return {
      phases: genericPhases[projectType] || genericPhases.general,
      estimatedDuration: 60,
      complexity: 'medium',
      riskLevel: 'medium'
    };
  }

  /**
   * Obtener templates disponibles
   */
  async getAvailableTemplates() {
    try {
      let query = this.supabase
        .from('schedule_templates')
        .select('*');
      
      if (this.organizationId) {
        query = query.or(`organization_id.eq.${this.organizationId},organization_id.is.null`);
      } else {
        query = query.is('organization_id', null);
      }
      
      const { data: templates, error } = await query.order('name');

      if (error) {
        console.error('Error obteniendo templates:', error);
        return [];
      }

      return templates || [];
    } catch (error) {
      console.error('Error obteniendo templates:', error);
      return [];
    }
  }

  /**
   * Obtener historial de generaciones
   */
  async getGenerationHistory(projectId = null) {
    try {
      let query = this.supabase
        .from('ai_schedule_generations')
        .select('*')
        .eq('organization_id', this.organizationId)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: history, error } = await query;

      if (error) {
        console.error('Error obteniendo historial:', error);
        return [];
      }

      return history || [];
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return [];
    }
  }

  /**
   * Proporcionar feedback sobre una generación
   */
  async provideFeedback(generationId, feedbackScore, feedbackComments = '') {
    try {
      const { error } = await this.supabase
        .from('ai_schedule_generations')
        .update({
          feedback_score: feedbackScore,
          feedback_comments: feedbackComments,
          updated_at: new Date().toISOString()
        })
        .eq('id', generationId)
        .eq('organization_id', this.organizationId);

      if (error) {
        console.error('Error guardando feedback:', error);
        return false;
      }

      console.log('✅ Feedback guardado exitosamente');
      return true;
    } catch (error) {
      console.error('Error guardando feedback:', error);
      return false;
    }
  }

  /**
   * Extraer actividades de las fases del template
   */
  extractActivitiesFromPhases(phases) {
    if (!phases || !Array.isArray(phases)) {
      return [];
    }

    const activities = [];
    let activityId = 1;

    phases.forEach((phase, phaseIndex) => {
      if (phase.activities && Array.isArray(phase.activities)) {
        phase.activities.forEach((activity, activityIndex) => {
          activities.push({
            id: `activity-${activityId}`,
            name: activity.name,
            duration: activity.duration || 1,
            category: activity.category || 'general',
            phase: phase.name,
            phaseIndex: phaseIndex,
            activityIndex: activityIndex,
            isMilestone: activity.isMilestone || false,
            priority: activity.priority || 'medium',
            dependencies: activity.dependencies || []
          });
          activityId++;
        });
      }
    });

    console.log(`📋 Actividades extraídas de fases: ${activities.length}`);
    return activities;
  }

  /**
   * Extraer actividades de un template (genérico o de base de datos)
   */
  async extractActivitiesFromTemplate(template, context = null) {
    let activities = [];
    
    if (template.activities && template.activities.length > 0) {
      activities = template.activities;
    } else if (template.template_data && template.template_data.phases) {
      activities = this.extractActivitiesFromPhases(template.template_data.phases);
    } else {
      console.warn('No se pudieron extraer actividades del template');
      return [];
    }

    // Agregar actividades específicas para maquinaria si es necesario
    if (context && context.projectType === 'equipment_installation') {
      activities = this.addMachinerySpecificActivities(activities, context);
    }
    
    return activities;
  }

  /**
   * Extraer hitos de las fases del template
   */
  extractMilestonesFromPhases(phases) {
    if (!phases || !Array.isArray(phases)) {
      return [];
    }

    const milestones = [];
    let milestoneId = 1;

    phases.forEach((phase, phaseIndex) => {
      if (phase.activities && Array.isArray(phase.activities)) {
        phase.activities.forEach((activity, activityIndex) => {
          if (activity.isMilestone) {
            milestones.push({
              id: `milestone-${milestoneId}`,
              name: activity.name,
              phase: phase.name,
              phaseIndex: phaseIndex,
              activityIndex: activityIndex,
              description: activity.description || `Hito: ${activity.name}`
            });
            milestoneId++;
          }
        });
      }
    });

    console.log(`📋 Hitos extraídos de fases: ${milestones.length}`);
    return milestones;
  }

  /**
   * Ajustar duración de actividad específica para maquinaria
   */
  adjustMachineryActivityDuration(activity, baseDuration, context) {
    const activityName = activity.name.toLowerCase();
    let adjustedDuration = baseDuration;

    // Actividades relacionadas con fabricación/producción - usar tiempo de entrega
    if (activityName.includes('fabricación') || activityName.includes('manufactura') || 
        activityName.includes('producción') || activityName.includes('manufacturing')) {
      
      if (context.deliveryTime && context.deliveryTimeUnit) {
        const deliveryDays = this.convertToDays(context.deliveryTime, context.deliveryTimeUnit);
        adjustedDuration = deliveryDays;
        console.log(`🔧 Ajustando "${activity.name}": ${baseDuration}d → ${adjustedDuration}d (tiempo de entrega: ${context.deliveryTime} ${context.deliveryTimeUnit})`);
      } else {
        console.log(`⚠️ No se pudo ajustar "${activity.name}": deliveryTime=${context.deliveryTime}, deliveryTimeUnit=${context.deliveryTimeUnit}`);
      }
    }

    // Actividades administrativas - duraciones cortas y fijas
    if (activityName.includes('aprobación') || activityName.includes('aprobación de compras') || 
        activityName.includes('autorización') || activityName.includes('firma de contratos')) {
      
      adjustedDuration = Math.min(adjustedDuration, 5); // Máximo 5 días para aprobaciones
      console.log(`📋 Ajustando "${activity.name}": ${baseDuration}d → ${adjustedDuration}d (actividad administrativa)`);
    }

    // Actividades de importación - agregar tiempo adicional
    if (context.isForeignEquipment && 
        (activityName.includes('importación') || activityName.includes('aduana') || 
         activityName.includes('embarque') || activityName.includes('transporte'))) {
      
      adjustedDuration = Math.max(adjustedDuration, 15); // Mínimo 15 días para importación
      console.log(`🌍 Ajustando "${activity.name}": ${baseDuration}d → ${adjustedDuration}d (importación)`);
    }

    // Actividades de infraestructura - agregar tiempo adicional
    if (context.requiresInfrastructure && 
        (activityName.includes('instalación') || activityName.includes('infraestructura') || 
         activityName.includes('preparación') || activityName.includes('cimentación'))) {
      
      adjustedDuration = Math.max(adjustedDuration, 10); // Mínimo 10 días para infraestructura
      console.log(`🔧 Ajustando "${activity.name}": ${baseDuration}d → ${adjustedDuration}d (infraestructura)`);
    }

    return adjustedDuration;
  }

  /**
   * Convertir tiempo a días
   */
  convertToDays(amount, unit) {
    switch (unit) {
      case 'days':
        return amount;
      case 'weeks':
        return amount * 7;
      case 'months':
        return amount * 30; // Aproximación
      default:
        return amount;
    }
  }

  /**
   * Agregar actividades específicas para maquinaria
   */
  addMachinerySpecificActivities(activities, context) {
    const newActivities = [...activities];
    let activityId = activities.length + 1;

    // Actividades de importación si es equipo extranjero
    if (context.isForeignEquipment) {
      const importActivities = [
        {
          id: `activity-${activityId++}`,
          name: 'Proceso de importación y aduanas',
          duration: 15,
          category: 'procurement',
          phase: 'Adquisición',
          isMilestone: false,
          priority: 'high'
        },
        {
          id: `activity-${activityId++}`,
          name: 'Embarque y transporte internacional',
          duration: Math.max(10, this.convertToDays(context.deliveryTime || 4, context.deliveryTimeUnit || 'weeks') / 3),
          category: 'procurement',
          phase: 'Adquisición',
          isMilestone: false,
          priority: 'high'
        }
      ];
      
      newActivities.push(...importActivities);
      console.log(`🌍 Agregadas ${importActivities.length} actividades de importación`);
    }

    // Actividades de infraestructura si es requerida
    if (context.requiresInfrastructure) {
      const infrastructureActivities = [
        {
          id: `activity-${activityId++}`,
          name: 'Preparación del sitio de instalación',
          duration: 10,
          category: 'preparation',
          phase: 'Implementación',
          isMilestone: false,
          priority: 'high'
        },
        {
          id: `activity-${activityId++}`,
          name: 'Modificaciones de infraestructura eléctrica',
          duration: 8,
          category: 'infrastructure',
          phase: 'Implementación',
          isMilestone: false,
          priority: 'high'
        },
        {
          id: `activity-${activityId++}`,
          name: 'Cimentación y bases para equipos',
          duration: 12,
          category: 'infrastructure',
          phase: 'Implementación',
          isMilestone: false,
          priority: 'high'
        }
      ];
      
      newActivities.push(...infrastructureActivities);
      console.log(`🔧 Agregadas ${infrastructureActivities.length} actividades de infraestructura`);
    }

    // Actividades de anticipos basadas en la configuración
    if (context.advancePayments && context.advancePayments.length > 0) {
      const paymentActivities = context.advancePayments.map((payment, index) => ({
        id: `activity-${activityId++}`,
        name: `${payment.percentage}% - ${payment.description}`,
        duration: 2,
        category: 'financial',
        phase: this.getPaymentPhase(payment.timing),
        isMilestone: true,
        priority: 'high',
        paymentInfo: {
          percentage: payment.percentage,
          timing: payment.timing,
          description: payment.description
        }
      }));
      
      newActivities.push(...paymentActivities);
      console.log(`💰 Agregadas ${paymentActivities.length} actividades de anticipos`);
    }

    console.log(`📊 Total actividades después de agregar específicas de maquinaria: ${newActivities.length}`);
    return newActivities;
  }

  /**
   * Determinar la fase basada en el timing del pago
   */
  getPaymentPhase(timing) {
    switch (timing) {
      case 'order':
        return 'Planificación';
      case 'production':
        return 'Adquisición';
      case 'shipping':
        return 'Adquisición';
      case 'delivery':
        return 'Implementación';
      case 'installation':
        return 'Implementación';
      case 'performance':
        return 'Cierre';
      default:
        return 'Planificación';
    }
  }

  /**
   * Obtener el orden temporal de un anticipo
   */
  getPaymentTimingOrder(timing) {
    switch (timing) {
      case 'order':
        return 1; // Al inicio del proyecto
      case 'production':
        return 2; // Durante fabricación
      case 'shipping':
        return 3; // Antes del envío
      case 'delivery':
        return 4; // Al entregar
      case 'installation':
        return 5; // Después de instalación
      case 'performance':
        return 6; // Al final
      default:
        return 999;
    }
  }

  /**
   * Ordenar actividades de maquinaria lógicamente
   */
  sortMachineryActivities(activities, context) {
    console.log('🔄 Iniciando ordenamiento de actividades:', activities.length);

    // Función simple para obtener el orden de una actividad
    const getActivitySortOrder = (activity) => {
      const name = activity.name.toLowerCase();
      
      // Actividades de planificación (primero)
      if (name.includes('análisis') || name.includes('necesidades') || name.includes('requerimientos')) {
        return 100;
      }
      
      // Anticipos según timing
      if (activity.paymentInfo) {
        switch (activity.paymentInfo.timing) {
          case 'order':
            return 200; // Después de análisis
          case 'production':
            return 800; // Durante fabricación
          case 'shipping':
            return 900; // Antes del envío
          case 'delivery':
            return 1200; // Al entregar
          case 'installation':
            return 1300; // Después de instalación
          case 'performance':
            return 1400; // Al final
          default:
            return 200;
        }
      }
      
      // Actividades de planificación y aprobación
      if (name.includes('aprobación') || name.includes('autorización') || name.includes('planificación')) {
        return 300;
      }
      
      // Búsqueda y selección de proveedores
      if (name.includes('búsqueda') || name.includes('proveedor') || name.includes('cotización')) {
        return 400;
      }
      
      // Actividades de compra y contratos
      if (name.includes('compra') || name.includes('contrato') || name.includes('firma')) {
        return 500;
      }
      
      // Fabricación y producción
      if (name.includes('fabricación') || name.includes('producción') || name.includes('manufactura')) {
        return 600;
      }
      
      // Actividades de importación
      if (name.includes('importación') || name.includes('aduana') || name.includes('embarque')) {
        return 700;
      }
      
      // Actividades de infraestructura
      if (name.includes('infraestructura') || name.includes('preparación') || name.includes('sitio')) {
        return 1000;
      }
      
      // Instalación
      if (name.includes('instalación') || name.includes('montaje') || name.includes('configuración')) {
        return 1100;
      }
      
      // Actividades de cierre
      if (name.includes('capacitación') || name.includes('documentación') || name.includes('garantía') || name.includes('soporte')) {
        return 1500;
      }
      
      // Actividades de entrega
      if (name.includes('entrega')) {
        return 1250;
      }
      
      // Por defecto, usar el orden de fase
      return this.getPhaseOrder(activity.phase) * 100;
    };

    const sortedActivities = activities.sort((a, b) => {
      const orderA = getActivitySortOrder(a);
      const orderB = getActivitySortOrder(b);
      
      console.log(`📋 Ordenando: ${a.name} (${orderA}) vs ${b.name} (${orderB})`);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Si tienen el mismo orden, ordenar alfabéticamente
      return a.name.localeCompare(b.name);
    });

    console.log('📋 Actividades ordenadas:');
    sortedActivities.forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.name} (${getActivitySortOrder(activity)})`);
    });

    return sortedActivities;
  }

  /**
   * Obtener el orden de una actividad dentro de su fase
   */
  getActivityOrder(activityName, phase) {
    const activityOrder = {
      'Planificación': [
        'análisis', 'requerimientos', 'planificación', 'aprobación', 'orden', 'cotización'
      ],
      'Adquisición': [
        'cotización', 'proveedor', 'compra', 'fabricación', 'producción', 'importación', 
        'aduana', 'embarque', 'transporte'
      ],
      'Implementación': [
        'infraestructura', 'preparación', 'sitio', 'cimentación', 'eléctrica', 
        'instalación', 'configuración', 'prueba', 'entrega'
      ],
      'Cierre': [
        'capacitación', 'documentación', 'garantía', 'soporte', 'performance'
      ]
    };

    const phaseOrder = activityOrder[phase] || [];
    for (let i = 0; i < phaseOrder.length; i++) {
      if (activityName.includes(phaseOrder[i])) {
        return i;
      }
    }
    return 999; // Al final si no se encuentra
  }

  /**
   * Obtener el orden de una fase
   */
  getPhaseOrder(phase) {
    const phaseOrder = {
      'Planificación': 1,
      'Adquisición': 2,
      'Implementación': 3,
      'Cierre': 4,
      'General': 5
    };
    return phaseOrder[phase] || 5;
  }

  /**
   * Obtener la posición relativa de un anticipo en el proyecto
   */
  getPaymentRelativePosition(timing) {
    switch (timing) {
      case 'order':
        return 500; // Al inicio, después de análisis
      case 'production':
        return 2500; // Durante fabricación
      case 'shipping':
        return 2800; // Antes del envío
      case 'delivery':
        return 3500; // Al entregar
      case 'installation':
        return 3800; // Después de instalación
      case 'performance':
        return 4500; // Al final
      default:
        return 9999;
    }
  }
}

// Exportar como singleton
const aiSchedulerService = new AISchedulerService();
export default aiSchedulerService;
