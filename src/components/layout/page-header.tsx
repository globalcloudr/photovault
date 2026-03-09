import { cn } from "@/lib/cn";

type Action = {
  key: string;
  node: React.ReactNode;
};

type PageHeaderProps = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: Action[];
  className?: string;
};

export function PageHeader({ eyebrow, title, subtitle, actions = [], className }: PageHeaderProps) {
  const eyebrowIsSimpleText = typeof eyebrow === "string";

  return (
    <header className={cn("rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {eyebrow &&
            (eyebrowIsSimpleText ? (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>
            ) : (
              <div>{eyebrow}</div>
            ))}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>

        {actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action) => (
              <div key={action.key}>{action.node}</div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
