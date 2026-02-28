using System.Text.Json.Serialization;

namespace LevantACARS.Models;

/// <summary>
/// PIREP payload submitted to levant-va.com/api/acars/submit.
/// Serialized with System.Text.Json — property names match the PHP backend expectations.
/// </summary>
public sealed record PirepData
{
    [JsonPropertyName("pilotId")]
    public string PilotId { get; init; } = string.Empty;

    [JsonPropertyName("flightNumber")]
    public string FlightNumber { get; init; } = string.Empty;

    [JsonPropertyName("callsign")]
    public string Callsign { get; init; } = string.Empty;

    [JsonPropertyName("departureICAO")]
    public string DepartureIcao { get; init; } = string.Empty;

    [JsonPropertyName("arrivalICAO")]
    public string ArrivalIcao { get; init; } = string.Empty;

    [JsonPropertyName("route")]
    public string Route { get; init; } = string.Empty;

    [JsonPropertyName("aircraftType")]
    public string AircraftType { get; init; } = string.Empty;

    [JsonPropertyName("aircraftRegistration")]
    public string AircraftRegistration { get; init; } = string.Empty;

    [JsonPropertyName("landingRate")]
    public double LandingRate { get; init; }

    [JsonPropertyName("gForce")]
    public double GForce { get; init; }

    [JsonPropertyName("fuelUsed")]
    public double FuelUsed { get; init; }

    [JsonPropertyName("distanceNm")]
    public double DistanceNm { get; init; }

    [JsonPropertyName("flightTimeMinutes")]
    public double FlightTimeMinutes { get; init; }

    [JsonPropertyName("score")]
    public int Score { get; init; }

    [JsonPropertyName("landingGrade")]
    public string LandingGradeStr { get; init; } = string.Empty;

    [JsonPropertyName("xpEarned")]
    public int XpEarned { get; init; }

    [JsonPropertyName("comfortScore")]
    public int ComfortScore { get; init; }

    [JsonPropertyName("pax")]
    public int Pax { get; init; }

    [JsonPropertyName("cargo")]
    public int Cargo { get; init; }

    [JsonPropertyName("status")]
    public string Status { get; init; } = "completed";

    [JsonPropertyName("acarsVersion")]
    public string AcarsVersion { get; init; } = "1.0.0";

    [JsonPropertyName("exceedanceCount")]
    public int ExceedanceCount { get; init; }

    [JsonPropertyName("alternateIcao")]
    public string? AlternateIcao { get; init; }

    [JsonPropertyName("telemetry")]
    public object[]? Telemetry { get; init; }

    [JsonPropertyName("log")]
    public object? Log { get; init; }

    [JsonPropertyName("airframeDamage")]
    public object? AirframeDamage { get; init; }

    [JsonPropertyName("comments")]
    public string? Comments { get; init; }
}

/// <summary>
/// Position update payload sent periodically to the live tracking API.
/// </summary>
public sealed record PositionUpdate
{
    [JsonPropertyName("action")]
    public string Action { get; init; } = "position";

    [JsonPropertyName("pilotId")]
    public string PilotId { get; init; } = string.Empty;

    [JsonPropertyName("callsign")]
    public string Callsign { get; init; } = string.Empty;

    [JsonPropertyName("latitude")]
    public double Latitude { get; init; }

    [JsonPropertyName("longitude")]
    public double Longitude { get; init; }

    [JsonPropertyName("altitude")]
    public int Altitude { get; init; }

    [JsonPropertyName("heading")]
    public int Heading { get; init; }

    [JsonPropertyName("groundSpeed")]
    public int GroundSpeed { get; init; }

    [JsonPropertyName("status")]
    public string Status { get; init; } = string.Empty;

    [JsonPropertyName("phase")]
    public string Phase { get; init; } = string.Empty;

    [JsonPropertyName("fuel")]
    public double Fuel { get; init; }

    [JsonPropertyName("engines")]
    public int Engines { get; init; }

    [JsonPropertyName("ias")]
    public int Ias { get; init; }

    [JsonPropertyName("vs")]
    public int Vs { get; init; }

    [JsonPropertyName("pitch")]
    public double Pitch { get; init; }

    [JsonPropertyName("bank")]
    public double Bank { get; init; }

    [JsonPropertyName("lights")]
    public int Lights { get; init; }

    [JsonPropertyName("g_force")]
    public double GForce { get; init; }

    [JsonPropertyName("comfort_score")]
    public int ComfortScore { get; init; }
}

/// <summary>API response from the VA backend.</summary>
public sealed record ApiResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; init; }

    [JsonPropertyName("message")]
    public string Message { get; init; } = string.Empty;

    [JsonPropertyName("data")]
    public object? Data { get; init; }
}
