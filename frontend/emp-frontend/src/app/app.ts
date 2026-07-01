import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('emp-frontend');

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.initializeUser().subscribe();
  }
}
