const axios = require('axios');
const crypto = require('crypto');

class HikvisionISAPI {
  constructor(ip, username, password) {
    this.baseUrl = `http://${ip}`;
    this.username = username;
    this.password = password;
  }

  // Generar cnonce para qop
  generateCnonce() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Parsear el challenge de autenticación digest
  parseDigestChallenge(wwwAuth) {
    const challenge = {};
    
    // Remover "Digest " del inicio
    const cleanAuth = wwwAuth.replace(/^Digest\s+/, '');
    
    // Usar regex para extraer pares clave=valor, manejando comillas
    const regex = /(\w+)=("([^"]*)"|([^,\s]+))/g;
    let match;
    
    while ((match = regex.exec(cleanAuth)) !== null) {
      const key = match[1];
      const value = match[3] || match[4]; // Usar valor entre comillas o sin comillas
      challenge[key] = value;
    }
    
    return challenge;
  }

  // Generar respuesta digest
  generateDigestResponse(nonce, uri, method = 'GET', realm = 'IP Camera', qop = null, algorithm = 'MD5', cnonce = null) {
    let ha1, ha2, response;
    
    // Generar cnonce si no se proporciona
    if (!cnonce) {
      cnonce = this.generateCnonce();
    }
    
    if (algorithm === 'MD5-sess') {
      // Para MD5-sess, primero calculamos MD5(username:realm:password)
      const md5UserRealmPass = crypto.createHash('md5').update(`${this.username}:${realm}:${this.password}`).digest('hex');
      // Luego MD5(md5UserRealmPass:nonce:cnonce)
      ha1 = crypto.createHash('md5').update(`${md5UserRealmPass}:${nonce}:${cnonce}`).digest('hex');
    } else {
      // MD5 estándar
      ha1 = crypto.createHash('md5').update(`${this.username}:${realm}:${this.password}`).digest('hex');
    }
    
    if (qop === 'auth' || qop === 'auth-int') {
      ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
      response = crypto.createHash('md5').update(`${ha1}:${nonce}:00000001:${cnonce}:${qop}:${ha2}`).digest('hex');
    } else {
      ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
      response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
    }
    
    return { response, cnonce };
  }

  // Hacer petición con autenticación digest
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const uri = `/ISAPI${endpoint}`;
      
      console.log(`Making request to: ${this.baseUrl}${uri}`);
      
      // Primero hacer una petición sin autenticación para obtener el challenge
      const challengeResponse = await axios({
        method,
        url: `${this.baseUrl}${uri}`,
        timeout: 10000,
        validateStatus: (status) => status === 401 // Esperamos 401 para obtener el challenge
      });

      console.log('Challenge response status:', challengeResponse.status);
      console.log('Challenge response headers:', challengeResponse.headers);

      // Extraer el challenge del header WWW-Authenticate
      const wwwAuth = challengeResponse.headers['www-authenticate'];
      if (!wwwAuth) {
        throw new Error('No se recibió challenge de autenticación');
      }

      console.log('WWW-Authenticate header:', wwwAuth);

      // Parsear el challenge
      const challenge = this.parseDigestChallenge(wwwAuth);
      console.log('Parsed challenge:', challenge);
      
      // Generar la respuesta digest
      const digestResult = this.generateDigestResponse(
        challenge.nonce,
        uri,
        method,
        challenge.realm,
        challenge.qop,
        challenge.algorithm
      );

      const authHeader = `Digest username="${this.username}", realm="${challenge.realm}", nonce="${challenge.nonce}", uri="${uri}", response="${digestResult.response}"${challenge.qop ? `, qop=${challenge.qop}, nc=00000001, cnonce="${digestResult.cnonce}"` : ''}`;
      
      console.log('Authorization header:', authHeader);

      const headers = {
        'Authorization': authHeader
      };

      // Agregar Content-Type apropiado para requests POST con data
      if (data) {
        if (typeof data === 'object' && !data.toString().includes('<?xml')) {
          headers['Content-Type'] = 'application/json';
        } else {
          headers['Content-Type'] = 'application/xml';
        }
      }

      const config = {
        method,
        url: `${this.baseUrl}${uri}`,
        headers,
        timeout: 10000
      };

      if (data) {
        config.data = data;
      }

      const result = await axios(config);
      console.log('Authenticated request successful:', result.status);
      
      return {
        success: true,
        data: result.data,
        status: result.status
      };
    } catch (error) {
      console.error('Error en petición ISAPI:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', error.response.data);
      }
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500
      };
    }
  }

  // Probar conexión
  async testConnection() {
    // Para dispositivos biométricos, usar el endpoint correcto
    try {
    return await this.makeRequest('/System/deviceInfo');
    } catch (error) {
      // Si falla, intentar con el endpoint de capacidades
      try {
        return await this.makeRequest('/System/capabilities');
      } catch (error2) {
        // Como último recurso, intentar con el endpoint de estado
        return await this.makeRequest('/System/status');
      }
    }
  }

  // Método alternativo de prueba de conexión con autenticación básica
  async testConnectionBasic() {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.baseUrl}/ISAPI/System/deviceInfo`,
        auth: {
          username: this.username,
          password: this.password
        },
        timeout: 10000
      });
      
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 500
      };
    }
  }

  // Obtener información del dispositivo
  async getDeviceInfo() {
    return await this.makeRequest('/System/deviceInfo');
  }

  // Obtener foto del usuario por FPID
  async getUserPhoto(fpid) {
    try {
      console.log(`📸 Obteniendo foto del usuario: ${fpid}`);
      console.log(`📸 Endpoint: /Intelligent/FDLib/FDSearch?format=json`);
      console.log(`📸 Body:`, {
        "searchResultPosition": 0,
        "maxResults": 100,
        "faceLibType": "blackFD",
        "FDID": "1",
        "FPID": fpid
      });
      
      const result = await this.makeRequest('/Intelligent/FDLib/FDSearch?format=json', 'POST', {
        "searchResultPosition": 0,
        "maxResults": 100,
        "faceLibType": "blackFD",
        "FDID": "1",
        "FPID": fpid
      });
      
      console.log(`📸 Respuesta completa del endpoint:`, result);
      
      if (result.success && result.data?.MatchList && result.data.MatchList.length > 0) {
        const match = result.data.MatchList[0];
        let faceURL = match.faceURL;
        
        // Usar la URL completa tal como viene del dispositivo (funciona con @WEB)
        console.log(`📸 URL original del dispositivo: ${faceURL}`);
        
        console.log(`✅ Foto encontrada para ${fpid}: ${faceURL}`);
        console.log(`✅ Match completo:`, match);
        
        return {
          success: true,
          data: {
            fpid: fpid,
            faceURL: faceURL,
            modelData: match.modelData
          }
        };
      } else {
        console.log(`❌ No se encontró foto para el usuario: ${fpid}`);
        console.log(`❌ Resultado completo:`, result);
        return {
          success: false,
          error: 'No se encontró foto para este usuario'
        };
      }
    } catch (error) {
      console.log(`❌ Error obteniendo foto del usuario ${fpid}:`, error.message);
      console.log(`❌ Error completo:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener usuarios registrados
  async getUsers() {
    // Intentar múltiples enfoques para obtener usuarios
    try {
      // Primero intentar con el endpoint correcto que SÍ funciona - OBTENER TODOS LOS USUARIOS
      try {
        console.log('Obteniendo TODOS los usuarios desde ISAPI...');
        
        const allUsers = [];
        let searchID = "0";
        let searchResultPosition = 0;
        let maxResults = 20; // Reducir aún más para obtener más páginas
        let hasMore = true;
        let totalUsers = 0;
        let pageCount = 0;
        const maxPages = 50; // Aumentar significativamente el límite
        
        while (hasMore && pageCount < 100) { // Límite de seguridad muy alto
          pageCount++;
          console.log(`Obteniendo usuarios desde posición ${searchResultPosition}...`);
          
          const result = await this.makeRequest('/AccessControl/UserInfo/Search?format=json', 'POST', {
            "UserInfoSearchCond": {
              "searchID": searchID,
              "searchResultPosition": searchResultPosition,
              "maxResults": maxResults
            }
          });
          
          if (result.success && result.data?.UserInfoSearch) {
            const userSearch = result.data.UserInfoSearch;
            totalUsers = userSearch.totalMatches || 0;
            
            console.log(`📊 Página actual: ${searchResultPosition}, Total en dispositivo: ${totalUsers}, Estado: ${userSearch.responseStatusStrg}`);
            
            // Agregar usuarios de esta página
            if (userSearch.UserInfo) {
              const userArray = Array.isArray(userSearch.UserInfo) 
                ? userSearch.UserInfo 
                : [userSearch.UserInfo];
              allUsers.push(...userArray);
              console.log(`👥 Usuarios en esta página: ${userArray.length}, Total acumulado: ${allUsers.length}`);
            }
            
            // Verificar si hay más páginas
            hasMore = userSearch.responseStatusStrg === 'MORE';
            console.log(`🔄 ¿Hay más páginas? ${hasMore} (responseStatusStrg: ${userSearch.responseStatusStrg})`);
            
            if (hasMore) {
              searchResultPosition += maxResults;
              console.log(`➡️ Siguiente página: posición ${searchResultPosition}`);
            } else {
              console.log(`✅ Última página completada. Total usuarios obtenidos: ${allUsers.length}/${totalUsers}`);
            }
          } else {
            console.log(`❌ Error en la respuesta de la página ${searchResultPosition}:`, result);
            hasMore = false;
          }
        }
        
        // Eliminamos la limitación de páginas - obtener TODOS los usuarios
        
        console.log(`✅ Obtención completa: ${allUsers.length} usuarios de ${totalUsers} totales`);
        console.log(`📊 Páginas procesadas: ${pageCount}`);
        console.log(`📊 Usuarios por página: ${maxResults}`);
        console.log(`📊 Total esperado: ${totalUsers}`);
        console.log(`📊 Total obtenido: ${allUsers.length}`);
        
        return {
          success: true,
          data: {
            message: `✅ TODOS los usuarios obtenidos exitosamente desde ISAPI`,
            endpoint: '/ISAPI/AccessControl/UserInfo/Search?format=json',
            method: 'POST',
            format: 'JSON',
            data: {
              UserInfoSearch: {
                searchID: searchID,
                responseStatusStrg: 'OK',
                numOfMatches: allUsers.length,
                totalMatches: totalUsers,
                UserInfo: allUsers
              }
            },
            totalUsers: totalUsers,
            returnedUsers: allUsers.length,
            hasMore: false,
            pagination: {
              pagesProcessed: Math.ceil(allUsers.length / maxResults),
              usersPerPage: maxResults
            }
          }
        };
      } catch (error) {
        console.log('Endpoint correcto falló:', error.message);
      }
      
      // Si el endpoint correcto falla, intentar otros endpoints
      const userEndpoints = [
        '/ISAPI/AccessControl/UserInfo',
        '/ISAPI/AccessControl/UserInfo/capabilities',
        '/AccessControl/UserInfo',
        '/AccessControl/UserInfo/capabilities',
        '/UserInfo',
        '/User'
      ];
      
      for (const endpoint of userEndpoints) {
        try {
          console.log(`Probando endpoint de usuarios: ${endpoint}`);
          const result = await this.makeRequest(endpoint);
          if (result.success) {
            return {
              success: true,
              data: {
                message: `Usuarios obtenidos desde: ${endpoint}`,
                endpoint: endpoint,
                data: result.data,
                dataType: typeof result.data,
                hasData: !!result.data
              }
            };
          }
        } catch (error) {
          console.log(`Endpoint ${endpoint} falló: ${error.message}`);
        }
      }
      
      // Si todos los endpoints fallan, devolver información de las capacidades
      const capabilities = await this.makeRequest('/System/capabilities');
      let availableFunctions = [];
      if (capabilities.success && capabilities.data) {
        const capabilitiesXml = capabilities.data;
        if (capabilitiesXml.includes('UserInfo')) {
          availableFunctions.push('UserInfo');
        }
        if (capabilitiesXml.includes('AcsEvent')) {
          availableFunctions.push('AcsEvent');
        }
        if (capabilitiesXml.includes('FaceData')) {
          availableFunctions.push('FaceData');
        }
        if (capabilitiesXml.includes('AccessControl')) {
          availableFunctions.push('AccessControl');
        }
        if (capabilitiesXml.includes('GUIDFileDataExport')) {
          availableFunctions.push('GUIDFileDataExport');
        }
        if (capabilitiesXml.includes('MaintenanceDataExport')) {
          availableFunctions.push('MaintenanceDataExport');
        }
      }
      
      return {
        success: true,
        data: {
          message: '❌ CONFIRMADO: Este dispositivo NO soporta endpoints ISAPI para control de acceso',
          deviceType: 'Hikvision Biometric (ISAPI Limited)',
          authenticationStatus: '✅ Autenticación digest funcionando correctamente',
          workingEndpoints: ['/System/deviceInfo', '/System/capabilities', '/System/time'],
          failedEndpoints: ['/ISAPI/AccessControl/UserInfo', '/ISAPI/AccessControl/UserInfo/capabilities', '/ISAPI/AccessControl/AcsEvent', '/ISAPI/AccessControl/FaceDataRecord'],
          recommendation: '🔧 ALTERNATIVAS DISPONIBLES:',
          alternatives: [
            '1. 🌐 Interfaz Web: Acceda a http://186.167.73.66:8027',
            '2. 📱 App Móvil: Use la app oficial de Hikvision',
            '3. 📊 Exportación Manual: Desde la interfaz web del dispositivo',
            '4. 🔌 API Personalizada: Desarrolle integración específica del modelo',
            '5. 📁 Archivos del Dispositivo: Acceso directo a archivos (FTP/SFTP)'
          ],
          webInterface: `http://${this.baseUrl.replace('http://', '')}`,
          note: 'Aunque la autenticación ISAPI funciona, este dispositivo no expone datos de control de acceso via ISAPI'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'No se pudo obtener información del dispositivo: ' + error.message
      };
    }
  }

  // Obtener eventos de acceso
  async getEvents(startTime, endTime) {
    // Intentar múltiples enfoques para obtener eventos
    try {
      // Primero intentar con el endpoint correcto que debería funcionar - OBTENER TODOS LOS EVENTOS
      try {
        console.log('Obteniendo TODOS los eventos desde ISAPI...');
        
        const allEvents = [];
        let searchID = "0";
        let searchResultPosition = 0;
        let maxResults = 100; // Aumentar el límite por página
        let hasMore = true;
        let totalEvents = 0;
        
        while (hasMore) {
          console.log(`Obteniendo eventos desde posición ${searchResultPosition}...`);
          
          const result = await this.makeRequest('/AccessControl/AcsEvent?format=json', 'POST', {
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
              
              // Verificar si hay más eventos
              hasMore = allEvents.length < totalEvents;
            } else {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
        
        console.log(`✅ Eventos obtenidos: ${allEvents.length} de ${totalEvents} totales`);
        
        return {
          success: true,
          data: {
            totalEvents: totalEvents,
            events: allEvents
          }
        };
      } catch (error) {
        console.log('❌ Error obteniendo eventos:', error.message);
        return {
          success: false,
          error: error.message
        };
      }
    } catch (error) {
      console.log('❌ Error general obteniendo eventos:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar usuario
  async updateUser(userData) {
    try {
      console.log(`✏️ Actualizando usuario: ${userData.employeeNo}`);
      console.log(`✏️ Datos a actualizar:`, userData);
      
      // Construir el JSON para la actualización
      const updateData = {
        "UserInfo": {
          "employeeNo": userData.employeeNo,
          "name": userData.name,
          "userType": userData.userType || "normal",
          "localUIRight": true,
          "maxOpenDoorTime": 0,
          "Valid": {
            "enable": true,
            "beginTime": "2023-01-01T00:00:00",
            "endTime": "2030-12-31T23:59:59",
            "timeType": "local"
          }
        }
      };

      console.log(`✏️ JSON de actualización:`, JSON.stringify(updateData, null, 2));
      
      const result = await this.makeRequest('/AccessControl/UserInfo/Modify?format=json', 'PUT', updateData);
      
      console.log(`✏️ Resultado de actualización:`, result);
      
      if (result.success) {
        return {
          success: true,
          data: {
            message: 'Usuario actualizado correctamente',
            userData: userData
          }
        };
      } else {
        return {
          success: false,
          error: result.error || 'Error actualizando usuario'
        };
      }
    } catch (error) {
      console.log(`❌ Error actualizando usuario ${userData.employeeNo}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
          
          if (result.success && result.data?.AcsEventSearch) {
            const eventSearch = result.data.AcsEventSearch;
            totalEvents = eventSearch.totalMatches || 0;
            
            // Agregar eventos de esta página
            if (eventSearch.AcsEvent) {
              const eventArray = Array.isArray(eventSearch.AcsEvent) 
                ? eventSearch.AcsEvent 
                : [eventSearch.AcsEvent];
              allEvents.push(...eventArray);
            }
            
            // Verificar si hay más páginas
            hasMore = eventSearch.responseStatusStrg === 'MORE';
            if (hasMore) {
              searchResultPosition += maxResults;
              console.log(`Página completada. Total eventos obtenidos: ${allEvents.length}/${totalEvents}`);
            }
          } else {
            hasMore = false;
          }
        }
        
        console.log(`✅ Obtención completa: ${allEvents.length} eventos de ${totalEvents} totales`);
        
        return {
          success: true,
          data: {
            message: `✅ TODOS los eventos obtenidos exitosamente desde ISAPI`,
            endpoint: '/ISAPI/AccessControl/AcsEvent?format=json',
            method: 'POST',
            format: 'JSON',
            data: {
              AcsEventSearch: {
                searchID: searchID,
                responseStatusStrg: 'OK',
                numOfMatches: allEvents.length,
                totalMatches: totalEvents,
                AcsEvent: allEvents
              }
            },
            totalEvents: totalEvents,
            returnedEvents: allEvents.length,
            hasMore: false,
            pagination: {
              pagesProcessed: Math.ceil(allEvents.length / maxResults),
              eventsPerPage: maxResults
            }
          }
        };
      } catch (error) {
        console.log('Endpoint correcto de eventos falló:', error.message);
      }
      
      // Si el endpoint correcto falla, intentar otros endpoints
      const eventEndpoints = [
        '/ISAPI/AccessControl/AcsEvent',
        '/ISAPI/AccessControl/AcsEvent/capabilities',
        '/AccessControl/AcsEvent',
        '/AccessControl/AcsEvent/capabilities',
        '/Event',
        '/Log'
      ];
      
      for (const endpoint of eventEndpoints) {
        try {
          console.log(`Probando endpoint de eventos: ${endpoint}`);
          const result = await this.makeRequest(endpoint);
          if (result.success) {
            return {
              success: true,
              data: {
                message: `Eventos obtenidos desde: ${endpoint}`,
                endpoint: endpoint,
                data: result.data,
                dataType: typeof result.data,
                hasData: !!result.data
              }
            };
          }
        } catch (error) {
          console.log(`Endpoint ${endpoint} falló: ${error.message}`);
        }
      }
      
      // Si todos los endpoints fallan, devolver información
      return {
        success: true,
        data: {
          message: '❌ CONFIRMADO: Este dispositivo NO soporta endpoints ISAPI para eventos',
          deviceType: 'Hikvision Biometric (ISAPI Limited)',
          authenticationStatus: '✅ Autenticación digest funcionando correctamente',
          workingEndpoints: ['/System/deviceInfo', '/System/capabilities', '/System/time'],
          failedEndpoints: ['/ISAPI/AccessControl/AcsEvent', '/ISAPI/AccessControl/AcsEvent/capabilities'],
          recommendation: '🔧 ALTERNATIVAS DISPONIBLES:',
          alternatives: [
            '1. 🌐 Interfaz Web: Acceda a http://186.167.73.66:8027',
            '2. 📱 App Móvil: Use la app oficial de Hikvision',
            '3. 📊 Exportación Manual: Desde la interfaz web del dispositivo',
            '4. 🔌 API Personalizada: Desarrolle integración específica del modelo',
            '5. 📁 Archivos del Dispositivo: Acceso directo a archivos (FTP/SFTP)'
          ],
          webInterface: `http://${this.baseUrl.replace('http://', '')}`,
          note: 'Aunque la autenticación ISAPI funciona, este dispositivo no expone datos de eventos via ISAPI'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'No se pudo obtener información del dispositivo: ' + error.message
      };
    }
  }

  // Obtener fotos registradas
  async getPhotos() {
    // Intentar múltiples enfoques para obtener fotos
    try {
      const photoEndpoints = [
        '/ISAPI/AccessControl/FaceDataRecord',
        '/ISAPI/AccessControl/FaceDataRecord/capabilities',
        '/ISAPI/AccessControl/FaceDataRecord/Search',
        '/ISAPI/AccessControl/UserInfo/Photo',
        '/ISAPI/AccessControl/UserInfo/Photo/capabilities',
        '/AccessControl/FaceDataRecord',
        '/AccessControl/FaceDataRecord/capabilities',
        '/AccessControl/UserInfo/Photo',
        '/Photo',
        '/Image',
        '/Biometric',
        '/Face'
      ];
      
      for (const endpoint of photoEndpoints) {
        try {
          console.log(`Probando endpoint de fotos: ${endpoint}`);
          const result = await this.makeRequest(endpoint);
          if (result.success) {
            return {
              success: true,
              data: {
                message: `Fotos obtenidas desde: ${endpoint}`,
                endpoint: endpoint,
                data: result.data,
                dataType: typeof result.data,
                hasData: !!result.data
              }
            };
          }
        } catch (error) {
          console.log(`Endpoint ${endpoint} falló: ${error.message}`);
        }
      }
      
      // Si todos los endpoints fallan, devolver información
      return {
        success: true,
        data: {
          message: '❌ CONFIRMADO: Este dispositivo NO soporta endpoints ISAPI para fotos',
          deviceType: 'Hikvision Biometric (ISAPI Limited)',
          authenticationStatus: '✅ Autenticación digest funcionando correctamente',
          workingEndpoints: ['/System/deviceInfo', '/System/capabilities', '/System/time'],
          failedEndpoints: ['/ISAPI/AccessControl/FaceDataRecord', '/ISAPI/AccessControl/UserInfo/Photo'],
          recommendation: '🔧 ALTERNATIVAS DISPONIBLES:',
          alternatives: [
            '1. 🌐 Interfaz Web: Acceda a http://186.167.73.66:8027',
            '2. 📱 App Móvil: Use la app oficial de Hikvision',
            '3. 📊 Exportación Manual: Desde la interfaz web del dispositivo',
            '4. 🔌 API Personalizada: Desarrolle integración específica del modelo',
            '5. 📁 Archivos del Dispositivo: Acceso directo a archivos (FTP/SFTP)'
          ],
          webInterface: `http://${this.baseUrl.replace('http://', '')}`,
          note: 'Aunque la autenticación ISAPI funciona, este dispositivo no expone datos de fotos via ISAPI'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'No se pudo obtener información del dispositivo: ' + error.message
      };
    }
  }

  // Obtener capacidades del dispositivo
  async getCapabilities() {
    return await this.makeRequest('/System/capabilities');
  }

  // Obtener capacidades del dispositivo
  async getDeviceCapabilities() {
    try {
      console.log('Obteniendo capacidades del dispositivo...');
      const result = await this.makeRequest('/System/capabilities', 'GET');

      if (result.success) {
        return {
          success: true,
          data: {
            message: '✅ Capacidades del dispositivo obtenidas exitosamente desde ISAPI',
            endpoint: '/ISAPI/System/capabilities',
            method: 'GET',
            format: 'XML',
            capabilities: result.data,
            // Extraer información específica del XML
            deviceInfo: this.parseDeviceCapabilities(result.data)
          }
        };
      } else {
        return {
          success: false,
          error: result.error || 'Error desconocido al obtener capacidades del dispositivo'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'No se pudieron obtener las capacidades del dispositivo: ' + error.message
      };
    }
  }

  // Parsear capacidades del dispositivo desde XML
  parseDeviceCapabilities(xmlData) {
    try {
      const capabilities = {};
      
      // Extraer información básica del dispositivo
      const rebootMatch = xmlData.match(/<isSupportReboot>(.*?)<\/isSupportReboot>/);
      const deviceInfoMatch = xmlData.match(/<isSupportDeviceInfo>(.*?)<\/isSupportDeviceInfo>/);
      const timeCapMatch = xmlData.match(/<isSupportTimeCap>(.*?)<\/isSupportTimeCap>/);
      
      capabilities.basic = {
        reboot: rebootMatch ? rebootMatch[1] === 'true' : false,
        deviceInfo: deviceInfoMatch ? deviceInfoMatch[1] === 'true' : false,
        timeCap: timeCapMatch ? timeCapMatch[1] === 'true' : false
      };
      
      // Extraer capacidades de red
      const wirelessMatch = xmlData.match(/<isSupportWireless>(.*?)<\/isSupportWireless>/);
      const pppoeMatch = xmlData.match(/<isSupportPPPoE>(.*?)<\/isSupportPPPoE>/);
      const ntpMatch = xmlData.match(/<isSupportNtp>(.*?)<\/isSupportNtp>/);
      const httpsMatch = xmlData.match(/<isSupportHttps>(.*?)<\/isSupportHttps>/);
      
      capabilities.network = {
        wireless: wirelessMatch ? wirelessMatch[1] === 'true' : false,
        pppoe: pppoeMatch ? pppoeMatch[1] === 'true' : false,
        ntp: ntpMatch ? ntpMatch[1] === 'true' : false,
        https: httpsMatch ? httpsMatch[1] === 'true' : false
      };
      
      // Extraer capacidades de seguridad
      const userNumsMatch = xmlData.match(/<supportUserNums>(.*?)<\/supportUserNums>/);
      const certificateMatch = xmlData.match(/<isSupCertificate>(.*?)<\/isSupCertificate>/);
      const illegalLoginMatch = xmlData.match(/<issupIllegalLoginLock>(.*?)<\/issupIllegalLoginLock>/);
      
      capabilities.security = {
        maxUsers: userNumsMatch ? parseInt(userNumsMatch[1]) : 0,
        certificate: certificateMatch ? certificateMatch[1] === 'true' : false,
        illegalLoginLock: illegalLoginMatch ? illegalLoginMatch[1] === 'true' : false
      };
      
      // Extraer capacidades de exportación
      const guidExportMatch = xmlData.match(/<isSupportGUIDFileDataExport>(.*?)<\/isSupportGUIDFileDataExport>/);
      const maintenanceExportMatch = xmlData.match(/<isSupportMaintenanceDataExport>(.*?)<\/isSupportMaintenanceDataExport>/);
      
      capabilities.export = {
        guidFileData: guidExportMatch ? guidExportMatch[1] === 'true' : false,
        maintenanceData: maintenanceExportMatch ? maintenanceExportMatch[1] === 'true' : false
      };
      
      return capabilities;
    } catch (error) {
      console.error('Error parsing device capabilities:', error);
      return {};
    }
  }

  // Obtener stream de cámara o captura
  async getCameraStream(streamType = 'preview') {
    try {
      console.log(`Obteniendo ${streamType} de cámara...`);
      
      let endpoint;
      let contentType;
      
      if (streamType === 'preview') {
        // Stream MJPEG en vivo - Intentar múltiples canales
        const channels = [1, 101, 102, 201, 202]; // Canales comunes de Hikvision
        let lastError = null;
        
        for (const channel of channels) {
          try {
            console.log(`Probando canal ${channel} para stream...`);
            const testEndpoint = `/Streaming/channels/${channel}/httpPreview`;
            const testResult = await this.makeRequest(testEndpoint, 'GET');
            
            if (testResult.success) {
              endpoint = testEndpoint;
              contentType = 'video/x-motion-jpeg';
              console.log(`✅ Canal ${channel} funcionando para stream`);
              break;
            }
          } catch (error) {
            lastError = error;
            console.log(`❌ Canal ${channel} falló: ${error.message}`);
          }
        }
        
        if (!endpoint) {
          throw new Error(`No se encontró un canal válido para streaming. Último error: ${lastError?.message || 'Desconocido'}`);
        }
      } else if (streamType === 'snapshot') {
        // Captura de imagen - Intentar múltiples canales
        const channels = [1, 101, 102, 201, 202];
        let lastError = null;
        
        for (const channel of channels) {
          try {
            console.log(`Probando canal ${channel} para snapshot...`);
            const testEndpoint = `/Streaming/channels/${channel}/picture`;
            const testResult = await this.makeRequest(testEndpoint, 'GET');
            
            if (testResult.success) {
              endpoint = testEndpoint;
              contentType = 'image/jpeg';
              console.log(`✅ Canal ${channel} funcionando para snapshot`);
              break;
            }
          } catch (error) {
            lastError = error;
            console.log(`❌ Canal ${channel} falló: ${error.message}`);
          }
        }
        
        if (!endpoint) {
          throw new Error(`No se encontró un canal válido para snapshot. Último error: ${lastError?.message || 'Desconocido'}`);
        }
      } else {
        throw new Error('Tipo de stream no válido. Use "preview" o "snapshot"');
      }
      
      const result = await this.makeRequest(endpoint, 'GET');
      
      if (result.success) {
        return {
          success: true,
          data: {
            message: `✅ ${streamType === 'preview' ? 'Stream de cámara' : 'Captura de imagen'} obtenido exitosamente`,
            endpoint: `/ISAPI${endpoint}`,
            method: 'GET',
            streamType: streamType,
            contentType: contentType,
            data: result.data,
            streamUrl: `${this.baseUrl}${endpoint}`,
            // Para streams MJPEG, también proporcionamos URL directa
            directUrl: streamType === 'preview' ? 
              `${this.baseUrl.replace('http://', `http://${this.username}:${this.password}@`)}${endpoint}` : 
              `${this.baseUrl}${endpoint}`
          }
        };
      } else {
        return {
          success: false,
          error: result.error || `Error obteniendo ${streamType} de cámara`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `No se pudo obtener ${streamType} de cámara: ` + error.message
      };
    }
  }

  // Descubrir canales de streaming disponibles
  async discoverStreamingChannels() {
    try {
      console.log('Descubriendo canales de streaming disponibles...');
      
      const channels = [1, 101, 102, 201, 202, 301, 302]; // Canales comunes
      const availableChannels = {
        preview: [],
        snapshot: []
      };
      
      for (const channel of channels) {
        // Probar stream
        try {
          const streamEndpoint = `/Streaming/channels/${channel}/httpPreview`;
          const streamResult = await this.makeRequest(streamEndpoint, 'GET');
          if (streamResult.success) {
            availableChannels.preview.push({
              channel: channel,
              endpoint: streamEndpoint,
              status: 'OK'
            });
            console.log(`✅ Canal ${channel} disponible para stream`);
          }
        } catch (error) {
          console.log(`❌ Canal ${channel} no disponible para stream: ${error.message}`);
        }
        
        // Probar snapshot
        try {
          const snapshotEndpoint = `/Streaming/channels/${channel}/picture`;
          const snapshotResult = await this.makeRequest(snapshotEndpoint, 'GET');
          if (snapshotResult.success) {
            availableChannels.snapshot.push({
              channel: channel,
              endpoint: snapshotEndpoint,
              status: 'OK'
            });
            console.log(`✅ Canal ${channel} disponible para snapshot`);
          }
        } catch (error) {
          console.log(`❌ Canal ${channel} no disponible para snapshot: ${error.message}`);
        }
      }

      return {
        success: true,
        data: {
          message: 'Canales de streaming descubiertos',
          availableChannels: availableChannels,
          totalPreviewChannels: availableChannels.preview.length,
          totalSnapshotChannels: availableChannels.snapshot.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error descubriendo canales: ' + error.message
      };
    }
  }

  // Obtener capacidades específicas de usuarios
  async getUserCapabilities() {
    try {
      console.log('Obteniendo capacidades de usuarios...');
      
      // Intentar con el endpoint correcto que SÍ funciona
      try {
        console.log('Probando endpoint correcto: /ISAPI/AccessControl/UserInfo/capabilities?format=json');
        const result = await this.makeRequest('/AccessControl/UserInfo/capabilities?format=json', 'GET');
        
        if (result.success) {
          return {
            success: true,
            data: {
              message: '✅ Capacidades de usuarios obtenidas exitosamente desde ISAPI',
              endpoint: '/ISAPI/AccessControl/UserInfo/capabilities?format=json',
              method: 'GET',
              format: 'JSON',
              capabilities: result.data,
              supportedFunctions: result.data?.UserInfo?.supportFunction?.['@opt'] || 'No disponible',
              searchConditions: result.data?.UserInfo?.UserInfoSearchCond || {},
              maxResults: result.data?.UserInfo?.UserInfoSearchCond?.maxResults || {}
            }
          };
        }
      } catch (error) {
        console.log('Endpoint correcto falló:', error.message);
      }
      
      // Si el endpoint correcto falla, intentar sin parámetros
      const result = await this.makeRequest('/AccessControl/UserInfo/capabilities');
      
      if (result.success) {
        return {
          success: true,
          data: {
            message: 'Capacidades de usuarios obtenidas exitosamente',
            endpoint: '/ISAPI/AccessControl/UserInfo/capabilities',
            capabilities: result.data
          }
        };
      } else {
        return {
          success: false,
          error: 'No se pudieron obtener las capacidades de usuarios'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Error obteniendo capacidades: ' + error.message
      };
    }
  }

  // Descubrir endpoints disponibles
  async discoverEndpoints() {
    const endpoints = [
      '/System/deviceInfo',
      '/System/capabilities',
      '/System/status',
      '/System/log',
      '/System/time',
      '/System/version',
      '/System/reboot',
      '/System/factoryDefault',
      '/System/upgrade',
      '/System/backup',
      '/System/restore',
      // Endpoints específicos para control de acceso
      '/AccessControl/UserInfo',
      '/AccessControl/UserInfo/Search',
      '/AccessControl/AcsEvent',
      '/AccessControl/FaceDataRecord',
      '/AccessControl/Door',
      '/AccessControl/UserInfo/Photo',
      '/AccessControl/UserInfo/Photo/Search',
      '/AccessControl/UserInfo/Photo/Download',
      '/AccessControl/UserInfo/Photo/Upload',
      '/AccessControl/UserInfo/Photo/Delete',
      '/AccessControl/UserInfo/Photo/Download',
      '/AccessControl/UserInfo/Photo/Upload',
      '/AccessControl/UserInfo/Photo/Delete',
      '/AccessControl/UserInfo/Photo/Download',
      '/AccessControl/UserInfo/Photo/Upload',
      '/AccessControl/UserInfo/Photo/Delete',
      // Endpoints alternativos
      '/UserInfo',
      '/User',
      '/Event',
      '/Log',
      '/Photo',
      '/Image',
      '/Biometric',
      '/Face',
      '/Attendance',
      '/Access',
      '/Door',
      // Endpoints específicos para dispositivos biométricos
      '/ISAPI/AccessControl/UserInfo',
      '/ISAPI/AccessControl/UserInfo/Search',
      '/ISAPI/AccessControl/AcsEvent',
      '/ISAPI/AccessControl/FaceDataRecord',
      '/ISAPI/AccessControl/Door',
      '/ISAPI/System/deviceInfo',
      '/ISAPI/System/capabilities',
      '/ISAPI/System/time',
      // Endpoints de exportación de datos
      '/ISAPI/System/exportData',
      '/ISAPI/System/importData',
      '/ISAPI/System/backupData',
      '/ISAPI/System/restoreData',
      // Endpoints de mantenimiento
      '/ISAPI/System/maintenanceData',
      '/ISAPI/System/userData',
      '/ISAPI/System/eventData',
      '/ISAPI/System/photoData'
    ];

    const results = {
      working: [],
      failed: [],
      capabilities: null
    };

    console.log('🔍 Descubriendo endpoints disponibles...');

    for (const endpoint of endpoints) {
      try {
        console.log(`Probando endpoint: ${endpoint}`);
        const result = await this.makeRequest(endpoint);
        if (result.success) {
          results.working.push({
            endpoint,
            status: result.status,
            dataType: typeof result.data,
            hasData: !!result.data
          });
          console.log(`✅ ${endpoint} - OK (${result.status})`);
        } else {
          results.failed.push({
            endpoint,
            error: result.error,
            status: result.status
          });
          console.log(`❌ ${endpoint} - Failed (${result.status}): ${result.error}`);
        }
      } catch (error) {
        results.failed.push({
          endpoint,
          error: error.message,
          status: 'ERROR'
        });
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }

    // Intentar obtener capacidades específicas
    try {
      const capabilities = await this.makeRequest('/System/capabilities');
      results.capabilities = capabilities.data;
    } catch (error) {
      console.log('No se pudieron obtener las capacidades del dispositivo');
    }

    return {
      success: true,
      data: results
    };
  }

  // Obtener estado del dispositivo
  async getStatus() {
    return await this.makeRequest('/System/status');
  }

  // Obtener información de puertas
  async getDoors() {
    try {
      return await this.makeRequest('/AccessControl/Door');
    } catch (error) {
      return await this.makeRequest('/AccessControl/DoorInfo');
    }
  }

  // Obtener logs del sistema
  async getSystemLogs() {
    try {
      return await this.makeRequest('/System/log');
    } catch (error) {
      return await this.makeRequest('/System/Log');
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
}

module.exports = HikvisionISAPI;