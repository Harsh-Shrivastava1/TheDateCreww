import clsx from 'clsx';

export function Skeleton({ className, style }) {
  return <div className={clsx('skeleton', className)} style={style} />;
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 rounded"
          style={{ width: i === lines - 1 ? '65%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }) {
  return (
    <div className={clsx('card p-5 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-2.5 w-20 rounded" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr>
      {[70, 50, 60, 80, 50, 60].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton className="h-3 rounded" style={{ width: `${w}px` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonProfileHeader() {
  return (
    <div className="card p-6 animate-fade-in">
      <div className="flex gap-4">
        <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-3 pt-1">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-3.5 w-64 rounded" />
          <div className="flex gap-2 pt-1">
            {[80, 90, 70].map(w => (
              <Skeleton key={w} className="h-6 rounded-md" style={{ width: `${w}px` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
