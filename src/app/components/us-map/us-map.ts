import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface AirportHub {
  id: string;
  iata: string;
  name: string;
  city: string;
  state: string;
  x: number;
  y: number;
  lat: string;
  lon: string;
  role: string;
  isDeltaHq?: boolean;
  dailyFlights: number;
  ticketVolumeMonth: number;
  mlAccuracy: string;
  mlLatency: string;
  connectedRoutes: string[];
}

export interface FlightCorridor {
  id: string;
  from: string;
  to: string;
  pathD: string;
  flightNumber: string;
  callsign: string;
  aircraftType: string;
  altitude: string;
  speedKts: number;
}

export interface AircraftBlip {
  id: string;
  flightNumber: string;
  corridorId: string;
  from: string;
  to: string;
  pathD: string;
  progress: number; // 0.0 to 1.0
  speed: number;
  altitude: string;
  eta: string;
  status: 'CLIMBING' | 'CRUISING' | 'DESCENDING' | 'TRIAGED';
}

@Component({
  selector: 'app-us-map',
  imports: [DecimalPipe],
  templateUrl: './us-map.html',
  styleUrl: './us-map.scss',
})
export class UsMap implements OnDestroy {
  // Theme input signal
  readonly theme = input<'dark' | 'light'>('light');

  // Close event to return to main portfolio
  readonly close = output<void>();

  // Active layer filter ('all' | 'flights' | 'incidents' | 'radar' | 'ml')
  protected readonly activeLayer = signal<'all' | 'flights' | 'incidents' | 'radar' | 'ml'>('all');

  // Selected hub for detailed inspection drawer (defaults to Atlanta Delta HQ)
  protected readonly selectedHubId = signal<string>('ATL');

  // Hovered hub for instant HUD inspection
  protected readonly hoveredHubId = signal<string | null>(null);

  // Live mouse geographic coordinate tracker
  protected readonly cursorInfo = signal<{
    lat: string;
    lon: string;
    x: number;
    y: number;
    visible: boolean;
  }>({
    lat: '33.64° N',
    lon: '84.43° W',
    x: 0,
    y: 0,
    visible: false,
  });

  // Simulation controls
  protected readonly simSpeed = signal<number>(1);
  protected readonly isIncidentSurge = signal<boolean>(false);

  // Reference to map SVG container
  private readonly mapSvgRef = viewChild<ElementRef<SVGSVGElement>>('mapSvg');

  // Animation frame loop identifier
  private animFrameId?: number;
  private lastTimestamp = 0;

  // Major US Airport Hubs Dataset
  protected readonly hubs: AirportHub[] = [
    {
      id: 'ATL',
      iata: 'KATL',
      name: 'Hartsfield-Jackson Atlanta International',
      city: 'Atlanta',
      state: 'GA',
      x: 720,
      y: 410,
      lat: '33.6407° N',
      lon: '84.4277° W',
      role: 'Global Flight Operations HQ & Primary ML Node',
      isDeltaHq: true,
      dailyFlights: 980,
      ticketVolumeMonth: 10420,
      mlAccuracy: '90.7% F1',
      mlLatency: '1.2 ms',
      connectedRoutes: ['JFK', 'LAX', 'ORD', 'SEA', 'DFW', 'DEN', 'MIA', 'BOS', 'SFO', 'DTW', 'MSP', 'SLC'],
    },
    {
      id: 'JFK',
      iata: 'KJFK',
      name: 'John F. Kennedy International',
      city: 'New York',
      state: 'NY',
      x: 875,
      y: 225,
      lat: '40.6413° N',
      lon: '73.7781° W',
      role: 'Transatlantic Gateway & Enterprise Operations',
      dailyFlights: 460,
      ticketVolumeMonth: 4890,
      mlAccuracy: '91.2% F1',
      mlLatency: '1.4 ms',
      connectedRoutes: ['ATL', 'LAX', 'SFO', 'ORD', 'SEA', 'MIA', 'BOS'],
    },
    {
      id: 'BOS',
      iata: 'KBOS',
      name: 'Logan International Airport',
      city: 'Boston',
      state: 'MA',
      x: 910,
      y: 195,
      lat: '42.3656° N',
      lon: '71.0096° W',
      role: 'Northeast Tech & Business Corridor Hub',
      dailyFlights: 310,
      ticketVolumeMonth: 3120,
      mlAccuracy: '89.8% F1',
      mlLatency: '1.1 ms',
      connectedRoutes: ['ATL', 'JFK', 'ORD', 'SEA', 'MIA'],
    },
    {
      id: 'ORD',
      iata: 'KORD',
      name: "O'Hare International Airport",
      city: 'Chicago',
      state: 'IL',
      x: 635,
      y: 260,
      lat: '41.9742° N',
      lon: '87.9073° W',
      role: 'Midwest Crossroads & Real-Time Weather Forecaster',
      dailyFlights: 680,
      ticketVolumeMonth: 6340,
      mlAccuracy: '92.4% F1',
      mlLatency: '1.3 ms',
      connectedRoutes: ['ATL', 'JFK', 'LAX', 'SEA', 'DEN', 'DFW', 'DTW', 'MSP'],
    },
    {
      id: 'DTW',
      iata: 'KDTW',
      name: 'Detroit Metropolitan Wayne County',
      city: 'Detroit',
      state: 'MI',
      x: 705,
      y: 245,
      lat: '42.2162° N',
      lon: '83.3554° W',
      role: 'Primary Delta Northern Hub & Automation Testbed',
      dailyFlights: 410,
      ticketVolumeMonth: 3890,
      mlAccuracy: '90.5% F1',
      mlLatency: '1.2 ms',
      connectedRoutes: ['ATL', 'ORD', 'JFK', 'SEA', 'LAX', 'MSP'],
    },
    {
      id: 'MSP',
      iata: 'KMSP',
      name: 'Minneapolis-Saint Paul International',
      city: 'Minneapolis',
      state: 'MN',
      x: 550,
      y: 195,
      lat: '44.8848° N',
      lon: '93.2223° W',
      role: 'Northwest Transit Hub & Batch Analytics Cluster',
      dailyFlights: 390,
      ticketVolumeMonth: 3450,
      mlAccuracy: '89.9% F1',
      mlLatency: '1.5 ms',
      connectedRoutes: ['ATL', 'ORD', 'SEA', 'DEN', 'DTW', 'SLC'],
    },
    {
      id: 'DFW',
      iata: 'KDFW',
      name: 'Dallas/Fort Worth International',
      city: 'Dallas',
      state: 'TX',
      x: 520,
      y: 445,
      lat: '32.8998° N',
      lon: '97.0403° W',
      role: 'South Central Hub & AWS Failover Subsystem',
      dailyFlights: 540,
      ticketVolumeMonth: 5120,
      mlAccuracy: '90.1% F1',
      mlLatency: '1.3 ms',
      connectedRoutes: ['ATL', 'ORD', 'LAX', 'DEN', 'MIA', 'SFO'],
    },
    {
      id: 'DEN',
      iata: 'KDEN',
      name: 'Denver International Airport',
      city: 'Denver',
      state: 'CO',
      x: 390,
      y: 310,
      lat: '39.8561° N',
      lon: '104.6737° W',
      role: 'Rocky Mountain Airspace & Altitude Telemetry',
      dailyFlights: 510,
      ticketVolumeMonth: 4620,
      mlAccuracy: '91.0% F1',
      mlLatency: '1.2 ms',
      connectedRoutes: ['ATL', 'ORD', 'LAX', 'SEA', 'DFW', 'SFO', 'SLC'],
    },
    {
      id: 'SLC',
      iata: 'KSLC',
      name: 'Salt Lake City International',
      city: 'Salt Lake City',
      state: 'UT',
      x: 275,
      y: 275,
      lat: '40.7899° N',
      lon: '111.9791° W',
      role: 'Intermountain West Hub & Flight Dispatch Node',
      dailyFlights: 330,
      ticketVolumeMonth: 2980,
      mlAccuracy: '90.3% F1',
      mlLatency: '1.4 ms',
      connectedRoutes: ['ATL', 'SEA', 'LAX', 'SFO', 'DEN', 'MSP'],
    },
    {
      id: 'SEA',
      iata: 'KSEA',
      name: 'Seattle-Tacoma International',
      city: 'Seattle',
      state: 'WA',
      x: 145,
      y: 110,
      lat: '47.4502° N',
      lon: '122.3088° W',
      role: 'Pacific Northwest Hub & Cloud Automation Node',
      dailyFlights: 420,
      ticketVolumeMonth: 3840,
      mlAccuracy: '91.8% F1',
      mlLatency: '1.1 ms',
      connectedRoutes: ['ATL', 'LAX', 'SFO', 'DEN', 'ORD', 'JFK', 'SLC', 'MSP'],
    },
    {
      id: 'SFO',
      iata: 'KSFO',
      name: 'San Francisco International',
      city: 'San Francisco',
      state: 'CA',
      x: 95,
      y: 300,
      lat: '37.6213° N',
      lon: '122.3790° W',
      role: 'Silicon Valley AI Gateway & Cybersecurity Sandbox',
      dailyFlights: 430,
      ticketVolumeMonth: 4120,
      mlAccuracy: '93.1% F1',
      mlLatency: '0.9 ms',
      connectedRoutes: ['ATL', 'LAX', 'SEA', 'JFK', 'DEN', 'ORD'],
    },
    {
      id: 'LAX',
      iata: 'KLAX',
      name: 'Los Angeles International Airport',
      city: 'Los Angeles',
      state: 'CA',
      x: 135,
      y: 395,
      lat: '33.9416° N',
      lon: '118.4085° W',
      role: 'Transpacific Operations & High-Volume Routing',
      dailyFlights: 710,
      ticketVolumeMonth: 6980,
      mlAccuracy: '91.4% F1',
      mlLatency: '1.2 ms',
      connectedRoutes: ['ATL', 'JFK', 'SFO', 'SEA', 'ORD', 'DFW', 'DEN', 'SLC'],
    },
    {
      id: 'MIA',
      iata: 'KMIA',
      name: 'Miami International Airport',
      city: 'Miami',
      state: 'FL',
      x: 810,
      y: 555,
      lat: '25.7959° N',
      lon: '80.2870° W',
      role: 'Latin America Gateway & Weather Monitoring Hub',
      dailyFlights: 360,
      ticketVolumeMonth: 3290,
      mlAccuracy: '89.6% F1',
      mlLatency: '1.3 ms',
      connectedRoutes: ['ATL', 'JFK', 'BOS', 'ORD', 'DFW'],
    },
  ];

  // Geographically calibrated great-circle curved flight corridors
  protected readonly corridors: FlightCorridor[] = [
    {
      id: 'ATL-JFK',
      from: 'ATL',
      to: 'JFK',
      pathD: 'M 720,410 Q 805,305 875,225',
      flightNumber: 'DAL-907',
      callsign: 'DELTA NINE-ZERO-SEVEN',
      aircraftType: 'A350-900',
      altitude: 'FL360',
      speedKts: 480,
    },
    {
      id: 'ATL-LAX',
      from: 'ATL',
      to: 'LAX',
      pathD: 'M 720,410 Q 420,380 135,395',
      flightNumber: 'DAL-104',
      callsign: 'DELTA ONE-ZERO-FOUR',
      aircraftType: 'B767-400ER',
      altitude: 'FL380',
      speedKts: 495,
    },
    {
      id: 'ATL-SEA',
      from: 'ATL',
      to: 'SEA',
      pathD: 'M 720,410 Q 420,230 145,110',
      flightNumber: 'DAL-382',
      callsign: 'DELTA THREE-EIGHT-TWO',
      aircraftType: 'A321neo',
      altitude: 'FL340',
      speedKts: 460,
    },
    {
      id: 'ATL-ORD',
      from: 'ATL',
      to: 'ORD',
      pathD: 'M 720,410 Q 675,330 635,260',
      flightNumber: 'DAL-512',
      callsign: 'DELTA FIVE-ONE-TWO',
      aircraftType: 'B737-900ER',
      altitude: 'FL320',
      speedKts: 440,
    },
    {
      id: 'ATL-DFW',
      from: 'ATL',
      to: 'DFW',
      pathD: 'M 720,410 Q 615,435 520,445',
      flightNumber: 'DAL-781',
      callsign: 'DELTA SEVEN-EIGHT-ONE',
      aircraftType: 'A220-300',
      altitude: 'FL300',
      speedKts: 420,
    },
    {
      id: 'ATL-DEN',
      from: 'ATL',
      to: 'DEN',
      pathD: 'M 720,410 Q 550,350 390,310',
      flightNumber: 'DAL-429',
      callsign: 'DELTA FOUR-TWO-NINE',
      aircraftType: 'B757-200',
      altitude: 'FL350',
      speedKts: 470,
    },
    {
      id: 'ATL-MIA',
      from: 'ATL',
      to: 'MIA',
      pathD: 'M 720,410 Q 770,480 810,555',
      flightNumber: 'DAL-203',
      callsign: 'DELTA TWO-ZERO-THREE',
      aircraftType: 'B737-800',
      altitude: 'FL310',
      speedKts: 430,
    },
    {
      id: 'ATL-BOS',
      from: 'ATL',
      to: 'BOS',
      pathD: 'M 720,410 Q 820,290 910,195',
      flightNumber: 'DAL-614',
      callsign: 'DELTA SIX-ONE-FOUR',
      aircraftType: 'A321neo',
      altitude: 'FL370',
      speedKts: 485,
    },
    {
      id: 'ATL-SFO',
      from: 'ATL',
      to: 'SFO',
      pathD: 'M 720,410 Q 400,320 95,300',
      flightNumber: 'DAL-890',
      callsign: 'DELTA EIGHT-NINE-ZERO',
      aircraftType: 'A350-900',
      altitude: 'FL390',
      speedKts: 505,
    },
    {
      id: 'ATL-DTW',
      from: 'ATL',
      to: 'DTW',
      pathD: 'M 720,410 Q 715,320 705,245',
      flightNumber: 'DAL-308',
      callsign: 'DELTA THREE-ZERO-EIGHT',
      aircraftType: 'B717-200',
      altitude: 'FL290',
      speedKts: 410,
    },
    {
      id: 'ATL-MSP',
      from: 'ATL',
      to: 'MSP',
      pathD: 'M 720,410 Q 630,290 550,195',
      flightNumber: 'DAL-470',
      callsign: 'DELTA FOUR-SEVEN-ZERO',
      aircraftType: 'A320-200',
      altitude: 'FL330',
      speedKts: 450,
    },
    {
      id: 'ATL-SLC',
      from: 'ATL',
      to: 'SLC',
      pathD: 'M 720,410 Q 490,320 275,275',
      flightNumber: 'DAL-755',
      callsign: 'DELTA SEVEN-FIVE-FIVE',
      aircraftType: 'A321neo',
      altitude: 'FL360',
      speedKts: 475,
    },
    {
      id: 'JFK-LAX',
      from: 'JFK',
      to: 'LAX',
      pathD: 'M 875,225 Q 500,280 135,395',
      flightNumber: 'DAL-401',
      callsign: 'DELTA FOUR-ZERO-ONE',
      aircraftType: 'B767-300ER',
      altitude: 'FL390',
      speedKts: 510,
    },
    {
      id: 'SEA-ORD',
      from: 'SEA',
      to: 'ORD',
      pathD: 'M 145,110 Q 380,170 635,260',
      flightNumber: 'DAL-924',
      callsign: 'DELTA NINE-TWO-FOUR',
      aircraftType: 'A321neo',
      altitude: 'FL370',
      speedKts: 490,
    },
    {
      id: 'SFO-JFK',
      from: 'SFO',
      to: 'JFK',
      pathD: 'M 95,300 Q 480,240 875,225',
      flightNumber: 'DAL-280',
      callsign: 'DELTA TWO-EIGHT-ZERO',
      aircraftType: 'B767-400ER',
      altitude: 'FL410',
      speedKts: 525,
    },
  ];

  // Active moving aircraft instances
  protected readonly aircraftBlips = signal<AircraftBlip[]>([
    {
      id: 'BLIP-1',
      flightNumber: 'DAL-907',
      corridorId: 'ATL-JFK',
      from: 'ATL',
      to: 'JFK',
      pathD: 'M 720,410 Q 805,305 875,225',
      progress: 0.65,
      speed: 0.0018,
      altitude: '36,000 FT',
      eta: '42 MIN',
      status: 'CRUISING',
    },
    {
      id: 'BLIP-2',
      flightNumber: 'DAL-104',
      corridorId: 'ATL-LAX',
      from: 'ATL',
      to: 'LAX',
      pathD: 'M 720,410 Q 420,380 135,395',
      progress: 0.38,
      speed: 0.0012,
      altitude: '38,000 FT',
      eta: '2H 15M',
      status: 'CRUISING',
    },
    {
      id: 'BLIP-3',
      flightNumber: 'DAL-382',
      corridorId: 'ATL-SEA',
      from: 'ATL',
      to: 'SEA',
      pathD: 'M 720,410 Q 420,230 145,110',
      progress: 0.82,
      speed: 0.0014,
      altitude: '18,500 FT',
      eta: '18 MIN',
      status: 'DESCENDING',
    },
    {
      id: 'BLIP-4',
      flightNumber: 'DAL-512',
      corridorId: 'ATL-ORD',
      from: 'ATL',
      to: 'ORD',
      pathD: 'M 720,410 Q 675,330 635,260',
      progress: 0.22,
      speed: 0.0022,
      altitude: '24,000 FT',
      eta: '54 MIN',
      status: 'CLIMBING',
    },
    {
      id: 'BLIP-5',
      flightNumber: 'DAL-401',
      corridorId: 'JFK-LAX',
      from: 'JFK',
      to: 'LAX',
      pathD: 'M 875,225 Q 500,280 135,395',
      progress: 0.54,
      speed: 0.0011,
      altitude: '39,000 FT',
      eta: '2H 40M',
      status: 'CRUISING',
    },
    {
      id: 'BLIP-6',
      flightNumber: 'DAL-203',
      corridorId: 'ATL-MIA',
      from: 'ATL',
      to: 'MIA',
      pathD: 'M 720,410 Q 770,480 810,555',
      progress: 0.76,
      speed: 0.0025,
      altitude: '12,000 FT',
      eta: '14 MIN',
      status: 'DESCENDING',
    },
    {
      id: 'BLIP-7',
      flightNumber: 'DAL-890',
      corridorId: 'ATL-SFO',
      from: 'ATL',
      to: 'SFO',
      pathD: 'M 720,410 Q 400,320 95,300',
      progress: 0.44,
      speed: 0.0013,
      altitude: '37,000 FT',
      eta: '2H 02M',
      status: 'CRUISING',
    },
  ]);

  // Active selected hub detail view
  protected readonly currentHub = computed(() => {
    const id = this.hoveredHubId() || this.selectedHubId();
    return this.hubs.find(h => h.id === id) || this.hubs[0];
  });

  // Filtered corridors according to activeLayer and selection
  protected readonly visibleCorridors = computed(() => {
    const layer = this.activeLayer();
    const sel = this.selectedHubId();
    const hov = this.hoveredHubId();
    const targetHub = hov || sel;

    if (layer === 'incidents' || layer === 'ml') {
      // Focus corridors radiating from current target hub
      return this.corridors.filter(c => c.from === targetHub || c.to === targetHub);
    }
    return this.corridors;
  });

  constructor() {
    afterNextRender(() => {
      this.startAircraftLoop();
    });
  }

  // Animation frame loop for continuous smooth flight blip motion
  private startAircraftLoop() {
    const loop = (timestamp: number) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const delta = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;

      const speedMultiplier = this.simSpeed();
      if (speedMultiplier > 0) {
        this.aircraftBlips.update(blips =>
          blips.map(b => {
            let nextProgress = b.progress + b.speed * (delta / 16.6) * speedMultiplier;
            if (nextProgress > 1.0) nextProgress = 0.0;
            return {
              ...b,
              progress: nextProgress,
            };
          })
        );
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  // Compute (x, y) coordinates along a quadratic bezier curve for blip rendering
  protected getPointOnBezier(pathD: string, t: number): { x: number; y: number } {
    // Expected format: M x0,y0 Q cx,cy x1,y1
    const match = pathD.match(/M\s*([\d.]+),([\d.]+)\s*Q\s*([\d.]+),([\d.]+)\s*([\d.]+),([\d.]+)/);
    if (!match) return { x: 0, y: 0 };

    const x0 = parseFloat(match[1]);
    const y0 = parseFloat(match[2]);
    const cx = parseFloat(match[3]);
    const cy = parseFloat(match[4]);
    const x1 = parseFloat(match[5]);
    const y1 = parseFloat(match[6]);

    // B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;

    const x = uu * x0 + 2 * u * t * cx + tt * x1;
    const y = uu * y0 + 2 * u * t * cy + tt * y1;

    return { x, y };
  }

  // Interactive mouse movement tracker for live lat/lon telemetry
  protected handleMouseMove(event: MouseEvent) {
    const svgEl = this.mapSvgRef()?.nativeElement;
    if (!svgEl) return;

    const rect = svgEl.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 640 / rect.height;

    const svgX = (event.clientX - rect.left) * scaleX;
    const svgY = (event.clientY - rect.top) * scaleY;

    // Approximate US Continental Lat/Lon transformation
    // Lon: 125°W (x=60) to 66°W (x=940)
    // Lat: 50°N (y=70) to 24°N (y=580)
    const lonVal = 125 - ((svgX - 60) / (940 - 60)) * (125 - 66);
    const latVal = 50 - ((svgY - 70) / (580 - 70)) * (50 - 24);

    const latDeg = Math.max(24, Math.min(50, latVal)).toFixed(2);
    const lonDeg = Math.max(66, Math.min(125, lonVal)).toFixed(2);

    this.cursorInfo.set({
      lat: `${latDeg}° N`,
      lon: `${lonDeg}° W`,
      x: event.clientX,
      y: event.clientY,
      visible: true,
    });
  }

  protected handleMouseLeave() {
    this.cursorInfo.update(c => ({ ...c, visible: false }));
  }

  protected setLayer(layer: 'all' | 'flights' | 'incidents' | 'radar' | 'ml') {
    this.activeLayer.set(layer);
  }

  protected selectHub(hubId: string) {
    this.selectedHubId.set(hubId);
  }

  protected hoverHub(hubId: string | null) {
    this.hoveredHubId.set(hubId);
  }

  protected setSimSpeed(speed: number) {
    this.simSpeed.set(speed);
  }

  protected toggleIncidentSurge() {
    this.isIncidentSurge.update(v => !v);
  }

  ngOnDestroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}
