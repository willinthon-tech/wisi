import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmModalData {
  title: string;
  message: string;
  entity?: {
    id: number;
    nombre: string;
    tipo: string;
  };
  warningText?: string;
  onConfirm: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmModalService {
  private showModalSubject = new BehaviorSubject<boolean>(false);
  showModal$ = this.showModalSubject.asObservable();

  private modalDataSubject = new BehaviorSubject<ConfirmModalData | null>(null);
  modalData$ = this.modalDataSubject.asObservable();

  showConfirmModal(data: ConfirmModalData) {
    this.modalDataSubject.next(data);
    this.showModalSubject.next(true);
  }

  hideConfirmModal() {
    this.showModalSubject.next(false);
    this.modalDataSubject.next(null);
  }
}
