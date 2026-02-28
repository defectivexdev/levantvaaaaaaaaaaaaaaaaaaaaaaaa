using System.Collections.Concurrent;
using System.Timers;
using Microsoft.Extensions.Logging;
using LevantACARS.Models;

namespace LevantACARS.Services;

/// <summary>
/// Orchestrates the full flight lifecycle: start → live tracking → PIREP submission.
/// Coordinates FsuipcService, FlightStateMachine, ExceedanceProxy, ScoringEngine, and LevantApiClient.
/// Replaces the Electron flightService.ts + main.ts integration logic.
/// </summary>
public sealed class FlightManager : IDisposable
{
    private readonly ILogger<FlightManager> _logger;
    private readonly FsuipcService _fsuipc;
    private readonly FlightStateMachine _stateMachine;
    private readonly ExceedanceProxy _proxy;
    private readonly LevantApiClient _api;
    private readonly DiscordWebhookService _webhook;
    private readonly DiscordService _discord;
    private readonly RunwayDetector _runwayDetector;

    // ── Active flight state ─────────────────────────────────────────────────
    private string? _pilotId;
    private string? _callsign;
    private string? _flightNumber;
    private string? _departureIcao;
    private string? _arrivalIcao;
    private string? _route;
    private string? _aircraftType;
    private string? _aircraftRegistration;
    private int _pax;
    private int _cargo;
    private bool _flightActive;

    private readonly ConcurrentBag<Exceedance> _exceedanceBuffer = new();
    private readonly ConcurrentBag<TelemetryPoint> _telemetryBuffer = new();
    private readonly ConcurrentBag<Deduction> _deductions = new();
    private int _updateCounter;
    private DateTime _flightStartTime;
    private double _startFuel;
#pragma warning disable CS0169
    private double _startLat;
    private double _startLon;
#pragma warning restore CS0169
    private double _totalDistanceNm;
    private double _lastLat;
    private double _lastLon;
    private int _comfortScore = 100;
    private double _lastVerticalSpeed;
    private double _lastBank;
    private int _lastGroundSpeed;
    private double _lastFuel;
    private bool _lastEnginesOn;

    // OOOI
    private readonly OoiTimes _oooi = new();

    // Landing
    private double _landingRate;
    private double _landingGForce;
    private bool _crashed;

    // Webhook dedup flags — prevent duplicate Discord notifications per flight
    private bool _hasSentTakeoffWebhook;
    private bool _hasSentLandingWebhook;

    // Sim rate & pause tracking
    private DateTime? _pauseStartTime;
    private double _totalSecondsPaused;
    private bool _isNonStandard; // true if sim rate ever exceeded 1x during the flight
    private bool _wasPaused;

    // Flight progress
    private double _plannedDistanceNm;
    private double _arrivalLat;
    private double _arrivalLon;

    // Heartbeat
    private System.Timers.Timer? _heartbeatTimer;

    // ── Events (consumed by ViewModels) ─────────────────────────────────────
    public event Action<FlightData>? OnFlightDataUpdated;
    public event Action<FlightPhase, FlightPhase>? OnPhaseChanged;
    public event Action<List<Exceedance>>? OnExceedancesDetected;
    public event Action<ScoringEngine.ScoreResult>? OnFlightScored;
#pragma warning disable CS0067
    public event Action<ScoringEngine.RankCheckResult>? OnRankPromotion;
#pragma warning restore CS0067
    public event Action<bool>? OnConnectionChanged;
    public event Action<string>? OnFlightEvent;
    public event Action<double, double, double, int>? OnTouchdown; // lat, lon, landingRate, groundSpeed

    public bool IsFlightActive => _flightActive;
    public bool IsSimConnected => _fsuipc.IsConnected;
    public bool IsApiConnected => _api.IsConnected;
    public FlightPhase CurrentPhase => _stateMachine.CurrentPhase;
    public int ExceedanceCount => _exceedanceBuffer.Count;
    public int ComfortScore => _comfortScore;
    public double TotalDistanceNm => _totalDistanceNm;
    public double StartFuel => _startFuel;
    public double LandingRate => _landingRate;
    public double LandingGForce => _landingGForce;
    public OoiTimes Oooi => _oooi;

    public FlightManager(
        ILogger<FlightManager> logger,
        FsuipcService fsuipc,
        FlightStateMachine stateMachine,
        ExceedanceProxy proxy,
        LevantApiClient api,
        DiscordWebhookService webhook,
        DiscordService discord,
        RunwayDetector runwayDetector)
    {
        _logger = logger;
        _fsuipc = fsuipc;
        _stateMachine = stateMachine;
        _proxy = proxy;
        _api = api;
        _webhook = webhook;
        _discord = discord;
        _runwayDetector = runwayDetector;

        // Wire up events
        _fsuipc.OnFlightDataReceived += HandleFlightData;
        _fsuipc.OnConnectionChanged += connected =>
        {
            OnConnectionChanged?.Invoke(connected);
            // Sync Discord RPC with sim connection state
            try
            {
                if (connected && !_flightActive) _discord.SetConnected();
                else if (!connected) _discord.SetDisconnected();
            }
            catch { /* non-critical */ }
        };
        _stateMachine.OnPhaseChanged += HandlePhaseChanged;
    }

    /// <summary>Initialize — bootstrap API probe and start FSUIPC polling.</summary>
    public async Task InitializeAsync()
    {
        await _api.BootstrapAsync();
        _fsuipc.StartPolling();
    }

    // ─── Flight Lifecycle ───────────────────────────────────────────────────

    public sealed record StartFlightParams(
        string PilotId,
        string FlightNumber,
        string Callsign,
        string DepartureIcao,
        string ArrivalIcao,
        string Route,
        string AircraftType,
        string AircraftRegistration,
        int Pax,
        int Cargo
    );

    /// <summary>Start a new flight — resets state and begins tracking.</summary>
    public async Task<bool> StartFlightAsync(StartFlightParams p)
    {
        if (_flightActive)
        {
            _logger.LogWarning("[FlightManager] Flight already active, cancelling previous");
            await CancelFlightAsync("Superseded by new flight");
        }

        // Validate: Cannot start flight if engines are already running (anti-cheat)
        if (_lastEnginesOn)
        {
            _logger.LogWarning("[FlightManager] Cannot start flight - engines are already running. Turn off engines first.");
            OnFlightEvent?.Invoke("Cannot start flight: Engines must be OFF before starting flight");
            return false;
        }

        _pilotId = p.PilotId;
        _flightNumber = p.FlightNumber;
        _callsign = p.Callsign;
        _departureIcao = p.DepartureIcao;
        _arrivalIcao = p.ArrivalIcao;
        _route = p.Route;
        _aircraftType = p.AircraftType;
        _aircraftRegistration = p.AircraftRegistration;
        _pax = p.Pax;
        _cargo = p.Cargo;

        _exceedanceBuffer.Clear();
        _telemetryBuffer.Clear();
        _deductions.Clear();
        _updateCounter = 0;
        _flightStartTime = DateTime.UtcNow;
        _startFuel = 0;
        _lastFuel = 0;
        _totalDistanceNm = 0;
        _lastLat = 0;
        _lastLon = 0;
        _comfortScore = 100;
        _landingRate = 0;
        _landingGForce = 1.0;
        _crashed = false;
        _hasSentTakeoffWebhook = false;
        _hasSentLandingWebhook = false;
        _pauseStartTime = null;
        _totalSecondsPaused = 0;
        _isNonStandard = false;
        _wasPaused = false;
        _oooi.Out = DateTime.UtcNow;
        _oooi.Off = null;
        _oooi.On = null;
        _oooi.In = null;

        _stateMachine.Reset();
        _proxy.ResetPacketCount();
        _flightActive = true;

        _plannedDistanceNm = 0;
        _arrivalLat = 0;
        _arrivalLon = 0;

        // Preload runway GPS data for departure & arrival airports
        _ = _runwayDetector.PreloadAsync(p.DepartureIcao, p.ArrivalIcao)
            .ContinueWith(t =>
            {
                if (t.IsFaulted)
                {
                    _logger.LogWarning(t.Exception, "[FlightManager] Runway data preload failed");
                    return;
                }
                // Calculate planned distance from airport coordinates
                var depCoords = _runwayDetector.GetAirportCoordinates(p.DepartureIcao);
                var arrCoords = _runwayDetector.GetAirportCoordinates(p.ArrivalIcao);
                if (depCoords != null && arrCoords != null)
                {
                    _arrivalLat = arrCoords.Value.Lat;
                    _arrivalLon = arrCoords.Value.Lon;
                    _plannedDistanceNm = HaversineNm(depCoords.Value.Lat, depCoords.Value.Lon, _arrivalLat, _arrivalLon);
                }
            });

        // Notify API (fire-and-forget) - API handles Discord notifications
        _ = _api.NotifyFlightStartAsync(p.PilotId, p.FlightNumber, p.Callsign, p.DepartureIcao, p.ArrivalIcao, p.AircraftType);

        // Discord Rich Presence — show active flight
        try { _discord.SetFlightActive(p.FlightNumber, p.DepartureIcao, p.ArrivalIcao, FlightPhase.Preflight); }
        catch { /* non-critical */ }

        // Start heartbeat
        StartHeartbeat();

        _logger.LogInformation("[FlightManager] Flight started: {Flight} ({Dep}→{Arr}), Distance: {Dist:F1}nm", 
            p.FlightNumber, p.DepartureIcao, p.ArrivalIcao, _plannedDistanceNm);
        OnFlightEvent?.Invoke($"Flight {p.FlightNumber} started: {p.DepartureIcao} → {p.ArrivalIcao}");

        return true;
    }

    /// <summary>Cancel the active flight.</summary>
    public async Task CancelFlightAsync(string reason = "Cancelled by pilot")
    {
        if (!_flightActive) return;
        _flightActive = false;
        StopHeartbeat();

        if (_pilotId != null)
            await _api.NotifyFlightEndAsync(_pilotId, "cancelled");

        // Discord Rich Presence — back to connected/idle
        try { _discord.SetConnected(); }
        catch { /* non-critical */ }

        _logger.LogInformation("[FlightManager] Flight cancelled: {Reason}", reason);
        OnFlightEvent?.Invoke($"Flight cancelled: {reason}");
    }

    // ─── Core Telemetry Handler ─────────────────────────────────────────────

    private void HandleFlightData(FlightData data)
    {
        // Always evaluate state machine so dashboard shows correct phase
        var phase = _stateMachine.Evaluate(data);
        var updatedData = data with { Phase = phase };

        if (!_flightActive)
        {
            OnFlightDataUpdated?.Invoke(updatedData);
            return;
        }

        _updateCounter++;

        // Record start fuel on first valid data
        if (_startFuel == 0 && data.TotalFuel > 0)
            _startFuel = data.TotalFuel;

        // ── Exceedance Proxy (uses updatedData with correct phase) ─────
        var exceedances = _proxy.Evaluate(updatedData, _aircraftType ?? "");
        if (exceedances.Count > 0)
        {
            foreach (var exc in exceedances) _exceedanceBuffer.Add(exc);
            OnExceedancesDetected?.Invoke(exceedances);
        }

        // ── Distance Tracking ───────────────────────────────────────────
        if (_lastLat != 0 && _lastLon != 0 && data.Latitude != 0)
        {
            _totalDistanceNm += HaversineNm(_lastLat, _lastLon, data.Latitude, data.Longitude);
        }
        _lastLat = data.Latitude;
        _lastLon = data.Longitude;
        _lastGroundSpeed = data.GroundSpeed;
        if (data.TotalFuel > 0) _lastFuel = data.TotalFuel;
        _lastEnginesOn = data.EnginesOn;

        // ── Sim Rate & Pause Tracking ────────────────────────────────
        if (data.SimRate > 1.01) _isNonStandard = true;

        if (data.IsPaused && !_wasPaused)
        {
            _pauseStartTime = DateTime.UtcNow;
        }
        else if (!data.IsPaused && _wasPaused && _pauseStartTime != null)
        {
            _totalSecondsPaused += (DateTime.UtcNow - _pauseStartTime.Value).TotalSeconds;
            _pauseStartTime = null;
        }
        _wasPaused = data.IsPaused;

        // ── Comfort Score ───────────────────────────────────────────────
        CalculateComfort(data);

        // ── Landing Detection ───────────────────────────────────────────
        if (phase == FlightPhase.Landing || phase == FlightPhase.Landed)
        {
            if (data.OnGround && Math.Abs(data.VerticalSpeed) > Math.Abs(_landingRate))
            {
                _landingRate = -Math.Abs(data.VerticalSpeed);
                _landingGForce = data.GForce;
            }
        }

        // ── Discord RPC live update (every 20th tick ≈ every 10s) ────────
        if (_updateCounter % 20 == 0)
        {
            try { _discord.UpdateFlightDetails(_flightNumber ?? "", _departureIcao ?? "", _arrivalIcao ?? "", phase, data.Altitude, data.GroundSpeed); }
            catch { /* non-critical */ }
        }

        if (data.CrashDetected) _crashed = true;

        // ── Buffer telemetry (every Nth update, default 4) ────────────
        var telemetryInterval = AppConfig.Current.TelemetryBufferInterval;
        if (_updateCounter % telemetryInterval == 0)
        {
            _telemetryBuffer.Add(new TelemetryPoint(
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                data.Latitude, data.Longitude, data.Altitude,
                data.GroundSpeed, data.Heading, data.VerticalSpeed,
                data.Ias, phase.ToString()));
        }

        // ── Send position update to API (every Nth update, default 5 ≈ 1Hz)
        var posInterval = AppConfig.Current.PositionUpdateInterval;
        if (_updateCounter % posInterval == 0 && _pilotId != null)
        {
            _ = _api.SendPositionUpdateAsync(new PositionUpdate
            {
                PilotId = _pilotId,
                Callsign = _callsign ?? "",
                Latitude = data.Latitude,
                Longitude = data.Longitude,
                Altitude = data.Altitude,
                Heading = data.Heading,
                GroundSpeed = data.GroundSpeed,
                Status = phase.ToString(),
                Phase = phase.ToString(),
                Fuel = data.TotalFuel,
                Engines = data.EnginesOn ? 1 : 0,
                Lights = data.Lights,
                Ias = data.Ias,
                Vs = data.VerticalSpeed,
                Pitch = data.Pitch,
                Bank = data.Bank,
                GForce = data.GForce,
                ComfortScore = _comfortScore,
            }).ContinueWith(t => _logger.LogError(t.Exception, "[FlightManager] API position-update failed"),
                TaskContinuationOptions.OnlyOnFaulted);
        }

        OnFlightDataUpdated?.Invoke(updatedData);

        // ── Auto-submit on Shutdown phase ───────────────────────────────
        if (phase == FlightPhase.Shutdown)
        {
            _ = SubmitFlightAsync();
        }
    }

    // ─── Phase Change Handler ───────────────────────────────────────────────

    private void HandlePhaseChanged(FlightPhase oldPhase, FlightPhase newPhase)
    {
        // Record OOOI times
        switch (newPhase)
        {
            case FlightPhase.TaxiOut:
                _oooi.Out ??= DateTime.UtcNow;
                break;
            case FlightPhase.Takeoff:
                _oooi.Off = DateTime.UtcNow;
                break;
            case FlightPhase.Landing:
            case FlightPhase.Landed:
                _oooi.On ??= DateTime.UtcNow;
                break;
            case FlightPhase.Arrived:
            case FlightPhase.Shutdown:
                _oooi.In ??= DateTime.UtcNow;
                break;
        }

        OnPhaseChanged?.Invoke(oldPhase, newPhase);

        // Discord Rich Presence — update phase
        try { _discord.UpdatePhase(newPhase); }
        catch { /* non-critical */ }

        // Discord webhook notifications for takeoff and landing (fire-once per flight)
        if (newPhase == FlightPhase.Takeoff && _flightActive && !_hasSentTakeoffWebhook)
        {
            _hasSentTakeoffWebhook = true;
            _ = _webhook.NotifyTakeoffAsync(
                _pilotId ?? "Unknown", _flightNumber ?? "",
                _departureIcao ?? "", _arrivalIcao ?? "");
        }
        else if (newPhase == FlightPhase.Landed && _flightActive && !_hasSentLandingWebhook)
        {
            _hasSentLandingWebhook = true;
            _ = _webhook.NotifyLandingAsync(
                _pilotId ?? "Unknown", _flightNumber ?? "",
                _departureIcao ?? "", _arrivalIcao ?? "", _landingRate);

            // Fire touchdown event with coordinates for map marker
            OnTouchdown?.Invoke(_lastLat, _lastLon, _landingRate, _lastGroundSpeed);
        }
    }

    // ─── Flight Submission (PIREP) ──────────────────────────────────────────

    public async Task<ScoringEngine.ScoreResult?> SubmitFlightAsync()
    {
        if (!_flightActive) return null;

        _flightActive = false;
        StopHeartbeat();
        await Task.CompletedTask; // Ensure async path for PIREP submission below

        double flightTimeMinutes = (DateTime.UtcNow - _flightStartTime).TotalMinutes;
        double fuelUsed = Math.Max(0, _startFuel - (_lastFuel > 0 ? _lastFuel : 0));

        // Calculate score
        var exceedances = _exceedanceBuffer.ToArray();
        var score = ScoringEngine.CalculateFlightScore(
            exceedances, _landingRate, _landingGForce, flightTimeMinutes, _crashed);

        _logger.LogInformation("[FlightManager] Flight submitted: Score={Score}%, XP={Xp}, Grade={Grade}, {Status}",
            score.FinalScore, score.XpEarned, score.LandingGrade.Grade,
            score.Rejected ? "REJECTED" : "ACCEPTED");

        OnFlightScored?.Invoke(score);

        // Rank promotion check (basic — server handles canonical promotion)
        // This is just for local UI feedback
        // In a real scenario, we'd get currentXp/currentRank from the API or local storage

        // Build flight log with deductions and exceedances
        var flightLog = new
        {
            deductions = _deductions.Select(d => new { d.Reason, d.Penalty, Timestamp = d.Timestamp.ToString("o") }).ToArray(),
            exceedances = exceedances.Select(e => new { 
                Type = e.Type.ToString(), 
                e.Value, 
                e.Limit, 
                Severity = e.Severity.ToString(),
                Phase = e.Phase.ToString(),
                e.Description,
                Timestamp = e.Timestamp.ToString("o")
            }).ToArray(),
            maxGForce = exceedances.Any() ? exceedances.Max(e => e.Type == ExceedanceType.GForce ? e.Value : 0) : _landingGForce,
        };

        // Submit PIREP to API with complete telemetry and log data
        var pirep = new PirepData
        {
            PilotId = _pilotId ?? "",
            FlightNumber = _flightNumber ?? "",
            Callsign = _callsign ?? "",
            DepartureIcao = _departureIcao ?? "",
            ArrivalIcao = _arrivalIcao ?? "",
            Route = _route ?? "",
            AircraftType = _aircraftType ?? "",
            AircraftRegistration = _aircraftRegistration ?? "",
            LandingRate = _landingRate,
            GForce = _landingGForce,
            FuelUsed = fuelUsed,
            DistanceNm = _totalDistanceNm,
            FlightTimeMinutes = flightTimeMinutes,
            Score = score.FinalScore,
            LandingGradeStr = score.LandingGrade.Grade.ToString(),
            XpEarned = score.XpEarned,
            ComfortScore = _comfortScore,
            Pax = _pax,
            Cargo = _cargo,
            Status = score.Rejected ? "rejected" : "completed",
            ExceedanceCount = exceedances.Length,
            AlternateIcao = null,
            Telemetry = _telemetryBuffer.OrderBy(t => t.Time).ToArray(),
            Log = flightLog,
            AirframeDamage = null,
            Comments = null,
        };

        // Finalize pause tracking if sim is still paused at submission
        if (_pauseStartTime != null)
        {
            _totalSecondsPaused += (DateTime.UtcNow - _pauseStartTime.Value).TotalSeconds;
            _pauseStartTime = null;
        }

        // Submit PIREP and notify API - API handles Discord notifications
        _ = _api.SubmitPirepAsync(pirep);
        _ = _api.NotifyFlightEndAsync(_pilotId ?? "", score.Rejected ? "rejected" : "completed", _callsign ?? "");

        OnFlightEvent?.Invoke($"PIREP submitted — Score: {score.FinalScore}%, Grade: {score.LandingGrade.Grade}");

        // Discord Rich Presence — show completed briefly, then back to connected
        try
        {
            _discord.SetFlightCompleted(_flightNumber ?? "", score.FinalScore);
            // After 30 seconds, go back to connected/idle
            _ = Task.Delay(30000).ContinueWith(_ => { try { _discord.SetConnected(); } catch { } });
        }
        catch { /* non-critical */ }

        return score;
    }

    // ─── Comfort Score ──────────────────────────────────────────────────────

    private void CalculateComfort(FlightData data)
    {
        // V/S jerk penalty
        double vsJerk = Math.Abs(data.VerticalSpeed - _lastVerticalSpeed);
        if (vsJerk > 500 && !data.OnGround)
            _comfortScore = Math.Max(0, _comfortScore - 1);

        // Bank angle penalty
        if (Math.Abs(data.Bank) > 30 && !data.OnGround)
            _comfortScore = Math.Max(0, _comfortScore - 1);

        // G-force penalty
        if (data.GForce > 1.5 || data.GForce < 0.5)
            _comfortScore = Math.Max(0, _comfortScore - 1);

        _lastVerticalSpeed = data.VerticalSpeed;
        _lastBank = data.Bank;
    }

    // ─── Heartbeat ──────────────────────────────────────────────────────────

    private void StartHeartbeat()
    {
        StopHeartbeat();
        var hbInterval = AppConfig.Current.HeartbeatIntervalMs;
        _heartbeatTimer = new System.Timers.Timer(hbInterval);
        _heartbeatTimer.Elapsed += async (_, _) =>
        {
            if (_pilotId != null)
                await _api.PingAsync(_pilotId, _callsign ?? "");
        };
        _heartbeatTimer.Start();
    }

    private void StopHeartbeat()
    {
        _heartbeatTimer?.Stop();
        _heartbeatTimer?.Dispose();
        _heartbeatTimer = null;
    }

    // ─── Utilities ──────────────────────────────────────────────────────────

    private static double HaversineNm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 3440.065; // Earth radius in nautical miles
        double dLat = (lat2 - lat1) * Math.PI / 180;
        double dLon = (lon2 - lon1) * Math.PI / 180;
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                   Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    // ─── Integrity Score ───────────────────────────────────────────────────

    private int CalculateIntegrityScore()
    {
        int score = 100;

        // Sim rate penalty — 50% drop for using time acceleration
        if (_isNonStandard) score -= 50;

        // Pause penalty — 1% per 5 minutes paused, capped at 20%
        int pausePenalties = (int)(TotalSecondsPaused / 300);
        score -= Math.Min(20, pausePenalties);

        // Exceedance penalty — 2% per exceedance, capped at 30%
        int excCount = _exceedanceBuffer.Count;
        score -= Math.Min(30, excCount * 2);

        return Math.Max(0, score);
    }

    // ─── Public accessors for SimBridge ───────────────────────────────────

    public double TotalSecondsPaused =>
        _pauseStartTime != null
            ? _totalSecondsPaused + (DateTime.UtcNow - _pauseStartTime.Value).TotalSeconds
            : _totalSecondsPaused;

    public bool IsNonStandard => _isNonStandard;

    public int IntegrityScore => _flightActive ? CalculateIntegrityScore() : 100;

    public double FlightProgress
    {
        get
        {
            if (!_flightActive || _plannedDistanceNm < 1) return 0;
            // Use remaining distance to arrival for more accurate progress
            if (_arrivalLat != 0 && _arrivalLon != 0 && _lastLat != 0 && _lastLon != 0)
            {
                double remaining = HaversineNm(_lastLat, _lastLon, _arrivalLat, _arrivalLon);
                return Math.Clamp(1.0 - (remaining / _plannedDistanceNm), 0, 1);
            }
            return Math.Clamp(_totalDistanceNm / _plannedDistanceNm, 0, 1);
        }
    }

    public double PlannedDistanceNm => _plannedDistanceNm;
    public double DistanceFlownNm => _totalDistanceNm;

    public void Dispose()
    {
        StopHeartbeat();
        _fsuipc.OnFlightDataReceived -= HandleFlightData;
    }
}
