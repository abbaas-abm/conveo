export type UserPosition = "STUDENT" | "STAFF" | "GUEST_SPEAKER";
export type UserRole = "user" | "volunteer" | "admin";
export type OnboardingStep = "PERSONAL_DETAILS" | "ACADEMIC_DETAILS" | "DONE";

export type EventMode = "ONLINE" | "IN_PERSON";
export type EventStatus = "OPEN" | "CLOSED" | "ENDED";
export type RsvpStatus = "CONFIRMED" | "CANCELLED";
export type ProgramBlockType =
  | "KEYNOTE"
  | "PANEL_DISCUSSION"
  | "WORKSHOP"
  | "NETWORKING"
  | "BREAK"
  | "ENTERTAINMENT"
  | "QA_SESSION"
  | "OTHER";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
  position: UserPosition | null;
  role: UserRole;
  gender: string | null;
  person_number: string | null;
  faculty: string | null;
  course_of_study: string | null;
  year_of_study: string | null;
  onboarding: OnboardingStep;
  created_at: string;
  updated_at: string;
}

export interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  about: string | null;
  start_date: string;
  end_date: string;
  venue: string | null;
  mode: EventMode;
  status: EventStatus;
  featured_image_url: string | null;
  featured_image_key: string | null;
  cover_image_url: string | null;
  cover_image_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Speaker {
  id: string;
  event_id: string | null;
  first_name: string;
  last_name: string;
  gender: string | null;
  title: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ProgramBlock {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  display_order: number;
  day_number: number;
  type: ProgramBlockType;
  created_at: string;
}

export interface EventGalleryImage {
  id: string;
  event_id: string;
  file_name: string;
  image_url: string;
  object_key: string;
  display_order: number;
  created_at: string;
}

export interface Rsvp {
  id: string;
  attendee_id: string;
  event_id: string;
  position: UserPosition | null;
  status: RsvpStatus;
  attendee_tag_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  event_id: string;
  attendee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
