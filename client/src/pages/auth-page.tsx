import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { Loader2, Laptop } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CompanySettings } from "@shared/schema";

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation, loginForm, registerForm } = useAuth();
  const [isLoginForm, setIsLoginForm] = useState(true);
  const [, setLocation] = useLocation();
  
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const toggleForm = () => {
    setIsLoginForm(!isLoginForm);
  };

  const onLogin = (data: any) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        setLocation("/");
      },
    });
  };

  const onRegister = (data: any) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        setLocation("/");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <h1 className="text-primary text-3xl font-medium mb-2 flex items-center justify-center">
              <Laptop className="h-8 w-8 mr-2 text-secondary" />
              {companySettings?.name || "Sistemas RST"}
            </h1>
            <p className="text-gray-600">Sistema de Gestión de Servicios</p>
          </div>

          {/* Login Form */}
          {isLoginForm ? (
            <div>
              <h2 className="text-2xl font-medium mb-6 text-center">Iniciar Sesión</h2>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de Usuario</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ingresa tu nombre de usuario" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <a href="#" className="text-sm text-primary hover:text-secondary">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Ingresar
                  </Button>
                </form>
              </Form>
              <div className="text-center mt-6">
                <p className="text-sm text-gray-600">
                  ¿No tienes cuenta?{" "}
                  <Button
                    variant="link"
                    className="text-primary hover:text-secondary p-0"
                    onClick={toggleForm}
                  >
                    Registrarme
                  </Button>
                </p>
              </div>
            </div>
          ) : (
            /* Register Form */
            <div>
              <h2 className="text-2xl font-medium mb-6 text-center">Registro de Usuario</h2>
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ingresa tu nombre completo" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="correo@ejemplo.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de Usuario</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ingresa tu nombre de usuario" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Contraseña</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Registrarme
                  </Button>
                </form>
              </Form>
              <div className="text-center mt-6">
                <p className="text-sm text-gray-600">
                  ¿Ya tienes cuenta?{" "}
                  <Button
                    variant="link"
                    className="text-primary hover:text-secondary p-0"
                    onClick={toggleForm}
                  >
                    Iniciar Sesión
                  </Button>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
