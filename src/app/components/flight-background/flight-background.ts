import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-flight-background',
  styleUrl: './flight-background.scss',
  templateUrl: './flight-background.html',
})
export class FlightBackground {
  readonly theme = input<'dark' | 'light'>('dark');
}
