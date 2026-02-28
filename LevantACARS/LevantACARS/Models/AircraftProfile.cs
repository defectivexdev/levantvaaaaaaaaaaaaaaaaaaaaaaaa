namespace LevantACARS.Models;

/// <summary>
/// Aircraft-specific limits used by the exceedance proxy.
/// </summary>
public sealed record AircraftLimits
{
    public int MaxTaxiSpeed { get; init; } = 25;
    public int Vmo { get; init; } = 340;
    public int MaxFlapExtendSpeed { get; init; } = 230;
    public int MaxGearExtendSpeed { get; init; } = 270;
    public int MaxApproachBank { get; init; } = 30;
}

/// <summary>
/// ICAO aircraft type record (IVAO-style).
/// Maps ICAO type designator to model info, wake turbulence, and sim title patterns.
/// </summary>
public sealed record IcaoAircraftType
{
    public string IcaoCode { get; init; } = string.Empty;
    public string Model { get; init; } = string.Empty;
    public char WakeTurbulence { get; init; } = 'M';
    public bool IsMilitary { get; init; }
    public string Description { get; init; } = "LandPlane";
    public int EngineCount { get; init; } = 2;
    public string[] TitlePatterns { get; init; } = [];
    public AircraftLimits Limits { get; init; } = new();
}

/// <summary>
/// Legacy compat — kept so existing callers still compile.
/// </summary>
public sealed record AircraftVariableMap
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string[] TitlePatterns { get; init; } = [];
    public int EngineCount { get; init; } = 2;
}

/// <summary>
/// ICAO aircraft type database — IVAO-style designators with wake turbulence,
/// performance limits, and sim title-pattern matching for auto-detection.
/// </summary>
public static class AircraftProfiles
{
    // ── ICAO Type Database ────────────────────────────────────────────────
    // Keyed by ICAO type designator (e.g. MD11, DC10, B738, A320, CONC)
    // Wake turbulence: L = Light, M = Medium, H = Heavy, J = Super

    public static readonly Dictionary<string, IcaoAircraftType> IcaoTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        // ── Douglas / McDonnell Douglas ─────────────────────────────────
        ["MD11"] = new()
        {
            IcaoCode = "MD11", Model = "MD-11", WakeTurbulence = 'H', EngineCount = 3,
            TitlePatterns = ["md-11", "md11", "tfdi"],
            Limits = new() { Vmo = 365, MaxFlapExtendSpeed = 245, MaxGearExtendSpeed = 280 },
        },
        ["DC10"] = new()
        {
            IcaoCode = "DC10", Model = "DC-10", WakeTurbulence = 'H', EngineCount = 3,
            TitlePatterns = ["dc-10", "dc10"],
            Limits = new() { Vmo = 375, MaxFlapExtendSpeed = 245, MaxGearExtendSpeed = 270 },
        },
        ["MD82"] = new()
        {
            IcaoCode = "MD82", Model = "MD-82", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["md-82", "md82"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 230, MaxGearExtendSpeed = 270, MaxApproachBank = 25 },
        },
        ["MD83"] = new()
        {
            IcaoCode = "MD83", Model = "MD-83", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["md-83", "md83"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 230, MaxGearExtendSpeed = 270, MaxApproachBank = 25 },
        },
        ["MD87"] = new()
        {
            IcaoCode = "MD87", Model = "MD-87", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["md-87", "md87"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 230, MaxGearExtendSpeed = 270, MaxApproachBank = 25 },
        },
        ["MD88"] = new()
        {
            IcaoCode = "MD88", Model = "MD-88", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["md-88", "md88"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 230, MaxGearExtendSpeed = 270, MaxApproachBank = 25 },
        },
        ["MD90"] = new()
        {
            IcaoCode = "MD90", Model = "MD-90", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["md-90", "md90"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 230, MaxGearExtendSpeed = 270, MaxApproachBank = 25 },
        },
        ["DC93"] = new()
        {
            IcaoCode = "DC93", Model = "DC-9-30", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["dc-9", "dc9"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 230, MaxGearExtendSpeed = 270, MaxApproachBank = 25 },
        },
        ["DC86"] = new()
        {
            IcaoCode = "DC86", Model = "DC-8-60", WakeTurbulence = 'H', EngineCount = 4,
            TitlePatterns = ["dc-8", "dc8"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 230, MaxGearExtendSpeed = 270 },
        },

        // ── Lockheed ────────────────────────────────────────────────────
        ["L101"] = new()
        {
            IcaoCode = "L101", Model = "L-1011 TriStar", WakeTurbulence = 'H', EngineCount = 3,
            TitlePatterns = ["l-1011", "l1011", "tristar"],
            Limits = new() { Vmo = 360, MaxFlapExtendSpeed = 240, MaxGearExtendSpeed = 270 },
        },

        // ── Supersonic ──────────────────────────────────────────────────
        ["CONC"] = new()
        {
            IcaoCode = "CONC", Model = "Concorde", WakeTurbulence = 'H', EngineCount = 4,
            TitlePatterns = ["concorde"],
            Limits = new() { Vmo = 530, MaxFlapExtendSpeed = 220, MaxGearExtendSpeed = 270, MaxTaxiSpeed = 20, MaxApproachBank = 20 },
        },

        // ── Airbus Narrowbody ───────────────────────────────────────────
        ["A319"] = new()
        {
            IcaoCode = "A319", Model = "A319", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["a319"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 230 },
        },
        ["A320"] = new()
        {
            IcaoCode = "A320", Model = "A320", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["a320"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 230 },
        },
        ["A20N"] = new()
        {
            IcaoCode = "A20N", Model = "A320neo", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["a320neo", "a20n"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 230 },
        },
        ["A321"] = new()
        {
            IcaoCode = "A321", Model = "A321", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["a321"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 230 },
        },

        // ── Airbus Widebody ─────────────────────────────────────────────
        ["A332"] = new()
        {
            IcaoCode = "A332", Model = "A330-200", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["a330-200", "a332"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 240 },
        },
        ["A333"] = new()
        {
            IcaoCode = "A333", Model = "A330-300", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["a330-300", "a333", "a330"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 240 },
        },
        ["A339"] = new()
        {
            IcaoCode = "A339", Model = "A330-900neo", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["a330-900", "a330neo", "a339"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 240 },
        },
        ["A342"] = new()
        {
            IcaoCode = "A342", Model = "A340-200", WakeTurbulence = 'H', EngineCount = 4,
            TitlePatterns = ["a340-200", "a342"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 235 },
        },
        ["A343"] = new()
        {
            IcaoCode = "A343", Model = "A340-300", WakeTurbulence = 'H', EngineCount = 4,
            TitlePatterns = ["a340-300", "a343", "a340"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 235 },
        },
        ["A359"] = new()
        {
            IcaoCode = "A359", Model = "A350-900", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["a350-900", "a359", "a350"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 235 },
        },
        ["A35K"] = new()
        {
            IcaoCode = "A35K", Model = "A350-1000", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["a350-1000", "a35k"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 235 },
        },
        ["A388"] = new()
        {
            IcaoCode = "A388", Model = "A380-800", WakeTurbulence = 'J', EngineCount = 4,
            TitlePatterns = ["a380"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 240 },
        },

        // ── Boeing 737 Family ───────────────────────────────────────────
        ["B736"] = new()
        {
            IcaoCode = "B736", Model = "737-600", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["737-600", "b736"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 230 },
        },
        ["B737"] = new()
        {
            IcaoCode = "B737", Model = "737-700", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["737-700", "b737"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 230 },
        },
        ["B738"] = new()
        {
            IcaoCode = "B738", Model = "737-800", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["737-800", "b738", "pmdg 737"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 230 },
        },
        ["B739"] = new()
        {
            IcaoCode = "B739", Model = "737-900", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["737-900", "b739"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 230 },
        },
        ["B38M"] = new()
        {
            IcaoCode = "B38M", Model = "737 MAX 8", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["737 max", "737max", "b38m"],
            Limits = new() { Vmo = 340, MaxFlapExtendSpeed = 230 },
        },

        // ── Boeing 747 Family ───────────────────────────────────────────
        ["B741"] = new()
        {
            IcaoCode = "B741", Model = "747-100", WakeTurbulence = 'H', EngineCount = 4,
            TitlePatterns = ["747-100", "b741"],
            Limits = new() { Vmo = 365, MaxFlapExtendSpeed = 250, MaxGearExtendSpeed = 270 },
        },
        ["B742"] = new()
        {
            IcaoCode = "B742", Model = "747-200", WakeTurbulence = 'H', EngineCount = 4,
            TitlePatterns = ["747-200", "b742"],
            Limits = new() { Vmo = 365, MaxFlapExtendSpeed = 250, MaxGearExtendSpeed = 270 },
        },
        ["B744"] = new()
        {
            IcaoCode = "B744", Model = "747-400", WakeTurbulence = 'H', EngineCount = 4,
            TitlePatterns = ["747-400", "b744"],
            Limits = new() { Vmo = 365, MaxFlapExtendSpeed = 250, MaxGearExtendSpeed = 270 },
        },
        ["B748"] = new()
        {
            IcaoCode = "B748", Model = "747-8", WakeTurbulence = 'H', EngineCount = 4,
            TitlePatterns = ["747-8", "b748", "747"],
            Limits = new() { Vmo = 365, MaxFlapExtendSpeed = 250, MaxGearExtendSpeed = 270 },
        },

        // ── Boeing 757/767 ──────────────────────────────────────────────
        ["B752"] = new()
        {
            IcaoCode = "B752", Model = "757-200", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["757-200", "b752", "757"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 230 },
        },
        ["B753"] = new()
        {
            IcaoCode = "B753", Model = "757-300", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["757-300", "b753"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 230 },
        },
        ["B762"] = new()
        {
            IcaoCode = "B762", Model = "767-200", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["767-200", "b762"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 230 },
        },
        ["B763"] = new()
        {
            IcaoCode = "B763", Model = "767-300", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["767-300", "b763", "767"],
            Limits = new() { Vmo = 350, MaxFlapExtendSpeed = 230 },
        },

        // ── Boeing 777/787 ──────────────────────────────────────────────
        ["B772"] = new()
        {
            IcaoCode = "B772", Model = "777-200", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["777-200", "b772"],
            Limits = new() { Vmo = 365, MaxFlapExtendSpeed = 240 },
        },
        ["B77W"] = new()
        {
            IcaoCode = "B77W", Model = "777-300ER", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["777-300", "b77w", "777"],
            Limits = new() { Vmo = 365, MaxFlapExtendSpeed = 240 },
        },
        ["B788"] = new()
        {
            IcaoCode = "B788", Model = "787-8", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["787-8", "b788"],
            Limits = new() { Vmo = 360, MaxFlapExtendSpeed = 235 },
        },
        ["B789"] = new()
        {
            IcaoCode = "B789", Model = "787-9", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["787-9", "b789"],
            Limits = new() { Vmo = 360, MaxFlapExtendSpeed = 235 },
        },
        ["B78X"] = new()
        {
            IcaoCode = "B78X", Model = "787-10", WakeTurbulence = 'H', EngineCount = 2,
            TitlePatterns = ["787-10", "b78x", "787"],
            Limits = new() { Vmo = 360, MaxFlapExtendSpeed = 235 },
        },

        // ── Regional Jets ───────────────────────────────────────────────
        ["E170"] = new()
        {
            IcaoCode = "E170", Model = "Embraer 170", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["e170"],
            Limits = new() { Vmo = 320, MaxFlapExtendSpeed = 220 },
        },
        ["E190"] = new()
        {
            IcaoCode = "E190", Model = "Embraer 190", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["e190", "e195", "ejet"],
            Limits = new() { Vmo = 320, MaxFlapExtendSpeed = 220 },
        },
        ["CRJ7"] = new()
        {
            IcaoCode = "CRJ7", Model = "CRJ-700", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["crj-700", "crj7"],
            Limits = new() { Vmo = 335, MaxFlapExtendSpeed = 220 },
        },
        ["CRJ9"] = new()
        {
            IcaoCode = "CRJ9", Model = "CRJ-900", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["crj-900", "crj9", "crj"],
            Limits = new() { Vmo = 335, MaxFlapExtendSpeed = 220 },
        },

        // ── Turboprop ───────────────────────────────────────────────────
        ["AT72"] = new()
        {
            IcaoCode = "AT72", Model = "ATR 72", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["atr 72", "at72", "atr"],
            Limits = new() { Vmo = 250, MaxFlapExtendSpeed = 185 },
        },
        ["AT45"] = new()
        {
            IcaoCode = "AT45", Model = "ATR 42", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["atr 42", "at45"],
            Limits = new() { Vmo = 250, MaxFlapExtendSpeed = 185 },
        },
        ["DH8D"] = new()
        {
            IcaoCode = "DH8D", Model = "Dash 8 Q400", WakeTurbulence = 'M', EngineCount = 2,
            TitlePatterns = ["q400", "dash 8", "dash-8", "dhc-8", "dhc8"],
            Limits = new() { Vmo = 275, MaxFlapExtendSpeed = 200 },
        },

        // ── General Aviation ────────────────────────────────────────────
        ["C172"] = new()
        {
            IcaoCode = "C172", Model = "Cessna 172", WakeTurbulence = 'L', EngineCount = 1,
            TitlePatterns = ["c172", "cessna 172", "skyhawk"],
            Limits = new() { Vmo = 163, MaxFlapExtendSpeed = 110, MaxTaxiSpeed = 15 },
        },
        ["C208"] = new()
        {
            IcaoCode = "C208", Model = "Cessna 208 Caravan", WakeTurbulence = 'L', EngineCount = 1,
            TitlePatterns = ["c208", "caravan"],
            Limits = new() { Vmo = 175, MaxFlapExtendSpeed = 120, MaxTaxiSpeed = 15 },
        },
        ["TBM9"] = new()
        {
            IcaoCode = "TBM9", Model = "TBM 930/940", WakeTurbulence = 'L', EngineCount = 1,
            TitlePatterns = ["tbm"],
            Limits = new() { Vmo = 266, MaxFlapExtendSpeed = 178, MaxTaxiSpeed = 15 },
        },
        ["BE20"] = new()
        {
            IcaoCode = "BE20", Model = "King Air 200", WakeTurbulence = 'L', EngineCount = 2,
            TitlePatterns = ["king air", "beechcraft"],
            Limits = new() { Vmo = 260, MaxFlapExtendSpeed = 160, MaxTaxiSpeed = 15 },
        },
    };

    // ── Fallback patterns for generic title matching ──────────────────
    // Used when none of the specific ICAO type patterns match.
    // Maps generic substrings → ICAO codes.
    private static readonly (string Pattern, string IcaoCode)[] GenericPatterns =
    [
        ("md-80", "MD82"), ("md80", "MD82"),
        ("md-10", "DC10"), ("md10", "DC10"),
        ("a32",   "A320"), ("737",  "B738"), ("747",  "B748"),
        ("757",   "B752"), ("767",  "B763"), ("777",  "B77W"),
        ("787",   "B789"), ("a330", "A333"), ("a340", "A343"),
        ("a350",  "A359"), ("a380", "A388"),
        ("e175",  "E190"), ("dash", "DH8D"),
    ];

    private static readonly AircraftLimits DefaultLimits = new();

    /// <summary>Detect ICAO aircraft type from the sim title string.</summary>
    public static IcaoAircraftType? DetectIcaoType(string title)
    {
        if (string.IsNullOrWhiteSpace(title)) return null;
        var lower = title.ToLowerInvariant();

        // First pass: exact ICAO type pattern matching
        foreach (var kvp in IcaoTypes)
        {
            if (kvp.Value.TitlePatterns.Any(pat => lower.Contains(pat)))
                return kvp.Value;
        }

        // Second pass: generic fallback patterns
        foreach (var (pattern, icaoCode) in GenericPatterns)
        {
            if (lower.Contains(pattern) && IcaoTypes.TryGetValue(icaoCode, out var type))
                return type;
        }

        return null;
    }

    /// <summary>Detect aircraft profile from the title string (legacy compat).</summary>
    public static AircraftVariableMap? DetectProfile(string title)
    {
        var icao = DetectIcaoType(title);
        if (icao == null) return null;
        return new AircraftVariableMap
        {
            Id = icao.IcaoCode,
            Name = icao.Model,
            TitlePatterns = icao.TitlePatterns,
            EngineCount = icao.EngineCount,
        };
    }

    /// <summary>Get aircraft-specific limits by ICAO code or title substring.</summary>
    public static AircraftLimits GetLimits(string aircraftType)
    {
        if (string.IsNullOrWhiteSpace(aircraftType)) return DefaultLimits;

        // Direct ICAO code lookup
        if (IcaoTypes.TryGetValue(aircraftType, out var exact))
            return exact.Limits;

        // Substring match against all ICAO entries
        var lower = aircraftType.ToLowerInvariant();
        foreach (var kvp in IcaoTypes)
        {
            if (kvp.Value.TitlePatterns.Any(pat => lower.Contains(pat)))
                return kvp.Value.Limits;
        }

        // Generic fallback patterns
        foreach (var (pattern, icaoCode) in GenericPatterns)
        {
            if (lower.Contains(pattern) && IcaoTypes.TryGetValue(icaoCode, out var type))
                return type.Limits;
        }

        return DefaultLimits;
    }
}

/// <summary>
/// Aircraft category mapping for rank restriction checks.
/// Derives category from ICAO wake turbulence when possible.
/// </summary>
public static class AircraftCategoryMap
{
    public static AircraftCategory GetCategory(string aircraftType)
    {
        if (string.IsNullOrWhiteSpace(aircraftType)) return AircraftCategory.SEP;

        // Try ICAO type lookup first (uses wake turbulence + engine count)
        IcaoAircraftType? icao = null;

        if (AircraftProfiles.IcaoTypes.TryGetValue(aircraftType, out var direct))
            icao = direct;
        else
            icao = AircraftProfiles.DetectIcaoType(aircraftType);

        if (icao != null)
        {
            return icao.WakeTurbulence switch
            {
                'J' => AircraftCategory.Superheavy,
                'H' when icao.EngineCount >= 4 => AircraftCategory.Superheavy,
                'H' => AircraftCategory.Heavy,
                'M' when icao.IcaoCode.StartsWith("AT") || icao.IcaoCode.StartsWith("DH") || icao.IcaoCode == "TBM9" || icao.IcaoCode == "BE20" => AircraftCategory.Turboprop,
                'M' when icao.IcaoCode.StartsWith("E1") || icao.IcaoCode.StartsWith("CRJ") => AircraftCategory.Narrowbody,
                'M' => AircraftCategory.Narrowbody,
                'L' when icao.EngineCount >= 2 => AircraftCategory.MEP,
                'L' => AircraftCategory.SEP,
                _ => AircraftCategory.SEP,
            };
        }

        return AircraftCategory.SEP;
    }
}
