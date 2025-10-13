const axios = require('axios');

// Configuración para HIK Partner API
const HIK_PARTNER_CONFIG = {
  baseUrl: 'https://api.hik-partner.com/api/v1',
  authUrl: 'https://api.hik-partner.com/oauth/token',
  partnerId: 'hik_86679035846912',
  email: 'hikcasinoval@gmail.com',
  password: 'S0p0rt3S0p0rt3'
};

async function testHikPartner() {
  
  
  
  
  

  try {
    // Intentar autenticación con HIK Partner
    
    
    const authResponse = await axios.post(`${HIK_PARTNER_CONFIG.authUrl}`, {
      grant_type: 'password',
      client_id: HIK_PARTNER_CONFIG.partnerId,
      username: HIK_PARTNER_CONFIG.email,
      password: HIK_PARTNER_CONFIG.password,
      scope: 'device:read user:read event:read photo:read'
    });

    if (authResponse.data.access_token) {
      
      
      
      
      
      const accessToken = authResponse.data.access_token;
      
      // Probar obtener dispositivos
      
      
      try {
        const devicesResponse = await axios.get(`${HIK_PARTNER_CONFIG.baseUrl}/devices`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        
        
        
        if (devicesResponse.data.data && devicesResponse.data.data.length > 0) {
          
          devicesResponse.data.data.forEach((device, index) => {
            
            
            
            
            
            
            
          });
        }

        // Generar configuración
        const configContent = `# HIK Partner API Configuration
HIK_PARTNER_ID=${HIK_PARTNER_CONFIG.partnerId}
HIK_PARTNER_EMAIL=${HIK_PARTNER_CONFIG.email}
HIK_PARTNER_PASSWORD=${HIK_PARTNER_CONFIG.password}
HIK_PARTNER_ACCESS_TOKEN=${accessToken}

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
    
    // Intentar con diferentes endpoints de HIK Partner
    
    
    const possibleEndpoints = [
      'https://api.hik-partner.com',
      'https://partner.hikvision.com/api',
      'https://open.hikvision.com/api',
      'https://api.hikvision.com/partner',
      'https://developer.hikvision.com/api'
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        
        
        const testResponse = await axios.get(`${endpoint}/devices`, {
          headers: {
            'Authorization': `Bearer ${HIK_PARTNER_CONFIG.partnerId}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        
        break;
        
      } catch (endpointError) {
        
      }
    }
  }
}

// Ejecutar prueba
testHikPartner();



