using LevantACARS.Models;

namespace LevantACARS.Services;

/// <summary>
/// Composite flight scoring engine.
/// Migrated from TypeScript ScoringEngine.ts — calculates landing grades, exceedance penalties, XP, and rank promotions.
/// </summary>
public sealed class ScoringEngine
{
    // ─── Penalty Weights per Exceedance Type ────────────────────────────────
    private static readonly Dictionary<ExceedanceType, (int Info, int Warning, int Critical)> Penalties = new()
    {
        [ExceedanceType.TaxiSpeed]        = (0, 2,  5),
        [ExceedanceType.Overspeed]        = (0, 5,  10),
        [ExceedanceType.SpeedBelow10K]    = (0, 3,  7),
        [ExceedanceType.Lights]           = (0, 2,  2),
        [ExceedanceType.GearSafety]       = (0, 5,  10),
        [ExceedanceType.FlapStress]       = (0, 3,  7),
        [ExceedanceType.UnstableApproach] = (0, 5,  10),
        [ExceedanceType.BankAngle]        = (0, 2,  5),
        [ExceedanceType.GForce]           = (0, 3,  8),
        [ExceedanceType.Stall]            = (0, 5,  15),
        [ExceedanceType.Other]            = (0, 2,  5),
    };

    // ─── Landing Grade ──────────────────────────────────────────────────────

    public sealed record LandingGradeResult(
        LandingGrade Grade,
        int Penalty,
        int BonusXp,
        string Description
    );

    public static LandingGradeResult GradeLanding(double landingRate, double gForce)
    {
        double absRate = Math.Abs(landingRate);

        // G-Force override
        if (gForce > 2.5)
            return new(LandingGrade.Crash, 100, 0, $"Crash landing ({gForce:F1}G)");
        if (gForce > 1.7)
            return new(LandingGrade.Hard, 15, 0, $"Hard landing ({gForce:F1}G)");

        // V/S-based grading
        if (absRate <= 50)  return new(LandingGrade.Butter,     0,  10, $"Butter! ({absRate:F0} fpm)");
        if (absRate <= 150) return new(LandingGrade.VerySmooth,  0,  5,  $"Very smooth ({absRate:F0} fpm)");
        if (absRate <= 250) return new(LandingGrade.Smooth,      0,  2,  $"Smooth ({absRate:F0} fpm)");
        if (absRate <= 400) return new(LandingGrade.Normal,      0,  0,  $"Normal ({absRate:F0} fpm)");
        if (absRate <= 600) return new(LandingGrade.Hard,        15, 0,  $"Hard landing ({absRate:F0} fpm)");
        if (absRate <= 900) return new(LandingGrade.VeryHard,    20, 0,  $"Very hard landing ({absRate:F0} fpm)");

        return new(LandingGrade.Crash, 100, 0, $"Crash ({absRate:F0} fpm)");
    }

    // ─── Composite Score Calculation ────────────────────────────────────────

    public sealed record ScoreResult(
        int FinalScore,
        int ExceedancePenalty,
        int LandingPenalty,
        LandingGradeResult LandingGrade,
        int XpEarned,
        bool Rejected,
        string RejectionReason
    );

    public static ScoreResult CalculateFlightScore(
        IReadOnlyList<Exceedance> exceedances,
        double landingRate,
        double gForce,
        double flightTimeMinutes,
        bool crashed = false)
    {
        const int baseScore = 100;

        // 1. Exceedance penalties (capped per type: max 3 instances counted)
        var typePenalties = new Dictionary<ExceedanceType, int>();
        const int maxInstances = 3;

        foreach (var exc in exceedances)
        {
            var pen = Penalties.GetValueOrDefault(exc.Type, Penalties[ExceedanceType.Other]);
            int penalty = exc.Severity switch
            {
                ExceedanceSeverity.Info => pen.Info,
                ExceedanceSeverity.Warning => pen.Warning,
                ExceedanceSeverity.Critical => pen.Critical,
                _ => 0
            };

            int instanceCount = exceedances.Count(e => e.Type == exc.Type);
            if (!typePenalties.ContainsKey(exc.Type))
                typePenalties[exc.Type] = 0;

            if (instanceCount <= maxInstances)
                typePenalties[exc.Type] += penalty;
            else if (typePenalties[exc.Type] == 0)
                typePenalties[exc.Type] = penalty * maxInstances;
        }

        int exceedancePenalty = typePenalties.Values.Sum();

        // 2. Landing grade penalty
        var landingGrade = GradeLanding(landingRate, gForce);
        int landingPenalty = landingGrade.Penalty;

        // 3. Crash override
        if (crashed || landingGrade.Grade == LandingGrade.Crash)
        {
            return new ScoreResult(
                FinalScore: 0,
                ExceedancePenalty: exceedancePenalty,
                LandingPenalty: 100,
                LandingGrade: new(LandingGrade.Crash, 100, 0, "Flight crashed"),
                XpEarned: 0,
                Rejected: true,
                RejectionReason: "Crash detected — flight rejected."
            );
        }

        // 4. Final score
        int finalScore = Math.Max(0, baseScore - exceedancePenalty - landingPenalty);

        // 5. XP Calculation
        double flightHours = flightTimeMinutes / 60.0;
        int baseXp = (int)Math.Round(flightHours * 100);
        double scoreMultiplier = finalScore / 100.0;
        int landingBonusXp = landingGrade.BonusXp;
        int xpEarned = (int)Math.Round(baseXp * scoreMultiplier) + landingBonusXp;

        // 6. Rejection check
        bool rejected = finalScore < 70;
        string rejectionReason = rejected
            ? $"Score {finalScore}% below minimum threshold (70%). Flight not credited."
            : string.Empty;

        return new ScoreResult(
            FinalScore: finalScore,
            ExceedancePenalty: exceedancePenalty,
            LandingPenalty: landingPenalty,
            LandingGrade: landingGrade,
            XpEarned: rejected ? 0 : xpEarned,
            Rejected: rejected,
            RejectionReason: rejectionReason
        );
    }

    // ─── Rank Promotion Check ───────────────────────────────────────────────

    public sealed record RankCheckResult(
        string CurrentRank,
        string? NewRank,
        bool Promoted,
        int? NextRankXp,
        int XpToNext
    );

    public static RankCheckResult CheckRankPromotion(int currentXp, string currentRank)
    {
        string qualifiedRank = RankConfig.Thresholds[0].Rank;
        foreach (var (rank, xpRequired) in RankConfig.Thresholds)
        {
            if (currentXp >= xpRequired)
                qualifiedRank = rank;
        }

        bool promoted = qualifiedRank != currentRank;
        string? newRank = promoted ? qualifiedRank : null;

        int currentIdx = Array.FindIndex(RankConfig.Thresholds, t => t.Rank == (newRank ?? currentRank));
        int? nextRankXp = currentIdx < RankConfig.Thresholds.Length - 1
            ? RankConfig.Thresholds[currentIdx + 1].XpRequired
            : null;

        return new RankCheckResult(
            CurrentRank: newRank ?? currentRank,
            NewRank: newRank,
            Promoted: promoted,
            NextRankXp: nextRankXp,
            XpToNext: nextRankXp.HasValue ? Math.Max(0, nextRankXp.Value - currentXp) : 0
        );
    }
}
