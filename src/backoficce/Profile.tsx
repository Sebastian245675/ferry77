import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Camera,
  Save,
  Star,
  Award,
  Calendar,
  ShieldCheck,
  Building2,
  Edit,
  Plus,
  Trash2,
  Tag
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

// MOCK de datos de empresa
const company = {
  name: "Mi Empresa S.A.",
  email: "empresa@email.com",
  phone: "+34 123 456 789",
  address: "Calle Falsa 123, Madrid",
  website: "https://miempresa.com",
  description: "Empresa dedicada a la carpintería y construcción.",
  category: "carpinteria",
  profileImage: "",
  isVerified: true,
  rating: 4.7,
  completedJobs: 32,
  createdAt: "2021-01-01T00:00:00.000Z"
};

// Interfaz para los productos de la lista de venta
interface ProductItem {
  id?: string; // ID local para gestionar la lista en la UI
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
}

// Interfaz para el documento de listado de productos por empresa
interface CompanyProducts {
  companyId: string;
  products: ProductItem[];
  updatedAt: Date;
}

const Profile = () => {
  // Elimina el uso de useCompanyAuth
  // const { company, updateProfile } = useCompanyAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    category: "",
    location: "",
    description: "",
    email: "",
    phone: "",
    nick: ""
  });

  // Estados para la lista de productos
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [newProduct, setNewProduct] = useState<ProductItem>({
    name: "",
    description: "",
    price: 0,
    unit: "unidad",
    category: "producto"
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Estado para las estadísticas
  const [stats, setStats] = useState({
    completedJobs: 0,
    rating: 0,
    clients: 0,
    years: 0
  });

  // Cargar productos de la empresa
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        // En una implementación real, usaríamos el ID de la empresa autenticada
        const companyId = "empresa123"; // Ejemplo, debe ser dinámico con la empresa real
        const productDoc = doc(db, "listados", companyId);
        const docSnapshot = await getDoc(productDoc);
        
        if (docSnapshot.exists()) {
          const companyData = docSnapshot.data() as CompanyProducts;
          const productsWithIds = companyData.products.map((product, index) => ({
            ...product,
            id: `${index}` // Asignamos un ID local para gestionar la interfaz
          }));
          setProducts(productsWithIds);
        } else {
          // Si no existe el documento para esta empresa, inicializamos con array vacío
          setProducts([]);
        }
      } catch (error) {
        console.error("Error al cargar productos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los productos",
          variant: "destructive"
        });
      } finally {
        setIsLoadingProducts(false);
      }
    };
    
    loadProducts();
  }, []);

  // Efecto para cargar información de contacto real del usuario
  useEffect(() => {
    const fetchUserContact = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = doc(db, "users", user.uid);
        const docSnapshot = await getDoc(userDoc);
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setFormData({
            companyName: data.companyName || "",
            category: data.category || "",
            location: data.location || "",
            description: data.description || "",
            email: data.email || "",
            phone: data.phone || "",
            nick: data.nick || ""
          });
        }
      } catch (err) {
        console.error("Error cargando datos de contacto del usuario:", err);
      }
    };
    fetchUserContact();
  }, []);

  // Efecto para cargar estadísticas de la empresa
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const companyId = user.uid;
        // 1. Obtener doc empresa
        const companyDoc = doc(db, "empresas", companyId);
        const docSnapshot = await getDoc(companyDoc);
        let completedJobs = 0;
        let rating = 0;
        let clients = 0;
        let years = 0;
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          rating = data.rating || 0;
          clients = data.clients || 0;
          years = data.createdAt ? new Date().getFullYear() - new Date(data.createdAt).getFullYear() : 0;
        }
        // 2. Contar cotizaciones entregadas (deliveryStatus: 'entregado')
        const quotesQuery = query(
          collection(db, "cotizaciones"),
          where("companyId", "==", companyId),
          where("deliveryStatus", "==", "entregado")
        );
        const quotesSnapshot = await getDocs(quotesQuery);
        completedJobs = quotesSnapshot.size;

        // Si quieres mostrar más avanzado: contar por mes, etc.
        // Ejemplo: trabajos completados por mes
        // const jobsByMonth: Record<string, number> = {};
        // quotesSnapshot.forEach(doc => {
        //   const data = doc.data();
        //   const date = data.deliveredAt ? new Date(data.deliveredAt) : null;
        //   if (date) {
        //     const key = `${date.getFullYear()}-${date.getMonth()+1}`;
        //     jobsByMonth[key] = (jobsByMonth[key] || 0) + 1;
        //   }
        // });

        setStats({
          completedJobs,
          rating,
          clients,
          years
        });
      } catch (err) {
        console.error("Error cargando estadísticas de empresa:", err);
      }
    };
    fetchStats();
  }, []);

  // Función para agregar un nuevo producto
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      toast({
        title: "Error",
        description: "El nombre y precio son obligatorios",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const companyId = "empresa123"; // Ejemplo, debe ser dinámico con la empresa real
      const productDoc = doc(db, "listados", companyId);
      const docSnapshot = await getDoc(productDoc);
      
      // Generamos un ID temporal para la UI
      const tempId = Date.now().toString();
      const productToAdd = { ...newProduct, id: tempId };
      
      if (docSnapshot.exists()) {
        // Si el documento ya existe, actualizamos el array de productos
        const companyData = docSnapshot.data() as CompanyProducts;
        const updatedProducts = [...(companyData.products || []), newProduct];
        
        await updateDoc(productDoc, {
          products: updatedProducts,
          updatedAt: new Date()
        });
      } else {
        // Si el documento no existe, lo creamos
        await setDoc(productDoc, {
          companyId,
          products: [newProduct],
          updatedAt: new Date(),
          createdAt: new Date()
        });
      }
      
      // Actualizamos el estado local
      setProducts([...products, productToAdd]);
      
      // Resetear formulario
      setNewProduct({
        name: "",
        description: "",
        price: 0,
        unit: "unidad",
        category: "producto"
      });
      
      setIsAddingProduct(false);
      
      toast({
        title: "Producto agregado",
        description: "El producto se ha añadido a tu lista de venta",
      });
    } catch (error) {
      console.error("Error al guardar producto:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el producto",
        variant: "destructive"
      });
    }
  };

  // Función para eliminar un producto
  const handleDeleteProduct = async (id?: string) => {
    if (!id) return;
    
    try {
      const companyId = "empresa123"; // Ejemplo, debe ser dinámico con la empresa real
      const productDoc = doc(db, "listados", companyId);
      const docSnapshot = await getDoc(productDoc);
      
      if (docSnapshot.exists()) {
        const companyData = docSnapshot.data() as CompanyProducts;
        
        // Encontramos el índice del producto a eliminar
        const productIndex = products.findIndex(product => product.id === id);
        
        if (productIndex !== -1) {
          // Creamos una copia de los productos actuales y eliminamos el producto
          const updatedProducts = [...companyData.products];
          updatedProducts.splice(productIndex, 1);
          
          // Actualizamos el documento con la lista actualizada
          await updateDoc(productDoc, {
            products: updatedProducts,
            updatedAt: new Date()
          });
          
          // Actualizamos el estado local
          setProducts(products.filter(product => product.id !== id));
          
          toast({
            title: "Producto eliminado",
            description: "El producto ha sido eliminado de tu lista",
          });
        }
      }
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Guardar los cambios en Firestore (colección users)
    const saveContact = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        const userDoc = doc(db, "users", user.uid);
        await setDoc(userDoc, {
          ...formData
        }, { merge: true }); // Solo actualiza los campos nuevos o modificados
        setIsEditing(false);
        toast({
          title: "Perfil actualizado",
          description: "Tu información ha sido actualizada exitosamente",
        });
      } catch (err) {
        console.error("Error guardando datos de contacto del usuario:", err);
        toast({
          title: "Error",
          description: "No se pudo actualizar la información",
          variant: "destructive"
        });
      }
    };
    saveContact();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      // Aquí deberías guardar la imagen en Firestore/Storage si lo deseas
      toast({
        title: "Imagen actualizada",
        description: "Tu foto de perfil ha sido actualizada",
      });
    }
  };

  const handleProductInputChange = (field: keyof ProductItem, value: string | number) => {
    setNewProduct(prev => ({ ...prev, [field]: value }));
  };

  const categoryLabels: Record<string, string> = {
    carpinteria: "Carpintería",
    electricidad: "Electricidad",
    construccion: "Construcción"
  };

  // Datos para el formulario de productos
  const productCategories = [
    { value: "producto", label: "Producto" },
    { value: "servicio", label: "Servicio" },
    { value: "material", label: "Material" }
  ];
  
  const productUnits = [
    { value: "unidad", label: "Unidad" },
    { value: "kg", label: "Kilogramo" },
    { value: "m2", label: "Metro cuadrado" },
    { value: "m", label: "Metro" },
    { value: "hora", label: "Hora" },
    { value: "servicio", label: "Servicio completo" }
  ];

  const certifications = [
    {
      name: "Certificación en Construcción Sostenible",
      issuer: "Instituto de Construcción Verde",
      date: "2023-06-15",
      valid: true
    },
    {
      name: "Licencia de Electricista Profesional",
      issuer: "Colegio Oficial de Electricistas",
      date: "2022-03-10",
      valid: true
    },
    {
      name: "Curso de Seguridad en el Trabajo",
      issuer: "Fundación Laboral de la Construcción",
      date: "2023-09-22",
      valid: true
    }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col items-center">
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 p-2 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 rounded-xl shadow-md p-4 sm:p-6 mb-2 border border-blue-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 drop-shadow-sm">Perfil de Empresa</h1>
            <p className="text-gray-600 text-sm sm:text-base">Gestiona la información de tu empresa</p>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
            className={`w-full sm:w-auto ${!isEditing ? "company-card text-white" : ""}`}
          >
            <Edit className="mr-2 h-4 w-4" />
            {isEditing ? "Cancelar" : "Editar Perfil"}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto bg-white/80 rounded-lg shadow-sm border border-blue-100">
            <TabsTrigger value="general" className="text-xs sm:text-sm p-2 sm:p-3">
              <span className="hidden sm:inline">Información General</span>
              <span className="sm:hidden">General</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="text-xs sm:text-sm p-2 sm:p-3">
              <span className="hidden sm:inline">Lista de Venta</span>
              <span className="sm:hidden">Productos</span>
            </TabsTrigger>
            {/* <TabsTrigger value="certifications" className="text-xs sm:text-sm p-2 sm:p-3">
              <span className="hidden sm:inline">Certificaciones</span>
              <span className="sm:hidden">Certs</span>
            </TabsTrigger> */}
            <TabsTrigger value="statistics" className="text-xs sm:text-sm p-2 sm:p-3">
              <span className="hidden sm:inline">Estadísticas</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 sm:space-y-6">
            {/* Profile Header Card */}
            <Card className="glass-effect">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                      <AvatarImage src={company?.profileImage} />
                      <AvatarFallback className="bg-primary text-white text-xl sm:text-2xl">
                        {company?.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <label className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                        <Camera className="h-4 w-4" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{company?.name}</h2>
                      <div className="flex items-center justify-center sm:justify-start space-x-2">
                        {company?.isVerified && (
                          <div className="flex items-center space-x-1">
                            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                            <Badge className="bg-green-100 text-green-800 text-xs">Verificada</Badge>
                          </div>
                        )}
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {categoryLabels[company?.category || '']}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{company?.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Award className="h-4 w-4 text-purple-500" />
                        <span>{company?.completedJobs} trabajos completados</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>
                          Desde {company?.createdAt ? new Date(company.createdAt).getFullYear() : '2020'}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-sm sm:text-base">{company?.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Información de Contacto</CardTitle>
                <CardDescription className="text-sm">
                  Mantén actualizada tu información de contacto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm">Nombre de la Empresa</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleInputChange("companyName", e.target.value)}
                        disabled={!isEditing ? true : false}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm">Categoría</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleInputChange("category", e.target.value)}
                      disabled={!isEditing ? true : false}
                      className="pl-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        disabled={!isEditing ? true : false}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm">Teléfono</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        disabled={!isEditing ? true : false}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm">Ubicación</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        disabled={!isEditing ? true : false}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nick" className="text-sm">Nick</Label>
                    <Input
                      id="nick"
                      value={formData.nick}
                      onChange={(e) => handleInputChange("nick", e.target.value)}
                      disabled={!isEditing ? true : false}
                      className="pl-10 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm">Descripción de la Empresa</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    disabled={!isEditing ? true : false}
                    rows={4}
                    className="text-sm"
                  />
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="w-full sm:w-auto">
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} className="company-card text-white w-full sm:w-auto">
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4 sm:space-y-6">
            <Card className="glass-effect">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Lista de Venta</CardTitle>
                    <CardDescription className="text-sm">
                      Gestiona los productos y servicios que ofrece tu empresa
                    </CardDescription>
                  </div>
                  <Button 
                    className="company-card text-white w-full sm:w-auto"
                    onClick={() => setIsAddingProduct(!isAddingProduct)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isAddingProduct ? "Cancelar" : "Agregar Producto"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isAddingProduct && (
                  <Card className="mb-6 border-dashed border-2 p-4 bg-gradient-to-br from-blue-50 to-white shadow-lg">
                    <CardContent className="p-0 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="productName" className="text-sm font-medium">Nombre del Producto/Servicio*</Label>
                          <Input
                            id="productName"
                            value={newProduct.name}
                            onChange={(e) => handleProductInputChange('name', e.target.value)}
                            placeholder="Ej: Mesa de madera"
                            className="text-sm bg-white/80 border-blue-200 focus:border-blue-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="productPrice" className="text-sm font-medium">Precio*</Label>
                          <Input
                            id="productPrice"
                            type="number"
                            value={newProduct.price.toString()}
                            onChange={(e) => handleProductInputChange('price', Number(e.target.value))}
                            placeholder="0.00"
                            className="text-sm bg-white/80 border-blue-200 focus:border-blue-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="productCategory" className="text-sm font-medium">Categoría</Label>
                          <Select
                            value={newProduct.category}
                            onValueChange={(value) => handleProductInputChange('category', value)}
                          >
                            <SelectTrigger className="text-sm bg-white/80 border-blue-200 focus:border-blue-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {productCategories.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="productUnit" className="text-sm font-medium">Unidad</Label>
                          <Select
                            value={newProduct.unit}
                            onValueChange={(value) => handleProductInputChange('unit', value)}
                          >
                            <SelectTrigger className="text-sm bg-white/80 border-blue-200 focus:border-blue-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {productUnits.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="productDescription" className="text-sm font-medium">Descripción</Label>
                        <Textarea
                          id="productDescription"
                          value={newProduct.description}
                          onChange={(e) => handleProductInputChange('description', e.target.value)}
                          placeholder="Describe el producto o servicio..."
                          className="text-sm bg-white/80 border-blue-200 focus:border-blue-400"
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          onClick={handleAddProduct} 
                          className="company-card text-white shadow-md hover:scale-105 transition-transform"
                        >
                          Guardar Producto
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {isLoadingProducts ? (
                  <div className="py-10 text-center">
                    <p className="text-gray-500">Cargando productos...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="py-10 text-center border border-dashed rounded-lg bg-gradient-to-br from-blue-50 to-white">
                    <Tag className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">Aún no has agregado productos o servicios</p>
                    <p className="text-gray-400 text-sm">Haz clic en "Agregar Producto" para comenzar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg shadow-sm bg-white/80">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-gradient-to-r from-blue-100 to-blue-50">
                        <tr>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">#</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Producto/Servicio</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Categoría</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Precio</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-blue-50">
                        {products.map((product, index) => (
                          <tr key={product.id} className="hover:bg-blue-50 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap text-sm text-blue-500 font-semibold">{index + 1}</td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">{product.name}</div>
                              <div className="text-xs text-gray-500 line-clamp-2 max-w-xs">{product.description}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-sm">
                              <Badge variant="outline" className="text-xs capitalize bg-blue-100 text-blue-700 border-blue-200">
                                {product.category}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-blue-700">
                                ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-gray-500">por {product.unit}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-sm">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                                aria-label="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Apartado de certificaciones eliminado */}

          <TabsContent value="statistics" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="glass-effect">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                    <Award className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completedJobs}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Trabajos Completados</p>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="p-3 bg-yellow-100 rounded-full w-fit mx-auto mb-3">
                    <Star className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.rating.toFixed(1)}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Calificación Promedio</p>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-3">
                    <User className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.clients}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Clientes Satisfechos</p>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-3">
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.years}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Años de Experiencia</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart Placeholder */}
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Rendimiento Mensual</CardTitle>
                <CardDescription className="text-sm">
                  Estadísticas de tus trabajos y calificaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="h-48 sm:h-64 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Gráfico de rendimiento - próximamente</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;