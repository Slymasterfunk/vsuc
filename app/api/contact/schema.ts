import { z } from "zod";

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export const EXCLUDED_STATES = ["NY", "NJ", "ME", "CO"] as const;

export const STATUS_OPTIONS = [
  "Haven't filed",
  "Denied",
  "Increase",
  "Just exploring",
] as const;

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email").max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  state: z.enum(US_STATES, { message: "Select your state" }),
  status: z.enum(STATUS_OPTIONS).optional(),
  message: z.string().trim().min(10, "Tell us a little more").max(4000),
  turnstileToken: z.string().optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof contactSchema>;

export function isExcludedState(state: string): boolean {
  return (EXCLUDED_STATES as readonly string[]).includes(state);
}
