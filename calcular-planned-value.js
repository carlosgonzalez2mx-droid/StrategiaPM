/**
 * SCRIPT PARA CALCULAR VALOR PLANIFICADO (PLANNED VALUE)
 *
 * Este script calcula el Valor Planificado del proyecto basado en:
 * - Presupuesto del proyecto
 * - TIR (Tasa Interna de Retorno)
 * - Periodo del proyecto (años)
 *
 * Fórmula: Valor Planificado = Presupuesto × (1 + TIR)^Periodo
 *
 * INSTRUCCIONES:
 * 1. Abre la consola del navegador (Cmd + Option + J en Safari)
 * 2. Copia y pega este script COMPLETO
 * 3. Presiona Enter
 * 4. Selecciona el proyecto
 * 5. Ingresa los valores solicitados (TIR, presupuesto, periodo)
 * 6. Confirma el cálculo
 * 7. Recarga la página (Cmd + R)
 */

(function calcularPlannedValue() {
  console.log('💰 INICIANDO CÁLCULO DE VALOR PLANIFICADO...\n');

  /**
   * Función para calcular el valor planificado basado en TIR
   */
  function calculatePlannedValueFromIRR(budget, irr, period = 3) {
    if (!budget || budget <= 0) return 0;
    if (!irr || irr <= 0) return budget; // Si no hay TIR, valor = presupuesto

    // Convertir TIR de porcentaje (25.5) a decimal (0.255)
    const irrDecimal = irr / 100;

    // Fórmula: Valor Futuro = Inversión × (1 + TIR)^período
    const valorFuturo = budget * Math.pow(1 + irrDecimal, period);

    return Math.round(valorFuturo);
  }

  try {
    // 1. Obtener datos de localStorage (clave correcta: "mi-dashboard-portfolio")
    const portfolioData = JSON.parse(localStorage.getItem('mi-dashboard-portfolio') || '{}');
    const projects = portfolioData.projects || [];

    if (projects.length === 0) {
      console.error('❌ No se encontraron proyectos en localStorage');
      alert('❌ No se encontraron proyectos.\n\nAsegúrate de tener proyectos creados en la aplicación.');
      return;
    }

    // 2. Mostrar proyectos disponibles
    console.log('📁 Proyectos disponibles:');
    projects.forEach((project, index) => {
      console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
    });

    // 3. Pedir al usuario que seleccione el proyecto
    const projectPrompt = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const projectIndex = parseInt(prompt(
      `Selecciona el proyecto para calcular Valor Planificado:\n\n${projectPrompt}\n\nIngresa el número (1-${projects.length}):`
    )) - 1;

    if (isNaN(projectIndex) || projectIndex < 0 || projectIndex >= projects.length) {
      console.error('❌ Número de proyecto inválido');
      alert('❌ Número de proyecto inválido. Ejecuta el script nuevamente.');
      return;
    }

    const selectedProject = projects[projectIndex];
    console.log('\n✅ Proyecto seleccionado:', selectedProject.name);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 4. Mostrar datos actuales del proyecto
    console.log('📊 DATOS ACTUALES DEL PROYECTO:');
    console.log(`   💰 Presupuesto actual: $${(selectedProject.budget || 0).toLocaleString()}`);
    console.log(`   📈 TIR actual: ${selectedProject.irr || 0}%`);
    console.log(`   📅 Periodo actual: ${selectedProject.period || 3} años`);
    console.log(`   🎯 Valor Planificado actual: $${(selectedProject.plannedValue || 0).toLocaleString()}\n`);

    // 5. Solicitar datos para el cálculo
    let presupuesto = selectedProject.budget || 0;
    let tir = selectedProject.irr || 0;
    let periodo = selectedProject.period || 3;

    // Solicitar presupuesto si no existe
    if (!presupuesto || presupuesto === 0) {
      const presupuestoInput = parseFloat(prompt(
        'Ingresa el PRESUPUESTO del proyecto (en USD):\n\nEjemplo: 500000 para $500,000',
        ''
      ));

      if (isNaN(presupuestoInput) || presupuestoInput <= 0) {
        console.error('❌ Presupuesto inválido');
        alert('❌ Presupuesto inválido. Debe ser un número mayor a 0.');
        return;
      }

      presupuesto = presupuestoInput;
      console.log(`   ✅ Presupuesto ingresado: $${presupuesto.toLocaleString()}`);
    }

    // Solicitar TIR si no existe
    if (!tir || tir === 0) {
      const tirInput = parseFloat(prompt(
        'Ingresa la TIR (Tasa Interna de Retorno) del proyecto (%):\n\nEjemplo: 25.5 para 25.5%',
        '15'
      ));

      if (isNaN(tirInput) || tirInput < 0) {
        console.error('❌ TIR inválida');
        alert('❌ TIR inválida. Debe ser un número mayor o igual a 0.');
        return;
      }

      tir = tirInput;
      console.log(`   ✅ TIR ingresada: ${tir}%`);
    }

    // Solicitar periodo (opcional)
    const periodoInput = parseInt(prompt(
      'Ingresa el PERIODO del proyecto (años):\n\nEjemplo: 3 para 3 años',
      periodo.toString()
    ));

    if (!isNaN(periodoInput) && periodoInput > 0) {
      periodo = periodoInput;
      console.log(`   ✅ Periodo ingresado: ${periodo} años`);
    }

    // 6. Calcular Valor Planificado
    console.log('\n💡 CALCULANDO VALOR PLANIFICADO...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const valorPlanificado = calculatePlannedValueFromIRR(presupuesto, tir, periodo);

    console.log('\n📊 RESULTADO DEL CÁLCULO:');
    console.log(`   Fórmula: Valor Planificado = Presupuesto × (1 + TIR)^Periodo`);
    console.log(`   Cálculo: $${presupuesto.toLocaleString()} × (1 + ${tir/100})^${periodo}`);
    console.log(`   Resultado: $${valorPlanificado.toLocaleString()}`);

    // 7. Mostrar comparación si ya había un valor
    if (selectedProject.plannedValue && selectedProject.plannedValue > 0) {
      const diferencia = valorPlanificado - selectedProject.plannedValue;
      const porcentajeDif = (diferencia / selectedProject.plannedValue) * 100;

      console.log('\n📊 COMPARACIÓN CON VALOR ACTUAL:');
      console.log(`   Valor actual: $${selectedProject.plannedValue.toLocaleString()}`);
      console.log(`   Valor nuevo: $${valorPlanificado.toLocaleString()}`);
      console.log(`   Diferencia: $${Math.abs(diferencia).toLocaleString()} (${Math.abs(porcentajeDif).toFixed(2)}%)`);
      console.log(`   ${diferencia >= 0 ? '↗️ Incremento' : '↘️ Decremento'}`);
    }

    // 8. Confirmar actualización
    const confirmLines = [
      '¿CONFIRMAS EL CÁLCULO Y ACTUALIZACIÓN?',
      '',
      `Proyecto: ${selectedProject.name}`,
      '',
      `💰 Presupuesto: $${presupuesto.toLocaleString()}`,
      `📈 TIR: ${tir}%`,
      `📅 Periodo: ${periodo} años`,
      '',
      `🎯 Valor Planificado NUEVO: $${valorPlanificado.toLocaleString()}`,
      ''
    ];

    if (selectedProject.plannedValue && selectedProject.plannedValue > 0) {
      confirmLines.push(`   (Valor actual: $${selectedProject.plannedValue.toLocaleString()})`);
      confirmLines.push('');
    }

    confirmLines.push('Esta acción actualizará el proyecto en localStorage.');
    confirmLines.push('');
    confirmLines.push('¿Continuar?');

    if (!confirm(confirmLines.join('\n'))) {
      console.log('❌ Cálculo cancelado por el usuario');
      alert('❌ Cálculo cancelado');
      return;
    }

    // 9. Actualizar proyecto en localStorage
    console.log('\n💾 ACTUALIZANDO PROYECTO EN LOCALSTORAGE...');

    // Actualizar campos del proyecto
    selectedProject.budget = presupuesto;
    selectedProject.irr = tir;
    selectedProject.period = periodo;
    selectedProject.plannedValue = valorPlanificado;
    selectedProject.updatedAt = new Date().toISOString();

    // Actualizar en el array de proyectos
    const projectIndexInArray = projects.findIndex(p => p.id === selectedProject.id);
    if (projectIndexInArray !== -1) {
      projects[projectIndexInArray] = selectedProject;
    }

    // Guardar en localStorage (clave correcta: "mi-dashboard-portfolio")
    portfolioData.projects = projects;
    localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(portfolioData));

    console.log('✅ Proyecto actualizado exitosamente');

    // 10. Mostrar siguiente paso
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅✅✅ ¡VALOR PLANIFICADO CALCULADO Y GUARDADO! ✅✅✅');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 RESUMEN:');
    console.log(`   Proyecto: ${selectedProject.name}`);
    console.log(`   Presupuesto: $${presupuesto.toLocaleString()}`);
    console.log(`   TIR: ${tir}%`);
    console.log(`   Periodo: ${periodo} años`);
    console.log(`   Valor Planificado: $${valorPlanificado.toLocaleString()}`);

    console.log('\n📝 SIGUIENTE PASO:');
    console.log('   Ejecuta el script "recalcular-business-value.js" para calcular');
    console.log('   automáticamente el valor de negocio de todas las tareas');
    console.log('   basándose en este Valor Planificado.');

    console.log('\n🔄 RECARGA LA PÁGINA AHORA (Cmd + R) para ver los cambios');

    // Mostrar alerta de éxito
    const successLines = [
      '✅ ¡VALOR PLANIFICADO CALCULADO!',
      '',
      `🎯 Valor Planificado: $${valorPlanificado.toLocaleString()}`,
      '',
      '📝 SIGUIENTE PASO:',
      'Ejecuta el script "recalcular-business-value.js"',
      'para calcular el valor de negocio de las tareas.',
      '',
      '🔄 Recarga la página (Cmd + R) ahora.'
    ];

    alert(successLines.join('\n'));

  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error);
    console.error('Stack trace:', error.stack);
    alert(`❌ Error crítico:\n\n${error.message}\n\nVerifica la consola para más detalles.`);
  }
})();
