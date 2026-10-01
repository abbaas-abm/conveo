-- ==========================================
-- 1. EXTENSIONS & ENUMS
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Enums
CREATE TYPE user_position AS ENUM ('STUDENT', 'STAFF');
CREATE TYPE user_role AS ENUM ('user', 'volunteer', 'admin');
CREATE TYPE onboarding_step AS ENUM ('PERSONAL_DETAILS', 'ACADEMIC_DETAILS', 'DONE');

-- Event Enums
CREATE TYPE event_mode AS ENUM ('ONLINE', 'IN_PERSON');
CREATE TYPE event_status AS ENUM ('OPEN', 'CLOSED', 'ENDED');
CREATE TYPE program_block_type AS ENUM ('KEYNOTE', 'PANEL_DISCUSSION', 'WORKSHOP', 'NETWORKING', 'BREAK', 'ENTERTAINMENT', 'QA_SESSION', 'OTHER');
CREATE TYPE rsvp_status AS ENUM ('CONFIRMED', 'CANCELLED');

-- ==========================================
-- 2. TABLES CREATION
-- ==========================================

-- PROFILES TABLE (Linked to Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT UNIQUE,
    position user_position,
    role user_role DEFAULT 'user'::user_role NOT NULL,
    gender TEXT,
    person_number TEXT,
    faculty TEXT,
    course_of_study TEXT,
    year_of_study TEXT,
    onboarding onboarding_step DEFAULT 'PERSONAL_DETAILS'::onboarding_step NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- EVENTS TABLE
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    theme TEXT,
    about TEXT, -- Rich text content (HTML/JSON)
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    venue TEXT,
    mode event_mode DEFAULT 'IN_PERSON'::event_mode NOT NULL,
    status event_status DEFAULT 'OPEN'::event_status NOT NULL,
    featured_image_url TEXT,
    featured_image_key TEXT,
    cover_image_url TEXT,
    cover_image_key TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- SPEAKERS TABLE
CREATE TABLE public.speakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT,
    title TEXT, -- e.g. "Dr.", "Keynote Lecturer"
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- EVENT PROGRAM BLOCKS TABLE
CREATE TABLE public.event_program_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    type program_block_type DEFAULT 'OTHER'::program_block_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- PROGRAM BLOCK SPEAKERS (Junction Table)
CREATE TABLE public.event_program_block_speakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_block_id UUID NOT NULL REFERENCES public.event_program_blocks(id) ON DELETE CASCADE,
    speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
    UNIQUE(program_block_id, speaker_id)
);

-- EVENT GALLERY IMAGES TABLE (1:Many for post-event gallery)
CREATE TABLE public.event_gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    object_key TEXT NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RSVP TABLE
CREATE TABLE public.rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    status rsvp_status DEFAULT 'CONFIRMED'::rsvp_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(attendee_id, event_id)
);

-- ATTENDANCE TABLE (QR Scans by Volunteers/Admins)
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attendee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(event_id, attendee_id)
);

-- FEEDBACK TABLE
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    attendee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(event_id, attendee_id)
);

-- ==========================================
-- 3. INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_program_blocks_event ON public.event_program_blocks(event_id);
CREATE INDEX idx_rsvps_event_attendee ON public.rsvps(event_id, attendee_id);
CREATE INDEX idx_attendance_event ON public.attendance(event_id);

-- ==========================================
-- 4. HELPER FUNCTIONS (Prevent RLS Recursion)
-- ==========================================

-- Check if current requesting user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current requesting user is an admin OR volunteer
CREATE OR REPLACE FUNCTION public.is_admin_or_volunteer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin'::user_role, 'volunteer'::user_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. AUTOMATED TRIGGERS
-- ==========================================

-- Trigger to create profile upon Auth signup
-- NOTE: search_path MUST be pinned and types schema-qualified, otherwise
-- signup fails with "Database error saving new user" (see supabase/fixes).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'user'::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_modtime BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rsvps_modtime BEFORE UPDATE ON public.rsvps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_program_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_program_block_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- A. PROFILES POLICIES
-- ------------------------------------------
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins have full control over profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());

-- ------------------------------------------
-- B. EVENTS & PUBLIC CONTENT (Read-only public, Admin write)
-- ------------------------------------------
-- Events
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins can manage events" ON public.events FOR ALL TO authenticated USING (public.is_admin());

-- Speakers
CREATE POLICY "Anyone can view speakers" ON public.speakers FOR SELECT USING (true);
CREATE POLICY "Admins can manage speakers" ON public.speakers FOR ALL TO authenticated USING (public.is_admin());

-- Program Blocks
CREATE POLICY "Anyone can view program blocks" ON public.event_program_blocks FOR SELECT USING (true);
CREATE POLICY "Admins can manage program blocks" ON public.event_program_blocks FOR ALL TO authenticated USING (public.is_admin());

-- Program Block Speakers
CREATE POLICY "Anyone can view block speakers" ON public.event_program_block_speakers FOR SELECT USING (true);
CREATE POLICY "Admins can manage block speakers" ON public.event_program_block_speakers FOR ALL TO authenticated USING (public.is_admin());

-- Gallery Images
CREATE POLICY "Anyone can view gallery images" ON public.event_gallery_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage gallery images" ON public.event_gallery_images FOR ALL TO authenticated USING (public.is_admin());

-- ------------------------------------------
-- C. RSVPs POLICIES
-- ------------------------------------------
CREATE POLICY "Users can view own RSVPs" ON public.rsvps FOR SELECT TO authenticated USING (auth.uid() = attendee_id OR public.is_admin_or_volunteer());
CREATE POLICY "Users can create own RSVP" ON public.rsvps FOR INSERT TO authenticated WITH CHECK (auth.uid() = attendee_id);
CREATE POLICY "Users can update own RSVP" ON public.rsvps FOR UPDATE TO authenticated USING (auth.uid() = attendee_id);
CREATE POLICY "Admins can manage all RSVPs" ON public.rsvps FOR ALL TO authenticated USING (public.is_admin());

-- ------------------------------------------
-- D. ATTENDANCE POLICIES (Volunteers & Admins)
-- ------------------------------------------
CREATE POLICY "Users view own attendance records" ON public.attendance FOR SELECT TO authenticated USING (auth.uid() = attendee_id OR public.is_admin_or_volunteer());
CREATE POLICY "Volunteers and admins can log attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_volunteer());
CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.is_admin());

-- ------------------------------------------
-- E. FEEDBACK POLICIES
-- ------------------------------------------
CREATE POLICY "Anyone can read feedback" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Users can submit feedback for themselves" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = attendee_id);
CREATE POLICY "Admins can manage feedback" ON public.feedback FOR ALL TO authenticated USING (public.is_admin());

-- ==========================================
-- 7. STORAGE BUCKET POLICY (event_images)
-- ==========================================
-- Note: Create the 'event_images' bucket in Supabase UI first and mark it PUBLIC.

-- Public Read Access to event_images bucket
CREATE POLICY "Public Read Access on event_images" ON storage.objects
FOR SELECT USING (bucket_id = 'event_images');

-- Admin & Volunteer Upload Access
CREATE POLICY "Admins and Volunteers can upload event images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'event_images' AND public.is_admin_or_volunteer()
);

-- Admin Delete Access
CREATE POLICY "Admins can delete event images" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'event_images' AND public.is_admin()
);