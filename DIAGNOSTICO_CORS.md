# Diagnóstico de errores CORS en Firebase Storage

Este documento te ayudará a interpretar los logs que hemos añadido para diagnosticar el problema de CORS con Firebase Storage.

## ¿Qué buscar en los logs?

### 1. Error de CORS en la consola del navegador

Si el problema es realmente CORS, verás mensajes como estos en la consola:

```
Access to fetch at 'https://firebasestorage.googleapis.com/...' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 2. Detalles específicos del error

En los logs que acabamos de implementar, busca específicamente:

- `[UPLOAD] Error detallado al subir la imagen:` - Muestra el error completo
- `[UPLOAD] Código de error:` - Puede mostrar códigos como "storage/unauthorized" o "cors-error"
- `[UPLOAD] Respuesta del servidor:` - Puede contener detalles sobre la respuesta HTTP

## Solución permanente

Si confirmas que el problema es CORS, aquí están los pasos para solucionarlo permanentemente:

1. Instala Firebase CLI si no lo tienes ya:
```
npm install -g firebase-tools
```

2. Inicia sesión en Firebase:
```
firebase login
```

3. Configura las reglas CORS para tu bucket usando el archivo cors.json que ya hemos creado:
```
firebase storage:cors set cors.json --project ferry-67757
```

4. Verifica que las reglas se hayan aplicado:
```
firebase storage:cors get --project ferry-67757
```

## Casos comunes

1. **Error en uploadBytes**: Indica problemas con CORS al subir archivos. Verificar la configuración del bucket.

2. **Error en getDownloadURL**: Indica problemas al obtener la URL después de subir. La subida puede haber funcionado pero no se puede recuperar la URL.

3. **Error al actualizar Firestore**: La imagen puede haberse subido correctamente pero hay problemas al actualizar los metadatos en la base de datos.

## Próximos pasos

Una vez que identifiques el error específico en los logs, actualiza este documento con los hallazgos para que podamos seguir depurando el problema.
