import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para reemplazar todas las referencias al puerto 8090 por 8091
function replacePortReferences(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Reemplazar todas las referencias a localhost:8090 por localhost:8091
    const updatedContent = content.replace(/localhost:8090/g, 'localhost:8091');
    
    // Solo escribir si hay cambios
    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✓ Actualizado: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error procesando ${filePath}:`, error.message);
    return false;
  }
}

// Función para buscar archivos .tsx y .ts recursivamente
function findFiles(dir, extensions = ['.tsx', '.ts']) {
  const files = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Evitar directorios de node_modules, .git, etc.
        if (!['node_modules', '.git', 'dist', 'build', 'target'].includes(item)) {
          scanDir(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDir(dir);
  return files;
}

// Directorio src
const srcDir = path.join(__dirname, 'src');

console.log('🔍 Buscando archivos TypeScript/React...');
const files = findFiles(srcDir);
console.log(`📁 Encontrados ${files.length} archivos`);

let updatedCount = 0;

console.log('\n🔄 Actualizando referencias de puerto...');
for (const file of files) {
  if (replacePortReferences(file)) {
    updatedCount++;
  }
}

console.log(`\n✅ Proceso completado: ${updatedCount} archivos actualizados`);
console.log('🎯 Todas las referencias de localhost:8090 han sido cambiadas a localhost:8091');