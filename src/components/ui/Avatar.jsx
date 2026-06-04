import clsx from 'clsx';

export default function Avatar({ name = '', photo, size = 'md', gender }) {
  const SIZES = {
    xs:  { wrapper: 'w-6 h-6',   text: 'text-[9px]',  border: '1.5px' },
    sm:  { wrapper: 'w-8 h-8',   text: 'text-xs',     border: '1.5px' },
    md:  { wrapper: 'w-10 h-10', text: 'text-sm',     border: '2px'   },
    lg:  { wrapper: 'w-14 h-14', text: 'text-base',   border: '2px'   },
    xl:  { wrapper: 'w-20 h-20', text: 'text-xl',     border: '2px'   },
    '2xl': { wrapper: 'w-24 h-24', text: 'text-2xl', border: '3px'   },
  };

  const s = SIZES[size] || SIZES.md;

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  // Deterministic color from name
  const COLORS = [
    ['#EFF6FF','#2563EB'],
    ['#F0FDF4','#16A34A'],
    ['#FEF3C7','#D97706'],
    ['#FDF2F8','#9D174D'],
    ['#F5F3FF','#7C3AED'],
    ['#ECFEFF','#0E7490'],
    ['#FFF7ED','#C2410C'],
  ];
  const idx = (name.charCodeAt(0) || 0) % COLORS.length;
  const [bg, fg] = COLORS[idx];

  if (photo) {
    return (
      <div
        className={clsx(s.wrapper, 'rounded-xl overflow-hidden flex-shrink-0')}
        style={{ border: `${s.border} solid #E5E7EB` }}
      >
        <img
          src={photo}
          alt={name}
          className="w-full h-full object-cover"
          onError={e => { e.target.style.display = 'none'; e.target.parentNode.setAttribute('data-fallback','1'); }}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        s.wrapper, s.text,
        'rounded-xl flex items-center justify-center flex-shrink-0 font-semibold select-none'
      )}
      style={{ background: bg, color: fg, border: `${s.border} solid #E5E7EB` }}
    >
      {initials || '?'}
    </div>
  );
}
