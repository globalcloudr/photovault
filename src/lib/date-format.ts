function parseDateLike(value: string | Date) {
  if (value instanceof Date) return value;
  return new Date(value);
}

export function formatDateMDY(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") {
    const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      const [, yyyy, mm, dd] = ymd;
      return `${mm}-${dd}-${yyyy}`;
    }
  }

  const date = parseDateLike(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/\//g, "-");
}

export function formatDateTimeMDY(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = parseDateLike(value);
  if (Number.isNaN(date.getTime())) return "";

  const datePart = formatDateMDY(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${datePart}, ${timePart}`;
}
