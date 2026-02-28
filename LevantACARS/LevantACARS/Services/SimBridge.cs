using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Timers;
using System.Windows;
using Microsoft.Extensions.Logging;
using Microsoft.Web.WebView2.Core;
using LevantACARS.Models;
using LevantACARS.ViewModels;
using Timer = System.Timers.Timer;

namespace LevantACARS.Services;

/// <summary>
/// COM-visible bridge exposed to React via CoreWebView2.AddHostObjectToScript.
/// Also streams telemetry + state via PostWebMessageAsJson at 500ms intervals.
/// </summary>
[ClassInterface(ClassInterfaceType.AutoDual)]
[ComVisible(true)]
public class SimBridge : IDisposable
{
    private readonly FlightManager _flightManager;
    private readonly AuthService _authService;
    private readonly LevantApiClient _api;
    private readonly DashboardViewModel _dashboardVm;
    private readonly FlightViewModel _flightVm;
    private readonly MainViewModel _mainVm;
    private readonly ILogger<SimBridge> _logger;

    private CoreWebView2? _webView;
    private Timer? _telemetryTimer;
    private bool _disposed;

    // JSON options — camelCase for JS consumption
    private static readonly JsonSerializerOptions _jsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public SimBridge(
        FlightManager flightManager,
        AuthService authService,
        LevantApiClient api,
        ViewModels.DashboardViewModel dashboardVm,
        ViewModels.FlightViewModel flightVm,
        ViewModels.MainViewModel mainVm,
        ILogger<SimBridge> logger)
    {
        _flightManager = flightManager;
        _authService = authService;
        _api = api;
        _dashboardVm = dashboardVm;
        _flightVm = flightVm;
        _mainVm = mainVm;
        _logger = logger;
    }

    /// <summary>Attach to a live WebView2 and start streaming.</summary>
    public void Attach(CoreWebView2 webView)
    {
        _webView = webView;

        // Register this object so JS can call window.chrome.webview.hostObjects.simBridge.*
        _webView.AddHostObjectToScript("simBridge", this);

        // Listen for messages from React → C#
        _webView.WebMessageReceived += OnWebMessage;

        // Subscribe to ViewModel changes to push state
        _mainVm.PropertyChanged += (_, e) =>
        {
            PushAuthState();
            // Auto-fetch bid when pilot logs in
            if (e.PropertyName == nameof(_mainVm.IsLoggedIn) && _mainVm.IsLoggedIn && !string.IsNullOrEmpty(_mainVm.PilotId))
                _ = FetchAndPushBidAsync(_mainVm.PilotId);
        };
        _flightVm.PropertyChanged += (_, _) => PushFlightState();
        _flightVm.ActivityLog.CollectionChanged += (_, _) => PushLatestLog("activity", _flightVm.ActivityLog);
        _flightVm.ExceedanceLog.CollectionChanged += (_, _) => PushLatestLog("exceedance", _flightVm.ExceedanceLog);

        // Start 500ms telemetry streaming
        _telemetryTimer = new Timer(500);
        _telemetryTimer.Elapsed += OnTelemetryTick;
        _telemetryTimer.AutoReset = true;
        _telemetryTimer.Start();

        // Push initial state once React has actually loaded
        _webView.NavigationCompleted += (_, _) =>
        {
            // Small delay to let React mount and attach its message listener
            Task.Delay(400).ContinueWith(_ =>
            {
                PushAuthState();
                PushConnectionState();
                PushFlightState();
                // Auto-fetch bid after navigation if logged in
                if (_mainVm.IsLoggedIn && !string.IsNullOrEmpty(_mainVm.PilotId))
                    _ = FetchAndPushBidAsync(_mainVm.PilotId);
            });
        };

        _flightManager.OnConnectionChanged += _ => PushConnectionState();
        _flightManager.OnTouchdown += (lat, lon, fpm, gs) => PostMessage(new
        {
            type = "touchdown",
            latitude = lat,
            longitude = lon,
            landingRate = Math.Round(fpm, 0),
            groundSpeed = gs,
        });

        _logger.LogInformation("[SimBridge] Attached to WebView2 — streaming at 500ms");
    }

    // ── COM-visible methods (callable from JS) ────────────────────────

    public void Login()
    {
        Application.Current.Dispatcher.Invoke(() => _ = _mainVm.LoginCommand.ExecuteAsync(null));
    }

    public void Logout()
    {
        Application.Current.Dispatcher.Invoke(() => _mainVm.LogoutCommand.Execute(null));
    }

    public void StartFlight(string json)
    {
        // React passes dispatch params as JSON — parse and start
        Application.Current.Dispatcher.Invoke(async () =>
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                _flightVm.PilotId = SafeGetString(root, "pilotId");
                _flightVm.FlightNumber = SafeGetString(root, "flightNumber");
                _flightVm.Callsign = SafeGetString(root, "callsign");
                _flightVm.DepartureIcao = SafeGetString(root, "departureIcao");
                _flightVm.ArrivalIcao = SafeGetString(root, "arrivalIcao");
                _flightVm.Route = SafeGetString(root, "route");
                _flightVm.AircraftType = SafeGetString(root, "aircraftType");
                _flightVm.AircraftRegistration = SafeGetString(root, "aircraftRegistration");
                _flightVm.Pax = SafeGetInt(root, "pax");
                _flightVm.Cargo = SafeGetInt(root, "cargo");
                await _flightVm.StartFlightCommand.ExecuteAsync(null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SimBridge] StartFlight parse error");
            }
        });
    }

    public void EndFlight()
    {
        Application.Current.Dispatcher.Invoke(async () =>
        {
            await _flightVm.SubmitFlightCommand.ExecuteAsync(null);
        });
    }

    public void CancelFlight()
    {
        Application.Current.Dispatcher.Invoke(async () =>
        {
            await _flightVm.CancelFlightCommand.ExecuteAsync(null);
        });
    }

    public string GetVersion() => "2.0.0";

    public void MinimizeWindow()
    {
        Application.Current.Dispatcher.Invoke(() =>
            Application.Current.MainWindow!.WindowState = WindowState.Minimized);
    }

    public void MaximizeWindow()
    {
        Application.Current.Dispatcher.Invoke(() =>
        {
            var w = Application.Current.MainWindow!;
            w.WindowState = w.WindowState == WindowState.Maximized
                ? WindowState.Normal
                : WindowState.Maximized;
        });
    }

    public void CloseWindow()
    {
        Application.Current.Dispatcher.Invoke(() => Application.Current.MainWindow!.Close());
    }

    private void CheckForUpdate()
    {
        _ = Task.Run(async () =>
        {
            try
            {
                _logger.LogInformation("[SimBridge] Checking for updates...");
                PostMessage(new { type = "updateStatus", status = "checking", message = "Checking for updates..." });

                var mgr = new Velopack.UpdateManager("https://levantva.com/releases");

                // Guard: if app was not installed via Velopack, skip update
                if (!mgr.IsInstalled)
                {
                    _logger.LogWarning("[SimBridge] App is not installed via Velopack — skipping update");
                    PostMessage(new { type = "updateStatus", status = "error", message = "Auto-update unavailable in this build." });
                    return;
                }

                var info = await mgr.CheckForUpdatesAsync();

                if (info != null)
                {
                    var ver = info.TargetFullRelease.Version.ToString();
                    _logger.LogInformation("[SimBridge] Update available: {Ver}", ver);
                    PostMessage(new { type = "updateStatus", status = "downloading", version = ver, progress = 0, message = $"Downloading v{ver}..." });

                    // Download with progress callback
                    await mgr.DownloadUpdatesAsync(info, progress =>
                    {
                        PostMessage(new { type = "updateStatus", status = "downloading", version = ver, progress, message = $"Downloading v{ver}... {progress}%" });
                    });

                    _logger.LogInformation("[SimBridge] Update downloaded, applying and restarting...");
                    PostMessage(new { type = "updateStatus", status = "installing", version = ver, progress = 100, message = $"Installing v{ver}... Restarting." });

                    // Small delay so the user sees the "Installing" message
                    await Task.Delay(1500);

                    // Apply update and restart the application
                    mgr.ApplyUpdatesAndRestart(info);
                }
                else
                {
                    _logger.LogInformation("[SimBridge] No updates available");
                    PostMessage(new { type = "updateStatus", status = "upToDate", message = "You are running the latest version." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[SimBridge] Update check failed");
                PostMessage(new { type = "updateStatus", status = "error", message = "Update check failed. Check your connection." });
            }
        });
    }

    // ── Telemetry streaming ───────────────────────────────────────────

    private void OnTelemetryTick(object? sender, ElapsedEventArgs e)
    {
        if (_webView == null) return;

        try
        {
            var payload = new
            {
                type = "telemetry",
                latitude = _dashboardVm.Latitude,
                longitude = _dashboardVm.Longitude,
                altitude = _dashboardVm.Altitude,
                radioAltitude = _dashboardVm.RadioAltitude,
                heading = _dashboardVm.Heading,
                groundSpeed = _dashboardVm.GroundSpeed,
                ias = _dashboardVm.Ias,
                verticalSpeed = _dashboardVm.VerticalSpeed,
                pitch = Math.Round(_dashboardVm.Pitch, 1),
                bank = Math.Round(_dashboardVm.Bank, 1),
                gForce = _dashboardVm.GForce,
                onGround = _dashboardVm.OnGround,
                enginesOn = _dashboardVm.EnginesOn,
                totalFuel = Math.Round(_dashboardVm.TotalFuel, 1),
                flapsPosition = _dashboardVm.FlapsPosition,
                gearPosition = _dashboardVm.GearPosition,
                parkingBrake = _dashboardVm.ParkingBrake,
                throttle = _dashboardVm.Throttle,
                stallWarning = _dashboardVm.StallWarning,
                overspeedWarning = _dashboardVm.OverspeedWarning,
                aircraftTitle = _dashboardVm.AircraftTitle,
                phase = _dashboardVm.Phase,
                fuelPercent = 0,
                simRate = Math.Round(_dashboardVm.SimRate, 2),
                isPaused = _dashboardVm.IsPaused,
                totalPauseSeconds = Math.Round(_flightManager.TotalSecondsPaused, 0),
                isNonStandard = _flightManager.IsNonStandard,
                integrityScore = _flightManager.IntegrityScore,
                flightProgress = Math.Round(_flightManager.FlightProgress, 4),
                distanceFlownNm = Math.Round(_flightManager.DistanceFlownNm, 1),
                plannedDistanceNm = Math.Round(_flightManager.PlannedDistanceNm, 1)
            };

            PostMessage(payload);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[SimBridge] Telemetry tick error");
        }
    }

    private async Task FetchAndPushBidAsync(string pilotId)
    {
        if (string.IsNullOrEmpty(pilotId)) return;
        try
        {
            var bid = await _api.FetchBidAsync(pilotId);
            if (bid.HasValue)
            {
                var b = bid.Value;
                var bidData = new
                {
                    callsign = GetJsonString(b, "callsign"),
                    flightNumber = GetJsonString(b, "flight_number") is { Length: > 0 } fn ? fn : GetJsonString(b, "callsign"),
                    departureIcao = GetJsonString(b, "departure_icao"),
                    arrivalIcao = GetJsonString(b, "arrival_icao"),
                    departureName = GetJsonString(b, "departure_name"),
                    arrivalName = GetJsonString(b, "arrival_name"),
                    aircraftType = GetJsonString(b, "aircraft_type"),
                    aircraftRegistration = GetJsonString(b, "aircraft_registration"),
                    route = GetJsonString(b, "planned_route"),
                    pax = GetJsonInt(b, "pax"),
                    cargo = GetJsonInt(b, "cargo"),
                    createdAt = GetJsonString(b, "created_at"),
                    expiresAt = GetJsonString(b, "expires_at"),
                };
                // Push to global state (for auto-startup flows)
                PostMessage(new { type = "bid", bidData.callsign, bidData.flightNumber, bidData.departureIcao, bidData.arrivalIcao, bidData.departureName, bidData.arrivalName, bidData.aircraftType, bidData.aircraftRegistration, bidData.route, bidData.pax, bidData.cargo, bidData.createdAt, bidData.expiresAt });
                // Push bidResult for Promise-based fetchActiveBid
                PostMessage(new { type = "bidResult", success = true, bid = bidData });
                _logger.LogInformation("[SimBridge] Pushed bid to React: {Cs}", bidData.callsign);
            }
            else
            {
                PostMessage(new { type = "bid", callsign = (string?)null });
                PostMessage(new { type = "bidResult", success = true, bid = (object?)null });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[SimBridge] FetchBid failed");
            PostMessage(new { type = "bidResult", success = false, error = ex.Message });
        }
    }

    private async Task CancelBidAsync(string pilotId)
    {
        if (string.IsNullOrEmpty(pilotId)) return;
        try
        {
            var ok = await _api.CancelBidAsync(pilotId);
            if (ok)
            {
                PostMessage(new { type = "bid", callsign = (string?)null });
                _logger.LogInformation("[SimBridge] Bid cancelled for {Pilot}", pilotId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[SimBridge] CancelBid failed");
        }
    }

    private static string GetJsonString(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";

    private static string SafeGetString(JsonElement root, string prop) =>
        root.TryGetProperty(prop, out var v) ? (v.GetString() ?? "") : "";

    private static int GetJsonInt(JsonElement el, string prop)
    {
        if (!el.TryGetProperty(prop, out var v) || v.ValueKind != JsonValueKind.Number) return 0;
        // Handle both integer and decimal JSON numbers (e.g., cargo: 9.305)
        if (v.TryGetInt32(out var i)) return i;
        if (v.TryGetDouble(out var d)) return (int)d;
        return 0;
    }

    private static int SafeGetInt(JsonElement root, string prop)
    {
        if (!root.TryGetProperty(prop, out var v)) return 0;
        if (v.ValueKind == JsonValueKind.Number)
        {
            if (v.TryGetInt32(out var i)) return i;
            if (v.TryGetDouble(out var d)) return (int)d;
        }
        if (v.ValueKind == JsonValueKind.String && int.TryParse(v.GetString(), out var parsed)) return parsed;
        return 0;
    }

    private void PushAuthState()
    {
        PostMessage(new
        {
            type = "auth",
            isLoggedIn = _mainVm.IsLoggedIn,
            pilotName = _mainVm.PilotName,
            pilotId = _mainVm.PilotId,
            pilotRank = _mainVm.PilotRank,
            pilotAvatar = _mainVm.PilotAvatar,
            pilotHours = _mainVm.PilotHours,
            pilotXp = _mainVm.PilotXp,
            weightUnit = _mainVm.WeightUnit,
            deviceCode = _mainVm.DeviceCode,
            isLoggingIn = _mainVm.IsLoggingIn,
        });
    }

    private void PushConnectionState()
    {
        PostMessage(new
        {
            type = "connection",
            simConnected = _flightManager.IsSimConnected,
            apiConnected = _flightManager.IsApiConnected,
        });
    }

    private void PushFlightState()
    {
        var oooi = _flightManager.Oooi;
        PostMessage(new
        {
            type = "flight",
            isActive = _flightVm.IsFlightActive,
            flightNumber = _flightVm.FlightNumber,
            callsign = _flightVm.Callsign,
            departureIcao = _flightVm.DepartureIcao,
            arrivalIcao = _flightVm.ArrivalIcao,
            aircraftType = _flightVm.AircraftType,
            currentPhase = _flightVm.CurrentPhase,
            flightTime = _flightVm.FlightTime,
            comfortScore = _flightVm.ComfortScore,
            exceedanceCount = _flightVm.ExceedanceCount,
            distanceNm = Math.Round(_flightManager.TotalDistanceNm, 1),
            fuelUsed = Math.Round(Math.Max(0, _flightManager.StartFuel - _flightVm.CurrentFuel), 1),
            landingRate = Math.Round(_flightManager.LandingRate, 0),
            progress = Math.Round(_flightManager.FlightProgress * 100, 1),
            oooi = new
            {
                gateOut = oooi.Out?.ToString("HH:mm") ?? "",
                wheelsOff = oooi.Off?.ToString("HH:mm") ?? "",
                wheelsOn = oooi.On?.ToString("HH:mm") ?? "",
                gateIn = oooi.In?.ToString("HH:mm") ?? "",
            },
        });

        // Push score card if visible
        if (_flightVm.ShowScoreCard)
        {
            PostMessage(new
            {
                type = "score",
                finalScore = _flightVm.FinalScore,
                landingGrade = _flightVm.LandingGrade,
                landingDescription = _flightVm.LandingDescription,
                xpEarned = _flightVm.XpEarned,
                rejected = _flightVm.FlightRejected,
                rejectionReason = _flightVm.RejectionReason,
            });
        }
    }

    private void PushLatestLog(string logType, System.Collections.ObjectModel.ObservableCollection<string> collection)
    {
        if (collection.Count == 0) return;
        PostMessage(new
        {
            type = logType,
            message = collection[0],
            timestamp = DateTime.Now.ToString("HH:mm:ss"),
        });
    }

    // ── Message transport ─────────────────────────────────────────────

    private void PostMessage(object payload)
    {
        if (_webView == null) return;

        var json = JsonSerializer.Serialize(payload, _jsonOpts);

        Application.Current?.Dispatcher?.InvokeAsync(() =>
        {
            try { _webView.PostWebMessageAsJson(json); }
            catch { /* WebView2 might be disposing */ }
        });
    }

    private void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var json = e.WebMessageAsJson;
            JsonDocument? doc = null;
            try
            {
                doc = JsonDocument.Parse(json);

                if (doc.RootElement.ValueKind == JsonValueKind.String)
                {
                    var innerJson = doc.RootElement.GetString();
                    if (string.IsNullOrWhiteSpace(innerJson)) return;
                    doc.Dispose();
                    doc = JsonDocument.Parse(innerJson);
                }

                if (!doc.RootElement.TryGetProperty("action", out var actionEl)) return;
                var action = actionEl.GetString();

                switch (action)
                {
                    case "login": Login(); break;
                    case "logout": Logout(); break;
                    case "endFlight": EndFlight(); break;
                    case "cancelFlight": CancelFlight(); break;
                    case "startFlight": StartFlight(json); break;
                    case "fetchBid":
                        var bidPilotId = _mainVm.PilotId;
                        if (string.IsNullOrEmpty(bidPilotId)) bidPilotId = AppConfig.Current.PilotId ?? "";
                        if (!string.IsNullOrEmpty(bidPilotId)) _ = FetchAndPushBidAsync(bidPilotId);
                        else _logger.LogWarning("[SimBridge] fetchBid skipped — PilotId is empty");
                        break;
                    case "cancelBid": _ = CancelBidAsync(_mainVm.PilotId); break;
                    case "checkForUpdate": CheckForUpdate(); break;
                    case "requestMetar":
                    {
                        var icao = SafeGetString(doc.RootElement, "icao");
                        if (icao.Length >= 3) _ = FetchAndPushWeatherAsync(icao, "metar");
                        break;
                    }
                    case "requestTaf":
                    {
                        var icao = SafeGetString(doc.RootElement, "icao");
                        if (icao.Length >= 3) _ = FetchAndPushWeatherAsync(icao, "taf");
                        break;
                    }
                }
            }
            finally
            {
                doc?.Dispose();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[SimBridge] WebMessage parse error");
        }
    }

    // ── Weather proxy (avoids CORS in WebView2) ──────────────────────

    private static readonly HttpClient _weatherHttp = new() { Timeout = TimeSpan.FromSeconds(10) };
    private static string? _ivaoToken;
    private static DateTime _ivaoTokenExpiry = DateTime.MinValue;

    private async Task<string?> GetIvaoTokenAsync()
    {
        var config = AppConfig.Current;
        if (string.IsNullOrEmpty(config.IvaoClientId) || string.IsNullOrEmpty(config.IvaoClientSecret))
            return null;

        if (_ivaoToken != null && DateTime.UtcNow < _ivaoTokenExpiry)
            return _ivaoToken;

        try
        {
            var body = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "client_credentials"),
                new KeyValuePair<string, string>("client_id", config.IvaoClientId),
                new KeyValuePair<string, string>("client_secret", config.IvaoClientSecret),
            });
            var res = await _weatherHttp.PostAsync("https://api.ivao.aero/v2/oauth/token", body);
            if (!res.IsSuccessStatusCode) return null;

            var json = await res.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            _ivaoToken = doc.RootElement.GetProperty("access_token").GetString();
            var expiresIn = doc.RootElement.GetProperty("expires_in").GetInt32();
            _ivaoTokenExpiry = DateTime.UtcNow.AddSeconds(expiresIn - 60);
            return _ivaoToken;
        }
        catch (Exception ex)
        {
            _logger.LogDebug("[Weather] IVAO token fetch failed: {Msg}", ex.Message);
            return null;
        }
    }

    private async Task FetchAndPushWeatherAsync(string icao, string kind)
    {
        var upper = icao.ToUpperInvariant();
        string? raw = null;

        // 1. IVAO API (best quality, OAuth2 required)
        var token = await GetIvaoTokenAsync();
        if (token != null)
        {
            try
            {
                var endpoint = kind == "taf" ? "taf" : "metar";
                var req = new HttpRequestMessage(HttpMethod.Get,
                    $"https://api.ivao.aero/v2/weather/{endpoint}/{upper}");
                req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                var res = await _weatherHttp.SendAsync(req);
                if (res.IsSuccessStatusCode)
                {
                    var text = (await res.Content.ReadAsStringAsync()).Trim();
                    if (text.Length > 10) raw = text;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug("[Weather] IVAO {Kind} fetch failed for {Icao}: {Msg}", kind, upper, ex.Message);
            }
        }

        // 2. Fallback: aviationweather.gov (free, no key)
        if (raw == null)
        {
            try
            {
                var url = kind == "taf"
                    ? $"https://aviationweather.gov/api/data/taf?ids={upper}&format=raw"
                    : $"https://aviationweather.gov/api/data/metar?ids={upper}&format=raw";
                var res = await _weatherHttp.GetAsync(url);
                if (res.IsSuccessStatusCode)
                {
                    var text = (await res.Content.ReadAsStringAsync()).Trim();
                    if (text.Length > 10) raw = text;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug("[Weather] AWC {Kind} fetch failed for {Icao}: {Msg}", kind, upper, ex.Message);
            }
        }

        // 3. Fallback: VATSIM (METAR only)
        if (raw == null && kind == "metar")
        {
            try
            {
                var res = await _weatherHttp.GetAsync($"https://metar.vatsim.net/metar.php?id={upper}");
                if (res.IsSuccessStatusCode)
                {
                    var text = (await res.Content.ReadAsStringAsync()).Trim();
                    if (text.Length > 10) raw = text;
                }
            }
            catch { /* best effort */ }
        }

        PostMessage(new
        {
            type = kind == "taf" ? "tafResult" : "metarResult",
            icao = upper,
            raw = raw ?? "",
            success = raw != null,
        });
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _telemetryTimer?.Stop();
        _telemetryTimer?.Dispose();
        if (_webView != null)
        {
            _webView.WebMessageReceived -= OnWebMessage;
        }
    }
}
