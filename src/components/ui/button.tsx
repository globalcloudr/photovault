import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border border-slate-900 bg-slate-900 text-white hover:bg-slate-700 hover:border-slate-700 focus-visible:outline-slate-900",
  secondary:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 focus-visible:outline-slate-900",
  ghost:
    "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-900",
  danger:
    "border border-red-700 bg-red-700 text-white hover:bg-red-600 hover:border-red-600 focus-visible:outline-red-700",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md") {
  return cn(
    "inline-flex items-center justify-center rounded-md font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
    variantStyles[variant],
    sizeStyles[size]
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClass(variant, size), className)}
      {...props}
    />
  );
}
