const axios = require('axios');

// Configuración para TPP Hikvision
const TPP_CONFIG = {
  baseUrl: 'https://tpp.hikvision.com/api',
  authUrl: 'https://cloudsso.hikvision.com/login',
  loginUrl: 'https://tpp.hikvision.com/Login/TppLogin',
  partnerId: 'hik_86679035846912',
  email: 'hikcasinoval@gmail.com',
  password: 'S0p0rt3S0p0rt3'
};

async function testTPPHikvision() {
  
  
  
  
  

  try {
    // Paso 1: Obtener token de autenticación
    
    
    const authResponse = await axios.post(`${TPP_CONFIG.authUrl}`, {
      service: 'https://tpp.hikvision.com/Login/TppLogin',
      username: TPP_CONFIG.email,
      password: TPP_CONFIG.password
    });

    if (authResponse.data.token || authResponse.data.access_token) {
      
      const token = authResponse.data.token || authResponse.data.access_token;
      
      // Paso 2: Obtener dispositivos desde TPP
      
      
      try {
        const devicesResponse = await axios.get(`${TPP_CONFIG.baseUrl}/devices`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Partner-ID': TPP_CONFIG.partnerId
          }
        });

        
        
        
        if (devicesResponse.data.data && devicesResponse.data.data.length > 0) {
          
          devicesResponse.data.data.forEach((device, index) => {
            
            
            
            
            
            
            
            
          });
        }

        // Generar configuración
        const configContent = `# TPP Hikvision Configuration
TPP_PARTNER_ID=${TPP_CONFIG.partnerId}
TPP_EMAIL=${TPP_CONFIG.email}
TPP_PASSWORD=${TPP_CONFIG.password}
TPP_ACCESS_TOKEN=${token}
TPP_BASE_URL=${TPP_CONFIG.baseUrl}

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wisi_system
DB_USER=postgres
DB_PASSWORD=tu_password_db

# JWT Configuration
JWT_SECRET=tu_jwt_secret_aqui
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development`;

        require('fs').writeFileSync('.env', configContent);
        
        
      } catch (devicesError) {
        
        
      }

    } else {
      
    }
    
  } catch (error) {
    
    
    if (error.response) {
      
      
      
    } else {
      
    }
    
    // Intentar con diferentes endpoints de TPP
    
    
    const possibleEndpoints = [
      'https://tpp.hikvision.com/api/v1',
      'https://tpp.hikvision.com/api',
      'https://api.tpp.hikvision.com',
      'https://partner-api.hikvision.com',
      'https://open-api.hikvision.com'
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        
        
        const testResponse = await axios.get(`${endpoint}/devices`, {
          headers: {
            'X-Partner-ID': TPP_CONFIG.partnerId,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        
        break;
        
      } catch (endpointError) {
        if (endpointError.response) {
          
        } else {
          
        }
      }
    }
  }
}

// Ejecutar prueba
testTPPHikvision();



