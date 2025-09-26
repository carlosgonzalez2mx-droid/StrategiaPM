/**
 * AISchedulerService - Servicio para generación inteligente de cronogramas
 * StrategiaPM - MVP Implementation
 * 
 * Este servicio maneja la lógica de IA para generar cronogramas automáticamente
 * basándose en templates, patrones aprendidos y contexto del proyecto.
 */

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
    console.log('🤖 AISchedulerService inicializado:', { organizationId, userId: currentUser?.id });
  }

  /**
   * Generar cronograma inteligente basado en las respuestas del wizard
   * @param {Object} wizardData - Datos del wizard (respuestas del usuario)
   * @returns {Object} Cronograma generado con actividades, hitos y recomendaciones
   */
  async generateSmartSchedule(wizardData) {
    try {
      console.log('🤖 Generando cronograma inteligente:', wizardData);

      // 1. Seleccionar el mejor template basado en los inputs
      const template = await this.selectBestTemplate(wizardData);
      console.log('📋 Template seleccionado:', template?.name);

      // 2. Ajustar actividades por contexto del proyecto
      const adjustedActivities = await this.adjustActivitiesByContext(template, wizardData);
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

      // 6. Crear el cronograma final
      const generatedSchedule = {
        activities: adjustedActivities,
        milestones: smartMilestones,
        criticalPath: criticalPath,
        recommendations: recommendations,
        metadata: {
          templateUsed: template?.name,
          generatedAt: new Date().toISOString(),
          wizardData: wizardData,
          estimatedDuration: this.calculateTotalDuration(adjustedActivities),
          complexity: this.assessComplexity(wizardData, adjustedActivities)
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
      const { projectType, industry, methodology } = wizardData;

      // Buscar templates que coincidan con los criterios
      let query = this.supabase
        .from('schedule_templates')
        .select('*')
        .eq('organization_id', this.organizationId);

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

      if (!templates || templates.length === 0) {
        console.warn('No se encontraron templates específicos, usando template genérico');
        // Buscar template genérico o el más usado
        const { data: genericTemplates } = await this.supabase
          .from('schedule_templates')
          .select('*')
          .eq('organization_id', this.organizationId)
          .limit(1);
        
        if (genericTemplates?.[0]) {
          return genericTemplates[0];
        }
        
        // Si no hay templates en la base de datos, crear uno genérico
        console.log('📋 Creando template genérico para el proyecto');
        return {
          id: 'generic-template',
          name: 'Template Genérico de Proyecto',
          description: 'Template genérico basado en mejores prácticas de gestión de proyectos',
          project_type: wizardData.projectType || 'general',
          industry: wizardData.industry || 'general',
          methodology: wizardData.methodology || 'waterfall',
          template_data: this.getGenericTemplateData(wizardData)
        };
      }

      // Seleccionar el template más apropiado
      const bestTemplate = this.rankTemplates(templates, wizardData)[0];
      return bestTemplate;

    } catch (error) {
      console.error('Error seleccionando template:', error);
      return null;
    }
  }

  /**
   * Ajustar actividades del template por contexto del proyecto
   */
  async adjustActivitiesByContext(template, context) {
    if (!template || !template.template_data) {
      console.warn('Template no válido para ajustar actividades');
      return [];
    }

    const { phases } = template.template_data;
    const adjustedActivities = [];
    let activityId = 1;

    // Ajustar duraciones basado en el tamaño del equipo
    const teamSizeMultiplier = this.calculateTeamSizeMultiplier(context.teamSize);
    
    // Ajustar duraciones basado en la experiencia del equipo
    const experienceMultiplier = this.calculateExperienceMultiplier(context.teamExperience);

    phases.forEach((phase, phaseIndex) => {
      phase.activities.forEach((activity, activityIndex) => {
        // Calcular duración ajustada
        let adjustedDuration = activity.duration;
        
        // Aplicar multiplicadores
        adjustedDuration = Math.ceil(adjustedDuration * teamSizeMultiplier * experienceMultiplier);
        
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
          phase: phase.name,
          phaseIndex: phaseIndex,
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
        dependencies: phaseActivities.map(a => a.id),
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
        template_id: generatedSchedule.metadata.templateUsed,
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
      const { data: templates, error } = await this.supabase
        .from('schedule_templates')
        .select('*')
        .eq('organization_id', this.organizationId)
        .order('name');

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
}

// Exportar como singleton
const aiSchedulerService = new AISchedulerService();
export default aiSchedulerService;
