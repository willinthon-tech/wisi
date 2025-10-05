import { Component, OnInit, OnDestroy } from '@angular/core';
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
  selectedDispositivo: any = null;
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
  editingUser: any = null;
  
  // Variables de estado para spinners
  loadingUsers = false;
  creatingUser = false;
  updatingUser = false;
  deletingUser = false;

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
    private fb: FormBuilder
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
    
    this.hikvisionService.getUserPhoto(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      user.employeeNo
    ).subscribe({
      next: (response) => {
        console.log('Respuesta de getUserPhoto:', response);
        this.photoLoading = false;
        if (response.success && response.data?.photoUrl) {
          this.userPhotoUrl = response.data.photoUrl;
        } else {
          this.photoError = 'No se pudo cargar la foto';
        }
      },
      error: (error) => {
        console.error('Error obteniendo foto:', error);
        this.photoLoading = false;
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
    this.deletingUser = true;
    
    this.hikvisionService.deleteUser(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      user.employeeNo
    ).subscribe({
      next: (response) => {
        console.log('Usuario eliminado:', response);
        this.deletingUser = false;
        if (response.success) {
          this.getUsers(); // Recargar lista
          this.currentView = 'lista';
        }
      },
      error: (error) => {
        console.error('Error eliminando usuario:', error);
        this.deletingUser = false;
      }
    });
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

  openDatePicker(field: 'beginTime' | 'endTime'): void {
    console.log('Abriendo selector de fecha para:', field);
    
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.style.position = 'absolute';
    dateInput.style.left = '-9999px';
    dateInput.style.opacity = '0';
    
    const currentForm = this.currentView === 'crear' ? this.createUserForm : this.editUserForm;
    const formName = this.currentView === 'crear' ? 'createUserForm' : 'editUserForm';
    
    // Mapear los nombres de campo correctamente
    const fieldName = field === 'beginTime' ? 'ValidBeginTime' : 'ValidEndTime';
    const currentValue = currentForm.get(fieldName)?.value;
    let currentDate = '';
    
    if (currentValue) {
      currentDate = this.extractDateFromDateTime(currentValue);
    }
    
    if (currentDate) {
      dateInput.value = currentDate;
    }
    
    document.body.appendChild(dateInput);
    dateInput.showPicker();
    
    dateInput.addEventListener('change', (event: any) => {
      const selectedDate = event.target.value;
      if (selectedDate) {
        if (field === 'beginTime') {
          const formattedDate = selectedDate + 'T00:00:00';
          currentForm.patchValue({ ValidBeginTime: formattedDate });
        } else {
          const formattedDate = selectedDate + 'T23:59:59';
          currentForm.patchValue({ ValidEndTime: formattedDate });
        }
      }
      document.body.removeChild(dateInput);
    });
    
    dateInput.addEventListener('cancel', () => {
      document.body.removeChild(dateInput);
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
      };
      reader.readAsDataURL(file);
    }
  }

  // Método para eliminar foto seleccionada
  removePhoto(): void {
    this.selectedPhoto = null;
  }

  // Método para registrar solo el rostro
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
            this.currentView = 'lista'; // Volver a la lista
            this.getUsers(); // Recargar lista de usuarios
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
    console.log('Error cargando imagen:', event);
  }

  onImageLoad(event: any): void {
    console.log('Imagen cargada:', event);
  }

  // Métodos de navegación
  navigateToCreate(): void {
    this.router.navigate(['/super-config/dispositivos/crear']);
  }

  navigateToEdit(dispositivo: any): void {
    this.router.navigate(['/super-config/dispositivos/editar', dispositivo.id]);
  }

  deleteDispositivo(dispositivo: any): void {
    console.log('Eliminando dispositivo:', dispositivo);
    // Lógica para eliminar dispositivo
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
          // Volver a la lista de usuarios
          this.currentView = 'lista';
          this.getUsers(); // Recargar lista
        }
      },
      error: (error) => {
        console.error('❌ Error eliminando foto:', error);
        this.photoLoading = false;
      }
    });
  }
}