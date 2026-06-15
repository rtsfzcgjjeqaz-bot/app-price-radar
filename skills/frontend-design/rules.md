# Frontend Design Rules

Concrete rules for layout, typography, spacing, and SEO structure. These are not suggestions — they are the minimum bar for non-templated, intentional design.

---

## Layout

- Design for a specific content hierarchy, not a generic grid. Decide what the page is *for* before choosing a layout.
- Every section has one job. If a section is trying to introduce, explain, and convert at the same time, split it or cut two of those jobs.
- Avoid the three-column card grid as a default. It is the most overused layout pattern on the web. Use it only when the content is genuinely parallel and scannable — not because it fills space evenly.
- Whitespace is structure. Use it to group related elements and separate unrelated ones. Do not fill gaps with decorative elements.
- Anchor the layout to one dominant element per screen. The eye needs somewhere to land. If everything competes, nothing wins.
- Responsive breakpoints should follow content, not device presets. A layout breaks when the content breaks, not at 768px because that's a common tablet width.

---

## Typography

- Choose typefaces for *this* project, not for legibility in the abstract. A typeface has a personality — match it to the subject.
- Use at most three type roles: display (headlines, hero text), body (running prose), and utility (labels, captions, data). Each role gets one typeface.
- Set a type scale with at least four distinct sizes. Arbitrary sizing is a sign that type is being adjusted visually rather than systematically.
- Line length for body text: 60–80 characters. Longer lines reduce comprehension. Shorter lines feel like a flyer.
- Leading (line-height) for body: 1.4–1.6. For display text at large sizes, compress to 1.0–1.2 — large type with loose leading looks unset.
- Never use system-default font stacks as the primary display face. `-apple-system, BlinkMacSystemFont, sans-serif` is a fallback, not a design decision.
- Avoid mixing two fonts from the same historical category (two transitional serifs, two geometric sans-serifs). The difference will be invisible to most readers and the similarity will read as a mistake.

---

## Spacing

- Define a spacing scale before writing any layout CSS. Eight-point grid (4, 8, 16, 24, 32, 48, 64, 96) is a reliable base. Arbitrary values (`margin-top: 23px`) signal that spacing was eyeballed.
- Spacing between related elements should be smaller than spacing between unrelated ones. This is Gestalt proximity — use it deliberately.
- Section padding should scale with viewport width. A section that has `padding: 40px` on mobile and `padding: 40px` on a 1440px screen looks compressed on desktop.
- Do not use margin and padding interchangeably. Margin separates elements from their neighbors. Padding separates content from its container's edge. Conflating them creates specificity bugs.
- Component spacing should be self-contained. A card component should not assume what's around it. Use gap in a flex/grid parent rather than margin on children.

---

## SEO Structure

- One `<h1>` per page. It states the page's single job in plain language. It is not a tagline, a brand slogan, or a welcome message.
- Heading hierarchy must reflect content hierarchy, not visual size. Do not pick `<h3>` because you want smaller text. Use the correct heading level and style it.
- Every page needs a unique `<title>` and `<meta name="description">`. The description is a 150–160 character summary of what the page does — not what the company is.
- Images must have `alt` text that describes the image's content or function. Decorative images get `alt=""`. An `alt` that says "image" or repeats the filename is worse than empty.
- Avoid hiding content that matters for SEO behind JavaScript rendering when it can be server-rendered. Search crawlers index the initial HTML — if the content isn't there, it doesn't exist.
- Landmark elements (`<header>`, `<main>`, `<nav>`, `<footer>`, `<article>`, `<section>`) are not optional. They are the semantic skeleton that screen readers and crawlers use to understand page structure.
- Use `<a>` for navigation and `<button>` for actions. A `<div>` with an `onClick` is not a link. It breaks keyboard navigation, screen readers, and right-click behavior.
- Page load performance is an SEO signal. Largest Contentful Paint should be under 2.5s. Do not load a full-page hero image at 4MB because it looked good in Figma.

---

## Avoiding Template Design

These are the specific patterns that signal a design was not made for this brief:

- **The terracotta + cream palette** — warm off-white background, high-contrast serif display, single earth-tone accent. Legitimate for some briefs; a default for too many.
- **The dark mode acid accent** — near-black background, single bright green or orange CTA. Overused in SaaS and developer tooling.
- **Numbered section markers (01 / 02 / 03)** — use only when content is genuinely sequential. Applying them to non-ordered content is pure decoration.
- **The three-stat row** — a big number, a small label, repeated three times across a section. Only appropriate when the numbers are the actual point.
- **The centered hero with subhead and two CTAs** — this is the default layout for every landing page generator. If the brief does not specifically call for it, find a different entry point.
- **Stock illustration style** — flat, pastel, isometric people with blob shapes. These read as Undraw/Storyset defaults immediately.

When you catch yourself reaching for any of these, ask: does this choice come from the brief, or from habit? If the answer is habit, change it.
