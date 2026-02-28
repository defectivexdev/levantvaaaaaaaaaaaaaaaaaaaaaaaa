using Microsoft.Extensions.Logging;
using LevantACARS.Models;

namespace LevantACARS.Services;

/// <summary>
/// Exceedance rules engine — evaluates 9 safety rules on every telemetry packet.
/// Migrated from TypeScript FlightDataProxy.ts.
/// </summary>
public sealed class ExceedanceProxy
{
    private readonly ILogger<ExceedanceProxy> _logger;
    private readonly RunwayDetector _runwayDetector;
    private int _packetCount;

    // ── Per-rule debounce flags (fire once, reset when condition clears) ──
    private bool _taxiSpeedActive;
    private bool _overspeedActive;
    private bool _speedBelow10kActive;
    private bool _lightsAbove10kActive;
    private bool _lightsApproachActive;
    private bool _gearSafetyActive;
    private bool _flapStressActive;
    private bool _unstableApproachActive;
    private bool _bankAngleActive;
    private bool _gForceActive;
    private bool _stallActive;

    public ExceedanceProxy(ILogger<ExceedanceProxy> logger, RunwayDetector runwayDetector)
    {
        _logger = logger;
        _runwayDetector = runwayDetector;
    }

    public void ResetPacketCount()
    {
        _packetCount = 0;
        // Reset all debounce flags at flight start
        _taxiSpeedActive = false;
        _overspeedActive = false;
        _speedBelow10kActive = false;
        _lightsAbove10kActive = false;
        _lightsApproachActive = false;
        _gearSafetyActive = false;
        _flapStressActive = false;
        _unstableApproachActive = false;
        _bankAngleActive = false;
        _gForceActive = false;
        _stallActive = false;
    }

    /// <summary>
    /// Evaluate all exceedance rules against the current telemetry snapshot.
    /// Returns a list of violations (may be empty).
    /// </summary>
    public List<Exceedance> Evaluate(FlightData data, string aircraftType = "")
    {
        var results = new List<Exceedance>();
        var limits = AircraftProfiles.GetLimits(aircraftType);
        var now = DateTime.UtcNow;
        var phase = data.Phase.ToString();

        _packetCount++;
        if (_packetCount % 50 == 0)
        {
            _logger.LogDebug("[Proxy] Packet #{Count}: ALT={Alt} GS={Gs} IAS={Ias} Phase={Phase}",
                _packetCount, data.Altitude, data.GroundSpeed, data.Ias, phase);
        }

        // ── Rule 1: Taxi Speed (debounced + phase-gated) ──────────────
        {
            // Skip entirely if in any takeoff/climb phase
            bool isRunwayOrAirborne = data.Phase is FlightPhase.TakeoffRoll or FlightPhase.Takeoff
                or FlightPhase.InitialClimb or FlightPhase.Climb
                or FlightPhase.Cruise or FlightPhase.Descend
                or FlightPhase.Approach or FlightPhase.FinalApproach
                or FlightPhase.Landing or FlightPhase.Landed;

            // GPS runway detection: suppress if aircraft is physically on a runway
            bool isOnRunway = _runwayDetector.IsOnRunway(data.Latitude, data.Longitude);

            bool speedExceeded = data.OnGround && data.GroundSpeed > limits.MaxTaxiSpeed;
            bool isTakeoffRollContext = data.Ias > 80 || data.GroundSpeed > 60;

            if (!isRunwayOrAirborne && !isOnRunway && speedExceeded && !isTakeoffRollContext)
            {
                if (!_taxiSpeedActive)
                {
                    _taxiSpeedActive = true;
                    results.Add(new Exceedance
                    {
                        Type = ExceedanceType.TaxiSpeed,
                        Value = data.GroundSpeed,
                        Limit = limits.MaxTaxiSpeed,
                        Timestamp = now,
                        Severity = data.GroundSpeed > 35 ? ExceedanceSeverity.Critical : ExceedanceSeverity.Warning,
                        Phase = phase,
                        Description = $"Taxi speed {data.GroundSpeed} kts (max {limits.MaxTaxiSpeed})",
                    });
                }
            }
            else
            {
                _taxiSpeedActive = false; // Reset when speed drops or phase changes
            }
        }

        // ── Rule 2: Overspeed (Vmo/Mmo) — debounced ──────────────────
        if (!data.OnGround && data.Ias > limits.Vmo)
        {
            if (!_overspeedActive)
            {
                _overspeedActive = true;
                results.Add(new Exceedance
                {
                    Type = ExceedanceType.Overspeed,
                    Value = data.Ias,
                    Limit = limits.Vmo,
                    Timestamp = now,
                    Severity = data.Ias > limits.Vmo + 20 ? ExceedanceSeverity.Critical : ExceedanceSeverity.Warning,
                    Phase = phase,
                    Description = $"IAS {data.Ias} kts exceeds Vmo {limits.Vmo}",
                });
            }
        }
        else { _overspeedActive = false; }

        // ── Rule 3: 250 kts below 10,000 ft — debounced ──────────────
        {
            bool below10kViolation = !data.OnGround && data.Altitude < 10000 && data.Ias > 250;
            bool isClimbOrDescent = data.Phase is FlightPhase.InitialClimb or FlightPhase.Climb
                or FlightPhase.Descend or FlightPhase.Approach or FlightPhase.FinalApproach;

            if (below10kViolation && isClimbOrDescent)
            {
                if (!_speedBelow10kActive)
                {
                    _speedBelow10kActive = true;
                    results.Add(new Exceedance
                    {
                        Type = ExceedanceType.SpeedBelow10K,
                        Value = data.Ias,
                        Limit = 250,
                        Timestamp = now,
                        Severity = data.Ias > 270 ? ExceedanceSeverity.Critical : ExceedanceSeverity.Warning,
                        Phase = phase,
                        Description = $"IAS {data.Ias} kts below FL100 (max 250)",
                    });
                }
            }
            else { _speedBelow10kActive = false; }
        }

        // ── Rule 4: Landing Lights — debounced ──────────────────────────
        bool landingLightsOn = (data.Lights & 0x04) != 0;
        if (!data.OnGround)
        {
            // Above 10,000 ft — landing lights should be OFF
            if (data.Altitude > 10000 && landingLightsOn)
            {
                if (!_lightsAbove10kActive)
                {
                    _lightsAbove10kActive = true;
                    results.Add(new Exceedance
                    {
                        Type = ExceedanceType.Lights,
                        Value = data.Altitude,
                        Limit = 10000,
                        Timestamp = now,
                        Severity = ExceedanceSeverity.Info,
                        Phase = phase,
                        Description = $"Landing lights ON above {data.Altitude} ft",
                    });
                }
            }
            else { _lightsAbove10kActive = false; }

            // Below 10,000 ft during approach — landing lights should be ON
            bool isApproach = data.Phase is FlightPhase.Descend or FlightPhase.Approach or FlightPhase.FinalApproach;
            if (data.Altitude < 10000 && !landingLightsOn && isApproach)
            {
                if (!_lightsApproachActive)
                {
                    _lightsApproachActive = true;
                    results.Add(new Exceedance
                    {
                        Type = ExceedanceType.Lights,
                        Value = data.Altitude,
                        Limit = 10000,
                        Timestamp = now,
                        Severity = ExceedanceSeverity.Warning,
                        Phase = phase,
                        Description = $"Landing lights OFF below {data.Altitude} ft on approach",
                    });
                }
            }
            else { _lightsApproachActive = false; }
        }
        else
        {
            _lightsAbove10kActive = false;
            _lightsApproachActive = false;
        }

        // ── Rule 5: Gear Safety — debounced ─────────────────────────────
        bool gearDown = data.GearPosition > 50;
        {
            bool gearViolation = !data.OnGround && !gearDown && data.Altitude < 2500;
            bool isLowPhase = data.Phase is FlightPhase.Approach or FlightPhase.FinalApproach or FlightPhase.Landing;
            if (gearViolation && isLowPhase)
            {
                if (!_gearSafetyActive)
                {
                    _gearSafetyActive = true;
                    results.Add(new Exceedance
                    {
                        Type = ExceedanceType.GearSafety,
                        Value = data.Altitude,
                        Limit = 2500,
                        Timestamp = now,
                        Severity = ExceedanceSeverity.Critical,
                        Phase = phase,
                        Description = $"Gear UP at {data.Altitude} ft on {phase}",
                    });
                }
            }
            else { _gearSafetyActive = false; }
        }

        // ── Rule 6: Flap Stress — debounced ─────────────────────────────
        if (data.FlapsPosition > 0 && data.Ias > limits.MaxFlapExtendSpeed)
        {
            if (!_flapStressActive)
            {
                _flapStressActive = true;
                results.Add(new Exceedance
                {
                    Type = ExceedanceType.FlapStress,
                    Value = data.Ias,
                    Limit = limits.MaxFlapExtendSpeed,
                    Timestamp = now,
                    Severity = data.Ias > limits.MaxFlapExtendSpeed + 20 ? ExceedanceSeverity.Critical : ExceedanceSeverity.Warning,
                    Phase = phase,
                    Description = $"Flaps deployed at IAS {data.Ias} kts (max {limits.MaxFlapExtendSpeed})",
                });
            }
        }
        else { _flapStressActive = false; }

        // ── Rule 7: Stabilized Approach (1,000 ft AGL check) — debounced ─
        int agl = data.RadioAltitude > 0 ? data.RadioAltitude : data.Altitude;
        {
            bool inApproachWindow = !data.OnGround && agl is <= 1000 and > 200;
            bool isApproachPhase = data.Phase is FlightPhase.Approach or FlightPhase.FinalApproach;

            if (inApproachWindow && isApproachPhase && data.VerticalSpeed < -1000)
            {
                if (!_unstableApproachActive)
                {
                    _unstableApproachActive = true;
                    results.Add(new Exceedance
                    {
                        Type = ExceedanceType.UnstableApproach,
                        Value = data.VerticalSpeed,
                        Limit = -1000,
                        Timestamp = now,
                        Severity = ExceedanceSeverity.Critical,
                        Phase = phase,
                        Description = $"Unstable approach: V/S {data.VerticalSpeed} fpm at {agl} ft AGL",
                    });
                }
            }
            else { _unstableApproachActive = false; }

            if (inApproachWindow && isApproachPhase && Math.Abs(data.Bank) > limits.MaxApproachBank)
            {
                if (!_bankAngleActive)
                {
                    _bankAngleActive = true;
                    results.Add(new Exceedance
                    {
                        Type = ExceedanceType.BankAngle,
                        Value = Math.Abs(data.Bank),
                        Limit = limits.MaxApproachBank,
                        Timestamp = now,
                        Severity = ExceedanceSeverity.Warning,
                        Phase = phase,
                        Description = $"Excessive bank {Math.Abs(data.Bank):F0}° on approach at {agl} ft AGL",
                    });
                }
            }
            else { _bankAngleActive = false; }
        }

        // ── Rule 8: G-Force — debounced ─────────────────────────────────
        if (data.GForce > 2.0)
        {
            if (!_gForceActive)
            {
                _gForceActive = true;
                results.Add(new Exceedance
                {
                    Type = ExceedanceType.GForce,
                    Value = data.GForce,
                    Limit = 2.0,
                    Timestamp = now,
                    Severity = data.GForce > 2.5 ? ExceedanceSeverity.Critical : ExceedanceSeverity.Warning,
                    Phase = phase,
                    Description = $"G-force {data.GForce:F2}G (limit 2.0G)",
                });
            }
        }
        else { _gForceActive = false; }

        // ── Rule 9: Stall Warning — debounced ───────────────────────────
        if (data.StallWarning && !data.OnGround)
        {
            if (!_stallActive)
            {
                _stallActive = true;
                results.Add(new Exceedance
                {
                    Type = ExceedanceType.Stall,
                    Value = data.Ias,
                    Limit = 0,
                    Timestamp = now,
                    Severity = ExceedanceSeverity.Critical,
                    Phase = phase,
                    Description = $"Stall warning at IAS {data.Ias} kts, ALT {data.Altitude} ft",
                });
            }
        }
        else { _stallActive = false; }

        return results;
    }
}
