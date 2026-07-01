import { Component } from '@angular/core';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
      <h1 style="font-size: 3rem; color: #dc2626;">Access Denied</h1>
      <p style="font-size: 1.2rem; color: #6b7280;">You do not have permission to access this page.</p>
    </div>
  `
})
export class UnauthorizedComponent {}
