import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, CheckCircle, Clock, Users, ClipboardList, DollarSign, BarChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";

// Types for dashboard data
interface DashboardStats {
  activeOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalClients: number;
  completedPercentage: number;
  newClientsThisMonth: number;
  availableTechnicians: number;
  currentMonthRevenue?: {
    totalAmount: string;
    orderCount: number;
    averageOrderValue: string;
  };
}

interface ServiceOrder {
  id: number;
  orderNumber: string;
  clientName: string;
  description: string;
  status: string;
  technicianName: string;
}

interface TechnicianStatus {
  id: number;
  name: string;
  specialization: string;
  status: string;
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  
  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });
  
  // Fetch recent orders
  const { data: recentOrders, isLoading: isLoadingOrders } = useQuery<ServiceOrder[]>({
    queryKey: ["/api/dashboard/recent-orders"],
  });
  
  // Fetch technicians status
  const { data: technicians, isLoading: isLoadingTechnicians } = useQuery<TechnicianStatus[]>({
    queryKey: ["/api/dashboard/technicians-status"],
  });
  
  // Fetch current month revenue
  const { data: currentMonthRevenue, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ["/api/revenue/current"],
    enabled: true,
  });
  
  // Columns for recent orders table
  const ordersColumns = [
    {
      header: "ID",
      accessorKey: "orderNumber" as keyof ServiceOrder,
      cell: (row: ServiceOrder) => <span className="font-medium">{row.orderNumber}</span>,
    },
    {
      header: "Cliente",
      accessorKey: "clientName" as keyof ServiceOrder,
    },
    {
      header: "Tipo",
      accessorKey: "description" as keyof ServiceOrder,
    },
    {
      header: "Estado",
      accessorKey: "status" as keyof ServiceOrder,
      cell: (row: ServiceOrder) => {
        const statusConfig = {
          pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
          in_progress: { label: "En Proceso", className: "bg-blue-100 text-blue-800" },
          completed: { label: "Completado", className: "bg-green-100 text-green-800" },
          cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800" },
        };
        
        const config = statusConfig[row.status as keyof typeof statusConfig] || 
          { label: row.status, className: "bg-gray-100 text-gray-800" };
          
        return (
          <Badge variant="outline" className={cn("font-semibold", config.className)}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      header: "Técnico",
      accessorKey: "technicianName" as keyof ServiceOrder,
    },
  ];
  
  // Handle click on a row to navigate to order details
  const handleOrderClick = (order: ServiceOrder) => {
    setLocation(`/orders/${order.id}`);
  };

  return (
    <DashboardLayout title="Panel">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoadingStats ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="ml-4 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatsCard
              title="Órdenes Activas"
              value={stats?.activeOrders || 0}
              icon={ClipboardList}
              iconColor="text-primary"
              iconBgColor="bg-blue-100"
              description={`Completado: ${stats?.completedPercentage || 0}%`}
              trend={{
                value: "12%",
                positive: true,
              }}
              progress={{
                value: stats?.completedPercentage || 0,
                color: "bg-primary",
              }}
            />
            
            <StatsCard
              title="Servicios Completos"
              value={stats?.completedOrders || 0}
              icon={CheckCircle}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
              description="Este mes"
              trend={{
                value: "8%",
                positive: true,
              }}
              progress={{
                value: 85,
                color: "bg-green-600",
              }}
            />
            
            <StatsCard
              title="Pendientes"
              value={stats?.pendingOrders || 0}
              icon={Clock}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-100"
              description="Demora promedio: 2 días"
              trend={{
                value: "5%",
                positive: false,
              }}
              progress={{
                value: 30,
                color: "bg-amber-600",
              }}
            />
            
            <StatsCard
              title="Clientes Totales"
              value={stats?.totalClients || 0}
              icon={Users}
              iconColor="text-rose-600"
              iconBgColor="bg-rose-100"
              description={`Nuevos este mes: ${stats?.newClientsThisMonth || 0}`}
              trend={{
                value: "10%",
                positive: true,
              }}
              progress={{
                value: 75,
                color: "bg-rose-600",
              }}
            />
          </>
        )}
      </div>
      
      {/* Financial Stats */}
      <div className="mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Resumen Financiero del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRevenue ? (
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <Skeleton className="h-24 w-full md:w-1/3" />
                <Skeleton className="h-24 w-full md:w-1/3" />
                <Skeleton className="h-24 w-full md:w-1/3" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="p-3 rounded-full bg-blue-100 mb-3">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900">Ingresos Totales</h3>
                  <p className="text-3xl font-bold text-primary">
                    ${parseFloat((currentMonthRevenue as any)?.totalAmount || "0").toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500">Mes actual</p>
                </div>
                
                <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg border border-green-100">
                  <div className="p-3 rounded-full bg-green-100 mb-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-900">Órdenes Completadas</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {(currentMonthRevenue as any)?.orderCount || 0}
                  </p>
                  <p className="text-sm text-gray-500">Servicios facturados</p>
                </div>
                
                <div className="flex flex-col items-center justify-center p-6 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="p-3 rounded-full bg-amber-100 mb-3">
                    <BarChart className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-amber-900">Valor Promedio</h3>
                  <p className="text-3xl font-bold text-amber-600">
                    ${parseFloat((currentMonthRevenue as any)?.averageOrderValue || "0").toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500">Por orden de servicio</p>
                </div>
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                className="text-primary"
                onClick={() => setLocation('/finance')}
              >
                Ver historial financiero →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Orders and Technician Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Órdenes Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                <DataTable
                  data={recentOrders || []}
                  columns={ordersColumns}
                  searchable={false}
                  pagination={false}
                  onRowClick={handleOrderClick}
                />
                <div className="mt-4 text-right">
                  <Button
                    variant="ghost"
                    className="text-primary hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => setLocation('/orders')}
                  >
                    Ver todas las órdenes →
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Technician Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Estado de Técnicos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTechnicians ? (
              <div className="space-y-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="ml-3 space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {technicians?.map((tech) => (
                  <div key={tech.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        <span className="text-gray-700 font-medium">
                          {tech.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{tech.name}</p>
                        <p className="text-xs text-gray-500">{tech.specialization}</p>
                      </div>
                    </div>
                    <div>
                      {tech.status === "available" ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Disponible
                        </Badge>
                      ) : tech.status === "in_service" ? (
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          En Servicio
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          No Disponible
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 text-right">
              <Button
                variant="ghost"
                className="text-primary hover:text-blue-700 hover:bg-blue-50"
                onClick={() => setLocation('/technicians')}
              >
                Gestionar técnicos →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
