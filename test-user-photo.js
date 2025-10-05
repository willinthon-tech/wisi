const axios = require('axios');

// Función para probar el endpoint de foto de usuario
async function testUserPhoto() {
  try {
    console.log('🧪 Probando endpoint de foto de usuario...');
    
    const response = await axios.post('http://localhost:3000/api/hikvision/user-photo', {
      ip: '186.167.73.66',
      usuario: 'admin',
      clave: 'admin123',
      fpid: 'V25047058' // Usar un FPID de ejemplo
    }, {
      headers: {
        'Authorization': 'Bearer test-token', // Token de prueba
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Respuesta del servidor:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error en la prueba:');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    console.log('Message:', error.message);
  }
}

// Ejecutar la prueba
testUserPhoto();



