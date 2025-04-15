import { useState } from "react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { DataTable } from "@/components/ui/data-table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { User, insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";

export default function UsersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Extended user schema with confirm password
  const extendedUserSchema = z.object({
    username: z.string().min(1, "El nombre de usuario es requerido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(1, "La confirmación de contraseña es requerida"),
    fullName: z.string().min(1, "El nombre completo es requerido"),
    email: z.string().email("Correo electrónico inválido"),
    role: z.enum(["admin", "manager", "technician", "user"]).default("user")
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
  
  // Form for adding/editing users
  const form = useForm<z.infer<typeof extendedUserSchema>>({
    resolver: zodResolver(extendedUserSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      email: "",
      role: "user",
    },
  });
  
  // Reset form when opening for a new user
  const handleAddUser = () => {
    setUserToEdit(null);
    form.reset({
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      email: "",
      role: "user",
    });
  };
  
  // Set form values when editing a user
  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    form.reset({
      username: user.username,
      password: "",
      confirmPassword: "",
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    });
  };
  
  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof extendedUserSchema>) => {
      // Enviar todos los campos, incluyendo confirmPassword
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado correctamente",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo crear el usuario: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof extendedUserSchema> }) => {
      const { confirmPassword, ...userData } = data;
      
      // If password is empty, remove it from the request
      const dataToSend = userData.password
        ? userData
        : { ...userData, password: undefined };
      
      const res = await apiRequest("PUT", `/api/users/${id}`, dataToSend);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado correctamente",
      });
      setUserToEdit(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar el usuario: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      });
      setUserToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar el usuario: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: z.infer<typeof extendedUserSchema>) => {
    if (userToEdit) {
      updateMutation.mutate({ id: userToEdit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  // Get role display name
  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      admin: "Administrador",
      manager: "Gerente",
      technician: "Técnico",
      user: "Usuario"
    };
    return roles[role] || role;
  };
  
  // Get role badge color
  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-purple-100 text-purple-800";
      case "technician":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Columns for user table
  const columns = [
    {
      header: "Nombre",
      accessorKey: "fullName",
    },
    {
      header: "Usuario",
      accessorKey: "username",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Rol",
      accessorKey: "role",
      cell: (row: User) => (
        <Badge variant="outline" className={getRoleColor(row.role)}>
          {getRoleName(row.role)}
        </Badge>
      ),
    },
    {
      header: "Acciones",
      accessorKey: "id",
      cell: (row: User) => (
        <div className="flex items-center space-x-2">
          {currentUser?.id !== row.id && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditUser(row);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserToDelete(row);
                }}
                disabled={currentUser?.id === row.id}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </>
          )}
          {currentUser?.id === row.id && (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Tú
            </Badge>
          )}
        </div>
      ),
    },
  ];

  // Check if user is admin, redirect otherwise
  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout title="Usuarios">
        <div className="flex items-center justify-center h-96 flex-col space-y-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Acceso Restringido</h2>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a la gestión de usuarios.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Usuarios">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">
            Administra los usuarios y sus roles en el sistema
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button onClick={handleAddUser}>
              <Plus className="mr-2 h-4 w-4" /> Agregar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {userToEdit ? "Editar Usuario" : "Agregar Usuario"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de Usuario</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!!userToEdit} />
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
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
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
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="manager">Gerente</SelectItem>
                          <SelectItem value="technician">Técnico</SelectItem>
                          <SelectItem value="user">Usuario</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{userToEdit ? "Nueva Contraseña (dejar vacío para mantener)" : "Contraseña"}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Contraseña</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
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
                    {userToEdit ? "Actualizar" : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <DataTable data={users || []} columns={columns} loading={isLoading} />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al usuario{" "}
              <span className="font-semibold">{userToDelete?.fullName}</span> ({userToDelete?.username}).
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete.id)}
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
