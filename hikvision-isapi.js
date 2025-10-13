const axios = require('axios');
const crypto = require('crypto');
const xml2js = require('xml2js');

class HikvisionISAPI {
  constructor(ip, username, password) {
    // Validar parámetros
    if (!ip || typeof ip !== 'string') {
      throw new Error(`IP inválida: ${ip}`);
    }
    if (!username || typeof username !== 'string') {
      throw new Error(`Username inválido: ${username}`);
    }
    if (!password || typeof password !== 'string') {
      throw new Error(`Password inválido: ${password}`);
    }
    
    // Manejar IP que ya incluye puerto
    if (ip.includes(':')) {
      // Si ya tiene puerto, usar tal como está
    this.baseUrl = `http://${ip}`;
    } else {
      // Si no tiene puerto, agregar el puerto por defecto
      this.baseUrl = `http://${ip}:8027`;
    }
    
    this.username = username;
    this.password = password;
    this.nonce = null;
    this.realm = null;
    this.uri = null;
    this.response = null;
    this.qop = null;
    this.nc = 0;
    
    
    
  }

  // Método principal para hacer peticiones con autenticación digest
  async makeRequest(endpoint, method = 'GET', data = null, responseType = 'json') {
    try {
      // Validar que baseUrl esté definido
      if (!this.baseUrl) {
        throw new Error('BaseURL no está definido. Constructor no se ejecutó correctamente.');
      }
      
      const fullUrl = `${this.baseUrl}${endpoint}`;
      
      
      
      
      
      
      // Validar que la URL sea válida
      try {
        new URL(fullUrl);
      } catch (urlError) {
        throw new Error(`URL inválida: ${fullUrl}. Error: ${urlError.message}`);
      }
      
      // Primera petición para obtener el challenge
      const challengeResponse = await axios({
        method: method,
        url: fullUrl,
        data: data ? JSON.stringify(data) : data, // Serializar JSON explícitamente
        responseType: responseType,
        timeout: 10000,
        validateStatus: function (status) {
          return status === 401 || status === 405 || status === 400; // Aceptar 401, 405 y 400
        }
      });

      // Parsear el header WWW-Authenticate
      const wwwAuthenticate = challengeResponse.headers['www-authenticate'];
      
      
      // Si el dispositivo devuelve 400, podría ser un problema con el payload
      if (challengeResponse.status === 400) {
        
        
        return {
          success: false,
          error: 'Error 400: Formato de payload incorrecto',
          status: 400,
          data: challengeResponse.data
        };
      }
      
      if (!wwwAuthenticate || !wwwAuthenticate.includes('Digest')) {
        
        // Si no hay challenge digest, intentar autenticación básica directamente
        const basicResponse = await axios({
          method: method,
          url: fullUrl,
          data: data ? JSON.stringify(data) : data, // Serializar JSON explícitamente
          responseType: responseType,
          timeout: 15000,
          auth: {
            username: this.username,
            password: this.password
          },
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        
        
        
        
        
        
        
        
        return {
          success: true,
          data: basicResponse.data,
          status: basicResponse.status,
          headers: basicResponse.headers
        };
      }

      // Extraer parámetros del challenge
      this.realm = this.extractParam(wwwAuthenticate, 'realm');
      this.nonce = this.extractParam(wwwAuthenticate, 'nonce');
      this.qop = this.extractParam(wwwAuthenticate, 'qop');
      this.uri = endpoint;

      

      // Generar respuesta digest
      const digestResponse = this.generateDigestResponse(method);

      // Segunda petición con autenticación digest
      const finalResponse = await axios({
        method: method,
        url: fullUrl,
        data: data ? JSON.stringify(data) : data, // Serializar JSON explícitamente
        responseType: responseType,
        timeout: 15000,
        headers: {
          'Authorization': digestResponse,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      
      
      
      
      
      
      
      
      return {
        success: true,
        data: finalResponse.data,
        status: finalResponse.status,
        headers: finalResponse.headers
      };

    } catch (error) {
      if (error.response && error.response.status === 200) {
        // Si la respuesta es 200, es exitosa
        
        return {
          success: true,
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers
        };
      } else {
        
        
      return {
        success: false,
        error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        };
      }
    }
  }

  // Extraer parámetros del header WWW-Authenticate
  extractParam(header, param) {
    const regex = new RegExp(`${param}="([^"]+)"`, 'i');
    const match = header.match(regex);
    return match ? match[1] : null;
  }

  // Generar respuesta digest
  generateDigestResponse(method) {
    this.nc++;
    const nc = this.nc.toString().padStart(8, '0');
    const cnonce = crypto.randomBytes(16).toString('hex');
    
    const ha1 = crypto.createHash('md5')
      .update(`${this.username}:${this.realm}:${this.password}`)
      .digest('hex');
    
    const ha2 = crypto.createHash('md5')
      .update(`${method}:${this.uri}`)
      .digest('hex');
    
    const response = crypto.createHash('md5')
      .update(`${ha1}:${this.nonce}:${nc}:${cnonce}:${this.qop}:${ha2}`)
      .digest('hex');

    return `Digest username="${this.username}", realm="${this.realm}", nonce="${this.nonce}", uri="${this.uri}", response="${response}", qop=${this.qop}, nc=${nc}, cnonce="${cnonce}"`;
  }

  // Obtener información del dispositivo
  async getDeviceInfo() {
    try {
      
      
      // Usar el método makeRequest que implementa digest correctamente
      const result = await this.makeRequest('/ISAPI/System/deviceInfo', 'GET');
      
      if (result.success) {
        
        return result;
      }
      
      // Si falla, intentar con capacidades
      
      const capabilitiesResult = await this.makeRequest('/ISAPI/System/capabilities', 'GET');
      
      if (capabilitiesResult.success) {
        
        return capabilitiesResult;
      }
      
      return {
        success: false,
        error: 'No se pudo obtener información del dispositivo con ningún endpoint'
      };
      
    } catch (error) {
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener capacidades del dispositivo
  async getCapabilities() {
    return await this.makeRequest('/ISAPI/System/capabilities');
  }

  // Obtener usuarios registrados
  async getUsers() {
    try {
      
      
      const allUsers = [];
      let searchID = "0";
      let searchResultPosition = 0;
      let maxResults = 30; // El dispositivo limita a 30 por página
      let hasMore = true;
      let totalUsers = 0;
      let pageCount = 0;
      const maxPages = 1000; // Límite de seguridad alto
      
      while (hasMore && pageCount < maxPages) {
        
        
        const result = await this.makeRequest('/ISAPI/AccessControl/UserInfo/Search?format=json', 'POST', {
          "UserInfoSearchCond": {
            "searchID": searchID,
            "searchResultPosition": searchResultPosition,
            "maxResults": maxResults
          }
        });
        
        if (result.success && result.data?.UserInfoSearch) {
          const userSearch = result.data.UserInfoSearch;
          totalUsers = userSearch.totalMatches || 0;
          
          
          
          
          
          
          if (userSearch.UserInfo && userSearch.UserInfo.length > 0) {
            allUsers.push(...userSearch.UserInfo);
            searchResultPosition += maxResults;
            pageCount++;
            
            // Verificar si hay más páginas
            // Si obtenemos menos usuarios de los esperados en esta página, no hay más
            const usersInThisPage = userSearch.UserInfo.length;
            hasMore = usersInThisPage === maxResults && allUsers.length < totalUsers;
            
            
            
            
            
            // Si no hay más usuarios en esta página, parar
            if (usersInThisPage < maxResults) {
              
              hasMore = false;
            }
          } else {
            
            hasMore = false;
          }
        } else {
          
          hasMore = false;
        }
      }
      
      
      
      return {
        success: true,
        data: {
          totalUsers: totalUsers,
          users: allUsers
        }
      };
    } catch (error) {
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener eventos de acceso
  async getEvents(startTime, endTime) {
    try {
      
      
      const allEvents = [];
      let searchID = "0";
      let searchResultPosition = 0;
      let maxResults = 100;
      let hasMore = true;
      let totalEvents = 0;
      let pageCount = 0;
      const maxPages = 100; // Límite de seguridad
      
      while (hasMore && pageCount < maxPages) {
        
        
        const result = await this.makeRequest('/ISAPI/AccessControl/AcsEvent?format=json', 'POST', {
          "AcsEventCond": {
            "searchID": searchID,
            "searchResultPosition": searchResultPosition,
            "maxResults": maxResults,
            "AcsEvent": {
              "timeRange": {
                "startTime": startTime || "2024-01-01T00:00:00",
                "endTime": endTime || new Date().toISOString()
              }
            }
          }
        });
        
        if (result.success && result.data?.AcsEventSearch) {
          const eventSearch = result.data.AcsEventSearch;
          totalEvents = eventSearch.totalMatches || 0;
          
          if (eventSearch.AcsEvent && eventSearch.AcsEvent.length > 0) {
            allEvents.push(...eventSearch.AcsEvent);
            searchResultPosition += maxResults;
            pageCount++;
            
            // Verificar si hay más eventos
            hasMore = allEvents.length < totalEvents;
            
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      

      return {
        success: true,
        data: {
          totalEvents: totalEvents,
          events: allEvents
        }
      };
    } catch (error) {
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener foto del usuario por FPID
  async getUserPhoto(fpid) {
    try {
      
      
      console.log(`📸 Body:`, {
        "searchResultPosition": 0,
        "maxResults": 100,
        "faceLibType": "blackFD",
        "FDID": "1",
        "FPID": fpid
      });
      
      const result = await this.makeRequest('/ISAPI/Intelligent/FDLib/FDSearch?format=json', 'POST', {
        "searchResultPosition": 0,
        "maxResults": 100,
        "faceLibType": "blackFD",
        "FDID": "1",
        "FPID": fpid
      });
      
      
      
      
      
      
      
      
      
      // La respuesta viene en result.data con MatchList
      // El éxito se indica con statusCode: 1
      if (result.success && result.data && result.data.statusCode === 1 && result.data.MatchList && result.data.MatchList.length > 0) {
        const match = result.data.MatchList[0];
        let faceURL = match.faceURL;
        
        // Usar la URL completa tal como viene del dispositivo (funciona con @WEB)
        
        
        
        
        
        // Hacer GET con autenticación digest a la URL de la foto
        try {
          
          
          // Primera petición para obtener el challenge digest
          const challengeResponse = await axios({
            method: 'GET',
            url: faceURL,
            timeout: 10000,
            validateStatus: function (status) {
              return status === 401; // Solo aceptar 401 para el challenge
            }
          });

          
          
          // Parsear el header WWW-Authenticate
          const wwwAuthenticate = challengeResponse.headers['www-authenticate'];
          if (!wwwAuthenticate || !wwwAuthenticate.includes('Digest')) {
            throw new Error('No se recibió challenge digest válido');
          }

          // Extraer parámetros del challenge
          const realm = wwwAuthenticate.match(/realm="([^"]+)"/)?.[1];
          const nonce = wwwAuthenticate.match(/nonce="([^"]+)"/)?.[1];
          const qop = wwwAuthenticate.match(/qop="([^"]+)"/)?.[1];
          
          
          
          // Generar respuesta digest
          const cnonce = Math.random().toString(36).substring(2, 15);
          const nc = '00000001';
          const uri = faceURL.replace(this.baseURL, '');
          
          const ha1 = require('crypto').createHash('md5')
            .update(`${this.username}:${realm}:${this.password}`)
            .digest('hex');
          
          const ha2 = require('crypto').createHash('md5')
            .update(`GET:${uri}`)
            .digest('hex');
          
          const response = require('crypto').createHash('md5')
            .update(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`)
            .digest('hex');
          
          const digestResponse = `Digest username="${this.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=auth, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
          
          
          
          // Segunda petición con autenticación digest
          const photoResponse = await axios({
            method: 'GET',
            url: faceURL,
            headers: {
              'Authorization': digestResponse,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            responseType: 'arraybuffer',
            timeout: 15000
          });
          
          
          
          
          
          
          // Convertir a base64 para enviar al frontend
          const base64Image = Buffer.from(photoResponse.data).toString('base64');
          const dataUrl = `data:${photoResponse.headers['content-type']};base64,${base64Image}`;
          
          
          
          return {
            success: true,
            data: {
              fpid: fpid,
              faceURL: faceURL,
              photoUrl: dataUrl,
              modelData: match.modelData
            }
          };
          
        } catch (photoError) {
          
          // Si falla la consulta de la imagen, devolver solo la URL
          return {
            success: true,
            data: {
              fpid: fpid,
              faceURL: faceURL,
              modelData: match.modelData
            }
          };
        }
      } else {
        
        
        
        // Buscar en otras estructuras posibles
        if (result.data && typeof result.data === 'object') {
          
          
          
          // Buscar faceURL en diferentes niveles
          const possiblePhotoFields = ['faceURL', 'faceUrl', 'photo', 'image', 'avatar'];
          for (const field of possiblePhotoFields) {
            if (result.data[field]) {
              
              return {
                success: true,
                data: {
                  fpid: fpid,
                  faceURL: result.data[field]
                }
              };
            }
          }
        }
        
        return {
          success: false,
          error: 'No se encontró foto para este usuario'
        };
      }
    } catch (error) {
      
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener información específica de un usuario por employeeNo
  async getUserInfo(employeeNo) {
    try {
      
      
      // Usar el formato correcto para buscar usuario específico
      const result = await this.makeRequest('/ISAPI/AccessControl/UserInfo/Search?format=json', 'POST', {
        "UserInfoSearchCond": {
          "searchID": "0",
          "searchResultPosition": 0,
          "maxResults": 30,
          "EmployeeNoList": [
            {
              "employeeNo": employeeNo
            }
          ]
        }
      });
      
      
      
      
      
      if (result.success && result.data?.UserInfoSearch?.UserInfo) {
        const userInfo = Array.isArray(result.data.UserInfoSearch.UserInfo) 
          ? result.data.UserInfoSearch.UserInfo[0] 
          : result.data.UserInfoSearch.UserInfo;
        
        
        return {
          success: true,
          data: userInfo
        };
      } else {
        
        
        return {
          success: false,
          error: 'No se encontró información para este usuario'
        };
      }
    } catch (error) {
      
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar usuario
  async updateUser(userData) {
    try {
      
      
      
      
      
      // Usar directamente los datos que vienen del frontend
      const updateData = userData;

      
      
      
      
      const result = await this.makeRequest('/ISAPI/AccessControl/UserInfo/SetUp?format=json', 'PUT', updateData);
      
      
      
      
      
      
      
      // Verificar si la respuesta indica éxito
      if (result.success && result.data && result.data.statusCode === 1) {
        return {
          success: true,
          data: {
            message: 'Usuario actualizado correctamente',
            userData: userData,
            statusCode: result.data.statusCode,
            statusString: result.data.statusString
          }
        };
      } else {
        
        return {
          success: false,
          error: result.data?.statusString || result.data?.errorMsg || 'Error actualizando usuario'
        };
      }
    } catch (error) {
      
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Eliminar rostro de usuario
  async deleteUserFace(employeeNo) {
    try {
      
      
      const result = await this.makeRequest('/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD', 'PUT', {
        "FPID": [
          {
            "value": employeeNo
          }
        ]
      });
      
      
      
      if (result.success && result.data?.statusCode === 1) {
        return {
          success: true,
          data: {
            message: 'Rostro eliminado correctamente',
            employeeNo: employeeNo
          }
        };
      } else {
        return {
          success: false,
          error: result.data?.statusString || 'Error eliminando rostro'
        };
      }
    } catch (error) {
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Eliminar usuario completo
  async deleteUser(employeeNo) {
    try {
      
      
      // Usar el formato correcto para eliminar usuario
      const result = await this.makeRequest('/ISAPI/AccessControl/UserInfo/Delete?format=json', 'PUT', {
        "UserInfoDelCond": {
          "EmployeeNoList": [
            {
              "employeeNo": employeeNo
            }
          ]
        }
      });
      
      
      
      
      
      if (result.success && result.data?.statusCode === 1) {
        return {
          success: true,
          data: {
            message: 'Usuario eliminado correctamente',
            employeeNo: employeeNo
          }
        };
      } else {
        
        return {
          success: false,
          error: result.data?.statusString || result.data?.errorMsg || 'Error eliminando usuario'
        };
      }
    } catch (error) {
      
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Registrar rostro de usuario
  async registerUserFace(employeeNo, name, gender, faceDataBase64) {
    try {
      
      
      // Usar directamente el base64 que viene del frontend (ya incluye el prefijo)
      const faceURL = faceDataBase64;
      
      const requestData = {
        "faceURL": faceURL,
        "faceLibType": "blackFD",
        "FDID": "1",
        "FPID": employeeNo,
        "name": name,
        "gender": gender || "male",
        "featurePointType": "face"
      };
      
      
      
      const result = await this.makeRequest('/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json', 'POST', requestData);
      
      
      
      
      
      
      
      
      
      
      
      
      
      if (result.success && result.data?.statusCode === 1) {
        return {
          success: true,
          data: {
            message: 'Rostro registrado correctamente',
            employeeNo: employeeNo,
            name: name
          }
        };
      } else {
        
        
        
        
        return {
          success: false,
          error: `Error registrando rostro: ${result.data?.statusString || 'Error desconocido'} (Code: ${result.data?.statusCode})`
        };
      }
    } catch (error) {
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Registrar rostro de usuario con URL de imagen
  async registerUserFaceWithUrl(employeeNo, name, gender, imageUrl) {
    try {
      
      
      
      const requestData = {
        "faceURL": imageUrl,
        "faceLibType": "blackFD",
        "FDID": "1",
        "FPID": employeeNo,
        "name": name,
        "gender": gender || "male",
        "featurePointType": "face"
      };
      
      
      
      const result = await this.makeRequest('/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json', 'POST', requestData);
      
      
      
      
      
      
      
      
      
      
      
      
      
      if (result.success && result.data?.statusCode === 1) {
        return {
          success: true,
          data: {
            message: 'Rostro registrado correctamente',
            employeeNo: employeeNo,
            name: name,
            imageUrl: imageUrl
          }
        };
      } else {
        
        
        
        
        return {
          success: false,
          error: `Error registrando rostro: ${result.data?.statusString || 'Error desconocido'} (Code: ${result.data?.statusCode})`
        };
      }
    } catch (error) {
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sincronizar datos (combinar usuarios, eventos y fotos)
  async syncData() {
    // Este dispositivo no soporta endpoints estándar de ISAPI
    return {
      success: true,
      data: {
        message: '❌ Sincronización automática NO disponible con este dispositivo',
        deviceType: 'Hikvision Biometric (Non-ISAPI Compatible)',
        workingEndpoints: ['/System/deviceInfo', '/System/capabilities', '/System/time'],
        recommendation: '🔧 ALTERNATIVAS PARA SINCRONIZACIÓN:',
        alternatives: [
          '1. 🌐 Interfaz Web: Acceda a http://186.167.73.66:8027',
          '2. 📱 App Móvil: Use la app oficial de Hikvision',
          '3. 📊 Exportación Manual: Desde la interfaz web del dispositivo',
          '4. 🔌 API Personalizada: Desarrolle integración específica del modelo',
          '5. 📁 Archivos del Dispositivo: Acceso directo a archivos (FTP/SFTP)'
        ],
        webInterface: `http://${this.baseUrl.replace('http://', '')}`,
        note: 'Este dispositivo requiere un enfoque diferente para la integración de datos biométricos'
      }
    };
  }

  // Eliminar solo la foto del usuario
  async deleteUserPhotoOnly(deletePhotoPayload) {
    try {
      
      

      // Usar el endpoint correcto para eliminar solo la foto con parámetros adicionales
      const result = await this.makeRequest('/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD', 'PUT', deletePhotoPayload);

      
      
      

      // Verificar si la petición fue exitosa (status 200)
      if (result.success && (result.status === 200 || result.data?.statusCode === 1)) {
      return {
        success: true,
        data: {
            message: 'Foto eliminada correctamente',
            payload: deletePhotoPayload,
            statusCode: result.data?.statusCode || 1
          }
        };
      } else {
        
        
        
        
        // Si hay un error 400, podría ser un problema con el formato del payload
        if (result.status === 400) {
          return {
            success: false,
            error: 'Error 400: Formato de payload incorrecto. Verificar que el FPID sea válido.',
            details: result.data
          };
        }
        
        return {
          success: false,
          error: result.data?.statusString || result.data?.errorMsg || result.error || 'Error eliminando foto',
          details: result.data
        };
      }
    } catch (error) {
      
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Registrar rostro de usuario con payload completo
  async registerUserFaceWithPayload(facePayload) {
    try {
      
      

      // Usar el endpoint correcto para registrar rostro
      const result = await this.makeRequest('/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json', 'POST', facePayload);

      
      
      

      // Verificar si la petición fue exitosa (status 200)
      if (result.success && (result.status === 200 || result.data?.statusCode === 1)) {
        return {
          success: true,
          data: {
            message: 'Rostro registrado correctamente',
            payload: facePayload,
            statusCode: result.data?.statusCode || 1
          }
        };
      } else {
        
        
        
        
        return {
          success: false,
          error: result.data?.statusString || result.data?.errorMsg || result.error || 'Error registrando rostro',
          details: result.data
        };
      }
    } catch (error) {
      
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = HikvisionISAPI;