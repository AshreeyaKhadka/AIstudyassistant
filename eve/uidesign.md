# Design System Document: The Intellectual Architect

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Curator"**
This design system moves beyond the utility of a standard notebook and into the realm of an editorial workspace. It is designed for high-level synthesis, where information feels curated rather than just stored. We break the "template" look by rejecting rigid, boxed-in grids in favor of **Intentional Asymmetry** and **Tonal Depth**. By utilizing wide gutters and overlapping surfaces, we create a sense of focused calm—a digital "clean desk" policy that fosters deep work.

The system conveys intelligence not through complexity, but through the extreme precision of its white space and the sophisticated layering of its neutral palette.

---

## 2. Colors & Surface Logic
The palette is rooted in a deep, professional blue hierarchy supported by a "Cool Neutral" foundation.

### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders are prohibited for sectioning.** Traditional lines create visual noise and "trap" content. Instead, boundaries must be defined solely through:
*   **Background Color Shifts:** Distinguish the sidebar from the main canvas using a transition from `surface` to `surface-container-low`.
*   **Tonal Transitions:** Use soft shifts in the `surface-container` tiers to define functional zones.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of heavy-weight vellum. 
*   **Base:** `surface` (#f8f9fa) is the desk.
*   **Nesting:** Place a `surface-container-lowest` (#ffffff) card on top of a `surface-container-low` (#f3f4f5) section. This creates a "natural lift" that feels architectural rather than digital.

### The "Glass & Gradient" Rule
To prevent the application from feeling "flat" or "generic," main CTAs and floating panels (like AI chat bubbles or floating toolbars) should utilize:
*   **Glassmorphism:** Use `surface-container-lowest` at 80% opacity with a `24px` backdrop-blur. 
*   **Signature Textures:** For primary actions, use a subtle linear gradient from `primary` (#005bbf) to `primary-container` (#1a73e8) at a 135-degree angle. This adds a "soul" and professional polish to the interaction point.

---

## 3. Typography: The Editorial Voice
We employ a dual-typeface system to balance authority with modern readability.

*   **Display & Headlines (Manrope):** This is our "Editorial" voice. Use `display-lg` through `headline-sm` for page titles and major section headers. Its geometric yet warm curves suggest a contemporary intelligence.
*   **Body & UI (Inter):** This is our "Functional" voice. Used for all `body-*`, `title-*`, and `label-*` roles. Inter’s high x-height ensures that even complex research notes remain legible at `body-sm` (0.75rem).

**Hierarchy Note:** Always pair a `headline-md` (Manrope) with a `title-sm` (Inter) sub-header to create a clear, authoritative contrast that guides the user’s eye through the document.

---

## 4. Elevation & Depth
Depth in this system is a measure of "Focus," not just "Shadow."

*   **The Layering Principle:** Avoid shadows for static cards. Instead, stack `surface-container-lowest` on `surface-container-high` to create depth.
*   **Ambient Shadows:** For floating elements (Modals, Popovers), use "Ambient" shadows. 
    *   *Values:* `0px 12px 32px rgba(25, 28, 29, 0.06)`. 
    *   The shadow must be tinted with the `on-surface` color to mimic natural light.
*   **The "Ghost Border" Fallback:** If a container sits on a background of the same color (accessibility requirement), use a **Ghost Border**: `outline-variant` (#c1c6d6) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), white text, `DEFAULT` (8px) radius. No border.
*   **Secondary:** `surface-container-highest` fill with `on-surface` text.
*   **Tertiary:** No fill. `on-primary-fixed-variant` text. High-contrast hover state with a subtle `surface-variant` background ghost-in.

### Input Fields
*   **The Modern Input:** Abandon the four-sided box. Use a `surface-container-low` background with a `2px` bottom-only stroke in `outline-variant`. On focus, the stroke transitions to `primary` and the background shifts to `surface-container-lowest`.

### Chips
*   **Selection Chips:** Use `secondary-container` with `on-secondary-container` text. These should feel like "pills" of information. Radius: `full`.

### Cards & Lists (The "Divider-Free" List)
*   **Rule:** Forbid the use of divider lines. 
*   **Execution:** Separate list items using `12px` of vertical white space and a subtle `surface-container-low` hover state that spans the full width of the container. 

### Additional Context-Specific Components
*   **The "Insight Card":** A specialized card for AI-generated summaries. Use a `tertiary-fixed` background with a `0.5rem` left-hand accent border in `tertiary`. This visually "flags" AI content as distinct from user notes.
*   **Floating Research Bar:** A `xl` (1.5rem) rounded input bar that uses Glassmorphism (80% `surface-container-lowest`) to float over the content, ensuring the user's research tools are always accessible but never obstructive.

---

## 6. Do’s and Don'ts

### Do
*   **Do** use asymmetrical margins (e.g., a wider left margin than right) to create an editorial, magazine-style layout.
*   **Do** use `body-lg` for the first paragraph of a note to act as a "Lede" in journalism.
*   **Do** prioritize `surface-container` shifts over shadows for 90% of your depth needs.

### Don’t
*   **Don’t** use pure black (#000000) for text. Always use `on-surface` (#191c1d) to maintain a soft, premium feel.
*   **Don’t** use the `DEFAULT` (8px) corner radius on everything. Use `xl` (1.5rem) for large containers and `sm` (0.25rem) for small internal elements to create visual nesting hierarchy.
*   **Don’t** use high-intensity blue for non-interactive elements. Reserve the `primary` blue for "The Thread of Action."