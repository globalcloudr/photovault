import { createElement } from "react";
import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const typography = {
  eyebrow: "font-outfit text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]",
  pageTitle: "font-outfit text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)] sm:text-4xl",
  sectionTitle: "font-outfit text-xl font-semibold leading-tight tracking-[-0.03em] text-[var(--foreground)] sm:text-2xl",
  cardTitle: "font-outfit text-lg font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]",
  body: "text-sm leading-6 text-[var(--foreground)]",
  bodyMuted: "text-sm leading-6 text-[var(--text-muted)]",
  meta: "text-xs leading-5 text-[var(--text-muted)]",
  label: "font-outfit text-sm font-medium tracking-[-0.01em] text-[var(--foreground)]",
} as const;

type HeadingTag = "h1" | "h2" | "h3" | "h4";
type TextTag = "p" | "span" | "div";

type HeadingProps = {
  as?: HeadingTag;
  className?: string;
  children: ReactNode;
};

function Heading({ as = "h1", className, children, style }: HeadingProps & { style: string }) {
  return createElement(as, { className: cn(style, className) }, children);
}

function TextBlock({
  as = "p",
  className,
  children,
  style,
  ...props
}: {
  as?: TextTag;
  className?: string;
  children?: ReactNode;
  style: string;
} & HTMLAttributes<HTMLElement>) {
  return createElement(as, { className: cn(style, className), ...props }, children);
}

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn(typography.eyebrow, className)} {...props} />;
}

export function PageTitle(props: HeadingProps) {
  return <Heading as={props.as ?? "h1"} className={props.className} style={typography.pageTitle}>{props.children}</Heading>;
}

export function SectionTitle(props: HeadingProps) {
  return <Heading as={props.as ?? "h2"} className={props.className} style={typography.sectionTitle}>{props.children}</Heading>;
}

export function CardTitle(props: HeadingProps) {
  return <Heading as={props.as ?? "h3"} className={props.className} style={typography.cardTitle}>{props.children}</Heading>;
}

export function BodyText({
  as = "p",
  className,
  muted = false,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: TextTag; muted?: boolean }) {
  return (
    <TextBlock as={as} className={className} style={muted ? typography.bodyMuted : typography.body} {...props}>
      {children}
    </TextBlock>
  );
}

export function MetaText({
  as = "p",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: TextTag }) {
  return (
    <TextBlock as={as} className={className} style={typography.meta} {...props}>
      {children}
    </TextBlock>
  );
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn(typography.label, className)} {...props} />;
}

export function LabelText({
  as = "p",
  className,
  children,
  ...props
}: {
  as?: TextTag;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <TextBlock as={as} className={className} style={typography.label} {...props}>
      {children}
    </TextBlock>
  );
}
