// ============================================
// LIMPIAR PROYECTO DEMO-001 OBSOLETO
// ============================================
// Script para limpiar datos obsoletos del localStorage e IndexedDB

/**
 * Limpia el proyecto demo-001 obsoleto de todos los almacenamientos locales
 */
async function cleanDemo001Project() {
    console.log('🧹 INICIANDO LIMPIEZA DEL PROYECTO DEMO-001...');
    
    try {
        // PASO 1: Limpiar localStorage
        console.log('📦 Limpiando localStorage...');
        const portfolioData = localStorage.getItem('mi-dashboard-portfolio');
        
        if (portfolioData) {
            try {
                const data = JSON.parse(portfolioData);
                
                // Verificar si existe demo-001 en los datos
                if (data.projects) {
                    const originalCount = data.projects.length;
                    data.projects = data.projects.filter(project => project.id !== 'demo-001');
                    const removedCount = originalCount - data.projects.length;
                    
                    if (removedCount > 0) {
                        console.log(`✅ Removidos ${removedCount} proyecto(s) demo-001 de localStorage`);
                        
                        // Actualizar currentProjectId si era demo-001
                        if (data.currentProjectId === 'demo-001') {
                            data.currentProjectId = data.projects.length > 0 ? data.projects[0].id : null;
                            console.log('✅ Actualizado currentProjectId en localStorage');
                        }
                        
                        // Guardar datos actualizados
                        localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(data));
                        console.log('✅ localStorage actualizado');
                    } else {
                        console.log('ℹ️ No se encontró demo-001 en localStorage');
                    }
                }
                
                // Limpiar tasksByProject si existe
                if (data.tasksByProject && data.tasksByProject['demo-001']) {
                    delete data.tasksByProject['demo-001'];
                    console.log('✅ Removidas tareas de demo-001 de localStorage');
                    localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(data));
                }
                
            } catch (parseError) {
                console.error('❌ Error parseando datos de localStorage:', parseError);
            }
        }
        
        // PASO 2: Limpiar IndexedDB
        console.log('🗄️ Limpiando IndexedDB...');
        await cleanIndexedDB();
        
        // PASO 3: Limpiar otros posibles almacenamientos
        console.log('🧽 Limpiando otros almacenamientos...');
        
        // Limpiar sessionStorage si existe
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach(key => {
            if (key.includes('demo-001')) {
                sessionStorage.removeItem(key);
                console.log(`✅ Removido ${key} de sessionStorage`);
            }
        });
        
        // Limpiar variables globales si existen
        if (window.demo001Data) {
            delete window.demo001Data;
            console.log('✅ Removidas variables globales de demo-001');
        }
        
        console.log('🎉 LIMPIEZA COMPLETADA EXITOSAMENTE');
        console.log('📊 Resumen:');
        console.log('  - localStorage: Limpiado');
        console.log('  - IndexedDB: Limpiado');
        console.log('  - sessionStorage: Limpiado');
        console.log('  - Variables globales: Limpiadas');
        
        return { success: true, message: 'Proyecto demo-001 limpiado exitosamente' };
        
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Limpia datos de demo-001 del IndexedDB
 */
async function cleanIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('mi-dashboard-db', 1);
        
        request.onerror = () => {
            console.error('❌ Error abriendo IndexedDB');
            reject(request.error);
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['portfolio-data'], 'readwrite');
            const store = transaction.objectStore('portfolio-data');
            
            const getRequest = store.get('portfolio-data');
            
            getRequest.onsuccess = () => {
                const data = getRequest.result;
                
                if (data && data.projects) {
                    const originalCount = data.projects.length;
                    data.projects = data.projects.filter(project => project.id !== 'demo-001');
                    const removedCount = originalCount - data.projects.length;
                    
                    if (removedCount > 0) {
                        console.log(`✅ Removidos ${removedCount} proyecto(s) demo-001 de IndexedDB`);
                        
                        // Actualizar currentProjectId si era demo-001
                        if (data.currentProjectId === 'demo-001') {
                            data.currentProjectId = data.projects.length > 0 ? data.projects[0].id : null;
                            console.log('✅ Actualizado currentProjectId en IndexedDB');
                        }
                        
                        // Limpiar tasksByProject si existe
                        if (data.tasksByProject && data.tasksByProject['demo-001']) {
                            delete data.tasksByProject['demo-001'];
                            console.log('✅ Removidas tareas de demo-001 de IndexedDB');
                        }
                        
                        // Guardar datos actualizados
                        const putRequest = store.put(data, 'portfolio-data');
                        putRequest.onsuccess = () => {
                            console.log('✅ IndexedDB actualizado');
                            resolve();
                        };
                        putRequest.onerror = () => {
                            console.error('❌ Error actualizando IndexedDB');
                            reject(putRequest.error);
                        };
                    } else {
                        console.log('ℹ️ No se encontró demo-001 en IndexedDB');
                        resolve();
                    }
                } else {
                    console.log('ℹ️ No hay datos en IndexedDB');
                    resolve();
                }
            };
            
            getRequest.onerror = () => {
                console.error('❌ Error obteniendo datos de IndexedDB');
                reject(getRequest.error);
            };
        };
    });
}

/**
 * Verifica si existe demo-001 en los almacenamientos
 */
async function checkDemo001Exists() {
    console.log('🔍 VERIFICANDO EXISTENCIA DE DEMO-001...');
    
    const results = {
        localStorage: false,
        indexedDB: false,
        sessionStorage: false
    };
    
    // Verificar localStorage
    try {
        const portfolioData = localStorage.getItem('mi-dashboard-portfolio');
        if (portfolioData) {
            const data = JSON.parse(portfolioData);
            results.localStorage = data.projects?.some(p => p.id === 'demo-001') || false;
        }
    } catch (error) {
        console.error('Error verificando localStorage:', error);
    }
    
    // Verificar sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    results.sessionStorage = sessionKeys.some(key => key.includes('demo-001'));
    
    // Verificar IndexedDB
    try {
        await new Promise((resolve) => {
            const request = indexedDB.open('mi-dashboard-db', 1);
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['portfolio-data'], 'readonly');
                const store = transaction.objectStore('portfolio-data');
                const getRequest = store.get('portfolio-data');
                
                getRequest.onsuccess = () => {
                    const data = getRequest.result;
                    results.indexedDB = data?.projects?.some(p => p.id === 'demo-001') || false;
                    resolve();
                };
                
                getRequest.onerror = () => resolve();
            };
            request.onerror = () => resolve();
        });
    } catch (error) {
        console.error('Error verificando IndexedDB:', error);
    }
    
    console.log('📊 Resultados de verificación:');
    console.log('  - localStorage:', results.localStorage ? '❌ ENCONTRADO' : '✅ LIMPIO');
    console.log('  - IndexedDB:', results.indexedDB ? '❌ ENCONTRADO' : '✅ LIMPIO');
    console.log('  - sessionStorage:', results.sessionStorage ? '❌ ENCONTRADO' : '✅ LIMPIO');
    
    return results;
}

// Exportar funciones para uso en consola del navegador
if (typeof window !== 'undefined') {
    window.cleanDemo001Project = cleanDemo001Project;
    window.checkDemo001Exists = checkDemo001Exists;
    console.log('🔧 Funciones disponibles:');
    console.log('  - cleanDemo001Project() - Limpiar proyecto demo-001');
    console.log('  - checkDemo001Exists() - Verificar si existe demo-001');
}

// Si se ejecuta directamente
if (typeof window !== 'undefined') {
    console.log('🚀 Ejecutando limpieza automática...');
    cleanDemo001Project().then(result => {
        if (result.success) {
            console.log('✅ Limpieza completada exitosamente');
        } else {
            console.error('❌ Error en la limpieza:', result.error);
        }
    });
}
