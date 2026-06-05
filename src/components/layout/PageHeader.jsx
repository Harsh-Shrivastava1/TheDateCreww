export default function PageHeader({ title, subtitle, actions, breadcrumb }) {
  return (
    <div
      className="sticky top-0 z-20 flex items-start justify-between px-8 pt-7 pb-5"
      style={{ 
        background: 'rgba(247, 247, 245, 0.85)', 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(232, 232, 229, 0.8)' 
      }}
    >
      <div>
        {breadcrumb && (
          <div className="text-[11.5px] font-bold text-gray-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            {breadcrumb}
          </div>
        )}
        <h1 className="text-page-title">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-gray-500 font-medium mt-1.5 leading-snug max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-1">
          {actions}
        </div>
      )}
    </div>
  );
}
