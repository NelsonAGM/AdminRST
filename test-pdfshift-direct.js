// Prueba directa de PDFShift
const API_KEY = 'sk_3e1a2d725997e3567b006acfb655a9e7ab6876be';
const API_URL = 'https://api.pdfshift.io/v3/convert/pdf';
const IMG_URL = 'https://res.cloudinary.com/djms0pkvm/image/upload/v1751760297/servicedashboard/oidyl2skwv6amxpcitft.jpg';

async function testPDFShiftDirect() {
  console.log('🧪 Prueba directa de PDFShift...');
  console.log(`📋 API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`🌐 URL: ${API_URL}`);
  console.log('');

  const testHtml = `
    <html>
      <head>
        <title>Test PDF</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 2px 0 8px 0; background: #f8fafc; color: #222; }
          .photos { display: flex; flex-wrap: nowrap; gap: 6px; margin-top: 4px; background: #fff; justify-content: center; }
          .photos img { max-width: 45%; max-height: 220px; height: auto; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; background: #fff; padding: 1px; flex-shrink: 0; }
        </style>
      </head>
      <body>
        <h1>Test PDFShift con Imágenes Verticales</h1>
        <div class="photos">
          <img src="${IMG_URL}" alt="Imagen Vertical 1" />
          <img src="${IMG_URL}" alt="Imagen Vertical 2" />
        </div>
      </body>
    </html>
  `;

  try {
    console.log('🔄 Enviando solicitud a PDFShift...');
    const startTime = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: testHtml,
        format: 'A4',
        margin: '10mm'
      })
    });

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ Tiempo de respuesta: ${processingTime}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de PDFShift:');
      console.error(errorText);
      
      // Intentar parsear como JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.error('📋 Detalles del error:');
        console.error(JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('📋 Error como texto:', errorText);
      }
      
      return;
    }

    const pdfBuffer = await response.arrayBuffer();
    console.log('✅ PDF generado exitosamente!');
    console.log(`📏 Tamaño: ${pdfBuffer.byteLength} bytes`);
    console.log(`📏 Tamaño en KB: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);

    // Guardar el PDF
    const fs = await import('fs');
    fs.writeFileSync('test-pdfshift-direct.pdf', Buffer.from(pdfBuffer));
    console.log('💾 PDF guardado como: test-pdfshift-direct.pdf');

  } catch (error) {
    console.error('❌ Error de red:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPDFShiftDirect(); 