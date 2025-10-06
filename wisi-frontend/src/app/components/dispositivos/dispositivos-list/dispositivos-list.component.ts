import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DispositivosService } from '../../../services/dispositivos.service';
import { AuthService } from '../../../services/auth.service';
import { HikvisionIsapiService } from '../../../services/hikvision-isapi.service';
import { XmlParserService } from '../../../services/xml-parser.service';

@Component({
  selector: 'app-dispositivos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dispositivos-list.component.html',
  styleUrls: ['./dispositivos-list.component.css']
})
export class DispositivosListComponent implements OnInit, OnDestroy {
  dispositivos: any[] = [];
  loading = true;
  isCreator = false;
  showBiometricModal = false;
  showEditModal = false;
  selectedDispositivo: any = null;
  editingDispositivo: any = null;
  connectionStatus = 'disconnected';
  testing = false;
  biometricResult: string = '';

  // Variables para la modal de foto
  showPhotoModal = false;
  selectedUser: any = null;
  userPhotoUrl = '';
  photoLoading = false;
  photoError = '';

  // Variables para el modo de vista (lista, foto, editar, test)
  currentView = 'lista'; // 'lista', 'foto', 'editar', 'test'
  showUserTable = false; // Controla si se muestra la tabla de usuarios
  editingUser: any = null;
  
  // Variables de estado para spinners
  loadingUsers = false;
  creatingUser = false;
  updatingUser = false;
  deletingUser = false;
  deletingUsers: { [key: string]: boolean } = {}; // Estado individual para cada usuario

  // Variables para agregar usuario
  addUserForm: any;
  selectedPhoto: string | null = null;
  isAddingUser = false;
  
  // Variables para editar usuario
  editUserForm: any;
  originalUserData: any = null;
  
  // Variables para crear usuario
  createUserForm: any;
  
  // Variables para usuarios biométricos
  biometricUsers: any[] = [];

  constructor(
    private dispositivosService: DispositivosService,
    private authService: AuthService,
    private hikvisionService: HikvisionIsapiService,
    private xmlParser: XmlParserService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🔧 Inicializando componente DispositivosListComponent');
    this.initializeForms();
    this.loadDispositivos();
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }

  private initializeForms(): void {
    console.log('🔧 Inicializando formularios...');
    
    // Inicializar formulario de agregar usuario
    this.addUserForm = this.fb.group({
      employeeNo: ['', Validators.required],
      name: ['', Validators.required],
      userType: ['normal'],
      closeDelayEnabled: [false],
      belongGroup: [''],
      password: [''],
      doorRight: ['1'],
      maxOpenDoorTime: [0],
      openDoorTime: [0],
      roomNumber: [0],
      floorNumber: [0],
      localUIRight: [true],
      userVerifyMode: ['face'],
      gender: [''],
      numOfCard: [0],
      numOfFace: [1],
      ValidEnable: [true],
      ValidBeginTime: ['2024-01-01T00:00:00'],
      ValidEndTime: ['2030-12-31T23:59:59'],
      ValidTimeType: ['local'],
      RightPlanDoorNo: ['1'],
      RightPlanTemplateNo: ['1'],
      PersonInfoExtends: ['']
    });

    // Inicializar formulario de editar usuario
    this.editUserForm = this.fb.group({
      employeeNo: [{value: '', disabled: true}],
      name: [''],
      userType: [{value: '', disabled: true}],
      closeDelayEnabled: [{value: false, disabled: true}],
      belongGroup: [{value: '', disabled: true}],
      password: [{value: '', disabled: true}],
      doorRight: [{value: '', disabled: true}],
      maxOpenDoorTime: [{value: 0, disabled: true}],
      openDoorTime: [{value: 0, disabled: true}],
      roomNumber: [{value: 0, disabled: true}],
      floorNumber: [{value: 0, disabled: true}],
      localUIRight: [{value: true, disabled: true}],
      userVerifyMode: [{value: '', disabled: true}],
      gender: [''],
      numOfCard: [{value: 0, disabled: true}],
      numOfFace: [{value: 0, disabled: true}],
      ValidEnable: [{value: true, disabled: true}],
      ValidBeginTime: [''],
      ValidEndTime: [''],
      ValidTimeType: [{value: 'local', disabled: true}],
      RightPlanDoorNo: [{value: '', disabled: true}],
      RightPlanTemplateNo: [{value: '', disabled: true}],
      PersonInfoExtends: [{value: '', disabled: true}]
    });

    // Inicializar formulario de crear usuario
    this.createUserForm = this.fb.group({
      employeeNo: [''],
      name: [''],
      userType: [{value: 'normal', disabled: true}],
      closeDelayEnabled: [{value: false, disabled: true}],
      belongGroup: [{value: '', disabled: true}],
      password: [{value: '', disabled: true}],
      doorRight: [{value: '1', disabled: true}],
      maxOpenDoorTime: [{value: 0, disabled: true}],
      openDoorTime: [{value: 0, disabled: true}],
      roomNumber: [{value: 0, disabled: true}],
      floorNumber: [{value: 0, disabled: true}],
      localUIRight: [{value: true, disabled: true}],
      userVerifyMode: [{value: 'face', disabled: true}],
      gender: [''],
      numOfCard: [{value: 0, disabled: true}],
      numOfFace: [{value: 1, disabled: true}],
      ValidEnable: [{value: true, disabled: true}],
      ValidBeginTime: ['2024-01-01T00:00:00'],
      ValidEndTime: ['2030-12-31T23:59:59'],
      ValidTimeType: [{value: 'local', disabled: true}],
      RightPlanDoorNo: [{value: '1', disabled: true}],
      RightPlanTemplateNo: [{value: '1', disabled: true}],
      PersonInfoExtends: [{value: '', disabled: true}]
    });
    
    console.log('✅ Formularios inicializados correctamente');
    console.log('📝 addUserForm:', this.addUserForm);
    console.log('📝 editUserForm:', this.editUserForm);
    console.log('📝 createUserForm:', this.createUserForm);
  }

  loadDispositivos(): void {
    this.dispositivosService.getDispositivos().subscribe({
      next: (response: any) => {
        this.dispositivos = response.data || response;
        this.loading = false;
        console.log('Dispositivos cargados:', this.dispositivos);
      },
      error: (error) => {
        console.error('Error cargando dispositivos:', error);
        this.loading = false;
      }
    });
  }

  openBiometricModal(dispositivo: any): void {
    this.selectedDispositivo = dispositivo;
    this.showBiometricModal = true;
    this.currentView = 'lista';
    this.biometricUsers = [];
    this.showUserTable = false; // Ocultar tabla inicialmente
    
    // Probar conexión automáticamente
    setTimeout(() => {
      this.testConnection();
    }, 500);
  }

  closeBiometricModal(): void {
    this.showBiometricModal = false;
    this.selectedDispositivo = null;
    this.currentView = 'lista';
    this.biometricUsers = [];
    this.editingUser = null;
    this.showUserTable = false; // Resetear tabla
    this.deletingUsers = {}; // Limpiar estados individuales de eliminación
  }

  testConnection(): void {
    this.testing = true;
    this.connectionStatus = 'testing';
    this.currentView = 'test';
    
    this.hikvisionService.testConnection(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave
    ).subscribe({
      next: (response) => {
        this.testing = false;
        if (response.success) {
          this.connectionStatus = 'connected';
          this.biometricResult = 'Conexión exitosa';
        } else {
          this.connectionStatus = 'error';
          this.biometricResult = 'Error de conexión: ' + (response.error || 'Desconocido');
        }
      },
      error: (error) => {
        this.testing = false;
        this.connectionStatus = 'error';
        this.biometricResult = 'Error de conexión: ' + error.message;
      }
    });
  }

  getUsers(): void {
    this.loadingUsers = true;
    this.currentView = 'lista'; // Cambiar a la vista de lista
    this.showUserTable = true; // Mostrar tabla cuando se hace clic en "Ver Usuarios Registrados"
    
    this.hikvisionService.getUsers(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave
    ).subscribe({
      next: (response) => {
        console.log('Respuesta de getUsers:', response);
        this.biometricUsers = response.data?.users || response.UserInfo || [];
        this.loadingUsers = false;
        console.log('Usuarios cargados:', this.biometricUsers);
      },
      error: (error) => {
        console.error('Error obteniendo usuarios:', error);
        this.loadingUsers = false;
      }
    });
  }

  verFoto(user: any): void {
    console.log('Ver foto del usuario:', user);
    this.editingUser = user;
    this.currentView = 'foto';
    this.photoLoading = true;
    this.photoError = '';
    
    // LIMPIAR la variable para que siempre inicie vacía
    this.userPhotoUrl = '';
    console.log('🧹 userPhotoUrl inicializado como vacío');
    
    this.hikvisionService.getUserPhoto(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      user.employeeNo
    ).subscribe({
      next: (response) => {
        console.log('Respuesta de getUserPhoto:', response);
        this.photoLoading = false;
        if (response.success && response.data?.photoUrl && response.data.photoUrl.trim() !== '') {
          // Validar que la URL base64 sea válida
          const photoUrl = response.data.photoUrl;
          console.log('🔍 URL recibida (primeros 100 chars):', photoUrl.substring(0, 100));
          console.log('🔍 Longitud de URL:', photoUrl.length);
          
          // Verificar que sea una URL base64 válida
          if (photoUrl.startsWith('data:image/') && photoUrl.includes('base64,')) {
            // Verificar que la URL no esté corrupta (debe tener contenido después de base64,)
            const base64Index = photoUrl.indexOf('base64,');
            const base64Data = photoUrl.substring(base64Index + 7);
            
            if (base64Data.length > 100) { // Debe tener al menos 100 caracteres de datos
              // Usar la URL base64 directamente sin modificar
              this.userPhotoUrl = photoUrl;
              console.log('✅ Foto válida asignada, datos base64:', base64Data.length, 'caracteres');
            } else {
              console.log('❌ URL base64 corrupta, datos insuficientes:', base64Data.length, 'caracteres');
              this.userPhotoUrl = '';
              this.photoError = 'Imagen corrupta o incompleta';
            }
          } else {
            console.log('❌ URL base64 inválida, formato incorrecto');
            this.userPhotoUrl = '';
            this.photoError = 'Formato de imagen no válido';
          }
        } else {
          // Si no hay foto, limpiar la URL
          console.log('❌ No hay foto, limpiando userPhotoUrl');
          this.userPhotoUrl = '';
          this.photoError = 'No se encontró foto para este usuario';
        }
      },
      error: (error) => {
        console.error('Error obteniendo foto:', error);
        this.photoLoading = false;
        this.userPhotoUrl = '';
        this.photoError = 'Error cargando foto: ' + error.message;
      }
    });
  }

  editarUsuario(user: any): void {
    console.log('Editando usuario:', user);
    this.editingUser = user;
    this.currentView = 'editar';
    
    // Obtener información completa del usuario
    this.hikvisionService.getUserInfo(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      user.employeeNo
    ).subscribe({
      next: (response) => {
        console.log('Información del usuario:', response);
        if (response.success && response.data) {
          this.originalUserData = response.data;
          this.populateEditForm(response.data);
        }
      },
      error: (error) => {
        console.error('Error obteniendo información del usuario:', error);
      }
    });
  }

  private populateEditForm(userData: any): void {
    this.editUserForm.patchValue({
      employeeNo: userData.employeeNo || '',
      name: userData.name || '',
      userType: userData.userType || '',
      closeDelayEnabled: userData.closeDelayEnabled || false,
      belongGroup: userData.belongGroup || '',
      password: userData.password || '',
      doorRight: userData.doorRight || '',
      maxOpenDoorTime: userData.maxOpenDoorTime || 0,
      openDoorTime: userData.openDoorTime || 0,
      roomNumber: userData.roomNumber || 0,
      floorNumber: userData.floorNumber || 0,
      localUIRight: userData.localUIRight || true,
      userVerifyMode: userData.userVerifyMode || '',
      gender: userData.gender || '',
      numOfCard: userData.numOfCard || 0,
      numOfFace: userData.numOfFace || 0,
      ValidEnable: userData.Valid?.enable || true,
      ValidBeginTime: userData.Valid?.beginTime || '',
      ValidEndTime: userData.Valid?.endTime || '',
      ValidTimeType: userData.Valid?.timeType || 'local',
      RightPlanDoorNo: userData.RightPlan?.[0]?.doorNo || '',
      RightPlanTemplateNo: userData.RightPlan?.[0]?.planTemplateNo || '',
      PersonInfoExtends: userData.PersonInfoExtends?.[0]?.value || ''
    });
  }

  eliminarUsuario(user: any): void {
    console.log('Eliminando usuario:', user);
    this.deletingUsers[user.employeeNo] = true; // Estado individual para este usuario
    
    this.hikvisionService.deleteUser(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      user.employeeNo
    ).subscribe({
      next: (response) => {
        console.log('Usuario eliminado:', response);
        if (response.success) {
          // Si el usuario se eliminó exitosamente, proceder a eliminar la foto
          console.log('✅ Usuario eliminado exitosamente, ahora eliminando foto...');
          this.eliminarFotoDelUsuario(user.employeeNo);
        } else {
          this.deletingUsers[user.employeeNo] = false;
          console.log('❌ No se pudo eliminar el usuario, manteniendo en la lista');
        }
      },
      error: (error) => {
        console.error('Error eliminando usuario:', error);
        this.deletingUsers[user.employeeNo] = false;
      }
    });
  }

  eliminarFotoDelUsuario(employeeNo: string): void {
    console.log('🗑️ Eliminando foto del usuario:', employeeNo);
    
    // Construir payload para eliminar solo la foto
    const deletePhotoPayload = {
      "FPID": [
        {
          "value": employeeNo
        }
      ]
    };

    console.log('🗑️ Payload para eliminar foto:', deletePhotoPayload);

    // Llamar al servicio para eliminar solo la foto
    this.hikvisionService.deleteUserPhotoOnly(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      deletePhotoPayload
    ).subscribe({
      next: (response) => {
        console.log('✅ Foto eliminada exitosamente:', response);
        this.deletingUsers[employeeNo] = false; // Estado individual para este usuario
        // Remover solo el usuario específico del array
        this.removerUsuarioDelArray(employeeNo);
        this.currentView = 'lista';
      },
      error: (error) => {
        console.error('❌ Error eliminando foto:', error);
        // Aunque falle la eliminación de la foto, el usuario ya fue eliminado
        // así que continuamos con el flujo normal
        this.deletingUsers[employeeNo] = false; // Estado individual para este usuario
        this.removerUsuarioDelArray(employeeNo);
        this.currentView = 'lista';
      }
    });
  }

  removerUsuarioDelArray(employeeNo: string): void {
    console.log('🗑️ Removiendo usuario del array:', employeeNo);
    // Filtrar el array para remover solo el usuario específico
    this.biometricUsers = this.biometricUsers.filter(user => user.employeeNo !== employeeNo);
    console.log('✅ Usuario removido del array. Usuarios restantes:', this.biometricUsers.length);
  }

  actualizarUsuario(): void {
    console.log('Actualizando usuario...');
    this.updatingUser = true;
    
    const formData = this.editUserForm.value;
    const originalData = this.originalUserData;
    
    // Construir payload con datos originales para campos deshabilitados
    const userPayload = {
      "UserInfo": {
        "employeeNo": originalData?.employeeNo || "",
        "name": formData.name || "",
        "userType": originalData?.userType || "",
        "closeDelayEnabled": originalData?.closeDelayEnabled || false,
        "belongGroup": originalData?.belongGroup || "",
        "password": originalData?.password || "",
        "doorRight": originalData?.doorRight || "",
        "maxOpenDoorTime": originalData?.maxOpenDoorTime || 0,
        "openDoorTime": originalData?.openDoorTime || 0,
        "roomNumber": originalData?.roomNumber || 0,
        "floorNumber": originalData?.floorNumber || 0,
        "localUIRight": originalData?.localUIRight || true,
        "userVerifyMode": originalData?.userVerifyMode || "",
        "gender": formData.gender || "",
        "numOfCard": originalData?.numOfCard || 0,
        "numOfFace": originalData?.numOfFace || 0,
        "Valid": {
          "enable": originalData?.Valid?.enable || true,
          "beginTime": formData.ValidBeginTime || "",
          "endTime": formData.ValidEndTime || "",
          "timeType": originalData?.Valid?.timeType || "local"
        },
        "RightPlan": [
          {
            "doorNo": originalData?.RightPlan?.[0]?.doorNo || "",
            "planTemplateNo": originalData?.RightPlan?.[0]?.planTemplateNo || ""
          }
        ],
        "PersonInfoExtends": [
          {
            "value": originalData?.PersonInfoExtends?.[0]?.value || ""
          }
        ]
      }
    };

    console.log('Payload de actualización:', userPayload);

    this.hikvisionService.updateUser(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      userPayload
    ).subscribe({
      next: (response) => {
        console.log('Usuario actualizado:', response);
        this.updatingUser = false;
        if (response.success) {
          this.getUsers(); // Recargar lista
          this.currentView = 'lista';
        }
      },
      error: (error) => {
        console.error('Error actualizando usuario:', error);
        this.updatingUser = false;
      }
    });
  }

  abrirVistaCrear(): void {
    this.currentView = 'crear';
    this.inicializarFormularioCrear();
  }

  inicializarFormularioCrear(): void {
    // Establecer valores por defecto para fechas
    this.createUserForm.patchValue({
      ValidBeginTime: '2024-01-01T00:00:00',
      ValidEndTime: '2030-12-31T23:59:59'
    });
  }


  extractDateFromDateTime(dateTime: string): string {
    if (!dateTime) return '';
    return dateTime.split('T')[0];
  }

  crearUsuario(): void {
    console.log('Creando usuario...');
    this.creatingUser = true;

    const formData = this.createUserForm.value;
    console.log('Datos del formulario:', formData);

    const userPayload = {
      "UserInfo": {
        "employeeNo": formData.employeeNo || "",
        "name": formData.name || "",
        "userType": "normal",
        "closeDelayEnabled": false,
        "belongGroup": "",
        "password": "",
        "doorRight": "1",
        "maxOpenDoorTime": 0,
        "openDoorTime": 0,
        "roomNumber": 0,
        "floorNumber": 0,
        "localUIRight": true,
        "userVerifyMode": "face",
        "gender": formData.gender || "",
        "numOfCard": 0,
        "numOfFace": 1,
        "Valid": {
          "enable": true,
          "beginTime": formData.ValidBeginTime || "",
          "endTime": formData.ValidEndTime || "",
          "timeType": "local"
        },
        "RightPlan": [
          {
            "doorNo": "1",
            "planTemplateNo": "1"
          }
        ],
        "PersonInfoExtends": [
          {
            "value": ""
          }
        ]
      }
    };

    console.log('Payload para crear usuario:', userPayload);

    this.hikvisionService.updateUser(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      userPayload
    ).subscribe({
      next: (response) => {
        console.log('Usuario creado exitosamente:', response);
        this.creatingUser = false;
        this.currentView = 'lista';
        this.getUsers();
      },
      error: (error) => {
        console.error('Error creando usuario:', error);
        this.creatingUser = false;
      }
    });
  }

  // Métodos para el modal de agregar usuario
  openAddUserModal(): void {
    this.isAddingUser = true;
  }

  closeAddUserModal(): void {
    this.isAddingUser = false;
    this.addUserForm.reset();
    this.selectedPhoto = null;
  }


  onAddUserSubmit(): void {
    if (this.addUserForm.valid) {
      this.registrarUsuario();
    }
  }

  registrarUsuario(): void {
    console.log('Funcionalidad de registrar usuario no implementada');
  }

  // Método para seleccionar foto
  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      console.log('📸 Foto seleccionada:', file.name, file.size, 'bytes');
      
      // Convertir a base64
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedPhoto = e.target.result;
        console.log('📸 Foto convertida a base64, tamaño:', this.selectedPhoto?.length || 0, 'caracteres');
        
        // Automáticamente proceder a registrar el rostro
        this.registrarRostro();
      };
      reader.readAsDataURL(file);
    }
  }

  // Método para eliminar foto seleccionada
  removePhoto(): void {
    this.selectedPhoto = null;
  }

  // Método para seleccionar archivo y registrar rostro automáticamente
  seleccionarYRegistrarRostro(): void {
    console.log('📸 Abriendo selector de archivo para registrar rostro...');
    
    if (!this.editingUser || !this.editingUser.employeeNo) {
      console.error('❌ No hay usuario seleccionado para registrar rostro');
      return;
    }

    // Abrir el selector de archivo
    const fileInput = document.getElementById('photoInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Método para registrar solo el rostro (llamado después de seleccionar archivo)
  registrarRostro(): void {
    console.log('📸 Registrando solo el rostro del usuario...');
    
    if (!this.selectedPhoto) {
      console.error('❌ No se ha seleccionado una foto');
      return;
    }

    if (!this.editingUser || !this.editingUser.employeeNo) {
      console.error('❌ No hay usuario seleccionado para registrar rostro');
      return;
    }

    console.log('📸 Usuario:', this.editingUser.employeeNo);
    console.log('📸 Foto seleccionada:', this.selectedPhoto ? 'Sí' : 'No');

    this.photoLoading = true;

    // Enviar foto al servidor PHP para obtener URL
    this.uploadPhotoToPhpServer(this.selectedPhoto).then(photoUrl => {
      if (photoUrl) {
        console.log('✅ URL de foto obtenida:', photoUrl);
        
        // Construir payload para registrar solo el rostro
        const facePayload = {
          "faceURL": photoUrl,
          "faceLibType": "blackFD",
          "FDID": "1",
          "FPID": this.editingUser.employeeNo,
          "name": this.editingUser.name || this.editingUser.employeeNo,
          "gender": this.editingUser.gender || "male",
          "featurePointType": "face"
        };

        console.log('📸 Payload para registrar rostro:', facePayload);

        // Registrar solo el rostro en el dispositivo
        this.hikvisionService.registerUserFaceWithPayload(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
          this.selectedDispositivo.clave,
          facePayload
    ).subscribe({
      next: (response) => {
            console.log('✅ Rostro registrado exitosamente:', response);
            this.photoLoading = false;
            // NO cerrar la modal, solo recargar la foto del usuario
            this.verFoto(this.editingUser);
      },
      error: (error) => {
            console.error('❌ Error registrando rostro:', error);
            this.photoLoading = false;
          }
        });
        } else {
        console.error('❌ No se pudo obtener URL de la foto');
        this.photoLoading = false;
      }
    }).catch(error => {
      console.error('❌ Error subiendo foto:', error);
      this.photoLoading = false;
    });
  }

  // Método para subir foto al servidor PHP
  async uploadPhotoToPhpServer(base64Image: string): Promise<string | null> {
    try {
      console.log('📤 Subiendo foto al servidor PHP...');
      
      // Crear FormData
      const formData = new FormData();
      const blob = this.dataURLtoBlob(base64Image);
      formData.append('image', blob, 'photo.jpg');
      
      // Enviar al servidor PHP
      const response = await fetch('http://hotelroraimainn.com/upload.php', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.url) {
          console.log('✅ Foto subida exitosamente:', result.url);
          return result.url;
          } else {
          console.error('❌ Error del servidor PHP:', result.error);
          return null;
          }
        } else {
        console.error('❌ Error HTTP:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('❌ Error subiendo foto:', error);
      return null;
    }
  }

  // Método para convertir dataURL a Blob
  dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }


  // Métodos para manejo de imágenes
  onImageError(event: any): void {
    console.log('❌ Error cargando imagen:', event);
    console.log('❌ userPhotoUrl que causó el error:', this.userPhotoUrl);
  }

  onImageLoad(event: any): void {
    console.log('✅ Imagen cargada exitosamente:', event);
    console.log('✅ userPhotoUrl que se cargó:', this.userPhotoUrl);
  }

  // Métodos de navegación
  navigateToCreate(): void {
    this.router.navigate(['/super-config/dispositivos/crear']);
  }

  navigateToEdit(dispositivo: any): void {
    this.editingDispositivo = { ...dispositivo };
    
    // Establecer valores inteligentes para marcaje
    const today = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(today.getFullYear() + 5);
    
    // Formatear fechas en el formato requerido
    const todayFormatted = today.toISOString().split('T')[0] + 'T00:00:00';
    const futureFormatted = futureDate.toISOString().split('T')[0] + 'T23:59:59';
    
    // Solo establecer valores si no existen o están vacíos
    if (!this.editingDispositivo.marcaje_inicio || this.editingDispositivo.marcaje_inicio === 'AAAA-MM-DDT00:00:00') {
      this.editingDispositivo.marcaje_inicio = todayFormatted;
    }
    if (!this.editingDispositivo.marcaje_fin || this.editingDispositivo.marcaje_fin === 'AAAA-MM-DDT23:59:59') {
      this.editingDispositivo.marcaje_fin = futureFormatted;
    }
    
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingDispositivo = null;
  }

  updateDispositivo(): void {
    if (this.editingDispositivo) {
      this.dispositivosService.updateDispositivo(this.editingDispositivo.id, this.editingDispositivo).subscribe({
        next: (response) => {
          console.log('Dispositivo actualizado:', response);
          // Actualizar el dispositivo en el array local
          const index = this.dispositivos.findIndex(d => d.id === this.editingDispositivo.id);
          if (index !== -1) {
            this.dispositivos[index] = { ...this.editingDispositivo };
          }
          this.closeEditModal();
      },
      error: (error) => {
          console.error('Error actualizando dispositivo:', error);
        }
      });
    }
  }

  openDatePicker(field: string): void {
    // Obtener la fecha actual para marcaje_inicio
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Crear un input temporal de tipo date
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    
    // Establecer fecha inicial inteligente
    if (field === 'marcaje_inicio') {
      dateInput.value = `${year}-${month}-${day}`;
    } else if (field === 'marcaje_fin') {
      // Para marcaje_fin, usar fecha actual + 5 años
      const futureDate = new Date();
      futureDate.setFullYear(today.getFullYear() + 5);
      const futureYear = futureDate.getFullYear();
      const futureMonth = String(futureDate.getMonth() + 1).padStart(2, '0');
      const futureDay = String(futureDate.getDate()).padStart(2, '0');
      dateInput.value = `${futureYear}-${futureMonth}-${futureDay}`;
    }
    
    // Agregar al DOM temporalmente
    dateInput.style.position = 'absolute';
    dateInput.style.left = '-9999px';
    document.body.appendChild(dateInput);
    
    // Abrir el date picker
    dateInput.showPicker();
    
    // Manejar la selección
    dateInput.addEventListener('change', () => {
      const selectedDate = dateInput.value;
      if (selectedDate) {
        if (field === 'marcaje_inicio') {
          this.editingDispositivo.marcaje_inicio = `${selectedDate}T00:00:00`;
        } else if (field === 'marcaje_fin') {
          this.editingDispositivo.marcaje_fin = `${selectedDate}T23:59:59`;
        }
      }
      // Limpiar el input temporal
      document.body.removeChild(dateInput);
    });
    
    // Limpiar si se cancela
    dateInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.body.contains(dateInput)) {
          document.body.removeChild(dateInput);
        }
      }, 100);
    });
  }

  deleteDispositivo(dispositivo: any): void {
    console.log('Eliminando dispositivo:', dispositivo);
    if (confirm('¿Estás seguro de que deseas eliminar este dispositivo?')) {
      this.dispositivosService.deleteDispositivo(dispositivo.id).subscribe({
        next: (response) => {
          console.log('Dispositivo eliminado:', response);
          // Remover el dispositivo del array local
          this.dispositivos = this.dispositivos.filter(d => d.id !== dispositivo.id);
      },
      error: (error) => {
          console.error('Error eliminando dispositivo:', error);
        }
      });
    }
  }

  // Métodos de formularios
  onEditUserSubmit(): void {
    if (this.editUserForm.valid) {
      this.actualizarUsuario();
    }
  }

  onCreateUserSubmit(): void {
    if (this.createUserForm.valid) {
      this.crearUsuario();
    }
  }

  // Método para verificar permisos de creación
  canCreate(): boolean {
    return this.isCreator;
  }


  // Método para eliminar solo la foto
  eliminarSoloFoto(): void {
    console.log('🗑️ INICIANDO eliminarSoloFoto()');
    console.log('🗑️ Eliminando solo la foto del usuario:', this.editingUser);
    
    if (!this.editingUser || !this.editingUser.employeeNo) {
      console.error('❌ No hay usuario seleccionado para eliminar foto');
      return;
    }

    this.photoLoading = true;

    // Construir payload para eliminar solo la foto (JSON estricto con comillas dobles)
    const deletePhotoPayload = {
      "FPID": [
        {
          "value": this.editingUser.employeeNo
        }
      ]
    };

    console.log('🗑️ Payload para eliminar foto:', deletePhotoPayload);
    console.log('🗑️ LLAMANDO al servicio deleteUserPhotoOnly...');

    // Llamar al servicio para eliminar solo la foto
    this.hikvisionService.deleteUserPhotoOnly(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      deletePhotoPayload
    ).subscribe({
      next: (response) => {
        console.log('✅ Foto eliminada exitosamente:', response);
        this.photoLoading = false;
        if (response.success) {
          // Limpiar la foto actual para actualizar la interfaz
          console.log('🧹 ANTES de limpiar userPhotoUrl:', this.userPhotoUrl);
          this.userPhotoUrl = '';
          this.photoError = 'Foto eliminada correctamente';
          console.log('🧹 DESPUÉS de limpiar userPhotoUrl:', this.userPhotoUrl);
          console.log('🧹 Tipo de userPhotoUrl:', typeof this.userPhotoUrl);
          console.log('🧹 userPhotoUrl === "":', this.userPhotoUrl === '');
          
          // Forzar detección de cambios
          this.cdr.detectChanges();
          console.log('🧹 Después de detectChanges userPhotoUrl:', this.userPhotoUrl);
        }
      },
      error: (error) => {
        console.error('❌ Error eliminando foto:', error);
        this.photoLoading = false;
      }
    });
  }
}