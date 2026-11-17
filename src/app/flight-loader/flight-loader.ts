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
    <div class="relative flex flex-col items-center justify-center pointer-events-none select-none">
      <!-- Architectural Crosshair & Radar Grid (Heart Aerospace 0px spec) -->
      <div class="absolute w-[440px] h-[440px] border border-white/15"></div>
      <div class="absolute w-[280px] h-[280px] border border-[#001489]"></div>
      <div class="absolute w-[480px] h-[1px] bg-white/10"></div>
      <div class="absolute h-[480px] w-[1px] bg-white/10"></div>

      <!-- Lottie SVG Target Container -->
      <div #container class="relative z-10 w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96"></div>

      <!-- Aviation HUD status text -->
      <div class="relative z-10 mt-4 flex flex-col items-center text-center">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 border border-[#001489] bg-[#001489]/20 text-white font-mono text-xs font-bold tracking-[0.2em] uppercase">
          <span class="w-1.5 h-1.5 bg-sky-400"></span>
          <span>AEROSPACE TELEMETRY // INITIALIZING LIVE FLIGHT LINK</span>
        </div>
        <p class="font-mono text-[11px] text-white/70 tracking-widest uppercase mt-2">
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
