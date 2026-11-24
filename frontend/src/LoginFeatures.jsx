import { useEffect, useState } from 'react';

const files = [
  {
    image: 'arcade', title: 'Student ID', tab: 'ID', heading: 'Find your student ID.',
    fields: [['Student ID', '#1042'], ['Name', 'Ananya Rao']],
  },
  {
    image: 'library', title: 'Profile details', tab: 'Profile', heading: 'View your profile.',
    fields: [['Ananya Rao · #1042', 'Computer Science'], ['Email', 'ananya@example.edu'], ['CGPA', '8.50']],
  },
  {
    image: 'fees', title: 'Fee status', tab: 'Fees', heading: 'Check your fees.',
    fields: [['Ananya Rao', 'Fee transactions'], ['Semester fee', '₹18,000 · Pending'], ['Library fee', '₹500 · Paid']],
  },
  {
    image: 'lecture', title: 'Semester results', tab: 'Results', heading: 'See your results.',
    fields: [['Semester 1 · MAT101', 'Mathematics'], ['Internal / Exam', '22/25 + 63/75'], ['Total / Grade', '85/100 · A+']],
  },
];

const motionQuery = '(prefers-reduced-motion: reduce)';

export default function LoginFeatures() {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia?.(motionQuery).matches);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setCurrent((index) => (index + 1) % files.length), 5000);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const media = window.matchMedia?.(motionQuery);
    function onChange(event) {
      if (event.matches) setPlaying(false);
    }
    media?.addEventListener('change', onChange);
    return () => media?.removeEventListener('change', onChange);
  }, []);

  return (
    <section aria-label="Student portal features" aria-roledescription="carousel"
      className="file-preview flex w-full min-w-0 flex-col overflow-hidden rounded-[1.75rem]">
      <div className="file-preview__stage" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
        {files.map((file, index) => {
          const active = current === index;
          // Keep the preceding file on the left when autoplay wraps to the start.
          const distance = (index - current + files.length) % files.length;
          return (
            <figure
              key={file.image}
              aria-hidden={!active}
              className="file-preview__sheet"
              data-position={active ? 'open' : distance > files.length / 2 ? 'before' : 'after'}
              style={{ backgroundImage: `url('/login-features/${file.image}.jpg')` }}
            >
              <figcaption className="file-preview__record">
                <p className="file-preview__label">Sample record</p>
                <h2>{file.heading}</h2>
                <dl>
                  {file.fields.map(([label, value]) => (
                    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                  ))}
                </dl>
              </figcaption>
            </figure>
          );
        })}
      </div>
      <div className="file-preview__controls">
        <div className="flex min-w-0 flex-1" role="group" aria-label="Choose a student file">
          {files.map((file, index) => (
            <button
              key={file.image}
              type="button"
              className="file-preview__tab"
              aria-label={`Show ${file.title}`}
              aria-current={index === current ? 'true' : undefined}
              onClick={() => { setPlaying(false); setCurrent(index); }}
            >
              {file.tab}
            </button>
          ))}
        </div>
        <button type="button" className="file-preview__play"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            {playing ? <path d="M3 2h3v10H3zm5 0h3v10H8z" /> : <path d="m3 2 9 5-9 5z" />}
          </svg>
        </button>
      </div>
    </section>
  );
}
