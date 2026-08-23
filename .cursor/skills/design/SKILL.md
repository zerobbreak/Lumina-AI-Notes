---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with exceptional design quality. Use when building web components, pages, applications, landing pages, dashboards, React components, or when styling/beautifying any web UI. Generates creative, polished code that avoids generic AI aesthetics.
---

# Frontend Design Skill

Create distinctive, production-grade frontends that avoid "AI slop" aesthetics. Make bold creative choices and execute with precision.

## Design Thinking

Before coding, commit to a clear aesthetic direction:

1. **Purpose**: What problem does this solve? Who uses it?
2. **Tone**: Pick a direction: brutalist, retro-futuristic, editorial/magazine, luxury/refined, playful, industrial, art deco, organic/natural, maximalist, soft/pastel
3. **Differentiation**: What makes this unforgettable?

**CRITICAL**: State your aesthetic direction in one sentence before generating code.

## Typography

Choose fonts that are distinctive and characterful. Import from Google Fonts.

**Never use**: Inter, Roboto, Arial, Open Sans, Lato, system fonts, Space Grotesk, Poppins, Montserrat, Raleway

**Impact choices by context**:
- Code/Technical: JetBrains Mono, Fira Code, IBM Plex Mono
- Editorial: Playfair Display, Crimson Pro, Fraunces, Newsreader
- Startup/Modern: Clash Display, Satoshi, Cabinet Grotesk
- Distinctive: Bricolage Grotesque, Obviously, Syne, Unbounded

**Pairing principle**: High contrast = interesting. Display + monospace, serif + geometric sans.

**Use extremes**: 100/200 weight vs 800/900, not 400 vs 600. Size jumps of 3x+, not 1.5x.

## Color & Theme

Define all colors as CSS custom properties at `:root`:

```css
:root {
  --bg-primary: #0a0a0f;
  --bg-surface: #141419;
  --border: #2a2a35;
  --text-primary: #fafafa;
  --text-muted: #8a8a95;
  --accent: #ff6b35;
  --accent-muted: #ff6b3520;
}
```

**Rules**:
- Commit to dominant color family + 1-2 sharp accents
- Avoid evenly distributed rainbow palettes
- Vary between dark and light themes across generations
- Draw from IDE themes, cultural aesthetics, or specific eras for inspiration

**Avoid**: Purple-to-blue gradients on white (classic AI slop)

**Example palettes**:
- Deep navy + warm cream + electric amber
- Bone white + charcoal + blood orange  
- Obsidian + muted sage + warm gold
- Off-white + slate + coral pink

## Motion & Interaction

Prefer CSS-only solutions. Use `motion` library (Framer Motion) for React when available.

**High-impact patterns**:
- Staggered page load with `animation-delay`
- Smooth hover state transitions (scale, color, shadow)
- Scroll-triggered reveals for sections
- Micro-interactions on buttons and interactive elements

**Focus on moments**: One orchestrated page load > scattered micro-interactions.

**Expressive states**: Hover, active, focus-visible should be distinctive, not just opacity changes.

```css
.button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px var(--accent-muted);
}
```

## Spatial Composition & Layout

- Design with intentional whitespace—generous negative space OR controlled density
- Consider asymmetry, overlap, diagonal flow, grid-breaking elements
- Use CSS Grid and Flexbox precisely
- Vary between full-bleed sections, contained cards, and open canvas

**Avoid**: Centered hero + 3-column features + footer (predictable patterns)

## Backgrounds & Visual Depth

Create atmosphere rather than flat solid colors:

- Gradient meshes, radial gradients
- SVG noise textures, subtle grain overlays
- Geometric patterns, layered transparency
- Dramatic drop shadows
- Glassmorphism (sparingly, intentionally)

Match background complexity to the aesthetic vision.

## Code Quality Standards

- **Semantic HTML**: nav, main, article, section, header, footer, button
- **CSS Variables**: All design tokens (colors, spacing, radii, shadows)
- **Responsive**: Mobile-first. Use `clamp()`, `min()`, `max()` for fluid typography
- **Accessibility**: WCAG AA contrast, focus-visible styles, aria labels, keyboard navigation
- **No inline styles** for design values
- **Self-contained**: All code works as single file unless multi-file explicitly requested

## What to Actively Avoid

| Pattern | Why |
|---------|-----|
| Inter, Roboto, Space Grotesk fonts | Generic AI output signal |
| Purple gradients on white | Clichéd AI aesthetic |
| Centered hero + 3-column features + footer | Predictable, forgettable |
| 5 equally weighted pastel colors | Timid, lacks focus |
| Uniform rounded corners everywhere | Cookie-cutter design |
| "Welcome to [Product]" hero text | Generic placeholder |
| Same design twice | Every generation should look different |

## Framework-Specific Notes

### React/Next.js
- Use functional components with hooks
- Export default component
- Include styles as CSS-in-JS or `<style>` tag when no stylesheet available
- Use `motion` library for animations when available

### HTML/CSS
- Self-contained single file
- Inline CSS in `<style>` block
- Load fonts via Google Fonts `<link>`

### Tailwind CSS
- Use custom color palette via config or CSS variables
- Leverage arbitrary values `[#hex]` for distinctive colors
- Custom animations in tailwind.config.js

## Output Format

1. **One sentence** naming your aesthetic direction
2. **Complete, working code block**
3. **Optional**: 2-3 bullets on what makes it distinctive and how to customize

## Example Aesthetic Directions

- "Going for industrial brutalist with high-contrast yellow accents and condensed display typography."
- "Soft editorial aesthetic inspired by Japanese minimalism with generous whitespace and Fraunces serif."
- "Retro-futuristic dark theme with neon accents, geometric patterns, and JetBrains Mono."
- "Warm, organic feel with earth tones, hand-drawn textures, and Cabinet Grotesk."

---

Remember: Exceptional design comes from strong decisions executed with precision. Make a bold choice and commit fully.
