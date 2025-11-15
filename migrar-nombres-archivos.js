/**
 * Script para migrar nombres de archivos antiguos
 *
 * Este script actualiza los nombres de archivos que fueron subidos
 * con el formato antiguo (timestamp-randomId.ext) para mostrar
 * sus nombres originales en la interfaz.
 *
 * IMPORTANTE: Solo actualiza la base de datos local (localStorage),
 * NO renombra los archivos físicos en Supabase Storage.
 */

const migrateFileNames = () => {
  console.log('🔄 Iniciando migración de nombres de archivos...\n');

  // Buscar todas las claves de archivos en localStorage
  const keys = Object.keys(localStorage);
  const projectFileKeys = keys.filter(key => key.startsWith('project-files-'));

  if (projectFileKeys.length === 0) {
    console.log('ℹ️ No se encontraron proyectos con archivos en localStorage');
    return;
  }

  let totalFilesMigrated = 0;
  let totalProjects = 0;

  projectFileKeys.forEach(key => {
    try {
      const filesData = localStorage.getItem(key);
      if (!filesData) return;

      const files = JSON.parse(filesData);
      if (!Array.isArray(files) || files.length === 0) return;

      console.log(`\n📂 Proyecto: ${key.replace('project-files-', '')}`);
      console.log(`   Archivos encontrados: ${files.length}`);

      let projectFilesMigrated = 0;

      const updatedFiles = files.map(file => {
        // Si el archivo ya tiene originalName en metadata, usarlo
        if (file.metadata?.originalName && file.fileName !== file.metadata.originalName) {
          console.log(`   ✅ ${file.fileName} → ${file.metadata.originalName}`);
          projectFilesMigrated++;
          return {
            ...file,
            fileName: file.metadata.originalName,
            originalName: file.metadata.originalName
          };
        }

        // Si el archivo ya tiene originalName directamente, mantenerlo
        if (file.originalName && file.fileName !== file.originalName) {
          console.log(`   ✅ ${file.fileName} → ${file.originalName}`);
          projectFilesMigrated++;
          return {
            ...file,
            fileName: file.originalName
          };
        }

        // Si no tiene nombre original, intentar extraerlo del fileName actual
        // Formato: timestamp-randomId.extension → buscar en storagePath
        if (file.storagePath) {
          const pathParts = file.storagePath.split('/');
          const storageFileName = pathParts[pathParts.length - 1];

          // Si el nombre en storage es diferente al fileName mostrado, usar el de storage
          if (storageFileName && storageFileName !== file.fileName) {
            // Extraer el nombre original del storage (remover timestamp-)
            const match = storageFileName.match(/^\d+-(.+)$/);
            if (match) {
              const originalName = match[1];
              console.log(`   ✅ ${file.fileName} → ${originalName}`);
              projectFilesMigrated++;
              return {
                ...file,
                fileName: originalName,
                originalName: originalName
              };
            }
          }
        }

        // No se pudo migrar
        console.log(`   ⚠️  No se pudo migrar: ${file.fileName}`);
        return file;
      });

      // Guardar archivos actualizados
      localStorage.setItem(key, JSON.stringify(updatedFiles));

      if (projectFilesMigrated > 0) {
        totalProjects++;
        totalFilesMigrated += projectFilesMigrated;
        console.log(`   ✨ Migrados: ${projectFilesMigrated} archivos`);
      }

    } catch (error) {
      console.error(`❌ Error procesando ${key}:`, error.message);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Migración completada!`);
  console.log(`   Proyectos actualizados: ${totalProjects}`);
  console.log(`   Archivos migrados: ${totalFilesMigrated}`);
  console.log('='.repeat(50));
  console.log('\n💡 Recarga la página para ver los cambios');
};

// Ejecutar migración
migrateFileNames();
