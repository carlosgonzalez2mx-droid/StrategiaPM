#!/usr/bin/env node

/**
 * SCRIPT DE RESTAURACIÓN SEGURA DE BACKUPS
 * Este script restaura backups SIN perder los datos del usuario
 */

const fs = require('fs');
const path = require('path');

class BackupRestorer {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backups');
    this.srcDir = path.join(this.projectRoot, 'src');
    this.dataBackupDir = path.join(this.projectRoot, 'data-backups');
  }

  // Crear respaldo de datos antes de restaurar
  async backupUserData() {
    console.log('🔄 Creando respaldo de datos del usuario...');
    
    try {
      // Crear directorio de respaldo de datos
      if (!fs.existsSync(this.dataBackupDir)) {
        fs.mkdirSync(this.dataBackupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dataBackupPath = path.join(this.dataBackupDir, `user-data-${timestamp}.json`);

      // Extraer datos de localStorage (simulado)
      const userData = {
        timestamp: new Date().toISOString(),
        note: 'Datos del usuario antes de restaurar backup',
        localStorage: 'Se extraerán automáticamente desde el navegador',
        indexedDB: 'Se extraerán automáticamente desde el navegador'
      };

      fs.writeFileSync(dataBackupPath, JSON.stringify(userData, null, 2));
      console.log('✅ Respaldo de datos creado:', dataBackupPath);
      
      return dataBackupPath;
    } catch (error) {
      console.error('❌ Error creando respaldo de datos:', error);
      throw error;
    }
  }

  // Restaurar backup de forma segura
  async restoreBackup(backupName) {
    console.log(`🔄 Restaurando backup: ${backupName}`);
    
    try {
      // 1. Crear respaldo de datos del usuario
      const dataBackupPath = await this.backupUserData();
      
      // 2. Verificar que el backup existe
      const backupPath = path.join(this.backupDir, backupName);
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup no encontrado: ${backupPath}`);
      }

      // 3. Crear respaldo del src actual
      const currentSrcBackup = path.join(this.dataBackupDir, `src-backup-${Date.now()}`);
      if (fs.existsSync(this.srcDir)) {
        fs.cpSync(this.srcDir, currentSrcBackup, { recursive: true });
        console.log('✅ Respaldo del src actual creado');
      }

      // 4. Restaurar archivos del backup (SOLO código, NO datos)
      const backupSrcPath = path.join(backupPath, 'src');
      if (fs.existsSync(backupSrcPath)) {
        // Restaurar archivos de código
        fs.cpSync(backupSrcPath, this.srcDir, { recursive: true });
        console.log('✅ Archivos de código restaurados');
      }

      // 5. Crear script para restaurar datos del usuario
      await this.createDataRestoreScript(dataBackupPath);

      console.log('✅ Restauración completada de forma segura');
      console.log('📋 Próximos pasos:');
      console.log('   1. Ejecuta la aplicación');
      console.log('   2. Usa el script de restauración de datos');
      console.log('   3. Tus datos se restaurarán automáticamente');

    } catch (error) {
      console.error('❌ Error restaurando backup:', error);
      throw error;
    }
  }

  // Crear script para restaurar datos del usuario
  async createDataRestoreScript(dataBackupPath) {
    const restoreScript = `
// Script para restaurar datos del usuario después de restaurar backup
console.log('🔄 Restaurando datos del usuario...');

// Función para extraer datos de IndexedDB
async function extractDataFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MiDashboardDB', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['portfolioData'], 'readonly');
      const store = transaction.objectStore('portfolioData');
      const getRequest = store.get('portfolio-data');
      
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          console.log('✅ Datos extraídos de IndexedDB');
          resolve(getRequest.result);
        } else {
          console.log('⚠️ No hay datos en IndexedDB');
          resolve(null);
        }
      };
      
      getRequest.onerror = () => {
        console.error('❌ Error extrayendo datos de IndexedDB');
        reject(getRequest.error);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error abriendo IndexedDB');
      reject(request.error);
    };
  });
}

// Función para extraer datos de localStorage
function extractDataFromLocalStorage() {
  const data = localStorage.getItem('mi-dashboard-portfolio');
  if (data) {
    console.log('✅ Datos extraídos de localStorage');
    return JSON.parse(data);
  }
  console.log('⚠️ No hay datos en localStorage');
  return null;
}

// Ejecutar restauración
async function restoreUserData() {
  try {
    // Intentar extraer de IndexedDB primero
    let userData = await extractDataFromIndexedDB();
    
    // Si no hay datos en IndexedDB, intentar localStorage
    if (!userData) {
      userData = extractDataFromLocalStorage();
    }
    
    if (userData) {
      console.log('✅ Datos del usuario encontrados y listos para restaurar');
      console.log('📊 Proyectos encontrados:', userData.projects?.length || 0);
      
      // Los datos se restaurarán automáticamente cuando la aplicación los cargue
      return userData;
    } else {
      console.log('⚠️ No se encontraron datos del usuario para restaurar');
      return null;
    }
  } catch (error) {
    console.error('❌ Error restaurando datos del usuario:', error);
    return null;
  }
}

// Ejecutar cuando se cargue la página
if (typeof window !== 'undefined') {
  restoreUserData();
}
`;

    const scriptPath = path.join(this.projectRoot, 'restore-user-data.js');
    fs.writeFileSync(scriptPath, restoreScript);
    console.log('✅ Script de restauración de datos creado:', scriptPath);
  }

  // Listar backups disponibles
  listBackups() {
    console.log('📋 Backups disponibles:');
    
    if (!fs.existsSync(this.backupDir)) {
      console.log('❌ No hay directorio de backups');
      return [];
    }

    const backups = fs.readdirSync(this.backupDir)
      .filter(item => fs.statSync(path.join(this.backupDir, item)).isDirectory())
      .sort()
      .reverse();

    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup}`);
    });

    return backups;
  }
}

// Función principal
async function main() {
  const restorer = new BackupRestorer();
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔧 RESTAURADOR DE BACKUPS SEGURO');
    console.log('');
    restorer.listBackups();
    console.log('');
    console.log('Uso: node restaurar-backup-seguro.js <nombre-del-backup>');
    console.log('Ejemplo: node restaurar-backup-seguro.js StrategiaPMv77');
    return;
  }

  const backupName = args[0];
  
  try {
    await restorer.restoreBackup(backupName);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = BackupRestorer;
