import { useState } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Equipment, InsertEquipment, insertEquipmentSchema, Client } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { z } from "zod";
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

export default function EquipmentPage() {
  const { toast } = useToast();
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  
  // Form for adding/editing equipment
  const form = useForm<z.infer<typeof insertEquipmentSchema>>({
    resolver: zodResolver(insertEquipmentSchema),
    defaultValues: {
      type: "desktop",
      brand: "",
      model: "",
      serialNumber: "",
      description: "",
      location: "",
      company: "",
    },
  });
  
  // Reset form when opening for a new equipment
  const handleAddEquipment = () => {
    setEquipmentToEdit(null);
    form.reset({
      type: "desktop",
      brand: "",
      model: "",
      serialNumber: "",
      description: "",
      location: "",
      company: "",
    });
  };
  
  // Set form values when editing equipment
  const handleEditEquipment = (equipment: Equipment) => {
    setEquipmentToEdit(equipment);
    form.reset({
      type: equipment.type,
      brand: equipment.brand,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      description: equipment.description || "",
      location: equipment.location || "",
      company: equipment.company || "",
    });
  };
  
  // Fetch equipment
  const { data: equipmentList, isLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });
  
  // Create equipment mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertEquipment) => {
      const res = await apiRequest("POST", "/api/equipment", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Equipo creado",
        description: "El equipo ha sido registrado correctamente",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo crear el equipo: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update equipment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertEquipment }) => {
      const res = await apiRequest("PUT", `/api/equipment/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Equipo actualizado",
        description: "El equipo ha sido actualizado correctamente",
      });
      setEquipmentToEdit(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar el equipo: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete equipment mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/equipment/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Equipo eliminado",
        description: "El equipo ha sido eliminado correctamente",
      });
      setEquipmentToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar el equipo: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: z.infer<typeof insertEquipmentSchema>) => {
    if (equipmentToEdit) {
      updateMutation.mutate({ id: equipmentToEdit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  // View equipment details
  const handleViewEquipment = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsDetailsOpen(true);
  };
  

  
  // Equipment type display
  const getEquipmentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      desktop: "PC Escritorio",
      laptop: "Portátil",
      server: "Servidor",
      printer: "Impresora",
      network: "Equipo de Red",
      other: "Otro"
    };
    return types[type] || type;
  };
  
  // Columns for equipment table
  const columns = [
    {
      header: "Empresa",
      accessorKey: "company",
      cell: (row: Equipment) => row.company || "-",
    },
    {
      header: "Ubicación",
      accessorKey: "location",
      cell: (row: Equipment) => row.location || "-",
    },
    {
      header: "Tipo",
      accessorKey: "type",
      cell: (row: Equipment) => (
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          {getEquipmentTypeLabel(row.type)}
        </Badge>
      ),
    },
    {
      header: "Marca",
      accessorKey: "brand",
    },
    {
      header: "Modelo",
      accessorKey: "model",
    },
    {
      header: "Nº de Serie",
      accessorKey: "serialNumber",
    },
    {
      header: "Acciones",
      accessorKey: "id",
      cell: (row: Equipment) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleViewEquipment(row);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEditEquipment(row);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEquipmentToDelete(row);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Equipos">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Gestión de Equipos</h2>
          <p className="text-muted-foreground">
            Administra los equipos de computación de tus clientes
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={handleAddEquipment}>
              <Plus className="mr-2 h-4 w-4" /> Agregar Equipo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {equipmentToEdit ? "Editar Equipo" : "Agregar Equipo"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nombre de la empresa (opcional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ubicación física del equipo (opcional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Equipo</FormLabel>
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
                          <SelectItem value="desktop">PC Escritorio</SelectItem>
                          <SelectItem value="laptop">Portátil</SelectItem>
                          <SelectItem value="server">Servidor</SelectItem>
                          <SelectItem value="printer">Impresora</SelectItem>
                          <SelectItem value="network">Equipo de Red</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Serie</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Características adicionales del equipo"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Cancelar
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {equipmentToEdit ? "Actualizar" : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <DataTable data={equipmentList || []} columns={columns} loading={isLoading} />
      
      {/* Equipment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Equipo</DialogTitle>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                  <p className="text-lg font-semibold">{selectedEquipment.company || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ubicación</p>
                  <p className="text-lg font-semibold">{selectedEquipment.location || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <p className="text-lg font-semibold">{getEquipmentTypeLabel(selectedEquipment.type)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Marca</p>
                  <p>{selectedEquipment.brand}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Modelo</p>
                  <p>{selectedEquipment.model}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Número de Serie</p>
                  <p>{selectedEquipment.serialNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Registro</p>
                  <p>{new Date(selectedEquipment.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                  <p className="mt-1">{selectedEquipment.description || "Sin descripción"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailsOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!equipmentToDelete} onOpenChange={(open) => !open && setEquipmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el equipo{" "}
              <span className="font-semibold">{equipmentToDelete?.brand} {equipmentToDelete?.model}</span>
              {equipmentToDelete?.company && <span> de la empresa <span className="font-semibold">{equipmentToDelete.company}</span></span>}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => equipmentToDelete && deleteMutation.mutate(equipmentToDelete.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
