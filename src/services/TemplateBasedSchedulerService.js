/**
 * TemplateBasedSchedulerService - Servicio basado en template real
 * StrategiaPM - MVP Implementation
 */

import * as XLSX from 'xlsx';

class TemplateBasedSchedulerService {
  constructor() {
    this.templateData = null;
    this.templatePath = './template-compra-equipos.xlsx';
  }

  /**
   * Cargar template desde datos hardcodeados (basado en análisis previo)
   */
  async loadTemplate() {
    try {
      console.log('📋 Cargando template de compra de equipos...');
      
      // Datos del template extraídos del análisis previo
      const templateData = [
        ['#', 'Nombre', 'Duración', 'Prioridad', 'Asignado', 'Predecesoras', 'Hitos'],
        [1, 'Aprobación y alta del activo en sistema', '22 días', 'Alta', 'Team leader', '', 'No'],
        [2, 'Elaboración de edital técnico', '5 días', 'Alta', 'Team leader', '', 'No'],
        [3, 'Envío de edital a proveedores para participar en el proyecto', '5 días', 'Media', 'Comprador(a)', 2, 'No'],
        [4, 'Solución de dudas técnicas', '11 días', 'Media', 'Proveedores', 3, 'No'],
        [5, 'Selección de proveedor', '3 días', 'Alta', 'Comprador(a)', 4, 'No'],
        [6, 'Preparación de contrato con área legal', '7 días', 'Alta', 'Comprador(a)', 5, 'No'],
        [7, 'Alta del proveedor en sistema para pago', '10 días', 'Alta', 'Comprador(a)', 5, 'No'],
        [8, 'Definir el equipo de proyecto', '1 día', 'Media', 'Project Manager', 5, 'No'],
        [9, 'Kick-off meeting con proveedor seleccionado', '1 día', 'Media', 'Comprador(a)', 8, 'No'],
        [10, 'Hito: Orden de compra realizada', '0 días', 'Alta', 'Comprador(a)', 9, 'Si'],
        [11, 'Programación de 1er anticipo', '12 días', 'Alta', 'Comprador(a)', 10, 'No'],
        [12, 'Ajuste del cronograma', '1 día', 'Media', 'Project Manager', 11, 'No'],
        [13, 'HITO: 1er anticipo pagado', '0 días', 'Alta', 'Tesorero', 11, 'Si'],
        [14, 'Estudio de sitio', '2 días', 'Media', 'Team leader', 9, 'No'],
        [15, 'Diseño de layout y distribución de equipos', '5 días', 'Media', 'Team leader', 14, 'No'],
        [16, 'Especificaciones técnicas finales', '3 días', 'Alta', 'Team leader', 15, 'No'],
        [17, 'Ingeniería de servicios (vapor, aire, electricidad)', '4 días', 'Media', 'Team leader', 16, 'No'],
        [18, 'Plan de instalación y cronograma detallado', '1 día', 'Media', 'Team leader', 17, 'No'],
        [19, 'Análisis de riesgos de importación', '1 día', 'Media', 'Project Manager', 18, 'No'],
        [20, 'HITO: Diseño Aprobado', '0 días', 'Alta', 'Team leader', 19, 'Si'],
        [21, 'Licitación para instalación de servicios e infraestructura', '20 días', 'Media', 'Comprador(a)', 20, 'No'],
        [22, 'HITO: Orden de compra para servicios e infraestructura', '0 días', 'Alta', 'Comprador(a)', 21, 'Si'],
        [23, 'Gestión para pago de 1er anticipo de servicios e infraestructura', '12 días', 'Alta', 'Comprador(a)', 22, 'No'],
        [24, 'HITO: 1er anticipo serv e infraestructura pagado', '0 días', 'Alta', 'Tesorero', 23, 'Si'],
        [25, 'Preparación de cimentación y bases (piso)', '21 días', 'Media', 'Proveedores', 24, 'No'],
        [26, 'Instalación de servicios eléctricos (220V/440V)', '5 días', 'Media', 'Proveedores', 25, 'No'],
        [27, 'Instalación de líneas de vapor', '5 días', 'Media', 'Proveedores', 25, 'No'],
        [28, 'Preparación de conexiones de aire comprimido', '3 días', 'Media', 'Proveedores', 27, 'No'],
        [29, 'Instalación de sistemas de drenaje', '5 días', 'Media', 'Proveedores', 26, 'No'],
        [30, 'Adecuaciones de espacio y accesos', '4 días', 'Media', 'Proveedores', 29, 'No'],
        [31, 'Instalación de sistemas de seguridad', '2 días', 'Media', 'Proveedores', 30, 'No'],
        [32, 'HITO: Sitio Preparado', '0 días', 'Alta', 'Team leader', 31, 'Si'],
        [33, 'Gestión para pago 2o anticipo de serv e infraestructura', '12 días', 'Alta', 'Comprador(a)', 32, 'No'],
        [34, 'HITO: 2o anticipo pagado serv e infraestructura', '0 días', 'Alta', 'Tesorero', 33, 'Si'],
        [35, 'Gestión entrada última factura de serv e infraestructura', '100 días', 'Alta', 'Team leader', 32, 'No'],
        [36, 'HITO: Factura pagada de serv e infraestructura', '0 días', 'Alta', 'Tesorero', 35, 'Si'],
        [37, 'Inicio de fabricación de maquinaria', '1 día', 'Alta', 'Proveedores', 13, 'No'],
        [38, 'Control de calidad durante fabricación', '100 días', 'Media', 'Proveedores', 37, 'No'],
        [39, 'Inspección intermedia', '5 días', 'Media', 'Team leader', 38, 'No'],
        [40, 'Pruebas de fábrica (FAT)', '10 días', 'Alta', 'Project Manager', 38, 'No'],
        [41, 'Gestión de 2o anticipo de pago', '12 días', 'Alta', 'Comprador(a)', 40, 'No'],
        [42, 'HITO: 2o anticipo linea de salsas pagado', '0 días', 'Alta', 'Tesorero', 41, 'Si'],
        [43, 'Preparación para envío y embalaje', '10 días', 'Media', 'Proveedores', 38, 'No'],
        [44, 'HITO: FAT Completado', '0 días', 'Alta', 'Project Manager', 43, 'Si'],
        [45, 'Transporte terrestre a puerto', '2 días', 'Media', 'Proveedores', 44, 'No'],
        [46, 'Trámites de exportación en origen', '1 día', 'Media', 'Proveedores', 45, 'No'],
        [47, 'Transporte aéreo Origen - Destino', '2 días', 'Media', 'Proveedores', 46, 'No'],
        [48, 'Trámites de importación', '5 días', 'Media', 'Proveedores', 47, 'No'],
        [49, 'Liberación aduanal', '5 días', 'Media', 'Proveedores', 48, 'No'],
        [50, 'Transporte hacia Destino', '2 días', 'Alta', 'Proveedores', 49, 'No'],
        [51, 'HITO: Maquinaria entregada a Destino', '0 días', 'Alta', 'Proveedores', 50, 'Si'],
        [52, 'Recepción e inspección de equipos', '1 día', 'Media', 'Team leader', 50, 'No'],
        [53, 'Descarga y posicionamiento', '2 días', 'Media', 'Team leader', 32, 'No'],
        [54, 'Montaje de equipos', '3 días', 'Media', 'Team leader', 53, 'No'],
        [55, 'Conexiones eléctricas y de control', '2 días', 'Media', 'Team leader', 54, 'No'],
        [56, 'Conexiones de vapor y aire comprimido', '2 días', 'Media', 'Team leader', 55, 'No'],
        [57, 'Integración de maquinaria', '2 días', 'Media', 'Team leader', 56, 'No'],
        [58, 'Instalación de sistemas de seguridad', '2 días', 'Media', 'Team leader', 57, 'No'],
        [59, 'HITO: Instalación de maquinaria completada', '0 días', 'Alta', 'Team leader', 58, 'Si'],
        [60, 'Pruebas de integración', '1 día', 'Alta', 'Team leader', 59, 'No'],
        [61, 'Validación de procesos', '1 día', 'Alta', 'Team leader', 60, 'No'],
        [62, 'Documentación de resultados', '0 días', 'Alta', 'Team leader', 61, 'No'],
        [63, 'HITO: Pruebas Exitosas', '0 días', 'Alta', 'Team leader', 62, 'Si'],
        [64, 'Gestión de pago de 3er anticipo', '12 días', 'Alta', 'Comprador(a)', 63, 'No'],
        [65, 'HITO: 3er anticipo pagado', '0 días', 'Alta', 'Comprador(a)', 64, 'Si'],
        [66, 'Capacitación a operadores', '2 días', 'Media', 'Proveedores', 65, 'No'],
        [67, 'Capacitación a personal de mantenimiento', '2 días', 'Media', 'Proveedores', 63, 'No'],
        [68, 'Capacitación en control de calidad', '1 día', 'Media', 'Proveedores', 63, 'No'],
        [69, 'Entrega de manuales y documentación', '0 días', 'Media', 'Proveedores', 68, 'No'],
        [70, 'Certificación final de equipos', '1 día', 'Media', 'Project Manager', 69, 'No'],
        [71, 'HITO: Personal Capacitado', '0 días', 'Alta', 'Team leader', 70, 'Si'],
        [72, 'Evaluación post-implementación', '2 días', 'Media', 'Project Manager', 71, 'No'],
        [73, 'Documentación de lecciones aprendidas', '2 días', 'Media', 'Team leader', 72, 'No'],
        [74, 'Entrega de garantías y seguros', '1 día', 'Media', 'Team leader', 73, 'No'],
        [75, 'Cierre administrativo y financiero', '1 día', 'Media', 'Project Manager', 73, 'No'],
        [76, 'HITO: Proyecto completado', '0 días', 'Media', 'Project Manager', 75, 'Si']
      ];
      
      this.templateData = this.parseTemplateData(templateData);
      console.log('✅ Template cargado exitosamente:', this.templateData.activities.length, 'actividades');
      
      return this.templateData;
    } catch (error) {
      console.error('❌ Error cargando template:', error);
      throw error;
    }
  }

  /**
   * Parsear datos del template
   */
  parseTemplateData(data) {
    const activities = [];
    const milestones = [];
    
    data.slice(1).forEach((row, index) => {
      if (row && row.length > 0 && row[1] && row[1].trim() !== '') {
        const activity = {
          id: row[0], // CORRECCIÓN: Usar número simple en lugar de template-X
          originalId: row[0],
          name: row[1].trim(),
          duration: this.parseDuration(row[2]),
          priority: this.parsePriority(row[3]),
          responsible: row[4]?.trim() || 'Sin asignar',
          predecessor: row[5] || null,
          isMilestone: row[6] === 'Si' || row[1].toLowerCase().includes('hito'),
          category: this.categorizeActivity(row[1]),
          phase: this.determinePhase(row[1], row[0]),
          templateBased: true,
          customizable: this.isCustomizable(row[1], row[0])
        };

        activities.push(activity);
        
        if (activity.isMilestone) {
          milestones.push({
            id: activity.id,
            name: activity.name,
            phase: activity.phase,
            description: `Hito: ${activity.name}`
          });
        }
      }
    });

    return {
      activities,
      milestones,
      metadata: {
        totalActivities: activities.length,
        totalMilestones: milestones.length,
        templateVersion: '1.0',
        loadedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Parsear duración del template
   */
  parseDuration(durationStr) {
    if (!durationStr) return 1;
    
    const match = durationStr.toString().match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * Parsear prioridad del template
   */
  parsePriority(priorityStr) {
    if (!priorityStr) return 'medium';
    
    const priority = priorityStr.toLowerCase();
    if (priority.includes('alta')) return 'high';
    if (priority.includes('media')) return 'medium';
    if (priority.includes('baja')) return 'low';
    return 'medium';
  }

  /**
   * Categorizar actividad
   */
  categorizeActivity(activityName) {
    const name = activityName.toLowerCase();
    
    if (name.includes('hito') || name.includes('aprobación') || name.includes('contrato')) {
      return 'milestone';
    } else if (name.includes('fabricación') || name.includes('producción') || name.includes('manufactura')) {
      return 'manufacturing';
    } else if (name.includes('importación') || name.includes('aduana') || name.includes('embarque')) {
      return 'import';
    } else if (name.includes('instalación') || name.includes('montaje') || name.includes('conexión')) {
      return 'installation';
    } else if (name.includes('prueba') || name.includes('test') || name.includes('validación')) {
      return 'testing';
    } else if (name.includes('capacitación') || name.includes('entrenamiento')) {
      return 'training';
    } else if (name.includes('infraestructura') || name.includes('servicios') || name.includes('cimentación')) {
      return 'infrastructure';
    } else if (name.includes('anticipo') || name.includes('pago')) {
      return 'financial';
    }
    
    return 'general';
  }

  /**
   * Determinar fase de la actividad
   */
  determinePhase(activityName, activityId) {
    const id = parseInt(activityId);
    
    if (id >= 1 && id <= 13) return 'Planificación';
    if (id >= 14 && id <= 20) return 'Diseño';
    if (id >= 21 && id <= 36) return 'Infraestructura';
    if (id >= 37 && id <= 44) return 'Fabricación';
    if (id >= 45 && id <= 51) return 'Importación';
    if (id >= 52 && id <= 63) return 'Instalación';
    if (id >= 64 && id <= 76) return 'Cierre';
    
    return 'General';
  }

  /**
   * Determinar si una actividad es personalizable
   */
  isCustomizable(activityName, activityId) {
    const name = activityName.toLowerCase();
    const id = parseInt(activityId);
    
    // Tiempo de fabricación
    if (id === 38 && name.includes('fabricación')) return { type: 'manufacturing_time', field: 'duration' };
    
    // Anticipos
    if (id === 11 && name.includes('anticipo')) return { type: 'payment_timing', field: 'predecessor' };
    if (id === 41 && name.includes('anticipo')) return { type: 'payment_timing', field: 'predecessor' };
    if (id === 64 && name.includes('anticipo')) return { type: 'payment_timing', field: 'predecessor' };
    
    // Actividades condicionales
    if (id >= 45 && id <= 50) return { type: 'conditional', field: 'include', condition: 'isForeignEquipment' };
    if (id >= 25 && id <= 31) return { type: 'conditional', field: 'include', condition: 'requiresInfrastructure' };
    
    return null;
  }

  /**
   * Mapear roles del template con miembros del equipo
   */
  mapTeamRoles(templateRole, teamMembers) {
    const roleMapping = {
      'Team leader': ['team_lead', 'engineer', 'analyst', 'technician'],
      'Comprador(a)': ['buyer', 'specialist', 'analyst'],
      'Project Manager': ['project_manager'],
      'Proveedores': ['external'], // Externo
      'Tesorero': ['other', 'specialist']
    };

    const possibleRoles = roleMapping[templateRole] || ['other'];
    
    // Buscar miembro con rol compatible
    for (const role of possibleRoles) {
      const member = teamMembers.find(m => m.role === role);
      if (member) {
        return {
          assignedTo: member.name,
          role: member.role,
          experience: member.experience
        };
      }
    }

    // Si no se encuentra, asignar al primer miembro disponible
    if (teamMembers.length > 0) {
      const member = teamMembers[0];
      return {
        assignedTo: member.name,
        role: member.role,
        experience: member.experience
      };
    }

    // Fallback
    return {
      assignedTo: 'Sin asignar',
      role: 'other',
      experience: 'intermediate'
    };
  }

  /**
   * Personalizar actividades según configuración del asistente
   */
  customizeActivities(activities, wizardData) {
    console.log('🔧 Personalizando actividades del template...');
    
    return activities.map(activity => {
      const customized = { ...activity };
      
      // Mapear responsable con miembro del equipo
      if (wizardData.teamMembers && wizardData.teamMembers.length > 0) {
        const assignment = this.mapTeamRoles(activity.responsible, wizardData.teamMembers);
        customized.assignedTo = assignment.assignedTo;
        customized.assignedRole = assignment.role;
        customized.assignedExperience = assignment.experience;
      } else {
        customized.assignedTo = activity.responsible;
      }
      
      // Personalizar tiempo de fabricación
      if (activity.customizable?.type === 'manufacturing_time') {
        if (wizardData.deliveryTime && wizardData.deliveryTimeUnit) {
          const deliveryDays = this.convertToDays(wizardData.deliveryTime, wizardData.deliveryTimeUnit);
          customized.duration = deliveryDays;
          console.log(`🔧 Ajustando "${activity.name}": ${activity.duration}d → ${deliveryDays}d (tiempo de entrega)`);
        }
      }
      
      // Personalizar timing de anticipos
      if (activity.customizable?.type === 'payment_timing') {
        // Ajustar predecesora según configuración de anticipos
        if (wizardData.advancePayments && wizardData.advancePayments.length > 0) {
          const paymentTiming = this.getPaymentTimingFromActivity(activity.originalId);
          const correspondingPayment = wizardData.advancePayments.find(p => p.timing === paymentTiming);
          
          if (correspondingPayment) {
            console.log(`💰 Ajustando timing de "${activity.name}" según configuración: ${correspondingPayment.timing}`);
          }
        }
      }
      
      return customized;
    });
  }

  /**
   * Obtener timing de pago basado en ID de actividad
   */
  getPaymentTimingFromActivity(activityId) {
    switch (parseInt(activityId)) {
      case 11: return 'order';
      case 41: return 'shipping';
      case 64: return 'delivery';
      default: return 'order';
    }
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
        return amount * 30;
      default:
        return amount;
    }
  }

  /**
   * Filtrar actividades condicionales
   */
  filterConditionalActivities(activities, wizardData) {
    console.log('🔍 Filtrando actividades condicionales...');
    
    return activities.filter(activity => {
      if (!activity.customizable) return true;
      
      if (activity.customizable.type === 'conditional') {
        const condition = activity.customizable.condition;
        
        if (condition === 'isForeignEquipment') {
          const include = wizardData.isForeignEquipment === true;
          console.log(`${include ? '✅' : '❌'} ${include ? 'Incluyendo' : 'Excluyendo'} actividad de importación: ${activity.name}`);
          return include;
        }
        
        if (condition === 'requiresInfrastructure') {
          const include = wizardData.requiresInfrastructure === true;
          console.log(`${include ? '✅' : '❌'} ${include ? 'Incluyendo' : 'Excluyendo'} actividad de infraestructura: ${activity.name}`);
          return include;
        }
      }
      
      return true;
    });
  }

  /**
   * Generar cronograma basado en template
   */
  async generateTemplateBasedSchedule(wizardData) {
    try {
      console.log('🚀 TEMPLATE-BASED SCHEDULER: Iniciando generación...');
      console.log('📋 Wizard Data:', wizardData);
      
      // 1. Cargar template si no está cargado
      if (!this.templateData) {
        console.log('📋 Cargando template...');
        await this.loadTemplate();
      }
      
      // 2. Personalizar actividades
      console.log('🔧 Personalizando actividades...');
      let activities = this.customizeActivities(this.templateData.activities, wizardData);
      console.log('🔧 Actividades personalizadas:', activities.length);
      
      // 3. Filtrar actividades condicionales
      console.log('🔧 Filtrando actividades condicionales...');
      activities = this.filterConditionalActivities(activities, wizardData);
      console.log('🔧 Actividades filtradas:', activities.length);
      
      // 4. Filtrar hitos
      console.log('🔧 Filtrando hitos...');
      const milestones = this.templateData.milestones.filter(milestone => {
        const activity = activities.find(a => a.id === milestone.id);
        return activity !== undefined;
      });
      console.log('🔧 Hitos filtrados:', milestones.length);
      
      // 5. Calcular ruta crítica y aplicar dependencias
      console.log('🔧 Calculando ruta crítica y dependencias...');
      const criticalPathResult = this.calculateCriticalPath(activities);
      const activitiesWithDependencies = criticalPathResult.activities;
      const criticalPath = criticalPathResult.criticalPath;
      console.log('🔧 Actividades con dependencias:', activitiesWithDependencies.length);
      
      // 6. Generar recomendaciones
      const recommendations = this.generateRecommendations(wizardData, activitiesWithDependencies);
      
      const generatedSchedule = {
        activities: activitiesWithDependencies,
        milestones,
        criticalPath,
        recommendations,
        metadata: {
          templateUsed: 'Template compra de equipos.xlsx',
          templateId: 'template-compra-equipos-v1',
          generatedAt: new Date().toISOString(),
          wizardData,
          estimatedDuration: this.calculateTotalDuration(activities),
          complexity: this.assessComplexity(wizardData, activities),
          customizationApplied: {
            manufacturingTime: wizardData.deliveryTime ? `${wizardData.deliveryTime} ${wizardData.deliveryTimeUnit}` : 'default',
            advancePayments: wizardData.advancePayments?.length || 0,
            infrastructureIncluded: wizardData.requiresInfrastructure || false,
            importIncluded: wizardData.isForeignEquipment || false
          }
        }
      };
      
      console.log('✅ TEMPLATE-BASED SCHEDULER: Cronograma generado exitosamente');
      console.log(`📊 Actividades: ${activities.length}, Hitos: ${milestones.length}`);
      console.log('📅 Primeras 5 actividades con fechas:');
      activitiesWithDependencies.slice(0, 5).forEach((activity, index) => {
        console.log(`  ${index + 1}. ${activity.name}: ${activity.startDate} - ${activity.endDate}`);
      });
      
      return generatedSchedule;
      
    } catch (error) {
      console.error('❌ TEMPLATE-BASED SCHEDULER: Error generando cronograma:', error);
      throw error;
    }
  }

  /**
   * Calcular ruta crítica y aplicar dependencias
   */
  calculateCriticalPath(activities) {
    // Aplicar dependencias del template
    const activitiesWithDependencies = this.applyDependencies(activities);
    
    // Calcular fechas basadas en dependencias
    const activitiesWithDates = this.calculateDates(activitiesWithDependencies);
    
    // Identificar ruta crítica
    const criticalPath = this.identifyCriticalPath(activitiesWithDates);
    
    return {
      activities: activitiesWithDates,
      criticalPath: criticalPath
    };
  }

  /**
   * Aplicar dependencias del template
   */
  applyDependencies(activities) {
    console.log('🔗 Aplicando dependencias del template...');
    
    const result = activities.map(activity => {
      const dependencies = [];
      
      if (activity.predecessor && activity.predecessor !== '') {
        // Buscar la actividad predecesora
        const predecessorActivity = activities.find(a => a.originalId === activity.predecessor);
        if (predecessorActivity) {
          dependencies.push(predecessorActivity.id);
          console.log(`🔗 ${activity.name} (ID: ${activity.id}) depende de ${predecessorActivity.name} (ID: ${predecessorActivity.id})`);
        } else {
          console.warn(`⚠️ Predecesora ${activity.predecessor} no encontrada para ${activity.name}`);
        }
      }
      
      return {
        ...activity,
        dependencies: dependencies
      };
    });
    
    // Verificar dependencias circulares
    console.log('🔍 Verificando dependencias circulares...');
    const hasCircularDependency = this.checkCircularDependencies(result);
    if (hasCircularDependency) {
      console.error('❌ Se detectaron dependencias circulares en el template!');
    } else {
      console.log('✅ No se detectaron dependencias circulares');
    }
    
    return result;
  }
  
  /**
   * Verificar dependencias circulares
   */
  checkCircularDependencies(activities) {
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = (activityId) => {
      if (recursionStack.has(activityId)) {
        console.error(`❌ Dependencia circular detectada: ${activityId}`);
        return true;
      }
      if (visited.has(activityId)) {
        return false;
      }
      
      visited.add(activityId);
      recursionStack.add(activityId);
      
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        for (const depId of activity.dependencies) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(activityId);
      return false;
    };
    
    for (const activity of activities) {
      if (!visited.has(activity.id)) {
        if (hasCycle(activity.id)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Calcular fechas basadas en dependencias (algoritmo robusto)
   */
  calculateDates(activities) {
    console.log('📅 Calculando fechas basadas en dependencias (algoritmo robusto)...');
    
    const activitiesWithDates = [...activities];
    const startDate = new Date('2025-09-28'); // Fecha de inicio del proyecto
    
    // Inicializar todas las actividades sin fechas
    activitiesWithDates.forEach(activity => {
      activity.startDate = null;
      activity.endDate = null;
    });
    
    // Crear mapa de actividades por ID para acceso rápido
    const activityMap = new Map();
    activitiesWithDates.forEach(activity => {
      activityMap.set(activity.id, activity);
    });
    
    // Función para calcular fechas de una actividad
    const calculateActivityDates = (activity) => {
      if (activity.startDate && activity.endDate) {
        return; // Ya calculada
      }
      
      console.log(`🔍 Calculando: ${activity.name} (ID: ${activity.originalId})`);
      
      let activityStartDate = new Date(startDate);
      
      if (activity.dependencies.length > 0) {
        console.log(`🔗 Dependencias de ${activity.name}:`, activity.dependencies);
        
        // Calcular fechas de todas las dependencias primero
        activity.dependencies.forEach(depId => {
          const depActivity = activityMap.get(depId);
          if (depActivity) {
            calculateActivityDates(depActivity); // Recursivo
          }
        });
        
        // Encontrar la fecha de fin más tardía de las dependencias
        let latestDependencyEnd = null;
        
        activity.dependencies.forEach(depId => {
          const depActivity = activityMap.get(depId);
          if (depActivity && depActivity.endDate) {
            console.log(`  📅 Dependencia ${depActivity.name} termina: ${depActivity.endDate.toLocaleDateString()}`);
            if (!latestDependencyEnd || depActivity.endDate > latestDependencyEnd) {
              latestDependencyEnd = new Date(depActivity.endDate);
            }
          }
        });
        
        if (latestDependencyEnd) {
          // La actividad inicia el día siguiente al fin de la última dependencia
          activityStartDate = new Date(latestDependencyEnd);
          activityStartDate.setDate(activityStartDate.getDate() + 1);
          console.log(`✅ ${activity.name} inicia después de dependencias: ${activityStartDate.toLocaleDateString()}`);
        }
      } else {
        console.log(`📅 ${activity.name} sin dependencias, inicia en: ${activityStartDate.toLocaleDateString()}`);
      }
      
      // Calcular fecha de fin
      const activityEndDate = new Date(activityStartDate);
      activityEndDate.setDate(activityEndDate.getDate() + activity.duration - 1); // -1 porque el primer día cuenta
      
      // Actualizar fechas en la actividad
      activity.startDate = activityStartDate;
      activity.endDate = activityEndDate;
      
      // También actualizar earlyStart y earlyFinish para CPM
      activity.earlyStart = activityStartDate;
      activity.earlyFinish = activityEndDate;
      
      // Marcar como calculada por template para evitar que CPM la sobrescriba
      activity.templateCalculated = true;
      
      console.log(`📅 ${activity.name}: ${activityStartDate.toLocaleDateString()} - ${activityEndDate.toLocaleDateString()} (${activity.duration} días)`);
    };
    
    // Procesar actividades en orden de ID original (1, 2, 3, 4...)
    const sortedActivities = [...activitiesWithDates].sort((a, b) => a.originalId - b.originalId);
    
    // Calcular fechas de todas las actividades
    sortedActivities.forEach(activity => {
      calculateActivityDates(activity);
    });
    
    // Verificar que todas las dependencias se respeten
    console.log('🔍 Verificando dependencias...');
    activitiesWithDates.forEach(activity => {
      if (activity.dependencies.length > 0) {
        activity.dependencies.forEach(depId => {
          const depActivity = activityMap.get(depId);
          if (depActivity && depActivity.endDate && activity.startDate) {
            if (activity.startDate <= depActivity.endDate) {
              console.error(`❌ ERROR: ${activity.name} inicia ${activity.startDate.toLocaleDateString()} pero su dependencia ${depActivity.name} termina ${depActivity.endDate.toLocaleDateString()}`);
            } else {
              console.log(`✅ OK: ${activity.name} inicia ${activity.startDate.toLocaleDateString()} después de ${depActivity.name} que termina ${depActivity.endDate.toLocaleDateString()}`);
            }
          }
        });
      }
    });
    
    return activitiesWithDates;
  }

  /**
   * Ordenamiento topológico para respetar dependencias
   */
  topologicalSort(activities) {
    console.log('🔄 Iniciando ordenamiento topológico...');
    
    const visited = new Set();
    const temp = new Set();
    const result = [];
    
    const visit = (activity) => {
      if (temp.has(activity.id)) {
        throw new Error('Dependencia circular detectada');
      }
      if (visited.has(activity.id)) {
        return;
      }
      
      temp.add(activity.id);
      console.log(`🔍 Visitando: ${activity.name} (ID: ${activity.id})`);
      
      // Visitar dependencias primero
      activity.dependencies.forEach(depId => {
        const depActivity = activities.find(a => a.id === depId);
        if (depActivity) {
          console.log(`  ↳ Dependencia: ${depActivity.name} (ID: ${depId})`);
          visit(depActivity);
        }
      });
      
      temp.delete(activity.id);
      visited.add(activity.id);
      result.push(activity);
      console.log(`✅ Agregado a resultado: ${activity.name}`);
    };
    
    // Procesar actividades en orden de ID original para consistencia
    const sortedByOriginalId = [...activities].sort((a, b) => a.originalId - b.originalId);
    
    sortedByOriginalId.forEach(activity => {
      if (!visited.has(activity.id)) {
        visit(activity);
      }
    });
    
    console.log('🔄 Ordenamiento topológico completado. Orden final:');
    result.forEach((activity, index) => {
      console.log(`  ${index + 1}. ${activity.name} (ID: ${activity.id})`);
    });
    
    return result;
  }

  /**
   * Identificar ruta crítica
   */
  identifyCriticalPath(activities) {
    // Actividades de alta prioridad y sin holgura
    return activities.filter(activity => 
      activity.priority === 'high' || activity.isMilestone
    );
  }

  /**
   * Generar recomendaciones
   */
  generateRecommendations(wizardData, activities) {
    const recommendations = [];
    
    if (wizardData.isForeignEquipment) {
      recommendations.push({
        type: 'info',
        title: 'Equipo Extranjero',
        message: 'Se incluyeron actividades de importación y aduanas en el cronograma.'
      });
    }
    
    if (wizardData.requiresInfrastructure) {
      recommendations.push({
        type: 'info',
        title: 'Infraestructura Requerida',
        message: 'Se incluyeron actividades de preparación de sitio e infraestructura.'
      });
    }
    
    if (wizardData.advancePayments && wizardData.advancePayments.length > 0) {
      recommendations.push({
        type: 'financial',
        title: 'Anticipos Configurados',
        message: `Se configuraron ${wizardData.advancePayments.length} anticipos según tus especificaciones.`
      });
    }
    
    return recommendations;
  }

  /**
   * Calcular duración total
   */
  calculateTotalDuration(activities) {
    return activities.reduce((total, activity) => total + activity.duration, 0);
  }

  /**
   * Evaluar complejidad
   */
  assessComplexity(wizardData, activities) {
    let complexity = 'medium';
    
    if (activities.length > 50) complexity = 'high';
    else if (activities.length < 30) complexity = 'low';
    
    if (wizardData.isForeignEquipment && wizardData.requiresInfrastructure) {
      complexity = 'high';
    }
    
    return complexity;
  }
}

// Exportar como singleton
const templateBasedSchedulerService = new TemplateBasedSchedulerService();
export default templateBasedSchedulerService;
