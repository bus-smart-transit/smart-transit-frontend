---
name: SmartTransit Frontend
description: Role-based transit operations UI focused on clarity, reliability, and secure staff workflows.
colors:
  navy-800: "#153a6b"
  navy-900: "#0e2749"
  teal-400: "#6ac1b8"
  teal-500: "#48a89d"
  cyan-300: "#41fdfe"
  ink-900: "#101418"
  slate-bg: "#f1f5f9"
  slate-border: "#e2e8f0"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
    fontWeight: 400
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.25
    fontWeight: 500
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 500
rounded:
  xl: "0.75rem"
  xxl: "1rem"
  pill: "9999px"
spacing:
  xs: "0.75rem"
  sm: "1rem"
  md: "1.25rem"
  lg: "1.5rem"
  staff-grid-mobile: "0.75rem"
  staff-grid-desktop: "1.25rem"
  staff-card-padding-mobile: "1.25rem"
  staff-card-padding-desktop: "1.5rem"
  staff-card-padding-compact: "0.75rem"
  staff-card-padding-roomy: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "0.625rem 1.25rem"
  button-accent:
    backgroundColor: "{colors.teal-400}"
    textColor: "{colors.navy-900}"
    rounded: "{rounded.pill}"
    padding: "0.625rem 1.25rem"
  card-default:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.xl}"
    border: "1px solid {colors.slate-border}"
    shadow: "shadow-sm"
    padding: "{spacing.staff-card-padding-mobile} / {spacing.staff-card-padding-desktop}"
  staff-card:
    className: "staff-card"
    backgroundColor: "{colors.white}"
    borderColor: "{colors.slate-border}"
    shadow: "shadow-sm"
    padding: "{spacing.staff-card-padding-mobile} mobile, {spacing.staff-card-padding-desktop} from sm, {spacing.staff-card-padding-roomy} roomy variant"
  staff-card-compact:
    className: "staff-card staff-card-compact"
    backgroundColor: "{colors.white}"
    borderColor: "{colors.slate-border}"
    shadow: "shadow-sm"
    padding: "{spacing.staff-card-padding-compact}"
  input-default:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.xl}"
    padding: "0.625rem 0.875rem"
---

# Design System: SmartTransit Frontend

## Overview

**Creative North Star: "Operational Clarity Under Motion"**

This interface system is designed for transit operations where role-specific decisions must stay fast, understandable, and safe under active service conditions. Visual hierarchy favors functional signal over decorative flourish, with stable containers, high-legibility labels, and strong action affordances.

The design language is modern utility with restrained brand accents: navy anchors trust and structure, teal handles positive momentum and secondary emphasis, and cool slate neutrals keep dense operational screens readable across long shifts.

Key characteristics:
- Staff-first legibility and predictable interaction states.
- Color used as role and status signal, not ambient decoration.
- Rounded but structured forms that balance friendliness and control.
- Compact spacing that remains touch-safe on mobile.

## Colors

The palette combines a governance base (navy + slate neutrals) with selective transit accents (teal/cyan) for actionable emphasis.

### Primary
- **Transit Navy** (#153a6b): Primary actions, role headers, high-priority interface anchors.

### Secondary
- **Operational Teal** (#6ac1b8): Accent actions, supportive call-to-action states, positive emphasis.

### Tertiary
- **Signal Cyan** (#41fdfe): High-energy highlight for specific visual signal moments.

### Neutral
- **Ink** (#101418): Primary foreground text and data-heavy content.
- **Slate Background** (#f1f5f9): Global page background and low-emphasis surfaces.
- **Slate Border** (#e2e8f0): Input and card separators.
- **White** (#ffffff): Elevated surface base.

### Named Rules
**The Signal-Not-Noise Rule.** Accent tones should call attention to action or status. Do not spread accent color across large neutral reading surfaces.

## Typography

**Display Font:** Poppins, system-ui, sans-serif  
**Body Font:** Inter, system-ui, sans-serif  
**Label/Mono Font:** JetBrains Mono, monospace (for numeric/data readouts)

**Character:** Poppins handles high-visibility section framing, while Inter carries dense operational copy with stable rhythm. JetBrains Mono is reserved for values where number distinction matters.

### Hierarchy
- **Display** (700, 2.25rem to 1.875rem range): Dashboard hero and major section framing.
- **Headline** (600-700, 1.5rem to 1.25rem): Card and panel headers.
- **Title** (600, 1.125rem to 1rem): Subsection titles and compact area headings.
- **Body** (400, 1rem, line-height 1.5): Main workflow text and table-adjacent content.
- **Label** (500, 0.875rem): Inputs, badges, and control labels.

### Named Rules
**The Role-First Hierarchy Rule.** Heading scale should support role workflow context before visual drama.

## Layout

Layout uses responsive container bands and card segmentation for operational scanability. The default page shell keeps content centered with adaptive horizontal padding via the container-page utility (1rem mobile, 1.5rem small screens, 2rem large screens) and a maximum width around 1280px.

Dense role dashboards rely on modular cards and section grouping rather than long uninterrupted columns. Mobile behavior preserves task order and interaction continuity over ornamental rearrangement.

### Staff Portal Shell (Batch 22)
- Sidebar navigation collapses to a hamburger-triggered drawer on mobile widths.
- A lightweight mobile top bar exposes brand context plus the drawer trigger.
- Driver/Conductor action headers keep a four-part model (route info, dynamic badge, single shift action, utilities) and wrap across rows on narrow screens rather than overflowing.

### Staff Spacing Tokens (Batch 22)
- Grid gaps use `staff-grid` utility backed by CSS variables: 12px mobile, 20px desktop.
- Card padding uses `staff-card` utility backed by CSS variables: 20px mobile, 24px desktop; roomy variant is 32px.
- Compact cards use `staff-card staff-card-compact` for small KPI/action tiles at 12px padding.
- These values are centralized in `src/index.css` and consumed by staff portals to avoid per-card hardcoded spacing.

## Elevation & Depth

Depth is present but restrained. The system uses soft card shadows for separation and hover-state amplification rather than dramatic layered effects.

### Shadow Vocabulary
- **card** (0 1px 2px rgba(16,20,24,0.04), 0 8px 24px -8px rgba(16,20,24,0.12)): Baseline elevated containers.
- **card-hover** (0 4px 8px rgba(16,20,24,0.06), 0 16px 32px -12px rgba(16,20,24,0.18)): Interactive lift on active/hoverable surfaces.

### Named Rules
**The Stable Surface Rule.** Persistent operational surfaces stay calm at rest; lift appears mostly during interaction.

## Shapes

Form language is rounded and practical. Inputs use rounded-xl corners, cards use rounded-2xl, and primary actions use pill geometry for immediate tap/click recognizability.

Borders are light and neutral, reinforcing structure without high visual friction.

## Components

### Buttons
- **Shape:** Rounded pill (full radius).
- **Primary:** Navy background with white text.
- **Accent:** Teal background with navy text.
- **Hover / Focus:** Darkened tone shifts and visible focus outlines/rings.
- **Secondary Modes:** Outline and ghost variants preserve hierarchy in dense UI clusters.

### Cards / Containers
- **Corner Style:** Rounded-xl for staff cards (`staff-card`), with existing specialized panels retaining custom geometry only when functionally required.
- **Background:** White on slate page ground.
- **Shadow Strategy:** `shadow-sm` at rest for the shared staff card baseline.
- **Border:** Slate-200 neutral border for edge definition.
- **Internal Padding:** tokenized via `staff-card` (20px mobile, 24px desktop), `staff-card-compact` (12px), and optional `staff-card-roomy` (32px).

### Inputs / Fields
- **Style:** White fill, slate border, rounded-xl corners.
- **Focus:** Navy-leaning focus ring and border reinforcement.
- **Error:** Red border/error text with icon signaling.
- **Disabled:** Low-contrast slate treatment with blocked interaction cues.

### Navigation
- Role dashboards use clear active-state framing and stable section grouping to reduce context switching errors.

## Do's and Don'ts

### Do:
- **Do** keep primary operational actions in the navy/teal action system.
- **Do** preserve card-based segmentation for role dashboards with dense information.
- **Do** reserve JetBrains Mono for numeric and machine-like data where readability gains are meaningful.
- **Do** keep focus states explicit for keyboard and low-precision interaction contexts.

### Don't:
- **Don't** flatten all emphasis into one color weight across an entire screen.
- **Don't** replace structured card boundaries with purely decorative backgrounds.
- **Don't** use display typography for long-form operational body text.
- **Don't** remove role-critical status contrast in the name of visual minimalism.
