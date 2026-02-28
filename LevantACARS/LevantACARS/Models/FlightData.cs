namespace LevantACARS.Models;

/// <summary>
/// Real-time telemetry snapshot from the flight simulator via FSUIPC.
/// Thread-safe immutable record — produced by FsuipcService on each poll cycle.
/// </summary>
public sealed record FlightData
{
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public int Altitude { get; init; }
    public int RadioAltitude { get; init; }
    public int Heading { get; init; }
    public int GroundSpeed { get; init; }
    public int Ias { get; init; }
    public int VerticalSpeed { get; init; }
    public double Pitch { get; init; }
    public double Bank { get; init; }
    public double GForce { get; init; }
    public bool OnGround { get; init; }
    public double TotalFuel { get; init; }
    public bool EnginesOn { get; init; }
    public int Lights { get; init; }
    public bool StallWarning { get; init; }
    public bool OverspeedWarning { get; init; }
    public bool CrashDetected { get; init; }
    public int FlapsPosition { get; init; }
    public int GearPosition { get; init; }
    public bool ParkingBrake { get; init; }
    public int Throttle { get; init; }
    public string AircraftTitle { get; init; } = string.Empty;
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
    public FlightPhase Phase { get; init; } = FlightPhase.Preflight;

    // Sim status
    public double SimRate { get; init; } = 1.0;
    public bool IsPaused { get; init; }

    // Universal ACARS block (Lua profiles)
    public double AcarsFuel { get; init; }
    public double AcarsZfw { get; init; }
    public double AcarsPayload { get; init; }
}

/// <summary>Buffered telemetry point for persistence/replay.</summary>
public sealed record TelemetryPoint(
    long Time,
    double Lat,
    double Lon,
    int Alt,
    int Gs,
    int Hdg,
    int Vs,
    int Ias,
    string Phase
);

/// <summary>Landing analysis at touchdown.</summary>
public sealed record LandingAnalysis
{
    public double LandingRate { get; init; }
    public double GForce { get; init; }
    public double Pitch { get; init; }
    public double Bank { get; init; }
    public int ButterScore { get; init; }
    public LandingGrade Grade { get; init; } = LandingGrade.Normal;
}

/// <summary>OOOI (Out-Off-On-In) gate times.</summary>
public sealed class OoiTimes
{
    public DateTime? Out { get; set; }
    public DateTime? Off { get; set; }
    public DateTime? On { get; set; }
    public DateTime? In { get; set; }
}

/// <summary>A single deduction recorded during a flight.</summary>
public sealed record Deduction(string Reason, int Penalty, DateTime Timestamp);
