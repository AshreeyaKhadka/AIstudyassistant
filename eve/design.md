# CE Study Assistant — Product Requirements Document

**Version:** 1.0 — Draft
**Date:** April 2026
**Owner:** Startup / Indie Team
**Target Users:** BE Computer Engineering Students, Pokhara University
**Pilot Scale:** 50–100 Students
**Stack:** React · Flask · PostgreSQL · Google OAuth 2.0

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [Core Features](#4-core-features)
5. [Admin Dashboard](#5-admin-dashboard)
6. [Technical Architecture](#6-technical-architecture)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Out of Scope](#8-out-of-scope-v1-pilot)
9. [Suggested Milestones](#9-suggested-milestones)
10. [Open Questions](#10-open-questions)

---

## 1. Product Overview

CE Study Assistant is a focused AI study companion built specifically for Bachelor of Engineering (Computer Engineering) students at Pokhara University. Unlike general-purpose tools such as NotebookLM, this platform is anchored to the PU CE syllabus — covering all eight semesters — and enables students to upload their own notes, interact with pre-loaded course content, and sharpen their knowledge through AI-generated quizzes and flashcards.

The platform authenticates users via Google OAuth 2.0 (institutional or personal Gmail) and is managed by an admin dashboard giving the startup team full visibility into system health, user activity, and content management.

---

## 2. Goals & Success Metrics

### 2.1 Primary Goals

- Provide a PU CE syllabus-aware AI assistant that answers questions in the context of actual course content.
- Enable students to upload PDFs/notes and query them conversationally.
- Offer AI-generated quizzes and flashcards per subject and semester.
- Authenticate users securely using Google OAuth 2.0 with session management.
- Provide admins with a comprehensive dashboard for monitoring and management.

### 2.2 Success Metrics (Pilot — 50–100 students)

- ≥ 70% of pilot users complete at least 3 chat sessions within the first 2 weeks.
- Average session length ≥ 5 minutes.
- Quiz completion rate ≥ 60%.
- System uptime ≥ 99% during pilot period.
- Admin can resolve content/user issues within 24 hours via dashboard.

---

## 3. User Personas

### 3.1 Student (Primary User)

- BE Computer Engineering student, Semester 1–8.
- Wants fast, relevant answers tied to their actual syllabus.
- Uploads lecture notes, past papers, and reference PDFs.
- Uses quizzes and flashcards for exam prep.
- Logs in with personal or university Google account.

### 3.2 Admin / Startup Team Member

- Manages the platform — monitors usage, manages content, handles user issues.
- Needs visibility into system health (CPU, memory, API latency).
- Uploads and curates pre-loaded syllabus content per course.
- Can ban/suspend users and manage roles.

---

## 4. Core Features

### 4.1 Authentication & Session Management

Authentication is handled entirely via Google OAuth 2.0. No username/password system will be built.

- Google OAuth 2.0 login flow via Flask backend.
- On first login, a student profile is created in PostgreSQL (name, email, avatar, semester).
- JWT-based session tokens issued by Flask; stored as HttpOnly cookies on the client.
- Token refresh handled server-side; sessions expire after 7 days of inactivity.
- Role-based access control: roles are `student` and `admin`, stored in the `users` table.
- Admins are seeded manually; no self-registration for admin role.

### 4.2 AI Chat — Syllabus-Aware Q&A

- Students select their semester and subject before starting a session.
- The system loads the relevant pre-loaded syllabus content as context.
- Students can ask conceptual questions, request explanations, and get examples.
- Chat history is persisted per user per subject in PostgreSQL.
- Backend calls the LLM API (e.g. Claude API) with the syllabus content + chat history as context.
- Response streaming supported for a fluid chat experience.

> **Note:** LLM integration is currently a placeholder. Set `LLM_PROVIDER` in `.env` to activate. See `services/llm_service.py`.

### 4.3 PDF / Notes Upload & Q&A

- Students upload PDFs (lecture notes, past papers) up to 20 MB per file.
- Files are parsed server-side (text extraction); embeddings stored in PostgreSQL with pgvector.
- A RAG (Retrieval-Augmented Generation) pipeline retrieves relevant chunks before each LLM call.
- Uploaded files are private to each student; students can delete their uploads.
- Max 10 uploaded files per student during pilot.

> **Note:** RAG embedding is currently a placeholder. Set `EMBEDDING_PROVIDER` in `.env` to activate. See `services/rag_service.py`.

### 4.4 Quizzes & Flashcards

- Students select a subject/topic; the AI generates 5–20 MCQ questions or flashcard pairs.
- Quiz results (score, timestamp) stored in PostgreSQL for the student's history.
- Flashcard mode: flip cards with question on front, answer on back.
- Students can regenerate a new quiz or save a quiz set for later review.
- Quiz generation is seeded from pre-loaded syllabus content (not just student uploads).

### 4.5 Pre-Loaded Syllabus Content

- Admins upload subject-wise content: PDFs, structured notes, past question compilations.
- Content is tagged by semester, subject, and unit.
- Accessible to all authenticated students without upload limits.
- Admins can update, replace, or remove syllabus content via the dashboard.

---

## 5. Admin Dashboard

The admin dashboard is a dedicated React interface (role-gated) accessible only to users with the `admin` role.

### 5.1 User Management

- View all registered students: name, email, semester, join date, last active.
- Ban or suspend a user (disables login); add a reason note.
- Assign or revoke admin role.
- Search and filter users by semester, status, or activity.

### 5.2 User Activity & Usage Stats

- Total active users (daily / weekly / monthly).
- Chat sessions per day; average session length.
- Most queried subjects and topics.
- Quiz completion rates per subject.
- PDF uploads count and storage usage.

### 5.3 System Health & Uptime Monitoring

- Server CPU and memory usage (live, last 24h graph).
- API response time (p50, p95) per endpoint.
- LLM API call count, latency, and error rate.
- Database connection pool status.
- Uptime percentage (last 7 days and 30 days).
- Alert log: any 5xx errors, failed auth events, or LLM API failures.

### 5.4 Content Management

- Upload, view, update, or delete syllabus PDFs and notes per subject/semester.
- Tag content with semester, subject, and unit labels.
- View storage usage per content category.
- Trigger a re-indexing (re-embedding) of updated content via `flask reindex`.

---

## 6. Technical Architecture

### 6.1 Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | Student UI & Admin Dashboard |
| Backend | Python + Flask | API, Auth, Business Logic |
| Database | PostgreSQL | Users, chats, quizzes, content |
| Vector Search | pgvector (Postgres ext.) | RAG for PDF search |
| Auth | Google OAuth 2.0 + JWT | SSO & session handling |
| LLM | Claude API / OpenAI / Ollama | AI chat, quiz generation |
| File Storage | Local / S3-compatible | PDF uploads & syllabus files |
| Monitoring | Flask metrics + custom | Admin dashboard stats |

### 6.2 Authentication Flow

1. Student clicks **Login with Google** on the React frontend.
2. React redirects to Google OAuth 2.0 authorization endpoint.
3. Google redirects back to Flask `/auth/callback` with an authorization code.
4. Flask exchanges the code for a Google access token; fetches user profile.
5. Flask creates or updates the user record in PostgreSQL.
6. Flask issues a signed JWT (HS256); sets it as an HttpOnly cookie.
7. All subsequent API requests from React include the cookie; Flask middleware validates the JWT.

### 6.3 Database Schema (Key Tables)

```
users
  id, google_id, email, name, avatar_url, semester, role,
  is_banned, ban_reason, created_at, last_active

subjects
  id, name, semester, description

syllabus_docs
  id, subject_id, filename, storage_path, embedding_status,
  uploaded_by, created_at

student_uploads
  id, user_id, filename, storage_path, size_bytes, created_at

chat_sessions
  id, user_id, subject_id, created_at

chat_messages
  id, session_id, role (user/assistant), content, created_at

quiz_sets
  id, user_id, subject_id, questions_json, score, completed_at

doc_embeddings
  id, doc_id, doc_type (syllabus/upload), chunk_text,
  embedding (vector — NULL when placeholder)
```

### 6.4 RAG Pipeline

1. On document upload (admin or student), text is extracted with PyMuPDF.
2. Text is split into overlapping chunks (~500 words, 50-word overlap).
3. Each chunk is embedded and stored in `doc_embeddings` via pgvector.
4. At query time, the user's message is embedded and the top-k similar chunks are retrieved.
5. Retrieved chunks are injected into the LLM system prompt as context.

> While `EMBEDDING_PROVIDER=placeholder`, steps 3–5 are skipped. Chat still works — it just won't inject document context.

### 6.5 LLM Provider Configuration

Set `LLM_PROVIDER` in `.env` to switch providers. No other code changes required.

| Provider | Env Value | Key Required | Notes |
|---|---|---|---|
| Placeholder | `placeholder` | No | Returns stub responses. Default. |
| Claude (Anthropic) | `claude` | Yes — `ANTHROPIC_API_KEY` | Recommended |
| OpenAI | `openai` | Yes — `OPENAI_API_KEY` | GPT-4o default |
| Ollama (local) | `ollama` | No | Free, runs locally |

### 6.6 Embedding Provider Configuration

Set `EMBEDDING_PROVIDER` in `.env` to switch embedding models.

| Provider | Env Value | Key Required | Dimensions | Notes |
|---|---|---|---|---|
| Placeholder | `placeholder` | No | — | No embeddings stored. Default. |
| OpenAI | `openai` | Yes — `OPENAI_API_KEY` | 1536 | text-embedding-3-small |
| Sentence Transformers | `sentence_transformers` | No | 384 | Free, local, ~90 MB model |

> If using `sentence_transformers`, update the `Vector(1536)` dimension in `models/embedding.py` to `Vector(384)`.

---

## 7. Non-Functional Requirements

- **Performance:** AI chat responses begin streaming within 3 seconds of submission.
- **Uptime:** 99% during pilot; deployable on a single VPS (e.g. DigitalOcean, Hetzner).
- **Security:** JWT stored in HttpOnly cookie; CSRF protection on all state-changing endpoints.
- **Data Privacy:** Student uploads visible only to the uploading student and admins.
- **Scalability:** Architecture should support horizontal scaling when pilot succeeds.
- **Accessibility:** WCAG 2.1 AA compliance for core student-facing pages.

---

## 8. Out of Scope (v1 Pilot)

- Mobile native apps (iOS/Android) — web only for pilot.
- Real-time collaboration or shared notes between students.
- Video or audio content ingestion.
- LMS integration (Moodle, Google Classroom).
- Payment / subscription gating.
- Multi-university support — PU CE only for pilot.

---

## 9. Suggested Milestones

| Phase | Timeline | Key Deliverables |
|---|---|---|
| Phase 1 — Foundation | Weeks 1–3 | Google OAuth, user DB schema, basic React shell, Flask project structure, admin seed |
| Phase 2 — Core Chat | Weeks 4–6 | Pre-loaded syllabus upload, chat UI, LLM integration, RAG pipeline, streaming responses |
| Phase 3 — Upload & Quizzes | Weeks 7–9 | Student PDF upload, per-student RAG, quiz generation UI, flashcard mode, quiz history |
| Phase 4 — Admin Dashboard | Weeks 10–11 | All 4 dashboard sections: users, activity stats, system health, content management |
| Phase 5 — Pilot Launch | Week 12 | Bug fixes, performance tuning, onboarding 50–100 students, feedback collection |

---

## 10. Open Questions

1. **Gmail domain restriction** — Restrict login to a specific university domain (e.g. `@pu.edu.np`), or allow any Google account for the pilot? Set `ALLOWED_EMAIL_DOMAIN` in `.env`.
2. **LLM choice** — Claude API, OpenAI, or Ollama (free/local)? Affects cost and data privacy.
3. **File storage** — Local server disk or an S3-compatible object store (e.g. Wasabi, MinIO)?
4. **Syllabus maintenance** — Who updates content when Pokhara University revises courses?
5. **Gamification** — Should quiz scores feed into a leaderboard or point system in a future version?

---

*CE Study Assistant — PRD v1.0 | April 2026 | Confidential*
