namespace LevantACARS.Models;

/// <summary>Flight phase state machine states.</summary>
public enum FlightPhase
{
    Preflight,
    Boarding,
    TaxiOut,
    TakeoffRoll,
    Takeoff,
    InitialClimb,
    Climb,
    Cruise,
    Descend,
    Approach,
    FinalApproach,
    Landing,
    Landed,
    TaxiIn,
    Arrived,
    Shutdown
}

/// <summary>Exceedance severity levels.</summary>
public enum ExceedanceSeverity
{
    Info,
    Warning,
    Critical
}

/// <summary>Types of exceedance violations.</summary>
public enum ExceedanceType
{
    TaxiSpeed,
    Overspeed,
    SpeedBelow10K,
    Lights,
    GearSafety,
    FlapStress,
    UnstableApproach,
    BankAngle,
    GForce,
    Stall,
    Other
}

/// <summary>Landing grade classification.</summary>
public enum LandingGrade
{
    Butter,
    VerySmooth,
    Smooth,
    Normal,
    Hard,
    VeryHard,
    Crash
}

/// <summary>PIREP status.</summary>
public enum FlightStatus
{
    Active,
    Completed,
    Rejected,
    PendingReview
}

/// <summary>Simulator connection mode.</summary>
public enum SimMode
{
    Fsuipc,
    Xpuipc
}

/// <summary>Aircraft weight category for rank restrictions.</summary>
public enum AircraftCategory
{
    SEP,
    MEP,
    Turboprop,
    Narrowbody,
    Widebody,
    Heavy,
    Superheavy
}
