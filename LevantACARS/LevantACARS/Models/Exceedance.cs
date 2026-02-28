namespace LevantACARS.Models;

/// <summary>
/// An in-flight exceedance violation detected by the rules engine.
/// </summary>
public sealed record Exceedance
{
    public ExceedanceType Type { get; init; }
    public double Value { get; init; }
    public double Limit { get; init; }
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
    public ExceedanceSeverity Severity { get; init; } = ExceedanceSeverity.Warning;
    public string Phase { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
}
