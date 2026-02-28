using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace LevantACARS.Services;

/// <summary>
/// Device-code OAuth authentication service.
/// 1. POST /api/auth/acars-token → get device code + authorize URL
/// 2. Open browser to /auth/acars-authorize?code=XXX
/// 3. Poll GET /api/auth/acars-token?code=XXX until authorized
/// 4. Store session token + pilot data in AppConfig
/// </summary>
public sealed class AuthService
{
    private readonly ILogger<AuthService> _logger;
    private readonly HttpClient _http;
    private CancellationTokenSource? _pollCts;

    public event Action<bool>? OnAuthStateChanged;
    public event Action<string>? OnDeviceCodeReady;

    public bool IsAuthenticated => AppConfig.Current.IsAuthenticated;
    public string? PilotName => AppConfig.Current.PilotName;
    public string? PilotId => AppConfig.Current.PilotId;
    public string? PilotRank => AppConfig.Current.PilotRank;

    public AuthService(ILogger<AuthService> logger)
    {
        _logger = logger;
        _http = new HttpClient();
        _http.DefaultRequestHeaders.Add("User-Agent", "LevantACARS/1.9");
    }

    /// <summary>Start the device-code login flow.</summary>
    public async Task<bool> LoginAsync()
    {
        try
        {
            var baseUrl = AppConfig.Current.ApiBaseUrl.TrimEnd('/');
            // Website API is at /api/auth/acars-token, not under /api/acars/
            var siteBase = baseUrl.Contains("/api/acars")
                ? baseUrl.Replace("/api/acars", "")
                : baseUrl;

            // 1. Request a new device code
            _logger.LogInformation("[Auth] Requesting device code...");
            var postRes = await _http.PostAsync($"{siteBase}/api/auth/acars-token",
                new StringContent("{}", Encoding.UTF8, "application/json"));

            if (!postRes.IsSuccessStatusCode)
            {
                _logger.LogWarning("[Auth] Failed to get device code: {Status}", postRes.StatusCode);
                return false;
            }

            var postJson = await postRes.Content.ReadAsStringAsync();
            using var postDoc = JsonDocument.Parse(postJson);
            var root = postDoc.RootElement;

            var deviceCode = GetString(root, "device_code") ?? "";
            var authorizeUrl = GetString(root, "authorize_url") ?? "";
            var pollInterval = GetInt(root, "poll_interval") ?? 2;
            var expiresIn = GetInt(root, "expires_in") ?? 300;

            if (string.IsNullOrEmpty(deviceCode))
            {
                _logger.LogWarning("[Auth] No device code returned");
                return false;
            }

            _logger.LogInformation("[Auth] Device code: {Code}, opening browser...", deviceCode);
            OnDeviceCodeReady?.Invoke(deviceCode);

            // 2. Open browser to the authorize page
            Process.Start(new ProcessStartInfo(authorizeUrl) { UseShellExecute = true });

            // 3. Poll for authorization
            _pollCts = new CancellationTokenSource(TimeSpan.FromSeconds(expiresIn));
            var token = _pollCts.Token;

            while (!token.IsCancellationRequested)
            {
                await Task.Delay(pollInterval * 1000, token);

                var pollRes = await _http.GetAsync($"{siteBase}/api/auth/acars-token?code={deviceCode}", token);

                if (pollRes.StatusCode == HttpStatusCode.Gone)
                {
                    _logger.LogWarning("[Auth] Device code expired");
                    return false;
                }

                if (!pollRes.IsSuccessStatusCode) continue;

                var pollJson = await pollRes.Content.ReadAsStringAsync(token);
                using var pollDoc = JsonDocument.Parse(pollJson);
                var pollRoot = pollDoc.RootElement;

                var status = GetString(pollRoot, "status");
                if (status == "pending") continue;

                if (status == "authorized")
                {
                    var sessionToken = GetString(pollRoot, "sessionToken") ?? "";
                    var config = AppConfig.Current;
                    config.AuthToken = sessionToken;

                    // Parse pilot data from the response
                    if (pollRoot.TryGetProperty("pilot", out var pilot))
                    {
                        config.PilotId = GetString(pilot, "pilotId") ?? GetString(pilot, "id") ?? "";
                        config.PilotName = GetString(pilot, "name") ?? "Pilot";
                        config.PilotRank = GetString(pilot, "rank") ?? "New Hire";
                        config.PilotAvatar = GetString(pilot, "avatarUrl") ?? "";
                        config.PilotHours = GetDouble(pilot, "totalHours") ?? 0;
                        config.PilotXp = GetInt(pilot, "xp") ?? 0;
                        config.WeightUnit = GetString(pilot, "weightUnit") ?? "lbs";
                    }

                    config.Save();
                    _logger.LogInformation("[Auth] Authorized as {Name} ({Rank})", config.PilotName, config.PilotRank);
                    OnAuthStateChanged?.Invoke(true);
                    return true;
                }

                break;
            }

            _logger.LogWarning("[Auth] Login timed out or was cancelled");
            return false;
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("[Auth] Login cancelled");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Auth] Login flow failed");
            return false;
        }
        finally
        {
            _pollCts = null;
        }
    }

    /// <summary>Refresh pilot profile using existing auth — calls the ACARS auth API.</summary>
    public async Task<bool> FetchProfileAsync()
    {
        var config = AppConfig.Current;
        if (string.IsNullOrEmpty(config.AuthToken)) return false;

        try
        {
            // Decode the session token to get pilot ID (format: base64 of "pilotId:timestamp")
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(config.AuthToken));
            var pilotId = decoded.Split(':')[0];

            // Use the existing ACARS auth API to get fresh pilot data
            var payload = JsonSerializer.Serialize(new { action = "bid", pilotId });
            var res = await _http.PostAsync(config.ApiBaseUrl,
                new StringContent(payload, Encoding.UTF8, "application/json"));

            if (res.IsSuccessStatusCode)
            {
                _logger.LogInformation("[Auth] Profile refresh successful for {PilotId}", pilotId);
                config.PilotId = pilotId;
                config.Save();
            }

            OnAuthStateChanged?.Invoke(true);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Auth] Profile refresh failed");
            return false;
        }
    }

    /// <summary>Logout — clear stored credentials.</summary>
    public void Logout()
    {
        AppConfig.Current.ClearAuth();
        OnAuthStateChanged?.Invoke(false);
        _logger.LogInformation("[Auth] Logged out");
    }

    /// <summary>Cancel any pending login flow.</summary>
    public void CancelLogin()
    {
        try { _pollCts?.Cancel(); } catch { }
    }

    private static string? GetString(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static double? GetDouble(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetDouble() : null;

    private static int? GetInt(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt32() : null;
}
