/**
 * Type-safe environment variable access.
 * All required vars are validated at startup.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env = {
  // App
  NODE_ENV: process.env.NODE_ENV ?? "development",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  // Supabase
  SUPABASE_URL: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // Stripe
  STRIPE_SECRET_KEY: requireEnv("STRIPE_SECRET_KEY"),
  STRIPE_PUBLISHABLE_KEY: requireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Resend (email)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM ?? "noreply@termcatch.com",

  // Twilio (SMS/WhatsApp)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
  TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,

  // Google Maps
  GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,

  // Upstash Redis (rate limiting, caching)
  UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
} as const;
