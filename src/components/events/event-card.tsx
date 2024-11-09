import { EventType } from "@/types/event";

export default function EventCard({ event }: { event: EventType }) {
  return (
    <div className="flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">
          {event.name}
        </h3>
        <span className="text-sm text-muted-foreground">{event.location}</span>
      </div>
      <div className="flex flex-row justify-between mt-auto items-center p-6 pt-0">
        <span>0/{event.maxCapacity}</span>
      </div>
    </div>
  );
}
