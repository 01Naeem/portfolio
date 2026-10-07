import { cn } from '../../utils/cn.js';
import { Skeleton } from '../ui/Primitives.jsx';

// Scrolls horizontally inside its own box on small screens, so the page itself never scrolls sideways.
export default function DataTable({ columns, rows, rowKey = (r) => r._id, actions, loading, caption }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-raised/50 text-xs uppercase tracking-wide text-muted">
          <tr>
            {columns.map((c) => <th key={c.header} scope="col" className={cn('px-4 py-3 font-medium', c.className)}>{c.header}</th>)}
            {actions && <th scope="col" className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {loading
            ? Array.from({ length: 4 }, (_, i) => (
                <tr key={i} aria-hidden="true">
                  {columns.map((c) => <td key={c.header} className="px-4 py-4"><Skeleton className="h-5 w-full max-w-[10rem]" /></td>)}
                  {actions && <td className="px-4 py-4"><Skeleton className="ml-auto h-8 w-20" /></td>}
                </tr>
              ))
            : rows.map((r) => (
                <tr key={rowKey(r)} className="transition-colors hover:bg-raised/40">
                  {columns.map((c) => <td key={c.header} className={cn('px-4 py-3 align-middle', c.className)}>{c.render(r)}</td>)}
                  {actions && <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">{actions(r)}</div></td>}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
