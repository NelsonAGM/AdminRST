import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { 
  insertClientSchema, insertTechnicianSchema, insertEquipmentSchema, 
  insertServiceOrderSchema, updateServiceOrderSchema, insertCompanySettingsSchema,
  insertUserSchema
} from "@shared/schema";

// Middleware to check if user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "No autenticado" });
};

// Middleware to check if user has admin role
const ensureAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "No autorizado" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up auth routes (register, login, logout, user)
  setupAuth(app);
  
  // Dashboard stats
  app.get("/api/dashboard/stats", ensureAuthenticated, async (req, res) => {
    try {
      const orders = await storage.listServiceOrders();
      const clients = await storage.listClients();
      const technicians = await storage.listTechnicians();
      
      const activeOrders = orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled');
      const completedOrders = orders.filter(order => order.status === 'completed');
      const pendingOrders = orders.filter(order => order.status === 'pending');
      
      // Calculate completed percentage
      const completedPercentage = orders.length > 0 
        ? Math.round((completedOrders.length / orders.length) * 100) 
        : 0;
        
      // Get new clients this month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newClientsThisMonth = clients.filter(client => 
        new Date(client.createdAt) >= firstDayOfMonth
      ).length;
      
      res.json({
        activeOrders: activeOrders.length,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        totalClients: clients.length,
        completedPercentage,
        newClientsThisMonth,
        availableTechnicians: technicians.filter(tech => tech.status === 'available').length
      });
    } catch (error) {
      res.status(500).json({ message: "Error al obtener estadísticas" });
    }
  });
  
  // Recent orders for dashboard
  app.get("/api/dashboard/recent-orders", ensureAuthenticated, async (req, res) => {
    try {
      const orders = await storage.listServiceOrders();
      const clients = await storage.listClients();
      const technicians = await storage.listTechnicians();
      
      // Sort by request date descending
      const sortedOrders = [...orders].sort((a, b) => 
        new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
      );
      
      // Get only 5 most recent
      const recentOrders = sortedOrders.slice(0, 5);
      
      // Enrich with client and technician names
      const enrichedOrders = recentOrders.map(order => {
        const client = clients.find(c => c.id === order.clientId);
        const technician = order.technicianId 
          ? technicians.find(t => t.id === order.technicianId)
          : null;
          
        return {
          ...order,
          clientName: client?.name || 'Cliente desconocido',
          technicianName: technician ? 'Sin asignar' : 'Sin asignar'
        };
      });
      
      res.json(enrichedOrders);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener órdenes recientes" });
    }
  });
  
  // Technicians status for dashboard
  app.get("/api/dashboard/technicians-status", ensureAuthenticated, async (req, res) => {
    try {
      const technicians = await storage.listTechnicians();
      const users = await storage.listUsers();
      
      const technicianStatuses = technicians.map(technician => {
        const user = users.find(u => u.id === technician.userId);
        return {
          id: technician.id,
          name: user?.fullName || 'Técnico',
          status: technician.status,
          specialization: technician.specialization
        };
      });
      
      res.json(technicianStatuses);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener estado de técnicos" });
    }
  });
  
  // Client routes
  app.get("/api/clients", ensureAuthenticated, async (req, res) => {
    try {
      const clients = await storage.listClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener clientes" });
    }
  });
  
  app.post("/api/clients", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  app.get("/api/clients/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener cliente" });
    }
  });
  
  app.put("/api/clients/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.parse(req.body);
      const updatedClient = await storage.updateClient(id, validatedData);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      res.json(updatedClient);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  app.delete("/api/clients/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClient(id);
      
      if (!success) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar cliente" });
    }
  });
  
  // Technician routes
  app.get("/api/technicians", ensureAuthenticated, async (req, res) => {
    try {
      const technicians = await storage.listTechnicians();
      const users = await storage.listUsers();
      
      // Enrich technicians with user data
      const enrichedTechnicians = technicians.map(technician => {
        const user = users.find(u => u.id === technician.userId);
        return {
          ...technician,
          fullName: user?.fullName,
          email: user?.email
        };
      });
      
      res.json(enrichedTechnicians);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener técnicos" });
    }
  });
  
  app.post("/api/technicians", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTechnicianSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUser(validatedData.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Check if technician already exists for this user
      const existingTechnician = await storage.getTechnicianByUserId(validatedData.userId);
      if (existingTechnician) {
        return res.status(400).json({ message: "Ya existe un técnico para este usuario" });
      }
      
      const technician = await storage.createTechnician(validatedData);
      res.status(201).json(technician);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  app.get("/api/technicians/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const technician = await storage.getTechnician(id);
      
      if (!technician) {
        return res.status(404).json({ message: "Técnico no encontrado" });
      }
      
      res.json(technician);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener técnico" });
    }
  });
  
  app.put("/api/technicians/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTechnicianSchema.parse(req.body);
      
      const updatedTechnician = await storage.updateTechnician(id, validatedData);
      
      if (!updatedTechnician) {
        return res.status(404).json({ message: "Técnico no encontrado" });
      }
      
      res.json(updatedTechnician);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  app.delete("/api/technicians/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTechnician(id);
      
      if (!success) {
        return res.status(404).json({ message: "Técnico no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar técnico" });
    }
  });
  
  // Equipment routes
  app.get("/api/equipment", ensureAuthenticated, async (req, res) => {
    try {
      const equipment = await storage.listEquipment();
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener equipos" });
    }
  });
  
  app.post("/api/equipment", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEquipmentSchema.parse(req.body);
      
      // Check if client exists
      const client = await storage.getClient(validatedData.clientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      const equipment = await storage.createEquipment(validatedData);
      res.status(201).json(equipment);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  app.get("/api/equipment/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const equipment = await storage.getEquipment(id);
      
      if (!equipment) {
        return res.status(404).json({ message: "Equipo no encontrado" });
      }
      
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener equipo" });
    }
  });
  
  app.get("/api/equipment/client/:clientId", ensureAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const equipment = await storage.listEquipmentByClient(clientId);
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener equipos del cliente" });
    }
  });
  
  app.put("/api/equipment/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEquipmentSchema.parse(req.body);
      
      const updatedEquipment = await storage.updateEquipment(id, validatedData);
      
      if (!updatedEquipment) {
        return res.status(404).json({ message: "Equipo no encontrado" });
      }
      
      res.json(updatedEquipment);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  app.delete("/api/equipment/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteEquipment(id);
      
      if (!success) {
        return res.status(404).json({ message: "Equipo no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar equipo" });
    }
  });
  
  // Service Order routes
  app.get("/api/service-orders", ensureAuthenticated, async (req, res) => {
    try {
      const orders = await storage.listServiceOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener órdenes de servicio" });
    }
  });
  
  app.post("/api/service-orders", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertServiceOrderSchema.parse(req.body);
      
      // Check if client exists
      const client = await storage.getClient(validatedData.clientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      // Check if equipment exists
      const equipment = await storage.getEquipment(validatedData.equipmentId);
      if (!equipment) {
        return res.status(404).json({ message: "Equipo no encontrado" });
      }
      
      // Check if technician exists if one is assigned
      if (validatedData.technicianId) {
        const technician = await storage.getTechnician(validatedData.technicianId);
        if (!technician) {
          return res.status(404).json({ message: "Técnico no encontrado" });
        }
      }
      
      const serviceOrder = await storage.createServiceOrder(validatedData);
      res.status(201).json(serviceOrder);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  app.get("/api/service-orders/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getServiceOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Orden de servicio no encontrada" });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener orden de servicio" });
    }
  });
  
  app.get("/api/service-orders/client/:clientId", ensureAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const orders = await storage.listServiceOrdersByClient(clientId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener órdenes del cliente" });
    }
  });
  
  app.get("/api/service-orders/technician/:technicianId", ensureAuthenticated, async (req, res) => {
    try {
      const technicianId = parseInt(req.params.technicianId);
      const orders = await storage.listServiceOrdersByTechnician(technicianId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener órdenes del técnico" });
    }
  });
  
  app.get("/api/service-orders/status/:status", ensureAuthenticated, async (req, res) => {
    try {
      const status = req.params.status;
      const orders = await storage.listServiceOrdersByStatus(status);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener órdenes por estado" });
    }
  });
  
  app.put("/api/service-orders/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateServiceOrderSchema.parse(req.body);
      
      const updatedOrder = await storage.updateServiceOrder(id, validatedData);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Orden de servicio no encontrada" });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  app.delete("/api/service-orders/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteServiceOrder(id);
      
      if (!success) {
        return res.status(404).json({ message: "Orden de servicio no encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar orden de servicio" });
    }
  });
  
  // User management routes
  app.get("/api/users", ensureAdmin, async (req, res) => {
    try {
      const users = await storage.listUsers();
      
      // Remove passwords from response
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener usuarios" });
    }
  });
  
  app.post("/api/users", ensureAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password),
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  app.get("/api/users/:id", ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener usuario" });
    }
  });
  
  app.put("/api/users/:id", ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      
      // If password is being updated, hash it
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      
      const updatedUser = await storage.updateUser(id, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  app.delete("/api/users/:id", ensureAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user is trying to delete themselves
      if (req.user?.id === id) {
        return res.status(400).json({ message: "No puedes eliminar tu propio usuario" });
      }
      
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar usuario" });
    }
  });
  
  // Company Settings routes
  app.get("/api/company-settings", ensureAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      
      if (!settings) {
        return res.status(404).json({ message: "Configuración no encontrada" });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener configuración de la empresa" });
    }
  });
  
  app.put("/api/company-settings", ensureAdmin, async (req, res) => {
    try {
      const validatedData = insertCompanySettingsSchema.parse(req.body);
      const settings = await storage.updateCompanySettings(validatedData);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Datos inválidos", error });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
