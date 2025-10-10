-- Script para actualizar el Firebase UID del usuario empresa
-- juventud500oficial@gmail.com

-- Primero verificamos qué usuarios tienen ese email
SELECT id, email, firebase_uid, user_type, rol 
FROM usuarios 
WHERE email = 'juventud500oficial@gmail.com';

-- Actualizamos el Firebase UID del usuario con el UID correcto
UPDATE usuarios 
SET firebase_uid = 'ElPteWaqUWZEpWVc3IiMUHBkibl1',
    updated_at = NOW()
WHERE email = 'juventud500oficial@gmail.com' 
  AND user_type = 'empresa';

-- Verificamos que se actualizó correctamente
SELECT id, email, firebase_uid, user_type, rol 
FROM usuarios 
WHERE email = 'juventud500oficial@gmail.com';
