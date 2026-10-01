import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  Megaphone,
  Users,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RsvpButton } from "@/components/events/RsvpButton";
import { EventCountdown } from "@/components/events/EventCountdown";
import { ExpandableSection } from "@/components/events/ExpandableSection";
import { getCurrentUser } from "@/lib/auth";
import { getEventById, getEventProgram, getSpeakersByEvent, getEventAnnouncements } from "@/lib/data";
import { formatDate, formatTime, initials, secondsUntil } from "@/lib/utils";
import { sanitizeHtml, hasMarkup, richTextToPlain } from "@/lib/rich-text";
import type { ProgramBlockType, RsvpStatus } from "@/lib/types";

const BLOCK_LABELS: Record<ProgramBlockType, string> = {
  KEYNOTE: "Keynote",
  PANEL_DISCUSSION: "Panel Discussion",
  WORKSHOP: "Workshop",
  NETWORKING: "Networking",
  BREAK: "Break",
  ENTERTAINMENT: "Entertainment",
  QA_SESSION: "Q&A Session",
  OTHER: "Session",
};

export default async function EventDetailPage(
  props: PageProps<"/events/[id]">,
) {
  const { id } = await props.params;
  const [
    event,
    program,
    eventSpeakers,
    announcements,
    { supabase, user, profile },
  ] = await Promise.all([
    getEventById(id),
    getEventProgram(id),
    getSpeakersByEvent(id),
    getEventAnnouncements(id),
    getCurrentUser(),
  ]);

  if (!event) notFound();

  let myStatus: RsvpStatus | null = null;
  if (supabase && user) {
    const { data } = await supabase
      .from("rsvps")
      .select("status")
      .eq("event_id", id)
      .eq("attendee_id", user.id)
      .maybeSingle();
    myStatus = (data?.status as RsvpStatus) ?? null;
  }

  const eventOpen = event.status === "OPEN";
  const speakers = Array.from(
    new Map(
      [...eventSpeakers, ...program.flatMap((block) => block.speakers)].map(
        (speaker) => [speaker.id, speaker],
      ),
    ).values(),
  );

  const programDays = Array.from(
    program
      .reduce((map, block) => {
        const list = map.get(block.day_number) ?? [];
        list.push(block);
        map.set(block.day_number, list);
        return map;
      }, new Map<number, typeof program>())
      .entries(),
  ).sort((a, b) => a[0] - b[0]);

  return (
    <div className="bg-white pb-16">
      <section className="w-full bg-slate-100">
        <div className="relative mx-auto aspect-[5/2] max-h-[560px] w-full overflow-hidden">
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300">
              <CalendarDays className="size-10" />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Back to events
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge
              variant={
                event.status === "OPEN"
                  ? "success"
                  : event.status === "CLOSED"
                    ? "warning"
                    : "destructive"
              }
            >
              {event.status}
            </Badge>
            <Badge variant="outline">
              {event.mode === "ONLINE" ? (
                <>
                  <Video className="size-3" /> Online
                </>
              ) : (
                <>
                  <MapPin className="size-3" /> In Person
                </>
              )}
            </Badge>
            {event.theme && <Badge variant="secondary">{event.theme}</Badge>}
          </div>

          <h1 className="mt-3 text-3xl font-semibold leading-tight text-balance text-gray-900 sm:text-4xl">
            {event.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <span>
                <span className="font-medium text-gray-900">Starts</span>{" "}
                {formatDate(event.start_date)} · {formatTime(event.start_date)}
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <span>
                <span className="font-medium text-gray-900">Ends</span>{" "}
                {formatDate(event.end_date)} · {formatTime(event.end_date)}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6 lg:order-1">
            <Card className="border-gray-200 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-900">
                About this event
              </h2>
              {event.description || event.about ? (
                <ExpandableSection
                  enabled={
                    (event.description?.length ?? 0) +
                      richTextToPlain(event.about).length >
                    400
                  }
                >
                  {event.description && (
                    <p className="mt-4 text-base leading-relaxed text-gray-600">
                      {event.description}
                    </p>
                  )}
                  {event.about &&
                    (hasMarkup(event.about) ? (
                      <div
                        className="prose prose-slate mt-5 max-w-none text-gray-600 prose-headings:text-gray-900 prose-headings:font-semibold prose-a:text-primary prose-strong:text-gray-900 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-blockquote:border-l-primary prose-blockquote:text-gray-500 prose-code:text-primary"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(event.about),
                        }}
                      />
                    ) : (
                      <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-gray-600">
                        {event.about}
                      </p>
                    ))}
                </ExpandableSection>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  Full event details will be published shortly.
                </p>
              )}
            </Card>

            <Card className="border-gray-200 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-900">
                Programme &amp; agenda
              </h2>
              {program.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  The programme for this event is being finalised.
                </p>
              ) : (
                <ExpandableSection
                  enabled={program.length > 2}
                  collapsedClassName="max-h-96"
                >
                <div className="mt-6 space-y-10">
                  {programDays.map(([day, dayBlocks]) => (
                    <div key={day}>
                      {programDays.length > 1 && (
                        <div className="mb-5 flex items-center gap-3">
                          <span className="rounded-md bg-[#d9b45b]/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#8a6d2f]">
                            Day {day}
                          </span>
                          <span className="h-px flex-1 bg-gray-200" />
                        </div>
                      )}
                      <ol className="space-y-6">
                        {dayBlocks.map((block, index) => (
                          <li key={block.id} className="relative flex gap-5">
                            <div className="flex flex-col items-center">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                                {index + 1}
                              </span>
                              {index < dayBlocks.length - 1 && (
                                <span className="mt-1 w-px flex-1 bg-gray-200" />
                              )}
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">
                                  {BLOCK_LABELS[block.type]}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {formatTime(block.start_time)} –{" "}
                                  {formatTime(block.end_time)}
                                </span>
                              </div>
                              <h3 className="mt-2 font-medium text-gray-900">
                                {block.title}
                              </h3>
                              {block.description && (
                                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                                  {block.description}
                                </p>
                              )}
                              {block.speakers.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {block.speakers.map((speaker) => (
                                    <div
                                      key={speaker.id}
                                      className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-3"
                                    >
                                      {speaker.avatar_url ? (
                                        <Image
                                          src={speaker.avatar_url}
                                          alt={`${speaker.first_name} ${speaker.last_name}`}
                                          width={28}
                                          height={28}
                                          className="size-7 rounded-full object-cover"
                                        />
                                      ) : (
                                        <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-gray-600">
                                          {initials(
                                            speaker.first_name,
                                            speaker.last_name,
                                          )}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-700">
                                        {[
                                          speaker.title,
                                          speaker.first_name,
                                          speaker.last_name,
                                        ]
                                          .filter(Boolean)
                                          .join(" ")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
                </ExpandableSection>
              )}
            </Card>

            {speakers.length > 0 && (
              <Card className="border-gray-200 p-6 sm:p-8">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                  <Users className="size-5 text-gray-400" />
                  Speakers &amp; facilitators
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {speakers.map((speaker) => (
                    <div
                      key={speaker.id}
                      className="flex gap-4 rounded-lg border border-gray-200 p-4"
                    >
                      {speaker.avatar_url ? (
                        <Image
                          src={speaker.avatar_url}
                          alt={`${speaker.first_name} ${speaker.last_name}`}
                          width={56}
                          height={56}
                          className="size-14 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-slate-100 font-medium text-gray-600">
                          {initials(speaker.first_name, speaker.last_name)}
                        </span>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {[
                            speaker.title,
                            speaker.first_name,
                            speaker.last_name,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </h3>
                        {speaker.bio && (
                          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-gray-600">
                            {speaker.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <aside className="order-first space-y-6 lg:order-2 lg:sticky lg:top-20 lg:h-fit">
            <EventCountdown initialSeconds={secondsUntil(event.start_date)} />
            <Card className="border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Event details
              </h2>
              <div className="mt-5 space-y-4 text-sm">
                <DetailRow icon={CalendarDays} label="Starts">
                  {formatDate(event.start_date, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {formatTime(event.start_date)}
                </DetailRow>
                <Separator />
                <DetailRow icon={CalendarDays} label="Ends">
                  {formatDate(event.end_date, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {formatTime(event.end_date)}
                </DetailRow>
                <Separator />
                <DetailRow icon={MapPin} label="Venue">
                  {event.mode === "ONLINE"
                    ? "Online (link shared on RSVP)"
                    : (event.venue ?? "Wits Campus")}
                </DetailRow>
              </div>

              <div className="mt-6">
                <RsvpButton
                  eventId={event.id}
                  isAuthenticated={Boolean(user)}
                  initialStatus={myStatus}
                  eventOpen={eventOpen}
                  profilePosition={profile?.position ?? null}
                  className="w-full"
                />
                {!user && eventOpen && (
                  <p className="mt-3 text-center text-xs text-gray-500">
                    You will be asked to sign in with your email.
                  </p>
                )}
                {myStatus === "CONFIRMED" && (
                  <p className="mt-3 text-center text-xs font-medium text-emerald-600">
                    Your seat is confirmed. Show your attendee tag at the door.
                  </p>
                )}

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="mt-3 w-full"
                >
                  <Link
                    href={
                      user
                        ? `/reflections?event=${event.id}`
                        : `/login?redirectTo=${encodeURIComponent(
                            `/reflections?event=${event.id}`,
                          )}`
                    }
                  >
                    Reflections
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </Card>

            {announcements.length > 0 && (
              <Card className="border-gray-200 p-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Megaphone className="size-5 text-primary" />
                  Announcements
                </h2>
                <div className="mt-4 space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="rounded-lg border border-gray-200 bg-slate-50 p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        From the DLU Team
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                        {announcement.text}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(announcement.created_at)} ·{" "}
                        {formatTime(announcement.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-gray-400" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-0.5 text-gray-700">{children}</p>
      </div>
    </div>
  );
}
