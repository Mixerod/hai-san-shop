# UI/UX Design System — World-Class Standards

A framework for building interfaces that are functional, beautiful, and scalable across all devices.
Apply these rules to every component, page, and interaction. No exceptions.

\---

## 1\. Responsive Foundation (Non-Negotiable)

**Viewport meta tag — required in every root layout:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

**Breakpoint system:**

|Name|Width|Target devices|
|-|-|-|
|mobile|< 640px|phones (portrait/landscape)|
|tablet|640–1024px|tablets, small laptops|
|desktop|> 1024px|laptops, monitors|

**Hard rules:**

* Never use fixed `px` values for layout widths, margins, or padding. Use responsive utilities or `%` / `clamp()`.
* No horizontal overflow at any breakpoint. Apply `overflow-x: hidden` on the root wrapper if needed.
* All `font-size` values must be responsive: `text-sm sm:text-base`.
* All spacing must be responsive: `p-3 sm:p-5 lg:p-8`.
* All grids must be responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
* Every `<img>` and framework `<Image>` uses `width: 100%; height: auto` or a fixed `aspect-ratio`. Never hardcode pixel dimensions on layout images.
* Minimum `font-size: 16px` on all `<input>` fields — prevents iOS Safari auto-zoom.
* Minimum touch target size: `44×44px` on every interactive element (button, icon, link).

\---

## 2\. Design Tokens

Define once. Use everywhere. Never hardcode raw values in components.

**Color — semantic roles:**

```
Background base  : #FAFAFA
Surface (card)   : #FFFFFF
Border           : #E5E7EB  (gray-200)
Text primary     : #111827  (gray-900)
Text secondary   : #6B7280  (gray-500)
Text muted       : #9CA3AF  (gray-400)

Primary action   : #0EA5E9  (sky-500)   — CTAs, links, focus rings
Success          : #16A34A  (green-600) — completed, confirmed
Warning          : #D97706  (amber-600) — pending, needs attention
Danger           : #DC2626  (red-600)   — error, destructive action
Info             : #2563EB  (blue-600)  — informational, neutral alerts
```

Use semantic color only to convey meaning — never purely for decoration.
Neutral palette (white, gray, black) handles all structural elements.

**Spacing scale (multiples of 4px):**

```
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96px
```

**Border radius:**

```
sm   : 6px   — badges, chips, small inputs
md   : 8px   — buttons, inputs, dropdowns
lg   : 12px  — cards, panels
xl   : 16px  — modals, sheets
full : 9999px — pills, avatars
```

**Elevation (shadow):**

```
Level 0 : no shadow + border (default card)
Level 1 : shadow-sm  — hover state, focused card
Level 2 : shadow-md  — dropdowns, tooltips
Level 3 : shadow-xl  — modals, drawers
```

\---

## 3\. Typography

**Font stack:**

* Use a single, high-quality sans-serif. Recommended: `Inter`, `Plus Jakarta Sans`, or `DM Sans`.
* Import via Google Fonts with `display=swap`.
* Apply globally on `body`.

**Scale:**

```
Display  : text-4xl / text-5xl  font-bold    — hero headings
H1       : text-3xl             font-bold    — page titles
H2       : text-2xl             font-semibold — section titles
H3       : text-xl              font-semibold — card titles, sub-sections
H4       : text-lg              font-medium  — labels, group headers
Body     : text-base            font-normal  — default content
Small    : text-sm              font-normal  — helper text, metadata
XSmall   : text-xs              font-normal  — timestamps, badges, captions
```

All heading sizes must use responsive variants:

```
H1: text-2xl sm:text-3xl lg:text-4xl
H2: text-xl  sm:text-2xl lg:text-3xl
```

**Readability rules:**

* Line height: `leading-relaxed` (1.625) for body text. `leading-tight` for headings only.
* Max line length: `max-w-prose` (\~65ch) for long-form reading content.
* Always add `word-break: break-word` for languages with diacritics (Vietnamese, etc.).
* Never use `font-size` below `12px` in production.

\---

## 4\. Layout \& Composition

**Container:**



**max-w-7xl mx-auto px-4 sm:px-6 lg:px-8**

**Visual hierarchy model (F/Z pattern):**



**Top: KPI cards or key status — what matters most, readable in 5 seconds.**

**Middle: Charts, data grids, primary content.**

**Bottom/side: Detail tables, secondary actions, contextual info.**

**Grid principles:**



**Prefer CSS Grid for 2D layouts, Flexbox for 1D alignment.**

**Align items to an 8px baseline grid.**

**Use `gap` instead of manual margin between grid children.**



**Responsive Grid System (Strict Standards):**

**- Mobile   (< 640px)    : grid-cols-2**

**- Tablet   (640–1024px) : grid-cols-3**

**- Desktop  (> 1024px)   : grid-cols-4**



**Constraint:**

**- Minimum card width: 160px. If screen space forces card width < 160px, reduce column count immediately to ensure image clarity and readability.**

**Whitespace:**



**Generous whitespace is not waste — it creates focus.**

**Sections should breathe: `py-8 sm:py-12 lg:py-16`.**

**Never pack information edge-to-edge without padding.**

\---

## 5\. Component Standards

### Cards

```
bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5
hover:shadow-md transition-shadow duration-150
```

### Buttons

```
Primary : bg-sky-500 hover:bg-sky-600 active:scale-95 text-white
          px-4 py-2.5 rounded-lg font-medium transition-all duration-150
          min-h-\[44px]

Secondary: border border-gray-200 hover:bg-gray-50 text-gray-700
           px-4 py-2.5 rounded-lg font-medium transition-all duration-150

Danger  : bg-red-500 hover:bg-red-600 text-white (same structure)

Icon-only: min-w-\[44px] min-h-\[44px] flex items-center justify-center
           Must have aria-label
```

### Inputs

```
w-full border border-gray-200 rounded-lg px-3 py-2.5
text-base (minimum — prevents iOS zoom)
focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent
transition-shadow duration-150
placeholder:text-gray-400
```

### Badges / Status chips

```
inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
border

success : bg-green-50  text-green-700  border-green-200
warning : bg-yellow-50 text-yellow-700 border-yellow-200
danger  : bg-red-50    text-red-700    border-red-200
info    : bg-blue-50   text-blue-700   border-blue-200
neutral : bg-gray-100  text-gray-600   border-gray-200
```

### Tables

* Desktop: `<table>` with sticky header, `hover:bg-gray-50` on rows.
* Mobile (< 640px): Convert table to card list — each row becomes a card.
* Table header: `text-xs uppercase tracking-wider text-gray-500 bg-gray-50`.
* Cell padding: `px-4 py-3`.

### Forms

* Label always above input, never inside as placeholder.
* Error text: `text-red-500 text-xs mt-1` directly below the field.
* Group related fields in `grid grid-cols-1 sm:grid-cols-2 gap-4`.
* Submit button: full-width on mobile, auto-width on desktop.

\---

## 6\. Navigation

**Desktop (> 1024px):**

* Horizontal nav in header, `h-14`, sticky, `border-b border-gray-200`.
* Active tab: `border-b-2 border-sky-500 text-sky-600`.
* Inactive: `text-gray-500 hover:text-gray-800 transition-colors`.

**Tablet (640–1024px):**

* Horizontal nav with icon + text, condensed spacing.

**Mobile (< 640px):**

* Hamburger → slide-in drawer (`translate-x`) or bottom tab bar.
* Drawer: full height, `z-50`, with backdrop overlay `bg-black/40`.
* Bottom tab bar (if ≤ 5 items): `h-16`, icons + short labels, safe-area-inset.

\---

## 7\. Feedback \& States

Every interactive element must have all 5 states handled:

|State|Implementation|
|-|-|
|Default|Base style|
|Hover|`hover:` — shadow lift or bg shift|
|Focus|`focus:ring-2 focus:ring-sky-500 focus:ring-offset-1`|
|Active|`active:scale-95` or `active:brightness-95`|
|Disabled|`disabled:opacity-50 disabled:cursor-not-allowed`|

**Loading states:**

* Buttons: replace label with `<Spinner size={16} />` + disable button.
* Data sections: Skeleton loaders — `animate-pulse bg-gray-200 rounded` blocks matching real content shape. Never use a spinning circle alone.
* Page transitions: instant skeleton, not blank white screen.

**Empty states:**

* Always show: icon (muted) + short heading + brief description.
* Never leave a blank container.

**Notifications / Toasts:**

* Position: `bottom-right`, stacked, `z-50`.
* Auto-dismiss: 3 seconds for success, persistent for errors (until dismissed).
* Never use `window.alert()` or `window.confirm()` in production UI.
* Destructive confirmations: inline dialog within the component, not browser native.

\---

## 8\. Motion \& Micro-interactions

**Principles:**

* Motion conveys meaning, not decoration.
* Every animation must make the UI feel more responsive, not slower.
* Prefer `transition` over `animation` for hover/focus states.

**Timing:**

```
Instant  : 0ms     — toggle, checkbox
Fast     : 150ms   — hover, button press
Normal   : 250ms   — drawer open, modal appear
Slow     : 350ms   — page-level transitions
```

**Standard transitions:**

```css
/\* Interactive elements \*/
transition-all duration-150 ease-in-out

/\* Modals / Drawers \*/
transition-transform duration-250 ease-out

/\* Skeleton → Content \*/
transition-opacity duration-200
```

**Do not animate:**

* Layout shifts (width/height changes that reflow content).
* Every element on page load — pick 1–2 key elements maximum.
* Anything that loops without user intent.

\---

## 9\. Accessibility (a11y)

* Color contrast: minimum **4.5:1** for body text, **3:1** for large text (WCAG AA).
* Never convey information by color alone — pair with icon or text label.
* All icon-only buttons must have `aria-label`.
* All images must have `alt` text (empty `alt=""` for decorative images).
* Keyboard navigation: all interactive elements reachable via `Tab`, operable via `Enter`/`Space`.
* Focus ring must always be visible — never `outline: none` without a custom `focus:ring`.
* Use semantic HTML: `<main>`, `<nav>`, `<header>`, `<section>`, `<button>` (not `<div onClick>`).

\---

## 10\. Performance Perception

Performance *feels* faster when the UI responds immediately — even before data loads.

* **Optimistic UI:** Update the UI instantly on user action, roll back if server fails.
* **Skeleton over spinner:** Skeleton shapes the space — user perceives load time as shorter.
* **Lazy load** below-the-fold images and heavy components.
* **Avoid layout shift (CLS):** Reserve space for images with explicit `aspect-ratio` before they load.
* **Debounce** search inputs (300ms) to avoid excessive API calls.

\---

## 11\. Data-Dense Interfaces (Dashboards / Admin)

The "5-second rule": A user must understand the overall health/status of the system within 5 seconds of landing on the page.

**KPI cards (top row):**

* Max 4 cards in one row.
* Each card: 1 icon + 1 label + 1 big number. Nothing else.
* Use semantic color only on the number or icon, not the entire card background.

**Charts:**

* Line chart → trends over time.
* Bar chart → comparisons between categories.
* Avoid pie charts with more than 4 segments.
* Always label axes. Always show a no-data state.

**Tables:**

* Sticky header when table exceeds viewport height.
* Column alignment: text left, numbers right, status center.
* Pagination or infinite scroll — never dump 1000+ rows.
* Row actions (edit/delete) visible on hover (desktop), always visible (mobile).

**Filters:**

* Desktop: horizontal filter bar above the table.
* Mobile: collapsible filter panel or bottom sheet.
* Applied filters shown as dismissible chips below the filter bar.

\---

## 12\. What to Avoid

|Anti-pattern|Why|
|-|-|
|Fixed px layout values|Breaks on unexpected screen sizes|
|`window.alert()` / `window.confirm()`|Blocks UI thread, looks unprofessional|
|Color-only status indicators|Fails accessibility for color-blind users|
|Blank loading state (no skeleton)|Users perceive it as broken|
|Hardcoded font sizes in px|Ignores user browser font preferences|
|Icon-only buttons without aria-label|Screen readers cannot identify the action|
|Overflow-x on any page|Creates horizontal scroll — immediate UX failure|
|Inconsistent spacing (random px values)|Breaks visual rhythm|
|Multiple primary CTAs on one screen|Dilutes user focus — one primary action per view|
|Placeholder text as the only label|Disappears on focus, fails accessibility|



