import { useState } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Technician, InsertTechnician, insertTechnicianSchema, User } from "@shared/schema";
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
import { Badge } from "@/components/ui/badge";

// Extended technician type including user data
interface TechnicianWithUser extends Technician {
  fullName?: string;
  email?: string;
}

export default function TechniciansPage() {
  const { toast } = useToast();
  const [technicianToEdit, setTechnicianToEdit] = useState<TechnicianWithUser | null>(null);
  const [technicianToDelete, setTechnicianToDelete] = useState<TechnicianWithUser | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianWithUser | null>(null);
  
  // Form for adding/editing technicians
  const form = useForm<z.infer<typeof insertTechnicianSchema>>({
    resolver: zodResolver(insertTechnicianSchema),
    defaultValues: {
      userId: 0,
      specialization: "",
      status: "available",
    },
  });
  
  // Reset form when opening for a new technician
  const handleAddTechnician = () => {
    setTechnicianToEdit(null);
    form.reset({
      userId: 0,
      specialization: "",
      status: "available",
    });
    setIsEditOpen(true);
  };
  
  // Set form values when editing a technician
  const handleEditTechnician = (technician: TechnicianWithUser) => {
    setTechnicianToEdit(technician);
    form.reset({
      userId: technician.userId,
      specialization: technician.specialization,
      status: technician.status,
    });
    setIsEditOpen(true);
  };
  
  // Fetch technicians
  const { data: technicians, isLoading } = useQuery<TechnicianWithUser[]>({
    queryKey: ["/api/technicians"],
  });
  
  // Fetch users for the dropdown
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Create technician mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertTechnician) => {
      const res = await apiRequest("POST", "/api/technicians", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      toast({
        title: "Técnico creado",
        description: "El técnico ha sido creado correctamente",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo crear el técnico: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update technician mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertTechnician }) => {
      const res = await apiRequest("PUT", `/api/technicians/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      toast({
        title: "Técnico actualizado",
        description: "El técnico ha sido actualizado correctamente",
      });
      setTechnicianToEdit(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar el técnico: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete technician mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/technicians/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/technicians"] });
      toast({
        title: "Técnico eliminado",
        description: "El técnico ha sido eliminado correctamente",
      });
      setTechnicianToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar el técnico: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: z.infer<typeof insertTechnicianSchema>) => {
    if (technicianToEdit) {
      updateMutation.mutate({ id: technicianToEdit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  // View technician details
  const handleViewTechnician = (technician: TechnicianWithUser) => {
    setSelectedTechnician(technician);
    setIsDetailsOpen(true);
  };
  
  // Get user name from user ID
  const getUserName = (userId: number) => {
    const user = users?.find(u => u.id === userId);
    return user?.fullName || "Usuario desconocido";
  };
  
  // Columns for technician table
  const columns = [
    {
      header: "Nombre",
      accessorKey: "fullName" as keyof TechnicianWithUser,
      cell: (row: TechnicianWithUser) => row.fullName || getUserName(row.userId),
    },
    {
      header: "Especialización",
      accessorKey: "specialization" as keyof TechnicianWithUser,
    },
    {
      header: "Estado",
      accessorKey: "status" as keyof TechnicianWithUser,
      cell: (row: TechnicianWithUser) => {
        const statusConfig = {
          available: { label: "Disponible", className: "bg-green-100 text-green-800" },
          in_service: { label: "En Servicio", className: "bg-blue-100 text-blue-800" },
          unavailable: { label: "No Disponible", className: "bg-red-100 text-red-800" },
        };
        
        const config = statusConfig[row.status as keyof typeof statusConfig] || 
          { label: row.status, className: "bg-gray-100 text-gray-800" };
          
        return (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      header: "Email",
      accessorKey: "email" as keyof TechnicianWithUser,
      cell: (row: TechnicianWithUser) => row.email || "N/A",
    },
    {
      header: "Acciones",
      accessorKey: "id" as keyof TechnicianWithUser,
      cell: (row: TechnicianWithUser) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleViewTechnician(row);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEditTechnician(row);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setTechnicianToDelete(row);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Técnicos">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Gestión de Técnicos</h2>
          <p className="text-muted-foreground">
            Administra el equipo de técnicos y su disponibilidad
          </p>
        </div>
        
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddTechnician}>
              <Plus className="mr-2 h-4 w-4" /> Agregar Técnico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {technicianToEdit ? "Editar Técnico" : "Agregar Técnico"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <Select
                        onValueChange={value => field.onChange(parseInt(value))}
                        defaultValue={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar usuario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.fullName} ({user.username})
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
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialización</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                          <SelectItem value="available">Disponible</SelectItem>
                          <SelectItem value="in_service">En Servicio</SelectItem>
                          <SelectItem value="unavailable">No Disponible</SelectItem>
                        </SelectContent>
                      </Select>
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
                    {technicianToEdit ? "Actualizar" : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <DataTable data={technicians || []} columns={columns} loading={isLoading} />
      
      {/* Technician Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Técnico</DialogTitle>
          </DialogHeader>
          {selectedTechnician && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                  <p className="text-lg font-semibold">
                    {selectedTechnician.fullName || getUserName(selectedTechnician.userId)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Especialización</p>
                  <p className="text-lg font-semibold">{selectedTechnician.specialization}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{selectedTechnician.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado</p>
                  <Badge 
                    variant="outline"
                    className={
                      selectedTechnician.status === "available" 
                        ? "bg-green-100 text-green-800" 
                        : selectedTechnician.status === "in_service" 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-red-100 text-red-800"
                    }
                  >
                    {selectedTechnician.status === "available" 
                      ? "Disponible" 
                      : selectedTechnician.status === "in_service" 
                        ? "En Servicio" 
                        : "No Disponible"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Registro</p>
                  <p>{new Date(selectedTechnician.createdAt).toLocaleDateString()}</p>
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
      <AlertDialog open={!!technicianToDelete} onOpenChange={(open) => !open && setTechnicianToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al técnico{" "}
              <span className="font-semibold">
                {technicianToDelete?.fullName || getUserName(technicianToDelete?.userId || 0)}
              </span>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => technicianToDelete && deleteMutation.mutate(technicianToDelete.id)}
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
