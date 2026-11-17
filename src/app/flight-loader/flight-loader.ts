import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  output,
  viewChild,
} from '@angular/core';
import lottie, { AnimationItem } from 'lottie-web';

@Component({
  selector: 'app-flight-loader',
  standalone: true,
  template: `
    <div class="relative flex flex-col items-center justify-center pointer-events-none">
      <!-- Radar Rings Backdrop -->
      <div class="absolute w-[440px] h-[440px] rounded-full border border-sky-500/20 animate-ping"></div>
      <div class="absolute w-[280px] h-[280px] rounded-full border border-sky-400/25"></div>

      <!-- Lottie SVG Target Container -->
      <div #container class="relative z-10 w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96"></div>

      <!-- Aviation HUD status text -->
      <div class="relative z-10 mt-2 flex flex-col items-center text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-xs font-bold tracking-widest animate-pulse">
          <span>DELTA AIR LINES // FLIGHT DAL-907 ASCENDING</span>
        </div>
        <p class="font-mono text-[11px] text-slate-400 tracking-wider mt-1.5">
          ESTABLISHING OPERATIONS LINK // SERVICENOW CLASSIFIER
        </p>
      </div>
    </div>
  `,
})
export class FlightLoader implements OnDestroy {
  readonly completed = output<void>();

  private readonly containerRef = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private anim?: AnimationItem;
  private safetyTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    afterNextRender(() => {
      // Respect <base href> dynamically so it resolves properly on GitHub Pages subpaths or root domain
      const baseEl = typeof document !== 'undefined' ? document.querySelector('base') : null;
      const baseHref = baseEl ? baseEl.getAttribute('href') || '/' : '/';
      const cleanBase = baseHref.endsWith('/') ? baseHref : baseHref + '/';
      const jsonPath = `${cleanBase}flight-loader.json`;

      this.anim = lottie.loadAnimation({
        container: this.containerRef().nativeElement,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: jsonPath,
      });

      // Double speed to complete all 180 frames in exactly 1.5s (3.0s / 2.0 = 1.5s)
      this.anim.setSpeed(2.0);

      // Failsafe timeout: ensures transition never hangs if network drops or file fails to load
      this.safetyTimer = setTimeout(() => {
        this.completed.emit();
      }, 2200);

      const finish = () => {
        if (this.safetyTimer) clearTimeout(this.safetyTimer);
        this.completed.emit();
      };

      this.anim.addEventListener('complete', finish);
      this.anim.addEventListener('data_failed', finish);
      this.anim.addEventListener('error', finish);
    });
  }

  ngOnDestroy(): void {
    if (this.safetyTimer) clearTimeout(this.safetyTimer);
    this.anim?.destroy();
  }
}
