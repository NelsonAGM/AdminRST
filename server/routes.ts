import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage, hashPassword } from "./storage";
import { 
  insertClientSchema, insertTechnicianSchema, insertEquipmentSchema, 
  insertServiceOrderSchema, updateServiceOrderSchema, insertCompanySettingsSchema,
  insertUserSchema
} from "@shared/schema";
import { sendEmail, generateNewOrderEmail, loadEmailConfigFromDatabase } from "./email";
import { generateServiceOrderPDF, generateMultipleServiceOrdersPDF, generateOrderHtmlPDF, generateBulkOrdersHtmlPDF } from "./pdf-generator";
import archiver from "archiver";
import stream from "stream";
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import cloudinary from 'cloudinary';
import fetch from 'node-fetch';

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
  // Configure Cloudinary only when needed
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  } catch (error) {
    console.warn('⚠️ Cloudinary configuration failed:', error);
  }
  // Set up auth routes (register, login, logout, user)
  setupAuth(app, storage);
  
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
      console.error('Error detallado al obtener equipos:', error);
      res.status(500).json({ message: "Error al obtener equipos", error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  app.post("/api/equipment", ensureAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEquipmentSchema.parse(req.body);
      
      // Ya no necesitamos verificar cliente ya que el equipo puede existir sin cliente
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
      console.log("Recibiendo datos de orden de servicio:", JSON.stringify(req.body));
      
      // Aseguramos que photos es un array si existe
      let orderData = { ...req.body };
      if (orderData.photos && !Array.isArray(orderData.photos)) {
        if (typeof orderData.photos === 'string') {
          orderData.photos = [orderData.photos];
        } else {
          orderData.photos = [];
        }
      }
      
      // Convertimos los valores de photo a string si no lo son
      if (orderData.photos && Array.isArray(orderData.photos)) {
        orderData.photos = orderData.photos.map((p: any) => String(p));
        // --- OPTIMIZACIÓN DE IMÁGENES ---
        const optimizedPhotos = [];
        for (const base64img of orderData.photos) {
          if (base64img.startsWith('data:image')) {
            const matches = base64img.match(/^data:image\/(jpeg|png|jpg);base64,(.+)$/);
            if (!matches) continue;
            const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            // Subir a Cloudinary
            try {
              const uploadResult = await cloudinary.v2.uploader.upload(
                `data:image/${ext};base64,${matches[2]}`,
                {
                  folder: 'servicedashboard',
                  resource_type: 'image',
                  overwrite: true,
                  transformation: [
                    { width: 1024, height: 1024, crop: 'limit', quality: 'auto:good' }
                  ]
                }
              );
              optimizedPhotos.push(uploadResult.secure_url);
            } catch (err) {
              console.error('Error subiendo imagen a Cloudinary:', err);
            }
          } else if (base64img.startsWith('http')) {
            // Ya es una URL pública
            optimizedPhotos.push(base64img);
          }
        }
        orderData.photos = optimizedPhotos;
      }
      
      // Ensure clientSignature is a string if present
      if (orderData.clientSignature && typeof orderData.clientSignature !== 'string') {
        orderData.clientSignature = String(orderData.clientSignature);
      }
      
      // Procesamos las fechas
      if (orderData.expectedDeliveryDate && typeof orderData.expectedDeliveryDate === 'string') {
        orderData.expectedDeliveryDate = new Date(orderData.expectedDeliveryDate);
      }
      
      if (orderData.completionDate && typeof orderData.completionDate === 'string') {
        orderData.completionDate = new Date(orderData.completionDate);
      }
      
      if (orderData.clientApprovalDate && typeof orderData.clientApprovalDate === 'string') {
        orderData.clientApprovalDate = new Date(orderData.clientApprovalDate);
      }
      
      console.log("Datos procesados:", JSON.stringify(orderData, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
      
      const parseResult = insertServiceOrderSchema.safeParse(orderData);
      if (!parseResult.success) {
        console.error("Error de validación:", JSON.stringify(parseResult.error.errors));
        return res.status(400).json({ 
          message: "Datos inválidos", 
          error: parseResult.error.errors 
        });
      }
      
      const validatedData = parseResult.data;
      
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
      
      // Intentar enviar correo electrónico al cliente si tiene email
      if (client.email) {
        try {
          // Obtener la configuración de la empresa para el email
          const companySettings = await storage.getCompanySettings();
          
          // Obtener el técnico si está asignado
          let technician = null;
          if (serviceOrder.technicianId) {
            technician = await storage.getTechnician(serviceOrder.technicianId);
          }
          // Si no hay técnico, usar un objeto por defecto
          if (!technician) {
            technician = {
              id: 0,
              userId: 0,
              specialization: 'No asignado',
              status: 'available' as const,
              createdAt: new Date()
            };
          }
          
          // Generar el contenido del correo electrónico
          const emailHtml = generateNewOrderEmail(
            serviceOrder.orderNumber,
            client.name,
            `${equipment.brand} ${equipment.model}`,
            serviceOrder.description,
            (companySettings as any) && (companySettings as any).smtpHost !== undefined ? companySettings as any : {
              id: 0,
              name: 'Sistemas RST',
              logoUrl: null,
              address: '',
              phone: '',
              email: '',
              website: null,
              taxId: null,
              smtpHost: null,
              smtpPort: null,
              smtpSecure: true,
              smtpUser: null,
              smtpPassword: null,
              smtpFromName: null,
              smtpFromEmail: null,
              updatedAt: new Date()
            } as any
          );
          
          // Enviar el correo electrónico de forma síncrona para tener mejor registro
          try {
            console.log(`Intentando enviar correo al cliente ${client.email}...`);
            const success = await sendEmail({
              to: client.email,
              subject: `Nueva Orden de Servicio ${serviceOrder.orderNumber}`,
              html: emailHtml
            });
            
            if (success) {
              console.log(`Correo enviado correctamente al cliente ${client.email}`);
            } else {
              console.error(`Error al enviar correo al cliente ${client.email}`);
            }
          } catch (emailErr) {
            console.error('Error inesperado en el envío de correo:', emailErr);
          }
        } catch (emailError) {
          // No fallamos la petición si hay un error al enviar el correo
          console.error('Error al procesar el envío de correo:', emailError);
        }
      }
      
      res.status(201).json(serviceOrder);
    } catch (error) {
      console.error("Error al crear orden de servicio:", error);
      res.status(400).json({ message: "Datos inválidos", error: error instanceof Error ? error.message : String(error) });
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
      
      // Aseguramos que photos es un array si existe
      let orderData = { ...req.body };
      if (orderData.photos && !Array.isArray(orderData.photos)) {
        if (typeof orderData.photos === 'string') {
          orderData.photos = [orderData.photos];
        } else {
          orderData.photos = [];
        }
      }
      
      // Convertimos los valores de photo a string si no lo son
      if (orderData.photos && Array.isArray(orderData.photos)) {
        orderData.photos = orderData.photos.map((p: any) => String(p));
      }
      
      // Ensure clientSignature is a string if present
      if (orderData.clientSignature && typeof orderData.clientSignature !== 'string') {
        orderData.clientSignature = String(orderData.clientSignature);
      }
      
      // Procesamos las fechas
      if (orderData.expectedDeliveryDate && typeof orderData.expectedDeliveryDate === 'string') {
        orderData.expectedDeliveryDate = new Date(orderData.expectedDeliveryDate);
      }
      
      if (orderData.completionDate && typeof orderData.completionDate === 'string') {
        orderData.completionDate = new Date(orderData.completionDate);
      }
      
      if (orderData.clientApprovalDate && typeof orderData.clientApprovalDate === 'string') {
        orderData.clientApprovalDate = new Date(orderData.clientApprovalDate);
      }
      
      if (orderData.requestDate && typeof orderData.requestDate === 'string') {
        orderData.requestDate = new Date(orderData.requestDate);
      }
      
      console.log("Actualizando orden de servicio:", JSON.stringify(orderData, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
      
      const parseResult = updateServiceOrderSchema.safeParse(orderData);
      if (!parseResult.success) {
        console.error("Error de validación en actualización:", JSON.stringify(parseResult.error.errors));
        return res.status(400).json({ 
          message: "Datos inválidos", 
          error: parseResult.error.errors 
        });
      }
      
      const validatedData = parseResult.data;
      const updatedOrder = await storage.updateServiceOrder(id, validatedData);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Orden de servicio no encontrada" });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error al actualizar orden de servicio:", error);
      res.status(400).json({ message: "Datos inválidos", error: error instanceof Error ? error.message : String(error) });
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

  // Endpoint para reenviar correo de una orden de servicio con PDF adjunto
  app.post("/api/service-orders/:id/send-email", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const serviceOrder = await storage.getServiceOrder(id);
      
      if (!serviceOrder) {
        return res.status(404).json({ message: "Orden de servicio no encontrada" });
      }
      
      // Obtener el cliente y equipo para la orden
      const client = await storage.getClient(serviceOrder.clientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      if (!client.email) {
        return res.status(400).json({ message: "El cliente no tiene dirección de correo electrónico" });
      }
      
      const equipment = await storage.getEquipment(serviceOrder.equipmentId);
      if (!equipment) {
        return res.status(404).json({ message: "Equipo no encontrado" });
      }
      
      // Obtener el técnico si está asignado
      let technician = null;
      if (serviceOrder.technicianId) {
        technician = await storage.getTechnician(serviceOrder.technicianId);
      }
      // Si no hay técnico, usar un objeto por defecto
      if (!technician) {
        technician = {
          id: 0,
          userId: 0,
          specialization: 'No asignado',
          status: 'available' as const,
          createdAt: new Date()
        };
      }
      
      // Obtener la configuración de la empresa
      const companySettings = await storage.getCompanySettings();
      
      // Generar el contenido del correo electrónico
      const emailHtml = generateNewOrderEmail(
        serviceOrder.orderNumber,
        client.name,
        `${equipment.brand} ${equipment.model}`,
        serviceOrder.description,
        (companySettings as any) && (companySettings as any).smtpHost !== undefined ? companySettings as any : {
          id: 0,
          name: 'Sistemas RST',
          logoUrl: null,
          address: '',
          phone: '',
          email: '',
          website: null,
          taxId: null,
          smtpHost: null,
          smtpPort: null,
          smtpSecure: true,
          smtpUser: null,
          smtpPassword: null,
          smtpFromName: null,
          smtpFromEmail: null,
          updatedAt: new Date()
        } as any
      );
      
      // Generar el PDF de la orden
      console.log(`Generando PDF para la orden ${serviceOrder.orderNumber}...`);
      
      try {
        // Generar el PDF
        const pdfBuffer = await generateServiceOrderPDF(
          serviceOrder,
          client,
          equipment,
          technician,
          (companySettings as any) && (companySettings as any).smtpHost !== undefined ? companySettings as any : {
            id: 0,
            name: 'Sistemas RST',
            logoUrl: null,
            address: '',
            phone: '',
            email: '',
            website: null,
            taxId: null,
            smtpHost: null,
            smtpPort: null,
            smtpSecure: true,
            smtpUser: null,
            smtpPassword: null,
            smtpFromName: null,
            smtpFromEmail: null,
            updatedAt: new Date()
          } as any
        );
        
        console.log(`PDF generado correctamente, tamaño: ${pdfBuffer.length} bytes`);
        
        // Enviar el correo con el PDF adjunto
        console.log(`Reenvío manual: Intentando enviar correo al cliente ${client.email}...`);
        const success = await sendEmail({
          to: client.email,
          subject: `Orden de Servicio ${serviceOrder.orderNumber}`,
          html: emailHtml,
          attachments: [
            {
              filename: `Orden_${serviceOrder.orderNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });
        
        if (success) {
          return res.json({ 
            success: true, 
            message: `Correo enviado correctamente a ${client.email} con PDF adjunto` 
          });
        } else {
          return res.status(500).json({ 
            success: false, 
            message: "Error al enviar el correo electrónico" 
          });
        }
      } catch (pdfError) {
        console.error("Error al generar el PDF:", pdfError);
        // Si falla la generación del PDF, enviamos el correo sin adjunto
        console.log("Enviando correo sin adjunto PDF debido a un error en la generación...");
        const success = await sendEmail({
          to: client.email,
          subject: `Orden de Servicio ${serviceOrder.orderNumber}`,
          html: emailHtml
        });
        
        if (success) {
          return res.json({ 
            success: true, 
            message: `Correo enviado correctamente a ${client.email} (sin PDF adjunto debido a un error)` 
          });
        } else {
          return res.status(500).json({ 
            success: false, 
            message: "Error al enviar el correo electrónico" 
          });
        }
      }
    } catch (error) {
      console.error("Error al reenviar correo:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al reenviar correo", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Endpoint para descargar varias órdenes de servicio en un solo PDF
  app.post("/api/service-orders/bulk-pdf", ensureAuthenticated, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Debes enviar un array de IDs de órdenes." });
      }

      // Obtener datos completos de cada orden
      const companySettings = await storage.getCompanySettings();
      const ordersData: Record<string, any>[] = [];
      
      for (const id of ids) {
        const serviceOrder = await storage.getServiceOrder(id);
        if (!serviceOrder) continue;
        
        const client = await storage.getClient(serviceOrder.clientId);
        const equipment = await storage.getEquipment(serviceOrder.equipmentId);
        let technician = null;
        
        if (serviceOrder.technicianId) {
          technician = await storage.getTechnician(serviceOrder.technicianId);
        }
        
        if (!technician) {
          technician = {
            id: 0,
            userId: 0,
            specialization: 'No asignado',
            status: 'available' as const,
            createdAt: new Date()
          };
        }
        
        if (!client || !equipment) continue;
        
        const orderData = {
          companyName: companySettings?.name || '',
          companyAddress: companySettings?.address || '',
          companyPhone: companySettings?.phone || '',
          companyEmail: companySettings?.email || '',
          companyLogo: companySettings?.logoUrl || '',
          orderNumber: serviceOrder.orderNumber,
          status: serviceOrder.status,
          statusClass: serviceOrder.status === 'completed' ? 'completed' : 
                      serviceOrder.status === 'pending' ? 'pending' : 'other',
          requestDate: serviceOrder.requestDate ? new Date(serviceOrder.requestDate).toLocaleDateString() : '',
          expectedDeliveryDate: serviceOrder.expectedDeliveryDate ? new Date(serviceOrder.expectedDeliveryDate).toLocaleDateString() : '',
          clientName: client.name,
          clientContact: client.contactName || '',
          clientPhone: client.phone || '',
          clientEmail: client.email || '',
          clientAddress: client.address || '',
          equipmentType: equipment.type || '',
          equipmentBrand: equipment.brand || '',
          equipmentModel: equipment.model || '',
          equipmentSerial: equipment.serialNumber || '',
          technician: technician.specialization || 'No asignado',
          description: serviceOrder.description || '',
          notes: serviceOrder.notes || '',
          materialsUsed: serviceOrder.materialsUsed || '',
          cost: serviceOrder.cost ? `$${serviceOrder.cost}` : '',
          photos: serviceOrder.photos || [],
          clientSignature: serviceOrder.clientSignature || ''
        };
        
        ordersData.push(orderData);
      }

      if (ordersData.length === 0) {
        return res.status(404).json({ message: "No se encontraron órdenes válidas." });
      }

      // Generar PDF usando el sistema actual
      const pdfBuffer = await generateBulkOrdersHtmlPDF(ordersData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="ordenes_servicio.pdf"');
      res.end(pdfBuffer);
      
    } catch (error) {
      console.error("Error al generar PDFs por lote:", error);
      res.status(500).json({ message: "Error al generar los PDFs por lote." });
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
      console.log("Recibiendo datos de usuario:", JSON.stringify(req.body));
      
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }
      
      // Extraer confirmPassword antes de crear el usuario
      const { confirmPassword, ...userData } = validatedData;
      
      // Create user with hashed password
      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error al crear usuario:", JSON.stringify(error, null, 2));
      
      if (error.errors) {
        res.status(400).json({ message: "Datos inválidos", error: error.errors });
      } else if (error.issues) {
        // Envía los detalles completos del error para mejor diagnóstico
        res.status(400).json({ 
          message: "Datos inválidos", 
          error: error.issues,
          details: JSON.stringify(error, null, 2),
          receivedData: JSON.stringify(req.body, null, 2)
        });
      } else {
        res.status(400).json({ 
          message: "Datos inválidos", 
          error: error.message || error,
          details: JSON.stringify(error, null, 2),
          receivedData: JSON.stringify(req.body, null, 2)
        });
      }
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
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener configuración de empresa" });
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
  
  // Monthly Revenue routes
  app.get("/api/monthly-revenue/current", ensureAuthenticated, async (req, res) => {
    try {
      const revenue = await storage.calculateCurrentMonthRevenue();
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ message: "Error al calcular ingresos del mes actual" });
    }
  });
  
  app.get("/api/monthly-revenue/:year", ensureAuthenticated, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const revenues = await storage.getMonthlyRevenuesByYear(year);
      res.json(revenues);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener ingresos mensuales" });
    }
  });
  
  app.get("/api/monthly-revenue/history", ensureAuthenticated, async (req, res) => {
    console.log('🚀 === INICIO ENDPOINT /api/monthly-revenue/history ===');
    res.json([]);
    console.log('🚀 === FIN ENDPOINT /api/monthly-revenue/history ===');
  });
  
  // Create HTTP server
  const server = createServer(app);
  
  return server;
}
