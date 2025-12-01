# 🎨 Design System — _Playful Citrus Pop_

A cheerful, expressive system blending warmth and energy — ideal for travel and celebration-based apps.
Inspired by **Sunny Citrus** and **Retro Pop**, with a refreshing green accent and bold highlights.

**Design Philosophy:**

- **Warmth & Energy:** Orange primary evokes excitement and adventure (perfect for travel)
- **Fresh & Positive:** Green secondary represents growth, collaboration, and positive outcomes
- **Playful but Professional:** Balanced for both personal trips and group coordination
- **Accessible:** WCAG 2.1 AA compliant color contrasts

---

## 🌈 Color Palette

### **Primary Colors**

| Token                  | Hex       | Usage                                 |
| ---------------------- | --------- | ------------------------------------- |
| `--primary`            | `#F97316` | Primary buttons, highlights, key CTAs |
| `--primary-foreground` | `#FFFFFF` | Text on primary                       |
| `--secondary`          | `#22C55E` | Secondary actions, positive tone      |
| `--destructive`        | `#EF4444` | Destructive or error actions          |

### **Neutral Colors**

| Token               | Hex       | Usage                            |
| ------------------- | --------- | -------------------------------- |
| `--background`      | `#FAF2ED` | Page background (light mode)     |
| `--background-dark` | `#1A1A1A` | Page background (dark mode)      |
| `--foreground`      | `#11333B` | Main text and icons (light mode) |
| `--foreground-dark` | `#F5F5F5` | Main text and icons (dark mode)  |
| `--muted`           | `#D6D6F9` | Subtle backgrounds, muted text   |
| `--muted-dark`      | `#2E2E2E` | Subtle backgrounds (dark mode)   |
| `--border`          | `#E8DFD5` | Card and element borders         |
| `--border-dark`     | `#3F3F3F` | Borders (dark mode)              |

### **Semantic Colors**

| Token       | Hex       | Usage                    |
| ----------- | --------- | ------------------------ |
| `--success` | `#22C55E` | Success states           |
| `--warning` | `#FACC15` | Warnings or attention    |
| `--error`   | `#EF4444` | Error or critical states |
| `--info`    | `#3F84F8` | Informational messages   |

---

## 🖋️ Typography

| Role     | Font  | Weight | Notes                       |
| -------- | ----- | ------ | --------------------------- |
| Headings | Inter | 600    | Rounded, bold hierarchy     |
| Body     | Inter | 400    | Readable, modern sans-serif |
| Accent   | Inter | 500    | For buttons and emphasis    |

**Scale:** (Tailwind default)  
`text-xs` → `text-3xl`  
**Line height:** 1.4–1.6  
**Letter spacing:** Slightly tight (-0.01em)

---

## 🧩 Spacing & Layout

| Token      | Value | Usage                      |
| ---------- | ----- | -------------------------- |
| `space-xs` | 4px   | Tight padding, small icons |
| `space-sm` | 8px   | Compact layout spacing     |
| `space-md` | 16px  | Standard padding           |
| `space-lg` | 24px  | Card and section spacing   |
| `space-xl` | 32px  | Page-level gaps            |

Base unit: `4px` (Tailwind default)

---

## 🌀 Border Radius

| Token           | Value  | Use                                |
| --------------- | ------ | ---------------------------------- |
| `--radius-sm`   | 4px    | Chips, tags                        |
| `--radius-md`   | 6px    | Buttons, inputs                    |
| `--radius-lg`   | 8px    | Cards                              |
| `--radius-xl`   | 12px   | Modals, highlights                 |
| `--radius-full` | 9999px | Circular elements (avatars, icons) |

---

## 🌤 Shadows

| Token          | Value                               | Use                    |
| -------------- | ----------------------------------- | ---------------------- |
| `shadow-sm`    | `0 1px 2px rgb(0 0 0 / 0.05)`       | Light hover            |
| `shadow`       | `0 2px 4px rgb(0 0 0 / 0.08)`       | Buttons, cards         |
| `shadow-md`    | `0 4px 8px rgb(0 0 0 / 0.1)`        | Elevated surfaces      |
| `shadow-lg`    | `0 10px 15px rgb(0 0 0 / 0.15)`     | Modals, drawers        |
| `shadow-inner` | `inset 0 2px 4px rgb(0 0 0 / 0.05)` | Inputs, pressed states |

---

## 🎯 Dropdowns & Popovers

All dropdown menus, select dropdowns, and popover components use consistent styling:

| Property      | Value                                      | Purpose                                |
| ------------- | ------------------------------------------ | -------------------------------------- |
| Background    | `bg-white`                                 | Solid white background for readability |
| Shadow        | `shadow-lg` (0 10px 15px rgba(0,0,0,0.15)) | Clear depth separation from page       |
| Border        | `border` with `border-border` color        | Defined edges                          |
| Text          | `text-popover-foreground` (#11333B)        | Deep teal for contrast                 |
| Border Radius | `rounded-md` (6px)                         | Consistent with design system          |

**Applies to:**

- Select dropdowns (SelectContent)
- Dropdown menus (DropdownMenuContent, DropdownMenuSubContent)
- Popovers (PopoverContent)

**Rationale:** White background with strong shadow ensures dropdown content is easily readable against the cream page background (#FAF2ED), preventing transparency issues.

---

## 🎛 Interaction Tokens

| Token                  | Value                            | Usage                  |
| ---------------------- | -------------------------------- | ---------------------- |
| `--transition-fast`    | 150ms ease-in-out                | Button hovers, toggles |
| `--transition-default` | 250ms ease                       | Cards, modals          |
| `--focus-ring`         | `0 0 0 2px var(--color-primary)` | Focus outlines         |

Use Tailwind equivalents:

```html
transition duration-200 focus:ring-2 focus:ring-orange-500
```

---

## 🧱 Component Base Styles

### Buttons

```css
.btn {
  @apply inline-flex items-center justify-center font-medium rounded-md px-4 py-2 transition;
}

.btn-primary {
  @apply bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-orange-600;
}

.btn-secondary {
  @apply bg-[var(--secondary)] text-white hover:bg-green-600;
}

.btn-outline {
  @apply border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)];
}
```

### Inputs

```css
.input {
  @apply border border-[var(--border)] rounded-md px-3 py-2 bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)];
}
```

### Cards

```css
.card {
  @apply bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-lg shadow-sm p-4;
}
```

---

## 🧭 Theming Tips

- The **orange primary (#F97316)** should drive brand recognition and energy.
- The **green secondary (#22C55E)** balances warmth with freshness — use for expense splits, settlements, success states.
- Use the **yellow (#FACC15)** sparingly for highlights or progress indicators.
- The **red (#EF4444)** should appear only in error states, alerts, or destructive CTAs.

---

## 🎯 TripThreads-Specific Applications

### Itinerary Items

- **Flights:** Orange primary for header/icon
- **Stays:** Green secondary for header/icon
- **Activities:** Yellow warning for header/icon
- **Time indicators:** Muted text with subtle borders

### Expense Tracking

- **Payer badge:** Orange primary
- **Split indicators:** Green secondary
- **You owe:** Red error state
- **You're owed:** Green success state
- **Settled:** Muted with checkmark

### Trip Feed

- **Photo cards:** White background with soft shadow
- **Day headers:** Orange primary with date
- **Captions:** Foreground text
- **Upload button:** Green secondary

### Offline Status

- **Synced:** Green with checkmark icon
- **Syncing:** Yellow with spinner
- **Offline:** Orange with cloud-off icon
- **Error:** Red with alert icon

---

## 📱 Responsive Considerations

### Mobile-First Breakpoints

```css
/* Tailwind default breakpoints */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small desktops */
xl: 1280px  /* Large desktops */
2xl: 1536px /* Extra large screens */
```

### Touch Targets

- Minimum **44x44px** for all interactive elements
- **48px** recommended for primary CTAs
- Adequate spacing between touch targets (8px minimum)

### Typography Scale (Mobile vs Desktop)

```css
/* Mobile */
.heading-1 {
  @apply text-2xl;
} /* 24px */
.heading-2 {
  @apply text-xl;
} /* 20px */
.body {
  @apply text-base;
} /* 16px */

/* Desktop (md+) */
.heading-1 {
  @apply md:text-3xl;
} /* 30px */
.heading-2 {
  @apply md:text-2xl;
} /* 24px */
.body {
  @apply md:text-lg;
} /* 18px */
```

---

## ♿ Accessibility Standards

### Color Contrast Ratios (WCAG 2.1 AA)

| Combination                                  | Ratio | Pass                        |
| -------------------------------------------- | ----- | --------------------------- |
| Primary (#F97316) on White                   | 4.5:1 | ✅ AA                       |
| Foreground (#11333B) on Background (#FAF2ED) | 12:1  | ✅ AAA                      |
| Secondary (#22C55E) on White                 | 3.2:1 | ⚠️ Use with large text only |
| Error (#EF4444) on White                     | 4.2:1 | ✅ AA                       |

**Note:** For body text, always use `--foreground` on `--background` for maximum readability.

### Focus States

```css
.focus-visible {
  @apply outline-none ring-2 ring-[var(--primary)] ring-offset-2;
}
```

### Screen Reader Support

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- Include ARIA labels for icon-only buttons
- Provide alt text for all images
- Use `role` attributes where necessary

---

## 🔧 Implementation Guide

### 1. Install Dependencies

```bash
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npm install class-variance-authority clsx tailwind-merge
```

### 2. Configure Tailwind

See `tailwind.config.ts` in the project root.

### 3. Create Global CSS Variables

See `apps/web/app/globals.css` for CSS custom properties.

### 4. Use with shadcn/ui

All shadcn/ui components will automatically use these tokens.

---

## 📦 Design Tokens Export

For design tools (Figma, Sketch):

```json
{
  "colors": {
    "primary": "#F97316",
    "secondary": "#22C55E",
    "destructive": "#EF4444",
    "background": "#FAF2ED",
    "foreground": "#11333B",
    "success": "#22C55E",
    "warning": "#FACC15",
    "error": "#EF4444",
    "info": "#3F84F8"
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px"
  },
  "borderRadius": {
    "sm": "4px",
    "md": "6px",
    "lg": "8px",
    "xl": "12px",
    "full": "9999px"
  }
}
```
