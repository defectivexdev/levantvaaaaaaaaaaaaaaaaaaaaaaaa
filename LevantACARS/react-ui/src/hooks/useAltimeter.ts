import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

/** ISA constants */
const ISA_SEA_LEVEL_PRESSURE_HPA = 1013.25;
const HPA_PER_INHG = 33.8639;

/** US transition altitude (FL180) */
const TRANSITION_ALT_FT = 18000;

export interface AltimeterState {
  /** Indicated altitude in feet (adjusted for QNH) */
  indicatedAltitude: number;
  /** Pressure altitude in feet (std 1013.25 hPa) */
  pressureAltitude: number;
  /** Formatted altitude string for PFD display (rounded to nearest 10 ft) */
  displayAltitude: string;
  /** Current QNH in hPa */
  qnhHpa: number;
  /** Current QNH in inHg */
  qnhInHg: string;
  /** Whether standard pressure is active */
  isStandard: boolean;
  /** Warning: above transition altitude but not on STD */
  transitionWarning: boolean;
  /** Vertical speed in ft/min (smoothed) */
  verticalSpeed: number;
  /** Toggle between STD and local QNH */
  toggleStandard: () => void;
  /** Set local QNH (hPa) */
  setLocalQnh: (hpa: number) => void;
}

/**
 * Barometric altitude hook using the International Standard Atmosphere model.
 *
 * Hypsometric formula (below 36,089 ft / 11,000 m):
 *   h = (T₀ / L) × [1 − (P / P₀)^(R·L / g·M)]
 *
 * Simplified linear approximation for small QNH deviations:
 *   indicated_alt ≈ pressure_alt + (QNH − 1013.25) × 27
 */
export function useAltimeter(
  rawPressureAltitudeFt: number | null,
  rawVerticalSpeed: number,
): AltimeterState {
  const [isStandard, setIsStandard] = useState(false);
  const [localQnh, setLocalQnh] = useState(ISA_SEA_LEVEL_PRESSURE_HPA);

  // ── Smoothed VS via low-pass filter ────────────────────────────
  const prevVsRef = useRef(0);
  const smoothedVs = useRef(0);

  useEffect(() => {
    const alpha = 0.15; // smoothing factor
    smoothedVs.current = smoothedVs.current + alpha * (rawVerticalSpeed - smoothedVs.current);
    prevVsRef.current = rawVerticalSpeed;
  }, [rawVerticalSpeed]);

  const activeQnh = isStandard ? ISA_SEA_LEVEL_PRESSURE_HPA : localQnh;

  const calculations = useMemo(() => {
    if (rawPressureAltitudeFt === null || rawPressureAltitudeFt === undefined) {
      return {
        pressureAltitude: 0,
        indicatedAltitude: 0,
        displayAltitude: '-----',
        transitionWarning: false,
      };
    }

    // Pressure altitude is what we get from FSUIPC (referenced to 1013.25)
    const pressureAltitude = rawPressureAltitudeFt;

    // Apply QNH correction: ~27 ft per hPa deviation from standard
    const qnhCorrectionFt = (activeQnh - ISA_SEA_LEVEL_PRESSURE_HPA) * 27;
    const indicatedAltitude = pressureAltitude + qnhCorrectionFt;

    // Round to nearest 10 ft for display
    const rounded = Math.round(indicatedAltitude / 10) * 10;
    const displayAltitude = rounded.toLocaleString('en-US', {
      minimumIntegerDigits: 1,
      useGrouping: false,
    });

    // Transition warning: above FL180 but not on STD
    const transitionWarning = indicatedAltitude > TRANSITION_ALT_FT && !isStandard;

    return { pressureAltitude, indicatedAltitude, displayAltitude, transitionWarning };
  }, [rawPressureAltitudeFt, activeQnh, isStandard]);

  const toggleStandard = useCallback(() => setIsStandard(prev => !prev), []);
  const setLocalQnhCb = useCallback((hpa: number) => setLocalQnh(hpa), []);

  return {
    indicatedAltitude: calculations.indicatedAltitude,
    pressureAltitude: calculations.pressureAltitude,
    displayAltitude: calculations.displayAltitude,
    qnhHpa: activeQnh,
    qnhInHg: (activeQnh / HPA_PER_INHG).toFixed(2),
    isStandard,
    transitionWarning: calculations.transitionWarning,
    verticalSpeed: Math.round(smoothedVs.current),
    toggleStandard,
    setLocalQnh: setLocalQnhCb,
  };
}
