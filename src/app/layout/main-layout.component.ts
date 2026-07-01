import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { routeAnimations } from '../core/animations/route.animations';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './main-layout.component.html',
  animations: [routeAnimations],
})
export class MainLayoutComponent {
  isSidebarCollapsed = false;
  isMobileMenuOpen = false;
  currentUser$ = this.authService.currentUser$;
  currentRoute$ = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(event => (event as NavigationEnd).url)
  );

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  getRouteState(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] ?? outlet?.activatedRoute?.routeConfig?.path ?? '';
  }

  logout() {
    this.authService.logout();
  }
}
