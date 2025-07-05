// Script de prueba para verificar la implementación de PDFShift
import { generateOrderHtmlPDF } from './server/pdf-generator.js';
import fs from 'fs';

// Datos de prueba
const testOrderData = {
  companyName: 'Sistemas RST',
  companyAddress: 'Calle Principal 123',
  companyPhone: '+52 123 456 7890',
  companyEmail: 'info@sistemasrst.com',
  companyLogo: '',
  orderNumber: 'ORD-2024-001',
  status: 'completed',
  statusClass: 'completed',
  requestDate: '15/01/2024',
  expectedDeliveryDate: '20/01/2024',
  clientName: 'Cliente de Prueba',
  clientContact: 'Juan Pérez',
  clientPhone: '+52 987 654 3210',
  clientEmail: 'juan@cliente.com',
  clientAddress: 'Av. Cliente 456',
  equipmentType: 'Computadora',
  equipmentBrand: 'Dell',
  equipmentModel: 'Latitude 5520',
  equipmentSerial: 'SN123456789',
  technician: 'Técnico Especializado',
  description: 'Mantenimiento preventivo y limpieza del equipo',
  notes: 'Equipo funcionando correctamente',
  materialsUsed: 'Aire comprimido, pasta térmica',
  cost: '$500.00',
  photos: [],
  clientSignature: ''
};

async function testPDFGeneration() {
  console.log('🧪 Iniciando prueba de generación de PDF...');
  console.log('📋 Configuración:');
  console.log(`   - PDFSHIFT_API_KEY: ${process.env.PDFSHIFT_API_KEY ? '✅ Configurada' : '❌ No configurada'}`);
  console.log('   - Fallback a Puppeteer: ✅ Disponible');
  console.log('');

  try {
    const startTime = Date.now();
    console.log('🔄 Generando PDF...');
    
    const pdfBuffer = await generateOrderHtmlPDF(testOrderData);
    
    const processingTime = Date.now() - startTime;
    
    console.log('✅ PDF generado exitosamente!');
    console.log(`   - Tiempo total: ${processingTime}ms`);
    console.log(`   - Tamaño del PDF: ${pdfBuffer.length} bytes`);
    console.log(`   - Tamaño en KB: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    // Guardar el PDF de prueba
    fs.writeFileSync('test-pdf-output.pdf', pdfBuffer);
    console.log('💾 PDF guardado como: test-pdf-output.pdf');
    
  } catch (error) {
    console.error('❌ Error al generar PDF:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar la prueba
testPDFGeneration(); 