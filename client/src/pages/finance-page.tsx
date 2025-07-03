import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Calendar, DollarSign, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface MonthlyRevenue {
  id: number;
  year: number;
  month: number;
  totalAmount: string;
  orderCount: number;
  averageOrderValue: string;
  createdAt: string;
  updatedAt: string;
}

// Función para convertir un número de mes a nombre
const getMonthName = (month: number): string => {
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return monthNames[month - 1] || "";
};

export default function FinancePage() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Obtener los datos de ingresos actuales
  const { data: currentMonthData, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ["/api/revenue/current"],
  });
  
  // Obtener el historial de ingresos de todo el año
  const { data: yearlyData, isLoading: isLoadingYearly } = useQuery<MonthlyRevenue[]>({
    queryKey: ["/api/revenue/year", selectedYear],
  });
  
  // Obtener el historial de ingresos (últimos 12 meses)
  const { data: historyData, isLoading: isLoadingHistory } = useQuery<MonthlyRevenue[]>({
    queryKey: ["/api/revenue/history"],
  });
  
  // Calcular ingresos del mes actual (forzar un recálculo)
  const calculateCurrentRevenue = async () => {
    try {
      const response = await fetch('/api/revenue/current', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Error al calcular ingresos');
      }
      
      toast({
        title: "Cálculo completado",
        description: "Los ingresos del mes actual han sido calculados correctamente.",
        variant: "default",
      });
      
      // Actualizar las consultas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/revenue/current'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/revenue/history'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/revenue/year', selectedYear] }),
      ]);
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudieron calcular los ingresos. Intente nuevamente.",
        variant: "destructive",
      });
    }
  };
  
  // Preparar datos para la gráfica de barras
  const chartData = yearlyData ? yearlyData.map(item => ({
    month: getMonthName(item.month),
    ingresos: parseFloat(item.totalAmount),
    ordenes: item.orderCount,
    promedio: parseFloat(item.averageOrderValue),
    monthNumber: item.month,
  })).sort((a, b) => a.monthNumber - b.monthNumber) : [];
  
  // Años disponibles para filtrar (desde 2020 hasta el actual)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

  return (
    <DashboardLayout title="Finanzas">
      <div className="space-y-6">
        {/* Resumen del mes actual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Resumen del Mes Actual</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCurrent ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Ingresos Totales</h3>
                      <div className="text-2xl font-bold text-blue-600">
                        ${parseFloat((currentMonthData as any)?.totalAmount || "0").toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <Calendar className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Órdenes Completadas</h3>
                      <div className="text-2xl font-bold text-green-600">
                        {(currentMonthData as any)?.orderCount || 0}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                      <TrendingUp className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Valor Promedio</h3>
                      <div className="text-2xl font-bold text-amber-600">
                        ${parseFloat((currentMonthData as any)?.averageOrderValue || "0").toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={calculateCurrentRevenue} 
                className="bg-primary hover:bg-primary/90"
              >
                Actualizar Cálculos
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Gráfico de ingresos mensuales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl">Ingresos Mensuales {selectedYear}</CardTitle>
            <div className="flex space-x-2">
              {availableYears.map(year => (
                <Button
                  key={year}
                  variant={selectedYear === year ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingYearly ? (
              <div className="w-full aspect-[3/2] min-h-[400px]">
                <Skeleton className="h-full w-full" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="w-full aspect-[3/2] min-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`$${parseFloat(value as string).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ingresos']}
                    />
                    <Legend />
                    <Bar 
                      dataKey="ingresos" 
                      name="Ingresos Totales" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]}
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-center p-6">
                <BarChart className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Sin datos disponibles</h3>
                <p className="text-gray-500 max-w-md">
                  No hay datos de ingresos para mostrar en {selectedYear}. Complete órdenes de servicio para generar información financiera.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Historial de ingresos (tabla) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Historial de Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : historyData && historyData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="p-3 font-medium text-gray-500 text-sm tracking-wider">Período</th>
                      <th className="p-3 font-medium text-gray-500 text-sm tracking-wider">Órdenes</th>
                      <th className="p-3 font-medium text-gray-500 text-sm tracking-wider">Ingresos Totales</th>
                      <th className="p-3 font-medium text-gray-500 text-sm tracking-wider">Valor Promedio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {historyData.map((item) => (
                      <tr key={`${item.year}-${item.month}`} className="hover:bg-gray-50">
                        <td className="p-3 text-sm text-gray-700">
                          {getMonthName(item.month)} {item.year}
                        </td>
                        <td className="p-3 text-sm text-gray-700">
                          {item.orderCount}
                        </td>
                        <td className="p-3 text-sm text-gray-700 font-medium">
                          ${parseFloat(item.totalAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-sm text-gray-700">
                          ${parseFloat(item.averageOrderValue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-6">
                <p className="text-gray-500">No hay datos de historial disponibles.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}