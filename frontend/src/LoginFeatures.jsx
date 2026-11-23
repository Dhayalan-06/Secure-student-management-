import { useEffect, useRef, useState } from 'react';

const slides = [
  ['01-student-id', 'Student ID', 'Sample student record for Ananya Rao, ID 1042.', 'Be a Part of Something', 'Beautiful'],
  ['02-profile-details', 'Profile details', 'Ananya studies Computer Science. Her profile lists an email address and a CGPA of 8.50.', 'Everything you need,', 'One Place'],
  ['03-fee-status', 'Fee status', 'The sample semester fee of 18,000 is pending. The library fee of 500 is paid.', 'Track Fees,', 'Effortlessly'],
  ['04-semester-results', 'Semester results', 'Semester 1 Mathematics. Internal 22/25 and exam 63/75 give a total of 85/100 and grade A+.', 'Grades & Results,', 'At a Glance'],
];

export default function LoginFeatures() {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [sliding, setSliding] = useState(false);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  const timerRef = useRef(null);

  function goTo(index) {
    if (index === current || sliding) return;
    setPrev(current);
    setCurrent(index);
    setSliding(true);
    setTimeout(() => {
      setPrev(null);
      setSliding(false);
    }, 700);
  }

  function next() {
    goTo((current + 1) % slides.length);
  }

  useEffect(() => {
    if (!playing) return;
    timerRef.current = window.setInterval(next, 5000);
    return () => window.clearInterval(timerRef.current);
  }, [playing, current, sliding]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onChange = () => setPlaying(!media.matches);
    media?.addEventListener('change', onChange);
    return () => media?.removeEventListener('change', onChange);
  }, []);

  return (
    <section
      aria-label="Student portal features"
      className="relative flex h-full min-h-[440px] w-full flex-col overflow-hidden rounded-[1.75rem] font-['Plus_Jakarta_Sans',sans-serif]"
      style={{
        background: 'linear-gradient(145deg, #091224 0%, #172554 45%, #1e40af 100%)',
      }}
    >
      {/* Ambient Blue / Navy Glows matching login screen theme */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -right-16 h-72 w-72 rounded-full bg-blue-500/25 blur-[80px]" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-indigo-600/30 blur-[90px]" />
        <div className="absolute top-1/2 left-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/15 blur-[70px]" />
      </div>

      {/* Top-right SSM badge */}
      <div className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm ring-1 ring-white/20 shadow-lg">
        <span className="text-[10px] font-bold text-white leading-none tracking-tight">SSM</span>
      </div>

      {/* Image stack — slide-fade transition */}
      <div className="relative flex-1 overflow-hidden" aria-live={playing ? 'off' : 'polite'}>
        {slides.map(([file, title, description], index) => {
          const isActive = index === current;
          const isPrev = index === prev;
          return (
            <div
              key={file}
              aria-hidden={!isActive}
              className="absolute inset-0 will-change-transform"
              style={{
                transition: 'opacity 700ms cubic-bezier(0.4,0,0.2,1), transform 700ms cubic-bezier(0.4,0,0.2,1)',
                opacity: isActive ? 1 : 0,
                transform: isActive
                  ? 'translateX(0%)'
                  : isPrev
                  ? 'translateX(-6%)'
                  : 'translateX(6%)',
                zIndex: isActive ? 2 : isPrev ? 1 : 0,
              }}
            >
              <img
                src={`/login-features/${file}.png`}
                alt={`${title}. ${description}`}
                width="800"
                height="1000"
                className="h-full w-full object-cover"
              />
              {/* Bottom caption gradient overlay */}
              <div
                className="absolute inset-x-0 bottom-0 h-2/5"
                style={{
                  background: 'linear-gradient(to top, rgba(9,18,36,0.92) 0%, rgba(9,18,36,0.55) 55%, transparent 100%)',
                }}
              />
            </div>
          );
        })}

        {/* Caption */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-7 pb-5 pt-3">
          <p className="text-[14px] font-normal text-slate-200 leading-snug">
            {slides[current][3]}
          </p>
          <p className="text-[22px] font-bold text-white leading-tight tracking-tight">
            {slides[current][4]}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-20 flex items-center justify-between px-6 py-3">
        {/* Dot indicators with accessible labels */}
        <div className="flex items-center gap-2">
          {slides.map(([file, title], index) => (
            <button
              key={file}
              type="button"
              aria-label={`Show ${title}`}
              aria-current={current === index ? 'true' : undefined}
              onClick={() => {
                goTo(index);
                setPlaying(false);
              }}
              className="group flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-white"
            >
              <span
                className="block rounded-full transition-all duration-300"
                style={{
                  height: '6px',
                  width: current === index ? '22px' : '6px',
                  background: current === index ? '#fff' : 'rgba(255,255,255,0.35)',
                }}
              />
            </button>
          ))}
        </div>

        {/* Play/pause */}
        <button
          type="button"
          onClick={() => setPlaying((v) => !v)}
          aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white transition-colors"
        >
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="1.5" width="3" height="9" rx="1" />
              <rect x="7" y="1.5" width="3" height="9" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 2.2l7 3.8-7 3.8V2.2z" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}
