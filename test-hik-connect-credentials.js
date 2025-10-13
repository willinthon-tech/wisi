const axios = require('axios');

// Configuración de Hik-Connect
const HIK_CONNECT_CONFIG = {
  baseUrl: 'https://api.hik-connect.com/api/v1',
  tokenUrl: 'https://api.hik-connect.com/oauth/token'
};

async function testHikConnectCredentials() {
  
  

  const clientId = 'hik_86679035846912';
  
  // Intentar diferentes combinaciones de credenciales
  const possibleSecrets = [
    'S0p0rt3S0p0rt3',  // Tu clave de cuenta
    'hik_86679035846912',  // Mismo que el ID
    '86679035846912',  // Solo números
    'hikcasinoval',  // Tu email sin @gmail.com
    'casinoval',  // Parte del email
    'hikconnect',  // Nombre del servicio
    'default',  // Valor por defecto
    ''  // Vacío
  ];

  for (const clientSecret of possibleSecrets) {
    
    
    
    try {
      const response = await axios.post(`${HIK_CONNECT_CONFIG.tokenUrl}`, {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'device:read user:read event:read photo:read'
      });

      if (response.data.access_token) {
        
        
        
        
        
        // Probar obtener dispositivos
        
        try {
          const devicesResponse = await axios.get(`${HIK_CONNECT_CONFIG.baseUrl}/devices`, {
            headers: {
              'Authorization': `Bearer ${response.data.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          
          
          
          if (devicesResponse.data.data && devicesResponse.data.data.length > 0) {
            
            devicesResponse.data.data.forEach((device, index) => {
              
              
              
              
              
              
            });
          }

          // Generar archivo de configuración
          const configContent = `# Hik-Connect API Configuration
HIK_CONNECT_CLIENT_ID=${clientId}
HIK_CONNECT_CLIENT_SECRET=${clientSecret}
HIK_CONNECT_REDIRECT_URI=http://localhost:3000/auth/hik-connect/callback

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

        return; // Salir del bucle si encontramos credenciales válidas
        
      } else {
        
      }
      
    } catch (error) {
      if (error.response) {
        
      } else {
        
      }
    }
    
     // Línea en blanco entre intentos
  }

  
  
  
  
  
}

// Ejecutar prueba
testHikConnectCredentials();



