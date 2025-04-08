import { useState } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CompanySettings, insertCompanySettingsSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Building2, Phone, AtSign, Globe, FileText, Save } from "lucide-react";
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
import { Loader2, Shield } from "lucide-react";

export default function AdminPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("company");
  
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
    },
  });
  
  // Set form values when settings are loaded
  useState(() => {
    if (settings && !form.formState.isDirty) {
      form.reset(settings);
    }
  });
  
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
          <TabsTrigger value="backup" disabled>Respaldos</TabsTrigger>
          <TabsTrigger value="system" disabled>Sistema</TabsTrigger>
        </TabsList>
        
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
                              <Input {...field} className="rounded-l-none" />
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
                          <FormLabel>URL del Logo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." />
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
                          <Input {...field} />
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
                              <Input {...field} className="rounded-l-none" />
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
                              <Input {...field} type="email" className="rounded-l-none" />
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
                              <Input {...field} className="rounded-l-none" />
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
                              <Input {...field} className="rounded-l-none" />
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
        
        <TabsContent value="backup">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <h3 className="text-lg font-medium text-muted-foreground">
              Módulo en desarrollo
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta funcionalidad estará disponible próximamente
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="system">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <h3 className="text-lg font-medium text-muted-foreground">
              Módulo en desarrollo
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta funcionalidad estará disponible próximamente
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
