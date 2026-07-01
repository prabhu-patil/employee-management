import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { UnauthorizedComponent } from './shared/components/unauthorized.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  { 
    path: 'register', 
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { 
        path: 'dashboard', 
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [roleGuard(['admin', 'hr', 'manager'])]
      },
      { 
        path: 'attendance', 
        loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent)
      },
      { 
        path: 'employees', 
        loadComponent: () => import('./features/employees/employees.component').then(m => m.EmployeesComponent),
        canActivate: [roleGuard(['admin', 'hr'])]
      },
      { 
        path: 'leave', 
        loadComponent: () => import('./features/leave/leave.component').then(m => m.LeaveComponent)
      },
      { 
        path: 'reports', 
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
        canActivate: [roleGuard(['admin', 'hr'])]
      },
      { 
        path: 'profile', 
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      { path: '', redirectTo: 'attendance', pathMatch: 'full' }
    ]
  },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: '**', redirectTo: 'login' }
];
