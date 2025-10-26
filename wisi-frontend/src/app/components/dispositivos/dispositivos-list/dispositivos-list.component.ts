import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DispositivosService } from '../../../services/dispositivos.service';
import { AuthService } from '../../../services/auth.service';
import { HikvisionIsapiService } from '../../../services/hikvision-isapi.service';
import { XmlParserService } from '../../../services/xml-parser.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';

// Estilos CSS para la modal de configuración CRON
const cronModalStyles = `
  .cron-config-modal {
    max-width: 900px;
    width: 95%;
  }

  .cron-control-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 20px;
  }

  .control-row {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .cron-status {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #dc3545;
    transition: all 0.3s ease;
  }

  .status-indicator.active {
    background: #28a745;
    box-shadow: 0 0 10px rgba(40, 167, 69, 0.5);
  }

  .cron-info-section {
    margin-bottom: 20px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 15px;
  }

  .info-card {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 15px;
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .info-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e9ecef;
    border-radius: 50%;
  }

  .info-content h5 {
    margin: 0 0 5px 0;
    font-size: 14px;
    font-weight: 600;
    color: #495057;
  }

  .info-content p {
    margin: 0 0 5px 0;
    font-size: 16px;
    font-weight: 700;
    color: #212529;
  }

  .info-content small {
    color: #6c757d;
    font-size: 12px;
  }

  .cron-status-section {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin-top: 15px;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background: white;
    border-radius: 6px;
    border-left: 4px solid #007bff;
  }

  .status-label {
    font-weight: 600;
    color: #495057;
  }

  .status-value {
    font-weight: 700;
    color: #212529;
  }

  .status-value.processing {
    color: #28a745;
  }

  .status-value.current-device {
    color: #007bff;
    font-weight: 700;
  }

  .status-value.has-queue {
    color: #ffc107;
    font-weight: 700;
  }

  .current-device-card {
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
  }

  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .device-header h5 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }

  .processing-badge {
    background: rgba(255, 255, 255, 0.2);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }

  .device-details {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .device-info strong {
    font-size: 16px;
    display: block;
    margin-bottom: 8px;
  }

  .device-meta {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
    line-height: 1.4;
  }

  .queue-position {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: #007bff;
    color: white;
    border-radius: 50%;
    font-weight: 700;
    font-size: 16px;
  }

  .position-number {
    font-size: 18px;
  }

  .queue-device-info {
    flex: 1;
    padding: 0 15px;
  }

  .queue-device-info .device-name {
    font-weight: 700;
    font-size: 16px;
    color: #212529;
    margin-bottom: 5px;
  }

  .device-details {
    font-size: 14px;
    color: #6c757d;
    margin-bottom: 5px;
  }

  .wait-time {
    font-size: 12px;
    color: #ffc107;
    font-weight: 600;
  }

  .queue-timestamp {
    font-size: 12px;
    color: #6c757d;
    text-align: right;
  }

  .no-queue-message {
    text-align: center;
    padding: 40px 20px;
  }

  .empty-state {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 30px;
    border: 2px dashed #dee2e6;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 15px;
  }

  .empty-state h5 {
    color: #28a745;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .empty-state p {
    color: #6c757d;
    margin: 0;
  }

  /* Estilos para las tarjetas de dispositivos */
  .dispositivos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 20px;
    padding: 20px 0;
  }

  .device-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
    overflow: hidden;
    transition: all 0.3s ease;
    position: relative;
  }

  .device-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .device-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    position: relative;
  }

  .device-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .device-title h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: white;
  }

  .device-status {
    background: rgba(255, 255, 255, 0.2);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .device-info {
    padding: 20px;
    background: #f8f9fa;
  }

  .info-row {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 15px;
  }

  .info-row:last-child {
    margin-bottom: 0;
  }

  .info-item {
    flex: 1;
    min-width: 150px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .info-label {
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-value {
    font-size: 14px;
    font-weight: 500;
    color: #1f2937;
    word-break: break-all;
    line-height: 1.4;
  }

  .device-actions {
    padding: 20px;
    background: white;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .device-actions .btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    min-width: 100px;
    justify-content: center;
  }

  .btn-biometric {
    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
    color: white;
  }

  .btn-biometric:hover {
    background: linear-gradient(135deg, #138496 0%, #117a8b 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(23, 162, 184, 0.3);
  }

  .btn-edit {
    background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
    color: #212529;
  }

  .btn-edit:hover {
    background: linear-gradient(135deg, #e0a800 0%, #d39e00 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(255, 193, 7, 0.3);
  }

  .btn-delete {
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    color: white;
  }

  .btn-delete:hover {
    background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
  }

  .no-devices {
    text-align: center;
    padding: 60px 20px;
    background: #f8f9fa;
    border-radius: 12px;
    border: 2px dashed #dee2e6;
  }

  .no-devices p {
    font-size: 16px;
    color: #6c757d;
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .dispositivos-grid {
      grid-template-columns: 1fr;
      gap: 15px;
    }
    
    .info-row {
      flex-direction: column;
      gap: 10px;
    }
    
    .info-item {
      min-width: auto;
    }
    
    .device-actions {
      flex-direction: column;
    }
    
    .device-actions .btn {
      width: 100%;
    }
  }

  .queue-list {
    margin-top: 20px;
  }

  .queue-items {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #dee2e6;
    border-radius: 6px;
  }

  .queue-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    border-bottom: 1px solid #f1f3f4;
  }

  .queue-item:last-child {
    border-bottom: none;
  }

  .device-name {
    font-weight: 600;
    color: #495057;
  }

  .queue-time {
    font-size: 12px;
    color: #6c757d;
  }

  .cron-example-section {
    background: #e3f2fd;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .flow-steps {
    margin-top: 15px;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #bbdefb;
  }

  .step:last-child {
    border-bottom: none;
  }

  .step-number {
    background: #2196f3;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
  }

  .step-content {
    color: #1565c0;
    font-weight: 500;
  }

  .example-note {
    margin-top: 15px;
    padding: 10px;
    background: #fff3cd;
    border-radius: 6px;
    border-left: 4px solid #ffc107;
  }

  .cron-actions-section {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 15px;
  }

  .action-buttons .btn {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .form-control {
    border-radius: 6px;
    border: 1px solid #ced4da;
    padding: 8px 12px;
    font-size: 14px;
  }

  .form-control:focus {
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }

  .btn {
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.3s ease;
  }

  .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .btn-primary {
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    border: none;
  }

  .btn-info {
    background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
    border: none;
  }

  .btn-warning {
    background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
    border: none;
    color: #212529;
  }

  .btn-success {
    background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
    border: none;
  }

  .btn-secondary {
    background: linear-gradient(135deg, #6c757d 0%, #545b62 100%);
    border: none;
  }

  @media (max-width: 768px) {
    .cron-config-modal {
      width: 98%;
      margin: 10px;
    }
    
    .control-row {
      flex-direction: column;
      gap: 15px;
    }
    
    .info-grid {
      grid-template-columns: 1fr;
    }
    
    .status-grid {
      grid-template-columns: 1fr;
    }
    
    .action-buttons {
      flex-direction: column;
    }
  }
`;

@Component({
  selector: 'app-dispositivos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dispositivos-list.component.html',
  styleUrls: ['./dispositivos-list.component.css'],
  styles: [cronModalStyles]
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
  showUserTable = false; // Controla si se muestra la tabla de usuarios
  editingUser: any = null;

  // Variables para modal de configuración de CRON global
  showCronConfigModal = false;
  cronConfig = {
    currentValue: 'Desactivado',
    isActive: false,
    options: ['Desactivado', '10s', '30s', '1m', '5m', '10m', '30m', '1h', '6h', '12h', '24h']
  };
  queueStatus = {
    queueLength: 0,
    isProcessing: false,
    activeCronJobs: 0,
    queue: [] as any[],
    delayBetweenDevices: '1m',
    delayMs: 60000,
    timeoutPerDevice: 300000,
    maxConcurrentDevices: 1,
    currentProcessingDevice: null as any
  };
  loadingQueueStatus = false;
  savingCronConfig = false;
  
  // Variables de estado para spinners
  loadingUsers = false;
  creatingUser = false;
  updatingUser = false;
  deletingUser = false;
  deletingUsers: { [key: string]: boolean } = {}; // Estado individual para cada usuario

  // Variables para agregar usuario
  addUserForm: any;
  selectedPhoto: string | null = null;

  // Variables para modal CRON
  showCronModal = false;
  cronActivo = false;
  cronTiempo = '24h';
  isAddingUser = false;
  
  // Variables para datos del usuario en modal de editar
  userBeginTime = '';
  userEndTime = '';
  
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
    private cdr: ChangeDetectorRef,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit(): void {
    
    this.initializeForms();
    this.loadDispositivos();
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }

  private initializeForms(): void {
    
    
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
      ValidBeginTime: [''],
      ValidEndTime: [''],
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
      ValidBeginTime: [{value: '', disabled: true}],
      ValidEndTime: [{value: '', disabled: true}],
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
      ValidBeginTime: [''],
      ValidEndTime: [''],
      ValidTimeType: [{value: 'local', disabled: true}],
      RightPlanDoorNo: [{value: '1', disabled: true}],
      RightPlanTemplateNo: [{value: '1', disabled: true}],
      PersonInfoExtends: [{value: '', disabled: true}]
    });
    
    
    
    
    
  }

  loadDispositivos(): void {
    this.dispositivosService.getDispositivos().subscribe({
      next: (response: any) => {
        this.dispositivos = response.data || response;
        this.loading = false;
        
      },
      error: (error) => {
        
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
    
    // Establecer valores de marcaje del dispositivo en los formularios con delay
    
    setTimeout(() => {
      this.setMarcajeValuesFromDispositivo(dispositivo);
    }, 100);
    
    // Probar conexión automáticamente
    setTimeout(() => {
      this.testConnection();
    }, 500);
  }

  setMarcajeValuesFromDispositivo(dispositivo: any): void {
    
    
    
    
    // Valores por defecto si no existen en el dispositivo
    const marcajeInicio = dispositivo.marcaje_inicio || this.getDefaultMarcajeInicio();
    const marcajeFin = dispositivo.marcaje_fin || this.getDefaultMarcajeFin();
    
    
    
    
    
    
    // Establecer valores en el formulario de agregar usuario (addUserForm)
    if (this.addUserForm) {
      
      this.addUserForm.get('ValidBeginTime')?.setValue(marcajeInicio);
      this.addUserForm.get('ValidEndTime')?.setValue(marcajeFin);
      
      // Deshabilitar los campos después de establecer los valores
      this.addUserForm.get('ValidBeginTime')?.disable();
      this.addUserForm.get('ValidEndTime')?.disable();
      
      
      
      // Forzar detección de cambios
      this.cdr.detectChanges();
    } else {
      
    }
    
    // También establecer valores en el formulario de crear usuario (createUserForm)
    if (this.createUserForm) {
      
      this.createUserForm.get('ValidBeginTime')?.setValue(marcajeInicio);
      this.createUserForm.get('ValidEndTime')?.setValue(marcajeFin);
      
      // Deshabilitar los campos después de establecer los valores
      this.createUserForm.get('ValidBeginTime')?.disable();
      this.createUserForm.get('ValidEndTime')?.disable();
      
      
      
      // Forzar detección de cambios
      this.cdr.detectChanges();
    } else {
      
    }
  }

  getDefaultMarcajeInicio(): string {
    const today = new Date();
    return today.toISOString().split('T')[0] + 'T00:00:00';
  }

  getDefaultMarcajeFin(): string {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 5);
    return futureDate.toISOString().split('T')[0] + 'T23:59:59';
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

  openCronModal(dispositivo: any): void {
    this.selectedDispositivo = dispositivo;
    this.cronActivo = dispositivo.cron_activo === 1;
    this.cronTiempo = dispositivo.cron_tiempo || '24h';
    this.showCronModal = true;
  }

  closeCronModal(): void {
    this.showCronModal = false;
    this.selectedDispositivo = null;
    this.cronActivo = false;
    this.cronTiempo = '24h';
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
        
        this.biometricUsers = response.data?.users || response.UserInfo || [];
        this.loadingUsers = false;
        
      },
      error: (error) => {
        
        this.loadingUsers = false;
      }
    });
  }

  verFoto(user: any): void {
    
    this.editingUser = user;
    this.currentView = 'foto';
    this.photoLoading = true;
    this.photoError = '';
    
    // LIMPIAR la variable para que siempre inicie vacía
    this.userPhotoUrl = '';
    
    
    this.hikvisionService.getUserPhoto(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      user.employeeNo
    ).subscribe({
      next: (response) => {
        
        this.photoLoading = false;
        if (response.success && response.data?.photoUrl && response.data.photoUrl.trim() !== '') {
          // Validar que la URL base64 sea válida
          const photoUrl = response.data.photoUrl;
          
          
          
          // Verificar que sea una URL base64 válida
          if (photoUrl.startsWith('data:image/') && photoUrl.includes('base64,')) {
            // Verificar que la URL no esté corrupta (debe tener contenido después de base64)
            const base64Index = photoUrl.indexOf('base64,');
            const base64Data = photoUrl.substring(base64Index + 7);
            
            if (base64Data.length > 100) { // Debe tener al menos 100 caracteres de datos
              // Usar la URL base64 directamente sin modificar
              this.userPhotoUrl = photoUrl;
              
            } else {
              
              this.userPhotoUrl = '';
              this.photoError = 'Imagen corrupta o incompleta';
            }
          } else {
            
            this.userPhotoUrl = '';
            this.photoError = 'Formato de imagen no válido';
          }
        } else {
          // Si no hay foto, limpiar la URL
          
          this.userPhotoUrl = '';
          this.photoError = 'No se encontró foto para este usuario';
        }
      },
      error: (error) => {
        
        this.photoLoading = false;
        this.userPhotoUrl = '';
        this.photoError = 'Error cargando foto: ' + error.message;
      }
    });
  }

  editarUsuario(user: any): void {
    
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
        
        if (response.success && response.data) {
          this.originalUserData = response.data;
          this.populateEditForm(response.data);
        }
      },
      error: (error) => {
        
      }
    });
  }

  private populateEditForm(userData: any): void {
    // Guardar datos del usuario para mostrar en labels
    this.userBeginTime = userData.Valid?.beginTime || '';
    this.userEndTime = userData.Valid?.endTime || '';
    
    // Obtener datos del dispositivo para mostrar en campos
    const dispositivoBeginTime = this.selectedDispositivo?.marcaje_inicio || this.getDefaultMarcajeInicio();
    const dispositivoEndTime = this.selectedDispositivo?.marcaje_fin || this.getDefaultMarcajeFin();
    
    
    
    
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
      ValidBeginTime: dispositivoBeginTime, // Datos del dispositivo sin comillas
      ValidEndTime: dispositivoEndTime, // Datos del dispositivo sin comillas
      ValidTimeType: userData.Valid?.timeType || 'local',
      RightPlanDoorNo: userData.RightPlan?.[0]?.doorNo || '',
      RightPlanTemplateNo: userData.RightPlan?.[0]?.planTemplateNo || '',
      PersonInfoExtends: userData.PersonInfoExtends?.[0]?.value || ''
    });
  }

  eliminarUsuario(user: any): void {
    
    this.deletingUsers[user.employeeNo] = true; // Estado individual para este usuario
    
    this.hikvisionService.deleteUser(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      user.employeeNo
    ).subscribe({
      next: (response) => {
        
        if (response.success) {
          // Si el usuario se eliminó exitosamente, proceder a eliminar la foto
          
          this.eliminarFotoDelUsuario(user.employeeNo);
        } else {
          this.deletingUsers[user.employeeNo] = false;
          
        }
      },
      error: (error) => {
        
        this.deletingUsers[user.employeeNo] = false;
      }
    });
  }

  eliminarFotoDelUsuario(employeeNo: string): void {
    
    
    // Construir payload para eliminar solo la foto
    const deletePhotoPayload = {
      "FPID": [
        {
          "value": employeeNo
        }
      ]
    };

    

    // Llamar al servicio para eliminar solo la foto
    this.hikvisionService.deleteUserPhotoOnly(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      deletePhotoPayload
    ).subscribe({
      next: (response) => {
        
        this.deletingUsers[employeeNo] = false; // Estado individual para este usuario
        // Remover solo el usuario específico del array
        this.removerUsuarioDelArray(employeeNo);
        this.currentView = 'lista';
      },
      error: (error) => {
        
        // Aunque falle la eliminación de la foto, el usuario ya fue eliminado
        // así que continuamos con el flujo normal
        this.deletingUsers[employeeNo] = false; // Estado individual para este usuario
        this.removerUsuarioDelArray(employeeNo);
        this.currentView = 'lista';
      }
    });
  }

  removerUsuarioDelArray(employeeNo: string): void {
    
    // Filtrar el array para remover solo el usuario específico
    this.biometricUsers = this.biometricUsers.filter(user => user.employeeNo !== employeeNo);
    
  }

  actualizarUsuario(): void {
    
    this.updatingUser = true;
    
    const formData = this.editUserForm.getRawValue();
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

    
    

    this.hikvisionService.updateUser(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      userPayload
    ).subscribe({
      next: (response) => {
        
        this.updatingUser = false;
        if (response.success) {
          this.getUsers(); // Recargar lista
          this.currentView = 'lista';
        }
      },
      error: (error) => {
        
        this.updatingUser = false;
      }
    });
  }

  abrirVistaCrear(): void {
    this.currentView = 'crear';
    this.inicializarFormularioCrear();
    
    // Establecer valores del dispositivo en el formulario de crear
    if (this.selectedDispositivo) {
      this.setMarcajeValuesFromDispositivo(this.selectedDispositivo);
    }
  }

  inicializarFormularioCrear(): void {
    // Los valores se establecerán desde setMarcajeValuesFromDispositivo
    // No establecer valores hardcodeados aquí
    
  }


  extractDateFromDateTime(dateTime: string): string {
    if (!dateTime) return '';
    return dateTime.split('T')[0];
  }

  crearUsuario(): void {
    
    this.creatingUser = true;

    const formData = this.createUserForm.getRawValue();
    

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

    
    

    this.hikvisionService.updateUser(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      userPayload
    ).subscribe({
      next: (response) => {
        
        this.creatingUser = false;
        this.currentView = 'lista';
        this.getUsers();
      },
      error: (error) => {
        
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
    
  }

  // Método para seleccionar foto
  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      
      
      // Convertir a base64
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedPhoto = e.target.result;
        
        
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
    
    
    if (!this.editingUser || !this.editingUser.employeeNo) {
      
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
    
    
    if (!this.selectedPhoto) {
      
      return;
    }

    if (!this.editingUser || !this.editingUser.employeeNo) {
      
      return;
    }

    
    

    this.photoLoading = true;

    // Enviar foto al servidor PHP para obtener URL
    this.uploadPhotoToPhpServer(this.selectedPhoto).then(photoUrl => {
      if (photoUrl) {
        
        
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

        

        // Registrar solo el rostro en el dispositivo
        this.hikvisionService.registerUserFaceWithPayload(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
          this.selectedDispositivo.clave,
          facePayload
    ).subscribe({
      next: (response) => {
            
            this.photoLoading = false;
            // NO cerrar la modal, solo recargar la foto del usuario
            this.verFoto(this.editingUser);
      },
      error: (error) => {
            
            this.photoLoading = false;
          }
        });
        } else {
        
        this.photoLoading = false;
      }
    }).catch(error => {
      
      this.photoLoading = false;
    });
  }

  // Método para subir foto al servidor PHP
  async uploadPhotoToPhpServer(base64Image: string): Promise<string | null> {
    try {
      
      
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
          
          return result.url;
          } else {
          
          return null;
          }
        } else {
        
        return null;
      }
    } catch (error) {
      
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
    
    
  }

  onImageLoad(event: any): void {
    
    
  }

  // Métodos de navegación
  navigateToCreate(): void {
    this.router.navigate(['/super-config/dispositivos/crear']);
  }

  navigateToEdit(dispositivo: any): void {
    this.router.navigate(['/super-config/dispositivos/editar', dispositivo.id]);
  }


  deleteDispositivo(dispositivo: any): void {
    

    // MOSTRAR MODAL DE CONFIRMACIÓN PRIMERO
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar este dispositivo?',
      entity: {
        id: dispositivo.id,
        nombre: dispositivo.nombre || 'Dispositivo',
        tipo: 'Dispositivo'
      },
      warningText: 'Esta acción eliminará permanentemente el dispositivo y todos sus datos asociados.',
      onConfirm: () => {
        // Ejecutar la eliminación real
        this.ejecutarEliminacionDispositivo(dispositivo);
      }
    });
  }

  // Método auxiliar para ejecutar la eliminación real
  private ejecutarEliminacionDispositivo(dispositivo: any) {
    
    
    this.dispositivosService.deleteDispositivo(dispositivo.id).subscribe({
      next: (response) => {
        
        // Remover el dispositivo del array local
        this.dispositivos = this.dispositivos.filter(d => d.id !== dispositivo.id);
        
      },
      error: (error) => {
        
        
        // Si es error 400 con relaciones, mostrar modal global
        if (error.status === 400 && error.error?.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el dispositivo',
            message: error.error.message,
            entity: {
              id: error.error.dispositivo?.id || dispositivo.id,
              nombre: error.error.dispositivo?.nombre || dispositivo.nombre || 'Dispositivo',
              tipo: 'Dispositivo'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar este dispositivo, primero debe eliminar todos los elementos asociados listados arriba.'
          });
        } else {
          
        }
      }
    });
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
    
    
    
    if (!this.editingUser || !this.editingUser.employeeNo) {
      
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

    
    

    // Llamar al servicio para eliminar solo la foto
    this.hikvisionService.deleteUserPhotoOnly(
      this.selectedDispositivo.ip_remota,
      this.selectedDispositivo.usuario,
      this.selectedDispositivo.clave,
      deletePhotoPayload
    ).subscribe({
      next: (response) => {
        
        this.photoLoading = false;
        if (response.success) {
          // Limpiar la foto actual para actualizar la interfaz
          
          this.userPhotoUrl = '';
          this.photoError = 'Foto eliminada correctamente';
          
          
          
          
          // Forzar detección de cambios
          this.cdr.detectChanges();
          
        }
      },
      error: (error) => {
        
        this.photoLoading = false;
      }
    });
  }

  // Métodos para modal de configuración de CRON global
  openCronConfigModal() {
    this.showCronConfigModal = true;
    this.loadCronConfig();
    this.refreshQueueStatus();
    this.startAutoRefresh(); // Iniciar auto-refresh
  }

  closeCronConfigModal() {
    this.showCronConfigModal = false;
    this.stopAutoRefresh(); // Detener auto-refresh
  }

  loadCronConfig() {
    this.dispositivosService.getCronConfig().subscribe({
      next: (response) => {
        this.cronConfig.currentValue = response.currentValue;
        this.cronConfig.isActive = response.isActive;
        console.log('🔄 Configuración CRON cargada:', response);
      },
      error: (error) => {
        console.error('❌ Error cargando configuración CRON:', error);
      }
    });
  }

  saveCronConfig() {
    this.savingCronConfig = true;
    this.dispositivosService.updateCronConfig(this.cronConfig.currentValue).subscribe({
      next: (response) => {
        this.cronConfig.isActive = this.cronConfig.currentValue !== 'Desactivado';
        this.savingCronConfig = false;
        
      },
      error: (error) => {
        
        this.savingCronConfig = false;
      }
    });
  }

  refreshQueueStatus() {
    this.loadingQueueStatus = true;
    this.dispositivosService.getQueueStatus().subscribe({
      next: (response) => {
        this.queueStatus = response;
        this.loadingQueueStatus = false;
        console.log('📊 Estado de cola actualizado:', response);
      },
      error: (error) => {
        console.error('❌ Error obteniendo estado de cola:', error);
        this.loadingQueueStatus = false;
      }
    });
  }

  clearQueue() {
      this.dispositivosService.clearQueue().subscribe({
        next: (response) => {
          
          this.refreshQueueStatus();
        },
        error: (error) => {
          
        }
      });
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  // Método para manejar cambios en el intervalo CRON
  onCronIntervalChange() {
    this.cronConfig.isActive = this.cronConfig.currentValue !== 'Desactivado';
    console.log('🔄 Intervalo CRON cambiado a:', this.cronConfig.currentValue);
  }

  // Método para probar el sistema CRON
  testCronSystem() {
    console.log('🧪 Probando sistema CRON...');
    // Aquí podrías implementar una prueba del sistema CRON
    alert('🧪 Función de prueba del sistema CRON - En desarrollo');
  }

  // Auto-refresh del estado cada 5 segundos
  private autoRefreshInterval: any;

  startAutoRefresh() {
    this.autoRefreshInterval = setInterval(() => {
      this.refreshQueueStatus();
    }, 5000); // Cada 5 segundos
  }

  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  // Método para calcular el intervalo de sincronización de cada dispositivo
  getDeviceSyncInterval(): string {
    const deviceCount = this.dispositivos.length;
    const cronValue = this.cronConfig.currentValue;
    
    if (cronValue === 'Desactivado' || deviceCount === 0) {
      return 'N/A';
    }
    
    // Calcular el intervalo real por dispositivo
    const cronMs = this.timeToMs(cronValue);
    const totalMs = cronMs * deviceCount;
    
    return this.formatInterval(totalMs);
  }

  // Método para generar pasos de ejemplo dinámicos
  getExampleSteps(): string[] {
    const cronValue = this.cronConfig.currentValue;
    const deviceCount = this.dispositivos.length;
    
    if (cronValue === 'Desactivado' || deviceCount === 0) {
      return [];
    }
    
    const steps: string[] = [];
    const timeUnit = this.getTimeUnit(cronValue);
    const timeValue = this.getTimeValue(cronValue);
    
    // Generar pasos para los primeros 4 dispositivos + ciclo
    for (let i = 0; i < Math.min(deviceCount, 4); i++) {
      const deviceName = this.dispositivos[i]?.nombre || `Dispositivo ${i + 1}`;
      const time = (i + 1) * timeValue;
      steps.push(`${time}${timeUnit}: ${deviceName}`);
    }
    
    // Si hay más de 4 dispositivos, mostrar el ciclo
    if (deviceCount > 4) {
      const cycleTime = (deviceCount + 1) * timeValue;
      steps.push(`${cycleTime}${timeUnit}: ${this.dispositivos[0]?.nombre || 'Dispositivo 1'} (ciclo)`);
    }
    
    return steps;
  }

  // Método auxiliar para convertir tiempo a milisegundos
  private timeToMs(timeValue: string): number {
    const timeMap: { [key: string]: number } = {
      '1m': 60 * 1000,      // 1 minuto
      '5m': 5 * 60 * 1000,  // 5 minutos
      '10m': 10 * 60 * 1000, // 10 minutos
      '30m': 30 * 60 * 1000, // 30 minutos
      '1h': 60 * 60 * 1000,  // 1 hora
      '6h': 6 * 60 * 60 * 1000, // 6 horas
      '12h': 12 * 60 * 60 * 1000, // 12 horas
      '24h': 24 * 60 * 60 * 1000  // 24 horas
    };
    return timeMap[timeValue] || 60 * 1000; // Default 1 minuto
  }

  // Método auxiliar para formatear intervalo
  private formatInterval(ms: number): string {
    const minutes = Math.floor(ms / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Método auxiliar para obtener la unidad de tiempo
  private getTimeUnit(cronValue: string): string {
    if (!cronValue || typeof cronValue !== 'string') return 'm';
    if (cronValue.includes('h')) return 'h';
    if (cronValue.includes('m')) return 'm';
    return 'm';
  }

  // Método auxiliar para obtener el valor numérico del tiempo
  private getTimeValue(cronValue: string): number {
    if (!cronValue || typeof cronValue !== 'string') return 1;
    const match = cronValue.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }
}