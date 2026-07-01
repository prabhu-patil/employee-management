import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="min-h-screen bg-dark-bg px-4 py-8 text-white flex items-center justify-center">
      <section class="glass auth-card w-full max-w-md rounded-2xl border border-dark-border bg-dark-card/80 p-8 text-center shadow-2xl shadow-black/30">
        <div class="mx-auto mb-4 h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></div>
        <h1 class="text-3xl font-semibold tracking-normal">Signing you in</h1>
        <p class="mt-2 text-sm text-dark-text-muted">Please wait...</p>
      </section>
    </main>
  `,
})
export class OAuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const accessToken = this.route.snapshot.queryParamMap.get('access_token');
    const refreshToken = this.route.snapshot.queryParamMap.get('refresh_token');
    const role = this.route.snapshot.queryParamMap.get('role');
    const fullName = this.route.snapshot.queryParamMap.get('full_name');

    if (!accessToken || !refreshToken) {
      this.router.navigate(['/login']);
      return;
    }

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    if (role) {
      localStorage.setItem('user_role', role);
    }

    if (fullName) {
      localStorage.setItem('full_name', fullName);
    }

    this.router.navigate(['/dashboard']);
  }
}
