export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
          <Icon size={20} className="text-gray-400" />
        </div>
      )}
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
