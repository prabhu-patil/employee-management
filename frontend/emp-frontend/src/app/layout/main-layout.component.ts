import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';

import { DashboardComponent } from '../features/dashboard/dashboard.component';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, DashboardComponent, SidebarComponent, TopbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  isSidebarCollapsed = false;
  isMobileMenuOpen = false;
  isSidebarHidden = false;
  isDashboard$: ReturnType<MainLayoutComponent['buildIsDashboardStream']>;

  constructor(private router: Router) {
    this.isDashboard$ = this.buildIsDashboardStream();
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleSidebarHidden(): void {
    this.isSidebarHidden = !this.isSidebarHidden;
  }

  private buildIsDashboardStream() {
    return this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.isDashboardUrl()),
      startWith(this.isDashboardUrl()),
    );
  }

  private isDashboardUrl(): boolean {
    return this.router.url.split('?')[0].split('#')[0] === '/dashboard';
  }
}
