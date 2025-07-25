# Solución CORS para Firebase Storage

Este archivo explica cómo resolver los problemas de CORS en Firebase Storage cuando estás desarrollando en un entorno local.

## ¿Qué son los errores CORS?

CORS (Cross-Origin Resource Sharing) es un mecanismo de seguridad que restringe las solicitudes HTTP desde un origen (dominio) a otro. Cuando desarrollas localmente (por ejemplo, en `http://localhost:8080`) e intentas subir archivos a Firebase Storage, puedes encontrar errores CORS porque Firebase Storage no tiene configurado tu dominio local como un origen permitido.

## Solución implementada

La aplicación ahora utiliza una estrategia doble para manejar la subida de imágenes:

1. **En entorno local (localhost):**
   - Muestra una previsualización local inmediata usando `URL.createObjectURL()`
   - Evita llamar a `uploadBytes()` para no generar errores CORS
   - Utiliza una URL directa al bucket de Firebase Storage como alternativa
   - Esta URL sigue el formato: `https://storage.googleapis.com/[BUCKET_NAME]/[PATH]`

2. **En entorno de producción:**
   - Intenta el método estándar de subida con `uploadBytes()` y `getDownloadURL()`
   - Si falla, utiliza la URL directa como alternativa

## Cómo aplicar la configuración permanente de CORS

Para solucionar el problema de forma permanente, debes configurar las reglas CORS en Firebase Storage:

1. Instala Firebase CLI si aún no lo tienes:
```bash
npm install -g firebase-tools
```

2. Inicia sesión:
```bash
firebase login
```

3. Aplica la configuración CORS desde el archivo cors.json:
```bash
firebase storage:cors set cors.json --project ferry-67757
```

## Contenido del archivo cors.json

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

Esta configuración permite solicitudes desde cualquier origen. Para producción, es recomendable limitar los orígenes a tus dominios específicos.

## Verificación

Para verificar si la configuración CORS se ha aplicado correctamente:

```bash
firebase storage:cors get --project ferry-67757
```

## Reglas de seguridad recomendadas

Independientemente de la configuración CORS, asegúrate de tener reglas de seguridad adecuadas en Firebase Storage:

```
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read; 
      allow write: if request.auth != null;
    }
  }
}
```

Esta configuración permite que cualquiera lea archivos, pero solo los usuarios autenticados pueden escribir.
