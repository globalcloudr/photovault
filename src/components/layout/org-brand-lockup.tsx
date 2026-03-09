import { cn } from "@/lib/cn";

type OrgBrandLockupProps = {
  orgName?: string | null;
  logoUrl?: string | null;
  showName?: boolean;
  className?: string;
  textClassName?: string;
  logoFrameClassName?: string;
  logoImageClassName?: string;
};

export function OrgBrandLockup({
  orgName,
  logoUrl,
  showName = true,
  className,
  textClassName,
  logoFrameClassName,
  logoImageClassName,
}: OrgBrandLockupProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {logoUrl ? (
        <div
          className={cn(
            "flex h-14 w-44 items-center rounded-md border border-slate-200 bg-white px-2",
            logoFrameClassName
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={orgName ? `${orgName} logo` : "Organization logo"}
            className={cn("h-10 w-full object-contain object-left", logoImageClassName)}
          />
        </div>
      ) : null}

      {showName ? (
        <span className={cn("text-base font-semibold tracking-[0.08em] text-slate-600", textClassName)}>
          {orgName ?? "PhotoVault"}
        </span>
      ) : null}
    </div>
  );
}
