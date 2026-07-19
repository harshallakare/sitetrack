import { z } from "zod";

export const LOCALES = ["en", "hi", "mr"] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export const THEMES = ["light", "dark"] as const;
export const themeSchema = z.enum(THEMES);
export type Theme = z.infer<typeof themeSchema>;

export const updatePreferencesSchema = z
  .object({
    locale: localeSchema.optional(),
    theme: themeSchema.optional(),
  })
  .refine((v) => v.locale !== undefined || v.theme !== undefined, {
    message: "Provide at least one of locale or theme",
  });
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
