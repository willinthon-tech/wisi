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
    
    
    // Primera petición para obtener el challenge
    const firstResponse = await axios.get(url, {
      timeout: 10000,
      validateStatus: function (status) {
        return status === 401; // Esperamos 401 para obtener el challenge
      }
    });
    
    // Si llegamos aquí, no hubo 401, intentar autenticación básica
    
    return { success: true, data: firstResponse.data };
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      
      
      // Extraer información del challenge
      const wwwAuthenticate = error.response.headers['www-authenticate'];
      
      
      if (wwwAuthenticate && wwwAuthenticate.includes('Digest')) {
        // Parsear el challenge digest
        const challenge = parseDigestChallenge(wwwAuthenticate);
        
        
        // Generar respuesta digest
        const digestResponse = generateDigestResponse(challenge, username, password, url, 'GET');
        
        
        // Segunda petición con la respuesta digest
        try {
          const secondResponse = await axios.get(url, {
            headers: {
              'Authorization': `Digest ${digestResponse}`
            },
            timeout: 10000
          });
          
          
          return { success: true, data: secondResponse.data };
          
        } catch (secondError) {
          
          return { success: false, error: secondError.message };
        }
      } else {
        
        return { success: false, error: 'No digest challenge found' };
      }
    } else {
      
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
  
  
  
  
  
  
  

  // Construir URL completa
  const fullUrl = `${HIKCONNECT_CONFIG.baseUrl}${HIKCONNECT_CONFIG.apiPath}?serial=${HIKCONNECT_CONFIG.deviceSerial}`;
  

  try {
    // Probar con autenticación digest
    
    const digestResult = await makeDigestRequest(fullUrl, HIKCONNECT_CONFIG.email, HIKCONNECT_CONFIG.password);
    
    if (digestResult.success) {
      
      
      
      
      // Probar otros endpoints
      await testOtherEndpoints();
      
    } else {
      
      
      // Probar con autenticación básica como fallback
      
      await testBasicAuth();
    }
    
  } catch (error) {
    
  }
}

// Función para probar otros endpoints
async function testOtherEndpoints() {
  
  
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
      
      
      const response = await axios.get(url, {
        auth: {
          username: HIKCONNECT_CONFIG.email,
          password: HIKCONNECT_CONFIG.password
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
  }
}

// Función para probar autenticación básica
async function testBasicAuth() {
  try {
    const url = `${HIKCONNECT_CONFIG.baseUrl}${HIKCONNECT_CONFIG.apiPath}?serial=${HIKCONNECT_CONFIG.deviceSerial}`;
    
    
    const response = await axios.get(url, {
      auth: {
        username: HIKCONNECT_CONFIG.email,
        password: HIKCONNECT_CONFIG.password
      },
      timeout: 10000
    });
    
    
    
    
    
    return true;
    
  } catch (error) {
    if (error.response) {
      
    } else {
      
    }
    return false;
  }
}

// Ejecutar prueba
testHikConnectSpecific();
