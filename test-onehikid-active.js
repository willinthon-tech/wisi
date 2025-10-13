const axios = require('axios');

/**
 * 🎉 TESTING ONEHIKID ACTIVO
 * Probando APIs con OneHikID activo: hik_86679035846912
 */

async function testOneHikIDActive() {
  
  
  
  const oneHikID = 'hik_86679035846912';
  const email = 'hikcasinoval@gmail.com';
  const password = 'S0p0rt3S0p0rt3';
  
  
  
  

  // URLs a probar con OneHikID activo
  const testUrls = [
    {
      name: 'Hik-Partner Pro',
      url: 'https://partner.hikvision.com/api/v1/devices',
      method: 'GET'
    },
    {
      name: 'Technology Partner Portal',
      url: 'https://tpp.hikvision.com/api/v1/devices',
      method: 'GET'
    },
    {
      name: 'Hik-Connect OpenAPI',
      url: 'https://isa.hik-connect.com/v3/open/trust/v1/group/device',
      method: 'GET'
    },
    {
      name: 'Hikvision Developer API',
      url: 'https://developer.hikvision.com/api/v1/devices',
      method: 'GET'
    }
  ];

  for (const test of testUrls) {
    
    
    
    try {
      // Probar con autenticación básica
      const response = await axios({
        method: test.method,
        url: test.url,
        auth: {
          username: oneHikID,
          password: password
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-OneHikID': oneHikID
        },
        timeout: 10000
      });

      
      if (response.data) {
        
      }
      
    } catch (error) {
      if (error.response) {
        
        
      } else {
        
      }
    }
    
     // Línea en blanco
  }

  // Probar endpoints específicos de TPP
  
  
  
  const tppEndpoints = [
    '/api/v1/devices',
    '/api/v1/user/devices',
    '/api/v1/partner/info',
    '/api/v1/partner/devices',
    '/api/v1/partner/users',
    '/api/v1/partner/events'
  ];

  for (const endpoint of tppEndpoints) {
    try {
      
      
      const response = await axios.get(`https://tpp.hikvision.com${endpoint}`, {
        auth: {
          username: oneHikID,
          password: password
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-OneHikID': oneHikID,
          'X-Partner-ID': oneHikID
        },
        timeout: 10000
      });

      
      if (response.data) {
        
      }
      
    } catch (error) {
      if (error.response) {
        
        if (error.response.data) {
          
        }
      } else {
        
      }
    }
    
     // Línea en blanco
  }

  
  
  
  
  
  
  
}

// Ejecutar prueba
testOneHikIDActive();



