import PDFDocument from 'pdfkit';
import { ServiceOrder, Client, Equipment, Technician, CompanySettings } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import puppeteer from 'puppeteer';

// Función para generar PDF de orden de servicio
export async function generateServiceOrderPDF(
  serviceOrder: ServiceOrder,
  client: Client,
  equipment: Equipment,
  technician: Technician,
  companySettings: CompanySettings
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Crear un nuevo documento PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Orden de Servicio ${serviceOrder.orderNumber}`,
          Author: companySettings.name || 'Sistemas RST',
          Subject: 'Orden de Servicio',
        }
      });

      // Crear un stream para acumular datos del PDF
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Iniciar la generación del PDF
      createServiceOrderPDFContent(doc, serviceOrder, client, equipment, technician, companySettings);

      // Finalizar el documento para generar el archivo
      doc.end();
    } catch (error) {
      console.error('Error al generar PDF:', error);
      reject(error);
    }
  });
}

// Función para crear el contenido del PDF
function createServiceOrderPDFContent(
  doc: PDFKit.PDFDocument,
  serviceOrder: ServiceOrder,
  client: Client,
  equipment: Equipment,
  technician: Technician,
  companySettings: CompanySettings
) {
  // Añadir fuentes y configuración
  doc.font('Helvetica');
  
  // Añadir logo y encabezado
  addHeader(doc, companySettings);
  
  // Título del documento
  doc.fontSize(16)
     .fillColor('#333333')
     .text('ORDEN DE SERVICIO', { align: 'center' })
     .moveDown(0.5);
  
  // Información de la orden
  doc.fontSize(14)
     .fillColor('#333333')
     .text(`Folio: ${serviceOrder.orderNumber}`, { align: 'center' })
     .moveDown(1);
  
  // Detalles del cliente y equipo
  addClientSection(doc, client);
  addEquipmentSection(doc, equipment);
  
  // Detalles del servicio
  addServiceDetailsSection(doc, serviceOrder, technician);
  
  // Fechas de creación y entrega
  addDatesSection(doc, serviceOrder);
  
  // Descripción del problema y solución
  addDescriptionSection(doc, serviceOrder);
  
  // Materiales utilizados
  if (serviceOrder.materialsUsed) {
    addMaterialsSection(doc, serviceOrder);
  }
  
  // Costos
  addCostSection(doc, serviceOrder);
  
  // Firmas (cliente y técnico)
  addSignatureSection(doc, serviceOrder);
  
  // Pie de página
  addFooter(doc, companySettings);
}

// Función para añadir el encabezado con logo
function addHeader(doc: PDFKit.PDFDocument, companySettings: CompanySettings) {
  // Dibujar un rectángulo de fondo
  doc.rect(50, 50, doc.page.width - 100, 80)
     .fillAndStroke('#f8f9fa', '#dee2e6');
  
  // Información de la empresa
  doc.fontSize(16)
     .fillColor('#333333')
     .text(companySettings.name || 'Sistemas RST', 200, 65)
     .fontSize(10)
     .fillColor('#666666')
     .text(companySettings.address || '', 200, doc.y + 5)
     .text(`Tel: ${companySettings.phone || ''}`, 200, doc.y + 5);
     
  if (companySettings.email) {
    doc.text(`Email: ${companySettings.email}`, 200, doc.y + 5);
  }
  
  // Verificar si hay logo
  if (companySettings.logoUrl) {
    try {
      // Para simplificar, asumimos que el logo es una URL relativa a la carpeta public
      const logoPath = path.join(process.cwd(), 'public', companySettings.logoUrl);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 60, 60, { width: 120 });
      }
    } catch (error) {
      console.error('Error al cargar el logo:', error);
    }
  }
  
  doc.moveDown(3);
}

// Función para añadir la sección de cliente
function addClientSection(doc: PDFKit.PDFDocument, client: Client) {
  doc.fontSize(12)
     .fillColor('#333333')
     .text('DATOS DEL CLIENTE', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(10)
     .fillColor('#666666')
     .text(`Nombre: ${client.name}`, { continued: true })
     .text(`    Contacto: ${client.contactName || 'N/A'}`, { align: 'left' });
  
  doc.text(`Teléfono: ${client.phone || 'N/A'}`, { continued: true })
     .text(`    Email: ${client.email || 'N/A'}`, { align: 'left' });
     
  doc.text(`Dirección: ${client.address || 'N/A'}`);
  
  doc.moveDown(1);
}

// Función para añadir la sección de equipo
function addEquipmentSection(doc: PDFKit.PDFDocument, equipment: Equipment) {
  doc.fontSize(12)
     .fillColor('#333333')
     .text('DATOS DEL EQUIPO', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(10)
     .fillColor('#666666')
     .text(`Tipo: ${equipment.type || 'N/A'}`, { continued: true })
     .text(`    Marca: ${equipment.brand || 'N/A'}`, { align: 'left' });
  
  doc.text(`Modelo: ${equipment.model || 'N/A'}`, { continued: true })
     .text(`    S/N: ${equipment.serialNumber || 'N/A'}`, { align: 'left' });
     
  doc.moveDown(1);
}

// Función para añadir la sección de detalles del servicio
function addServiceDetailsSection(doc: PDFKit.PDFDocument, serviceOrder: ServiceOrder, technician: Technician) {
  doc.fontSize(12)
     .fillColor('#333333')
     .text('DETALLES DEL SERVICIO', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(10)
     .fillColor('#666666');
     
  // Obtener el nombre del técnico desde una relación
  const technicianName = technician.specialization || 'No asignado';
  doc.text(`Técnico asignado: ${technicianName}`);
  
  doc.text(`Estado: ${mapStatusToSpanish(serviceOrder.status) || 'Pendiente'}`);
  
  doc.moveDown(1);
}

// Función para convertir el status en texto legible en español
function mapStatusToSpanish(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pendiente',
    'waiting_approval': 'Esperando Aprobación',
    'approved': 'Aprobado',
    'in_progress': 'En Progreso',
    'completed': 'Completado',
    'cancelled': 'Cancelado',
    'warranty': 'En Garantía'
  };
  
  return statusMap[status] || status;
}

// Función para añadir la sección de fechas
function addDatesSection(doc: PDFKit.PDFDocument, serviceOrder: ServiceOrder) {
  doc.fontSize(10)
     .fillColor('#666666')
     .text(`Fecha de recepción: ${format(new Date(serviceOrder.requestDate), 'dd/MM/yyyy')}`, { continued: true });
  
  if (serviceOrder.expectedDeliveryDate) {
    doc.text(`    Entrega estimada: ${format(new Date(serviceOrder.expectedDeliveryDate), 'dd/MM/yyyy')}`, { align: 'left' });
  } else {
    doc.text(`    Entrega estimada: N/A`, { align: 'left' });
  }
  
  if (serviceOrder.completionDate) {
    doc.text(`Fecha de entrega real: ${format(new Date(serviceOrder.completionDate), 'dd/MM/yyyy')}`);
  }
  
  doc.moveDown(1);
}

// Función para añadir la sección de descripción
function addDescriptionSection(doc: PDFKit.PDFDocument, serviceOrder: ServiceOrder) {
  doc.fontSize(12)
     .fillColor('#333333')
     .text('DESCRIPCIÓN DEL PROBLEMA', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(10)
     .fillColor('#666666')
     .text(serviceOrder.description || 'No se proporcionó descripción');
  
  doc.moveDown(1);
  
  // Añadir notas si existen
  if (serviceOrder.notes) {
    doc.fontSize(12)
       .fillColor('#333333')
       .text('NOTAS ADICIONALES', { underline: true })
       .moveDown(0.5);
    
    doc.fontSize(10)
       .fillColor('#666666')
       .text(serviceOrder.notes);
    
    doc.moveDown(1);
  }
}

// Función para añadir la sección de materiales
function addMaterialsSection(doc: PDFKit.PDFDocument, serviceOrder: ServiceOrder) {
  doc.fontSize(12)
     .fillColor('#333333')
     .text('MATERIALES UTILIZADOS', { underline: true })
     .moveDown(0.5);
  
  doc.fontSize(10)
     .fillColor('#666666')
     .text(serviceOrder.materialsUsed || 'Ninguno');
  
  doc.moveDown(1);
}

// Función para añadir la sección de costos
function addCostSection(doc: PDFKit.PDFDocument, serviceOrder: ServiceOrder) {
  doc.fontSize(12)
     .fillColor('#333333')
     .text('COSTO DEL SERVICIO', { underline: true })
     .moveDown(0.5);
  
  if (serviceOrder.status === 'warranty') {
    doc.fontSize(10)
       .fillColor('#666666')
       .text('Este servicio está cubierto por garantía - Sin costo');
  } else {
    doc.fontSize(10)
       .fillColor('#666666');
    
    if (serviceOrder.cost) {
      doc.text(`Costo total: $${serviceOrder.cost.toFixed(2)} MXN`);
    } else {
      doc.text('Costo total: Pendiente');
    }
  }
  
  doc.moveDown(1);
}

// Función para añadir la sección de firmas
function addSignatureSection(doc: PDFKit.PDFDocument, serviceOrder: ServiceOrder) {
  doc.fontSize(12)
     .fillColor('#333333')
     .text('FIRMAS', { underline: true })
     .moveDown(0.5);
  
  // Dibujar líneas para firmas
  const startY = doc.y + 40;
  doc.moveTo(100, startY).lineTo(250, startY).stroke();
  doc.moveTo(350, startY).lineTo(500, startY).stroke();
  
  // Textos bajo las líneas
  doc.fontSize(10)
     .fillColor('#666666')
     .text('Técnico', 150, startY + 5, { align: 'center' })
     .text('Cliente', 400, startY + 5, { align: 'center' });
  
  // Si hay firma del cliente, añadirla
  if (serviceOrder.clientSignature) {
    try {
      const signatureImg = Buffer.from(serviceOrder.clientSignature.split(',')[1], 'base64');
      doc.image(signatureImg, 350, startY - 40, { width: 150 });
    } catch (error) {
      console.error('Error al procesar la firma del cliente:', error);
    }
  }
  
  doc.moveDown(3);
}

// Función para añadir el pie de página
function addFooter(doc: PDFKit.PDFDocument, companySettings: CompanySettings) {
  // Línea separadora
  doc.moveTo(50, doc.page.height - 50)
     .lineTo(doc.page.width - 50, doc.page.height - 50)
     .stroke();
  
  // Texto del pie de página
  doc.fontSize(8)
     .fillColor('#999999')
     .text(
       `© ${new Date().getFullYear()} ${companySettings.name || 'Sistemas RST'} - Todos los derechos reservados`,
       50,
       doc.page.height - 40,
       { align: 'center', width: doc.page.width - 100 }
     );
  
  // Información de contacto
  let contactInfo = '';
  if (companySettings.phone) contactInfo += `Tel: ${companySettings.phone}`;
  if (companySettings.email) contactInfo += (contactInfo ? ' | ' : '') + `Email: ${companySettings.email}`;
  if (companySettings.website) contactInfo += (contactInfo ? ' | ' : '') + companySettings.website;
  
  if (contactInfo) {
    doc.text(
      contactInfo,
      50,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width - 100 }
    );
  }
  
  // Número de página
  doc.text(
    `Página 1 de 1`,
    50,
    doc.page.height - 20,
    { align: 'center', width: doc.page.width - 100 }
  );
}

// Nueva función: Generar PDF múltiple
export async function generateMultipleServiceOrdersPDF(
  orders: {
    serviceOrder: ServiceOrder,
    client: Client,
    equipment: Equipment,
    technician: Technician,
    companySettings: CompanySettings
  }[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Órdenes de Servicio` ,
          Author: orders[0]?.companySettings?.name || 'Sistemas RST',
          Subject: 'Órdenes de Servicio',
        }
      });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      // Generar una página por cada orden
      orders.forEach((item, idx) => {
        if (idx > 0) doc.addPage();
        createServiceOrderPDFContent(
          doc,
          item.serviceOrder,
          item.client,
          item.equipment,
          item.technician,
          item.companySettings
        );
      });
      doc.end();
    } catch (error) {
      console.error('Error al generar PDF múltiple:', error);
      reject(error);
    }
  });
}

// Función para rellenar la plantilla HTML con los datos de la orden
function fillOrderHtmlTemplate(orderData: Record<string, any>): string {
  let template = fs.readFileSync(path.join(__dirname, 'pdf-template.html'), 'utf8');
  // Reemplazo simple de {{campo}} por el valor correspondiente
  Object.entries(orderData).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    template = template.replace(regex, value ?? '');
  });
  // Manejo simple para arrays (fotos)
  if (Array.isArray(orderData.photos)) {
    const photosHtml = orderData.photos.map((url: string) => `<img src="${url}" />`).join('');
    template = template.replace(/{{#each photos}}([\s\S]*?){{\/each}}/, photosHtml);
  }
  // Firma
  if (orderData.clientSignature) {
    template = template.replace(/{{#if clientSignature}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/, `<img src="${orderData.clientSignature}" class="signature" />`);
  } else {
    template = template.replace(/{{#if clientSignature}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/, '<div class="signature"></div>');
  }
  // Logo
  if (orderData.companyLogo) {
    template = template.replace(/{{#if companyLogo}}([\s\S]*?){{\/if}}/, `<img src="${orderData.companyLogo}" class="logo" />`);
  } else {
    template = template.replace(/{{#if companyLogo}}([\s\S]*?){{\/if}}/, '');
  }
  return template;
}

// Función para generar PDF de una orden usando Puppeteer
export async function generateOrderHtmlPDF(orderData: Record<string, any>): Promise<Buffer> {
  const html = fillOrderHtmlTemplate(orderData);
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdfBuffer;
}