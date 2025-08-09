import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { validateInventoryToken } from "../lib/inventoryLinkService";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, DollarSign, Save, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description?: string;
  image?: string;
  unit: string;
  updatedAt?: string;
}

interface CompanyProducts {
  companyId: string;
  products: Product[];
  companyName: string;
  ubicacion: any;
  updatedAt: Date;
  createdAt: Date;
}

const InventoryManager = () => {
  const { token } = useParams<{ token: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [tokenData, setTokenData] = useState<{ companyId: string; exp: number } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [companyName, setCompanyName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [ubicacion, setUbicacion] = useState<any>({});
  const [updatingProduct, setUpdatingProduct] = useState<string | null>(null);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      const validatedToken = validateInventoryToken(token);
      setTokenData(validatedToken);

      if (validatedToken) {
        try {
          // Load company products
          const productDoc = doc(db, "listados", validatedToken.companyId);
          const docSnapshot = await getDoc(productDoc);
          
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as CompanyProducts;
            setProducts(data.products || []);
            setCompanyName(data.companyName || "Empresa");
            setUbicacion(data.ubicacion || {});
          }
        } catch (error) {
          console.error("Error cargando productos:", error);
          toast({
            title: "Error",
            description: "No se pudieron cargar los productos",
            variant: "destructive",
          });
        }
      }
      
      setIsLoading(false);
    }

    validateToken();
  }, [token]);

  const handleStockChange = async (productId: string, newStock: number) => {
    try {
      setUpdatingProduct(productId);
      
      // Update locally
      const updatedProducts = products.map(p => 
        p.id === productId 
          ? { ...p, stock: newStock, updatedAt: new Date().toISOString() } 
          : p
      );
      
      setProducts(updatedProducts);
      
      // Update in Firestore
      const productDoc = doc(db, "listados", tokenData!.companyId);
      await updateDoc(productDoc, { 
        products: updatedProducts, 
        updatedAt: new Date() 
      });
      
      toast({
        title: "Stock actualizado",
        description: "El stock ha sido actualizado correctamente",
      });
    } catch (error) {
      console.error("Error actualizando stock:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el stock",
        variant: "destructive",
      });
    } finally {
      setUpdatingProduct(null);
    }
  };

  const handlePriceChange = async (productId: string, newPrice: number) => {
    try {
      setUpdatingProduct(productId);
      
      // Update locally
      const updatedProducts = products.map(p => 
        p.id === productId 
          ? { ...p, price: newPrice, updatedAt: new Date().toISOString() } 
          : p
      );
      
      setProducts(updatedProducts);
      
      // Update in Firestore
      const productDoc = doc(db, "listados", tokenData!.companyId);
      await updateDoc(productDoc, { 
        products: updatedProducts, 
        updatedAt: new Date() 
      });
      
      toast({
        title: "Precio actualizado",
        description: "El precio ha sido actualizado correctamente",
      });
    } catch (error) {
      console.error("Error actualizando precio:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el precio",
        variant: "destructive",
      });
    } finally {
      setUpdatingProduct(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-blue-600 animate-spin mb-4" />
          <h1 className="text-xl font-bold text-blue-800">Cargando...</h1>
          <p className="text-gray-600">Verificando acceso al inventario</p>
        </div>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-md shadow-lg border-red-100">
          <CardHeader className="bg-red-50 text-red-800 border-b border-red-100">
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" />
              Enlace no válido
            </CardTitle>
            <CardDescription className="text-red-700">
              Este enlace ha expirado o no es válido
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="mb-4 text-gray-700">
              El enlace que estás utilizando para gestionar el inventario ha expirado o no es válido.
              Contacta con el administrador para obtener un nuevo enlace.
            </p>
            <Button variant="outline" onClick={() => window.history.back()} className="mt-2">
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="glass-effect mb-6">
          <CardHeader className="border-b border-blue-100 bg-blue-50/70">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-blue-800 flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-blue-700" />
                  Gestión de Inventario
                </CardTitle>
                <CardDescription className="text-blue-700 font-medium">
                  {companyName}
                </CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-800 px-2 py-1 text-xs">
                Enlace Seguro
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 mb-6">
              <p className="mb-1">
                <strong>Localización:</strong> {ubicacion?.ciudad}, {ubicacion?.localidad}
              </p>
              <p>
                <strong>Válido hasta:</strong> {new Date(tokenData.exp).toLocaleDateString()} {new Date(tokenData.exp).toLocaleTimeString()}
              </p>
            </div>

            <h2 className="text-lg font-bold text-gray-800 mb-4">Lista de Productos</h2>
            
            {products.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-blue-200 rounded-md bg-blue-50/50">
                <Package className="h-12 w-12 mx-auto text-blue-300 mb-2" />
                <p className="text-gray-600">No hay productos disponibles</p>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Card 
                    key={product.id}
                    className={`overflow-hidden transition-shadow hover:shadow-md ${
                      (product.stock === 0 || product.stock === null) 
                        ? "border-red-100 bg-red-50/30" 
                        : "border-blue-100"
                    }`}
                  >
                    <div className="flex items-center p-4">
                      <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden border border-gray-200 mr-4">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = "https://via.placeholder.com/64?text=No+img";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                            <Package className="h-6 w-6 text-blue-300" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{product.name}</h3>
                          {(product.stock === 0 || product.stock === null) && (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                              Fuera de stock
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Badge variant="outline" className="mr-2 text-xs">
                            {product.category}
                          </Badge>
                          <span>{product.updatedAt ? new Date(product.updatedAt).toLocaleString('es-ES', { dateStyle: 'short' }) : 'Sin actualizar'}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2">
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500 block">Precio ({product.unit})</label>
                            <div className="flex items-center relative">
                              <DollarSign className="h-4 w-4 text-blue-600 absolute left-2" />
                              <Input
                                type="number"
                                value={product.price}
                                min={0}
                                className="pl-8 w-24 text-blue-700 font-medium"
                                onChange={(e) => {
                                  const newPrice = Number(e.target.value);
                                  setProducts(products.map(p => 
                                    p.id === product.id ? { ...p, price: newPrice } : p
                                  ));
                                }}
                                onBlur={(e) => handlePriceChange(product.id, Number(e.target.value))}
                              />
                              {updatingProduct === product.id && (
                                <Loader2 className="animate-spin h-4 w-4 ml-2 text-blue-600" />
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs text-gray-500 block">Stock</label>
                            <div className="flex items-center relative">
                              <Package className="h-4 w-4 text-blue-600 absolute left-2" />
                              <Input
                                type="number"
                                value={product.stock ?? 0}
                                min={0}
                                className={`pl-8 w-24 ${
                                  (product.stock === 0 || product.stock === null) 
                                    ? "bg-red-50 text-red-700 border-red-200" 
                                    : "text-blue-700"
                                }`}
                                onChange={(e) => {
                                  const newStock = Number(e.target.value);
                                  setProducts(products.map(p => 
                                    p.id === product.id ? { ...p, stock: newStock } : p
                                  ));
                                }}
                                onBlur={(e) => handleStockChange(product.id, Number(e.target.value))}
                              />
                              {updatingProduct === product.id && (
                                <Loader2 className="animate-spin h-4 w-4 ml-2 text-blue-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-gray-500">
          <p>Este es un enlace seguro para la gestión del inventario.</p>
          <p>© {new Date().getFullYear()} - Gestor de Inventario FerryConnect</p>
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;
