import nodemailer from 'nodemailer';
import { CompanySettings } from '@shared/schema';
import { db } from './db';
import { companySettings } from '@shared/schema';
import { TransportOptions } from 'nodemailer';

// Variables para almacenar la configuración del correo
let emailHost: string;
let emailPort: number;
let emailUser: string;
let emailPass: string;
let emailSecure: boolean;
let emailFromName: string;
let emailFromAddress: string;

// Función para configurar el servicio de correo manualmente
export function configureEmailService(
  host: string,
  port: number,
  user: string,
  password: string,
  secure: boolean = true,
  fromName?: string,
  fromAddress?: string
) {
  emailHost = host;
  emailPort = port;
  emailUser = user;
  emailPass = password;
  emailSecure = secure;
  emailFromName = fromName || 'Sistemas RST';
  emailFromAddress = fromAddress || user;

  // Verificar que todos los campos requeridos estén presentes
  if (!emailHost || !emailPort || !emailUser || !emailPass) {
    throw new Error('La configuración de correo electrónico está incompleta');
  }
}

// Cargar configuración desde la base de datos
export async function loadEmailConfigFromDatabase(): Promise<boolean> {
  try {
    const [settings] = await db.select().from(companySettings).limit(1);
    
    if (!settings || 
        !settings.smtpHost || 
        !settings.smtpPort || 
        !settings.smtpUser || 
        !settings.smtpPassword) {
      console.log('Configuración de correo en la base de datos está incompleta');
      return false;
    }
    
    // Mejora: Loggear qué campos están faltando para depuración
    const missingFields = [];
    if (!settings.smtpHost) missingFields.push('smtpHost');
    if (!settings.smtpPort) missingFields.push('smtpPort');
    if (!settings.smtpUser) missingFields.push('smtpUser');
    if (!settings.smtpPassword) missingFields.push('smtpPassword');
    
    if (missingFields.length > 0) {
      console.log(`Campos SMTP faltantes: ${missingFields.join(', ')}`);
    }
    
    emailHost = settings.smtpHost;
    emailPort = settings.smtpPort;
    emailUser = settings.smtpUser;
    emailPass = settings.smtpPassword;
    emailSecure = settings.smtpSecure ?? true;
    emailFromName = settings.smtpFromName || settings.name;
    emailFromAddress = settings.smtpFromEmail || settings.smtpUser;
    
    console.log(`Configuración de correo cargada desde la base de datos para host: ${emailHost}:${emailPort}`);
    return true;
  } catch (error) {
    console.error('Error al cargar configuración de correo desde la base de datos:', error);
    return false;
  }
}

// Interfaz para nuestro configuración de transporte (con los tipos correctos)
interface SMTPTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls: {
    rejectUnauthorized: boolean;
    minVersion: string;
  };
  debug: boolean;
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
  rateLimit?: number;
  rateDelta?: number;
}

// Crear el transporter de nodemailer
const createTransporter = () => {
  if (!emailHost || !emailPort || !emailUser || !emailPass) {
    throw new Error('La configuración de correo electrónico no está inicializada');
  }

  // Detectar si es un host de Hostinger
  const isHostinger = emailHost.includes('hostinger');
  
  // Ajustar configuración según el proveedor y el puerto
  let authType: any = undefined; // Por defecto, nodemailer elige automáticamente
  let connectionTimeoutMs: number = 5000; // Timeout estándar
  
  // Configuraciones específicas según el proveedor y puerto
  if (isHostinger) {
    console.log("Configurando para servidor Hostinger");
    
    // Hostinger funciona mejor con autenticación tipo 'login' y tiempos de espera más largos
    authType = 'login';
    connectionTimeoutMs = 15000;
    
    // Diferentes puertos pueden requerir configuraciones distintas
    if (emailPort === 465) {
      console.log("Usando configuración para puerto 465 (SSL/TLS)");
    } else if (emailPort === 587) {
      console.log("Usando configuración para puerto 587 (STARTTLS)");
    }
  }
  
  // Crear configuración base común con optimizaciones para velocidad
  const transporterConfig: any = {
    host: emailHost,
    port: emailPort,
    secure: emailSecure, // true para 465, false para otros puertos
    auth: {
      user: emailUser,
      pass: emailPass
    },
    tls: {
      rejectUnauthorized: false, // Permite certificados autofirmados (útil para desarrollo)
      minVersion: 'TLSv1.2'      // Especifica versión mínima de TLS (para compatibilidad)
    },
    debug: true, // Habilitar depuración para diagnóstico
    connectionTimeout: Math.min(connectionTimeoutMs, 8000), // Máximo 8 segundos
    greetingTimeout: Math.min(connectionTimeoutMs, 8000),   // Máximo 8 segundos
    socketTimeout: Math.min(connectionTimeoutMs * 1.5, 12000), // Máximo 12 segundos
    // Optimizaciones para velocidad de entrega
    pool: true,               // Habilitar pool de conexiones para reutilizar conexiones
    maxConnections: 5,        // Máximo 5 conexiones simultáneas
    maxMessages: 100,         // Hasta 100 mensajes por conexión antes de cerrar
    rateLimit: 14,           // Máximo 14 emails por segundo (buena velocidad sin ser spam)
    rateDelta: 1000,         // Ventana de tiempo de 1 segundo para rate limit
    // Configuraciones adicionales para mejorar la entrega
    logger: false,           // Desactivar logging extenso para mayor velocidad
    transactionLog: false,   // Desactivar log de transacciones para mayor velocidad
    // Headers adicionales que pueden ayudar con la entrega rápida
    headers: {
      'X-Priority': '1',     // Alta prioridad
      'X-MSMail-Priority': 'High',
      'Importance': 'high'
    }
  };
  
  // Aplicar autenticación específica si es necesario
  if (authType) {
    transporterConfig.auth.type = authType;
  }
  
  console.log("Configurando transporter con:", JSON.stringify({
    ...transporterConfig, 
    auth: { 
      user: transporterConfig.auth.user,
      pass: "**********" // Ocultamos la contraseña en los logs
    }
  }));
  
  // Usar cualquier y aserciones de tipo para evitar problemas de compatibilidad
  return nodemailer.createTransport(transporterConfig as any);
};

// Interfaz para el contenido del correo
interface EmailContent {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Función para verificar conexión al servidor SMTP
async function verifySmtpConnection(): Promise<boolean> {
  try {
    // Crear un transportador con una configuración más simple para prueba inicial
    // Esto puede ayudar a identificar si el problema es de configuración o credenciales
    console.log('Verificando conexión SMTP con configuración básica...');
    
    // Mostrar la configuración exacta que estamos usando (ocultando la contraseña)
    console.log(`Verificando con host=${emailHost}, port=${emailPort}, user=${emailUser}, secure=${emailSecure}`);
    
    // Detectar si estamos usando Hostinger para configuración especializada
    const isHostinger = emailHost.includes('hostinger');
    
    // Crear varias configuraciones de transporte para probar diferentes métodos
    // e identificar cuál funciona mejor
    let transporter;
    
    // Primera: Configuración estándar
    const standardConfig: SMTPTransportConfig = {
      host: emailHost,
      port: emailPort,
      secure: emailSecure,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      debug: true
    };
    
    // Segunda: Configuración para Hostinger (si aplica)
    if (isHostinger) {
      console.log("Usando configuración especial para Hostinger");
      
      // Para Hostinger es mejor usar un método de autenticación específico
      const hostingerConfig = {
        host: emailHost,
        port: emailPort,
        secure: emailSecure,
        debug: true,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        auth: {
          user: emailUser,
          pass: emailPass,
          type: 'login' // Forzar 'login' para Hostinger
        } as any,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
      };
      
      // Intentamos primero con la configuración de Hostinger
      try {
        console.log("Verificando con configuración especializada para Hostinger...");
        transporter = nodemailer.createTransport(hostingerConfig as any);
        await transporter.verify();
        console.log('Verificación con configuración especializada exitosa');
        return true;
      } catch (error) {
        const hostingerError = error as Error;
        console.error('Falló con configuración de Hostinger:', hostingerError.message);
        // Si falla, intentamos con la configuración estándar 
      }
    }
    
    // Si no es Hostinger o falló la configuración específica, intentamos con la estándar
    transporter = nodemailer.createTransport(standardConfig as any);
    await transporter.verify();
    console.log('Verificación SMTP exitosa: El servidor está listo para recibir mensajes');
    return true;
  } catch (error) {
    console.error('Error al verificar conexión SMTP:', error);
    if (error instanceof Error) {
      console.error(`Mensaje de error en verificación: ${error.message}`);
      
      // Añadir información específica para errores comunes
      if (error.message.includes('Invalid login') || error.message.includes('authentication failed')) {
        console.error('Este es un error de autenticación. Por favor verifica que:');
        console.error('1. El nombre de usuario y contraseña sean correctos');
        console.error('2. La cuenta de correo tenga permisos para enviar correos a través de SMTP');
        console.error('3. No haya restricciones de seguridad en el host (como autenticación de dos factores)');
        console.error('4. Si has habilitado "App Passwords" o contraseñas de aplicación, usa esa contraseña en lugar de la contraseña principal');
      }
    }
    throw error; // Re-lanzar el error para manejarlo en el nivel superior
  }
}

// Interfaz extendida para el contenido del correo con adjuntos
export interface EmailContentWithAttachments extends EmailContent {
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

// Función auxiliar para reintentos con backoff exponencial
async function sendEmailWithRetry(
  transporter: any,
  mailOptions: any,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      console.log(`Intento ${attempt}/${maxRetries} falló:`, error instanceof Error ? error.message : error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Backoff exponencial: esperar más tiempo en cada intento
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Esperando ${delay}ms antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Función para enviar correo electrónico
export async function sendEmail(content: EmailContentWithAttachments): Promise<boolean> {
  try {
    console.log(`Preparando envío de correo a: ${content.to} con asunto: ${content.subject}`);
    
    // Primero verificamos la conexión al servidor SMTP
    await verifySmtpConnection();
    
    const transporter = createTransporter();
    
    // Añadir más información de depuración
    console.log(`Usando servidor de correo: ${emailHost}:${emailPort}`);
    console.log(`Usuario de correo: ${emailUser}`);
    console.log(`Dirección de origen: ${emailFromAddress}`);
    
    // Preparar las opciones de correo con headers optimizados para entrega rápida
    const mailOptions: any = {
      from: `"${emailFromName}" <${emailFromAddress}>`,
      to: content.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      // Headers para mejorar la velocidad y prioridad de entrega
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Sistemas RST v1.0',
        'Message-ID': `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@sistemasrst.com>`,
        // Headers para evitar ser marcado como spam
        'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN',
        'List-Unsubscribe': '<mailto:no-reply@sistemasrst.com?subject=unsubscribe>',
        // Headers para mejor deliverability
        'Return-Path': emailFromAddress,
        'Reply-To': emailFromAddress
      },
      // Configuraciones adicionales para entrega rápida
      envelope: {
        from: emailFromAddress,
        to: content.to
      },
      // Deshabilitar seguimiento para mayor velocidad
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false }
      }
    };
    
    // Añadir adjuntos si existen
    if (content.attachments && content.attachments.length > 0) {
      mailOptions.attachments = content.attachments;
      console.log(`Adjuntos: ${content.attachments.length} archivo(s)`);
    }
    
    console.log(`Opciones de correo: ${JSON.stringify({
      ...mailOptions,
      // No mostrar el HTML ni archivos binarios completos para no saturar los logs
      html: mailOptions.html ? '(contenido HTML presente)' : undefined,
      attachments: mailOptions.attachments ? `(${mailOptions.attachments.length} adjuntos)` : undefined
    })}`);
    
    // Usar la función de reintento para mejorar la confiabilidad
    const info = await sendEmailWithRetry(transporter, mailOptions, 3, 500);
    
    console.log(`Correo enviado correctamente: ${info.messageId}`);
    if (info.accepted && info.accepted.length > 0) {
      console.log(`Direcciones aceptadas: ${info.accepted.join(', ')}`);
    }
    if (info.rejected && info.rejected.length > 0) {
      console.log(`Direcciones rechazadas: ${info.rejected.join(', ')}`);
    }
    
    // Cerrar la conexión del transporter para liberar recursos
    if (transporter && typeof transporter.close === 'function') {
      transporter.close();
    }
    
    return true;
  } catch (error) {
    console.error('Error al enviar correo electrónico:', error);
    if (error instanceof Error) {
      console.error(`Mensaje de error: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    }
    throw error; // Re-lanzar el error para que sea manejado adecuadamente en routes.ts
  }
}

// Función para generar el contenido HTML para la notificación de nueva orden
export function generateNewOrderEmail(
  orderNumber: string,
  clientName: string,
  equipmentName: string,
  description: string,
  companySettings: CompanySettings
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Nueva Orden de Servicio</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          padding: 20px;
          background-color: #f5f5f5;
          margin-bottom: 20px;
        }
        .order-details {
          border: 1px solid #ddd;
          padding: 15px;
          margin-bottom: 20px;
          background-color: #f9f9f9;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          padding: 10px;
          border-top: 1px solid #ddd;
        }
        h1 {
          color: #2c3e50;
        }
        .logo {
          max-width: 150px;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Sistemas RST</h1>
        <p>${companySettings.address || ''}<br>${companySettings.phone || ''}</p>
      </div>
      
      <p>Estimado(a) <strong>${clientName}</strong>,</p>
      
      <p>Hemos registrado una nueva orden de servicio para tu equipo. A continuación, los detalles:</p>
      
      <div class="order-details">
        <p><strong>Número de Orden:</strong> ${orderNumber}</p>
        <p><strong>Equipo:</strong> ${equipmentName}</p>
        <p><strong>Descripción:</strong> ${description || 'No se proporcionó descripción'}</p>
      </div>
      
      <p>Puedes comunicarte con nosotros para cualquier consulta sobre el servicio.</p>
      
      <p>Saludos cordiales,<br>
      El equipo de ${companySettings.name}</p>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${companySettings.name} - Todos los derechos reservados</p>
        <p>${companySettings.email || ''} | ${companySettings.website || ''}</p>
      </div>
    </body>
    </html>
  `;
}