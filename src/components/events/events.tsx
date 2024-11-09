import Link from "next/link";
import EventList from "./event-list";
import { buttonVariants } from "../ui/button";

export default function Events() {
  return (
    <div className="h-full w-full mt-16 space-y-4">
      <div className="flex flex-col items-center justify-center">
        <Link
          href={"/event"}
          className={buttonVariants({ variant: "outline" })}
        >
          Create event
        </Link>
      </div>
      <EventList />
    </div>
  );
}
