# Frontend Design Examples

Two contrasting examples — one intentional, one templated — with specific analysis of what separates them.

---

## Example 1: Intentional SEO Page Design

**Brief:** A landing page for a specialty coffee roaster that ships directly to consumers. Audience: coffee enthusiasts who already know the difference between a washed Ethiopian and a natural Colombian. Page job: convert a first-time visitor into a subscriber.

---

### Design decisions

**Palette — 4 named values:**
- `#1A0F00` Roast Black — near-black with a warm brown undertone, derived from dark-roasted bean color
- `#E8D5B0` Parchment — the color of unroasted green coffee, used as the page background
- `#C45B1E` Ember — a specific burnt-orange pulled from the Maillard reaction color range, used sparingly for a single accent
- `#6B4F3A` Grounds — mid-tone brown for secondary text and dividers

**Typography:**
- Display: *Canela* (or similar editorial serif with high contrast strokes) — used only for the hero headline and section titles, set tight at `line-height: 1.05`
- Body: *Söhne* (or similar humanist sans) — all running prose, labels, and UI elements
- No utility face needed — the two roles are enough

**Layout concept:**
```
┌─────────────────────────────────────────────┐
│  [logo]                    [nav: subtle]     │
├─────────────────────────────────────────────┤
│                                             │
│   The coffee you order on Tuesday          │
│   arrives Friday. Still warm from          │  ← Full-bleed hero, large editorial
│   the drum.                                │    serif, no image competing
│                                             │
│   [Subscribe — from $18/bag]               │
│                                             │
├─────────────────────────────────────────────┤
│  Current offering — single origin, named   │
│  farm, named harvest. Not "Ethiopia Yirgacheffe."│
│  The name of the person who picked it.     │
├─────────────────────────────────────────────┤
│  [Three bags, displayed as editorial       │
│   product photography — top-down, no       │
│   gradient, no drop shadow]                │
└─────────────────────────────────────────────┘
```

**Signature element:** The hero headline is set in display serif at a size that forces a line break at a semantically meaningful point — the phrase "Still warm from the drum" sits alone on its line, functions as a sensory hook, and is the one thing a visitor remembers.

---

### SEO structure

```html
<title>Direct-roast coffee subscriptions — [Roaster Name]</title>
<meta name="description" content="Single-origin coffee roasted to order and shipped within 48 hours. Subscribe from $18/bag. Current offering: Guji natural, Ethiopia." />

<header>…</header>
<main>
  <article>
    <h1>The coffee you order on Tuesday arrives Friday. Still warm from the drum.</h1>
    <section aria-label="Current offering">
      <h2>This week's roast</h2>
      …
    </section>
    <section aria-label="Subscription options">
      <h2>Choose your bag</h2>
      …
    </section>
  </article>
</main>
<footer>…</footer>
```

- `<h1>` is the sensory hook, not the brand name — the brand name is in `<title>` and `<header>`
- `<meta description>` contains concrete, scannable facts: price, origin, shipping window
- Images use descriptive `alt`: `alt="250g bag of Guji natural processed coffee, matte kraft packaging"` — not `alt="coffee bag"`
- No content hidden behind client-side JS — the product listing is server-rendered

---

### Why it works

Every choice traces back to the brief. The warm parchment background is not "warm and cozy brand" — it is the literal color of unroasted coffee. The editorial serif is not "premium" — it is the typeface register of specialty food journalism, which is exactly the audience's reading context. The hero headline does not describe the product; it describes the experience of receiving it, which is the actual conversion moment for a subscription.

---

---

## Example 2: Templated Design (What to Avoid)

**Same brief.** A specialty coffee roaster, direct-to-consumer subscription.

---

### What the template produces

**Palette:**
- `#F4F1EA` warm cream background
- `#1A1A1A` near-black text
- `#C47B3A` terracotta accent

*(This is Palette #1 from the calibration list in SKILL.md. It appears on hundreds of "artisan food" landing pages.)*

**Typography:**
- Display: a high-contrast serif (Playfair Display, or Cormorant) — the default "premium" choice
- Body: Inter or DM Sans — the default "clean" choice

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [Logo]              [Home] [Shop] [About]  │
├─────────────────────────────────────────────┤
│                                             │
│         Crafted with Passion                │  ← centered hero, vague tagline
│   Premium single-origin coffee,             │
│   delivered to your door.                   │
│                                             │
│   [Shop Now]      [Learn More]              │  ← two CTAs competing
│                                             │
├─────────────────────────────────────────────┤
│   01              02              03        │  ← numbered markers on
│  Sourced         Roasted        Delivered   │    non-sequential content
│  Ethically       Fresh          Fast        │
├─────────────────────────────────────────────┤
│  ┌──────┐   ┌──────┐   ┌──────┐            │  ← three-card product grid
│  │ bag  │   │ bag  │   │ bag  │            │
│  └──────┘   └──────┘   └──────┘            │
└─────────────────────────────────────────────┘
```

---

### Specific problems

| Element | What it does | Why it fails |
|---|---|---|
| "Crafted with Passion" | Generic tagline | Says nothing specific to this roaster — could appear on a candle company, a brewery, a bakery |
| Two CTAs in the hero | "Shop Now" + "Learn More" | Splits attention; "Learn More" defers the conversion moment with no payoff |
| 01 / 02 / 03 section | Sourced → Roasted → Delivered | These are not steps the user takes — they are the company's internal process. The numbering implies a sequence that does not exist for the buyer |
| Three-card grid | Three bag options | The grid format suggests comparison shopping; a subscription brief needs conversion, not browsing |
| Terracotta on cream | Accent color | Not derived from the subject — derived from what "artisan food" looks like in a Figma template |
| `alt="coffee bag"` | Image alt text | Non-descriptive; loses SEO signal and fails accessibility |

---

### SEO structure (broken)

```html
<title>Home — BeanCo</title>  <!-- no keywords, no value proposition -->
<meta name="description" content="Premium coffee delivered to your door." />
<!-- 11 words, no price, no origin, no differentiator -->

<div class="hero">
  <h1>Crafted with Passion</h1>   <!-- h1 used for tagline, not page purpose -->
  <p>Premium single-origin coffee, delivered to your door.</p>
</div>

<div class="features">           <!-- no landmark elements -->
  <div class="feature">…</div>   <!-- divs instead of semantic elements -->
</div>
```

- `<title>` contains only the brand name — a crawler learns nothing about the page
- `<h1>` is a slogan, not a page description — wastes the most weighted on-page SEO signal
- No `<main>`, `<article>`, `<section>` — the page has no semantic skeleton
- `<meta description>` is generic enough to apply to any competitor

---

### The core difference

The intentional design made choices *because of* the brief. Every element — the palette, the headline, the layout — can be traced back to something specific about specialty coffee, this audience, and this conversion goal.

The templated design made choices *despite* the brief. The warm cream, the numbered features, the two-CTA hero — none of these came from the subject. They came from a mental model of what "a nice product page" looks like, assembled from patterns seen on other sites.

The result looks competent and forgettable. That is the failure mode to avoid.
