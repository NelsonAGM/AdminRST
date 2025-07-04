import { pgTable, text, serial, integer, timestamp, boolean, pgEnum, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'technician', 'user']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending', 
  'waiting_approval', 
  'approved', 
  'in_progress', 
  'completed', 
  'cancelled',
  'warranty'
]);
export const technicianStatusEnum = pgEnum('technician_status', ['available', 'in_service', 'unavailable']);
export const equipmentTypeEnum = pgEnum('equipment_type', ['desktop', 'laptop', 'server', 'printer', 'network', 'other']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default('user'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Technicians table
export const technicians = pgTable("technicians", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  specialization: text("specialization").notNull(),
  status: technicianStatusEnum("status").notNull().default('available'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Equipment table - Desacoplado de clientes para mayor flexibilidad
export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  type: equipmentTypeEnum("type").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serialNumber: text("serial_number").notNull(),
  description: text("description"),
  location: text("location"),  // Ubicación física del equipo (opcional)
  company: text("company"),    // Empresa a la que pertenece (opcional, para referencia)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Service Orders table
export const serviceOrders = pgTable("service_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  equipmentId: integer("equipment_id").references(() => equipment.id).notNull(),
  technicianId: integer("technician_id").references(() => technicians.id),
  description: text("description").notNull(),
  status: orderStatusEnum("status").notNull().default('pending'),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  completionDate: timestamp("completion_date"),
  notes: text("notes"),
  materialsUsed: text("materials_used"),
  clientSignature: text("client_signature"),
  photos: text("photos").array(),
  clientApproval: boolean("client_approval").default(false),
  clientApprovalDate: timestamp("client_approval_date"),
  cost: integer("cost"),
});

// Company Settings table
export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  website: text("website"),
  taxId: text("tax_id"),
  // Configuración de correo electrónico
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpSecure: boolean("smtp_secure").default(true),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpFromName: text("smtp_from_name"),
  smtpFromEmail: text("smtp_from_email"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Monthly Revenue table - to track financial data by month
export const monthlyRevenue = pgTable("monthly_revenue", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  orderCount: integer("order_count").notNull().default(0),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// Insert Schemas
// Esquema para crear/validar usuario con confirmPassword para el frontend
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// Esquema para la base de datos (sin confirmPassword)
export const insertUserDbSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  });

export const loginUserSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });

export const insertTechnicianSchema = createInsertSchema(technicians).omit({ id: true, createdAt: true });

export const insertEquipmentSchema = createInsertSchema(equipment).omit({ id: true, createdAt: true }).extend({
  location: z.string().optional(),
  company: z.string().optional(),
});

export const insertServiceOrderSchema = createInsertSchema(serviceOrders).omit({ 
  id: true, 
  orderNumber: true, 
  completionDate: true,
  requestDate: true
}).extend({
  photos: z.array(z.string()).optional(),
  clientSignature: z.string().optional()
});

export const updateServiceOrderSchema = createInsertSchema(serviceOrders).omit({ 
  id: true, 
  orderNumber: true,
  requestDate: true 
}).extend({
  photos: z.array(z.string()).optional(),
  clientSignature: z.string().optional()
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({ 
  id: true, 
  updatedAt: true 
});

export const insertMonthlyRevenueSchema = createInsertSchema(monthlyRevenue).omit({
  id: true,
  createdAt: true, 
  updatedAt: true
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserDb = z.infer<typeof insertUserDbSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
export type Technician = typeof technicians.$inferSelect;

export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

export type InsertServiceOrder = z.infer<typeof insertServiceOrderSchema>;
export type UpdateServiceOrder = z.infer<typeof updateServiceOrderSchema>;
export type ServiceOrder = typeof serviceOrders.$inferSelect;

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;

export type InsertMonthlyRevenue = z.infer<typeof insertMonthlyRevenueSchema>;
export type MonthlyRevenue = typeof monthlyRevenue.$inferSelect;
