import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const company = req.body;
    
    // Asegurarse de que tiene los campos requeridos
    if (!company.name) {
      return res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });
    }

    // Añadir campos adicionales
    company.createdAt = Timestamp.now();
    
    // Añadir a Firestore
    const docRef = await addDoc(collection(db, 'empresas'), company);
    
    return res.status(201).json({ id: docRef.id, ...company });
  } catch (error) {
    console.error('Error al crear empresa:', error);
    return res.status(500).json({ error: 'Error al crear la empresa' });
  }
}
