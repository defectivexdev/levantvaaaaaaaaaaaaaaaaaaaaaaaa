namespace LevantACARS.Models;

/// <summary>
/// A single rank level definition with hours/XP thresholds and allowed aircraft categories.
/// </summary>
public sealed record RankLevel
{
    public string Rank { get; init; } = string.Empty;
    public int HoursRequired { get; init; }
    public int XpRequired { get; init; }
    public AircraftCategory[] AllowedCategories { get; init; } = [];
    public double PayMultiplier { get; init; } = 1.0;
}

/// <summary>
/// Static rank configuration — mirrors the TypeScript DEFAULT_RANK_CONFIG.
/// </summary>
public static class RankConfig
{
    public static readonly RankLevel[] DefaultRanks =
    [
        new() { Rank = "Cadet",              HoursRequired = 0,    XpRequired = 0,   AllowedCategories = [AircraftCategory.SEP, AircraftCategory.MEP], PayMultiplier = 0.5 },
        new() { Rank = "Second Officer",     HoursRequired = 25,   XpRequired = 50,  AllowedCategories = [AircraftCategory.SEP, AircraftCategory.MEP, AircraftCategory.Turboprop], PayMultiplier = 0.7 },
        new() { Rank = "First Officer",      HoursRequired = 50,   XpRequired = 100, AllowedCategories = [AircraftCategory.SEP, AircraftCategory.MEP, AircraftCategory.Turboprop, AircraftCategory.Narrowbody], PayMultiplier = 0.85 },
        new() { Rank = "Senior First Officer", HoursRequired = 100, XpRequired = 150, AllowedCategories = [AircraftCategory.SEP, AircraftCategory.MEP, AircraftCategory.Turboprop, AircraftCategory.Narrowbody, AircraftCategory.Widebody], PayMultiplier = 1.0 },
        new() { Rank = "Captain",            HoursRequired = 150,  XpRequired = 200, AllowedCategories = [AircraftCategory.SEP, AircraftCategory.MEP, AircraftCategory.Turboprop, AircraftCategory.Narrowbody, AircraftCategory.Widebody, AircraftCategory.Heavy], PayMultiplier = 1.2 },
        new() { Rank = "Senior Captain",     HoursRequired = 500,  XpRequired = 250, AllowedCategories = [AircraftCategory.SEP, AircraftCategory.MEP, AircraftCategory.Turboprop, AircraftCategory.Narrowbody, AircraftCategory.Widebody, AircraftCategory.Heavy, AircraftCategory.Superheavy], PayMultiplier = 1.5 },
        new() { Rank = "Training Captain",   HoursRequired = 750,  XpRequired = 300, AllowedCategories = [AircraftCategory.SEP, AircraftCategory.MEP, AircraftCategory.Turboprop, AircraftCategory.Narrowbody, AircraftCategory.Widebody, AircraftCategory.Heavy, AircraftCategory.Superheavy], PayMultiplier = 1.7 },
        new() { Rank = "Chief Pilot",        HoursRequired = 1000, XpRequired = 320, AllowedCategories = [AircraftCategory.SEP, AircraftCategory.MEP, AircraftCategory.Turboprop, AircraftCategory.Narrowbody, AircraftCategory.Widebody, AircraftCategory.Heavy, AircraftCategory.Superheavy], PayMultiplier = 2.0 },
    ];

    /// <summary>Rank thresholds as simple (rank, xpRequired) pairs for offline fallback.</summary>
    public static readonly (string Rank, int XpRequired)[] Thresholds =
        DefaultRanks.Select(r => (r.Rank, r.XpRequired)).ToArray();
}
