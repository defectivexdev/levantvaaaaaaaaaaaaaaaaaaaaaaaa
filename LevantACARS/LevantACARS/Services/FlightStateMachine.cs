using Microsoft.Extensions.Logging;
using LevantACARS.Models;

namespace LevantACARS.Services;

/// <summary>
/// Thread-safe flight phase state machine.
/// Transitions: Preflight → TaxiOut → TakeoffRoll → Takeoff → InitialClimb → Climb → Cruise → Descend → Approach → FinalApproach → Landing → Landed → TaxiIn → Arrived → Shutdown
/// Debounce logic prevents rapid toggling between phases.
/// </summary>
public sealed class FlightStateMachine
{
    private readonly ILogger<FlightStateMachine> _logger;
    private readonly object _lock = new();

    private FlightPhase _currentPhase = FlightPhase.Preflight;
    private long _phaseChangeTime;
    private long _airborneStartTime;
    private int _postLandingGsStable;
#pragma warning disable CS0414
    private bool _hasLanded;
#pragma warning restore CS0414

    // ── Events ──────────────────────────────────────────────────────────────
    public event Action<FlightPhase, FlightPhase>? OnPhaseChanged;

    public FlightPhase CurrentPhase
    {
        get { lock (_lock) return _currentPhase; }
    }

    public FlightStateMachine(ILogger<FlightStateMachine> logger)
    {
        _logger = logger;
    }

    /// <summary>Reset for a new flight.</summary>
    public void Reset()
    {
        lock (_lock)
        {
            _currentPhase = FlightPhase.Preflight;
            _phaseChangeTime = 0;
            _airborneStartTime = 0;
            _postLandingGsStable = 0;
            _hasLanded = false;
        }
    }

    /// <summary>
    /// Evaluate the current telemetry and transition phases as needed.
    /// Called on every poll cycle (~5Hz).
    /// </summary>
    public FlightPhase Evaluate(FlightData data)
    {
        lock (_lock)
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var timeSinceChange = now - _phaseChangeTime;
            var prev = _currentPhase;

            switch (_currentPhase)
            {
                case FlightPhase.Preflight:
                    // Engines on + parking brake off → taxi out
                    if (data.EnginesOn && !data.ParkingBrake && data.GroundSpeed > 2)
                        TransitionTo(FlightPhase.TaxiOut, now);
                    break;

                case FlightPhase.Boarding:
                    if (data.EnginesOn && !data.ParkingBrake && data.GroundSpeed > 2)
                        TransitionTo(FlightPhase.TaxiOut, now);
                    break;

                case FlightPhase.TaxiOut:
                    // High throttle + accelerating → takeoff roll
                    if (data.OnGround && timeSinceChange > 3000 &&
                        (
                            (data.Throttle > 70 && data.GroundSpeed > 40) ||
                            (data.GroundSpeed > 60) ||
                            (data.Ias > 80)
                        ))
                        TransitionTo(FlightPhase.TakeoffRoll, now);
                    break;

                case FlightPhase.TakeoffRoll:
                    // Wheels off ground → takeoff
                    if (!data.OnGround && timeSinceChange > 1000)
                    {
                        _airborneStartTime = now;
                        TransitionTo(FlightPhase.Takeoff, now);
                    }
                    // Aborted takeoff (slowing down on ground)
                    if (data.OnGround && data.GroundSpeed < 30 && timeSinceChange > 5000)
                        TransitionTo(FlightPhase.TaxiOut, now);
                    break;

                case FlightPhase.Takeoff:
                    // Climbing above 1000 AGL → initial climb
                    if (!data.OnGround && data.RadioAltitude > 1000 && data.VerticalSpeed > 200 && timeSinceChange > 5000)
                        TransitionTo(FlightPhase.InitialClimb, now);
                    break;

                case FlightPhase.InitialClimb:
                    // Above 10,000 ft or climbing steadily for a while → climb
                    if (data.Altitude > 10000 && timeSinceChange > 10000)
                        TransitionTo(FlightPhase.Climb, now);
                    else if (data.Altitude > 5000 && data.VerticalSpeed > 500 && timeSinceChange > 30000)
                        TransitionTo(FlightPhase.Climb, now);
                    break;

                case FlightPhase.Climb:
                    // Level off (V/S near 0 at altitude) → cruise
                    if (Math.Abs(data.VerticalSpeed) < 300 && data.Altitude > 10000 && timeSinceChange > 30000)
                        TransitionTo(FlightPhase.Cruise, now);
                    // Also transition if we've been climbing for 5+ minutes
                    if (Math.Abs(data.VerticalSpeed) < 500 && timeSinceChange > 300000)
                        TransitionTo(FlightPhase.Cruise, now);
                    break;

                case FlightPhase.Cruise:
                    // Start descending → descend
                    if (data.VerticalSpeed < -300 && timeSinceChange > 30000)
                        TransitionTo(FlightPhase.Descend, now);
                    break;

                case FlightPhase.Descend:
                    // Below 12,000 ft and descending → approach
                    if (data.Altitude < 12000 && data.VerticalSpeed < -100 && timeSinceChange > 15000)
                        TransitionTo(FlightPhase.Approach, now);
                    // Leveled off → back to cruise
                    if (Math.Abs(data.VerticalSpeed) < 200 && data.Altitude > 15000 && timeSinceChange > 60000)
                        TransitionTo(FlightPhase.Cruise, now);
                    break;

                case FlightPhase.Approach:
                    // Below 3,000 ft AGL → final approach
                    if (data.RadioAltitude < 3000 && data.RadioAltitude > 0 && timeSinceChange > 10000)
                        TransitionTo(FlightPhase.FinalApproach, now);
                    break;

                case FlightPhase.FinalApproach:
                    // Touchdown → landing
                    if (data.OnGround && timeSinceChange > 2000)
                    {
                        _hasLanded = true;
                        TransitionTo(FlightPhase.Landing, now);
                    }
                    break;

                case FlightPhase.Landing:
                    // Decelerated → landed
                    if (data.OnGround && data.GroundSpeed < 60 && timeSinceChange > 3000)
                    {
                        _postLandingGsStable++;
                        if (_postLandingGsStable >= 5)
                            TransitionTo(FlightPhase.Landed, now);
                    }
                    else
                    {
                        _postLandingGsStable = 0;
                    }
                    break;

                case FlightPhase.Landed:
                    // Moving slowly → taxi in
                    if (data.OnGround && data.GroundSpeed > 2 && data.GroundSpeed < 25 && timeSinceChange > 5000)
                        TransitionTo(FlightPhase.TaxiIn, now);
                    // Stopped with parking brake → arrived
                    if (data.OnGround && data.GroundSpeed < 2 && data.ParkingBrake && timeSinceChange > 3000)
                        TransitionTo(FlightPhase.Arrived, now);
                    // Engines off while stopped → skip straight to shutdown (auto-submit)
                    if (data.OnGround && data.GroundSpeed < 2 && !data.EnginesOn && timeSinceChange > 3000)
                        TransitionTo(FlightPhase.Shutdown, now);
                    break;

                case FlightPhase.TaxiIn:
                    // Stopped with parking brake → arrived
                    if (data.OnGround && data.GroundSpeed < 2 && data.ParkingBrake && timeSinceChange > 5000)
                        TransitionTo(FlightPhase.Arrived, now);
                    // Engines off while stopped → skip straight to shutdown (auto-submit)
                    if (data.OnGround && data.GroundSpeed < 2 && !data.EnginesOn && timeSinceChange > 3000)
                        TransitionTo(FlightPhase.Shutdown, now);
                    break;

                case FlightPhase.Arrived:
                    // Engines off → shutdown
                    if (!data.EnginesOn && timeSinceChange > 3000)
                        TransitionTo(FlightPhase.Shutdown, now);
                    break;

                case FlightPhase.Shutdown:
                    // Terminal state
                    break;
            }

            return _currentPhase;
        }
    }

    private void TransitionTo(FlightPhase newPhase, long now)
    {
        var old = _currentPhase;
        _currentPhase = newPhase;
        _phaseChangeTime = now;
        _logger.LogInformation("[StateMachine] {Old} → {New}", old, newPhase);
        OnPhaseChanged?.Invoke(old, newPhase);
    }
}
