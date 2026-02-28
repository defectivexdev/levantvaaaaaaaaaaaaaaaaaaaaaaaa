using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace LevantACARS.Services;

/// <summary>
/// Application configuration stored in %AppData%/LevantACARS/config.json.
/// Replaces .env — works correctly in published .exe builds.
/// </summary>
public sealed class AppConfig
{
    private static readonly string ConfigDir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "LevantACARS");
    private static readonly string ConfigPath = Path.Combine(ConfigDir, "config.json");

    // ── API ───────────────────────────────────────────────────────────
    [JsonPropertyName("api_base_url")]
    public string ApiBaseUrl { get; set; } = "https://www.levant-va.com/api/acars";

    [JsonPropertyName("app_key")]
    public string AppKey { get; set; } = "";

    [JsonPropertyName("va_api_key")]
    public string VaApiKey { get; set; } = "LEVANTVIRTUALAIRLINE_WEBI_ACARS";

    [JsonPropertyName("api_timeout")]
    public int ApiTimeout { get; set; } = 15;

    // ── IVAO Weather ────────────────────────────────────────────────
    [JsonPropertyName("ivao_client_id")]
    public string IvaoClientId { get; set; } = "27821fb3-5158-4c5d-a061-4d4bc99575f2";

    [JsonPropertyName("ivao_client_secret")]
    public string IvaoClientSecret { get; set; } = "5UO3O05aYIXCilVRpmLSC4k5AxFDwk0X";

    // ── FSUIPC ────────────────────────────────────────────────────────
    [JsonPropertyName("poll_interval_ms")]
    public int PollIntervalMs { get; set; } = 200;

    // ── Flight Tracking ───────────────────────────────────────────────
    [JsonPropertyName("heartbeat_interval_ms")]
    public int HeartbeatIntervalMs { get; set; } = 30000;

    [JsonPropertyName("telemetry_buffer_interval")]
    public int TelemetryBufferInterval { get; set; } = 4;

    [JsonPropertyName("position_update_interval")]
    public int PositionUpdateInterval { get; set; } = 5;

    // ── Discord ───────────────────────────────────────────────────────
    [JsonPropertyName("discord_client_id")]
    public string DiscordClientId { get; set; } = "1464742078792864057";

    // ── Cloudinary (Avatars) ────────────────────────────────────────
    [JsonPropertyName("cloudinary_cloud_name")]
    public string CloudinaryCloudName { get; set; } = "dh6ytzk50";

    // ── Airport Database (Runway Detection) ───────────────────────────
    [JsonPropertyName("airportdb_api_token")]
    public string AirportDbApiToken { get; set; } = "a0a2bf62f585d729830e852c0c2326f9507a3763c8923fc447319a2fca9ee73f65d32dc893657a475a1e8ec2038bd792";

    // ── Logging ───────────────────────────────────────────────────────
    [JsonPropertyName("log_level")]
    public string LogLevel { get; set; } = "Information";

    // ── Auth (populated after OAuth login) ────────────────────────────
    [JsonPropertyName("auth_token")]
    public string? AuthToken { get; set; }

    [JsonPropertyName("pilot_id")]
    public string? PilotId { get; set; }

    [JsonPropertyName("pilot_name")]
    public string? PilotName { get; set; }

    [JsonPropertyName("pilot_rank")]
    public string? PilotRank { get; set; }

    [JsonPropertyName("pilot_avatar")]
    public string? PilotAvatar { get; set; }

    [JsonPropertyName("pilot_hours")]
    public double PilotHours { get; set; }

    [JsonPropertyName("pilot_xp")]
    public int PilotXp { get; set; }

    [JsonPropertyName("weight_unit")]
    public string WeightUnit { get; set; } = "lbs";

    // ── Singleton ─────────────────────────────────────────────────────
    private static AppConfig? _instance;
    private static readonly object _lock = new();

    public static AppConfig Current
    {
        get
        {
            if (_instance != null) return _instance;
            lock (_lock)
            {
                _instance ??= Load();
                return _instance;
            }
        }
    }

    /// <summary>Load config from disk, or create default if missing.</summary>
    public static AppConfig Load()
    {
        try
        {
            if (!Directory.Exists(ConfigDir))
                Directory.CreateDirectory(ConfigDir);

            if (File.Exists(ConfigPath))
            {
                var json = File.ReadAllText(ConfigPath);
                var config = JsonSerializer.Deserialize<AppConfig>(json);
                if (config != null)
                {
                    // ── Auto-migrate: fix missing www. in API URL ──
                    bool migrated = false;
                    if (config.ApiBaseUrl.Contains("://levant-va.com", StringComparison.OrdinalIgnoreCase))
                    {
                        config.ApiBaseUrl = config.ApiBaseUrl.Replace(
                            "://levant-va.com", "://www.levant-va.com", StringComparison.OrdinalIgnoreCase);
                        migrated = true;
                    }
                    // ── Auto-migrate: strip trailing slash (causes 308 redirect in Next.js) ──
                    if (config.ApiBaseUrl.EndsWith('/'))
                    {
                        config.ApiBaseUrl = config.ApiBaseUrl.TrimEnd('/');
                        migrated = true;
                    }
                    if (migrated) config.Save();

                    _instance = config;
                    return config;
                }
            }
        }
        catch { /* Fall through to defaults */ }

        var defaults = new AppConfig();
        defaults.Save();
        _instance = defaults;
        return defaults;
    }

    /// <summary>Persist current config to disk.</summary>
    public void Save()
    {
        try
        {
            if (!Directory.Exists(ConfigDir))
                Directory.CreateDirectory(ConfigDir);

            var json = JsonSerializer.Serialize(this, new JsonSerializerOptions
            {
                WriteIndented = true
            });
            File.WriteAllText(ConfigPath, json);
        }
        catch { /* Best-effort save */ }
    }

    /// <summary>Check if user is authenticated.</summary>
    public bool IsAuthenticated => !string.IsNullOrEmpty(AuthToken) && !string.IsNullOrEmpty(PilotId);

    /// <summary>Clear auth data (logout).</summary>
    public void ClearAuth()
    {
        AuthToken = null;
        PilotId = null;
        PilotName = null;
        PilotRank = null;
        PilotAvatar = null;
        PilotHours = 0;
        PilotXp = 0;
        WeightUnit = "lbs";
        Save();
    }

    /// <summary>Get the config directory path.</summary>
    public static string GetConfigDirectory() => ConfigDir;
}
