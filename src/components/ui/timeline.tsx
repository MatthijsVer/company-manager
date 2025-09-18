"use client";

import { ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

export type TimelineEvent = {
  title: string;
  timestamp: string | Date;
  by?: string;
  icon?: ReactNode;
  dotColor?: string;
  user: { name: string };
  createdAt: string;
  description?: string;
};

type TimelineProps = { events: TimelineEvent[] };

const formatDate = (dateString: string | Date) =>
  new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const formatMonth = (dateString: string | Date) =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

export function Timeline({ events }: TimelineProps) {
  const grouped = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const map = new Map<string, TimelineEvent[]>();
    for (const e of sorted) {
      const key = formatMonth(e.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  return (
    <div className="relative pl-0">
      {/* single minimal vertical rail */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-3 top-0 bottom-0 w-px bg-border"
      />

      <div className="flex flex-col gap-8 text-sm w-full">
        {grouped.map(([month, monthEvents]) => (
          <section key={month} className="space-y-3">
            <div className="pl-6 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {month}
            </div>

            <ol role="list" className="space-y-3">
              {monthEvents.map((event, idx) => (
                <li key={`${month}-${idx}`} className="relative pl-5">
                  {/* minimal node that masks the rail behind it */}
                  <span
                    aria-hidden
                    className="absolute left-3 top-2 -translate-x-1/2 rounded-full p-0.5"
                  >
                    {event.icon ? (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-background">
                        {event.icon}
                      </span>
                    ) : (
                      <span className="relative block h-2.5 w-2.5 rounded-full ring-1 ring-[#1F1F1F]">
                        <span
                          className={cn(
                            "absolute inset-0.5 rounded-full",
                            event.dotColor || "bg-foreground"
                          )}
                        />
                      </span>
                    )}
                  </span>

                  {/* inline, no cards, no borders */}
                  <div className="flex items-center gap-2 min-w-0 pl-3">
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage />
                      <AvatarFallback className="text-[10px] bg-[#1F1F1F] text-white">
                        {event.user?.name?.[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[11px] font-medium leading-2.5">
                          {event.user?.name ?? "User"}
                        </span>
                        <time
                          className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                          dateTime={new Date(event.createdAt).toISOString()}
                          title={new Date(event.createdAt).toLocaleString()}
                        >
                          {formatDate(event.createdAt)}
                        </time>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {event.description ?? "—"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
