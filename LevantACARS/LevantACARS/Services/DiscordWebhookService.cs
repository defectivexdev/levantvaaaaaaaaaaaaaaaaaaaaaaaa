using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using LevantACARS.Models;

namespace LevantACARS.Services;

/// <summary>
/// Sends rich embed notifications to a Discord channel via webhook.
/// Events: flight start, phase changes, flight completed, PIREP scored.
/// </summary>
public sealed class DiscordWebhookService
{
    private readonly ILogger<DiscordWebhookService> _logger;
    private readonly HttpClient _http;
    private string? _webhookUrl;

    public DiscordWebhookService(ILogger<DiscordWebhookService> logger)
    {
        _logger = logger;
        _http = new HttpClient();
        _http.DefaultRequestHeaders.Add("User-Agent", "LevantACARS-Webhook/1.0");
    }

    /// <summary>Initialize with the webhook URL from environment.</summary>
    public void Initialize()
    {
        // Discord webhooks disabled - web application handles all notifications
        _webhookUrl = null;
        _logger.LogInformation("[Webhook] Discord webhook disabled — web handles all notifications");
    }

    /// <summary>Notify that a flight has started.</summary>
    public async Task NotifyFlightStartAsync(string pilotName, string flightNumber, string departure, string arrival, string aircraft)
    {
        if (string.IsNullOrEmpty(_webhookUrl)) return;

        var embed = new
        {
            embeds = new[]
            {
                new
                {
                    title = "\u2708\uFE0F Flight Dispatched",
                    description = $"**{pilotName}** has started a new flight.",
                    color = 0x4FC3F7, // Accent blue
                    fields = new object[]
                    {
                        new { name = "Flight", value = flightNumber, inline = true },
                        new { name = "Route", value = $"{departure} \u2192 {arrival}", inline = true },
                        new { name = "Aircraft", value = aircraft, inline = true },
                    },
                    footer = new { text = "Levant Virtual Airlines \u2022 ACARS", icon_url = "https://levant-va.com/img/logo-256.png" },
                    timestamp = DateTime.UtcNow.ToString("o"),
                    thumbnail = new { url = "https://levant-va.com/img/logo-256.png" }
                }
            }
        };

        await SendAsync(embed);
    }

    /// <summary>Notify that the aircraft has taken off.</summary>
    public async Task NotifyTakeoffAsync(string pilotName, string flightNumber, string departure, string arrival)
    {
        if (string.IsNullOrEmpty(_webhookUrl)) return;

        var embed = new
        {
            embeds = new[]
            {
                new
                {
                    title = "\uD83D\uDEEB Takeoff",
                    description = $"**{pilotName}** is now airborne on flight **{flightNumber}**.",
                    color = 0x4CAF50, // Green
                    fields = new object[]
                    {
                        new { name = "Departure", value = departure, inline = true },
                        new { name = "Destination", value = arrival, inline = true },
                    },
                    footer = new { text = "Levant Virtual Airlines \u2022 ACARS", icon_url = "https://levant-va.com/img/logo-256.png" },
                    timestamp = DateTime.UtcNow.ToString("o")
                }
            }
        };

        await SendAsync(embed);
    }

    /// <summary>Notify that the aircraft has landed.</summary>
    public async Task NotifyLandingAsync(string pilotName, string flightNumber, string departure, string arrival, double landingRate)
    {
        if (string.IsNullOrEmpty(_webhookUrl)) return;

        var rateText = $"{landingRate:F0} fpm";
        var color = Math.Abs(landingRate) < 100 ? 0xFFD700 : Math.Abs(landingRate) < 200 ? 0x4CAF50 : Math.Abs(landingRate) < 400 ? 0xFF9800 : 0xF44336;

        var embed = new
        {
            embeds = new[]
            {
                new
                {
                    title = "\uD83D\uDEEC Landing",
                    description = $"**{pilotName}** has landed flight **{flightNumber}**.",
                    color,
                    fields = new object[]
                    {
                        new { name = "Route", value = $"{departure} \u2192 {arrival}", inline = true },
                        new { name = "Landing Rate", value = rateText, inline = true },
                    },
                    footer = new { text = "Levant Virtual Airlines \u2022 ACARS", icon_url = "https://levant-va.com/img/logo-256.png" },
                    timestamp = DateTime.UtcNow.ToString("o")
                }
            }
        };

        await SendAsync(embed);
    }

    /// <summary>Notify that a flight has been completed with score.</summary>
    public async Task NotifyFlightCompletedAsync(
        string pilotName, string flightNumber, string departure, string arrival,
        int score, string landingGrade, double landingRate, double flightTimeMinutes, double distanceNm,
        bool isNonStandard = false, double totalPauseSeconds = 0, int integrityScore = 100)
    {
        if (string.IsNullOrEmpty(_webhookUrl)) return;

        var grossHours = (int)(flightTimeMinutes / 60);
        var grossMins = (int)(flightTimeMinutes % 60);
        var netMinutes = Math.Max(0, flightTimeMinutes - totalPauseSeconds / 60.0);
        var netHours = (int)(netMinutes / 60);
        var netMins = (int)(netMinutes % 60);
        var gradeEmoji = landingGrade switch
        {
            "Butter" => "\uD83E\uDD47",
            "VerySmooth" => "\uD83E\uDD48",
            "Smooth" => "\uD83E\uDD49",
            "Normal" => "\u2705",
            "Hard" => "\u26A0\uFE0F",
            "VeryHard" => "\u274C",
            "Crash" => "\uD83D\uDCA5",
            _ => "\u2705"
        };

        var color = isNonStandard ? 0xFF9800 : (score >= 90 ? 0x4CAF50 : score >= 70 ? 0xFFD54F : score >= 50 ? 0xFF9800 : 0xF44336);
        var integrityValue = isNonStandard ? "\u274C Non-Standard (Sim Rate Used)" : "\u2705 Validated";
        var timeValue = totalPauseSeconds > 30
            ? $"{grossHours}h {grossMins}m (net {netHours}h {netMins}m)"
            : $"{grossHours}h {grossMins}m";

        var embed = new
        {
            embeds = new[]
            {
                new
                {
                    title = "\uD83D\uDCCB PIREP Filed",
                    description = $"**{pilotName}** completed flight **{flightNumber}**.",
                    color,
                    fields = new object[]
                    {
                        new { name = "Route", value = $"{departure} \u2192 {arrival}", inline = true },
                        new { name = "Score", value = $"**{score}%**", inline = true },
                        new { name = "Landing", value = $"{gradeEmoji} {landingGrade} ({landingRate:F0} fpm)", inline = true },
                        new { name = "Flight Time", value = timeValue, inline = true },
                        new { name = "Distance", value = $"{distanceNm:F0} nm", inline = true },
                        new { name = "Integrity", value = integrityValue, inline = true },
                        new { name = "Integrity Score", value = $"**{integrityScore}%**", inline = true },
                    },
                    footer = new { text = "Levant Virtual Airlines \u2022 ACARS", icon_url = "https://levant-va.com/img/logo-256.png" },
                    timestamp = DateTime.UtcNow.ToString("o"),
                    thumbnail = new { url = "https://levant-va.com/img/logo-256.png" }
                }
            }
        };

        await SendAsync(embed);
    }

    /// <summary>Notify a flight was rejected or cancelled.</summary>
    public async Task NotifyFlightRejectedAsync(string pilotName, string flightNumber, string reason)
    {
        if (string.IsNullOrEmpty(_webhookUrl)) return;

        var embed = new
        {
            embeds = new[]
            {
                new
                {
                    title = "\u274C Flight Rejected",
                    description = $"**{pilotName}**'s flight **{flightNumber}** was rejected.",
                    color = 0xF44336,
                    fields = new object[]
                    {
                        new { name = "Reason", value = reason, inline = false },
                    },
                    footer = new { text = "Levant Virtual Airlines \u2022 ACARS", icon_url = "https://levant-va.com/img/logo-256.png" },
                    timestamp = DateTime.UtcNow.ToString("o")
                }
            }
        };

        await SendAsync(embed);
    }

    private async Task SendAsync(object payload)
    {
        if (string.IsNullOrEmpty(_webhookUrl)) return;

        try
        {
            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
            });
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _http.PostAsync(_webhookUrl, content);

            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("[Webhook] Discord returned {Status}", response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Webhook] Failed to send Discord notification");
        }
    }
}
