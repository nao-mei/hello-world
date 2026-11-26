// Single source of truth schemas. Content lives in /content (Tier 1 and Tier 2 only; see CLAUDE.md).
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const id = z.string().regex(/^[a-z0-9-]+$/);
const yaml = (dir: string) => glob({ pattern: '**/*.{yaml,yml}', base: `./content/${dir}` });

// Tier 1: exactly what is on the public CV / LinkedIn.
const roles = defineCollection({
  loader: yaml('roles'),
  schema: z.object({
    employer: z.string(),
    title: z.string(),
    startYear: z.number().int(),
    endYear: z.number().int().nullable(), // null = current
    themes: z.array(id).default([]), // ids of skills/problems (cross-checked at build)
    earlyCareer: z.boolean().default(false), // shown grouped and without dates (avoids age cues)
    theme: z.string().optional(), // one generic line about the role (draft, owner reviews)
    lesson: z.string().optional(), // what this seat taught me (draft, owner reviews)
    skills: z.array(z.string()).default([]), // generic skills, shown building up along the path
  }),
});

// Public things the owner has built or written. Links only to public pages.
const projects = defineCollection({
  loader: yaml('projects'),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    case: z.string(), // slug of the write-up page under /making/
    link: z.url().optional(), // the thing itself, when it can be shown
    icon: z.enum(['agent', 'workbench', 'guide', 'certificate']).default('agent'), // the small icon on the card
    tags: z.array(z.string()).default([]),
    order: z.number().int().default(0),
  }),
});

// Public awards and credentials only (on the owner's LinkedIn / Credly).
const recognition = defineCollection({
  loader: yaml('recognition'),
  schema: z.object({
    title: z.string(),
    issuer: z.string(),
    year: z.number().int(),
    kind: z.enum(['award', 'credential']),
    note: z.string().optional(),
    href: z.url().optional(),
    order: z.number().int().optional(),
    featured: z.boolean().default(false),
  }),
});

const skills = defineCollection({
  loader: yaml('skills'),
  schema: z.object({ label: z.string(), summary: z.string(), related: z.array(id).default([]) }),
});

// Tier 2: generic problem types, anonymised.
const problems = defineCollection({
  loader: yaml('problems'),
  schema: z.object({
    label: z.string(),
    summary: z.string(),
    order: z.number().int().default(0),
    // Rounded, relative outcomes only ("hours to minutes"); never exact internal figures.
    outcome: z.string().optional(),
    related: z.array(id).default([]),
  }),
});

const caseFiles = defineCollection({
  loader: yaml('case-files'),
  schema: z.object({
    title: z.string(),
    problem: id,
    fictionalOrg: z.string(), // must be invented
    before: z.string(),
    after: z.string(),
    staticAlt: z.string(), // text equivalent of the animated demo
  }),
});

const readme = defineCollection({
  loader: yaml('readme'),
  schema: z.object({
    heading: z.string(),
    short: z.string(), // "quick question" variant (default, JS-off view)
    deep: z.string().optional(), // "deep dive" variant
    order: z.number().int(),
  }),
});

const links = defineCollection({
  loader: yaml('links'),
  schema: z.object({
    label: z.string(),
    href: z.url().or(z.string().startsWith('/')),
    kind: z.enum(['cv', 'linkedin', 'github', 'contact', 'other']),
  }),
});

const commands = defineCollection({
  loader: yaml('commands'),
  schema: z.object({
    name: z.string(), // e.g. "whoami"
    aliases: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]), // extra words that should lead to this answer
    group: z.enum(['main', 'more', 'fun']).default('main'), // main: shown up front; more/fun: under "More"
    href: z.url().optional(), // an "Open" link shown with the answer
    output: z.string(),
    art: z.boolean().default(false), // ASCII art: shown in a monospace font
    hidden: z.boolean().default(false), // easter eggs
  }),
});

export const collections = { roles, recognition, projects, skills, problems, caseFiles, readme, links, commands };
