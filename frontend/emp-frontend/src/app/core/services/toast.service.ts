import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type Toast = {
  id: number;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
};

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 1;
  private readonly toastsSubject = new BehaviorSubject<Toast[]>([]);

  readonly toasts$ = this.toastsSubject.asObservable();

  success(title: string, message: string, duration = 4000): void {
    this.add({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, duration = 4000): void {
    this.add({ type: 'error', title, message, duration });
  }

  warning(title: string, message: string, duration = 4000): void {
    this.add({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration = 4000): void {
    this.add({ type: 'info', title, message, duration });
  }

  remove(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((toast) => toast.id !== id));
  }

  private add(toast: Omit<Toast, 'id'>): void {
    const nextToast: Toast = {
      ...toast,
      id: this.nextId++,
    };

    this.toastsSubject.next([...this.toastsSubject.value, nextToast]);
    setTimeout(() => this.remove(nextToast.id), nextToast.duration ?? 4000);
  }
}
