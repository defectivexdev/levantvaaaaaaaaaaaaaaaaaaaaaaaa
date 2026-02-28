using System.Net.Http;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace LevantACARS.Services;

/// <summary>
/// Detects whether the aircraft is on a runway using GPS coordinates.
/// Fetches runway endpoint coordinates from a free airport database API,
/// caches them per ICAO, and uses a haversine snap-to-line check.
/// </summary>
public sealed class RunwayDetector
{
    private readonly ILogger<RunwayDetector> _logger;
    private readonly HttpClient _http;

    // Cache: ICAO → list of runway segments
    private readonly Dictionary<string, List<RunwaySegment>> _cache = new(StringComparer.OrdinalIgnoreCase);
    // Cache: ICAO → airport reference coordinates
    private readonly Dictionary<string, (double Lat, double Lon)> _coordCache = new(StringComparer.OrdinalIgnoreCase);
    // Runway width buffer in meters (standard runway ~45m wide + taxi margin)
    private const double RunwayWidthBufferMeters = 60.0;

    public RunwayDetector(ILogger<RunwayDetector> logger)
    {
        _logger = logger;
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        _http.DefaultRequestHeaders.Add("User-Agent", "LevantACARS/3.0");
    }

    /// <summary>
    /// Pre-fetch runway data for departure and arrival airports.
    /// Call this when a flight starts.
    /// </summary>
    public async Task PreloadAsync(string departureIcao, string arrivalIcao)
    {
        await FetchRunwaysAsync(departureIcao);
        await FetchRunwaysAsync(arrivalIcao);
    }

    /// <summary>
    /// Check if the given lat/lon is on any cached runway.
    /// </summary>
    public bool IsOnRunway(double lat, double lon)
    {
        foreach (var kvp in _cache)
        {
            foreach (var rwy in kvp.Value)
            {
                if (IsPointNearSegment(lat, lon, rwy.Lat1, rwy.Lon1, rwy.Lat2, rwy.Lon2, RunwayWidthBufferMeters))
                    return true;
            }
        }
        return false;
    }

    /// <summary>
    /// Check if the given lat/lon is on any runway at a specific airport.
    /// </summary>
    public bool IsOnRunwayAt(double lat, double lon, string icao)
    {
        if (!_cache.TryGetValue(icao, out var runways)) return false;
        foreach (var rwy in runways)
        {
            if (IsPointNearSegment(lat, lon, rwy.Lat1, rwy.Lon1, rwy.Lat2, rwy.Lon2, RunwayWidthBufferMeters))
                return true;
        }
        return false;
    }

    /// <summary>Get cached airport reference coordinates, or null if not yet fetched.</summary>
    public (double Lat, double Lon)? GetAirportCoordinates(string icao)
    {
        return _coordCache.TryGetValue(icao?.ToUpperInvariant() ?? "", out var c) ? c : null;
    }

    /// <summary>Clear cached runway data (e.g., on flight end).</summary>
    public void ClearCache()
    {
        _cache.Clear();
        _coordCache.Clear();
    }

    // ── Fetch from free API ──────────────────────────────────────────────

    private async Task FetchRunwaysAsync(string icao)
    {
        if (string.IsNullOrWhiteSpace(icao) || icao.Length < 3) return;
        icao = icao.Trim().ToUpperInvariant();

        if (_cache.ContainsKey(icao)) return; // Already cached

        try
        {
            // Use the free ICAO airport API (no key required)
            var url = $"https://ourairports.com/airports/{icao}/";
            // Fallback: try parsing from a lightweight CSV endpoint
            // For robustness, we'll use a simple bounding-box approach from the airport coordinates
            // and supplement with the Levant VA API if available

            var runways = await FetchFromOurAirportsAsync(icao);
            if (runways.Count > 0)
            {
                _cache[icao] = runways;
                _logger.LogInformation("[RunwayDetector] Cached {Count} runways for {Icao}", runways.Count, icao);
            }
            else
            {
                _logger.LogWarning("[RunwayDetector] No runway data found for {Icao}", icao);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[RunwayDetector] Failed to fetch runways for {Icao}", icao);
        }
    }

    /// <summary>
    /// Fetch runway data from the OurAirports CSV data (GitHub-hosted, no API key).
    /// Falls back gracefully if unavailable.
    /// </summary>
    private async Task<List<RunwaySegment>> FetchFromOurAirportsAsync(string icao)
    {
        var results = new List<RunwaySegment>();

        try
        {
            var token = AppConfig.Current.AirportDbApiToken;
            var apiUrl = $"https://airportdb.io/api/v1/airport/{icao}?apiToken={token}";
            var response = await _http.GetAsync(apiUrl);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("[RunwayDetector] airportdb.io returned {Code} for {Icao}", response.StatusCode, icao);
                return results;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Cache airport reference coordinates
            if (root.TryGetProperty("latitude_deg", out var apLatEl) &&
                root.TryGetProperty("longitude_deg", out var apLonEl))
            {
                if (double.TryParse(apLatEl.GetString(), System.Globalization.NumberStyles.Float,
                        System.Globalization.CultureInfo.InvariantCulture, out var apLat) &&
                    double.TryParse(apLonEl.GetString(), System.Globalization.NumberStyles.Float,
                        System.Globalization.CultureInfo.InvariantCulture, out var apLon))
                {
                    _coordCache[icao] = (apLat, apLon);
                    _logger.LogDebug("[RunwayDetector] {Icao} coords: {Lat}, {Lon}", icao, apLat, apLon);
                }
            }

            if (!root.TryGetProperty("runways", out var runwaysEl) || runwaysEl.ValueKind != JsonValueKind.Array)
                return results;

            foreach (var rwy in runwaysEl.EnumerateArray())
            {
                double lat1 = 0, lon1 = 0, lat2 = 0, lon2 = 0;
                string ident = "";

                if (rwy.TryGetProperty("ident", out var identEl))
                    ident = identEl.GetString() ?? "";

                // Low-elevation end
                if (rwy.TryGetProperty("le_latitude_deg", out var leLat))
                    double.TryParse(leLat.GetString(), System.Globalization.NumberStyles.Float,
                        System.Globalization.CultureInfo.InvariantCulture, out lat1);
                if (rwy.TryGetProperty("le_longitude_deg", out var leLon))
                    double.TryParse(leLon.GetString(), System.Globalization.NumberStyles.Float,
                        System.Globalization.CultureInfo.InvariantCulture, out lon1);

                // High-elevation end
                if (rwy.TryGetProperty("he_latitude_deg", out var heLat))
                    double.TryParse(heLat.GetString(), System.Globalization.NumberStyles.Float,
                        System.Globalization.CultureInfo.InvariantCulture, out lat2);
                if (rwy.TryGetProperty("he_longitude_deg", out var heLon))
                    double.TryParse(heLon.GetString(), System.Globalization.NumberStyles.Float,
                        System.Globalization.CultureInfo.InvariantCulture, out lon2);

                if (lat1 != 0 && lon1 != 0 && lat2 != 0 && lon2 != 0)
                {
                    results.Add(new RunwaySegment(ident, lat1, lon1, lat2, lon2));
                    _logger.LogDebug("[RunwayDetector] {Icao} runway {Id}: ({Lat1},{Lon1}) → ({Lat2},{Lon2})",
                        icao, ident, lat1, lon1, lat2, lon2);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "[RunwayDetector] API fetch failed for {Icao}", icao);
        }

        return results;
    }

    // ── Geometry: Point near line segment (haversine) ────────────────────

    /// <summary>
    /// Check if point P is within `bufferMeters` of the line segment A→B.
    /// Uses the "point-to-segment distance" via haversine cross-track distance.
    /// Also checks along-track distance to ensure P is between A and B (with small overshoot).
    /// </summary>
    private static bool IsPointNearSegment(
        double pLat, double pLon,
        double aLat, double aLon,
        double bLat, double bLon,
        double bufferMeters)
    {
        // Distance from A to B (runway length)
        double dAB = HaversineMeters(aLat, aLon, bLat, bLon);
        if (dAB < 1) return false; // Degenerate runway

        // Distance from A to P
        double dAP = HaversineMeters(aLat, aLon, pLat, pLon);

        // Distance from B to P
        double dBP = HaversineMeters(bLat, bLon, pLat, pLon);

        // Triangle inequality check:
        // If (dAP + dBP) ≈ dAB, then P is on the segment A→B
        // The excess over dAB represents how far off the line P is
        // For a perpendicular offset of `d` from the line, the excess ≈ d²/dAB (small angles)
        // But for simplicity and robustness, use the direct cross-track formula:

        // Bearing from A to B
        double bearingAB = InitialBearing(aLat, aLon, bLat, bLon);

        // Bearing from A to P
        double bearingAP = InitialBearing(aLat, aLon, pLat, pLon);

        // Cross-track distance (perpendicular distance from P to the great circle through A and B)
        double angularDistAP = dAP / 6371000.0; // angular distance in radians
        double crossTrack = Math.Abs(Math.Asin(
            Math.Sin(angularDistAP) * Math.Sin(ToRad(bearingAP) - ToRad(bearingAB))
        ) * 6371000.0);

        if (crossTrack > bufferMeters)
            return false;

        // Along-track distance: ensure P is between A and B (with 200m overshoot buffer for threshold/stopway)
        double alongTrack = Math.Acos(
            Math.Clamp(Math.Cos(angularDistAP) / Math.Cos(crossTrack / 6371000.0), -1.0, 1.0)
        ) * 6371000.0;

        return alongTrack >= -200 && alongTrack <= dAB + 200;
    }

    private static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000.0;
        double dLat = ToRad(lat2 - lat1);
        double dLon = ToRad(lon2 - lon1);
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                   Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static double InitialBearing(double lat1, double lon1, double lat2, double lon2)
    {
        double dLon = ToRad(lon2 - lon1);
        double y = Math.Sin(dLon) * Math.Cos(ToRad(lat2));
        double x = Math.Cos(ToRad(lat1)) * Math.Sin(ToRad(lat2)) -
                   Math.Sin(ToRad(lat1)) * Math.Cos(ToRad(lat2)) * Math.Cos(dLon);
        return (ToDeg(Math.Atan2(y, x)) + 360) % 360;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180.0;
    private static double ToDeg(double rad) => rad * 180.0 / Math.PI;
}

/// <summary>A runway defined by its two endpoint coordinates.</summary>
public sealed record RunwaySegment(string Ident, double Lat1, double Lon1, double Lat2, double Lon2);
