export default function PageHeader({ title, subtitle, actions, breadcrumb }) {
  return (
    <div
      className="flex items-start justify-between px-8 pt-8 pb-6"
      style={{ borderBottom: '1px solid #F3F4F6' }}
    >
      <div>
        {breadcrumb && (
          <div className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
            {breadcrumb}
          </div>
        )}
        <h1 className="text-page-title">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
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
