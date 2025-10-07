import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ErrorModalData {
  title: string;
  message: string;
  entity?: {
    id: number;
    nombre: string;
    tipo: string;
  };
  relations?: { table_name: string; count: number }[];
  helpText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorModalService {
  private showModalSubject = new BehaviorSubject<boolean>(false);
  showModal$ = this.showModalSubject.asObservable();

  private modalDataSubject = new BehaviorSubject<ErrorModalData | null>(null);
  modalData$ = this.modalDataSubject.asObservable();

  showErrorModal(data: ErrorModalData) {
    this.modalDataSubject.next(data);
    this.showModalSubject.next(true);
  }

  hideErrorModal() {
    this.showModalSubject.next(false);
    this.modalDataSubject.next(null);
  }
}