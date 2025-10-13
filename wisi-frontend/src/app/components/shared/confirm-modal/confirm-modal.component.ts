import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ConfirmModalService, ConfirmModalData } from '../../../services/confirm-modal.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="showModal">
      <div class="modal-content">
        <div class="modal-header confirm">
          <h3>⚠️ {{ modalData?.title }}</h3>
          <button class="close-btn" (click)="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <p class="confirm-message">{{ modalData?.message }}</p>
          <div class="entity-info" *ngIf="modalData?.entity">
            <strong>{{ modalData?.entity?.tipo }}:</strong> {{ modalData?.entity?.nombre }} (ID: {{ modalData?.entity?.id }})
          </div>
          <div class="warning-text">
            <p><strong>⚠️ Esta acción no se puede deshacer.</strong></p>
            <p>{{ modalData?.warningText || '¿Está seguro de que desea continuar?' }}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" (click)="closeModal()">Cancelar</button>
          <button class="btn-confirm" (click)="confirmAction()">Sí, Eliminar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Modal de Confirmación Global */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header.confirm {
      background: #fff3cd;
      border-bottom-color: #ffeaa7;
    }

    .modal-header h3 {
      margin: 0;
      color: #856404;
      font-size: 18px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #856404;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: rgba(133, 100, 4, 0.1);
      border-radius: 50%;
    }

    .modal-body {
      padding: 20px;
    }

    .confirm-message {
      color: #856404;
      font-weight: bold;
      margin-bottom: 15px;
      font-size: 16px;
    }

    .entity-info {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid #ffc107;
    }

    .warning-text {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 6px;
      padding: 15px;
    }

    .warning-text p {
      margin: 0 0 10px 0;
      color: #721c24;
      font-size: 14px;
    }

    .warning-text p:last-child {
      margin-bottom: 0;
    }

    .modal-footer {
      padding: 20px;
      border-top: 1px solid #e9ecef;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn-cancel {
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s ease;
    }

    .btn-cancel:hover {
      background: #5a6268;
      transform: translateY(-1px);
    }

    .btn-confirm {
      background: #dc3545;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s ease;
    }

    .btn-confirm:hover {
      background: #c82333;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }
  `]
})
export class ConfirmModalComponent implements OnInit, OnDestroy {
  showModal = false;
  modalData: ConfirmModalData | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(private confirmModalService: ConfirmModalService) {}

  ngOnInit() {
    this.subscriptions.push(
      this.confirmModalService.showModal$.subscribe((show: boolean) => {
        this.showModal = show;
      })
    );

    this.subscriptions.push(
      this.confirmModalService.modalData$.subscribe((data: ConfirmModalData | null) => {
        this.modalData = data;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  closeModal() {
    this.confirmModalService.hideConfirmModal();
  }

  confirmAction() {
    if (this.modalData?.onConfirm) {
      this.modalData.onConfirm();
    }
    this.closeModal();
  }
}
