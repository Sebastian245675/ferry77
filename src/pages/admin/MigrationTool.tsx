import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { migrateAllVerificationData, migrateVerificationData } from '@/lib/migrationHelpers';

const MigrationTool = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    success: number;
    failed: number;
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');

  const handleMigrateAll = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const migrationResult = await migrateAllVerificationData();
      setResult(migrationResult);
    } catch (err) {
      setError('Error durante la migración: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateUser = async () => {
    if (!userId) {
      setError('Por favor ingresa un ID de usuario');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const success = await migrateVerificationData(userId);
      setResult({
        success: success ? 1 : 0,
        failed: success ? 0 : 1
      });
    } catch (err) {
      setError('Error durante la migración: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Herramienta de Migración de Datos</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Migración de Datos de Verificación</CardTitle>
          <CardDescription>
            Esta herramienta migra los datos de verificación desde la colección "verificaciones" 
            a la colección "users" como un subcampo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Migrar todos los usuarios</h3>
            <Button 
              onClick={handleMigrateAll} 
              disabled={loading}
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrando...
                </>
              ) : 'Migrar todos los datos de verificación'}
            </Button>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <h3 className="font-medium mb-2">Migrar usuario específico</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="ID del usuario"
                className="px-3 py-2 border rounded flex-1"
              />
              <Button 
                onClick={handleMigrateUser} 
                disabled={loading}
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Migrando...
                  </>
                ) : 'Migrar usuario'}
              </Button>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && (
            <Alert variant={result.success > 0 ? 'default' : 'destructive'} className="mt-4">
              {result.success > 0 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                Migración completada. {result.success} documento(s) migrado(s) correctamente. {' '}
                {result.failed} error(es).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrationTool;
