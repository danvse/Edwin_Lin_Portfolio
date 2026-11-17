import { Component, ElementRef, afterNextRender, input, output, signal, viewChild } from '@angular/core';
import { ProjectFlight } from '../../models/project.model';

@Component({
  selector: 'app-project-card',
  imports: [],
  templateUrl: './project-card.html',
  styleUrl: './project-card.scss',
})
export class ProjectCard {
  // Required input signal passing the project data into this component
  readonly project = input.required<ProjectFlight>();

  // Optional theme input: 'dark' or 'light' (defaults to 'light')
  readonly theme = input<'dark' | 'light'>('light');

  // Output event to trigger the airplane takeoff transition into the live demo (emits demo target ID)
  readonly launchDemo = output<string>();

  // Internal reactive state tracking if the card is flipped or not
  protected readonly isFlipped = signal(false);

  // Template references to measure the exact natural heights of front and back faces
  private readonly frontRef = viewChild<ElementRef<HTMLElement>>('frontRef');
  private readonly backRef = viewChild<ElementRef<HTMLElement>>('backRef');

  // Dynamic animated container height
  protected readonly containerHeight = signal<number | null>(null);

  constructor() {
    afterNextRender(() => {
      this.initHeightObserver();
    });
  }

  private initHeightObserver() {
    const updateHeights = () => {
      const front = this.frontRef()?.nativeElement;
      const back = this.backRef()?.nativeElement;
      if (!front || !back) return;

      const targetHeight = this.isFlipped() ? back.scrollHeight : front.scrollHeight;
      this.containerHeight.set(targetHeight);
    };

    const front = this.frontRef()?.nativeElement;
    const back = this.backRef()?.nativeElement;

    if (front && back && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateHeights());
      ro.observe(front);
      ro.observe(back);
    }

    updateHeights();
  }

  protected toggleFlip() {
    this.isFlipped.update(current => !current);

    // Immediately trigger height expansion/contraction to match target face
    const front = this.frontRef()?.nativeElement;
    const back = this.backRef()?.nativeElement;
    if (front && back) {
      const targetHeight = this.isFlipped() ? back.scrollHeight : front.scrollHeight;
      this.containerHeight.set(targetHeight);
    }
  }

  protected triggerDemo(event: MouseEvent) {
    event.stopPropagation();
    const target = this.project().caseStudy.liveDemoUrl;
    if (target) {
      this.launchDemo.emit(target);
    }
  }
}
