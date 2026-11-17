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
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { US_STATE_SHAPES, UsStateShape } from './us-states-data';

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
  metar: string;
  wind: string;
  temp: string;
  altimeter: string;
  flightRules: 'VFR' | 'MVFR' | 'IFR';
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
  callsign: string;
  corridorId: string;
  from: string;
  to: string;
  pathD: string;
  progress: number; // 0.0 to 1.0
  speed: number;
  altitude: string;
  eta: string;
  status: 'CLIMBING' | 'CRUISING' | 'DESCENDING' | 'TRIAGED';
  aircraftType: string;
  speedKts: number;
  mach: string;
}

export interface EnrouteFix {
  code: string;
  name: string;
  x: number;
  y: number;
  type: 'VOR' | 'WAYPOINT';
}

export interface ArtccSector {
  code: string;
  name: string;
  x: number;
  y: number;
}

@Component({
  selector: 'app-us-map',
  imports: [DecimalPipe, UpperCasePipe],
  templateUrl: './us-map.html',
  styleUrl: './us-map.scss',
})
export class UsMap implements OnDestroy {
  // Theme input signal
  readonly theme = input<'dark' | 'light'>('light');

  // Close event to return to main portfolio
  readonly close = output<void>();

  // Full 50 US States + DC vector shapes dataset
  protected readonly usStates = US_STATE_SHAPES;

  // Active hovered state shape
  protected readonly hoveredState = signal<UsStateShape | null>(null);

  // Active layer filter ('all' | 'flights' | 'incidents' | 'radar' | 'ml')
  protected readonly activeLayer = signal<'all' | 'flights' | 'incidents' | 'radar' | 'ml'>('all');

  // Selected hub for detailed inspection drawer (defaults to Atlanta Delta HQ)
  protected readonly selectedHubId = signal<string>('ATL');

  // Hovered hub for instant HUD inspection
  protected readonly hoveredHubId = signal<string | null>(null);

  // Selected in-flight aircraft for avionics inspection
  protected readonly selectedFlightId = signal<string | null>(null);

  // Search filter query for hubs
  protected readonly hubSearchQuery = signal<string>('');

  // Audio synthesizer sonar effect toggle (zero external audio files)
  protected readonly soundEnabled = signal<boolean>(false);
  private audioCtx?: AudioContext;

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

  // Major & Secondary US Airport Hubs Dataset (Albers USA Project Coordinates)
  protected readonly hubs: AirportHub[] = [
    {
      id: 'ATL',
      iata: 'KATL',
      name: 'Hartsfield-Jackson Atlanta International',
      city: 'Atlanta',
      state: 'GA',
      x: 667,
      y: 335,
      lat: '33.6407° N',
      lon: '84.4277° W',
      role: 'Global Flight Operations HQ & Primary ML Node',
      isDeltaHq: true,
      dailyFlights: 980,
      ticketVolumeMonth: 10420,
      mlAccuracy: '90.7% F1',
      mlLatency: '1.2 ms',
      connectedRoutes: ['JFK', 'LAX', 'ORD', 'SEA', 'DFW', 'DEN', 'MIA', 'BOS', 'SFO', 'DTW', 'MSP', 'SLC', 'PHX', 'LAS', 'CLT', 'MCO', 'DCA'],
      metar: 'KATL 171952Z 27011KT 10SM FEW045 BKN250 22/11 A3002 RMK AO2 SLP164',
      wind: '270° @ 11 KT',
      temp: '22°C (72°F)',
      altimeter: '30.02 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'JFK',
      iata: 'KJFK',
      name: 'John F. Kennedy International',
      city: 'New York',
      state: 'NY',
      x: 798,
      y: 177,
      lat: '40.6413° N',
      lon: '73.7781° W',
      role: 'Transatlantic Gateway & Enterprise Operations',
      dailyFlights: 460,
      ticketVolumeMonth: 4890,
      mlAccuracy: '91.2% F1',
      mlLatency: '1.4 ms',
      connectedRoutes: ['ATL', 'LAX', 'SFO', 'SEA', 'BOS', 'MIA', 'ORD', 'DCA'],
      metar: 'KJFK 171951Z 31014G21KT 10SM SCT050 18/06 A3006 RMK AO2 PK WND 31024',
      wind: '310° @ 14G21 KT',
      temp: '18°C (64°F)',
      altimeter: '30.06 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'BOS',
      iata: 'KBOS',
      name: 'Boston Logan International Airport',
      city: 'Boston',
      state: 'MA',
      x: 827,
      y: 136,
      lat: '42.3656° N',
      lon: '71.0096° W',
      role: 'Northeast Domestic & Transatlantic Node',
      dailyFlights: 310,
      ticketVolumeMonth: 3120,
      mlAccuracy: '91.6% F1',
      mlLatency: '1.3 ms',
      connectedRoutes: ['ATL', 'JFK', 'DTW', 'MSP', 'SEA', 'DCA'],
      metar: 'KBOS 171954Z 32015KT 10SM BKN060 16/04 A3008 RMK AO2',
      wind: '320° @ 15 KT',
      temp: '16°C (61°F)',
      altimeter: '30.08 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'ORD',
      iata: 'KORD',
      name: "O'Hare International Airport",
      city: 'Chicago',
      state: 'IL',
      x: 600,
      y: 184,
      lat: '41.9742° N',
      lon: '87.9073° W',
      role: 'Midwest Air Traffic Hub & Incident Routing Center',
      dailyFlights: 680,
      ticketVolumeMonth: 7240,
      mlAccuracy: '90.9% F1',
      mlLatency: '1.1 ms',
      connectedRoutes: ['ATL', 'DFW', 'DEN', 'SEA', 'LAX', 'JFK', 'DTW', 'MSP', 'DCA'],
      metar: 'KORD 171951Z 21016G24KT 10SM BKN080 19/08 A2998 RMK AO2',
      wind: '210° @ 16G24 KT',
      temp: '19°C (66°F)',
      altimeter: '29.98 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'DTW',
      iata: 'KDTW',
      name: 'Detroit Metropolitan Airport',
      city: 'Detroit',
      state: 'MI',
      x: 662,
      y: 172,
      lat: '42.2162° N',
      lon: '83.3554° W',
      role: 'Northern Operations & Asian Departure Hub',
      dailyFlights: 390,
      ticketVolumeMonth: 3950,
      mlAccuracy: '92.3% F1',
      mlLatency: '1.5 ms',
      connectedRoutes: ['ATL', 'ORD', 'MSP', 'BOS', 'SEA', 'LAX'],
      metar: 'KDTW 171953Z 23012KT 10SM SCT100 20/07 A3001 RMK AO2',
      wind: '230° @ 12 KT',
      temp: '20°C (68°F)',
      altimeter: '30.01 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'MSP',
      iata: 'KMSP',
      name: 'Minneapolis-Saint Paul International',
      city: 'Minneapolis',
      state: 'MN',
      x: 525,
      y: 133,
      lat: '44.8848° N',
      lon: '93.2223° W',
      role: 'Upper Midwest Hub & Telemetry Dispatch Cluster',
      dailyFlights: 360,
      ticketVolumeMonth: 3410,
      mlAccuracy: '91.5% F1',
      mlLatency: '1.3 ms',
      connectedRoutes: ['ATL', 'ORD', 'DTW', 'DEN', 'SEA', 'SLC'],
      metar: 'KMSP 171953Z 17013G19KT 10SM CLR 17/05 A2994 RMK AO2',
      wind: '170° @ 13G19 KT',
      temp: '17°C (63°F)',
      altimeter: '29.94 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'DFW',
      iata: 'KDFW',
      name: 'Dallas/Fort Worth International',
      city: 'Dallas',
      state: 'TX',
      x: 472,
      y: 359,
      lat: '32.8998° N',
      lon: '97.0403° W',
      role: 'South Central Corridors & Backup Operations',
      dailyFlights: 580,
      ticketVolumeMonth: 5840,
      mlAccuracy: '90.4% F1',
      mlLatency: '1.6 ms',
      connectedRoutes: ['ATL', 'ORD', 'DEN', 'LAX', 'MIA', 'SEA', 'IAH', 'PHX'],
      metar: 'KDFW 171953Z 18018G26KT 10SM FEW030 SCT250 26/17 A2989 RMK AO2',
      wind: '180° @ 18G26 KT',
      temp: '26°C (79°F)',
      altimeter: '29.89 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'DEN',
      iata: 'KDEN',
      name: 'Denver International Airport',
      city: 'Denver',
      state: 'CO',
      x: 366,
      y: 223,
      lat: '39.8561° N',
      lon: '104.6737° W',
      role: 'Rocky Mountain Gateway & High-Altitude Routing',
      dailyFlights: 510,
      ticketVolumeMonth: 4620,
      mlAccuracy: '91.0% F1',
      mlLatency: '1.2 ms',
      connectedRoutes: ['ATL', 'ORD', 'LAX', 'SEA', 'DFW', 'SFO', 'SLC', 'PHX', 'LAS'],
      metar: 'KDEN 171953Z 02008KT 10SM SCT120 15/01 A3012 RMK AO2',
      wind: '020° @ 08 KT',
      temp: '15°C (59°F)',
      altimeter: '30.12 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'SLC',
      iata: 'KSLC',
      name: 'Salt Lake City International',
      city: 'Salt Lake City',
      state: 'UT',
      x: 266,
      y: 192,
      lat: '40.7899° N',
      lon: '111.9791° W',
      role: 'Intermountain West Hub & Flight Dispatch Node',
      dailyFlights: 330,
      ticketVolumeMonth: 2980,
      mlAccuracy: '90.3% F1',
      mlLatency: '1.4 ms',
      connectedRoutes: ['ATL', 'SEA', 'LAX', 'SFO', 'DEN', 'MSP', 'LAS', 'PHX'],
      metar: 'KSLC 171954Z 33009KT 10SM CLR 16/02 A3015 RMK AO2',
      wind: '330° @ 09 KT',
      temp: '16°C (61°F)',
      altimeter: '30.15 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'SEA',
      iata: 'KSEA',
      name: 'Seattle-Tacoma International',
      city: 'Seattle',
      state: 'WA',
      x: 159,
      y: 40,
      lat: '47.4502° N',
      lon: '122.3088° W',
      role: 'Pacific Northwest Hub & Cloud Automation Node',
      dailyFlights: 420,
      ticketVolumeMonth: 3840,
      mlAccuracy: '91.8% F1',
      mlLatency: '1.1 ms',
      connectedRoutes: ['ATL', 'LAX', 'SFO', 'DEN', 'ORD', 'JFK', 'SLC', 'MSP', 'SAN'],
      metar: 'KSEA 171953Z 19008KT 10SM -RA OVC035 13/09 A2988 RMK AO2',
      wind: '190° @ 08 KT',
      temp: '13°C (55°F)',
      altimeter: '29.88 inHg',
      flightRules: 'MVFR',
    },
    {
      id: 'SFO',
      iata: 'KSFO',
      name: 'San Francisco International',
      city: 'San Francisco',
      state: 'CA',
      x: 107,
      y: 217,
      lat: '37.6213° N',
      lon: '122.3790° W',
      role: 'Silicon Valley AI Gateway & Cybersecurity Sandbox',
      dailyFlights: 430,
      ticketVolumeMonth: 4120,
      mlAccuracy: '93.1% F1',
      mlLatency: '0.9 ms',
      connectedRoutes: ['ATL', 'LAX', 'SEA', 'JFK', 'DEN', 'ORD', 'LAS'],
      metar: 'KSFO 171956Z 29016KT 10SM FEW020 18/11 A2999 RMK AO2',
      wind: '290° @ 16 KT',
      temp: '18°C (64°F)',
      altimeter: '29.99 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'LAX',
      iata: 'KLAX',
      name: 'Los Angeles International Airport',
      city: 'Los Angeles',
      state: 'CA',
      x: 147,
      y: 299,
      lat: '33.9416° N',
      lon: '118.4085° W',
      role: 'Transpacific Operations & High-Volume Routing',
      dailyFlights: 710,
      ticketVolumeMonth: 6980,
      mlAccuracy: '91.4% F1',
      mlLatency: '1.2 ms',
      connectedRoutes: ['ATL', 'JFK', 'SFO', 'SEA', 'ORD', 'DFW', 'DEN', 'SLC', 'LAS', 'PHX', 'SAN'],
      metar: 'KLAX 171953Z 24009KT 10SM CLR 24/14 A2996 RMK AO2',
      wind: '240° @ 09 KT',
      temp: '24°C (75°F)',
      altimeter: '29.96 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'MIA',
      iata: 'KMIA',
      name: 'Miami International Airport',
      city: 'Miami',
      state: 'FL',
      x: 754,
      y: 470,
      lat: '25.7959° N',
      lon: '80.2870° W',
      role: 'Latin America & Caribbean Gateway',
      dailyFlights: 340,
      ticketVolumeMonth: 3260,
      mlAccuracy: '90.8% F1',
      mlLatency: '1.4 ms',
      connectedRoutes: ['ATL', 'JFK', 'DFW', 'ORD', 'MCO', 'CLT'],
      metar: 'KMIA 171953Z 11011KT 10SM SCT025 28/22 A3004 RMK AO2',
      wind: '110° @ 11 KT',
      temp: '28°C (82°F)',
      altimeter: '30.04 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'PHX',
      iata: 'KPHX',
      name: 'Phoenix Sky Harbor International',
      city: 'Phoenix',
      state: 'AZ',
      x: 242,
      y: 328,
      lat: '33.4373° N',
      lon: '112.0078° W',
      role: 'Desert Southwest Hub & Regional Operations',
      dailyFlights: 410,
      ticketVolumeMonth: 3820,
      mlAccuracy: '91.2% F1',
      mlLatency: '1.3 ms',
      connectedRoutes: ['ATL', 'LAX', 'DEN', 'SLC', 'SEA', 'DFW'],
      metar: 'KPHX 171951Z 26007KT 10SM CLR 27/05 A2991 RMK AO2',
      wind: '260° @ 07 KT',
      temp: '27°C (81°F)',
      altimeter: '29.91 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'LAS',
      iata: 'KLAS',
      name: 'Harry Reid International Airport',
      city: 'Las Vegas',
      state: 'NV',
      x: 204,
      y: 271,
      lat: '36.0840° N',
      lon: '115.1537° W',
      role: 'Intermountain Southwest Hub',
      dailyFlights: 380,
      ticketVolumeMonth: 3420,
      mlAccuracy: '90.8% F1',
      mlLatency: '1.4 ms',
      connectedRoutes: ['ATL', 'LAX', 'SFO', 'SLC', 'DEN', 'SEA'],
      metar: 'KLAS 171956Z 03009KT 10SM CLR 21/01 A3002 RMK AO2',
      wind: '030° @ 09 KT',
      temp: '21°C (70°F)',
      altimeter: '30.02 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'CLT',
      iata: 'KCLT',
      name: 'Charlotte Douglas International',
      city: 'Charlotte',
      state: 'NC',
      x: 715,
      y: 298,
      lat: '35.2144° N',
      lon: '80.9473° W',
      role: 'Mid-Atlantic Transit Node',
      dailyFlights: 490,
      ticketVolumeMonth: 4420,
      mlAccuracy: '91.5% F1',
      mlLatency: '1.2 ms',
      connectedRoutes: ['ATL', 'JFK', 'BOS', 'ORD', 'MIA', 'DFW'],
      metar: 'KCLT 171952Z 21010KT 10SM FEW050 21/08 A3002 RMK AO2',
      wind: '210° @ 10 KT',
      temp: '21°C (70°F)',
      altimeter: '30.02 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'IAH',
      iata: 'KIAH',
      name: 'George Bush Intercontinental Airport',
      city: 'Houston',
      state: 'TX',
      x: 499,
      y: 414,
      lat: '29.9902° N',
      lon: '95.3368° W',
      role: 'Gulf Coast Energy & International Gateway',
      dailyFlights: 460,
      ticketVolumeMonth: 4210,
      mlAccuracy: '91.1% F1',
      mlLatency: '1.3 ms',
      connectedRoutes: ['ATL', 'DFW', 'DEN', 'LAX', 'ORD', 'MIA'],
      metar: 'KIAH 171953Z 16012KT 10SM SCT040 27/18 A2995 RMK AO2',
      wind: '160° @ 12 KT',
      temp: '27°C (81°F)',
      altimeter: '29.95 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'MCO',
      iata: 'KMCO',
      name: 'Orlando International Airport',
      city: 'Orlando',
      state: 'FL',
      x: 730,
      y: 424,
      lat: '28.4289° N',
      lon: '81.3090° W',
      role: 'Central Florida Tourism & Flight Operations',
      dailyFlights: 440,
      ticketVolumeMonth: 4050,
      mlAccuracy: '91.3% F1',
      mlLatency: '1.3 ms',
      connectedRoutes: ['ATL', 'JFK', 'BOS', 'DTW', 'MSP', 'MIA'],
      metar: 'KMCO 171953Z 09009KT 10SM FEW030 26/19 A3005 RMK AO2',
      wind: '090° @ 09 KT',
      temp: '26°C (79°F)',
      altimeter: '30.05 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'DCA',
      iata: 'KDCA',
      name: 'Ronald Reagan Washington National',
      city: 'Washington',
      state: 'DC',
      x: 760,
      y: 220,
      lat: '38.8512° N',
      lon: '77.0402° W',
      role: 'National Capital Region & Logistics Hub',
      dailyFlights: 350,
      ticketVolumeMonth: 3100,
      mlAccuracy: '92.0% F1',
      mlLatency: '1.1 ms',
      connectedRoutes: ['ATL', 'BOS', 'DTW', 'MSP', 'MIA', 'ORD', 'JFK'],
      metar: 'KDCA 171952Z 29013KT 10SM SCT060 19/05 A3004 RMK AO2',
      wind: '290° @ 13 KT',
      temp: '19°C (66°F)',
      altimeter: '30.04 inHg',
      flightRules: 'VFR',
    },
    {
      id: 'SAN',
      iata: 'KSAN',
      name: 'San Diego International Airport',
      city: 'San Diego',
      state: 'CA',
      x: 160,
      y: 326,
      lat: '32.7338° N',
      lon: '117.1933° W',
      role: 'Southern California Maritime & Air Corridor',
      dailyFlights: 290,
      ticketVolumeMonth: 2650,
      mlAccuracy: '91.8% F1',
      mlLatency: '1.2 ms',
      connectedRoutes: ['ATL', 'LAX', 'SEA', 'SLC', 'DEN'],
      metar: 'KSAN 171951Z 28009KT 10SM CLR 23/15 A2996 RMK AO2',
      wind: '280° @ 09 KT',
      temp: '23°C (73°F)',
      altimeter: '29.96 inHg',
      flightRules: 'VFR',
    },
  ];

  // Aeronautical Navigation Fixes (VOR / High-Altitude Intersections in Albers)
  protected readonly enrouteFixes: EnrouteFix[] = [
    { code: 'TUL', name: 'Tulsa VOR', x: 492, y: 297, type: 'VOR' },
    { code: 'ICT', name: 'Wichita VOR', x: 468, y: 268, type: 'VOR' },
    { code: 'BNA', name: 'Nashville VOR', x: 628, y: 292, type: 'VOR' },
    { code: 'BLD', name: 'Boulder City VOR', x: 208, y: 274, type: 'VOR' },
    { code: 'OAL', name: 'Coaldale VOR', x: 174, y: 227, type: 'VOR' },
    { code: 'JOT', name: 'Joliet VOR', x: 595, y: 192, type: 'VOR' },
    { code: 'DNY', name: 'Delancey VOR', x: 776, y: 153, type: 'VOR' },
    { code: 'LGC', name: 'LaGrange VOR', x: 656, y: 347, type: 'VOR' },
    { code: 'ABQ', name: 'Albuquerque VOR', x: 325, y: 310, type: 'VOR' },
    { code: 'BOI', name: 'Boise VOR', x: 219, y: 130, type: 'VOR' },
    { code: 'BIL', name: 'Billings VOR', x: 326, y: 106, type: 'VOR' },
    { code: 'FAR', name: 'Fargo VOR', x: 478, y: 96, type: 'VOR' },
    { code: 'LNK', name: 'Lincoln VOR', x: 478, y: 208, type: 'VOR' },
    { code: 'BUM', name: 'Butler VOR', x: 511, y: 258, type: 'VOR' },
    { code: 'CSN', name: 'Casanova VOR', x: 749, y: 226, type: 'VOR' },
  ];

  // FAA Air Route Traffic Control Center (ARTCC) Airspace Sectors
  protected readonly artccSectors: ArtccSector[] = [
    { code: 'ZSE', name: 'Seattle Center', x: 154, y: 57 },
    { code: 'ZOA', name: 'Oakland Center', x: 121, y: 214 },
    { code: 'ZLA', name: 'Los Angeles Center', x: 151, y: 280 },
    { code: 'ZLC', name: 'Salt Lake Center', x: 256, y: 167 },
    { code: 'ZDV', name: 'Denver Center', x: 361, y: 219 },
    { code: 'ZAB', name: 'Albuquerque Center', x: 335, y: 331 },
    { code: 'ZMP', name: 'Minneapolis Center', x: 515, y: 131 },
    { code: 'ZAU', name: 'Chicago Center', x: 593, y: 193 },
    { code: 'ZKC', name: 'Kansas City Center', x: 510, y: 244 },
    { code: 'ZFW', name: 'Fort Worth Center', x: 473, y: 357 },
    { code: 'ZHU', name: 'Houston Center', x: 497, y: 414 },
    { code: 'ZME', name: 'Memphis Center', x: 587, y: 316 },
    { code: 'ZID', name: 'Indianapolis Center', x: 631, y: 227 },
    { code: 'ZTL', name: 'Atlanta Center', x: 674, y: 336 },
    { code: 'ZJX', name: 'Jacksonville Center', x: 713, y: 388 },
    { code: 'ZMA', name: 'Miami Center', x: 750, y: 467 },
    { code: 'ZOB', name: 'Cleveland Center', x: 689, y: 182 },
    { code: 'ZDC', name: 'Washington Center', x: 755, y: 228 },
    { code: 'ZNY', name: 'New York Center', x: 796, y: 180 },
    { code: 'ZBW', name: 'Boston Center', x: 818, y: 126 },
  ];

  // Great-Circle Flight Corridors in Albers Projection
  protected readonly corridors: FlightCorridor[] = [
    {
      id: 'ATL-JFK',
      from: 'ATL',
      to: 'JFK',
      pathD: 'M 667,335 Q 707,235 798,177',
      flightNumber: 'DAL-907',
      callsign: 'DELTA NINE-ZERO-SEVEN',
      aircraftType: 'A321neo',
      altitude: 'FL360',
      speedKts: 470,
    },
    {
      id: 'ATL-LAX',
      from: 'ATL',
      to: 'LAX',
      pathD: 'M 667,335 Q 411,252 147,299',
      flightNumber: 'DAL-104',
      callsign: 'DELTA ONE-ZERO-FOUR',
      aircraftType: 'B767-400ER',
      altitude: 'FL380',
      speedKts: 495,
    },
    {
      id: 'ATL-ORD',
      from: 'ATL',
      to: 'ORD',
      pathD: 'M 667,335 Q 658,249 600,184',
      flightNumber: 'DAL-512',
      callsign: 'DELTA FIVE-ONE-TWO',
      aircraftType: 'B737-900ER',
      altitude: 'FL320',
      speedKts: 440,
    },
    {
      id: 'ATL-SEA',
      from: 'ATL',
      to: 'SEA',
      pathD: 'M 667,335 Q 446,131 159,40',
      flightNumber: 'DAL-382',
      callsign: 'DELTA THREE-EIGHT-TWO',
      aircraftType: 'A350-900',
      altitude: 'FL400',
      speedKts: 515,
    },
    {
      id: 'ATL-DFW',
      from: 'ATL',
      to: 'DFW',
      pathD: 'M 667,335 Q 566,316 472,359',
      flightNumber: 'DAL-997',
      callsign: 'DELTA NINE-NINE-SEVEN',
      aircraftType: 'A220-300',
      altitude: 'FL340',
      speedKts: 460,
    },
    {
      id: 'ATL-DEN',
      from: 'ATL',
      to: 'DEN',
      pathD: 'M 667,335 Q 534,231 366,223',
      flightNumber: 'DAL-844',
      callsign: 'DELTA EIGHT-FOUR-FOUR',
      aircraftType: 'B757-200',
      altitude: 'FL370',
      speedKts: 480,
    },
    {
      id: 'ATL-MIA',
      from: 'ATL',
      to: 'MIA',
      pathD: 'M 667,335 Q 732,389 754,470',
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
      pathD: 'M 667,335 Q 715,210 827,136',
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
      pathD: 'M 667,335 Q 400,212 107,217',
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
      pathD: 'M 667,335 Q 691,253 662,172',
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
      pathD: 'M 667,335 Q 628,211 525,133',
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
      pathD: 'M 667,335 Q 488,202 266,192',
      flightNumber: 'DAL-755',
      callsign: 'DELTA SEVEN-FIVE-FIVE',
      aircraftType: 'A321neo',
      altitude: 'FL360',
      speedKts: 475,
    },
    {
      id: 'ATL-PHX',
      from: 'ATL',
      to: 'PHX',
      pathD: 'M 667,335 Q 456,267 242,328',
      flightNumber: 'DAL-772',
      callsign: 'DELTA SEVEN-SEVEN-TWO',
      aircraftType: 'A321neo',
      altitude: 'FL360',
      speedKts: 475,
    },
    {
      id: 'ATL-MCO',
      from: 'ATL',
      to: 'MCO',
      pathD: 'M 667,335 Q 713,369 730,424',
      flightNumber: 'DAL-1205',
      callsign: 'DELTA ONE-TWO-ZERO-FIVE',
      aircraftType: 'B757-200',
      altitude: 'FL300',
      speedKts: 440,
    },
    {
      id: 'ATL-CLT',
      from: 'ATL',
      to: 'CLT',
      pathD: 'M 667,335 Q 685,309 715,298',
      flightNumber: 'DAL-819',
      callsign: 'DELTA EIGHT-ONE-NINE',
      aircraftType: 'A320-200',
      altitude: 'FL260',
      speedKts: 390,
    },
    {
      id: 'ATL-DCA',
      from: 'ATL',
      to: 'DCA',
      pathD: 'M 667,335 Q 695,263 760,220',
      flightNumber: 'DAL-612',
      callsign: 'DELTA SIX-ONE-TWO',
      aircraftType: 'B717-200',
      altitude: 'FL310',
      speedKts: 430,
    },
    {
      id: 'JFK-LAX',
      from: 'JFK',
      to: 'LAX',
      pathD: 'M 798,177 Q 461,174 147,299',
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
      pathD: 'M 159,40 Q 400,50 600,184',
      flightNumber: 'DAL-112',
      callsign: 'DELTA ONE-ONE-TWO',
      aircraftType: 'B737-900ER',
      altitude: 'FL350',
      speedKts: 470,
    },
    {
      id: 'DFW-LAX',
      from: 'DFW',
      to: 'LAX',
      pathD: 'M 472,359 Q 319,277 147,299',
      flightNumber: 'DAL-688',
      callsign: 'DELTA SIX-EIGHT-EIGHT',
      aircraftType: 'A321-200',
      altitude: 'FL360',
      speedKts: 465,
    },
    {
      id: 'DFW-IAH',
      from: 'DFW',
      to: 'IAH',
      pathD: 'M 472,359 Q 494,382 499,414',
      flightNumber: 'DAL-1580',
      callsign: 'DELTA ONE-FIVE-EIGHT-ZERO',
      aircraftType: 'A220-300',
      altitude: 'FL220',
      speedKts: 390,
    },
    {
      id: 'LAX-LAS',
      from: 'LAX',
      to: 'LAS',
      pathD: 'M 147,299 Q 171,276 204,271',
      flightNumber: 'DAL-440',
      callsign: 'DELTA FOUR-FOUR-ZERO',
      aircraftType: 'A320-200',
      altitude: 'FL240',
      speedKts: 410,
    },
    {
      id: 'LAX-SAN',
      from: 'LAX',
      to: 'SAN',
      pathD: 'M 147,299 Q 158,310 160,326',
      flightNumber: 'DAL-228',
      callsign: 'DELTA TWO-TWO-EIGHT',
      aircraftType: 'B717-200',
      altitude: 'FL180',
      speedKts: 360,
    },
  ];

  // Active moving aircraft instances
  protected readonly aircraftBlips = signal<AircraftBlip[]>([
    {
      id: 'BLIP-1',
      flightNumber: 'DAL-907',
      callsign: 'DELTA NINE-ZERO-SEVEN',
      corridorId: 'ATL-JFK',
      from: 'ATL',
      to: 'JFK',
      pathD: 'M 667,335 Q 707,235 798,177',
      progress: 0.65,
      speed: 0.0018,
      altitude: '36,000 FT (FL360)',
      eta: '42 MIN',
      status: 'CRUISING',
      aircraftType: 'Airbus A321neo',
      speedKts: 470,
      mach: '0.78',
    },
    {
      id: 'BLIP-2',
      flightNumber: 'DAL-104',
      callsign: 'DELTA ONE-ZERO-FOUR',
      corridorId: 'ATL-LAX',
      from: 'ATL',
      to: 'LAX',
      pathD: 'M 667,335 Q 411,252 147,299',
      progress: 0.38,
      speed: 0.0012,
      altitude: '38,000 FT (FL380)',
      eta: '2H 15M',
      status: 'CRUISING',
      aircraftType: 'Boeing 767-400ER',
      speedKts: 495,
      mach: '0.82',
    },
    {
      id: 'BLIP-3',
      flightNumber: 'DAL-382',
      callsign: 'DELTA THREE-EIGHT-TWO',
      corridorId: 'ATL-SEA',
      from: 'ATL',
      to: 'SEA',
      pathD: 'M 667,335 Q 446,131 159,40',
      progress: 0.82,
      speed: 0.0014,
      altitude: '18,500 FT (FL185)',
      eta: '18 MIN',
      status: 'DESCENDING',
      aircraftType: 'Airbus A350-900',
      speedKts: 410,
      mach: '0.68',
    },
    {
      id: 'BLIP-4',
      flightNumber: 'DAL-512',
      callsign: 'DELTA FIVE-ONE-TWO',
      corridorId: 'ATL-ORD',
      from: 'ATL',
      to: 'ORD',
      pathD: 'M 667,335 Q 658,249 600,184',
      progress: 0.22,
      speed: 0.0022,
      altitude: '24,000 FT (FL240)',
      eta: '54 MIN',
      status: 'CLIMBING',
      aircraftType: 'Boeing 737-900ER',
      speedKts: 420,
      mach: '0.70',
    },
    {
      id: 'BLIP-5',
      flightNumber: 'DAL-401',
      callsign: 'DELTA FOUR-ZERO-ONE',
      corridorId: 'JFK-LAX',
      from: 'JFK',
      to: 'LAX',
      pathD: 'M 798,177 Q 461,174 147,299',
      progress: 0.54,
      speed: 0.0011,
      altitude: '39,000 FT (FL390)',
      eta: '2H 40M',
      status: 'CRUISING',
      aircraftType: 'Boeing 767-300ER',
      speedKts: 510,
      mach: '0.83',
    },
    {
      id: 'BLIP-6',
      flightNumber: 'DAL-203',
      callsign: 'DELTA TWO-ZERO-THREE',
      corridorId: 'ATL-MIA',
      from: 'ATL',
      to: 'MIA',
      pathD: 'M 667,335 Q 732,389 754,470',
      progress: 0.76,
      speed: 0.0025,
      altitude: '12,000 FT (FL120)',
      eta: '14 MIN',
      status: 'DESCENDING',
      aircraftType: 'Boeing 737-800',
      speedKts: 360,
      mach: '0.58',
    },
    {
      id: 'BLIP-7',
      flightNumber: 'DAL-890',
      callsign: 'DELTA EIGHT-NINE-ZERO',
      corridorId: 'ATL-SFO',
      from: 'ATL',
      to: 'SFO',
      pathD: 'M 667,335 Q 400,212 107,217',
      progress: 0.44,
      speed: 0.0013,
      altitude: '37,000 FT (FL370)',
      eta: '2H 02M',
      status: 'CRUISING',
      aircraftType: 'Airbus A350-900',
      speedKts: 505,
      mach: '0.82',
    },
    {
      id: 'BLIP-8',
      flightNumber: 'DAL-772',
      callsign: 'DELTA SEVEN-SEVEN-TWO',
      corridorId: 'ATL-PHX',
      from: 'ATL',
      to: 'PHX',
      pathD: 'M 667,335 Q 456,267 242,328',
      progress: 0.48,
      speed: 0.0014,
      altitude: '36,000 FT (FL360)',
      eta: '1H 45M',
      status: 'CRUISING',
      aircraftType: 'Airbus A321neo',
      speedKts: 475,
      mach: '0.78',
    },
    {
      id: 'BLIP-9',
      flightNumber: 'DAL-1205',
      callsign: 'DELTA ONE-TWO-ZERO-FIVE',
      corridorId: 'ATL-MCO',
      from: 'ATL',
      to: 'MCO',
      pathD: 'M 667,335 Q 713,369 730,424',
      progress: 0.70,
      speed: 0.0024,
      altitude: '15,000 FT (FL150)',
      eta: '16 MIN',
      status: 'DESCENDING',
      aircraftType: 'Boeing 757-200',
      speedKts: 410,
      mach: '0.65',
    },
    {
      id: 'BLIP-10',
      flightNumber: 'DAL-440',
      callsign: 'DELTA FOUR-FOUR-ZERO',
      corridorId: 'LAX-LAS',
      from: 'LAX',
      to: 'LAS',
      pathD: 'M 147,299 Q 171,276 204,271',
      progress: 0.52,
      speed: 0.0028,
      altitude: '24,000 FT (FL240)',
      eta: '22 MIN',
      status: 'CRUISING',
      aircraftType: 'Airbus A320-200',
      speedKts: 410,
      mach: '0.67',
    },
  ]);

  // Active selected hub detail view
  protected readonly currentHub = computed(() => {
    const id = this.hoveredHubId() || this.selectedHubId();
    return this.hubs.find(h => h.id === id) || this.hubs[0];
  });

  // Selected aircraft detail view
  protected readonly selectedFlight = computed(() => {
    const id = this.selectedFlightId();
    if (!id) return null;
    return this.aircraftBlips().find(b => b.id === id) || null;
  });

  // Filtered hubs by search query
  protected readonly filteredHubs = computed(() => {
    const q = this.hubSearchQuery().toLowerCase().trim();
    if (!q) return this.hubs;
    return this.hubs.filter(
      h =>
        h.id.toLowerCase().includes(q) ||
        h.iata.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.state.toLowerCase().includes(q)
    );
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

  // Compute (x, y, angle) coordinates and tangent angle along a quadratic bezier curve
  protected getPointOnBezier(pathD: string, t: number): { x: number; y: number; angle: number } {
    // Expected format: M x0,y0 Q cx,cy x1,y1
    const match = pathD.match(/M\s*([\d.]+),([\d.]+)\s*Q\s*([\d.]+),([\d.]+)\s*([\d.]+),([\d.]+)/);
    if (!match) return { x: 0, y: 0, angle: 0 };

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

    // Tangent derivative vector B'(t) = 2(1-t)(P1 - P0) + 2t(P2 - P1)
    const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return { x, y, angle };
  }

  // Interactive mouse movement tracker for live lat/lon telemetry in Albers
  protected handleMouseMove(event: MouseEvent) {
    const svgEl = this.mapSvgRef()?.nativeElement;
    if (!svgEl) return;

    const rect = svgEl.getBoundingClientRect();
    const scaleX = 960 / rect.width;
    const scaleY = 600 / rect.height;

    const svgX = (event.clientX - rect.left) * scaleX;
    const svgY = (event.clientY - rect.top) * scaleY;

    // Approximate US Continental Lat/Lon transformation from Albers screen space
    const lonVal = 125 - (svgX / 960) * (125 - 66);
    const latVal = 50 - (svgY / 600) * (50 - 24);

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
    this.hoveredState.set(null);
  }

  protected hoverState(state: UsStateShape | null) {
    this.hoveredState.set(state);
    if (state) {
      this.playRadarBeep(720, 0.02);
    }
  }

  protected setLayer(layer: 'all' | 'flights' | 'incidents' | 'radar' | 'ml') {
    this.activeLayer.set(layer);
    this.playRadarBeep(520, 0.05);
  }

  protected selectHub(hubId: string) {
    this.selectedHubId.set(hubId);
    this.selectedFlightId.set(null); // Return focus to hub
    this.playRadarBeep(640, 0.06);
  }

  protected hoverHub(hubId: string | null) {
    this.hoveredHubId.set(hubId);
    if (hubId) {
      this.playRadarBeep(800, 0.03);
    }
  }

  protected selectFlight(blipId: string) {
    this.selectedFlightId.set(blipId);
    this.playRadarBeep(980, 0.07);
  }

  protected clearFlightSelection() {
    this.selectedFlightId.set(null);
  }

  protected onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.hubSearchQuery.set(input.value);
  }

  protected setSimSpeed(speed: number) {
    this.simSpeed.set(speed);
    this.playRadarBeep(440, 0.04);
  }

  protected toggleIncidentSurge() {
    this.isIncidentSurge.update(v => !v);
    this.playRadarBeep(this.isIncidentSurge() ? 320 : 640, 0.12);
  }

  // Audio synthesizer sonar chirp (Web Audio API)
  protected toggleSound() {
    this.soundEnabled.update(v => !v);
    if (this.soundEnabled()) {
      this.playRadarBeep(880, 0.08);
    }
  }

  private playRadarBeep(freq = 640, duration = 0.06) {
    if (!this.soundEnabled()) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // AudioContext unavailable or restricted by browser autoplay policy
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // Ignored
      }
    }
  }
}
