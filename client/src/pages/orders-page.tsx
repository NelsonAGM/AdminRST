import { useState, type ChangeEvent } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  ServiceOrder, 
  InsertServiceOrder, 
  insertServiceOrderSchema, 
  Client, 
  Equipment, 
  Technician, 
  UpdateServiceOrder, 
  updateServiceOrderSchema,
  CompanySettings
} from "@shared/schema";
import { extendedServiceOrderSchema, ExtendedServiceOrder } from "@/schema/service-order";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Calendar, 
  Upload, 
  Printer,
  Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { SignaturePad } from "@/components/ui/signature-pad";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

export default function OrdersPage() {
  const { toast } = useToast();
  const [orderToEdit, setOrderToEdit] = useState<ServiceOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ServiceOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  
  // Form for adding/editing service orders
  const form = useForm<ExtendedServiceOrder>({
    resolver: zodResolver(extendedServiceOrderSchema),
    defaultValues: {
      clientId: undefined, // Cambio de 0 a undefined para evitar validación incorrecta
      equipmentId: undefined, // Cambio de 0 a undefined para evitar validación incorrecta
      technicianId: null,
      description: "",
      status: "pending",
      notes: "",
      materialsUsed: "",
      expectedDeliveryDate: null,
      clientSignature: "",
      photos: [],
      clientApproval: false,
      clientApprovalDate: null,
      cost: null,
    },
  });
  

  
  // Reset form when opening for a new order
  const handleAddOrder = () => {
    setOrderToEdit(null);
    setSelectedClientId(null);
    setIsFormOpen(true);
    form.reset({
      clientId: undefined,
      equipmentId: undefined,
      technicianId: null,
      description: "",
      status: "pending",
      notes: "",
      materialsUsed: "",
      expectedDeliveryDate: null,
      clientSignature: "",
      photos: [],
      clientApproval: false,
      clientApprovalDate: null,
      cost: null,
    });
  };
  
  // Set form values when editing an order
  const handleEditOrder = (order: ServiceOrder) => {
    setOrderToEdit(order);
    setIsFormOpen(true);
    setSelectedClientId(order.clientId);
    form.reset({
      clientId: order.clientId,
      equipmentId: order.equipmentId,
      technicianId: order.technicianId,
      description: order.description,
      status: order.status,
      notes: order.notes || "",
      materialsUsed: order.materialsUsed || "",
      expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null,
      clientSignature: order.clientSignature || "",
      photos: order.photos || [],
      clientApproval: order.clientApproval || false,
      clientApprovalDate: order.clientApprovalDate ? new Date(order.clientApprovalDate) : null,
      cost: order.cost || null,
    });
  };
  
  // View order details
  const handleViewOrder = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };
  
  // Fetch service orders
  const getOrdersQueryKey = () => {
    if (selectedStatus === "all") return ["/api/service-orders"];
    return ["/api/service-orders/status", selectedStatus];
  };
  
  const { data: orders, isLoading } = useQuery<ServiceOrder[]>({
    queryKey: getOrdersQueryKey(),
    queryFn: async ({ queryKey }) => {
      if (queryKey[1]) {
        const res = await fetch(`${queryKey[0]}/${queryKey[1]}`, {
          credentials: "include"
        });
        if (!res.ok) throw new Error("Error fetching orders by status");
        return res.json();
      } else {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include"
        });
        if (!res.ok) throw new Error("Error fetching all orders");
        return res.json();
      }
    }
  });
  
  // Fetch clients for the dropdown
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  // Fetch all equipment
  const { data: allEquipment } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });
  
  // Fetch technicians for the dropdown
  const { data: technicians } = useQuery<Technician[]>({
    queryKey: ["/api/technicians"],
  });
  
  // Fetch company settings for the header
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });
  
  // Get client equipment based on selected client
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  const filteredEquipment = selectedClientId 
    ? allEquipment?.filter(eq => eq.clientId === selectedClientId) 
    : [];
  
  // Create service order mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertServiceOrder) => {
      const res = await apiRequest("POST", "/api/service-orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-orders"] });
      toast({
        title: "Orden creada",
        description: "La orden de servicio ha sido creada correctamente",
      });
      form.reset();
      setIsFormOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo crear la orden: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update service order mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertServiceOrder }) => {
      const res = await apiRequest("PUT", `/api/service-orders/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-orders"] });
      toast({
        title: "Orden actualizada",
        description: "La orden de servicio ha sido actualizada correctamente",
      });
      setOrderToEdit(null);
      setIsFormOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar la orden: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateServiceOrder }) => {
      const res = await apiRequest("PUT", `/api/service-orders/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-orders/status"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la orden ha sido actualizado correctamente",
      });
      setIsDetailsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar el estado: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete service order mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/service-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-orders"] });
      toast({
        title: "Orden eliminada",
        description: "La orden de servicio ha sido eliminada correctamente",
      });
      setOrderToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar la orden: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission for creating/updating orders
  const onSubmit = (data: ExtendedServiceOrder) => {
    // Antes de enviar, verificamos que tenemos valores válidos para los campos requeridos
    if (!data.clientId || !data.equipmentId) {
      toast({
        title: "Error de validación",
        description: "Debe seleccionar un cliente y un equipo",
        variant: "destructive",
      });
      return;
    }
    
    // Convertimos el ExtendedServiceOrder a InsertServiceOrder para la mutación
    const insertData: InsertServiceOrder = {
      clientId: Number(data.clientId),
      equipmentId: Number(data.equipmentId),
      technicianId: data.technicianId ? Number(data.technicianId) : null,
      description: data.description,
      status: data.status,
      notes: data.notes,
      materialsUsed: data.materialsUsed,
      expectedDeliveryDate: data.expectedDeliveryDate,
      clientSignature: data.clientSignature,
      photos: data.photos,
      clientApproval: data.clientApproval,
      clientApprovalDate: data.clientApprovalDate,
      cost: data.cost,
    };
    
    if (orderToEdit) {
      updateMutation.mutate({ id: orderToEdit.id, data: insertData });
    } else {
      createMutation.mutate(insertData);
    }
  };
  

  
  // Get client name from client ID
  const getClientName = (clientId: number) => {
    const client = clients?.find(c => c.id === clientId);
    return client?.name || "Cliente desconocido";
  };
  
  // Get equipment name from equipment ID
  const getEquipmentName = (equipmentId: number) => {
    const equipment = allEquipment?.find(e => e.id === equipmentId);
    return equipment ? `${equipment.brand} ${equipment.model}` : "Equipo desconocido";
  };
  
  // Get technician name from technician ID
  const getTechnicianName = (technicianId: number | null) => {
    if (!technicianId) return "Sin asignar";
    const tech = technicians?.find(t => t.id === technicianId);
    return tech?.specialization || "Técnico desconocido";
  };
  
  // Get status display
  const getStatusDisplay = (status: string) => {
    const statusMap = {
      pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
      in_progress: { label: "En Proceso", className: "bg-blue-100 text-blue-800" },
      completed: { label: "Completado", className: "bg-green-100 text-green-800" },
      cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800" },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, className: "bg-gray-100 text-gray-800" };
  };
  
  // Handle client selection to filter equipment
  const handleClientChange = (clientId: number) => {
    setSelectedClientId(clientId);
    form.setValue("clientId", clientId);
    // Realizamos el reseteo usando form.resetField para limpiar el valor del equipmentId
    form.resetField("equipmentId");
  };
  
  // Columns for service order table
  const columns = [
    {
      header: "Nº de Orden",
      accessorKey: "orderNumber" as keyof ServiceOrder,
      cell: (row: ServiceOrder) => <span className="font-medium">{row.orderNumber}</span>,
    },
    {
      header: "Cliente",
      accessorKey: "clientId" as keyof ServiceOrder,
      cell: (row: ServiceOrder) => getClientName(row.clientId),
    },
    {
      header: "Equipo",
      accessorKey: "equipmentId" as keyof ServiceOrder,
      cell: (row: ServiceOrder) => getEquipmentName(row.equipmentId),
    },
    {
      header: "Descripción",
      accessorKey: "description" as keyof ServiceOrder,
      cell: (row: ServiceOrder) => (
        <div className="max-w-xs truncate" title={row.description}>
          {row.description}
        </div>
      ),
    },
    {
      header: "Estado",
      accessorKey: "status" as keyof ServiceOrder,
      cell: (row: ServiceOrder) => {
        const status = getStatusDisplay(row.status);
        return (
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        );
      },
    },
    {
      header: "Técnico",
      accessorKey: "technicianId" as keyof ServiceOrder,
      cell: (row: ServiceOrder) => getTechnicianName(row.technicianId),
    },
    {
      header: "Costo",
      accessorKey: "cost" as keyof ServiceOrder,
      cell: (row: ServiceOrder) => row.cost ? `$${row.cost.toLocaleString()}` : "N/A",
    },
    {
      header: "Acciones",
      accessorKey: "id" as keyof ServiceOrder,
      cell: (row: ServiceOrder) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleViewOrder(row);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEditOrder(row);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setOrderToDelete(row);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Órdenes de Servicio">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Gestión de Órdenes de Servicio</h2>
          <p className="text-muted-foreground">
            Administra las solicitudes de servicio técnico
          </p>
        </div>
        
        <Button onClick={handleAddOrder}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Orden
        </Button>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {orderToEdit ? "Editar Orden de Servicio" : "Nueva Orden de Servicio"}
              </DialogTitle>
              <DialogDescription>
                Complete el formulario para {orderToEdit ? "actualizar" : "crear"} una orden de servicio.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <Select
                          onValueChange={(value) => handleClientChange(parseInt(value))}
                          defaultValue={field.value ? field.value.toString() : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map(client => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="equipmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipo</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value ? field.value.toString() : undefined}
                          disabled={!selectedClientId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedClientId ? "Seleccionar equipo" : "Seleccione un cliente primero"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredEquipment?.length === 0 ? (
                              <SelectItem value="0" disabled>
                                No hay equipos para este cliente
                              </SelectItem>
                            ) : (
                              filteredEquipment?.map(equipment => (
                                <SelectItem key={equipment.id} value={equipment.id.toString()}>
                                  {equipment.brand} {equipment.model} ({equipment.type})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción del Servicio</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describa el problema o servicio requerido"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="technicianId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Técnico Asignado</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                          defaultValue={field.value ? field.value.toString() : "null"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="null">Sin asignar</SelectItem>
                            {technicians?.map(tech => (
                              <SelectItem key={tech.id} value={tech.id.toString()}>
                                {tech.specialization}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="in_progress">En Proceso</SelectItem>
                            <SelectItem value="completed">Completado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Notas adicionales sobre la orden"
                          rows={3}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="materialsUsed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Materiales Utilizados</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Lista de materiales y repuestos utilizados"
                          rows={3}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo del Servicio</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="Monto en pesos"
                          value={field.value || ""}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                        />
                      </FormControl>
                      <FormDescription>
                        Ingrese el costo total del servicio sin usar puntos ni comas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expectedDeliveryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Estimada de Entrega</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date: Date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="photos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fotografías</FormLabel>
                      <FormControl>
                        <ImageUpload 
                          value={field.value || []} 
                          onChange={field.onChange}
                          maxImages={5}
                        />
                      </FormControl>
                      <FormDescription>
                        Sube hasta 5 imágenes del equipo o problema
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clientSignature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firma del Cliente</FormLabel>
                      <FormControl>
                        <SignaturePad 
                          value={field.value || ""} 
                          onChange={field.onChange}
                          width={350}
                          height={150}
                        />
                      </FormControl>
                      <FormDescription>
                        Solicite al cliente que firme para aprobar el servicio
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit">
                    {orderToEdit ? "Actualizar" : "Crear"} Orden
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Filter by status */}
      <div className="mb-6">
        <Tabs 
          defaultValue="all" 
          value={selectedStatus}
          onValueChange={setSelectedStatus} 
          className="w-full"
        >
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="in_progress">En Proceso</TabsTrigger>
            <TabsTrigger value="completed">Completadas</TabsTrigger>
            <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <DataTable 
        columns={columns} 
        data={orders || []} 
        loading={isLoading}
        searchColumn="orderNumber"
        searchPlaceholder="Buscar por número de orden..."
      />
      
      {/* Order details dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto DialogContent">
          <DialogHeader className="flex justify-between items-center">
            <DialogTitle className="sr-only">Detalles de Orden</DialogTitle>
            <DialogDescription className="sr-only">Información de la orden de servicio</DialogDescription>
            <div></div> {/* Elemento vacío para mantener justify-between */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.print()}
                className="print:hidden"
              >
                <Printer className="h-4 w-4 mr-2" /> Imprimir
              </Button>
            </div>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-2">
              {/* Encabezado con datos de la empresa */}
              <div className="flex justify-between items-center border-b pb-2 print:flex">
                <div className="flex items-center gap-2 max-w-[60%]">
                  {companySettings?.logoUrl && (
                    <div className="w-12 h-12 flex-shrink-0">
                      <img 
                        src={companySettings.logoUrl} 
                        alt={companySettings.name} 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-shrink-1 min-w-0">
                    <h2 className="text-lg font-bold text-blue-900 truncate">{companySettings?.name || "Sistemas RST"}</h2>
                    <p className="text-xs truncate">{companySettings?.address || ""}</p>
                    <p className="text-xs truncate">Tel: {companySettings?.phone || ""}</p>
                    <p className="text-xs truncate">Email: {companySettings?.email || ""}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <h3 className="font-bold text-base">ORDEN DE SERVICIO</h3>
                  <p className="text-lg font-bold text-blue-900">#{selectedOrder.orderNumber}</p>
                  <p className="text-xs">Fecha: {format(new Date(selectedOrder.requestDate), "PPP", { locale: es })}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Cliente</h3>
                  <p className="text-sm">{getClientName(selectedOrder.clientId)}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Equipo</h3>
                  <p className="text-sm">{getEquipmentName(selectedOrder.equipmentId)}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Estado</h3>
                  <Badge variant="outline" className={getStatusDisplay(selectedOrder.status).className + " text-xs"}>
                    {getStatusDisplay(selectedOrder.status).label}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Técnico</h3>
                  <p className="text-sm">{getTechnicianName(selectedOrder.technicianId)}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Fecha de Solicitud</h3>
                  <p className="text-sm">{format(new Date(selectedOrder.requestDate), "PPP", { locale: es })}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Fecha Estimada de Entrega</h3>
                  <p className="text-sm">
                    {selectedOrder.expectedDeliveryDate
                      ? format(new Date(selectedOrder.expectedDeliveryDate), "PPP", { locale: es })
                      : "No especificada"}
                  </p>
                </div>
                <div className="col-span-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Descripción</h3>
                  <p className="text-sm">{selectedOrder.description}</p>
                </div>
                <div className="col-span-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Notas</h3>
                  <p className="text-sm">{selectedOrder.notes || "Sin notas"}</p>
                </div>
                <div className="col-span-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Materiales Utilizados</h3>
                  <p className="text-sm whitespace-pre-line">{selectedOrder.materialsUsed || "Sin materiales registrados"}</p>
                </div>

                <div className="col-span-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Costo del Servicio</h3>
                  <p className="text-sm font-semibold">
                    {selectedOrder.cost ? `$${selectedOrder.cost.toLocaleString()}` : "No especificado"}
                  </p>
                </div>
                
                {selectedOrder.photos && selectedOrder.photos.length > 0 && (
                  <div className="col-span-2">
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">Fotografías</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {selectedOrder.photos.map((photo, index) => (
                        <div key={index} className="border rounded-md overflow-hidden h-14">
                          <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  {selectedOrder.clientSignature && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2">Firma del Cliente</h3>
                      <div className="border rounded-md p-2 bg-white max-w-xs h-20">
                        <img src={selectedOrder.clientSignature} alt="Firma del cliente" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2 bg-blue-900 text-white p-1">TÉRMINOS Y CONDICIONES</h3>
                    <div className="text-xs">
                      <p>1. La presente cotización tiene una vigencia de 7 días naturales.</p>
                      <p>2. Para importes mayores a $5,000.00 (cinco mil pesos M.N), se requiere el 50% de anticipo.</p>
                      <p>3. El pago se debe de realizar en una sola exhibición.</p>
                      <p className="font-semibold mt-1">CLABE Interbancaria 002133701510128581</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="print:hidden border-t pt-4">
                <div className="flex justify-end space-x-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cerrar</Button>
                  </DialogClose>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la orden de servicio #{orderToDelete?.orderNumber}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => orderToDelete && deleteMutation.mutate(orderToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}