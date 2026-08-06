# Experience Architecture

> The source of truth for human experience in any governed project.
>
> Every project must define its Experience Architecture before any
> technical work begins. This document is the single source of truth
> for what the user feels, thinks, and does when interacting with
> the system.

---

## Structure

An Experience Architecture consists of ten required sections.

### 1. Vision

A one-sentence statement of the future this project creates.

```
What world exists after this project ships?
```

### 2. Mission

A one-sentence statement of what this project does.

```
What does this project build or enable?
```

### 3. Audience

Who this experience is for.

Defined across three dimensions:

| Dimension | Description |
|-----------|-------------|
| Demographics | Age, role, technical level, context |
| Psychographics | Values, aspirations, relationship with technology |
| Scenario | When and why they arrive at this experience |

### 4. Experience Goals

Three to five measurable outcomes for the human.

Not business metrics. Human outcomes:

```
Example:
- A visitor should feel a sense of discovery within 10 seconds
- A visitor should understand the creator's expertise without reading
- A visitor should want to explore further, not bounce
```

### 5. Emotional Journey

The sequence of emotions the user moves through.

Defined as a progression of **states** from the user's perspective:

```
Example:
Curiosity → Wonder → Discovery → Confidence → Delight
```

Each emotional state must describe:

- What triggers it
- What the user feels
- What the user does next

### 6. Narrative

The story the experience tells.

Defined as:

| Element | Description |
|---------|-------------|
| Hook | What captures attention immediately |
| Arc | How the story unfolds over time |
| Pacing | Rhythm of tension and release |
| Resolution | What the user walks away with |

### 7. Interaction Model

How the user interacts with the system.

Defined across:

| Dimension | Description |
|-----------|-------------|
| Inputs | Clicks, scrolls, keys, voice, gestures |
| Feedback | Visual, audio, haptic responses |
| State transitions | How the UI responds to user action |
| Flow | The path the user takes through the experience |

### 8. Motion System

How movement communicates meaning.

Defined across:

| Element | Description |
|---------|-------------|
| Principles | Easing, duration, sequencing rules |
| Micro-interactions | Button presses, hovers, toggles |
| Transitions | Page/screen/view changes |
| Ambient motion | Background, parallax, particle effects |

### 9. Visual Language

The visual identity of the experience.

Defined across:

| Element | Description |
|---------|-------------|
| Color | Palette and meaning of each color |
| Typography | Fonts, hierarchy, readability |
| Space | Layout grid, density, breathing room |
| Shape | Corners, borders, icons, imagery |
| Light | Shadows, gradients, depth |

### 10. Success Metrics

How we know the experience works.

Defined as measurable, verifiable criteria:

```
Example:
- First-time visitor spends >30 seconds on the page
- User can identify the creator's expertise within 5 seconds
- Scroll depth exceeds 70% on the primary narrative
- User returns within 7 days
```

Each metric must be:

| Property | Meaning |
|----------|---------|
| Observable | Can be measured without interpretation |
| Verifiable | Can be tested with real users or instrumentation |
| Actionable | If it fails, we know what to change |

---

## Validation Rules

An Experience Architecture is valid when all ten sections are:

1. **Present** — Not empty or placeholder
2. **Specific** — Applies to this project, not generic
3. **Consistent** — No section contradicts another
4. **Testable** — Success metrics can be measured
5. **Human-centered** — Describes human outcomes, not system features

---

## Amendment

An Experience Architecture may be amended only through a governed
decision recorded in the Engineering Governor decision log. Amendment
requires re-approval by the Experience Governor.

---

*This specification is governed by the Experience Governor.*
