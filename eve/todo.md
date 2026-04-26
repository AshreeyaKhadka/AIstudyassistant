# CE Study Assistant - Project TODO List

This TODO list is derived from the product requirements (`design.md`) and the UI design system (`uidesign.md`).

## Phase 1: Foundation (Weeks 1-3)
- [ ] Set up Flask project structure and environment.
- [ ] Set up basic React shell with Vite.
- [ ] Configure PostgreSQL database.
- [ ] Implement user DB schema (`users`, `subjects`, `syllabus_docs`, `student_uploads`, `chat_sessions`, `chat_messages`, `quiz_sets`, `doc_embeddings`).
- [ ] Implement Google OAuth 2.0 login flow via Flask backend.
- [ ] Setup JWT-based session management (HttpOnly cookies).
- [ ] Implement role-based access control (Student vs. Admin).
- [ ] Seed preliminary admin users.

## Phase 1.5: UI Design System Setup (The Intellectual Architect)
- [ ] **Typography**: Set up `Manrope` for display/headlines and `Inter` for body/UI text. Ensure `headline-md` pairs with `title-sm` effectively.
- [ ] **Colors & Surfaces**: 
  - Establish deep professional blue hierarchy & "Cool Neutral" foundation.
  - Implement surface hierarchy (base: `surface`, nesting: `surface-container-low` up to `surface-container-lowest`).
- [ ] **Elevation & Depth**:
  - Implement depth via color shifts (layering principle) rather than shadows for static cards.
  - Set up ambient shadows for floating UI elements (Modals, Popovers).
  - Implement 15% opacity ghost borders (`outline-variant`) for same-color background separation.
- [ ] **Components**:
  - **Buttons**: Primary (Gradient fill), Secondary, Tertiary.
  - **Inputs**: Modern input with `surface-container-low` background and `2px` bottom-only stroke.
  - **Chips**: Selection chips with `full` radius.
  - **Cards & Lists**: Build divider-free lists separating items with 12px vertical space.

## Phase 2: Core Chat (Weeks 4-6)
- [ ] Develop Pre-loaded syllabus upload feature.
- [ ] Build Chat UI following the design system guidelines (Glassmorphism, asymmetrical margins).
- [ ] Implement floating panels (e.g., AI chat bubbles) using Glassmorphism (80% opacity, 24px backdrop blur).
- [ ] Set up LLM backend integration (placeholder first, then Claude/OpenAI/Ollama).
- [ ] Build RAG pipeline (chunking, embedding via pgvector).
- [ ] Provide AI chatbot conversational capabilities with context memory.
- [ ] Enable streaming responses for fluidity.

## Phase 3: Upload & Quizzes (Weeks 7-9)
- [ ] Create UI for Student PDF upload (limit 10 per pilot student).
- [ ] Back-end parsing for PDF text extraction (PyMuPDF).
- [ ] Incorporate per-student RAG embeddings for uploaded content.
- [ ] Build Quiz generation UI and logic (AI-generated from syllabus).
- [ ] Build Flashcard mode (flip cards).
- [ ] Implement quiz history persistence.
- [ ] Implement "Insight Card" for AI-generated summaries (using `tertiary-fixed` background with left-hand accent).

## Phase 4: Admin Dashboard (Weeks 10-11)
- [ ] Implement User Management interfaces (view, search, ban/suspend features).
- [ ] Build User Activity & Usage Stats dashboard.
- [ ] Build System Health & Uptime Monitoring panel.
- [ ] Configure Content Management interface for syllabus PDFs (upload, tag, reindex).

## Phase 5: Polish and Pilot Launch (Week 12)
- [ ] Verify UI Do's and Don'ts:
  - Assert no 1px solid borders for sectioning (use background color shifts).
  - Ensure no pure black text is used (use `#191c1d`).
  - Use `xl` (1.5rem) radius for large containers, `sm` (0.25rem) for small items.
  - Assert `body-lg` is prioritized for the first paragraph of notes.
- [ ] Bug fixes and performance testing.
- [ ] Run platform pilot with 50-100 students.
- [ ] Monitor analytics, errors, and system loads.
- [ ] Gather and address feedback.

## Open Questions to Address Later
- [ ] Decide on Gmail domain restriction (Specific university vs. any account).
- [ ] Decide on the final LLM Provider (Cost vs Privacy).
- [ ] Determine scalable file storage scheme (Local vs S3).
- [ ] Figure out the operational protocol for handling semester syllabus revisions.
- [ ] Determine if a gamified point-system for quizzes needs future integration.
