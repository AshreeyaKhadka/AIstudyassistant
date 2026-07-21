# Task Spec: Syllabus Module (RAG-enabled) + Math Rendering Fix

## Context
An existing RAG pipeline already ingests and answers questions over uploaded **materials PDFs**. This spec adds a parallel **Syllabus** feature to the same app, plus a fix for broken LaTeX rendering in AI responses. **UI colors/theme must not change** — only new components/logic are added, styled with existing tokens.

---

## 1. New Section: "Syllabus" (separate from Materials)

Add a new top-level tab/section in the app, alongside the existing Materials/RAG section.

**Requirements:**
- Reuses the **same RAG pipeline** (embedding model, vector store, retriever, chat model) already built for materials — do not fork a second pipeline. Syllabus PDFs are just another document source/collection, tagged separately (e.g. `doc_type: "syllabus"`) so retrieval can be scoped to syllabus-only, materials-only, or both.
- Syllabus content should be chunked/embedded the same way as materials PDFs and stored in the same vector DB, partitioned by `subject_id` + `doc_type`.

**Backend tasks:**
- [ ] Add `doc_type` (enum: `material`, `syllabus`) and `subject_id` metadata fields to the ingestion pipeline.
- [ ] Add a Syllabus ingestion endpoint (`POST /syllabus/upload`) that reuses the existing chunk → embed → store logic.
- [ ] Add a retriever filter param so queries can be scoped: `{ subject_id, doc_type: "syllabus" }`.
- [ ] Expose a `GET /syllabus/:subjectId` endpoint to fetch/view the syllabus doc metadata (filename, upload date, subject).

---

## 2. Subject Selection (User-Configurable)

- [ ] Add a **Subject Manager** — user can create/select subjects (name, semester, optional code).
- [ ] Store subjects in DB: `{ id, name, semester, is_current, created_at }`.
- [ ] Every syllabus/material upload must be associated with a `subject_id` chosen from this list (dropdown), not hardcoded.
- [ ] Default view = subjects for the **current** semester; user can switch semesters to view backlog subjects.

---

## 3. Backlog Subjects (Cross-Semester)

- [ ] Allow the user to add **up to 4 "backlog" subjects** from previous/different semesters, in addition to current-semester subjects.
- [ ] UI: "Add Backlog Subject" button → subject form (name + semester tag) — disable/hide the button once 4 backlog subjects exist, with a message like "Backlog limit reached (4/4)".
- [ ] Backlog subjects behave identically to normal subjects for upload/RAG/query purposes — the only difference is the semester tag and the 4-subject cap.
- [ ] Validate cap server-side too (don't rely on UI-only enforcement).

---

## 4. One Syllabus Per Subject (Upload Constraint)

- [ ] Enforce **exactly one syllabus file per subject**.
- [ ] On upload: if a syllabus already exists for that `subject_id`, block the upload and prompt: *"A syllabus already exists for this subject. Replace it?"* → allow **replace** (delete old chunks/embeddings for that subject's syllabus, then ingest the new one) rather than allowing duplicates.
- [ ] Materials PDFs are unaffected by this constraint — multiple materials per subject remain allowed.
- [ ] DB constraint: unique index on `(subject_id, doc_type='syllabus')`.

---

## 5. Fix Math Rendering in AI Responses

**Problem:** LaTeX comes back from the model as raw text, e.g.:
```
$\lim_{x \to 2^-} f(x)$
```
instead of rendering as a proper equation.

**Fix:**
- [ ] Add a math-rendering library to the chat message renderer: **KaTeX** (lighter/faster) or **MathJax** (more complete LaTeX coverage).
- [ ] Recommended: `KaTeX` + `react-markdown` + `remark-math` + `rehype-katex` if the frontend is React/Markdown-based:
  ```bash
  npm install katex react-markdown remark-math rehype-katex
  ```
  ```jsx
  import ReactMarkdown from "react-markdown";
  import remarkMath from "remark-math";
  import rehypeKatex from "rehype-katex";
  import "katex/dist/katex.min.css";

  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
    {aiResponseText}
  </ReactMarkdown>
  ```
- [ ] Confirm the model is asked to wrap inline math in `$...$` and block/display math in `$$...$$` (standard convention `remark-math` expects) — adjust the system prompt if the model uses a different delimiter style (e.g. `\( \)` / `\[ \]`).
- [ ] Test with nested expressions, limits, fractions, matrices, and Greek letters to confirm rendering (not just simple `x^2`).

---

## 6. UI/Theme Constraint

- [ ] No changes to existing color palette, spacing, fonts, or component library.
- [ ] New Syllabus tab, Subject Manager, and backlog UI must reuse existing design tokens/CSS variables and component styles (buttons, cards, modals) already used in the Materials section — new screens should look like they were always part of the app, not a bolted-on feature.
- [ ] KaTeX's default CSS should be re-themed (font color, background) to match the existing chat bubble styling rather than left at KaTeX defaults.

---

## Suggested Data Model

```
Subject
 - id
 - name
 - semester
 - is_backlog (bool)
 - created_at

Document
 - id
 - subject_id (FK -> Subject)
 - doc_type ("material" | "syllabus")
 - filename
 - uploaded_at
 - vector_collection_ref

Constraint: unique(subject_id) where doc_type = 'syllabus'
Constraint: count(Subject where is_backlog = true) <= 4
```

## Acceptance Criteria Checklist
- [ ] User can create/select a subject before any upload.
- [ ] User can add up to 4 backlog subjects (blocked at 5th, both UI + API).
- [ ] Uploading a 2nd syllabus for the same subject triggers replace-confirmation, not a silent duplicate.
- [ ] Asking the RAG chat a question scoped to "syllabus" only retrieves syllabus chunks for the selected subject.
- [ ] Math expressions (`$...$`, `$$...$$`) render as formatted equations, not raw LaTeX strings.
- [ ] No visual regression in existing Materials section — theme/colors unchanged.
