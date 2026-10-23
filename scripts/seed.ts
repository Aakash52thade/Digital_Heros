import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
  );
  process.exit(1);
}

const adminEmail = process.env.ADMIN_EMAIL || "admin@digitalheroes.test";
const adminPassword = process.env.ADMIN_PASSWORD || "AdminHero123!";
const testEmail = process.env.TEST_USER_EMAIL || "test@digitalheroes.test";
const testPassword = process.env.TEST_USER_PASSWORD || "TestHero123!";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const sampleCharities = [
  {
    name: "Clean Water Initiative",
    slug: "clean-water-initiative",
    description:
      "Bringing sustainable clean drinking water to remote and underserved rural communities.",
    image_url: "https://images.unsplash.com/photo-1541544741938-0af808871cc0",
    gallery: [],
    is_featured: true,
    is_active: true,
    event: {
      title: "Annual Water Walkathon",
      description:
        "Community 5k walk raising funds and awareness for local filtration systems.",
      event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Central Park Community Hall",
    },
  },
  {
    name: "Youth Bright Horizons",
    slug: "youth-bright-horizons",
    description:
      "Empowering underprivileged youth through mentorship, education grants, and STEM resources.",
    image_url: "https://images.unsplash.com/photo-1509062522246-3755977927d7",
    gallery: [],
    is_featured: false,
    is_active: true,
    event: {
      title: "STEM Innovation Showcase",
      description:
        "Mentee robotics and software science fair showcasing student projects.",
      event_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Metro Science Center",
    },
  },
  {
    name: "Green Earth Forest Project",
    slug: "green-earth-forest",
    description:
      "Reforesting native woodlands and restoring biodiversity across degraded ecosystems.",
    image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
    gallery: [],
    is_featured: false,
    is_active: true,
    event: {
      title: "10,000 Tree Planting Day",
      description:
        "Volunteer native tree planting day in the community forest reserve.",
      event_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Valley Watershed Reserve",
    },
  },
  {
    name: "Community Food Relief",
    slug: "community-food-relief",
    description:
      "Distributing fresh nutritious groceries and prepared meals to families facing food insecurity.",
    image_url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c",
    gallery: [],
    is_featured: false,
    is_active: true,
    event: {
      title: "Harvest Food Drive & Gala",
      description:
        "Seasonal food collection banquet with live charity auction.",
      event_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Civic Pavilion",
    },
  },
  {
    name: "Senior Care & Companionship",
    slug: "senior-care-companionship",
    description:
      "Providing compassionate home visits, medical transportation, and wellness activities for isolated elders.",
    image_url: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289",
    gallery: [],
    is_featured: false,
    is_active: true,
    event: {
      title: "Silver Harmony Tea Dance",
      description:
        "Afternoon of music, tea, and companionship connecting generations.",
      event_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Heritage Community Center",
    },
  },
];

/**
 * Idempotently creates or finds an auth user.
 */
async function ensureUser(
  email: string,
  password: string,
  fullName: string,
  role: "admin" | "subscriber"
) {
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  let user = listData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      });

    if (createError) {
      throw createError;
    }
    user = createData.user;
    console.log(`Created user: ${email} (${role})`);
  } else {
    console.log(`User already exists: ${email} (${role})`);
  }

  // Ensure profiles table has proper full_name and role
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      role,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw profileError;
  }

  return user;
}

/**
 * Main seed execution routine.
 */
async function main() {
  console.log("Starting idempotent database seed...");

  // 1. Admin user
  await ensureUser(adminEmail, adminPassword, "System Administrator", "admin");

  // 2. Test subscriber user
  await ensureUser(testEmail, testPassword, "Test Subscriber", "subscriber");

  // 3. 5 Sample charities and events
  for (const item of sampleCharities) {
    const { event, ...charityData } = item;

    const { data: charity, error: charityError } = await supabase
      .from("charities")
      .upsert(charityData, { onConflict: "slug" })
      .select("id")
      .single();

    if (charityError) {
      throw charityError;
    }

    // Clean existing event for this charity and insert fresh one
    await supabase.from("charity_events").delete().eq("charity_id", charity.id);

    const { error: eventError } = await supabase.from("charity_events").insert({
      charity_id: charity.id,
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      location: event.location,
    });

    if (eventError) {
      throw eventError;
    }
  }

  console.log("Successfully seeded 5 sample charities and events.");
  console.log("Seed finished successfully.");
}

main().catch((err) => {
  console.error("Seed script error:", err);
  process.exit(1);
});
