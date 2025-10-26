/**
 * Servicio de Cálculo de Riesgos
 * Implementa análisis de riesgos según PMBOK v7
 */

export class RiskCalculationService {
  
  /**
   * Calcula el score de riesgo basado en probabilidad e impacto
   * @param {number} probability - Probabilidad (0-1)
   * @param {number} impact - Impacto (0-1)
   * @returns {number} Risk score (0-1)
   */
  static calculateRiskScore(probability, impact) {
    return probability * impact;
  }

  /**
   * Determina la prioridad del riesgo basada en el score
   * @param {number} riskScore - Score de riesgo (0-1)
   * @returns {string} Prioridad (high, medium, low)
   */
  static getRiskPriority(riskScore) {
    if (riskScore >= 0.7) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Calcula el impacto financiero esperado
   * @param {number} probability - Probabilidad del riesgo
   * @param {number} costImpact - Impacto en costos
   * @returns {number} Impacto financiero esperado
   */
  static calculateExpectedMonetaryValue(probability, costImpact) {
    return probability * costImpact;
  }

  /**
   * Analiza la matriz de riesgos
   * @param {Array} risks - Array de riesgos
   * @returns {Object} Análisis de la matriz
   */
  static analyzeRiskMatrix(risks) {
    const analysis = {
      totalRisks: risks.length,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
      totalExpectedValue: 0,
      byCategory: {},
      byPhase: {}
    };

    risks.forEach(risk => {
      const score = this.calculateRiskScore(risk.probability, risk.impact);
      const priority = this.getRiskPriority(score);
      
      analysis[priority + 'Priority']++;
      analysis.totalExpectedValue += this.calculateExpectedMonetaryValue(
        risk.probability, 
        risk.costImpact || 0
      );

      // Análisis por categoría
      if (!analysis.byCategory[risk.category]) {
        analysis.byCategory[risk.category] = { count: 0, totalScore: 0 };
      }
      analysis.byCategory[risk.category].count++;
      analysis.byCategory[risk.category].totalScore += score;

      // Análisis por fase
      if (!analysis.byPhase[risk.phase]) {
        analysis.byPhase[risk.phase] = { count: 0, totalScore: 0 };
      }
      analysis.byPhase[risk.phase].count++;
      analysis.byPhase[risk.phase].totalScore += score;
    });

    return analysis;
  }

  /**
   * Calcula la exposición al riesgo del proyecto
   * @param {Array} risks - Array de riesgos
   * @param {number} projectBudget - Presupuesto del proyecto
   * @returns {Object} Exposición al riesgo
   */
  static calculateRiskExposure(risks, projectBudget) {
    const totalExpectedValue = risks.reduce((sum, risk) => {
      return sum + this.calculateExpectedMonetaryValue(
        risk.probability, 
        risk.costImpact || 0
      );
    }, 0);

    return {
      totalExpectedValue,
      percentageOfBudget: projectBudget > 0 ? (totalExpectedValue / projectBudget) * 100 : 0,
      riskLevel: this.getRiskLevel(totalExpectedValue, projectBudget)
    };
  }

  /**
   * Determina el nivel de riesgo del proyecto
   * @param {number} expectedValue - Valor esperado total
   * @param {number} projectBudget - Presupuesto del proyecto
   * @returns {string} Nivel de riesgo
   */
  static getRiskLevel(expectedValue, projectBudget) {
    const percentage = projectBudget > 0 ? (expectedValue / projectBudget) * 100 : 0;
    
    if (percentage > 20) return 'critical';
    if (percentage > 10) return 'high';
    if (percentage > 5) return 'medium';
    return 'low';
  }

  /**
   * Genera recomendaciones de mitigación
   * @param {Array} risks - Array de riesgos
   * @returns {Array} Recomendaciones
   */
  static generateMitigationRecommendations(risks) {
    const recommendations = [];
    
    const highRisks = risks.filter(risk => {
      const score = this.calculateRiskScore(risk.probability, risk.impact);
      return this.getRiskPriority(score) === 'high';
    });

    highRisks.forEach(risk => {
      recommendations.push({
        riskId: risk.id,
        riskName: risk.name,
        recommendation: this.getMitigationStrategy(risk),
        priority: 'high'
      });
    });

    return recommendations;
  }

  /**
   * Obtiene estrategia de mitigación basada en el tipo de riesgo
   * @param {Object} risk - Objeto de riesgo
   * @returns {string} Estrategia recomendada
   */
  static getMitigationStrategy(risk) {
    const strategies = {
      technical: 'Implementar pruebas adicionales y revisión de diseño',
      financial: 'Establecer reserva de contingencia y monitoreo de costos',
      schedule: 'Identificar actividades críticas y establecer buffers',
      resource: 'Desarrollar plan de recursos alternativos',
      external: 'Establecer comunicación con stakeholders externos',
      quality: 'Implementar controles de calidad adicionales',
      scope: 'Documentar claramente los requerimientos y cambios'
    };

    return strategies[risk.category] || 'Desarrollar plan de respuesta específico';
  }
}

export default RiskCalculationService;
