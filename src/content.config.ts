import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const spas = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/spas" }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    city: z.string(),
    area: z.string().optional(),
    address: z.string(),
    officialUrl: z.string().url(),
    googleMapsUrl: z.string().url(),
    lat: z.number(),
    lng: z.number(),
    tags: z.array(z.string()).default([]),
    notes: z.string().optional(),
    lastCheckedAt: z.string(),
  }),
});

export const collections = { spas };
