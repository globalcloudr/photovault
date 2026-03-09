import { cn } from "@/lib/cn";

type BadgeTone = "neutral" | "dark" | "light";

const toneStyles: Record<BadgeTone, string> = {
  neutral: "border-slate-300 bg-slate-100 text-slate-700",
  dark: "border-transparent bg-black/70 text-white",
  light: "border-white/15 bg-white/10 text-slate-200",
};

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
