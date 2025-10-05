const axios = require('axios');
const crypto = require('crypto');

// Configuración para Hik-Connect específico
const HIKCONNECT_CONFIG = {
  email: 'hikcasinoval@gmail.com',
  password: 'S0p0rt3S0p0rt3',
  deviceSerial: 'AE6504225',
  baseUrl: 'https://isa.hik-connect.com',
  apiPath: '/v3/open/trust/v1/group/device'
};

// Función para autenticación digest
async function makeDigestRequest(url, username, password) {
  try {
    console.log(`🔄 Haciendo petición digest a: ${url}`);
    
    // Primera petición para obtener el challenge
    const firstResponse = await axios.get(url, {
      timeout: 10000,
      validateStatus: function (status) {
        return status === 401; // Esperamos 401 para obtener el challenge
      }
    });
    
    // Si llegamos aquí, no hubo 401, intentar autenticación básica
    console.log('✅ Respuesta directa recibida, probando autenticación básica...');
    return { success: true, data: firstResponse.data };
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Challenge digest recibido');
      
      // Extraer información del challenge
      const wwwAuthenticate = error.response.headers['www-authenticate'];
      console.log(`🔐 WWW-Authenticate: ${wwwAuthenticate}`);
      
      if (wwwAuthenticate && wwwAuthenticate.includes('Digest')) {
        // Parsear el challenge digest
        const challenge = parseDigestChallenge(wwwAuthenticate);
        console.log('📋 Challenge parseado:', challenge);
        
        // Generar respuesta digest
        const digestResponse = generateDigestResponse(challenge, username, password, url, 'GET');
        console.log('🔑 Respuesta digest generada');
        
        // Segunda petición con la respuesta digest
        try {
          const secondResponse = await axios.get(url, {
            headers: {
              'Authorization': `Digest ${digestResponse}`
            },
            timeout: 10000
          });
          
          console.log('✅ Autenticación digest exitosa!');
          return { success: true, data: secondResponse.data };
          
        } catch (secondError) {
          console.log(`❌ Error en segunda petición: ${secondError.message}`);
          return { success: false, error: secondError.message };
        }
      } else {
        console.log('❌ No se encontró challenge digest');
        return { success: false, error: 'No digest challenge found' };
      }
    } else {
      console.log(`❌ Error inesperado: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// Función para parsear el challenge digest
function parseDigestChallenge(wwwAuthenticate) {
  const challenge = {};
  const regex = /(\w+)="([^"]*)"/g;
  let match;
  
  while ((match = regex.exec(wwwAuthenticate)) !== null) {
    challenge[match[1]] = match[2];
  }
  
  return challenge;
}

// Función para generar respuesta digest
function generateDigestResponse(challenge, username, password, uri, method) {
  const realm = challenge.realm || '';
  const nonce = challenge.nonce || '';
  const qop = challenge.qop || '';
  const algorithm = challenge.algorithm || 'MD5';
  
  // Generar cnonce
  const cnonce = crypto.randomBytes(16).toString('hex');
  
  // Calcular HA1
  const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
  
  // Calcular HA2
  const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
  
  // Calcular response
  let response;
  if (qop === 'auth') {
    response = crypto.createHash('md5').update(`${ha1}:${nonce}:00000001:${cnonce}:${qop}:${ha2}`).digest('hex');
  } else {
    response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
  }
  
  // Construir respuesta digest
  let digestResponse = `username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  
  if (qop) {
    digestResponse += `, qop=${qop}, nc=00000001, cnonce="${cnonce}"`;
  }
  
  if (challenge.opaque) {
    digestResponse += `, opaque="${challenge.opaque}"`;
  }
  
  return digestResponse;
}

// Función principal de prueba
async function testHikConnectSpecific() {
  console.log('🔍 Probando Hik-Connect específico con autenticación digest');
  console.log('============================================================\n');
  console.log(`📧 Email: ${HIKCONNECT_CONFIG.email}`);
  console.log(`🔐 Password: ${HIKCONNECT_CONFIG.password}`);
  console.log(`📱 Device Serial: ${HIKCONNECT_CONFIG.deviceSerial}`);
  console.log(`🌐 Base URL: ${HIKCONNECT_CONFIG.baseUrl}`);
  console.log(`📋 API Path: ${HIKCONNECT_CONFIG.apiPath}\n`);

  // Construir URL completa
  const fullUrl = `${HIKCONNECT_CONFIG.baseUrl}${HIKCONNECT_CONFIG.apiPath}?serial=${HIKCONNECT_CONFIG.deviceSerial}`;
  console.log(`🔗 URL completa: ${fullUrl}`);

  try {
    // Probar con autenticación digest
    console.log('\n🔄 Probando autenticación digest...');
    const digestResult = await makeDigestRequest(fullUrl, HIKCONNECT_CONFIG.email, HIKCONNECT_CONFIG.password);
    
    if (digestResult.success) {
      console.log('✅ ¡AUTENTICACIÓN DIGEST EXITOSA!');
      console.log('📊 Datos del dispositivo:');
      console.log(JSON.stringify(digestResult.data, null, 2));
      
      // Probar otros endpoints
      await testOtherEndpoints();
      
    } else {
      console.log(`❌ Error en autenticación digest: ${digestResult.error}`);
      
      // Probar con autenticación básica como fallback
      console.log('\n🔄 Probando autenticación básica como fallback...');
      await testBasicAuth();
    }
    
  } catch (error) {
    console.log(`❌ Error general: ${error.message}`);
  }
}

// Función para probar otros endpoints
async function testOtherEndpoints() {
  console.log('\n🔄 Probando otros endpoints...');
  
  const endpoints = [
    '/v3/open/trust/v1/group/device',
    '/v3/open/trust/v1/group/user',
    '/v3/open/trust/v1/group/event',
    '/v3/open/trust/v1/group/photo',
    '/v3/open/trust/v1/group/capability',
    '/v3/open/trust/v1/group/status'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${HIKCONNECT_CONFIG.baseUrl}${endpoint}?serial=${HIKCONNECT_CONFIG.deviceSerial}`;
      console.log(`🔄 Probando: ${endpoint}`);
      
      const response = await axios.get(url, {
        auth: {
          username: HIKCONNECT_CONFIG.email,
          password: HIKCONNECT_CONFIG.password
        },
        timeout: 10000
      });
      
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      if (response.data) {
        console.log(`📊 Datos: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${endpoint} - Status: ${error.response.status}`);
      } else {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }
  }
}

// Función para probar autenticación básica
async function testBasicAuth() {
  try {
    const url = `${HIKCONNECT_CONFIG.baseUrl}${HIKCONNECT_CONFIG.apiPath}?serial=${HIKCONNECT_CONFIG.deviceSerial}`;
    console.log(`🔄 Probando autenticación básica en: ${url}`);
    
    const response = await axios.get(url, {
      auth: {
        username: HIKCONNECT_CONFIG.email,
        password: HIKCONNECT_CONFIG.password
      },
      timeout: 10000
    });
    
    console.log('✅ ¡AUTENTICACIÓN BÁSICA EXITOSA!');
    console.log('📊 Datos del dispositivo:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return true;
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ Error ${error.response.status}: ${error.response.data?.message || 'Error desconocido'}`);
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
    return false;
  }
}

// Ejecutar prueba
testHikConnectSpecific();
