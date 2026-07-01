import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { UnauthorizedComponent } from './core/guards/unauthorized.component';
import { MainLayoutComponent } from './layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  { 
    path: 'register', 
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'oauth/callback',
    loadComponent: () => import('./features/auth/oauth-callback/oauth-callback.component').then(m => m.OAuthCallbackComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'dashboard/employee',
        loadComponent: () => import('./features/dashboard/employee-dashboard.component').then(m => m.EmployeeDashboardComponent)
      },
      {
        path: 'employees',
        loadComponent: () => import('./features/employees/employees.component').then(m => m.EmployeesComponent),
        canActivate: [roleGuard(['admin', 'hr'])]
      },
      {
        path: 'employees/me',
        loadComponent: () => import('./features/employees/employee-profile/employee-profile.component').then(m => m.EmployeeProfileComponent)
      },
      {
        path: 'employees/:id',
        loadComponent: () => import('./features/employees/employee-profile/employee-profile.component').then(m => m.EmployeeProfileComponent),
        canActivate: [roleGuard(['admin', 'hr', 'manager'])]
      },
      {
        path: 'attendance',
        loadComponent: () => import('./features/attendance/attendance.component').then(m => m.AttendanceComponent)
      },
      {
        path: 'attendance/employee',
        loadComponent: () => import('./features/attendance/employee-attendance-list.component').then(m => m.EmployeeAttendanceListComponent),
        canActivate: [roleGuard(['admin', 'hr', 'manager'])]
      },
      {
        path: 'attendance/employee/:id',
        loadComponent: () => import('./features/attendance/employee-attendance.component').then(m => m.EmployeeAttendanceComponent),
        canActivate: [roleGuard(['admin', 'hr', 'manager'])]
      },
      {
        path: 'leave',
        loadComponent: () => import('./features/leave/leave.component').then(m => m.LeaveComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent)
      },
      {
        path: 'holidays',
        loadComponent: () => import('./features/holidays/holidays.component').then(m => m.HolidaysComponent)
      },
      {
        path: 'holidays/add-holiday',
        loadComponent: () => import('./features/holidays/add-holiday.component').then(m => m.AddHolidayComponent)
      },
      {
        path: 'holidays/edit-holiday/:id',
        loadComponent: () => import('./features/holidays/edit-holiday.component').then(m => m.EditHolidayComponent)
      }
    ]
  },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: '**', redirectTo: '/login' }
];
