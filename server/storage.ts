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
    
    // Initialize with admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      fullName: "Administrador",
      email: "admin@example.com",
      role: "admin",
      confirmPassword: "admin123"
    });
    
    // Initialize company settings
    this.companySettingsData.set(1, {
      id: 1,
      name: "TechService",
      logoUrl: "",
      address: "Av. Principal 123",
      phone: "+123456789",
      email: "info@techservice.com",
      website: "www.techservice.com",
      taxId: "123-456-789",
      updatedAt: new Date()
    });
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
    const user: User = { ...userData, id, createdAt: new Date() };
    this.usersData.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const { confirmPassword, ...updatedData } = userData;
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
    const technician: Technician = { ...insertTechnician, id, createdAt: new Date() };
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
    const equipment: Equipment = { ...insertEquipment, id, createdAt: new Date() };
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
    const serviceOrder: ServiceOrder = { 
      ...insertServiceOrder, 
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
    const updatedSettings: CompanySettings = { 
      ...settingsData, 
      id: 1, 
      updatedAt: new Date()
    };
    this.companySettingsData.set(1, updatedSettings);
    return updatedSettings;
  }
}

export const storage = new MemStorage();
