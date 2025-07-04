import { 
  users, type User, type InsertUser, type InsertUserDb,
  clients, type Client, type InsertClient,
  technicians, type Technician, type InsertTechnician,
  equipment, type Equipment, type InsertEquipment,
  serviceOrders, type ServiceOrder, type InsertServiceOrder, type UpdateServiceOrder,
  companySettings, type CompanySettings, type InsertCompanySettings,
  monthlyRevenue, type MonthlyRevenue, type InsertMonthlyRevenue
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { eq, and, or, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUserDb): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUserDb>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  listUsers(): Promise<User[]>;

  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  listClients(): Promise<Client[]>;

  // Technician operations
  getTechnician(id: number): Promise<Technician | undefined>;
  getTechnicianByUserId(userId: number): Promise<Technician | undefined>;
  createTechnician(technician: InsertTechnician): Promise<Technician>;
  updateTechnician(id: number, technicianData: Partial<InsertTechnician>): Promise<Technician | undefined>;
  deleteTechnician(id: number): Promise<boolean>;
  listTechnicians(): Promise<Technician[]>;

  // Equipment operations
  getEquipment(id: number): Promise<Equipment | undefined>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: number, equipmentData: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  deleteEquipment(id: number): Promise<boolean>;
  listEquipment(): Promise<Equipment[]>;
  listEquipmentByClient(clientId: number): Promise<Equipment[]>;

  // Service Order operations
  getServiceOrder(id: number): Promise<ServiceOrder | undefined>;
  createServiceOrder(serviceOrder: InsertServiceOrder): Promise<ServiceOrder>;
  updateServiceOrder(id: number, serviceOrderData: Partial<UpdateServiceOrder>): Promise<ServiceOrder | undefined>;
  deleteServiceOrder(id: number): Promise<boolean>;
  listServiceOrders(): Promise<ServiceOrder[]>;
  listServiceOrdersByClient(clientId: number): Promise<ServiceOrder[]>;
  listServiceOrdersByTechnician(technicianId: number): Promise<ServiceOrder[]>;
  listServiceOrdersByStatus(status: string): Promise<ServiceOrder[]>;

  // Company Settings operations
  getCompanySettings(): Promise<CompanySettings | undefined>;
  updateCompanySettings(settingsData: InsertCompanySettings): Promise<CompanySettings>;

  // Monthly Revenue operations
  getMonthlyRevenue(year: number, month: number): Promise<MonthlyRevenue | undefined>;
  getMonthlyRevenuesByYear(year: number): Promise<MonthlyRevenue[]>;
  updateMonthlyRevenue(year: number, month: number, data: Partial<InsertMonthlyRevenue>): Promise<MonthlyRevenue>;
  calculateCurrentMonthRevenue(): Promise<MonthlyRevenue>;
  getRevenueHistory(limit: number): Promise<MonthlyRevenue[]>;

  // Session store
  sessionStore: session.Store;
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session', // Use a different name than 'sessions' which is the default
      createTableIfMissing: true
    });
    
    // Initialize with admin user and company settings
    this.initializeDefaults();
  }

  private async initializeDefaults() {
    // Check if admin user exists
    const adminUser = await this.getUserByUsername("admin");
    if (!adminUser) {
      // Create admin user
      const hashedPassword = await hashPassword("admin123");
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        fullName: "Administrador",
        email: "admin@example.com",
        role: "admin"
      }).onConflictDoNothing();
    }
    
    // Check if company settings exist
    const settings = await this.getCompanySettings();
    if (!settings) {
      // Create company settings
      await db.insert(companySettings).values({
        name: "Sistemas RST",
        address: "Av. Principal 123",
        phone: "+123456789",
        email: "info@sistemasrst.com",
        logoUrl: null,
        website: null,
        taxId: null,
        smtpHost: null,
        smtpPort: null,
        smtpSecure: true,
        smtpUser: null,
        smtpPassword: null,
        smtpFromName: null,
        smtpFromEmail: null,
      }).onConflictDoNothing();
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUserDb): Promise<User> {
    // Hash password if it's not already hashed
    let hashedPassword = insertUser.password;
    if (!insertUser.password.includes('.')) {
      hashedPassword = await hashPassword(insertUser.password);
    }
    
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword
    }).returning();
    
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUserDb>): Promise<User | undefined> {
    // Hash password if it's being updated and not already hashed
    if (userData.password && !userData.password.includes('.')) {
      userData.password = await hashPassword(userData.password);
    }
    
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await db.update(clients)
      .set(clientData)
      .where(eq(clients.id, id))
      .returning();
    
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    await db.delete(clients).where(eq(clients.id, id));
    return true;
  }

  async listClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  // Technician methods
  async getTechnician(id: number): Promise<Technician | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, id));
    return technician;
  }
  
  async getTechnicianByUserId(userId: number): Promise<Technician | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.userId, userId));
    return technician;
  }

  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    const [technician] = await db.insert(technicians).values(insertTechnician).returning();
    return technician;
  }

  async updateTechnician(id: number, technicianData: Partial<InsertTechnician>): Promise<Technician | undefined> {
    const [updatedTechnician] = await db.update(technicians)
      .set(technicianData)
      .where(eq(technicians.id, id))
      .returning();
    
    return updatedTechnician;
  }

  async deleteTechnician(id: number): Promise<boolean> {
    await db.delete(technicians).where(eq(technicians.id, id));
    return true;
  }

  async listTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians);
  }

  // Equipment methods
  async getEquipment(id: number): Promise<Equipment | undefined> {
    const [equipmentItem] = await db.select().from(equipment).where(eq(equipment.id, id));
    return equipmentItem;
  }

  async createEquipment(insertEquipment: InsertEquipment): Promise<Equipment> {
    // Asegurarnos de que description, location y company son null si no vienen
    const equipmentData = {
      ...insertEquipment,
      description: insertEquipment.description ?? null,
      location: insertEquipment.location ?? null,
      company: insertEquipment.company ?? null,
    };
    
    const [newEquipment] = await db.insert(equipment).values(equipmentData).returning();
    return newEquipment;
  }

  async updateEquipment(id: number, equipmentData: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const [updatedEquipment] = await db.update(equipment)
      .set(equipmentData)
      .where(eq(equipment.id, id))
      .returning();
    
    return updatedEquipment;
  }

  async deleteEquipment(id: number): Promise<boolean> {
    await db.delete(equipment).where(eq(equipment.id, id));
    return true;
  }

  async listEquipment(): Promise<Equipment[]> {
    return await db.select().from(equipment);
  }

  async listEquipmentByClient(clientId: number): Promise<Equipment[]> {
    // Primero obtenemos el cliente para conocer su nombre
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) return [];
    
    // Si tenemos el cliente, buscamos equipos que coincidan con su nombre en el campo company
    if (client.name) {
      return await db.select().from(equipment).where(eq(equipment.company, client.name));
    }
    
    return [];
  }

  // Service Order methods
  async getServiceOrder(id: number): Promise<ServiceOrder | undefined> {
    const [order] = await db.select().from(serviceOrders).where(eq(serviceOrders.id, id));
    return order;
  }

  async createServiceOrder(insertServiceOrder: InsertServiceOrder): Promise<ServiceOrder> {
    // Generate an order number
    const year = new Date().getFullYear();
    
    // Get last order number for this year to increment
    const [lastOrder] = await db
      .select({ orderNumber: serviceOrders.orderNumber })
      .from(serviceOrders)
      .where(sql`${serviceOrders.orderNumber} LIKE ${`ORD-${year}-%`}`)
      .orderBy(sql`${serviceOrders.orderNumber} DESC`)
      .limit(1);
    
    let orderNumber = `ORD-${year}-1000`;
    if (lastOrder) {
      const parts = lastOrder.orderNumber.split('-');
      const lastNumber = parseInt(parts[2], 10);
      orderNumber = `ORD-${year}-${lastNumber + 1}`;
    }
    
    const [serviceOrder] = await db.insert(serviceOrders).values({
      ...insertServiceOrder,
      orderNumber,
      requestDate: new Date()
    }).returning();
    
    return serviceOrder;
  }

  async updateServiceOrder(id: number, serviceOrderData: Partial<UpdateServiceOrder>): Promise<ServiceOrder | undefined> {
    // Si se está cambiando el estado a warranty (garantía), establecer costo a 0
    if (serviceOrderData.status === 'warranty') {
      serviceOrderData.cost = 0;
    }
    
    const [updatedServiceOrder] = await db.update(serviceOrders)
      .set(serviceOrderData)
      .where(eq(serviceOrders.id, id))
      .returning();
    
    return updatedServiceOrder;
  }

  async deleteServiceOrder(id: number): Promise<boolean> {
    await db.delete(serviceOrders).where(eq(serviceOrders.id, id));
    return true;
  }

  async listServiceOrders(): Promise<ServiceOrder[]> {
    return await db.select().from(serviceOrders);
  }

  async listServiceOrdersByClient(clientId: number): Promise<ServiceOrder[]> {
    return await db.select().from(serviceOrders).where(eq(serviceOrders.clientId, clientId));
  }

  async listServiceOrdersByTechnician(technicianId: number): Promise<ServiceOrder[]> {
    return await db.select().from(serviceOrders).where(eq(serviceOrders.technicianId, technicianId));
  }
  
  async listServiceOrdersByStatus(status: string): Promise<ServiceOrder[]> {
    // Usar el operador 'eq' de drizzle-orm para mayor seguridad en la comparación de enums
    return await db.select().from(serviceOrders).where(eq(serviceOrders.status, status as any));
  }

  // Company Settings methods
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).limit(1);
    return settings;
  }

  async updateCompanySettings(settingsData: InsertCompanySettings): Promise<CompanySettings> {
    const existingSettings = await this.getCompanySettings();
    
    if (existingSettings) {
      // Update existing settings
      const [updatedSettings] = await db.update(companySettings)
        .set({
          ...settingsData,
          updatedAt: new Date()
        })
        .where(eq(companySettings.id, existingSettings.id))
        .returning();
      
      return updatedSettings;
    } else {
      // Create new settings
      const [newSettings] = await db.insert(companySettings)
        .values({
          ...settingsData
        })
        .returning();
      
      return newSettings;
    }
  }
  
  // Monthly Revenue methods
  async getMonthlyRevenue(year: number, month: number): Promise<MonthlyRevenue | undefined> {
    const [revenue] = await db.select()
      .from(monthlyRevenue)
      .where(and(
        eq(monthlyRevenue.year, year),
        eq(monthlyRevenue.month, month)
      ));
    return revenue;
  }
  
  async getMonthlyRevenuesByYear(year: number): Promise<MonthlyRevenue[]> {
    // Primero, obtenemos los datos existentes en la tabla
    const existingRecords = await db.select()
      .from(monthlyRevenue)
      .where(eq(monthlyRevenue.year, year))
      .orderBy(monthlyRevenue.month);
    
    // Ahora calculamos de nuevo los datos para cada mes
    const monthlyData: MonthlyRevenue[] = [];
    
    // Calculamos para cada mes del año
    for (let month = 1; month <= 12; month++) {
      // Establecer fechas de inicio y fin del mes
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      
      // No recalculamos meses futuros
      const now = new Date();
      if (startOfMonth > now) {
        continue;
      }
      
      try {
        // Obtener órdenes completadas y de garantía con costo para este mes
        const orders = await db.select({
          id: serviceOrders.id,
          cost: serviceOrders.cost,
          status: serviceOrders.status,
          completionDate: serviceOrders.completionDate
        })
        .from(serviceOrders)
        .where(
          and(
            or(
              eq(serviceOrders.status, 'completed'),
              eq(serviceOrders.status, 'warranty')
            ),
            sql`${serviceOrders.completionDate} >= ${startOfMonth.toISOString()}`,
            sql`${serviceOrders.completionDate} <= ${endOfMonth.toISOString()}`,
            sql`${serviceOrders.cost} IS NOT NULL`
          )
        );
        
        // Calcular totales
        const orderCount = orders.length;
        let totalAmount = 0;
        
        for (const order of orders) {
          if (typeof order.cost === 'number') {
            totalAmount += order.cost;
          }
        }
        
        const averageOrderValue = orderCount > 0 ? totalAmount / orderCount : 0;
        
        // Actualizar el registro para este mes
        const updatedRevenue = await this.updateMonthlyRevenue(year, month, {
          totalAmount: totalAmount.toString(),
          orderCount,
          averageOrderValue: averageOrderValue.toString()
        });
        
        monthlyData.push(updatedRevenue);
      } catch (error) {
        console.error(`Error al calcular ingresos para ${year}-${month}:`, error);
        
        // Si hay un error, buscamos el registro existente
        const existingRecord = existingRecords.find(r => r.month === month);
        if (existingRecord) {
          monthlyData.push(existingRecord);
        }
      }
    }
    
    return monthlyData.sort((a, b) => a.month - b.month);
  }
  
  async updateMonthlyRevenue(year: number, month: number, data: Partial<InsertMonthlyRevenue>): Promise<MonthlyRevenue> {
    const existingRevenue = await this.getMonthlyRevenue(year, month);
    
    if (existingRevenue) {
      // Update existing record
      const [updatedRevenue] = await db.update(monthlyRevenue)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(and(
          eq(monthlyRevenue.year, year),
          eq(monthlyRevenue.month, month)
        ))
        .returning();
      
      return updatedRevenue;
    } else {
      // Create new record
      const [newRevenue] = await db.insert(monthlyRevenue)
        .values({
          year,
          month,
          ...data,
        })
        .returning();
      
      return newRevenue;
    }
  }
  
  async calculateCurrentMonthRevenue(): Promise<MonthlyRevenue> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    console.log("Calculando ingresos para", currentYear, currentMonth);
    
    try {
      // Obtener órdenes completadas y de garantía con costo
      const orders = await db.select({
        id: serviceOrders.id,
        cost: serviceOrders.cost,
        status: serviceOrders.status
      })
      .from(serviceOrders)
      .where(
        and(
          or(
            eq(serviceOrders.status, 'completed'),
            eq(serviceOrders.status, 'warranty')
          ),
          sql`${serviceOrders.cost} IS NOT NULL`
        )
      );
      
      console.log("Total de órdenes con costo:", orders.length);
      
      // Calcular totales
      const orderCount = orders.length;
      let totalAmount = 0;
      
      for (const order of orders) {
        if (typeof order.cost === 'number') {
          totalAmount += order.cost;
        }
      }
      
      const averageOrderValue = orderCount > 0 ? totalAmount / orderCount : 0;
      
      console.log("Monto total:", totalAmount);
      console.log("Cantidad de órdenes:", orderCount);
      console.log("Valor promedio:", averageOrderValue);
      
      // Update or create monthly revenue record
      return this.updateMonthlyRevenue(currentYear, currentMonth, {
        totalAmount: totalAmount.toString(), // Convert to string for decimal
        orderCount,
        averageOrderValue: averageOrderValue.toString() // Convert to string for decimal
      });
    } catch (error) {
      console.error("Error al calcular ingresos:", error);
      
      // En caso de error, simplemente devolver datos de ejemplo
      return this.updateMonthlyRevenue(currentYear, currentMonth, {
        totalAmount: "0",
        orderCount: 0,
        averageOrderValue: "0"
      });
    }
  }
  
  async getRevenueHistory(limit: number): Promise<MonthlyRevenue[]> {
    try {
      return await db.select()
        .from(monthlyRevenue)
        .orderBy(sql`${monthlyRevenue.year} DESC, ${monthlyRevenue.month} DESC`)
        .limit(limit);
    } catch (error) {
      console.error('Error en getRevenueHistory:', error);
      return [];
    }
  }
}

// Memory Storage Implementation - keeping this for reference
export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private clientsData: Map<number, Client>;
  private techniciansData: Map<number, Technician>;
  private equipmentData: Map<number, Equipment>;
  private serviceOrdersData: Map<number, ServiceOrder>;
  private companySettingsData: Map<number, CompanySettings>;
  
  sessionStore: session.Store;
  
  userCurrentId: number;
  clientCurrentId: number;
  technicianCurrentId: number;
  equipmentCurrentId: number;
  serviceOrderCurrentId: number;
  orderNumber: number;

  constructor() {
    this.usersData = new Map();
    this.clientsData = new Map();
    this.techniciansData = new Map();
    this.equipmentData = new Map();
    this.serviceOrdersData = new Map();
    this.companySettingsData = new Map();
    
    this.userCurrentId = 1;
    this.clientCurrentId = 1;
    this.technicianCurrentId = 1;
    this.equipmentCurrentId = 1;
    this.serviceOrderCurrentId = 1;
    this.orderNumber = 1000;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
    });
    
    // Initialize with admin user - we'll do this directly instead of using async
    const adminId = this.userCurrentId++;
    this.usersData.set(adminId, {
      id: adminId,
      username: "admin",
      password: "admin123", // Temporary password, will be replaced with hashed version later
      fullName: "Administrador",
      email: "admin@example.com",
      role: "admin",
      createdAt: new Date()
    });
    
    // Hash the admin password afterwards (will be applied when the promise resolves)
    hashPassword("admin123").then(hashedPassword => {
      const admin = this.usersData.get(adminId);
      if (admin) {
        admin.password = hashedPassword;
        this.usersData.set(adminId, admin);
      }
    });
    
    // Initialize company settings
    this.companySettingsData.set(1, {
      id: 1,
      name: "Sistemas RST",
      logoUrl: null,
      address: "Av. Principal 123",
      phone: "+123456789",
      email: "info@sistemasrst.com",
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
    });
  }

  // Initialize admin user with hashed password
  private async initAdminUser() {
    const hashedPassword = await hashPassword("admin123");
    const id = this.userCurrentId++;
    const user: User = {
      id,
      username: "admin",
      password: hashedPassword,
      fullName: "Administrador",
      email: "admin@example.com",
      role: "admin",
      createdAt: new Date()
    };
    this.usersData.set(id, user);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUserDb): Promise<User> {
    const id = this.userCurrentId++;
    
    // Si se está creando un usuario desde el constructor, la contraseña ya estará hasheada
    // De lo contrario, hashear la contraseña aquí
    let hashedPassword = insertUser.password;
    if (!insertUser.password.includes('.')) {
      hashedPassword = await hashPassword(insertUser.password);
    }
    
    // Asegurarnos de que role tiene un valor por defecto si no viene
    const role = insertUser.role || "user";
    
    const user: User = { 
      ...insertUser, 
      password: hashedPassword,
      role,
      id, 
      createdAt: new Date() 
    };
    this.usersData.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUserDb>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    // Si se está actualizando la contraseña, hashearla
    if (userData.password && !userData.password.includes('.')) {
      userData.password = await hashPassword(userData.password);
    }
    
    const updatedUser = { ...user, ...userData };
    this.usersData.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.usersData.delete(id);
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.usersData.values());
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clientsData.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.clientCurrentId++;
    const client: Client = { ...insertClient, id, createdAt: new Date() };
    this.clientsData.set(id, client);
    return client;
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = await this.getClient(id);
    if (!client) return undefined;
    
    const updatedClient = { ...client, ...clientData };
    this.clientsData.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clientsData.delete(id);
  }

  async listClients(): Promise<Client[]> {
    return Array.from(this.clientsData.values());
  }

  // Technician methods
  async getTechnician(id: number): Promise<Technician | undefined> {
    return this.techniciansData.get(id);
  }
  
  async getTechnicianByUserId(userId: number): Promise<Technician | undefined> {
    return Array.from(this.techniciansData.values()).find(
      (technician) => technician.userId === userId,
    );
  }

  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    const id = this.technicianCurrentId++;
    // Asegurarnos de que status tiene un valor por defecto
    const status = insertTechnician.status || "available";
    
    const technician: Technician = { 
      ...insertTechnician, 
      status,
      id, 
      createdAt: new Date() 
    };
    this.techniciansData.set(id, technician);
    return technician;
  }

  async updateTechnician(id: number, technicianData: Partial<InsertTechnician>): Promise<Technician | undefined> {
    const technician = await this.getTechnician(id);
    if (!technician) return undefined;
    
    const updatedTechnician = { ...technician, ...technicianData };
    this.techniciansData.set(id, updatedTechnician);
    return updatedTechnician;
  }

  async deleteTechnician(id: number): Promise<boolean> {
    return this.techniciansData.delete(id);
  }

  async listTechnicians(): Promise<Technician[]> {
    return Array.from(this.techniciansData.values());
  }

  // Equipment methods
  async getEquipment(id: number): Promise<Equipment | undefined> {
    return this.equipmentData.get(id);
  }

  async createEquipment(insertEquipment: InsertEquipment): Promise<Equipment> {
    const id = this.equipmentCurrentId++;
    // Asegurarnos de que description es null si no viene
    const description = insertEquipment.description ?? null;
    // Asegurarnos de que location y company son null si no vienen
    const location = insertEquipment.location ?? null;
    const company = insertEquipment.company ?? null;
    
    const equipment: Equipment = { 
      ...insertEquipment, 
      description,
      location,
      company,
      id, 
      createdAt: new Date() 
    };
    this.equipmentData.set(id, equipment);
    return equipment;
  }

  async updateEquipment(id: number, equipmentData: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const equipment = await this.getEquipment(id);
    if (!equipment) return undefined;
    
    const updatedEquipment = { ...equipment, ...equipmentData };
    this.equipmentData.set(id, updatedEquipment);
    return updatedEquipment;
  }

  async deleteEquipment(id: number): Promise<boolean> {
    return this.equipmentData.delete(id);
  }

  async listEquipment(): Promise<Equipment[]> {
    return Array.from(this.equipmentData.values());
  }

  async listEquipmentByClient(clientId: number): Promise<Equipment[]> {
    // Primero obtenemos el cliente para conocer su nombre
    const client = this.clientsData.get(clientId);
    if (!client) return [];
    
    // Si tenemos el cliente, buscamos equipos que coincidan con su nombre en el campo company
    if (client.name) {
      return Array.from(this.equipmentData.values()).filter(
        (equipment) => equipment.company === client.name
      );
    }
    
    return [];
  }

  // Service Order methods
  async getServiceOrder(id: number): Promise<ServiceOrder | undefined> {
    return this.serviceOrdersData.get(id);
  }

  async createServiceOrder(insertServiceOrder: InsertServiceOrder): Promise<ServiceOrder> {
    const id = this.serviceOrderCurrentId++;
    const orderNumber = `ORD-${new Date().getFullYear()}-${this.orderNumber++}`;
    
    // Establecer valores por defecto para campos requeridos
    const status = insertServiceOrder.status || "pending";
    const technicianId = insertServiceOrder.technicianId ?? null;
    const notes = insertServiceOrder.notes ?? null;
    const materialsUsed = insertServiceOrder.materialsUsed ?? null;
    const expectedDeliveryDate = insertServiceOrder.expectedDeliveryDate ?? null;
    const clientSignature = insertServiceOrder.clientSignature ?? null;
    const photos = insertServiceOrder.photos ?? [];
    const clientApproval = insertServiceOrder.clientApproval ?? false;
    const clientApprovalDate = insertServiceOrder.clientApprovalDate ?? null;
    
    // Si el estado es warranty (garantía), el costo siempre es 0
    const cost = status === 'warranty' ? 0 : (insertServiceOrder.cost ?? null);
    
    const serviceOrder: ServiceOrder = { 
      clientId: insertServiceOrder.clientId,
      equipmentId: insertServiceOrder.equipmentId,
      description: insertServiceOrder.description,
      status,
      technicianId,
      notes,
      materialsUsed,
      expectedDeliveryDate,
      clientSignature,
      photos,
      clientApproval,
      clientApprovalDate,
      cost,
      id, 
      orderNumber,
      requestDate: new Date(),
      completionDate: null
    };
    this.serviceOrdersData.set(id, serviceOrder);
    return serviceOrder;
  }

  async updateServiceOrder(id: number, serviceOrderData: Partial<UpdateServiceOrder>): Promise<ServiceOrder | undefined> {
    const serviceOrder = await this.getServiceOrder(id);
    if (!serviceOrder) return undefined;
    
    // Si se está cambiando el estado a warranty (garantía), establecer costo a 0
    if (serviceOrderData.status === 'warranty') {
      serviceOrderData.cost = 0;
    }
    
    const updatedServiceOrder = { ...serviceOrder, ...serviceOrderData };
    this.serviceOrdersData.set(id, updatedServiceOrder);
    return updatedServiceOrder;
  }

  async deleteServiceOrder(id: number): Promise<boolean> {
    return this.serviceOrdersData.delete(id);
  }

  async listServiceOrders(): Promise<ServiceOrder[]> {
    return Array.from(this.serviceOrdersData.values());
  }

  async listServiceOrdersByClient(clientId: number): Promise<ServiceOrder[]> {
    return Array.from(this.serviceOrdersData.values()).filter(
      (serviceOrder) => serviceOrder.clientId === clientId,
    );
  }

  async listServiceOrdersByTechnician(technicianId: number): Promise<ServiceOrder[]> {
    return Array.from(this.serviceOrdersData.values()).filter(
      (serviceOrder) => serviceOrder.technicianId === technicianId,
    );
  }
  
  async listServiceOrdersByStatus(status: string): Promise<ServiceOrder[]> {
    return Array.from(this.serviceOrdersData.values()).filter(
      (serviceOrder) => serviceOrder.status === status,
    );
  }

  // Company Settings methods
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    return this.companySettingsData.get(1);
  }

  async updateCompanySettings(settingsData: InsertCompanySettings): Promise<CompanySettings> {
    const settings = this.companySettingsData.get(1);
    
    // Asegurar que los campos opcionales son null si no están definidos
    const logoUrl = settingsData.logoUrl ?? null;
    const website = settingsData.website ?? null;
    const taxId = settingsData.taxId ?? null;
    const smtpHost = settingsData.smtpHost ?? null;
    const smtpPort = settingsData.smtpPort ?? null;
    const smtpSecure = settingsData.smtpSecure ?? true;
    const smtpUser = settingsData.smtpUser ?? null;
    const smtpPassword = settingsData.smtpPassword ?? null;
    const smtpFromName = settingsData.smtpFromName ?? null;
    const smtpFromEmail = settingsData.smtpFromEmail ?? null;
    
    const updatedSettings: CompanySettings = { 
      ...settingsData,
      logoUrl,
      website,
      taxId,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      smtpFromName,
      smtpFromEmail,
      id: 1, 
      updatedAt: new Date()
    };
    
    this.companySettingsData.set(1, updatedSettings);
    return updatedSettings;
  }

  // Monthly Revenue methods (implementation for in-memory storage)
  private monthlyRevenueData: Map<string, MonthlyRevenue> = new Map();
  private monthlyRevenueCurrentId: number = 1;

  async getMonthlyRevenue(year: number, month: number): Promise<MonthlyRevenue | undefined> {
    const key = `${year}-${month}`;
    return this.monthlyRevenueData.get(key);
  }
  
  async getMonthlyRevenuesByYear(year: number): Promise<MonthlyRevenue[]> {
    return Array.from(this.monthlyRevenueData.values())
      .filter(revenue => revenue.year === year)
      .sort((a, b) => a.month - b.month);
  }
  
  async updateMonthlyRevenue(year: number, month: number, data: Partial<InsertMonthlyRevenue>): Promise<MonthlyRevenue> {
    const key = `${year}-${month}`;
    const existingRevenue = this.monthlyRevenueData.get(key);
    
    if (existingRevenue) {
      const updatedRevenue: MonthlyRevenue = {
        ...existingRevenue,
        ...data,
        updatedAt: new Date()
      };
      this.monthlyRevenueData.set(key, updatedRevenue);
      return updatedRevenue;
    } else {
      const id = this.monthlyRevenueCurrentId++;
      const totalAmount = data.totalAmount || "0";
      const orderCount = data.orderCount || 0;
      const averageOrderValue = data.averageOrderValue || "0";
      
      const newRevenue: MonthlyRevenue = {
        id,
        year,
        month,
        totalAmount,
        orderCount,
        averageOrderValue,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.monthlyRevenueData.set(key, newRevenue);
      return newRevenue;
    }
  }
  
  async calculateCurrentMonthRevenue(): Promise<MonthlyRevenue> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Get all completed orders for current month with a cost
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    const orders = Array.from(this.serviceOrdersData.values())
      .filter(order => 
        // Incluimos órdenes completadas y de garantía
        (order.status === 'completed' || order.status === 'warranty') && 
        order.completionDate &&
        order.completionDate >= startOfMonth &&
        order.completionDate <= endOfMonth &&
        // Las órdenes de garantía ya tienen costo = 0, pero verificamos que sea un valor válido
        order.cost !== null && 
        order.cost !== undefined
      );
    
    const orderCount = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + (order.cost || 0), 0);
    const averageOrderValue = orderCount > 0 ? totalAmount / orderCount : 0;
    
    return this.updateMonthlyRevenue(currentYear, currentMonth, {
      totalAmount: totalAmount.toString(),
      orderCount,
      averageOrderValue: averageOrderValue.toString()
    });
  }
  
  async getRevenueHistory(limit: number): Promise<MonthlyRevenue[]> {
    return Array.from(this.monthlyRevenueData.values())
      .sort((a, b) => {
        // Ordenar primero por año (descendente) y luego por mes (descendente)
        if (a.year !== b.year) {
          return b.year - a.year;
        }
        return b.month - a.month;
      })
      .slice(0, limit);
  }
}

// Exportamos la implementación de base de datos
export const storage = new DatabaseStorage();
