import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ImageOff,
  MapPin,
  Users,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RegisterButton } from "@/components/events/RegisterButton";
import { EventCountdown } from "@/components/events/EventCountdown";
import { ExpandableSection } from "@/components/events/ExpandableSection";
import { EventProgramme } from "@/components/events/EventProgramme";
import { EventAnnouncementsButton } from "@/components/events/EventAnnouncementsButton";
import { SectionPlaceholder } from "@/components/events/SectionPlaceholder";
import { getCurrentUser } from "@/lib/auth";
import { getEventById, getEventProgram, getSpeakersByEvent, getEventAnnouncements } from "@/lib/data";
import { formatDate, formatTime, initials, secondsUntil } from "@/lib/utils";
import { sanitizeHtml, hasMarkup, richTextToPlain } from "@/lib/rich-text";
import type { RegistrationStatus } from "@/lib/types";

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

  let myStatus: RegistrationStatus | null = null;
  if (supabase && user) {
    const { data } = await supabase
      .from("registrations")
      .select("status")
      .eq("event_id", id)
      .eq("attendee_id", user.id)
      .maybeSingle();
    myStatus = (data?.status as RegistrationStatus) ?? null;
  }

  const eventOpen = event.status === "OPEN";
  const speakers = Array.from(
    new Map(
      [...eventSpeakers, ...program.flatMap((block) => block.speakers)].map(
        (speaker) => [speaker.id, speaker],
      ),
    ).values(),
  );

  return (
    <div className="bg-white pb-16">
      <EventAnnouncementsButton announcements={announcements} />
      <section className="w-full bg-slate-100">
        <div className="relative mx-auto aspect-[5/2] max-h-[560px] w-full overflow-hidden">
          {event.has_media && event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-200 text-gray-400">
              <ImageOff className="size-10" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Media coming soon
              </span>
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

          {event.has_information && (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                <span>
                  <span className="font-medium text-gray-900">Starts</span>{" "}
                  {formatDate(event.start_date)} ·{" "}
                  {formatTime(event.start_date)}
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
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6 lg:order-1">
            {event.has_about ? (
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
            ) : (
              <SectionPlaceholder title="About this event" />
            )}

            {event.has_programme ? (
            <Card className="border-gray-200 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-900">
                Programme &amp; agenda
              </h2>
              {program.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  The programme for this event is being finalised.
                </p>
              ) : (
                <EventProgramme
                  program={program}
                  isAuthenticated={Boolean(user)}
                />
              )}
            </Card>
            ) : (
              <SectionPlaceholder title="Programme &amp; agenda" />
            )}

            {!event.has_speakers ? (
              <SectionPlaceholder title="Speakers &amp; facilitators" />
            ) : speakers.length > 0 ? (
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
            ) : null}
          </div>

          <aside className="order-first space-y-6 lg:order-2 lg:sticky lg:top-20 lg:h-fit">
            {event.has_information && (
              <EventCountdown
                initialSeconds={secondsUntil(event.start_date)}
              />
            )}
            <Card className="border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Event details
              </h2>
              {event.has_information ? (
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
                      ? "Online (link shared on registration)"
                      : (event.venue ?? "Wits Campus")}
                  </DetailRow>
                </div>
              ) : (
                <p className="mt-5 text-sm leading-relaxed text-gray-500">
                  The event organizers are still confirming these details.
                  Please check back soon.
                </p>
              )}

              <div className="mt-6">
                <RegisterButton
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
