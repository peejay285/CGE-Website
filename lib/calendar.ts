// Client-side .ics generation — no dependency. Times are written as
// local ("floating") times, which is what we want: the session happens
// at the lounge, in the lounge's timezone.

interface IcsOptions {
  title: string;
  /** Event start, local time. */
  start: Date;
  durationHours: number;
  location: string;
  description: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date as a local (floating) iCalendar timestamp: YYYYMMDDTHHMMSS */
function toIcsLocal(d: Date): string {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/** Escape commas, semicolons, backslashes and newlines per RFC 5545. */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildIcsString({
  title,
  start,
  durationHours,
  location,
  description,
}: IcsOptions): string {
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@cge.ng`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CGE//Lounge Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsLocal(new Date())}`,
    `DTSTART:${toIcsLocal(start)}`,
    `DTEND:${toIcsLocal(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // RFC 5545 requires CRLF line endings.
  return lines.join("\r\n") + "\r\n";
}

/** Trigger a browser download of an .ics file built from the options. */
export function downloadIcsFile(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
