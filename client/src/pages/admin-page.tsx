import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CompanySettings, insertCompanySettingsSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Phone, 
  AtSign, 
  Globe, 
  FileText, 
  Save, 
  HardDrive, 
  Download, 
  Upload as UploadIcon, 
  RefreshCw,
  Server,
  Activity,
  Database,
  Clock,
  Lock,
  Send,
  Key,
  Cog,
  Mail,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import { SingleImageUpload } from "@/components/ui/single-image-upload";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("company");
  const [testEmail, setTestEmail] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Fetch company settings
  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });
  
  // Form for company settings
  const form = useForm<CompanySettings>({
    resolver: zodResolver(insertCompanySettingsSchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      taxId: "",
      // Configuración SMTP
      smtpHost: "",
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: "",
      smtpPassword: "",
      smtpFromName: "",
      smtpFromEmail: "",
    },
  });
  
  // Set form values when settings are loaded
  useEffect(() => {
    if (settings && !form.formState.isDirty) {
      form.reset(settings);
    }
  }, [settings, form]);
  
  // Update company settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CompanySettings) => {
      const res = await apiRequest("PUT", "/api/company-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
      toast({
        title: "Configuración actualizada",
        description: "La configuración de la empresa ha sido actualizada correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar la configuración: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: CompanySettings) => {
    updateMutation.mutate(data);
  };
  
  // Test SMTP connection
  const testSmtpConnection = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Por favor, ingrese una dirección de correo para realizar la prueba",
        variant: "destructive",
      });
      return;
    }

    try {
      setTestingConnection(true);
      const res = await apiRequest("POST", "/api/email/test-connection", { testEmail });
      const result = await res.json();
      
      if (result.success) {
        toast({
          title: "Prueba exitosa",
          description: result.message,
        });
      } else {
        // Si hay un detalle específico del error, mostrarlo en la descripción
        const errorDescription = result.detail 
          ? `${result.message}. ${result.detail}` 
          : result.message || "No se pudo conectar al servidor SMTP";
          
        toast({
          title: "Error en la prueba",
          description: errorDescription,
          variant: "destructive",
        });
      }
    } catch (error) {
      let errorMessage = "Error desconocido al probar la conexión";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };
  
  // Check if user is admin, redirect otherwise
  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout title="Administración">
        <div className="flex items-center justify-center h-96 flex-col space-y-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Acceso Restringido</h2>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a la administración del sistema.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Administración">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Administración">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Configuración del Sistema</h2>
        <p className="text-muted-foreground">
          Administra la configuración general de la empresa y del sistema
        </p>
      </div>
      
      <Tabs defaultValue="company" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="backup">Respaldos</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de la Empresa */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
              <CardDescription>
                Configura los datos básicos que se mostrarán en reportes y facturas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Empresa</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                              </span>
                              <Input {...field} value={field.value || ""} className="rounded-l-none" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo de la Empresa</FormLabel>
                          <FormControl>
                            <SingleImageUpload 
                              value={field.value || ""} 
                              onChange={field.onChange}
                              label="Logo"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                                <Phone className="h-4 w-4" />
                              </span>
                              <Input {...field} value={field.value || ""} className="rounded-l-none" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                                <AtSign className="h-4 w-4" />
                              </span>
                              <Input {...field} value={field.value || ""} type="email" className="rounded-l-none" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sitio Web</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                                <Globe className="h-4 w-4" />
                              </span>
                              <Input {...field} value={field.value || ""} className="rounded-l-none" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NIF / CIF / RFC</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                                <FileText className="h-4 w-4" />
                              </span>
                              <Input {...field} value={field.value || ""} className="rounded-l-none" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {updateMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {!updateMutation.isPending && (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Guardar Cambios
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Respaldos */}
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Respaldos</CardTitle>
              <CardDescription>
                Realiza copias de seguridad de la base de datos y configura respaldos automáticos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <HardDrive className="h-4 w-4" />
                <AlertTitle>Información importante</AlertTitle>
                <AlertDescription>
                  Es recomendable realizar respaldos periódicos para proteger la información de su empresa.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Respaldo Manual</CardTitle>
                    <CardDescription>
                      Crea una copia de seguridad de la base de datos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Última copia: <span className="font-semibold">12/04/2025 14:30</span>
                      </div>
                      <Button className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Generar Respaldo Ahora
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Restaurar Copia</CardTitle>
                    <CardDescription>
                      Restaura el sistema desde una copia de seguridad
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="relative">
                        <Input 
                          type="file" 
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10" 
                          accept=".sql,.backup"
                        />
                        <Button variant="outline" className="w-full relative">
                          <UploadIcon className="h-4 w-4 mr-2" />
                          Seleccionar Archivo
                        </Button>
                      </div>
                      <Button className="w-full" variant="destructive" disabled>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Restaurar Sistema
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Programación de Respaldos</CardTitle>
                  <CardDescription>
                    Configura respaldos automáticos de la base de datos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="autoBackup" className="h-4 w-4" />
                      <label htmlFor="autoBackup" className="text-sm">Habilitar respaldos automáticos</label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="frequency" className="text-sm font-medium">Frecuencia</label>
                        <select 
                          id="frequency" 
                          className="mt-1 block w-full p-2 border border-input rounded-md bg-background"
                        >
                          <option value="daily">Diario</option>
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensual</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="time" className="text-sm font-medium">Hora</label>
                        <select 
                          id="time" 
                          className="mt-1 block w-full p-2 border border-input rounded-md bg-background"
                        >
                          <option value="00:00">00:00</option>
                          <option value="01:00">01:00</option>
                          <option value="02:00">02:00</option>
                          <option value="03:00">03:00</option>
                          <option value="04:00">04:00</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="retention" className="text-sm font-medium">Retención</label>
                        <select 
                          id="retention" 
                          className="mt-1 block w-full p-2 border border-input rounded-md bg-background"
                        >
                          <option value="7">7 días</option>
                          <option value="14">14 días</option>
                          <option value="30">30 días</option>
                          <option value="90">90 días</option>
                        </select>
                      </div>
                    </div>
                    
                    <Button className="mt-2">
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Configuración
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña del Sistema */}
        <TabsContent value="system">
          <div className="grid grid-cols-1 gap-6">
            {/* Configuración del Servidor SMTP */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Correo Electrónico (SMTP)</CardTitle>
                <CardDescription>
                  Configura los parámetros del servidor de correo para enviar notificaciones a clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertTitle>Importante</AlertTitle>
                      <AlertDescription>
                        La configuración correcta del servidor SMTP es necesaria para el envío de notificaciones por correo electrónico a los clientes.
                      </AlertDescription>
                    </Alert>
                    
                    <Alert variant="secondary" className="mb-4">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Configuración recomendada para Hostinger</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-5 text-sm mt-2">
                          <li>Servidor: <strong>smtp.hostinger.com</strong></li>
                          <li>Puerto: <strong>465</strong> (con SSL/TLS activado)</li>
                          <li>Usuario: Tu correo completo (ej. <strong>no-reply@sistemasrst.com</strong>)</li>
                          <li>Contraseña: La contraseña de tu correo en Hostinger</li>
                        </ul>
                        <p className="mt-2 text-sm">Si encuentras problemas de autenticación, verifica en el panel de Hostinger si necesitas generar una <strong>contraseña específica para aplicaciones</strong>.</p>
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="smtpHost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Servidor SMTP</FormLabel>
                            <FormControl>
                              <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                                  <Server className="h-4 w-4" />
                                </span>
                                <Input 
                                  {...field} 
                                  value={field.value || ""} 
                                  className="rounded-l-none" 
                                  placeholder="smtp.ejemplo.com"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="smtpPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Puerto SMTP</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || "465"} 
                                type="number" 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 465)}
                                placeholder="465"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="smtpSecure" 
                        className="h-4 w-4" 
                        checked={form.watch("smtpSecure")}
                        onChange={(e) => form.setValue("smtpSecure", e.target.checked)}
                      />
                      <label htmlFor="smtpSecure" className="text-sm">Usar conexión segura (SSL/TLS)</label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="smtpUser"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuario SMTP</FormLabel>
                            <FormControl>
                              <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                                  <AtSign className="h-4 w-4" />
                                </span>
                                <Input 
                                  {...field} 
                                  value={field.value || ""} 
                                  className="rounded-l-none" 
                                  placeholder="usuario@ejemplo.com"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="smtpPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña SMTP</FormLabel>
                            <FormControl>
                              <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                                  <Key className="h-4 w-4" />
                                </span>
                                <Input 
                                  {...field} 
                                  type="password" 
                                  value={field.value || ""} 
                                  className="rounded-l-none" 
                                  placeholder="••••••••"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="smtpFromName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del Remitente</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ""} 
                                placeholder="Sistemas RST"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="smtpFromEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email del Remitente</FormLabel>
                            <FormControl>
                              <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                                  <Send className="h-4 w-4" />
                                </span>
                                <Input 
                                  {...field} 
                                  value={field.value || ""} 
                                  type="email" 
                                  className="rounded-l-none" 
                                  placeholder="no-reply@sistemasrst.com"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Campo para Email de Prueba y Botón para Probar la Conexión */}
                    <div className="space-y-4 my-4 p-4 bg-muted/50 rounded-md border border-border">
                      <h3 className="text-sm font-medium">Probar Configuración SMTP</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        Después de guardar la configuración, puede probar la conexión enviando un correo de prueba.
                      </p>
                      
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-md mb-3 border border-amber-200 dark:border-amber-800">
                        <strong>Importante:</strong> Si tienes problemas con la autenticación, intenta lo siguiente:
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>Verifica que el usuario sea tu dirección completa de correo (por ejemplo: no-reply@sistemasrst.com)</li>
                          <li>Comprueba que la contraseña sea correcta. Para Hostinger, puedes intentar con la contraseña específica para aplicaciones si la has configurado</li>
                          <li>Asegúrate que el puerto es correcto (465 para SSL, 587 para TLS)</li>
                          <li>Si usas puerto 465, activa la opción SSL/TLS; si usas 587, desactívala</li>
                        </ul>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 w-full">
                        <Input
                          type="email"
                          placeholder="Correo para prueba"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={testSmtpConnection}
                          disabled={testingConnection || !form.watch("smtpHost")}
                          className="whitespace-nowrap"
                        >
                          {testingConnection ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Probando...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Probar Conexión
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      className="mt-4"
                    >
                      {updateMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {!updateMutation.isPending && (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Guardar Configuración de Correo
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            {/* Información del Sistema */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Sistema</CardTitle>
                <CardDescription>
                  Visualiza el estado del sistema y configura opciones avanzadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Server className="h-4 w-4" />
                  <AlertTitle>Información del servidor</AlertTitle>
                  <AlertDescription>
                    El sistema está funcionando correctamente en modo producción.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Estado del Servidor</CardTitle>
                      <CardDescription>
                        Monitorea el estado actual del sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-sm">Versión:</span>
                          <span className="text-sm font-medium">v1.0.0</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-sm">Estado:</span>
                          <span className="text-sm font-medium text-green-500">En línea</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-sm">Tiempo activo:</span>
                          <span className="text-sm font-medium">7 días, 3 horas</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Última actualización:</span>
                          <span className="text-sm font-medium">02/04/2025</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Base de Datos</CardTitle>
                      <CardDescription>
                        Información de la base de datos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-sm">Tipo:</span>
                          <span className="text-sm font-medium">PostgreSQL</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-sm">Estado:</span>
                          <span className="text-sm font-medium text-green-500">Conectado</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-sm">Tamaño:</span>
                          <span className="text-sm font-medium">12.4 MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Registros totales:</span>
                          <span className="text-sm font-medium">1,247</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Activity className="h-4 w-4 mr-2" />
                        Rendimiento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-24 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold">92%</p>
                          <p className="text-xs text-muted-foreground">Rendimiento</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Database className="h-4 w-4 mr-2" />
                        Uso de CPU
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-24 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold">15%</p>
                          <p className="text-xs text-muted-foreground">Promedio</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Respuesta
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-24 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold">217ms</p>
                          <p className="text-xs text-muted-foreground">Tiempo promedio</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Acciones del Sistema</CardTitle>
                    <CardDescription>
                      Acciones avanzadas para administradores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button variant="outline" className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Limpiar Caché
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Lock className="h-4 w-4 mr-2" />
                        Modo Mantenimiento
                      </Button>
                      <Button variant="outline" className="w-full" disabled>
                        <Server className="h-4 w-4 mr-2" />
                        Actualizar Sistema
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}