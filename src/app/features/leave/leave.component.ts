import { Component } from '@angular/core';

import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <main class="leave-page">
      <section class="leave-card">
        <app-empty-state
          icon="clipboard-list"
          title="No leave requests"
          description="Submitted leave requests will appear here once employees start applying.">
        </app-empty-state>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #F7F9FC;
    }

    .leave-page {
      min-height: 100vh;
      padding: 24px;
    }

    .leave-card {
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }
  `],
})
export class LeaveComponent {}
