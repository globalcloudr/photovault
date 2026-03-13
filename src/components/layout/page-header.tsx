import { cn } from "@/lib/cn";
import { BodyText, Eyebrow, PageTitle } from "@/components/ui/typography";

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
              <Eyebrow>{eyebrow}</Eyebrow>
            ) : (
              <div>{eyebrow}</div>
            ))}
          <PageTitle className="mt-1 text-slate-900">{title}</PageTitle>
          {subtitle && <BodyText muted className="mt-1">{subtitle}</BodyText>}
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
