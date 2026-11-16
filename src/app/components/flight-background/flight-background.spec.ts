import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FlightBackground } from './flight-background';

describe('FlightBackground', () => {
  let component: FlightBackground;
  let fixture: ComponentFixture<FlightBackground>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightBackground],
    }).compileComponents();

    fixture = TestBed.createComponent(FlightBackground);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
