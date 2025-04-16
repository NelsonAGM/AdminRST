import nodemailer from 'nodemailer';
import { CompanySettings } from '@shared/schema';

// Variables para almacenar la configuración del correo
let emailHost: string;
let emailPort: number;
let emailUser: string;
let emailPass: string;
let emailSecure: boolean;
let emailFromAddress: string;

// Función para configurar el servicio de correo
export function configureEmailService(
  host: string,
  port: number,
  user: string,
  password: string,
  secure: boolean = true,
  fromAddress?: string
) {
  emailHost = host;
  emailPort = port;
  emailUser = user;
  emailPass = password;
  emailSecure = secure;
  emailFromAddress = fromAddress || user;

  // Verificar que todos los campos requeridos estén presentes
  if (!emailHost || !emailPort || !emailUser || !emailPass) {
    throw new Error('La configuración de correo electrónico está incompleta');
  }
}

// Crear el transporter de nodemailer
const createTransporter = () => {
  if (!emailHost || !emailPort || !emailUser || !emailPass) {
    throw new Error('La configuración de correo electrónico no está inicializada');
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailSecure, // true para 465, false para otros puertos
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

// Interfaz para el contenido del correo
interface EmailContent {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Función para enviar correo electrónico
export async function sendEmail(content: EmailContent): Promise<boolean> {
  try {
    console.log(`Preparando envío de correo a: ${content.to} con asunto: ${content.subject}`);
    
    const transporter = createTransporter();
    
    const info = await transporter.sendMail({
      from: `"Sistemas RST" <${emailFromAddress}>`,
      to: content.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    
    console.log(`Correo enviado correctamente: ${info.messageId}`);
    
    return true;
  } catch (error) {
    console.error('Error al enviar correo electrónico:', error);
    console.error(JSON.stringify(error, null, 2));
    return false;
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