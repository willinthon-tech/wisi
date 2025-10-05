const express = require('express');
const axios = require('axios');
const router = express.Router();

// Configuración de Hik-Connect
const HIK_CONNECT_CONFIG = {
  baseUrl: 'https://api.hik-connect.com/api/v1',
  clientId: process.env.HIK_CONNECT_CLIENT_ID || 'tu_client_id',
  clientSecret: process.env.HIK_CONNECT_CLIENT_SECRET || 'tu_client_secret'
};

let accessToken = '';

// Autenticación con Hik-Connect
async function authenticateHikConnect() {
  try {
    const response = await axios.post(`${HIK_CONNECT_CONFIG.baseUrl}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: HIK_CONNECT_CONFIG.clientId,
      client_secret: HIK_CONNECT_CONFIG.clientSecret,
      scope: 'device:read user:read event:read photo:read'
    });

    accessToken = response.data.access_token;
    console.log('✅ Hik-Connect authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Hik-Connect authentication failed:', error.message);
    return false;
  }
}

// Headers de autenticación
function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

// Obtener dispositivos de Hik-Connect
router.post('/devices', async (req, res) => {
  try {
    if (!accessToken) {
      const authSuccess = await authenticateHikConnect();
      if (!authSuccess) {
        return res.status(401).json({ success: false, error: 'Authentication failed' });
      }
    }

    const response = await axios.get(`${HIK_CONNECT_CONFIG.baseUrl}/devices`, {
      headers: getAuthHeaders()
    });

    res.json({
      success: true,
      data: response.data,
      message: 'Dispositivos obtenidos desde Hik-Connect'
    });
  } catch (error) {
    console.error('Error getting devices from Hik-Connect:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener usuarios de un dispositivo específico
router.post('/device-users', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Device ID is required' });
    }

    if (!accessToken) {
      const authSuccess = await authenticateHikConnect();
      if (!authSuccess) {
        return res.status(401).json({ success: false, error: 'Authentication failed' });
      }
    }

    const response = await axios.get(`${HIK_CONNECT_CONFIG.baseUrl}/devices/${deviceId}/users`, {
      headers: getAuthHeaders()
    });

    res.json({
      success: true,
      data: response.data,
      message: `Usuarios del dispositivo ${deviceId} obtenidos desde Hik-Connect`
    });
  } catch (error) {
    console.error('Error getting device users from Hik-Connect:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener eventos de un dispositivo
router.post('/device-events', async (req, res) => {
  try {
    const { deviceId, startTime, endTime } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Device ID is required' });
    }

    if (!accessToken) {
      const authSuccess = await authenticateHikConnect();
      if (!authSuccess) {
        return res.status(401).json({ success: false, error: 'Authentication failed' });
      }
    }

    let url = `${HIK_CONNECT_CONFIG.baseUrl}/devices/${deviceId}/events`;
    if (startTime && endTime) {
      url += `?startTime=${startTime}&endTime=${endTime}`;
    }

    const response = await axios.get(url, {
      headers: getAuthHeaders()
    });

    res.json({
      success: true,
      data: response.data,
      message: `Eventos del dispositivo ${deviceId} obtenidos desde Hik-Connect`
    });
  } catch (error) {
    console.error('Error getting device events from Hik-Connect:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener fotos de usuarios
router.post('/user-photos', async (req, res) => {
  try {
    const { deviceId, userId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Device ID is required' });
    }

    if (!accessToken) {
      const authSuccess = await authenticateHikConnect();
      if (!authSuccess) {
        return res.status(401).json({ success: false, error: 'Authentication failed' });
      }
    }

    let url = `${HIK_CONNECT_CONFIG.baseUrl}/devices/${deviceId}/photos`;
    if (userId) {
      url += `?userId=${userId}`;
    }

    const response = await axios.get(url, {
      headers: getAuthHeaders()
    });

    res.json({
      success: true,
      data: response.data,
      message: `Fotos del dispositivo ${deviceId} obtenidas desde Hik-Connect`
    });
  } catch (error) {
    console.error('Error getting user photos from Hik-Connect:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sincronizar datos de un dispositivo
router.post('/sync-device', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Device ID is required' });
    }

    if (!accessToken) {
      const authSuccess = await authenticateHikConnect();
      if (!authSuccess) {
        return res.status(401).json({ success: false, error: 'Authentication failed' });
      }
    }

    const response = await axios.post(`${HIK_CONNECT_CONFIG.baseUrl}/devices/${deviceId}/sync`, {}, {
      headers: getAuthHeaders()
    });

    res.json({
      success: true,
      data: response.data,
      message: `Dispositivo ${deviceId} sincronizado con Hik-Connect`
    });
  } catch (error) {
    console.error('Error syncing device with Hik-Connect:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener información del dispositivo
router.post('/device-info', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Device ID is required' });
    }

    if (!accessToken) {
      const authSuccess = await authenticateHikConnect();
      if (!authSuccess) {
        return res.status(401).json({ success: false, error: 'Authentication failed' });
      }
    }

    const response = await axios.get(`${HIK_CONNECT_CONFIG.baseUrl}/devices/${deviceId}`, {
      headers: getAuthHeaders()
    });

    res.json({
      success: true,
      data: response.data,
      message: `Información del dispositivo ${deviceId} obtenida desde Hik-Connect`
    });
  } catch (error) {
    console.error('Error getting device info from Hik-Connect:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;



