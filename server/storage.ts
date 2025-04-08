import { 
  users, type User, type InsertUser,
  clients, type Client, type InsertClient,
  technicians, type Technician, type InsertTechnician,
  equipment, type Equipment, type InsertEquipment,
  serviceOrders, type ServiceOrder, type InsertServiceOrder, type UpdateServiceOrder,
  companySettings, type CompanySettings, type InsertCompanySettings
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

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

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
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

  // Session store
  sessionStore: session.Store;
}

// Memory Storage Implementation
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const { confirmPassword, ...userData } = insertUser;
    
    // Si se está creando un usuario desde el constructor, la contraseña ya estará hasheada
    // De lo contrario, hashear la contraseña aquí
    let hashedPassword = userData.password;
    if (!userData.password.includes('.')) {
      hashedPassword = await hashPassword(userData.password);
    }
    
    // Asegurarnos de que role tiene un valor por defecto si no viene
    const role = userData.role || "user";
    
    const user: User = { 
      ...userData, 
      password: hashedPassword,
      role,
      id, 
      createdAt: new Date() 
    };
    this.usersData.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const { confirmPassword, ...updatedData } = userData;
    
    // Si se está actualizando la contraseña, hashearla
    if (updatedData.password && !updatedData.password.includes('.')) {
      updatedData.password = await hashPassword(updatedData.password);
    }
    
    const updatedUser = { ...user, ...updatedData };
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
    
    const equipment: Equipment = { 
      ...insertEquipment, 
      description,
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
    return Array.from(this.equipmentData.values()).filter(
      (equipment) => equipment.clientId === clientId,
    );
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
    
    const serviceOrder: ServiceOrder = { 
      ...insertServiceOrder, 
      status,
      technicianId,
      notes,
      materialsUsed,
      expectedDeliveryDate,
      clientSignature,
      photos,
      clientApproval,
      clientApprovalDate,
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
    
    const updatedSettings: CompanySettings = { 
      ...settingsData,
      logoUrl,
      website,
      taxId,
      id: 1, 
      updatedAt: new Date()
    };
    
    this.companySettingsData.set(1, updatedSettings);
    return updatedSettings;
  }
}

export const storage = new MemStorage();
