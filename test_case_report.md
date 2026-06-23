# Test Case Report - CE Study Assistant

## Application Overview
- **Backend**: Flask API with JWT authentication (HttpOnly cookies)
- **Frontend**: React (Vite) with Tailwind CSS
- **Database**: PostgreSQL with pgvector
- **Auth**: Google OAuth + Developer Bypass Mode
- **AI Integration**: Gemini API for chat, flashcards, MCQs, exam questions
- **Features**: PDF upload, RAG embeddings, quiz generation, revision planner, exam management

---

| Test-caseid | Test module | Test scenario | Expected results | Actual result | Type |
|-------------|-------------|---------------|------------------|---------------|------|
| TC-001 | Authentication | Login via Google OAuth with valid Google account | User redirected to /dashboard with session_token cookie set | Pending | Authentication |
| TC-002 | Authentication | Login via Developer Bypass (no Google Client ID configured) | Auto-login as developer@example.com, JWT cookie set, redirect to /dashboard or /profile-setup | Pending | Authentication |
| TC-003 | Authentication | OAuth callback with invalid/missing userinfo | Return 400 error "Google auth failed" | Pending | Authentication |
| TC-004 | Authentication | OAuth callback with non-allowed email domain | Return 403 error "Must use an official {domain} account" | Pending | Authentication |
| TC-005 | Authentication | OAuth callback for banned user | Return 403 error "Your account is banned" | Pending | Authentication |
| TC-006 | Authentication | Access /auth/me without session_token cookie | Return 401 "Unauthorized" | Pending | Authentication |
| TC-007 | Authentication | Access /auth/me with expired JWT token | Return 401 "Invalid or expired token" | Pending | Authentication |
| TC-008 | Authentication | Access /auth/me with tampered JWT token | Return 401 "Invalid or expired token" | Pending | Security |
| TC-009 | Authentication | Logout - verify session_token cookie is cleared | Cookie expires, subsequent requests return 401 | Pending | Authentication |
| TC-010 | Authentication | Developer bypass auto-creates user on first login | New user created in DB with google_id='mock_dev_id_12345' | Pending | Functional |
| TC-011 | Authentication | Developer bypass finds existing user on subsequent logins | No duplicate user created, JWT issued for existing user | Pending | Functional |
| TC-012 | Onboarding | Submit onboarding with all required fields | Profile updated, JWT refreshed, user.to_dict() returns profile_complete: true | Pending | Functional |
| TC-013 | Onboarding | Submit onboarding with missing first_name | Return 400 "First name, last name, college, and semester are required" | Pending | Functional |
| TC-014 | Onboarding | Submit onboarding with missing last_name | Return 400 error for missing required fields | Pending | Functional |
| TC-015 | Onboarding | Submit onboarding with missing college | Return 400 error for missing required fields | Pending | Functional |
| TC-016 | Onboarding | Submit onboarding with non-numeric semester | Return 400 "Semester must be a number" | Pending | Functional |
| TC-017 | Onboarding | Submit onboarding with semester=0 or semester=9 | Accept input (no validation on range in backend) | Pending | Edge Case |
| TC-018 | Onboarding | Submit onboarding without session token but with email | Create new user with provided email | Pending | Functional |
| TC-019 | Onboarding | Submit onboarding without session token and without email | Return 400 "Email is required when no session is available" | Pending | Functional |
| TC-020 | Chat | Send message to /chat/message with valid session | Receive AI reply from Gemini API, session_id returned | Pending | Functional |
| TC-021 | Chat | Send message without session_token cookie | Return 401 "Unauthorized" | Pending | Authentication |
| TC-022 | Chat | Send empty message | Return 400 "Message is required" | Pending | Functional |
| TC-023 | Chat | Send message when Gemini API key not configured | Return 500 "Gemini API key is not configured" | Pending | Error Handling |
| TC-024 | Chat | Send message when Gemini API is unreachable | Return 502 "Unable to reach the AI service right now" | Pending | Error Handling |
| TC-025 | Chat | Send message when Gemini returns error (4xx/5xx) | Return 502 with error details from Gemini | Pending | Error Handling |
| TC-026 | Chat | Send message with history (last 12 messages normalized) | History sent to Gemini, only user/assistant roles included | Pending | Functional |
| TC-027 | Chat | Verify chat persistence - messages saved to ChatSession and ChatMessage | Both user and assistant messages stored in DB | Pending | Functional |
| TC-028 | Chat | GET /chat/sessions returns user's sessions ordered by updated_at | Sessions list returned with id, title, message_count | Pending | Functional |
| TC-029 | Chat | GET /chat/sessions/<session_id> for own session | Return session with all messages | Pending | Functional |
| TC-030 | Chat | GET /chat/sessions/<session_id> for another user's session | Return 404 "Session not found" | Pending | Authorization |
| TC-031 | Chat | DELETE /chat/sessions/<session_id> for own session | Session and messages deleted, return 200 | Pending | Functional |
| TC-032 | Chat | DELETE /chat/sessions/<session_id> for another user's session | Return 404 "Session not found" | Pending | Authorization |
| TC-033 | Upload | Upload valid PDF file (<10MB) | File saved, parsed text extracted, embedding triggered, return 200 | Pending | Functional |
| TC-034 | Upload | Upload file larger than 10MB | Return 413 "File too large (Max 10MB allowed)" | Pending | Functional |
| TC-035 | Upload | Upload non-PDF file (e.g., .txt, .jpg) | Return 400 "Invalid file type, only PDF allowed" | Pending | Functional |
| TC-036 | Upload | Upload when user already has 10 PDFs | Return 403 "Upload limit of 10 PDFs reached" | Pending | Functional |
| TC-037 | Upload | Upload without file part in request | Return 400 "No file part" | Pending | Functional |
| TC-038 | Upload | Upload with empty filename | Return 400 "No selected file" | Pending | Functional |
| TC-039 | Upload | Upload PDF with special characters in filename | secure_filename() sanitizes, file saved with user_id prefix | Pending | Security |
| TC-040 | Upload | GET /upload/ returns user's uploads | List of uploads with filename, size, embedding_status returned | Pending | Functional |
| TC-041 | Upload | GET /upload/ without authentication | Return 401 "Unauthorized" | Pending | Authentication |
| TC-042 | Upload | DELETE /upload/<upload_id> for own upload | Embeddings, physical file, quiz sets, and DB record deleted | Pending | Functional |
| TC-043 | Upload | DELETE /upload/<upload_id> for another user's upload | Return 403 "Unauthorized" | Pending | Authorization |
| TC-044 | Upload | DELETE /upload/<non-existent_id> | Return 404 "Upload not found" | Pending | Functional |
| TC-045 | Upload | POST /upload/retry-embedding with valid upload_id | Embedding status reset to 'pending', background embedding triggered | Pending | Functional |
| TC-046 | Upload | POST /upload/retry-embedding without upload_id | Return 400 "upload_id required" | Pending | Functional |
| TC-047 | Upload | POST /upload/retry-embedding for another user's upload | Return 403 "Unauthorized" | Pending | Authorization |
| TC-048 | Generate | POST /generate/flashcards with valid upload_id | Flashcards generated from document context, returned as JSON | Pending | Functional |
| TC-049 | Generate | POST /generate/flashcards without upload_id | Return 400 "upload_id is required" | Pending | Functional |
| TC-050 | Generate | POST /generate/flashcards for another user's document | Return 403 "You don't have access to this document" | Pending | Authorization |
| TC-051 | Generate | POST /generate/flashcards with count > 20 | Count capped at 20 | Pending | Functional |
| TC-052 | Generate | POST /generate/mcqs with valid upload_id | MCQs generated, saved to QuizSet, generation_count incremented | Pending | Functional |
| TC-053 | Generate | POST /generate/mcqs when MCQ limit (2) reached | Return 403 with limit_reached: true | Pending | Functional |
| TC-054 | Generate | POST /generate/exam-questions with valid upload_id | Exam questions generated from document context | Pending | Functional |
| TC-055 | Generate | GET /generate/status/<upload_id> returns embedding stats | Stats with chunk count, status returned | Pending | Functional |
| TC-056 | Generate | POST /generate/embed/<upload_id> triggers embedding | Document embedded, chunk count returned | Pending | Functional |
| TC-057 | Generate | POST /generate/flashcards for unembedded document | Auto-embedding triggered before generation | Pending | Functional |
| TC-058 | Quiz | POST /quiz/generate with topic | Mock quiz created, saved to QuizSet, returned | Pending | Functional |
| TC-059 | Quiz | GET /quiz/history returns user's quiz history | List of quizzes with topic, score, created_at | Pending | Functional |
| TC-060 | Quiz | GET /quiz/history without authentication | Return 401 "Unauthorized" | Pending | Authentication |
| TC-061 | Revision | POST /revision-plans with title and revision_date | Plan created, returned with 201 | Pending | Functional |
| TC-062 | Revision | POST /revision-plans without title | Return 400 "Title and revision date are required" | Pending | Functional |
| TC-063 | Revision | POST /revision-plans with invalid priority | Priority defaults to 'medium' | Pending | Functional |
| TC-064 | Revision | POST /revision-plans with invalid status | Status defaults to 'pending' | Pending | Functional |
| TC-065 | Revision | GET /revision-plans returns user's plans ordered by date | Plans list returned | Pending | Functional |
| TC-066 | Revision | PUT /revision-plans/<id> updates own plan | Plan fields updated, updated_at set | Pending | Functional |
| TC-067 | Revision | PUT /revision-plans/<id> for another user's plan | Return 403 "Forbidden: You do not own this revision plan" | Pending | Authorization |
| TC-068 | Revision | PUT /revision-plans/<id> with empty title | Return 400 "Title cannot be empty" | Pending | Functional |
| TC-069 | Revision | DELETE /revision-plans/<id> deletes own plan | Plan deleted, return 200 | Pending | Functional |
| TC-070 | Revision | DELETE /revision-plans/<id> for another user's plan | Return 403 "Forbidden" | Pending | Authorization |
| TC-071 | Revision | PATCH /revision-plans/<id>/status with valid status | Status updated to 'pending' or 'completed' | Pending | Functional |
| TC-072 | Revision | PATCH /revision-plans/<id>/status with invalid status | Return 400 "Invalid status value" | Pending | Functional |
| TC-073 | Exam | POST /exams with all required fields | Exam created, returned with 201 | Pending | Functional |
| TC-074 | Exam | POST /exams with invalid exam_type | Return 400 "Invalid exam type. Must be one of: ut, assessment, final" | Pending | Functional |
| TC-075 | Exam | POST /exams without required fields | Return 400 "Title, type, subject, and date are required" | Pending | Functional |
| TC-076 | Exam | GET /exams returns user's exams | Exams list returned ordered by exam_date | Pending | Functional |
| TC-077 | Exam | DELETE /exams/<id> deletes own exam | Exam deleted, return 200 | Pending | Functional |
| TC-078 | Exam | DELETE /exams/<id> for another user's exam | Return 403 "Unauthorized" | Pending | Authorization |
| TC-079 | Admin | GET /admin/users as admin | List of all users returned | Pending | Authorization |
| TC-080 | Admin | GET /admin/users as non-admin | Return 403 "Forbidden: Admin access required" | Pending | Authorization |
| TC-081 | Admin | POST /admin/users/<id>/ban toggles ban status | User is_banned toggled, ban_reason set/cleared | Pending | Authorization |
| TC-082 | Admin | POST /admin/users/<id>/ban for non-existent user | Return 404 "User not found" | Pending | Functional |
| TC-083 | Admin | GET /admin/stats returns user count and health | Stats with total_users returned | Pending | Authorization |
| TC-084 | Admin | POST /admin/syllabus upload | Return success message (mock endpoint) | Pending | Functional |
| TC-085 | Security | JWT token sent in cookie with HttpOnly flag | Cookie not accessible via JavaScript | Pending | Security |
| TC-086 | Security | JWT token sent with SameSite=Lax | Cross-site requests don't include cookie | Pending | Security |
| TC-087 | Security | CORS configured for localhost:5173 only | Requests from other origins blocked | Pending | Security |
| TC-088 | Security | SQL injection attempt in onboarding email field | Input sanitized, no SQL execution | Pending | Security |
| TC-089 | Security | XSS attempt in chat message | Message sanitized before storage/display | Pending | Security |
| TC-090 | Security | Path traversal in upload filename | secure_filename() prevents directory traversal | Pending | Security |
| TC-091 | Security | Access admin endpoints with student role JWT | Return 403 "Forbidden: Admin access required" | Pending | Authorization |
| TC-092 | Security | Banned user attempting to access protected routes | Return 403 "User not found or banned" | Pending | Authorization |
| TC-093 | Session | JWT token expiration (7 days max_age) | Token expires after 7 days, user must re-authenticate | Pending | Session |
| TC-094 | Session | Session cookie not sent over HTTP (if Secure flag set) | Cookie only transmitted over HTTPS | Pending | Security |
| TC-095 | Edge Case | Upload corrupted PDF file | Graceful error handling, 500 with error message | Pending | Edge Case |
| TC-096 | Edge Case | Chat message with extremely long text (>10KB) | Message processed or rejected with validation error | Pending | Edge Case |
| TC-097 | Edge Case | Concurrent uploads from same user | Both processed, upload count incremented correctly | Pending | Edge Case |
| TC-098 | Edge Case | Generate flashcards for empty PDF (no text) | Return 400 "Document text could not be chunked" | Pending | Edge Case |
| TC-099 | Edge Case | Rapid successive quiz generation requests | Rate handled, MCQ limit enforced correctly | Pending | Edge Case |
| TC-100 | Edge Case | Delete upload while embedding is in background | Embedding fails gracefully, upload deleted | Pending | Edge Case |
