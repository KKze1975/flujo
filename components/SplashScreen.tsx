'use client';
import { useEffect, useRef, useState } from 'react';

const STREAMS: { d: string; stroke: string; w: number }[] = [
  {
    d: 'M 22.00 41.28 C 23.58 40.98, 28.33 40.13, 31.50 39.50 C 34.67 38.88, 37.83 38.25, 41.00 37.54 C 44.17 36.83, 47.33 36.08, 50.50 35.24 C 53.67 34.40, 56.83 33.49, 60.00 32.50 C 63.17 31.51, 66.33 30.44, 69.50 29.31 C 72.67 28.17, 75.83 26.95, 79.00 25.70 C 82.17 24.45, 85.33 23.13, 88.50 21.81 C 91.67 20.50, 96.42 18.48, 98.00 17.81',
    stroke: 'rgb(251,233,240)', w: 5.4,
  },
  {
    d: 'M 22.00 48.77 C 23.58 48.66, 28.33 48.38, 31.50 48.14 C 34.67 47.90, 37.83 47.66, 41.00 47.33 C 44.17 47.00, 47.33 46.64, 50.50 46.18 C 53.67 45.73, 56.83 45.20, 60.00 44.60 C 63.17 43.99, 66.33 43.30, 69.50 42.55 C 72.67 41.80, 75.83 40.97, 79.00 40.10 C 82.17 39.24, 85.33 38.30, 88.50 37.37 C 91.67 36.43, 96.42 34.99, 98.00 34.51',
    stroke: 'rgb(249,227,235)', w: 6.0,
  },
  {
    d: 'M 22.00 56.26 C 23.58 56.34, 28.33 56.64, 31.50 56.78 C 34.67 56.93, 37.83 57.07, 41.00 57.12 C 44.17 57.18, 47.33 57.20, 50.50 57.13 C 53.67 57.05, 56.83 56.91, 60.00 56.69 C 63.17 56.47, 66.33 56.17, 69.50 55.80 C 72.67 55.44, 75.83 54.98, 79.00 54.50 C 82.17 54.02, 85.33 53.47, 88.50 52.92 C 91.67 52.37, 96.42 51.50, 98.00 51.22',
    stroke: 'rgb(247,220,230)', w: 4.9,
  },
  {
    d: 'M 22.00 63.74 C 23.58 64.02, 28.33 64.89, 31.50 65.42 C 34.67 65.95, 37.83 66.47, 41.00 66.92 C 44.17 67.36, 47.33 67.76, 50.50 68.07 C 53.67 68.38, 56.83 68.63, 60.00 68.79 C 63.17 68.95, 66.33 69.03, 69.50 69.05 C 72.67 69.07, 75.83 69.00, 79.00 68.90 C 82.17 68.81, 85.33 68.63, 88.50 68.47 C 91.67 68.31, 96.42 68.01, 98.00 67.92',
    stroke: 'rgb(246,214,226)', w: 5.8,
  },
  {
    d: 'M 22.00 71.23 C 23.58 71.70, 28.33 73.15, 31.50 74.06 C 34.67 74.97, 37.83 75.88, 41.00 76.71 C 44.17 77.53, 47.33 78.32, 50.50 79.01 C 53.67 79.71, 56.83 80.34, 60.00 80.89 C 63.17 81.43, 66.33 81.89, 69.50 82.30 C 72.67 82.70, 75.83 83.01, 79.00 83.30 C 82.17 83.59, 85.33 83.80, 88.50 84.02 C 91.67 84.24, 96.42 84.53, 98.00 84.63',
    stroke: 'rgb(244,207,221)', w: 4.6,
  },
  {
    d: 'M 22.00 78.72 C 23.58 79.38, 28.33 81.41, 31.50 82.70 C 34.67 84.00, 37.83 85.29, 41.00 86.50 C 44.17 87.71, 47.33 88.88, 50.50 89.96 C 53.67 91.04, 56.83 92.05, 60.00 92.98 C 63.17 93.91, 66.33 94.76, 69.50 95.55 C 72.67 96.33, 75.83 97.03, 79.00 97.70 C 82.17 98.37, 85.33 98.97, 88.50 99.57 C 91.67 100.18, 96.42 101.04, 98.00 101.33',
    stroke: 'rgb(242,201,216)', w: 5.2,
  },
];

export function SplashScreen() {
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animations: Animation[] = [];

    if (fillRef.current) {
      fillRef.current.style.transition = 'none';
      fillRef.current.style.width = '0%';
      void fillRef.current.offsetWidth;
      fillRef.current.style.transition = 'width 2.35s cubic-bezier(.45,.05,.2,1)';
      fillRef.current.style.width = '100%';
    }

    pathRefs.current.forEach((path, i) => {
      if (!path) return;
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      if (reduce) { path.style.strokeDashoffset = '0'; return; }
      const anim = path.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: -len }],
        { duration: 2200, iterations: Infinity, delay: -i * 300, easing: 'cubic-bezier(.5,0,.5,1)' }
      );
      animations.push(anim);
    });

    const timer = setTimeout(() => {
      animations.forEach(a => a.cancel());
      pathRefs.current.forEach(p => {
        if (!p) return;
        p.style.strokeDasharray = 'none';
        p.style.strokeDashoffset = '0';
      });
      setDone(true);
    }, reduce ? 900 : 2650);

    return () => clearTimeout(timer);
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fl-splash${done ? ' fl-splash--done' : ''}`}
      onTransitionEnd={() => done && setHidden(true)}
      aria-hidden="true"
    >
      <div className="fl-splash__inner">
        <svg
          className="fl-splash__mark"
          viewBox="0 0 120 120"
          aria-hidden="true"
          fill="none"
          overflow="visible"
        >
          {STREAMS.map((s, i) => (
            <path
              key={i}
              ref={el => { pathRefs.current[i] = el; }}
              d={s.d}
              stroke={s.stroke}
              strokeWidth={s.w}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <div className="fl-splash__foot">
          <div className="fl-splash__wordmark">Flujo</div>
          <div className="fl-splash__progress">
            <div ref={fillRef} className="fl-splash__progress-fill" />
          </div>
        </div>
      </div>
    </div>
  );
}
