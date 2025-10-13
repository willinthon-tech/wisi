const axios = require('axios');

// Función para probar el endpoint de foto de usuario
async function testUserPhoto() {
  try {
    
    
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
    
    
    
    
  } catch (error) {
    
    
    
    
  }
}

// Ejecutar la prueba
testUserPhoto();



