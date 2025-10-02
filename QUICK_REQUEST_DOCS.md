# Sistema de Creación de Solicitudes con Dos Modos

## Descripción General

El sistema ahora permite crear solicitudes de cotización de dos maneras diferentes:

1. **Modo Rápido**: Carga archivos (PDF, Excel, imágenes) o describe en texto libre lo que necesitas
2. **Modo Manual**: Formulario tradicional paso a paso con control granular

## Modo Rápido

### Características:
- **Carga de archivos**: PDF, Excel, imágenes (máx. 10MB cada uno)
- **Descripción de chat**: Escribir naturalmente como si hablaras con un amigo
- **Procesamiento automático**: IA extrae productos y especificaciones
- **Preview inteligente**: Muestra la solicitud generada antes de confirmar
- **Tiempo estimado**: 2-3 minutos

### Casos de uso ideales:
- Tienes catálogos en PDF
- Listas de materiales en Excel
- Fotos de productos que necesitas
- Descripción rápida de un proyecto

### Ejemplo de uso:
```
"Hola, necesito herramientas para arreglar mi baño. 
Tengo que cambiar unas tuberías y arreglar el lavamanos. 
También necesito cemento y algunas cosas de plomería..."
```

## Modo Manual

### Características:
- **Control total**: Especifica cada detalle exactamente
- **Formulario estructurado**: Campos organizados por categorías
- **Validación completa**: Asegura que toda la información esté correcta
- **Items individuales**: Agrega productos uno por uno con especificaciones precisas
- **Tiempo estimado**: 8-10 minutos

### Casos de uso ideales:
- Proyectos complejos con especificaciones técnicas
- Necesitas control sobre cada detalle
- Cantidades y medidas muy específicas
- Múltiples categorías de productos

## Arquitectura Técnica

### Frontend (React)
```
src/pages/
├── NewRequestSelector.tsx      # Selector de modo
├── NewRequestRapido.tsx        # Modo rápido
├── NewRequest.tsx              # Modo manual (existente, modificado)
└── ...
```

### Backend (Spring Boot)
```
src/main/java/com/ferry77/backend/
├── controller/
│   └── QuickRequestController.java    # Endpoints para modo rápido
├── service/
│   └── FileProcessingService.java     # Procesamiento de archivos e IA
├── dto/
│   ├── FileProcessingResponse.java    # Respuesta de procesamiento
│   └── QuickRequestDTO.java           # Datos del modo rápido
└── ...
```

### API Endpoints

#### POST `/api/quick-request/upload-files`
- **Descripción**: Sube y procesa múltiples archivos
- **Entrada**: `MultipartFile[] files`
- **Salida**: Lista de resultados de procesamiento

#### POST `/api/quick-request/process-text`
- **Descripción**: Extrae información de texto libre
- **Entrada**: `{ "description": "texto..." }`
- **Salida**: Productos detectados, cantidades, profesión sugerida

#### POST `/api/quick-request/generate-request`
- **Descripción**: Genera solicitud estructurada
- **Entrada**: `QuickRequestDTO`
- **Salida**: Solicitud completa lista para enviar

## Procesamiento Inteligente

### Detección de Productos
El sistema detecta automáticamente:
- **Herramientas**: martillo, destornillador, taladro, sierra, nivel
- **Materiales**: cemento, arena, ladrillos, cal, yeso
- **Plomería**: tuberías, caños, llaves, grifos, válvulas
- **Electricidad**: cables, enchufes, interruptores, focos
- **Pintura**: pintura, rodillos, pinceles, diluyente

### Detección de Profesión/Categoría
Basado en palabras clave:
- **Plomería**: baño, tuberías, agua
- **Electricidad**: cables, enchufes, luz
- **Construcción**: cemento, ladrillos, obra
- **Carpintería**: madera, sierra, muebles
- **Pintura**: pintar, rodillo, color

### Extracción de Cantidades
Patrones como:
- "5 martillos"
- "10kg de cemento"
- "2 metros de cable"

## Configuración y Despliegue

### Variables de Entorno
```bash
# Backend
SPRING_PROFILES_ACTIVE=development
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/ferry77db
FILE_UPLOAD_MAX_SIZE=10MB

# Frontend
REACT_APP_API_URL=http://localhost:8080/api
```

### Dependencias Adicionales
```xml
<!-- Para procesamiento de archivos PDF -->
<dependency>
    <groupId>org.apache.pdfbox</groupId>
    <artifactId>pdfbox</artifactId>
    <version>2.0.24</version>
</dependency>

<!-- Para procesamiento de Excel -->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi</artifactId>
    <version>5.2.2</version>
</dependency>
```

## Flujo de Usuario

### Modo Rápido
1. Usuario elige "Modo Rápido"
2. Sube archivos y/o escribe descripción
3. Sistema procesa y extrae información
4. Se genera preview de la solicitud
5. Usuario revisa y confirma o edita
6. Solicitud se envía a empresas

### Modo Manual
1. Usuario elige "Modo Manual"
2. Completa formulario paso a paso
3. Agrega items individuales
4. Especifica detalles exactos
5. Revisa información completa
6. Solicitud se envía a empresas

## Mejoras Futuras

### Integración con IA Avanzada
- OpenAI GPT para mejor comprensión de texto
- Google Vision API para análisis de imágenes
- AWS Textract para extracción avanzada de documentos

### Funcionalidades Adicionales
- **Plantillas**: Guardar solicitudes como plantillas
- **Historial inteligente**: Sugerencias basadas en solicitudes anteriores
- **Colaboración**: Múltiples usuarios trabajando en la misma solicitud
- **Integración con inventarios**: Conexión directa con sistemas de empresas

### Optimizaciones
- **Cache**: Almacenar resultados de procesamiento
- **Compresión**: Optimizar tamaño de archivos subidos
- **Paralelización**: Procesar múltiples archivos simultáneamente
- **Offline**: Funcionalidad básica sin conexión

## Métricas y Analytics

### KPIs a Monitorear
- Tiempo promedio por modo
- Tasa de conversión por modo
- Satisfacción del usuario
- Precisión de la extracción automática
- Tasa de edición de solicitudes generadas

### Eventos a Trackear
- Selección de modo
- Archivos subidos exitosamente
- Errores de procesamiento
- Tiempo en preview
- Solicitudes confirmadas vs editadas