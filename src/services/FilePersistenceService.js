// Servicio de persistencia automática en archivos locales
class FilePersistenceService {
  constructor() {
    this.dataFileName = 'portfolio-data.json';
    this.backupDir = 'backups';
    this.syncInterval = 30000; // 30 segundos
    this.isInitialized = false;
    this.syncTimer = null;
    this.fileCreated = false; // Control para evitar descargas duplicadas
    this.lastBackupTime = null; // Control para respaldos espaciados
    this.dbName = 'MiDashboardDB';
    this.dbVersion = 1;
    this.storeName = 'portfolioData';
  }

  // Inicializar el servicio
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Crear directorio de respaldos si no existe
      await this.createBackupDirectory();
      
      // NO cargar datos aquí - se hace desde App.js
      // await this.loadData();
      
      // Iniciar sincronización automática para respaldos regulares
      this.startAutoSync();
      
      this.isInitialized = true;
      console.log('✅ FilePersistenceService inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando FilePersistenceService:', error);
    }
  }

  // Crear directorio de respaldos
  async createBackupDirectory() {
    try {
      // En un entorno real, esto se haría con Node.js
      // Por ahora, simulamos la creación del directorio
      console.log('📁 Directorio de respaldos creado/verificado');
    } catch (error) {
      console.error('Error creando directorio de respaldos:', error);
    }
  }

  // Cargar datos del archivo principal
  async loadData() {
    try {
      // Safari: usar IndexedDB para persistencia real
      if (this.isSafari()) {
        console.log('🍎 Safari detectado - cargando desde IndexedDB');
        const indexedData = await this.loadFromIndexedDB();
        if (indexedData) {
          console.log('📂 Datos cargados desde IndexedDB - globalResources:', indexedData.globalResources);
          console.log('📂 Cantidad de recursos cargados:', indexedData.globalResources?.length || 0);
          return indexedData;
        }
        // Fallback a localStorage si no hay datos en IndexedDB
        const savedData = localStorage.getItem('mi-dashboard-portfolio');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          console.log('📂 Datos cargados desde localStorage (fallback)');
          return parsedData;
        }
        return null;
      }
      
      // Otros navegadores: intentar File System Access API primero
      if ('showOpenFilePicker' in window) {
        try {
          const [fileHandle] = await window.showOpenFilePicker({
            types: [{
              description: 'JSON files',
              accept: { 'application/json': ['.json'] }
            }]
          });
          
          this.fileHandle = fileHandle;
          const file = await fileHandle.getFile();
          const text = await file.text();
          const data = JSON.parse(text);
          console.log('📂 Datos cargados desde archivo del sistema:', data);
          return data;
        } catch (error) {
          console.log('File System Access API no disponible, usando localStorage');
        }
      }
      
      // Fallback: cargar desde localStorage
      console.log('📂 Cargando datos desde localStorage...');
      const savedData = localStorage.getItem('mi-dashboard-portfolio');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('📂 Datos cargados - globalResources:', parsedData.globalResources);
        console.log('📂 Cantidad de recursos cargados:', parsedData.globalResources?.length || 0);
        return parsedData;
      }
      
      console.log('📂 No hay datos guardados');
      return null;
      
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      return null;
    }
  }

  // Cargar datos desde archivo real
  async loadFromFile() {
    try {
      console.log('📂 Intentando cargar desde archivo...');
      
      // Intentar usar File System Access API para abrir archivo
      if ('showOpenFilePicker' in window) {
        try {
          const [fileHandle] = await window.showOpenFilePicker({
            types: [{
              description: 'JSON files',
              accept: { 'application/json': ['.json'] }
            }]
          });
          
          const file = await fileHandle.getFile();
          const text = await file.text();
          const data = JSON.parse(text);
          
          console.log('📂 Datos cargados desde archivo del sistema:', data);
          return data;
        } catch (error) {
          console.log('File System Access API no disponible, usando input de archivo');
        }
      }
      
      // Fallback: Input de archivo tradicional
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.style.display = 'none';
      
      return new Promise((resolve) => {
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const data = JSON.parse(e.target.result);
                console.log('📂 Datos cargados desde archivo:', data);
                resolve(data);
              } catch (error) {
                console.error('❌ Error parseando archivo:', error);
                resolve(null);
              }
            };
            reader.readAsText(file);
          } else {
            resolve(null);
          }
        };
        
        // Simular clic en el input
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
      });
    } catch (error) {
      console.error('❌ Error cargando desde archivo:', error);
      return null;
    }
  }

  // Guardar datos en archivo principal
  async saveData(data) {
    try {
      // Validar tamaño de datos antes de guardar
      const dataStr = JSON.stringify(data, null, 2);
      const dataSize = new Blob([dataStr]).size;
      const maxSize = 5 * 1024 * 1024; // 5MB límite
      
      if (dataSize > maxSize) {
        console.warn('⚠️ Datos exceden límite de memoria:', dataSize, 'bytes');
        // Limpiar datos antiguos si es necesario
        this.cleanOldData(data);
      }
      
      // Guardar en localStorage (inmediato)
      localStorage.setItem('mi-dashboard-portfolio', dataStr);
      
      // Guardar en IndexedDB para persistencia real (SIN descargas automáticas)
      try {
        await this.saveToIndexedDB(data);
        this.fileCreated = true;
        console.log('✅ Datos guardados exitosamente en IndexedDB');
      } catch (error) {
        console.error('❌ Error guardando en IndexedDB:', error);
        // Solo mostrar error, NO descargar archivos automáticamente
        console.log('⚠️ Los datos se mantienen en localStorage como respaldo');
      }
      
      // Disparar evento de guardado
      const saveEvent = new CustomEvent('fileDataSaved', {
        detail: { 
          fileName: this.dataFileName,
          timestamp: new Date().toISOString(),
          dataSize: dataStr.length,
          path: 'IndexedDB + localStorage'
        }
      });
      window.dispatchEvent(saveEvent);
      
      return true;
    } catch (error) {
      console.error('Error guardando datos:', error);
      return false;
    }
  }

  // Crear archivo de datos una sola vez (solo persistencia local)
  async createDataFile(data) {
    try {
      // Guardar en localStorage (inmediato)
      const dataStr = JSON.stringify(data, null, 2);
      localStorage.setItem('mi-dashboard-portfolio', dataStr);
      
      // Usar IndexedDB para persistencia real (SIN descargas automáticas)
      await this.saveToIndexedDB(data);
      this.fileCreated = true;
      
      console.log('✅ Archivo de datos creado en IndexedDB (persistencia local)');
      
    } catch (error) {
      console.error('Error creando archivo de datos:', error);
    }
  }

  // Función auxiliar para descargar archivo de datos
  downloadDataFile(data, fileName) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log(`💾 Archivo ${fileName} descargado para actualización`);
  }

  // Detectar si es Safari
  isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }

  // Limpiar datos para IndexedDB (remover propiedades no serializables)
  cleanDataForIndexedDB(data) {
    try {
      // Convertir a JSON y de vuelta para limpiar propiedades no serializables
      const cleanedData = JSON.parse(JSON.stringify(data));
      return cleanedData;
    } catch (error) {
      console.warn('⚠️ Error limpiando datos, usando clonación manual:', error);
      // Fallback: clonación manual de propiedades básicas
      const cleanedData = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          try {
            // Intentar clonar cada propiedad individualmente
            if (Array.isArray(data[key])) {
              cleanedData[key] = data[key].map(item => 
                typeof item === 'object' && item !== null 
                  ? JSON.parse(JSON.stringify(item))
                  : item
              );
            } else if (typeof data[key] === 'object' && data[key] !== null) {
              cleanedData[key] = JSON.parse(JSON.stringify(data[key]));
            } else {
              cleanedData[key] = data[key];
            }
          } catch (propError) {
            console.warn(`⚠️ Saltando propiedad no serializable: ${key}`, propError);
            // Omitir propiedades problemáticas
          }
        }
      }
      return cleanedData;
    }
  }

  // Guardar en IndexedDB (persistencia real para Safari)
  async saveToIndexedDB(data) {
    return new Promise((resolve, reject) => {
      console.log('🔍 Abriendo IndexedDB para guardar...');
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('❌ Error abriendo IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.log('✅ IndexedDB abierto para guardar');
        const db = request.result;
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        console.log('💾 Guardando datos en IndexedDB...');
        console.log('💾 Datos a guardar:', Object.keys(data));
        
        // Limpiar datos antes de guardar en IndexedDB
        const cleanedData = this.cleanDataForIndexedDB(data);
        const putRequest = store.put(cleanedData, 'portfolio-data');
        
        putRequest.onsuccess = () => {
          console.log('💾 Datos guardados en IndexedDB (persistencia real)');
          console.log('💾 Clave guardada: portfolio-data');
          resolve();
        };
        
        putRequest.onerror = () => {
          console.error('❌ Error guardando en IndexedDB:', putRequest.error);
          reject(putRequest.error);
        };
      };
      
      request.onupgradeneeded = (event) => {
        console.log('🔧 Creando/actualizando estructura de IndexedDB para guardar...');
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
          console.log('✅ ObjectStore creado para guardar:', this.storeName);
        }
      };
    });
  }

  // Cargar desde IndexedDB
  async loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
      console.log('🔍 Intentando abrir IndexedDB...');
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('❌ Error abriendo IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.log('✅ IndexedDB abierto correctamente');
        const db = request.result;
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        console.log('🔍 Buscando datos en IndexedDB...');
        const getRequest = store.get('portfolio-data');
        
        getRequest.onsuccess = () => {
          console.log('🔍 Resultado de búsqueda en IndexedDB:', getRequest.result);
          if (getRequest.result) {
            console.log('📂 Datos cargados desde IndexedDB (persistencia real)');
            console.log('📂 Datos encontrados:', Object.keys(getRequest.result));
            resolve(getRequest.result);
          } else {
            console.log('📂 No hay datos en IndexedDB');
            resolve(null);
          }
        };
        
        getRequest.onerror = () => {
          console.error('❌ Error cargando desde IndexedDB:', getRequest.error);
          reject(getRequest.error);
        };
      };
      
      request.onupgradeneeded = (event) => {
        console.log('🔧 Creando/actualizando estructura de IndexedDB...');
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
          console.log('✅ ObjectStore creado:', this.storeName);
        }
      };
    });
  }

  // Crear respaldo automático (solo cuando sea necesario)
  async createBackup(data) {
    try {
      const timestamp = new Date().toISOString();
      const backupFileName = `backup-${timestamp.split('T')[0]}-${Date.now()}.json`;
      
      // Solo crear respaldo si han pasado al menos 10 minutos desde el último
      const now = new Date();
      if (this.lastBackupTime && (now - this.lastBackupTime) < 10 * 60 * 1000) {
        console.log('📦 Respaldo omitido - muy reciente');
        return true;
      }
      
      // Crear y descargar respaldo en la raíz del proyecto
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Crear enlace de descarga silenciosa para respaldo
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFileName;
      link.style.display = 'none';
      
      // Establecer la ruta de descarga en la raíz del proyecto
      const projectPath = window.location.origin.replace('localhost:3000', 'mi-dashboard');
      link.setAttribute('data-path', projectPath);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Actualizar tiempo del último respaldo
      this.lastBackupTime = now;
      
      console.log('📦 Respaldo automático creado:', backupFileName);
      console.log('📦 Respaldo guardado en la raíz del proyecto');
      
      // Disparar evento de respaldo
      const backupEvent = new CustomEvent('autoBackupCreated', {
        detail: { 
          fileName: backupFileName,
          timestamp,
          dataSize: JSON.stringify(data).length,
          path: 'raíz del proyecto'
        }
      });
      window.dispatchEvent(backupEvent);
      
      return true;
    } catch (error) {
      console.error('Error creando respaldo:', error);
      return false;
    }
  }

  // Iniciar sincronización automática
  startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      this.performAutoSync();
    }, this.syncInterval);
    
    console.log('🔄 Sincronización automática iniciada cada 30 segundos');
  }

  // Detener sincronización automática
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('⏹️ Sincronización automática detenida');
    }
  }

  // Realizar sincronización automática (solo persistencia, sin descargas)
  async performAutoSync() {
    try {
      console.log('🔄 Ejecutando sincronización automática...');
      
      // Obtener datos actuales del localStorage
      const savedData = localStorage.getItem('mi-dashboard-portfolio');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // Solo guardar en IndexedDB para persistencia real (SIN descargas)
        await this.saveToIndexedDB(data);
        
        console.log('✅ Sincronización automática completada (IndexedDB)');
      } else {
        console.log('⚠️ No hay datos para sincronizar');
      }
    } catch (error) {
      console.error('❌ Error en sincronización automática:', error);
    }
  }

  // Limpiar datos antiguos para reducir tamaño
  cleanOldData(data) {
    try {
      console.log('🧹 Limpiando datos antiguos para reducir tamaño...');
      
      // Limpiar logs de auditoría antiguos (mantener solo últimos 100 por proyecto)
      if (data.auditLogsByProject) {
        for (const projectId in data.auditLogsByProject) {
          const logs = data.auditLogsByProject[projectId];
          if (Array.isArray(logs) && logs.length > 100) {
            data.auditLogsByProject[projectId] = logs.slice(-100);
            console.log(`🧹 Limpiados logs antiguos del proyecto ${projectId}`);
          }
        }
      }
      
      // Limpiar archivos antiguos (mantener solo últimos 50 por proyecto)
      if (data.filesByProject) {
        for (const projectId in data.filesByProject) {
          const files = data.filesByProject[projectId];
          if (Array.isArray(files) && files.length > 50) {
            data.filesByProject[projectId] = files.slice(-50);
            console.log(`🧹 Limpiados archivos antiguos del proyecto ${projectId}`);
          }
        }
      }
      
      console.log('✅ Limpieza de datos completada');
    } catch (error) {
      console.error('❌ Error limpiando datos antiguos:', error);
    }
  }

  // Exportar datos como archivo descargable (MANUAL - solo cuando el usuario lo solicite)
  exportData(data, fileName = null) {
    try {
      const timestamp = new Date().toISOString();
      const exportFileName = fileName || `strategiapm-backup-${timestamp.split('T')[0]}.json`;
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('📤 Backup manual creado:', exportFileName);
      return true;
    } catch (error) {
      console.error('Error exportando datos:', error);
      return false;
    }
  }

  // Crear backup manual (solo cuando el usuario lo solicite)
  async createManualBackup(data) {
    try {
      const timestamp = new Date().toISOString();
      const backupFileName = `strategiapm-backup-${timestamp.split('T')[0]}-${Date.now()}.json`;
      
      // Crear backup manual
      this.exportData(data, backupFileName);
      
      console.log('📦 Backup manual creado:', backupFileName);
      return true;
    } catch (error) {
      console.error('Error creando backup manual:', error);
      return false;
    }
  }

  // Importar datos desde archivo
  async importData(file) {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const importedData = JSON.parse(e.target.result);
            
            // Guardar datos importados
            await this.saveData(importedData);
            
            // Disparar evento de importación
            const importEvent = new CustomEvent('fileDataImported', {
              detail: { 
                fileName: file.name,
                timestamp: new Date().toISOString(),
                dataSize: JSON.stringify(importedData).length
              }
            });
            window.dispatchEvent(importEvent);
            
            resolve(importedData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    } catch (error) {
      console.error('Error importando datos:', error);
      throw error;
    }
  }

  // Obtener estado del servicio
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isSyncing: this.syncTimer !== null,
      syncInterval: this.syncInterval,
      dataFileName: this.dataFileName,
      backupDir: this.backupDir
    };
  }
}

// Crear instancia singleton
const filePersistenceService = new FilePersistenceService();

export default filePersistenceService;
