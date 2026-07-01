import {
  animate,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';

export const listAnimation = trigger('listAnimation', [
  transition(':enter', [
    query(
      ':enter',
      [
        stagger('30ms', [
          style({ opacity: 0, transform: 'translateY(4px)' }),
          animate('200ms ease-out', style({ opacity: 1, transform: 'none' })),
        ]),
      ],
      { optional: true },
    ),
  ]),
]);
