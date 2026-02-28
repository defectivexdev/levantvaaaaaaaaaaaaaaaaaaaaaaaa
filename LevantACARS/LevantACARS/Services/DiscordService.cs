using DiscordRPC;
using Microsoft.Extensions.Logging;
using LevantACARS.Models;

namespace LevantACARS.Services;

/// <summary>
/// Manages Discord Rich Presence for Levant VA ACARS.
/// Shows flight status, phase, and route in the pilot's Discord profile.
/// </summary>
public sealed class DiscordService : IDisposable
{
    private readonly ILogger<DiscordService> _logger;
    private DiscordRpcClient? _client;
    private bool _initialized;

    public DiscordService(ILogger<DiscordService> logger)
    {
        _logger = logger;
    }

    /// <summary>Initialize the Discord RPC connection.</summary>
    public void Initialize()
    {
        var clientId = AppConfig.Current.DiscordClientId;
        if (string.IsNullOrEmpty(clientId))
        {
            _logger.LogWarning("[Discord] DISCORD_CLIENT_ID not set in .env — Rich Presence disabled");
            return;
        }

        try
        {
            _client = new DiscordRpcClient(clientId)
            {
                Logger = new DiscordRPC.Logging.ConsoleLogger() { Level = DiscordRPC.Logging.LogLevel.Warning }
            };

            _client.OnReady += (_, e) =>
                _logger.LogInformation("[Discord] Connected as {User}", e.User.Username);

            _client.OnError += (_, e) =>
                _logger.LogWarning("[Discord] Error: {Message}", e.Message);

            _client.Initialize();
            _initialized = true;

            SetIdle();
            _logger.LogInformation("[Discord] Rich Presence initialized");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Discord] Failed to initialize Rich Presence");
        }
    }

    /// <summary>Set presence to idle (no active flight).</summary>
    public void SetIdle()
    {
        if (!_initialized || _client == null) return;

        _client.SetPresence(new RichPresence
        {
            Details = "Levant Virtual Airlines",
            State = "ACARS Online — Idle",
            Assets = new Assets
            {
                LargeImageKey = "logo_large",
                LargeImageText = "Levant Virtual Airlines",
                SmallImageKey = "status_online",
                SmallImageText = "Connected"
            },
            Timestamps = Timestamps.Now
        });
    }

    /// <summary>Update presence with active flight data.</summary>
    public void SetFlightActive(string flightNumber, string departure, string arrival, FlightPhase phase)
    {
        if (!_initialized || _client == null) return;

        _client.SetPresence(new RichPresence
        {
            Details = $"{flightNumber} — {departure} → {arrival}",
            State = $"Phase: {phase}",
            Assets = new Assets
            {
                LargeImageKey = "logo_large",
                LargeImageText = "Levant Virtual Airlines",
                SmallImageKey = "status_flying",
                SmallImageText = $"Flying {flightNumber}"
            },
            Timestamps = Timestamps.Now
        });
    }

    /// <summary>Update just the flight phase.</summary>
    public void UpdatePhase(FlightPhase phase)
    {
        if (!_initialized || _client == null) return;

        var current = _client.CurrentPresence;
        if (current != null)
        {
            current.State = $"Phase: {phase}";
            _client.SetPresence(current);
        }
    }

    /// <summary>Show flight completed state.</summary>
    public void SetFlightCompleted(string flightNumber, int score)
    {
        if (!_initialized || _client == null) return;

        _client.SetPresence(new RichPresence
        {
            Details = $"Completed {flightNumber}",
            State = $"Score: {score}%",
            Assets = new Assets
            {
                LargeImageKey = "logo_large",
                LargeImageText = "Levant Virtual Airlines",
                SmallImageKey = "status_online",
                SmallImageText = "Flight Complete"
            }
        });
    }

    /// <summary>Update presence with live flight details (altitude, speed, phase).</summary>
    public void UpdateFlightDetails(string flightNumber, string departure, string arrival, FlightPhase phase, int altitude, int groundSpeed)
    {
        if (!_initialized || _client == null) return;

        _client.SetPresence(new RichPresence
        {
            Details = $"{flightNumber} — {departure} → {arrival}",
            State = $"{phase} · FL{altitude / 100:D3} · {groundSpeed}kt",
            Assets = new Assets
            {
                LargeImageKey = "logo_large",
                LargeImageText = "Levant Virtual Airlines",
                SmallImageKey = "status_flying",
                SmallImageText = $"Flying {flightNumber}"
            },
            Timestamps = Timestamps.Now
        });
    }

    /// <summary>Set presence when sim is connected but no flight active.</summary>
    public void SetConnected()
    {
        if (!_initialized || _client == null) return;

        _client.SetPresence(new RichPresence
        {
            Details = "Levant Virtual Airlines",
            State = "ACARS Online — Connected to Sim",
            Assets = new Assets
            {
                LargeImageKey = "logo_large",
                LargeImageText = "Levant Virtual Airlines",
                SmallImageKey = "status_online",
                SmallImageText = "Connected"
            },
            Timestamps = Timestamps.Now
        });
    }

    /// <summary>Set presence when sim disconnects.</summary>
    public void SetDisconnected()
    {
        if (!_initialized || _client == null) return;

        _client.SetPresence(new RichPresence
        {
            Details = "Levant Virtual Airlines",
            State = "ACARS Online — No Simulator",
            Assets = new Assets
            {
                LargeImageKey = "logo_large",
                LargeImageText = "Levant Virtual Airlines",
                SmallImageKey = "status_online",
                SmallImageText = "Disconnected"
            },
            Timestamps = Timestamps.Now
        });
    }

    public void Dispose()
    {
        if (_client != null)
        {
            _client.ClearPresence();
            _client.Dispose();
            _client = null;
            _initialized = false;
            _logger.LogInformation("[Discord] Rich Presence disposed");
        }
    }
}
