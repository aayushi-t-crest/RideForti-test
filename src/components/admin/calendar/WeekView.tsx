import { useMemo } from "react";
import { type EventTag, tagDefByKey, tagLabel } from "./eventTags";

export interface CalEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  color: string;
  tags?: EventTag[] | unknown;
  location?: string | null;
}

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

const fmtHour = (h: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr} ${ampm}`;
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const getEventStartHour = (ev: CalEvent) => {
  if (!ev.event_time) return null;
  const [h, m] = ev.event_time.split(":").map(Number);
  return h + (m || 0) / 60;
};
const getEventEndHour = (ev: CalEvent) => {
  if (ev.end_time) {
    const [h, m] = ev.end_time.split(":").map(Number);
    return h + (m || 0) / 60;
  }
  const start = getEventStartHour(ev);
  return start === null ? null : Math.min(24, start + 1);
};

interface Props {
  weekStart: Date; // Sunday
  events: CalEvent[];
  onEventClick: (ev: CalEvent) => void;
  onSlotClick: (dateStr: string, hour: number) => void;
}

const HOUR_HEIGHT = 48; // px per hour

const WeekView = ({ weekStart, events, onEventClick, onSlotClick }: Props) => {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.event_date]) map[e.event_date] = [];
      map[e.event_date].push(e);
    });
    return map;
  }, [events]);

  const today = dayKey(new Date());

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border bg-muted/30">
        <div />
        {days.map((d) => {
          const k = dayKey(d);
          const isToday = k === today;
          return (
            <div key={k} className={`p-2 text-center border-l border-border ${isToday ? "bg-primary/10" : ""}`}>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="overflow-y-auto max-h-[600px]">
        <div className="grid grid-cols-[48px_repeat(7,1fr)] relative">
          {/* Hour column */}
          <div>
            {HOURS.map((h) => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[9px] text-muted-foreground text-right pr-1 pt-0.5 border-b border-border/40">
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const k = dayKey(d);
            const dayEvents = eventsByDay[k] || [];
            return (
              <div key={k} className="relative border-l border-border">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    onClick={() => onSlotClick(k, h)}
                    className="border-b border-border/40 hover:bg-foreground/5 cursor-pointer transition-colors"
                  />
                ))}
                {dayEvents.map((ev) => {
                  const start = getEventStartHour(ev);
                  const end = getEventEndHour(ev);
                  if (start === null || end === null) {
                    // All-day at top
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                        className={`absolute left-1 right-1 top-0 ${colorBg[ev.color] || colorBg.primary} border-l-2 rounded px-1.5 py-0.5 text-[10px] font-medium truncate cursor-pointer hover:opacity-80`}
                      >
                        {ev.title}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      style={{ top: start * HOUR_HEIGHT, height: Math.max(20, (end - start) * HOUR_HEIGHT - 2) }}
                      className={`absolute left-1 right-1 ${colorBg[ev.color] || colorBg.primary} border-l-2 rounded px-1.5 py-0.5 text-[10px] cursor-pointer hover:opacity-80 overflow-hidden`}
                    >
                      <div className="font-medium truncate">{ev.title}</div>
                      <div className="text-[9px] text-muted-foreground">{ev.event_time?.slice(0, 5)}{ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ""}</div>
                      {Array.isArray(ev.tags) && ev.tags.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {(ev.tags as EventTag[]).slice(0, 2).map((t) => {
                            const def = tagDefByKey(t.key);
                            if (!def) return null;
                            return (
                              <span key={t.key} className={`text-[8px] px-1 rounded ${def.color} border`}>
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
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
