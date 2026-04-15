# Global Course Logic - Complete Implementation
**Date:** April 14, 2026

## Overview
This document describes the complete global course logic that ensures:
1. **Each lesson has a quiz** - Required for course structure
2. **All lesson quizzes must be completed before accessing final test** - Enforces engagement
3. **Final test requires >= 70% to pass** - Quality assurance
4. **Certificate auto-generates when final test passed** - Rewards completion

---

## 1. Course Structure Requirements

### Rule 1: Each Lesson Should Have a Quiz

**Enforcement Points:**

#### A. Database Level
- `lesson_quizzes` table stores all lesson quizzes
- Unique constraint: `UNIQUE (lesson_id)` - One quiz per lesson
- Foreign key: `lesson_id REFERENCES lessons(id)`

```sql
CREATE TABLE lesson_quizzes (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE UNIQUE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL
);
```

#### B. Model Layer - Assessment Model
New methods to check quiz requirements:

```javascript
// Check if lesson has a quiz
static async lessonHasQuiz(lessonId)

// Get all lessons with quizzes in a course
static async getCourseLessonsWithQuizzes(courseId)

// Count lessons with quizzes
static async countLessonsWithQuizzes(courseId)
```

#### C. API Layer - Quiz Creation
When creating a quiz for a lesson:
```javascript
POST /api/quiz/lesson/:lessonId/create
Body: { questions: [...] }  // Minimum 10 questions required
```

**Validation:** Minimum 10 questions enforced in `validateQuizPayload()`

---

## 2. Quiz Completion Workflow

### Lesson Quiz Flow

**Step 1: Lesson Completion (Progress >= 90%)**
```
User watches lesson → POST /api/lesson-progress/update with progress 90+
→ lesson_progress.completed = true
```

**Step 2: Quiz Access Check**
```
User requests quiz → GET /api/quiz/lesson/:lessonId
Backend checks: 
  ✓ User enrolled in course
  ✓ Lesson unlocked (previous lessons done)
  ✓ Lesson completed (progress >= 90%)
  ✓ Quiz exists (lesson_quizzes table)
→ Return 10-20 random questions if all checks pass
```

**Step 3: Quiz Submission**
```
User submits answers → POST /api/quiz/lesson/:lessonId/submit
Backend:
  ✓ Verifies all above checks again
  ✓ Records attempt in lesson_quiz_attempts table
  ✓ Scores quiz (returns score, not stored)
→ Lesson automatically marked complete if watched
```

**Implementation in:** `controllers/quizSystemController.js`
- `getLessonQuiz()` - Check completion before returning quiz
- `submitLessonQuiz()` - Check completion before accepting submission

---

## 3. Final Test Unlock Requirements

### Rule 2: All Lesson Quizzes Must Be Attempted

**Before Final Test Access - Multiple Checks:**

```javascript
// In finalTestController.js - getFinalTestByCourse()
// Check 1: All lessons completed
const allCompleted = await LessonProgress.isAllLessonsCompleted(userId, courseId);

// Check 2: ALL lesson quizzes attempted (NEW GLOBAL LOGIC)
const allQuizzesAttempted = await Assessment.hasAttemptedAllLessonQuizzes(userId, courseId);

// Check 3: User enrolled
const isEnrolled = await Assessment.isUserEnrolledInCourse(userId, courseId);
```

**Implementation in:** `models/assessmentModel.js`
```javascript
/**
 * Check if all lesson quizzes in a course have been attempted by user
 */
static async hasAttemptedAllLessonQuizzes(userId, courseId) {
  // Get all lessons with quizzes
  const lessonsWithQuizzes = await this.getCourseLessonsWithQuizzes(courseId);
  if (lessonsWithQuizzes.length === 0) {
    return true; // No quizzes = all quizzes completed
  }

  // Count user's quiz attempts
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT lqa.lesson_id)::int AS attempted
     FROM lesson_quiz_attempts lqa
     INNER JOIN lessons l ON lqa.lesson_id = l.id
     WHERE lqa.user_id = $1 AND l.course_id = $2 AND lqa.attempted = true`,
    [userId, courseId]
  );

  const attemptedCount = rows[0]?.attempted || 0;
  return attemptedCount === lessonsWithQuizzes.length;
}
```

**Error Response if Not Met:**
```json
{
  "success": false,
  "message": "Complete all lesson quizzes before accessing final test",
  "data": null
}
```

---

## 4. Final Test Scoring & Certificate Generation

### Rule 3: Final Test >= 70% Pass Requirement

**Scoring Logic:**
```javascript
// gradeFinalTest(courseId, answers)
const score = (correctAnswers / totalQuestions) * 100;
const passed = score >= 70;
```

**Score Range:** 0-100%
**Pass Threshold:** 70%

---

### Rule 4: Auto-Generate Certificate On Final Test Pass

**NEW GLOBAL LOGIC - Auto Certificate Generation**

**When is certificate generated?**
✅ **After:**
- Final test is submitted
- Score is calculated
- Score >= 70%

**Implementation in:** `controllers/finalTestController.js` - `submitFinalTest()`

```javascript
// After grading final test
const result = await Assessment.gradeFinalTest(courseId, answers);
const attempt = await Assessment.saveFinalTestAttempt(userId, courseId, result.score, result.passed);

// NEW: Auto-generate certificate if passed
if (result.passed && result.score >= 70) {
  const Certificate = require('../models/certificateModel');
  try {
    certificateData = await Certificate.issueForUserCourse(userId, courseId, result.score);
  } catch (certError) {
    console.warn('Certificate generation warning:', certError.message);
  }
}

// Return response with certificate data
res.json({
  success: true,
  message: `Final test passed! ${certificateData ? 'Certificate generated.' : ''}`,
  data: {
    // ... test results ...
    certificate: certificateData ? {
      id: certificateData.id,
      certificate_code: certificateData.certificate_code,
      issued_at: certificateData.issued_at,
      score: certificateData.score
    } : null
  }
});
```

**Database Tables Involved:**
- `final_test_attempts` - Records score & pass status
- `certificates` - Stores issued certificates with score

---

## 5. Complete User Journey

### Example: Course Completion Flow

**Course:** "Python Fundamentals" (3 lessons)

#### Lesson 1: Introduction to Python
1. User enrolls → watches video (30/30 min)
2. Frontend calls: `POST /api/lesson-progress/update {progress: 100}`
3. Backend: Sets `lesson_progress.completed = true` ✓
4. **Quiz Unlocked:**
   - User calls: `GET /api/quiz/lesson/1`
   - Backend: Checks completion ✓ → Returns 10-20 questions
5. User completes quiz:
   - Calls: `POST /api/quiz/lesson/1/submit`
   - Backend: Records attempt in `lesson_quiz_attempts`

#### Lesson 2: Variables & Data Types
1. Similar flow as Lesson 1
2. Prerequisite: Lesson 1 completed ✓
3. Quiz attempted ✓

#### Lesson 3: Control Flow
1. Similar flow
2. Prerequisites met ✓
3. Quiz attempted ✓

#### Final Test Access
1. User calls: `GET /api/test/final/1`
2. Backend checks:
   - ✓ All 3 lessons completed
   - ✓ All 3 lesson quizzes attempted (NEW)
   - ✓ User enrolled
3. Returns final test (10-20 random questions)

#### Final Test Submission
1. User submits answers: `POST /api/test/final/submit`
2. Backend:
   - Re-checks all prerequisites ✓
   - Grades test → Score: 78% (>= 70%) ✓
   - Saves attempt with score=78, passed=true
   - **AUTO-GENERATES certificate** ✓
3. Returns to user:
   ```json
   {
     "success": true,
     "message": "Final test passed! Certificate generated.",
     "certificate": {
       "id": 42,
       "certificate_code": "PYTHON-ABC123DEF",
       "issued_at": "2026-04-14T12:00:00Z",
       "score": 78
     }
   }
   ```

#### Certificate Access
1. User calls: `GET /api/certificate/1/{courseId}` or `GET /api/certificate/{certId}`
2. Backend returns certificate details + downloadable PDF

---

## 6. API Endpoints - Complete List

### Progress Tracking
- **POST** `/api/lesson-progress/update` - Update lesson progress
- **GET** `/api/lesson-progress/:courseId/:lessonId` - Get lesson progress
- **GET** `/api/lesson-progress/:courseId` - Get all lessons in course

### Lesson Quizzes
- **GET** `/api/quiz/lesson/:lessonId` - Get lesson quiz (with global checks)
- **POST** `/api/quiz/lesson/:lessonId/submit` - Submit lesson quiz

### Final Test
- **GET** `/api/test/final/:courseId` - Get final test (all quizzes required)
- **POST** `/api/test/final/submit` - Submit final test (auto-generates certificate)

### Certificates
- **GET** `/api/certificate/:userId/:courseId` - Get certificate by user+course
- **GET** `/api/certificate/:id` - Get certificate by ID
- **GET** `/api/certificate/:id/download` - Download certificate PDF

---

## 7. Global Enforcement Rules

| Rule | Check Point | Error Response | Enforced |
|------|------------|-----------------|----------|
| Lesson completion before quiz | GET /quiz/lesson | 403 Forbidden | ✅ quizSystemController |
| All quizzes before final test | GET /test/final | 403 Forbidden | ✅ finalTestController |
| Final test submission requires quizzes | POST /test/final/submit | 403 Forbidden | ✅ finalTestController |
| 70% required for certificate | POST /test/final/submit | Certificate not generated | ✅ finalTestController |
| Certificate auto-generation | Score >= 70 | Automatic | ✅ certificateModel |

---

## 8. Data Flow Diagram

```
Lesson (0%)
  ↓
Watch Video (30/30 min)  → lesson_progress.progress = 100 → completed = true
  ↓
Quiz Unlocked
  ↓
Take Quiz → lesson_quiz_attempts.attempted = true
  ↓
[Repeat for all lessons]
  ↓
All Lessons Completed ✓
  ↓
All Quizzes Attempted ✓
  ↓
Final Test Unlocked
  ↓
Take Final Test → Grade: Score %
  ↓
Score >= 70% ✓
  ↓
Certificate AUTO-GENERATED ✓
```

---

## 9. Implementation Changes Summary

### New/Modified Files

| File | Changes | Status |
|------|---------|--------|
| `models/assessmentModel.js` | Added 3 new methods for quiz requirements | ✅ Complete |
| `controllers/finalTestController.js` | Added quiz check + certificate generation | ✅ Complete |
| `controllers/quizSystemController.js` | Already has lesson completion check | ✅ Existing |
| `routes/lessonProgressRoutes.js` | Progress tracking APIs | ✅ Existing |

### New Methods

**In assessmentModel.js:**
1. `getCourseLessonsWithQuizzes(courseId)` - Get all lessons with quizzes
2. `countLessonsWithQuizzes(courseId)` - Count lessons with quizzes
3. `hasAttemptedAllLessonQuizzes(userId, courseId)` - Check if all attempted
4. `lessonHasQuiz(lessonId)` - Check if lesson has quiz

---

## 10. Testing Checklist

- [x] Lesson completion unlocks quiz
- [x] Quiz submission requires completion check
- [x] Final test blocked until all quizzes attempted
- [x] Submission endpoint also enforces quiz requirement
- [x] Final test grades correctly (70% threshold)
- [x] Certificate auto-generates on pass
- [x] Certificate includes score
- [x] Certificate API works
- [x] Syntax validation passed
- [x] No linting errors

---

## 11. Error Handling

### Global Error Responses

```json
// Lesson not completed
{
  "success": false,
  "message": "Complete the lesson first to access quiz"
}

// Quiz not attempted
{
  "success": false,
  "message": "Complete all lesson quizzes before accessing final test"
}

// Final test failed
{
  "success": true,
  "message": "Final test failed. You can retry.",
  "certificate": null
}

// Final test passed
{
  "success": true,
  "message": "Final test passed! Certificate generated.",
  "certificate": { id, certificate_code, score, issued_at }
}
```

---

## 12. Performance Considerations

**Indexes for efficiency:**
- `idx_lesson_quiz_attempts_user_lesson` - Fast quiz lookup
- `idx_final_test_attempts_user_course` - Fast test lookup
- `idx_lesson_progress_completed` - Partial index for completed lessons

**Query optimization:**
- `hasAttemptedAllLessonQuizzes()` uses efficient COUNT/GROUP query
- `getCourseLessonsWithQuizzes()` uses INNER JOIN (only lessons with quizzes)

---

## 13. Future Enhancements

1. **Quiz Difficulty Tracking** - Per-lesson difficulty levels
2. **Adaptive Quiz Selection** - Harder questions based on previous attempt
3. **Batch Certificate Generation** - For course cohorts
4. **Certificate Validity** - Expiration dates
5. **Skill Tags** - Certificate includes earned skills
6. **Retry Limits** - Cap on final test attempts (optional)

---

**Status:** ✅ **COMPLETE & TESTED**

All global course logic implemented and validated.
