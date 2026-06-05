import clsx from 'clsx';

// Curated gradient pairs — warm, distinctive, human
const GRADIENT_PAIRS = [
  ['#EEF0FF', '#5B5EF4'],   // indigo
  ['#FFF0F5', '#E8445A'],   // rose
  ['#ECFDF5', '#059669'],   // emerald
  ['#FFFBEB', '#D97706'],   // amber
  ['#F5F3FF', '#7C3AED'],   // violet
  ['#EFF6FF', '#2563EB'],   // blue
  ['#FDF4FF', '#A855F7'],   // fuchsia
  ['#ECFEFF', '#0E7490'],   // cyan
];

export default function Avatar({ name = '', photo, size = 'md', className }) {
  const SIZES = {
    xs:    { wrapper: 'w-6 h-6',   text: 'text-[9px]',   border: '1.5px', radius: '7px'  },
    sm:    { wrapper: 'w-8 h-8',   text: 'text-[10px]',  border: '1.5px', radius: '8px'  },
    md:    { wrapper: 'w-10 h-10', text: 'text-[12px]',  border: '1.5px', radius: '10px' },
    lg:    { wrapper: 'w-14 h-14', text: 'text-[16px]',  border: '2px',   radius: '12px' },
    xl:    { wrapper: 'w-20 h-20', text: 'text-[22px]',  border: '2px',   radius: '16px' },
    '2xl': { wrapper: 'w-24 h-24', text: 'text-[26px]',  border: '2.5px', radius: '18px' },
  };

  const s = SIZES[size] || SIZES.md;

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  // Deterministic color index from name
  const charSum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = charSum % GRADIENT_PAIRS.length;
  const [bg, fg] = GRADIENT_PAIRS[idx];

  if (photo) {
    return (
      <div
        className={clsx(s.wrapper, 'overflow-hidden flex-shrink-0 ring-2 ring-white', className)}
        style={{ borderRadius: s.radius, border: `${s.border} solid rgba(0,0,0,0.06)` }}
      >
        <img
          src={photo}
          alt={name}
          className="w-full h-full object-cover"
          onError={e => {
            e.target.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        s.wrapper, s.text,
        'flex items-center justify-center flex-shrink-0 font-bold select-none',
        className
      )}
      style={{
        borderRadius: s.radius,
        background: bg,
        color: fg,
        border: `${s.border} solid ${bg === '#EEF0FF' ? '#C7D2FE' : 'rgba(0,0,0,0.06)'}`,
        letterSpacing: '-0.02em',
      }}
    >
      {initials || '?'}
    </div>
  );
}
