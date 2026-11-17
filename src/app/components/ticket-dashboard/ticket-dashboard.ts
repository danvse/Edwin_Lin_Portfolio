import { Component, computed, effect, input, output, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';

export interface ServiceTicket {
  id: string;
  station: string;
  category: string;
  summary: string;
  confidence: number;
  timestamp: string;
  status: 'AUTOMATED_ROUTE' | 'ESCALATED' | 'RESOLVED';
  flightNumber?: string;
  delayMinutes?: number;
}

export interface StationData {
  code: string;
  name: string;
  totalTickets: number;
  accuracy: string;
  f1: string;
  trend: number[]; // 8 weeks of volume
  categoryCounts: Record<string, number>;
}

@Component({
  selector: 'app-ticket-dashboard',
  imports: [JsonPipe],
  templateUrl: './ticket-dashboard.html',
  styleUrl: './ticket-dashboard.scss',
})
export class TicketDashboard {
  readonly close = output<void>();

  // Theme input from parent App component
  readonly themeInput = input<'dark' | 'light'>('light');

  // Theme signal: Light or Dark mode (defaults to 'light', synced with themeInput)
  protected readonly theme = signal<'dark' | 'light'>('light');

  constructor() {
    effect(() => {
      this.theme.set(this.themeInput());
    });
  }

  // Filter signals
  protected readonly selectedStation = signal<string>('ALL');
  protected readonly selectedCategory = signal<string>('ALL');

  // Popup modal signal
  protected readonly drilldownModal = signal<any | null>(null);

  // Disclaimer popup modal (open by default for compliance notice)
  protected readonly showDisclaimer = signal<boolean>(true);

  closeDisclaimer() {
    this.showDisclaimer.set(false);
  }

  openDisclaimer() {
    this.showDisclaimer.set(true);
  }

  protected readonly stations = ['ALL', 'ATL', 'DTW', 'MSP', 'SLC', 'SEA', 'LAX', 'JFK'];

  // Station dataset with distinct trends and distributions
  private readonly stationProfiles: Record<string, StationData> = {
    ALL: {
      code: 'ALL',
      name: 'Systemwide (All Delta Stations)',
      totalTickets: 524,
      accuracy: '90.7%',
      f1: '0.906',
      trend: [32, 48, 42, 60, 54, 68, 78, 96],
      categoryCounts: {
        'Flight Delay (Weather/ATC)': 184,
        'Baggage Logistics': 112,
        'Crew Scheduling': 86,
        'Gate Equipment Maintenance': 64,
        'Aircraft Towing & Ramp': 48,
        'IT Kiosks & Passenger Assist': 30,
      },
    },
    ATL: {
      code: 'ATL',
      name: 'Atlanta (World Mega-Hub)',
      totalTickets: 215,
      accuracy: '92.4%',
      f1: '0.921',
      trend: [24, 38, 35, 68, 45, 58, 72, 50],
      categoryCounts: {
        'Flight Delay (Weather/ATC)': 94,
        'Baggage Logistics': 48,
        'Crew Scheduling': 32,
        'Gate Equipment Maintenance': 21,
        'Aircraft Towing & Ramp': 12,
        'IT Kiosks & Passenger Assist': 8,
      },
    },
    DTW: {
      code: 'DTW',
      name: 'Detroit (Midwest / Transatlantic)',
      totalTickets: 85,
      accuracy: '93.1%',
      f1: '0.928',
      trend: [45, 38, 28, 20, 16, 22, 28, 18],
      categoryCounts: {
        'Flight Delay (Weather/ATC)': 22,
        'Gate Equipment Maintenance': 26,
        'Baggage Logistics': 18,
        'Crew Scheduling': 10,
        'Aircraft Towing & Ramp': 5,
        'IT Kiosks & Passenger Assist': 4,
      },
    },
    MSP: {
      code: 'MSP',
      name: 'Minneapolis-St. Paul Hub',
      totalTickets: 70,
      accuracy: '91.8%',
      f1: '0.914',
      trend: [14, 18, 24, 52, 38, 20, 16, 18],
      categoryCounts: {
        'Baggage Logistics': 28,
        'Flight Delay (Weather/ATC)': 18,
        'Gate Equipment Maintenance': 11,
        'Crew Scheduling': 7,
        'Aircraft Towing & Ramp': 4,
        'IT Kiosks & Passenger Assist': 2,
      },
    },
    JFK: {
      code: 'JFK',
      name: 'New York JFK Hub',
      totalTickets: 55,
      accuracy: '91.2%',
      f1: '0.908',
      trend: [18, 26, 32, 40, 48, 56, 64, 62],
      categoryCounts: {
        'Flight Delay (Weather/ATC)': 26,
        'Baggage Logistics': 11,
        'Crew Scheduling': 8,
        'IT Kiosks & Passenger Assist': 5,
        'Gate Equipment Maintenance': 3,
        'Aircraft Towing & Ramp': 2,
      },
    },
    SLC: {
      code: 'SLC',
      name: 'Salt Lake City Hub',
      totalTickets: 40,
      accuracy: '89.5%',
      f1: '0.892',
      trend: [12, 16, 14, 22, 18, 24, 26, 18],
      categoryCounts: {
        'Crew Scheduling': 16,
        'Flight Delay (Weather/ATC)': 11,
        'Baggage Logistics': 6,
        'Gate Equipment Maintenance': 4,
        'Aircraft Towing & Ramp': 2,
        'IT Kiosks & Passenger Assist': 1,
      },
    },
    SEA: {
      code: 'SEA',
      name: 'Seattle Hub',
      totalTickets: 35,
      accuracy: '88.7%',
      f1: '0.881',
      trend: [8, 12, 14, 16, 22, 34, 46, 38],
      categoryCounts: {
        'Aircraft Towing & Ramp': 14,
        'Flight Delay (Weather/ATC)': 9,
        'Baggage Logistics': 5,
        'Crew Scheduling': 4,
        'Gate Equipment Maintenance': 2,
        'IT Kiosks & Passenger Assist': 1,
      },
    },
    LAX: {
      code: 'LAX',
      name: 'Los Angeles Hub',
      totalTickets: 24,
      accuracy: '94.2%',
      f1: '0.938',
      trend: [8, 9, 12, 10, 14, 15, 18, 12],
      categoryCounts: {
        'IT Kiosks & Passenger Assist': 9,
        'Flight Delay (Weather/ATC)': 6,
        'Baggage Logistics': 4,
        'Crew Scheduling': 3,
        'Gate Equipment Maintenance': 1,
        'Aircraft Towing & Ramp': 1,
      },
    },
  };

  // Station Volume Breakdown (Cards)
  protected readonly stationVolumes = [
    { code: 'ATL', name: 'Atlanta (HQ)', count: 215, pct: 43 },
    { code: 'DTW', name: 'Detroit', count: 85, pct: 17 },
    { code: 'MSP', name: 'Minneapolis', count: 70, pct: 14 },
    { code: 'JFK', name: 'New York JFK', count: 55, pct: 11 },
    { code: 'SLC', name: 'Salt Lake City', count: 40, pct: 8 },
    { code: 'SEA', name: 'Seattle', count: 35, pct: 7 },
  ];

  // Base categories metadata
  protected readonly baseCategories = [
    { name: 'Flight Delay (Weather/ATC)', color: '#38bdf8' },
    { name: 'Baggage Logistics', color: '#34d399' },
    { name: 'Crew Scheduling', color: '#a855f7' },
    { name: 'Gate Equipment Maintenance', color: '#f59e0b' },
    { name: 'Aircraft Towing & Ramp', color: '#ec4899' },
    { name: 'IT Kiosks & Passenger Assist', color: '#06b6d4' },
  ];

  // REACTIVE KPI: Updates based on selected station!
  protected readonly currentStationProfile = computed(() => {
    return this.stationProfiles[this.selectedStation()] || this.stationProfiles['ALL'];
  });

  // REACTIVE CATEGORIES: Counts and percentages dynamically recalculate!
  protected readonly dynamicCategories = computed(() => {
    const profile = this.currentStationProfile();
    const total = profile.totalTickets || 1;

    return this.baseCategories.map(cat => {
      const count = profile.categoryCounts[cat.name] || 0;
      const pct = Math.round((count / total) * 100);
      return {
        ...cat,
        count,
        pct,
        acc: profile.accuracy,
      };
    });
  });

  // REACTIVE SVG CHART: Computes dynamic line and area SVG points for current station!
  protected readonly chartData = computed(() => {
    const trend = this.currentStationProfile().trend;
    // Scale dynamically with a baseline of 100 max capacity so curves are visibly distinct
    const maxVal = 100;
    const height = 150;
    const width = 600;
    const stepX = width / (trend.length - 1);

    const points = trend.map((val, idx) => {
      const x = Math.round(idx * stepX);
      const y = Math.round(height - (val / maxVal) * (height - 30) - 10);
      return { x, y, val, week: `WK ${28 + idx * 2}` };
    });

    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
    const polygon = `0,${height} ` + points.map(p => `${p.x},${p.y}`).join(' ') + ` ${width},${height}`;

    const maxItemVal = Math.max(...trend);
    const currentPeak = points.find(p => p.val === maxItemVal) || points[points.length - 1];

    return { points, polyline, polygon, currentPeak, maxItemVal };
  });

  // Raw mock ServiceNow tickets classified by Edwin's model
  protected readonly rawTickets = signal<ServiceTicket[]>([
    {
      id: 'INC-90412',
      station: 'ATL',
      category: 'Flight Delay (Weather/ATC)',
      summary: 'Thunderstorm squall line over Hartsfield concourse D grounding ramp operations.',
      confidence: 0.968,
      timestamp: '14:22 EST',
      status: 'AUTOMATED_ROUTE',
      flightNumber: 'DL-842',
      delayMinutes: 45,
    },
    {
      id: 'INC-90413',
      station: 'DTW',
      category: 'Gate Equipment Maintenance',
      summary: 'Jetbridge 44B power cable sensor fault preventing latch to A321neo.',
      confidence: 0.942,
      timestamp: '14:18 EST',
      status: 'RESOLVED',
      flightNumber: 'DL-1104',
    },
    {
      id: 'INC-90414',
      station: 'MSP',
      category: 'Baggage Logistics',
      summary: 'Carousel 3 belt motor tripped on terminal 1 transfer bag surge from MSP-AMS inbound.',
      confidence: 0.925,
      timestamp: '14:05 EST',
      status: 'AUTOMATED_ROUTE',
      flightNumber: 'DL-134',
    },
    {
      id: 'INC-90415',
      station: 'SLC',
      category: 'Crew Scheduling',
      summary: 'First officer FAA duty timeout on flight DL-1204; standby crew dispatched from base.',
      confidence: 0.897,
      timestamp: '13:52 EST',
      status: 'ESCALATED',
      flightNumber: 'DL-1204',
    },
    {
      id: 'INC-90416',
      station: 'JFK',
      category: 'Flight Delay (Weather/ATC)',
      summary: 'FAA ground delay program for JFK slot arrival constraint due to crosswinds.',
      confidence: 0.971,
      timestamp: '13:40 EST',
      status: 'AUTOMATED_ROUTE',
      flightNumber: 'DL-402',
      delayMinutes: 62,
    },
    {
      id: 'INC-90417',
      station: 'SEA',
      category: 'Aircraft Towing & Ramp',
      summary: 'Pushback tug hydraulic fluid warning at gate S12; aircraft cleared for repark.',
      confidence: 0.884,
      timestamp: '13:25 EST',
      status: 'RESOLVED',
      flightNumber: 'DL-208',
    },
    {
      id: 'INC-90418',
      station: 'LAX',
      category: 'IT Kiosks & Passenger Assist',
      summary: 'Terminal 2 biometric gate scanner offline on international departure bank.',
      confidence: 0.953,
      timestamp: '13:10 EST',
      status: 'RESOLVED',
      flightNumber: 'DL-68',
    },
    {
      id: 'INC-90419',
      station: 'ATL',
      category: 'Baggage Logistics',
      summary: 'Late connecting international baggage transfer container missing bag-tag scan.',
      confidence: 0.916,
      timestamp: '12:55 EST',
      status: 'AUTOMATED_ROUTE',
      flightNumber: 'DL-199',
    },
    {
      id: 'INC-90420',
      station: 'ATL',
      category: 'Flight Delay (Weather/ATC)',
      summary: 'Ramp lightning alert protocol holding flight DL-1440 at deice pad 2.',
      confidence: 0.982,
      timestamp: '12:40 EST',
      status: 'AUTOMATED_ROUTE',
      flightNumber: 'DL-1440',
      delayMinutes: 30,
    },
    {
      id: 'INC-90421',
      station: 'DTW',
      category: 'Gate Equipment Maintenance',
      summary: 'Concourse A gate A12 potable water service connection frozen valve.',
      confidence: 0.938,
      timestamp: '12:20 EST',
      status: 'RESOLVED',
      flightNumber: 'DL-505',
    },
  ]);

  // Reactive cross-filtered tickets computed signal
  protected readonly filteredTickets = computed(() => {
    const station = this.selectedStation();
    const category = this.selectedCategory();

    return this.rawTickets().filter(t => {
      const matchStation = station === 'ALL' || t.station === station;
      const matchCategory = category === 'ALL' || t.category === category;
      return matchStation && matchCategory;
    });
  });

  protected toggleTheme() {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  // Updates the station filter -> All charts and metrics update instantly!
  protected setStation(st: string) {
    this.selectedStation.set(st);
  }

  // Updates the category filter -> Highlights and filters table!
  protected setCategory(cat: string) {
    this.selectedCategory.set(cat === this.selectedCategory() ? 'ALL' : cat);
  }

  protected resetFilters() {
    this.selectedStation.set('ALL');
    this.selectedCategory.set('ALL');
  }

  // Opens popup modal on chart clicks
  protected openChartDrilldown(data: { title: string; category?: string; station?: string; count?: number }) {
    this.drilldownModal.set({
      title: data.title,
      category: data.category || 'Flight Delay (Weather/ATC)',
      station: data.station || this.selectedStation(),
      count: data.count || this.currentStationProfile().totalTickets,
      confidence: `${this.currentStationProfile().accuracy} Model Accuracy`,
      topNlpTokens: [
        { token: 'ground-stop', weight: 0.92 },
        { token: 'faa-slot', weight: 0.88 },
        { token: 'thunderstorm', weight: 0.84 },
        { token: 'crosswind', weight: 0.79 },
        { token: 'concourse', weight: 0.72 },
      ],
      affectedFlights: ['DL-842 (ATL-LGA)', 'DL-402 (JFK-LAX)', 'DL-1104 (DTW-MCO)', 'DL-199 (ATL-CDG)'],
      rawPayload: {
        event_id: 'SNOW_EVT_' + Math.floor(Math.random() * 900000 + 100000),
        station_filter: data.station || this.selectedStation(),
        source: 'ServiceNow_API_v2',
        retrained_model: 'LinearSVC_v2026.08',
        inference_latency: '18.4ms',
        database_validation: 'PostgreSQL_DEV_OK',
        status: 'DISPATCH_AUTOMATED',
      },
    });
  }

  protected closeDrilldown() {
    this.drilldownModal.set(null);
  }
}
