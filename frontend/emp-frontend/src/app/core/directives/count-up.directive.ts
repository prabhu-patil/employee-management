import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';

@Directive({
  selector: '[countUp]',
  standalone: true,
})
export class CountUpDirective implements OnChanges, OnDestroy {
  @Input() countUp = 0;
  @Input() duration = 800;

  private frameId = 0;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['countUp'] || changes['duration']) {
      this.animate();
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private animate(): void {
    this.stop();

    const target = Number(this.countUp) || 0;
    const duration = Math.max(Number(this.duration) || 0, 0);
    const startTime = performance.now();

    if (duration === 0) {
      this.elementRef.nativeElement.textContent = Math.round(target).toLocaleString();
      return;
    }

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeOutCubic(progress);
      const current = Math.round(target * eased);

      this.elementRef.nativeElement.textContent = current.toLocaleString();

      if (progress < 1) {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.elementRef.nativeElement.textContent = '0';
    this.frameId = requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  private easeOutCubic(progress: number): number {
    return 1 - Math.pow(1 - progress, 3);
  }
}
