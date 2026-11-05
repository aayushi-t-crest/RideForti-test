import { useMemo } from "react";
import { type EventTag, tagDefByKey, tagLabel } from "./eventTags";
import { type CalEvent } from "./WeekView";

const colorBg: Record<string, string> = {
  primary: "bg-primary/20 border-l-primary",
  red: "bg-red-500/20 border-l-red-500",
  green: "bg-green-500/20 border-l-green-500",
  yellow: "bg-yellow-500/20 border-l-yellow-500",
  purple: "bg-purple-500/20 border-l-purple-500",
  pink: "bg-pink-500/20 border-l-pink-500",
  orange: "bg-orange-500/20 border-l-orange-500",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 56;

const fmtHour = (h: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:00 ${ampm}`;
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const getStart = (ev: CalEvent) => {
  if (!ev.event_time) return null;
  const [h, m] = ev.event_time.split(":").map(Number);
  return h + (m || 0) / 60;
};
const getEnd = (ev: CalEvent) => {
  if (ev.end_time) {
    const [h, m] = ev.end_time.split(":").map(Number);
    return h + (m || 0) / 60;
  }
  const s = getStart(ev);
  return s === null ? null : Math.min(24, s + 1);
};

interface Props {
  date: Date;
  events: CalEvent[];
  onEventClick: (ev: CalEvent) => void;
  onSlotClick: (dateStr: string, hour: number) => void;
}

const DayView = ({ date, events, onEventClick, onSlotClick }: Props) => {
  const k = dayKey(date);
  const dayEvents = useMemo(() => events.filter((e) => e.event_date === k), [events, k]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-3 border-b border-border bg-muted/30">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {date.toLocaleDateString("en-US", { weekday: "long" })}
        </div>
        <div className="text-lg font-semibold">
          {date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </div>
      </div>
      <div className="overflow-y-auto max-h-[600px]">
        <div className="grid grid-cols-[80px_1fr] relative">
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-muted-foreground text-right pr-2 pt-0.5 border-b border-border/40">
                {fmtHour(h)}
              </div>
            ))}
          </div>
          <div className="relative border-l border-border">
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                onClick={() => onSlotClick(k, h)}
                className="border-b border-border/40 hover:bg-foreground/5 cursor-pointer transition-colors"
              />
            ))}
            {dayEvents.map((ev) => {
              const start = getStart(ev);
              const end = getEnd(ev);
              if (start === null || end === null) {
                return (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className={`absolute left-2 right-2 top-0 ${colorBg[ev.color] || colorBg.primary} border-l-2 rounded px-2 py-1 text-xs cursor-pointer hover:opacity-80`}
                  >
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-[10px] text-muted-foreground">All day</div>
                  </div>
                );
              }
              return (
                <div
                  key={ev.id}
                  onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                  style={{ top: start * HOUR_HEIGHT, height: Math.max(28, (end - start) * HOUR_HEIGHT - 2) }}
                  className={`absolute left-2 right-2 ${colorBg[ev.color] || colorBg.primary} border-l-2 rounded px-2 py-1 text-xs cursor-pointer hover:opacity-80 overflow-hidden`}
                >
                  <div className="font-medium truncate">{ev.title}</div>
                  <div className="text-[10px] text-muted-foreground">{ev.event_time?.slice(0, 5)}{ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ""}</div>
                  {ev.location && <div className="text-[10px] text-muted-foreground truncate">📍 {ev.location}</div>}
                  {Array.isArray(ev.tags) && ev.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(ev.tags as EventTag[]).map((t) => {
                        const def = tagDefByKey(t.key);
                        if (!def) return null;
                        return (
                          <span key={t.key} className={`text-[9px] px-1.5 py-0.5 rounded ${def.color} border`}>
                            {tagLabel(t)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;
