/** Touchdown point for map marker */
export interface TouchdownPoint {
  latitude: number;
  longitude: number;
  landingRate: number;
  groundSpeed: number;
}

/** Real-time telemetry snapshot from FSUIPC via SimBridge */
export interface TelemetryData {
  type: 'telemetry';
  latitude: number;
  longitude: number;
  altitude: number;
  radioAltitude: number;
  heading: number;
  groundSpeed: number;
  ias: number;
  verticalSpeed: number;
  pitch: number;
  bank: number;
  gForce: number;
  onGround: boolean;
  enginesOn: boolean;
  totalFuel: number;
  flapsPosition: number;
  gearPosition: number;
  parkingBrake: boolean;
  throttle: number;
  stallWarning: boolean;
  overspeedWarning: boolean;
  aircraftTitle: string;
  phase: string;
  fuelPercent: number;
  simRate: number;
  isPaused: boolean;
  totalPauseSeconds: number;
  isNonStandard: boolean;
  integrityScore: number;
  flightProgress: number;
  distanceFlownNm: number;
  plannedDistanceNm: number;
}

/** Auth / profile state pushed from C# */
export interface AuthState {
  type: 'auth';
  isLoggedIn: boolean;
  pilotName: string;
  pilotId: string;
  pilotRank: string;
  pilotAvatar: string;
  pilotHours: number;
  pilotXp: number;
  weightUnit?: 'lbs' | 'kgs';
  deviceCode: string;
  isLoggingIn: boolean;
}

/** Connection status pushed from C# */
export interface ConnectionState {
  type: 'connection';
  simConnected: boolean;
  apiConnected: boolean;
}

/** Flight state pushed from C# */
export interface OooiTimes {
  gateOut: string;
  wheelsOff: string;
  wheelsOn: string;
  gateIn: string;
}

export interface FlightState {
  type: 'flight';
  isActive: boolean;
  flightNumber: string;
  callsign: string;
  departureIcao: string;
  arrivalIcao: string;
  aircraftType: string;
  currentPhase: string;
  flightTime: string;
  comfortScore: number;
  exceedanceCount: number;
  distanceNm: number;
  fuelUsed: number;
  landingRate: number;
  progress: number;
  oooi: OooiTimes;
}

/** Score result after flight */
export interface ScoreResult {
  type: 'score';
  finalScore: number;
  landingGrade: string;
  landingDescription: string;
  xpEarned: number;
  rejected: boolean;
  rejectionReason: string;
}

/** Activity / exceedance log entry from C# bridge */
export interface LogEntry {
  type: 'activity' | 'exceedance';
  message: string;
  timestamp: string;
}

/** Structured log entry for UI display */
export interface UILogEntry {
  id: number;
  kind: 'success' | 'warning' | 'info';
  event: string;
  timestamp: string;
}

/** Weather data from sim or API */
export interface WeatherData {
  type: 'weather';
  station: string;
  temperature: string;
  wind: string;
  visibility: string;
  clouds: string;
  pressure: string;
  metar: string;
  /** QNH in hPa (millibars) — parsed from pressure or metar field */
  qnh?: number;
}

/** Active bid / flight plan pushed from C# */
export interface BidData {
  type: 'bid';
  callsign: string | null;
  flightNumber: string;
  departureIcao: string;
  arrivalIcao: string;
  departureName: string;
  arrivalName: string;
  aircraftType: string;
  aircraftRegistration: string;
  route: string;
  pax: number;
  cargo: number;
  createdAt: string;
  expiresAt: string;
}

/** Badge / Award definition from Crew Center */
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: 'badge' | 'award';
  createdAt: string;
}

/** Tour definition (admin-created) */
export interface TourDefinition {
  id: string;
  name: string;
  tourId: string;
  description: string;
  awardImageUrl: string;
  totalLegs: number;
  legs: TourLeg[];
  requireAdminApproval: boolean;
  createdAt: string;
}

/** Single leg in a tour */
export interface TourLeg {
  legNumber: number;
  departureIcao: string;
  arrivalIcao: string;
}

/** Pilot's progress on a tour */
export interface TourProgress {
  pilotId: string;
  tourId: string;
  tourName: string;
  legsCompleted: number;
  totalLegs: number;
  status: 'active' | 'completed';
  legs: LegReport[];
}

/** Individual leg report submitted by a pilot */
export interface LegReport {
  id: string;
  pilotId: string;
  pilotName: string;
  tourId: string;
  legNumber: number;
  departureIcao: string;
  arrivalIcao: string;
  pirepId: string;
  ivaoUrl: string;
  notes: string;
  aircraft: string;
  status: 'pending' | 'approved' | 'rejected';
  adminComment: string;
  submittedAt: string;
  reviewedAt: string;
}

/** Union of all bridge messages from C# → React */
export type BridgeMessage =
  | TelemetryData
  | AuthState
  | ConnectionState
  | FlightState
  | ScoreResult
  | LogEntry
  | WeatherData
  | BidData
  | { type: 'updateStatus'; status: string; message: string; version?: string; progress?: number }
  | (TouchdownPoint & { type: 'touchdown' });
