using System.Timers;
using FSUIPC;
using Microsoft.Extensions.Logging;
using LevantACARS.Models;

namespace LevantACARS.Services;

/// <summary>
/// Manages the FSUIPC/XPUIPC connection to the flight simulator.
/// Polls offsets asynchronously and publishes FlightData snapshots.
/// Thread-safe: all sim I/O runs on a dedicated timer; UI consumes via events.
/// </summary>
public sealed class FsuipcService : IDisposable
{
    private readonly ILogger<FsuipcService> _logger;
    private System.Timers.Timer? _pollTimer;
    private bool _isConnected;
    private int _retryCount;
    private long _lastRetryLog;

    // ── FSUIPC Offsets ──────────────────────────────────────────────────────
    private Offset<long>? _latOffset;
    private Offset<long>? _lonOffset;
    private Offset<long>? _altTrueLegacy;
    private Offset<short>? _pauseOffset;
    private Offset<double>? _altMsfs;
    private Offset<double>? _indAlt;
    private Offset<int>? _indAltGauge;
    private Offset<double>? _pressAlt;
    private Offset<double>? _magHdg;
    private Offset<int>? _magHdgLegacy;
    private Offset<double>? _pitchOffset;
    private Offset<double>? _bankOffset;
    private Offset<short>? _gForceOffset;
    private Offset<double>? _gsDouble;
    private Offset<int>? _gsLegacy;
    private Offset<double>? _iasDouble;
    private Offset<int>? _iasLegacy;
    private Offset<double>? _vsDouble;
    private Offset<int>? _vsLegacy;
    private Offset<short>? _onGroundOffset;
    private Offset<int>? _totalFuelOffset;
    private Offset<short>? _eng1Combustion;
    private Offset<short>? _eng2Combustion;
    private Offset<short>? _throttle1;
    private Offset<short>? _throttle2;
    private Offset<short>? _lightsOffset;
    private Offset<byte>? _stallOffset;
    private Offset<byte>? _overspeedOffset;
    private Offset<short>? _crashOffset;
    private Offset<int>? _flapsOffset;
    private Offset<int>? _gearOffset;
    private Offset<short>? _parkingBrakeOffset;
    private Offset<double>? _radioAltMsfs;
    private Offset<int>? _radioAltLegacy;
    private Offset<string>? _aircraftTitle;
    private Offset<float>? _acarsFuel;
    private Offset<float>? _acarsZfw;
    private Offset<float>? _acarsPayload;
    private Offset<short>? _simRateOffset;

    // ── Smoothing Buffers ───────────────────────────────────────────────────
    private readonly List<double> _vsBuffer = new(12);
    private readonly List<double> _gsBuffer = new(8);
    private readonly List<double> _altBuffer = new(12);
    private long _lastAltDiagLog;

    // ── Events ──────────────────────────────────────────────────────────────
    public event Action<FlightData>? OnFlightDataReceived;
    public event Action<bool>? OnConnectionChanged;

    public bool IsConnected => _isConnected;

    public FsuipcService(ILogger<FsuipcService> logger)
    {
        _logger = logger;
    }

    /// <summary>Register all FSUIPC offsets (called once).</summary>
    private void RegisterOffsets()
    {
        _latOffset       = new Offset<long>(0x0560);
        _lonOffset       = new Offset<long>(0x0568);
        _altTrueLegacy   = new Offset<long>(0x0570);
        _pauseOffset     = new Offset<short>(0x0264);
        _altMsfs         = new Offset<double>(0x2B40);
        _indAlt          = new Offset<double>(0x2B48);
        _indAltGauge     = new Offset<int>(0x3324);
        _pressAlt        = new Offset<double>(0x2B58);
        _magHdg          = new Offset<double>(0x2B00);
        _magHdgLegacy    = new Offset<int>(0x0580);
        _pitchOffset     = new Offset<double>(0x2B10);
        _bankOffset      = new Offset<double>(0x2B18);
        _gForceOffset    = new Offset<short>(0x11BA);
        _gsDouble        = new Offset<double>(0x2B50);
        _gsLegacy        = new Offset<int>(0x02B4);
        _iasDouble       = new Offset<double>(0x2B70);
        _iasLegacy       = new Offset<int>(0x02BC);
        _vsDouble        = new Offset<double>(0x2B60);
        _vsLegacy        = new Offset<int>(0x02C8);
        _onGroundOffset  = new Offset<short>(0x0366);
        _totalFuelOffset = new Offset<int>(0x0AF4);
        _eng1Combustion  = new Offset<short>(0x0894);
        _eng2Combustion  = new Offset<short>(0x092C);
        _throttle1       = new Offset<short>(0x088C);
        _throttle2       = new Offset<short>(0x0924);
        _lightsOffset    = new Offset<short>(0x0D0C);
        _stallOffset     = new Offset<byte>(0x036C);
        _overspeedOffset = new Offset<byte>(0x036D);
        _crashOffset     = new Offset<short>(0x0840);
        _flapsOffset     = new Offset<int>(0x0BE0);
        _gearOffset      = new Offset<int>(0x0BE8);
        _parkingBrakeOffset = new Offset<short>(0x0BC8);
        _radioAltMsfs    = new Offset<double>(0x2B68);
        _radioAltLegacy  = new Offset<int>(0x31E4);
        _simRateOffset   = new Offset<short>(0x0C1A);
        _aircraftTitle   = new Offset<string>(0x3D00, 256);
        _acarsFuel       = new Offset<float>(0x66C0);
        _acarsZfw        = new Offset<float>(0x66C4);
        _acarsPayload    = new Offset<float>(0x66C8);
    }

    /// <summary>Start the 200ms polling loop.</summary>
    public void StartPolling()
    {
        if (_pollTimer != null) return;

        RegisterOffsets();

        var interval = AppConfig.Current.PollIntervalMs;
        _pollTimer = new System.Timers.Timer(interval);
        _pollTimer.Elapsed += OnPollTick;
        _pollTimer.AutoReset = true;
        _pollTimer.Start();
    }

    /// <summary>Stop polling and disconnect.</summary>
    public void StopPolling()
    {
        _pollTimer?.Stop();
        _pollTimer?.Dispose();
        _pollTimer = null;

        if (_isConnected)
        {
            try { FSUIPCConnection.Close(); } catch { /* ignore */ }
            _isConnected = false;
            OnConnectionChanged?.Invoke(false);
        }
    }

    private void OnPollTick(object? sender, ElapsedEventArgs e)
    {
        try
        {
            if (!_isConnected)
            {
                FSUIPCConnection.Open();
                _isConnected = true;
                _retryCount = 0;
                _logger.LogInformation("[FSUIPC] Connected to simulator");
                OnConnectionChanged?.Invoke(true);
            }

            FSUIPCConnection.Process();
            var data = BuildFlightData();
            OnFlightDataReceived?.Invoke(data);
        }
        catch (FSUIPCException)
        {
            if (_isConnected)
            {
                _isConnected = false;
                _logger.LogWarning("[FSUIPC] Connection lost");
                OnConnectionChanged?.Invoke(false);
                try { FSUIPCConnection.Close(); } catch { /* ignore */ }
            }
            else
            {
                _retryCount++;
                var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                if (now - _lastRetryLog > 30000)
                {
                    _lastRetryLog = now;
                    _logger.LogDebug("[FSUIPC] Waiting for simulator... (attempt {Count})", _retryCount);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FSUIPC] Unexpected poll error");
        }
    }

    /// <summary>Convert raw FSUIPC offsets into an immutable FlightData record.</summary>
    private FlightData BuildFlightData()
    {
        // ── Latitude / Longitude (Int64 → decimal degrees) ──────────────
        var latRaw = _latOffset?.Value ?? 0L;
        var lonRaw = _lonOffset?.Value ?? 0L;
        double lat = (double)(latRaw * 90.0 / (10001750.0 * 65536.0 * 65536.0));
        double lon = (double)(lonRaw * 360.0 / (65536.0 * 65536.0 * 65536.0 * 65536.0));

        // ── Radio Altitude ──────────────────────────────────────────────
        var radioAltMsfsVal = _radioAltMsfs?.Value ?? 0.0;
        var radioAltLegacyVal = (_radioAltLegacy?.Value ?? 0) / 65536.0;
        int radioAlt = radioAltMsfsVal > 0.01 ? (int)radioAltMsfsVal :
                        radioAltLegacyVal > 0.01 ? (int)radioAltLegacyVal : -1;

        // ── Altitude (robust fallback chain for all aircraft types) ─────
        // MSFS WASM offsets return doubles already in feet
        var altInd = _indAlt?.Value ?? 0.0;
        var altPress = _pressAlt?.Value ?? 0.0;
        var altMsfs = _altMsfs?.Value ?? 0.0;
        // Legacy gauge offset 0x3324 is metres * 65536 → convert to feet
        var altGauge = ((_indAltGauge?.Value ?? 0) / 65536.0) * 3.28084;
        // Legacy true altitude offset 0x0570 is metres * 65536^2 (always populated by SimConnect)
        var altLegacy = ((_altTrueLegacy?.Value ?? 0L) / (65536.0 * 65536.0)) * 3.28084;

        // Try each altitude source in priority order — first non-trivial value wins
        // Some third-party aircraft (TFDI MD-11, DC-series, Concorde) don't populate WASM offsets
        double rawAlt = 0;
        string altSource = "none";
        if (Math.Abs(altInd) > 1)        { rawAlt = altInd;    altSource = "WASM-indicated"; }
        else if (Math.Abs(altPress) > 1) { rawAlt = altPress;  altSource = "WASM-pressure"; }
        else if (Math.Abs(altMsfs) > 1)  { rawAlt = altMsfs;   altSource = "WASM-true"; }
        else if (Math.Abs(altGauge) > 1) { rawAlt = altGauge;  altSource = "gauge-0x3324"; }
        else if (Math.Abs(altLegacy) > 1){ rawAlt = altLegacy;  altSource = "legacy-0x0570"; }

        // Cross-validation: if selected source is near zero but legacy disagrees, prefer legacy
        if (Math.Abs(rawAlt) < 1 && Math.Abs(altLegacy) > 1)
        {
            rawAlt = altLegacy;
            altSource = "legacy-0x0570(fallback)";
        }

        // Sanity bounds: if WASM offset returned garbage (common in X-Plane/XPUIPC),
        // fall back to legacy which is always reliable for both MSFS and X-Plane.
        // Lowest airport is ~-1400 ft (Dead Sea area); -1500 catches garbage without
        // blocking legitimate below-sea-level ops.
        if ((rawAlt < -1500 || rawAlt > 65000) && Math.Abs(altLegacy) >= 0)
        {
            rawAlt = altLegacy;
            altSource = "legacy-0x0570(sanity)";
        }

        // Periodic altitude diagnostic (every 30s) to help debug offset issues
        var diagNow = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (diagNow - _lastAltDiagLog > 30000)
        {
            _lastAltDiagLog = diagNow;
            _logger.LogInformation(
                "[FSUIPC-ALT] src={Src} val={Val:F1} | ind={Ind:F1} press={Press:F1} msfs={Msfs:F1} gauge={Gauge:F1} legacy={Legacy:F1}",
                altSource, rawAlt, altInd, altPress, altMsfs, altGauge, altLegacy);
        }

        // Snap + smooth
        double avgAlt = _altBuffer.Count > 0 ? _altBuffer.Average() : rawAlt;
        if (Math.Abs(rawAlt - avgAlt) > 200) _altBuffer.Clear();
        double finalAlt = Smooth(_altBuffer, rawAlt, 10);

        // Ground-level normalization: when on ground, clamp to 0 minimum
        // to prevent X-Plane pressure altitude producing -60 ft etc.
        bool onGroundEarly = (_onGroundOffset?.Value ?? 0) == 1;
        if (onGroundEarly && finalAlt < 0)
            finalAlt = Math.Max(0, finalAlt);

        // Round to nearest 10 ft for standard ACARS altitude reporting
        finalAlt = Math.Round(finalAlt / 10.0) * 10.0;

        // ── Heading ─────────────────────────────────────────────────────
        var heading = _magHdg?.Value ?? 0.0;
        if (Math.Abs(heading) < 0.01)
            heading = (_magHdgLegacy?.Value ?? 0) * 360.0 / (65536.0 * 65536.0);
        if (heading < 0) heading += 360;
        if (heading >= 360) heading -= 360;

        // ── Speeds (dual source: WASM doubles + legacy offsets) ────────
        var gsD = _gsDouble?.Value ?? 0.0;
        var gsL = (_gsLegacy?.Value ?? 0) / 65536.0 * 1.943844;
        double rawGs = gsD > 0.1 ? gsD : (gsL > 0.1 ? gsL : 0);
        double gs = Smooth(_gsBuffer, rawGs, 5);

        var iasD = _iasDouble?.Value ?? 0.0;
        var iasL = (_iasLegacy?.Value ?? 0) / 128.0;
        double ias = iasD > 0.1 ? iasD : (iasL > 0.1 ? iasL : 0);

        var vsD = _vsDouble?.Value ?? 0.0;
        var vsLegacyRaw = _vsLegacy?.Value ?? 0;
        // Legacy offset 0x02C8: FSUIPC = m/s * 256, XPUIPC may already be ft/min * 256
        // Convert assuming m/s * 256 first (standard FSUIPC)
        var vsL = vsLegacyRaw * 3.28084 * 60.0 / 256.0;
        // Sanity: if converted value is absurdly large (>10000 fpm), XPUIPC likely stores ft/min * 256 already
        if (Math.Abs(vsL) > 10000 && Math.Abs(vsLegacyRaw) > 0)
            vsL = vsLegacyRaw / 256.0;
        double rawVs = Math.Abs(vsD) > 1.0 ? vsD : (Math.Abs(vsL) > 1.0 ? vsL : 0);
        double vs = Smooth(_vsBuffer, rawVs, 5);

        // ── Other values ────────────────────────────────────────────────
        bool onGround = (_onGroundOffset?.Value ?? 0) == 1;
        double pitch = _pitchOffset?.Value ?? 0.0;
        double bank = _bankOffset?.Value ?? 0.0;
        double gForce = (_gForceOffset?.Value ?? 625) / 625.0;

        var throttle1 = _throttle1?.Value ?? 0;
        var throttle2 = _throttle2?.Value ?? 0;
        int throttle = (int)(Math.Max(throttle1, throttle2) / 16384.0 * 100);

        double stdFuel = (_totalFuelOffset?.Value ?? 0) / 256.0;
        double acarsFuelVal = _acarsFuel?.Value ?? 0f;
        double resolvedFuel = stdFuel < 1 && acarsFuelVal > 1 ? acarsFuelVal : stdFuel;

        string title = (_aircraftTitle?.Value ?? string.Empty).Replace("\0", "").Trim();

        return new FlightData
        {
            Latitude = lat,
            Longitude = lon,
            Altitude = (int)Math.Round(finalAlt),
            RadioAltitude = radioAlt >= 0 ? radioAlt : (int)Math.Round(finalAlt),
            Heading = (int)Math.Round(heading),
            GroundSpeed = (int)Math.Round(gs),
            Ias = (int)Math.Round(ias),
            VerticalSpeed = (int)Math.Round(vs),
            Pitch = pitch,
            Bank = bank,
            GForce = gForce,
            OnGround = onGround,
            TotalFuel = resolvedFuel,
            EnginesOn = (_eng1Combustion?.Value ?? 0) > 0 || (_eng2Combustion?.Value ?? 0) > 0,
            Lights = _lightsOffset?.Value ?? 0,
            StallWarning = (_stallOffset?.Value ?? 0) > 0,
            OverspeedWarning = (_overspeedOffset?.Value ?? 0) > 0,
            CrashDetected = (_crashOffset?.Value ?? 0) != 0,
            FlapsPosition = _flapsOffset?.Value ?? 0,
            GearPosition = _gearOffset?.Value ?? 0,
            ParkingBrake = (_parkingBrakeOffset?.Value ?? 0) != 0,
            Throttle = throttle,
            AircraftTitle = title,
            Timestamp = DateTime.UtcNow,
            AcarsFuel = acarsFuelVal,
            AcarsZfw = _acarsZfw?.Value ?? 0f,
            AcarsPayload = _acarsPayload?.Value ?? 0f,
            IsPaused = (_pauseOffset?.Value ?? 0) != 0,
            SimRate = (_simRateOffset?.Value ?? 256) / 256.0,
        };
    }

    /// <summary>Simple moving average smoother.</summary>
    private static double Smooth(List<double> buffer, double newVal, int size)
    {
        buffer.Insert(0, newVal);
        if (buffer.Count > size) buffer.RemoveAt(buffer.Count - 1);
        return buffer.Average();
    }

    public void Dispose()
    {
        StopPolling();
    }
}
