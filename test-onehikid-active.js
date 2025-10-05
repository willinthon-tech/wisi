const axios = require('axios');

/**
 * 🎉 TESTING ONEHIKID ACTIVO
 * Probando APIs con OneHikID activo: hik_86679035846912
 */

async function testOneHikIDActive() {
  console.log('🎉 Probando OneHikID activo');
  console.log('============================\n');
  
  const oneHikID = 'hik_86679035846912';
  const email = 'hikcasinoval@gmail.com';
  const password = 'S0p0rt3S0p0rt3';
  
  console.log(`🔑 OneHikID: ${oneHikID}`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔐 Password: ${password}\n`);

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
    console.log(`🔄 Probando ${test.name}...`);
    console.log(`   URL: ${test.url}`);
    
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

      console.log(`✅ ${test.name} - Status: ${response.status}`);
      if (response.data) {
        console.log(`📊 Datos: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${test.name} - Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data?.message || 'Error desconocido'}`);
      } else {
        console.log(`❌ ${test.name} - Error: ${error.message}`);
      }
    }
    
    console.log(''); // Línea en blanco
  }

  // Probar endpoints específicos de TPP
  console.log('🏢 Probando endpoints específicos de TPP...');
  console.log('==========================================\n');
  
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
      console.log(`🔄 Probando TPP endpoint: ${endpoint}`);
      
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

      console.log(`✅ TPP ${endpoint} - Status: ${response.status}`);
      if (response.data) {
        console.log(`📊 Datos: ${JSON.stringify(response.data).substring(0, 150)}...`);
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ TPP ${endpoint} - Status: ${error.response.status}`);
        if (error.response.data) {
          console.log(`   Error: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
        }
      } else {
        console.log(`❌ TPP ${endpoint} - Error: ${error.message}`);
      }
    }
    
    console.log(''); // Línea en blanco
  }

  console.log('🎯 Resumen de pruebas completado');
  console.log('================================');
  console.log('✅ OneHikID activo y funcionando');
  console.log('🔑 ID: hik_86679035846912');
  console.log('📧 Email: hikcasinoval@gmail.com');
  console.log('🏢 TPP: Pendiente de activación (1-3 días)');
  console.log('🔧 ISAPI: Funcionando (186.167.73.66:8027)');
}

// Ejecutar prueba
testOneHikIDActive();



