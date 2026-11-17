import { afterNextRender, Component, effect, ElementRef, signal, viewChild } from '@angular/core';
import { FlightBackground } from './components/flight-background/flight-background';
import { ProjectCard } from './components/project-card/project-card';
import { TicketDashboard } from './components/ticket-dashboard/ticket-dashboard';
import { DiscordDemo } from './components/discord-demo/discord-demo';
import { FlightLoader } from './flight-loader/flight-loader';
import { ProjectFlight } from './models/project.model';

@Component({
  selector: 'app-root',
  imports: [FlightBackground, ProjectCard, TicketDashboard, DiscordDemo, FlightLoader],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Theme signal: Light or Dark mode for entire application (defaults to 'light')
  protected readonly theme = signal<'dark' | 'light'>('light');

  // Controls which interactive demo modal is active ('delta' | 'discord' | null)
  protected readonly activeDemo = signal<'delta' | 'discord' | null>(null);

  // Controls whether the About Me / Delta Co-op Dossier modal is open
  protected readonly showAbout = signal(false);

  // Active photo selection for the profile
  protected readonly activePhoto = signal<'badge' | 'alt'>('badge');

  // Controls the airplane flight transition overlay
  protected readonly isTransitioning = signal(false);
  protected readonly isFadingOut = signal(false);
  private pendingDemoTarget = signal<string>('#dashboard');

  // Template reference to the hero looping background video
  private readonly heroVideo = viewChild<ElementRef<HTMLVideoElement>>('heroVideo');

  constructor() {
    afterNextRender(() => {
      // 1. Ensure continuous, seamless playback of background video
      const vid = this.heroVideo()?.nativeElement;
      if (vid) {
        vid.muted = true;
        vid.play().catch(() => {});
      }

      // 2. Hardware-accelerated parallax scroll handler
      if (typeof window !== 'undefined') {
        const handleScroll = () => {
          document.documentElement.style.setProperty('--scroll-offset', `${window.scrollY}px`);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
      }

      // 3. IntersectionObserver for industrial scroll reveals
      if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
              }
            });
          },
          { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );

        document.querySelectorAll('.aerospace-reveal').forEach((el) => {
          observer.observe(el);
        });
      }
    });

    // Initial sync from URL hash on first page load or browser refresh
    this.syncStateFromHash();

    // Listen to browser Back/Forward navigation or direct hash changes
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => this.syncStateFromHash());
    }

    // Lock both root html and body scroll when any modal is active to eliminate dual scrollbars
    effect(() => {
      if (typeof document !== 'undefined') {
        if (this.activeDemo() !== null || this.showAbout()) {
          document.documentElement.style.overflow = 'hidden';
          document.body.style.overflow = 'hidden';
        } else {
          document.documentElement.style.overflow = '';
          document.body.style.overflow = '';
        }
      }
    });
  }

  // Synchronize component reactive signals with the browser URL hash
  private syncStateFromHash() {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.toLowerCase();

    if (hash === '#dashboard' || hash === '#delta') {
      this.activeDemo.set('delta');
      this.showAbout.set(false);
    } else if (hash === '#discord-demo' || hash === '#discord') {
      this.activeDemo.set('discord');
      this.showAbout.set(false);
    } else if (hash === '#about' || hash === '#dossier') {
      this.showAbout.set(true);
      this.activeDemo.set(null);
    } else {
      this.activeDemo.set(null);
      this.showAbout.set(false);
    }
  }

  protected openAbout() {
    if (typeof window !== 'undefined') {
      window.location.hash = 'about';
    }
    this.showAbout.set(true);
  }

  protected closeAbout() {
    if (typeof window !== 'undefined' && window.location.hash) {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
    this.showAbout.set(false);
  }

  protected setPhoto(photo: 'badge' | 'alt') {
    this.activePhoto.set(photo);
  }

  // Real Resume Projects from Edwin Lin
  protected readonly projects = signal<ProjectFlight[]>([
    {
      id: 'delta-ml-classifier',
      flightNumber: 'DAL-907',
      callsign: 'SERVICENOW ML CLASSIFIER',
      route: {
        origin: 'INCOMING_TICKETS',
        destination: 'OPERATIONS_DASHBOARD',
      },
      gate: 'AWS LAMBDA',
      seat: '1A (ENTERPRISE)',
      status: 'ON_TIME',
      specification: 'VERIFIED PRODUCTION',
      tagline: 'LinearSVC NLP classifier capturing incident intent across 10,000+ monthly operational tickets at 90.7% accuracy to automate intelligent triage and routing across 8 business domains.',
      techStack: ['Python', 'scikit-learn', 'PostgreSQL', 'AWS Lambda', 'JavaScript', 'SVG'],
      caseStudy: {
        problem: 'Delta Air Lines experiences heavy operational ticket traffic exceeding 10,000+ tickets monthly. Because incoming incidents span diverse, unpredictable domains—ranging from flight delays and gate equipment to baggage belts, ramp towing, and IT infrastructure—manual triage created severe operational bottlenecks. Delta needed an automated system to capture natural language intent and cleanly redirect each ticket to the right specialized teams for rapid resolution.',
        solution: 'Engineered and deployed a high-precision LinearSVC NLP classifier (scikit-learn) with TF-IDF feature extraction that accurately captures user intent across 8 operational categories at 90.7% accuracy (0.906 F1). Built automated daily retraining pipelines validating against dev PostgreSQL before release, serving real-time intent predictions and routing actions via serverless AWS Lambda REST APIs.',
        architectureNotes: 'Integrated with an interactive live dashboard with weekly trend analysis, station breakdown, arrival heatmaps, and per-ticket classifier confidence.',
        metrics: [
          { label: 'CLASSIFICATION ACCURACY', value: '90.7%', change: '0.906 F1' },
          { label: 'MONTHLY INTENT ROUTING', value: '10,000+', change: 'Automated' },
          { label: 'DAILY RETRAINING', value: '100% AUTO', change: 'PostgreSQL' },
        ],
        liveDemoUrl: '#dashboard',
      },
    },
    {
      id: 'delta-resourcehub',
      flightNumber: 'DAL-870',
      callsign: 'RESOURCEHUB & CI/CD PIPELINE',
      route: {
        origin: 'VIEW_ONLY_HIERARCHY',
        destination: 'DELEGATED_AUTHORITY',
      },
      gate: 'ANGULAR 18',
      seat: '1B (FULL-STACK)',
      status: 'ON_TIME',
      specification: 'VERIFIED PRODUCTION',
      tagline: "Improved approval delegation features in Angular for ResourceHub (Delta's internal hiring platform), dark mode accessibility, and reduced Playwright test runs from 3-5 hours to 40 minutes.",
      techStack: ['Angular', 'TypeScript', 'REST APIs', 'Playwright', 'GitLab CI/CD'],
      caseStudy: {
        problem: "ResourceHub serves as Delta Air Lines' core enterprise hiring platform. Because every hiring workflow involves strict enterprise compliance and role-based permissions, rigorous end-to-end test automation is critical to prevent faulty deployments. However, running the 200+ Playwright test scenarios sequentially on a single runner took 3 to 5 hours, creating severe CI/CD pipeline gridlocks and stalling developer merge requests.",
        solution: "Improved approval delegation features in Angular to streamline hiring authority workflows, resolved form validation defects, and improved the CI/CD test automation suite by restructuring tests with parallel execution shards and optimized test fixtures in GitLab CI/CD.",
        architectureNotes: "Eliminated sequential runner bottlenecks, slashing total pipeline test duration from 3-5 hours down to 40 minutes (87% speedup) while eliminating flaky false-positive test cases.",
        metrics: [
          { label: 'CI/CD TEST SPEEDUP', value: '87% FASTER', change: '3-5h -> 40m' },
          { label: 'TEST EXECUTION', value: 'PARALLEL SHARDS', change: '200+ Tests' },
          { label: 'DELTA PLATFORM', value: 'RESOURCEHUB', change: 'Hiring & Talent' },
        ],
      },
    },
    {
      id: 'ml-accident-forecasting',
      flightNumber: 'ML-770',
      callsign: 'US ACCIDENT FORECASTING',
      route: {
        origin: '7.7M_HISTORICAL_DATA',
        destination: '365_DAY_PREDICTIONS',
      },
      gate: 'DEEP LEARNING',
      seat: '2A (PREDICTIVE)',
      status: 'BOARDING',
      specification: 'PROOF OF CONCEPT (POC)',
      tagline: 'Time-series forecasting model combining hand-tuned ARIMA(40,1,6) and 128-unit deep LSTM neural networks over 7.7 million traffic records.',
      techStack: ['Python', 'TensorFlow/Keras', 'statsmodels', 'Pandas', 'scikit-learn'],
      caseStudy: {
        problem: 'Forecasting nationwide traffic accident volume requires navigating extreme seasonal variances, weather fluctuations, and non-stationary timeseries data.',
        solution: 'Engineered daily weather, severity, and calendar features to train a 128-unit LSTM on 365-day sequences, benchmarked against an ADF-validated ARIMA(40,1,6) model evaluated with RMSE and SMAPE.',
        architectureNotes: 'Aggregated 7.7 million records (2016-2023) to generate 12-month confidence intervals and out-of-sample year-ahead forecast comparisons.',
        metrics: [
          { label: 'TRAINING DATASET', value: '7.7M', change: '2016-2023' },
          { label: 'LSTM ARCHITECTURE', value: '128-UNIT', change: '365-Day Window' },
          { label: 'ARIMA SPECIFICATION', value: '(40, 1, 6)', change: 'ADF Stationarity' },
        ],
        githubUrl: 'https://github.com/danvse/Machine-Learning-Accident-Prediction',
      },
    },
    {
      id: 'discord-phishing-defense',
      flightNumber: 'DIS-978',
      callsign: 'DISCORD PHISHING DEFENSE // DUAL-STREAM ML',
      route: {
        origin: 'MUTUAL_SERVERS_DM',
        destination: 'AUTO_QUARANTINE',
      },
      gate: 'XGBOOST / FASTAPI',
      seat: '3A (CYBERSECURITY)',
      status: 'BOARDING',
      specification: 'RESEARCH PROOF OF CONCEPT (POC)',
      tagline: 'Dual-stream ML architecture combining 3,000 TF-IDF n-grams and 17 structural heuristics to achieve 0.9780 F1 against adversarial Discord phishing with 1.2 ms CPU inference.',
      techStack: ['Python', 'FastAPI', 'XGBoost', 'scikit-learn', 'Angular', 'SHAP'],
      caseStudy: {
        problem: 'Modern cybercriminals hijack Discord accounts via token theft to blast phishing lures across mutual servers. Existing defenses (AutoMod regex) suffer a 37.2% F1 collapse under simple adversarial evasions such as Cyrillic homoglyphs and Markdown URL cloaking.',
        solution: 'Engineered a privacy-preserving dual-stream ML pipeline fusing 3,000 TF-IDF word n-grams (Stream A) with 17 payload and domain heuristics (Stream B: Levenshtein distance, Shannon entropy, homoglyph counters) into a minimax-hardened XGBoost classifier.',
        architectureNotes: 'Evaluated with 5-fold cross-validation (0.9780 F1 score) resisting adversarial evasion with 1.2 ms CPU inference latency and SHAP feature attribution.',
        metrics: [
          { label: 'ADVERSARIAL F1 SCORE', value: '0.9780', change: '+37.2% vs Regex' },
          { label: 'CPU INFERENCE TIME', value: '1.2 MS', change: 'Real-time' },
          { label: 'FUSED FEATURE VECTOR', value: '3,017 DIM', change: 'Stream A+B' },
        ],
        githubUrl: 'https://github.com/danvse/ML_DM_Discord_Phishing',
        liveDemoUrl: '#discord-demo',
      },
    },
  ]);

  protected toggleTheme() {
    this.theme.update(current => (current === 'dark' ? 'light' : 'dark'));
  }

  // Trigger airplane takeoff transition to the selected demo ('#dashboard' or '#discord-demo')
  protected launchDemo(demoTarget: string = '#dashboard') {
    this.pendingDemoTarget.set(demoTarget);
    this.isFadingOut.set(false);
    this.isTransitioning.set(true);
  }

  // Handle completion event emitted by the FlightLoader animation
  protected onTakeoffComplete() {
    this.isFadingOut.set(true);
    const demoTarget = this.pendingDemoTarget();
    const cleanTarget = demoTarget.startsWith('#') ? demoTarget.slice(1) : demoTarget;
    if (typeof window !== 'undefined') {
      window.location.hash = cleanTarget;
    }
    this.syncStateFromHash();

    // 300ms smooth fade-out before unmounting the overlay
    setTimeout(() => {
      this.isTransitioning.set(false);
      this.isFadingOut.set(false);
    }, 300);
  }

  protected closeDemo() {
    if (typeof window !== 'undefined' && window.location.hash) {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
    this.activeDemo.set(null);
  }
}
