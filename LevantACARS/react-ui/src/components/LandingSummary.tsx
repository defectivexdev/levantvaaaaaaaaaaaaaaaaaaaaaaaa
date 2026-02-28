import { WobbleCard } from './ui/wobble-card';
import { Meteors } from './ui/meteors';
import { TextGenerateEffect } from './ui/text-generate-effect';
import { cn } from './ui/utils';
import type { ScoreResult, FlightState } from '../types';

interface Props {
  score: ScoreResult;
  flight: FlightState;
}

function getGradeColor(grade: string): string {
  switch (grade?.toLowerCase()) {
    case 'greased':    return 'text-cyan-400';
    case 'great':      return 'text-emerald-400';
    case 'average':    return 'text-yellow-400';
    case 'hard':       return 'text-orange-400';
    case 'structural': return 'text-rose-400';
    default:           return 'text-accent-gold';
  }
}

function getGradeBg(grade: string): string {
  switch (grade?.toLowerCase()) {
    case 'greased':    return 'bg-cyan-500/10 border-cyan-500/20';
    case 'great':      return 'bg-emerald-500/10 border-emerald-500/20';
    case 'average':    return 'bg-yellow-500/10 border-yellow-500/20';
    case 'hard':       return 'bg-orange-500/10 border-orange-500/20';
    case 'structural': return 'bg-rose-500/10 border-rose-500/20';
    default:           return 'bg-accent-gold/10 border-accent-gold/20';
  }
}

export default function LandingSummary({ score, flight }: Props) {
  const fpm = flight.landingRate || 0;
  const reportString = `${flight.callsign} has landed at ${flight.arrivalIcao} with a landing rate of ${fpm.toFixed(2)}fpm and performance score of ${score.finalScore}%.`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      {/* Main Landing Report */}
      <WobbleCard
        containerClassName="col-span-1 lg:col-span-2 min-h-[140px]"
        className="p-4 flex flex-col gap-3"
      >
        <div className="flex items-center gap-2">
          <span className="telemetry-label">Landing Performance</span>
          <span className={cn(
            'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border',
            getGradeBg(score.landingGrade),
            getGradeColor(score.landingGrade),
          )}>
            {score.landingGrade}
          </span>
        </div>

        <TextGenerateEffect
          words={reportString}
          className="text-sm text-slate-300 leading-relaxed"
        />

        <div className="flex items-center gap-4 mt-auto">
          <div>
            <span className="telemetry-label block mb-1">Score</span>
            <span className={cn('telemetry-value text-2xl', score.finalScore >= 80 ? 'text-cyan-400 active-telemetry' : score.finalScore >= 50 ? 'text-yellow-400' : 'text-rose-400')}>
              {score.finalScore}%
            </span>
          </div>
          <div>
            <span className="telemetry-label block mb-1">Rate</span>
            <span className="telemetry-value text-2xl font-bold" style={{ color: Math.abs(fpm) <= 250 ? '#00cfd5' : Math.abs(fpm) <= 500 ? '#f8fafc' : Math.abs(fpm) <= 700 ? '#fbbf24' : '#ef4444' }}>{fpm.toFixed(0)} <span className="telemetry-unit">FPM</span></span>
          </div>
          {score.xpEarned > 0 && (
            <div>
              <span className="telemetry-label block mb-1">XP Earned</span>
              <span className="telemetry-value text-2xl text-accent-cyan">+{score.xpEarned}</span>
            </div>
          )}
        </div>

        {score.rejected && (
          <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mt-1">
            {score.rejectionReason}
          </div>
        )}

        <Meteors number={12} />
      </WobbleCard>

      {/* Grade Badge */}
      <WobbleCard
        containerClassName="col-span-1 min-h-[140px]"
        className="p-4 flex flex-col items-center justify-center gap-2"
      >
        <span className="telemetry-label">Touchdown Grade</span>
        <span className={cn('text-4xl font-mono font-bold', getGradeColor(score.landingGrade))}>
          {score.landingGrade?.toUpperCase() || 'N/A'}
        </span>
        <div className="flex items-center gap-3 mt-2">
          <div className="text-center">
            <span className="telemetry-label block">Flight</span>
            <span className="text-xs font-mono text-white font-bold">{flight.flightTime}</span>
          </div>
          <div className="text-center">
            <span className="telemetry-label block">Route</span>
            <span className="text-xs font-mono text-white font-bold">{flight.departureIcao}→{flight.arrivalIcao}</span>
          </div>
        </div>
      </WobbleCard>
    </div>
  );
}
