export interface Metric {
  label: string;
  value: string;
  change?: string;
}

export interface ProjectFlight {
  id: string;
  flightNumber: string;
  callsign: string;
  route: {
    origin: string;
    destination: string;
  };
  gate: string;
  seat: string;
  status: 'ON_TIME' | 'BOARDING' | 'IN_FLIGHT';
  specification?: string;
  techStack: string[];
  tagline: string;

  caseStudy: {
    problem: string;
    solution: string;
    architectureNotes: string;
    metrics: Metric[];
    githubUrl?: string;
    liveDemoUrl?: string;
  };
}
