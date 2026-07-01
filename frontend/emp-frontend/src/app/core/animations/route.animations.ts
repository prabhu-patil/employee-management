import {
  animate,
  style,
  transition,
  trigger,
} from '@angular/animations';

export const routeAnimations = trigger('routeAnimations', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
  transition(':leave', [
    style({ opacity: 1, transform: 'translateY(0)' }),
    animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-4px)' })),
  ]),
]);
