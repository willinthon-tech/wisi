import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ErrorModalService, ErrorModalData } from '../../../services/error-modal.service';

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header error">
          <h3>⚠️ {{ modalData?.title }}</h3>
          <button class="close-btn" (click)="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <p class="error-message">{{ modalData?.message }}</p>
          <div class="entity-info">
            <strong>{{ modalData?.entity?.tipo }}:</strong> {{ modalData?.entity?.nombre }} (ID: {{ modalData?.entity?.id }})
          </div>
          <div class="relations-section" *ngIf="modalData && modalData.relations && modalData.relations.length > 0">
            <h4>Elementos asociados que impiden la eliminación:</h4>
            <ul class="relations-list">
              <li *ngFor="let relation of modalData.relations" class="relation-item">
                <span class="relation-name">{{ relation.table_name }}</span>
                <span class="relation-count">{{ relation.count }} elemento(s)</span>
              </li>
            </ul>
          </div>
          <div class="help-text" *ngIf="modalData?.helpText">
            <p>{{ modalData?.helpText }}</p>
          </div>
          <div class="help-text" *ngIf="!modalData?.helpText">
            <p>Para eliminar este elemento, primero debe eliminar todos los elementos asociados listados arriba.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" (click)="closeModal()">Entendido</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Modal de Error Global */
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

    .modal-header.error {
      background: #f8d7da;
      border-bottom-color: #f5c6cb;
    }

    .modal-header h3 {
      margin: 0;
      color: #721c24;
      font-size: 18px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #721c24;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: rgba(114, 28, 36, 0.1);
      border-radius: 50%;
    }

    .modal-body {
      padding: 20px;
    }

    .error-message {
      color: #721c24;
      font-weight: bold;
      margin-bottom: 15px;
    }

    .entity-info {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid #dc3545;
    }

    .relations-section h4 {
      color: #333;
      margin-bottom: 10px;
      font-size: 16px;
    }

    .relations-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .relation-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      margin-bottom: 5px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
    }

    .relation-name {
      font-weight: bold;
      color: #856404;
    }

    .relation-count {
      background: #dc3545;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }

    .help-text {
      margin-top: 15px;
      padding: 10px;
      background: #d1ecf1;
      border: 1px solid #bee5eb;
      border-radius: 6px;
    }

    .help-text p {
      margin: 0;
      color: #0c5460;
      font-size: 14px;
    }

    .modal-footer {
      padding: 20px;
      border-top: 1px solid #e9ecef;
      display: flex;
      justify-content: flex-end;
    }

    .modal-footer .btn-primary {
      background: #dc3545;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
    }

    .modal-footer .btn-primary:hover {
      background: #c82333;
    }
  `]
})
export class ErrorModalComponent implements OnInit, OnDestroy {
  showModal = false;
  modalData: ErrorModalData | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(private errorModalService: ErrorModalService) {}

  ngOnInit() {
    this.subscriptions.push(
      this.errorModalService.showModal$.subscribe((show: boolean) => {
        this.showModal = show;
      })
    );

    this.subscriptions.push(
      this.errorModalService.modalData$.subscribe((data: ErrorModalData | null) => {
        this.modalData = data;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  closeModal() {
    this.errorModalService.hideErrorModal();
  }
}
