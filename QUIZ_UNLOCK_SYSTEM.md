# Quiz Unlock System - Scalable Backend Implementation
**Date:** April 14, 2026

## Overview
This document describes the complete implementation of a scalable quiz unlock system that enforces lesson completion before quiz access across ALL courses and lessons.

## 1. Database Schema

### New Table: `lesson_progress`
Created in `services/schemaInitializer.js`

```sql
CREATE TABLE IF NOT EXISTS lesson_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);
```

**Fields:**
- `id` - Unique identifier
- `user_id` - References users table (cascade delete)
- `course_id` - References courses table
- `lesson_id` - References lessons table
- `progress` - Progress percentage (0-100)
- `completed` - Boolean flag (true when progress >= 90 or marked completed)
- `updated_at` - Timestamp of last update

**Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course ON lesson_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON lesson_progress(completed) WHERE completed = true;
```

## 2. Data Model Layer

### File: `models/lessonProgressModel.js`

Database abstraction layer for lesson progress operations.

**Key Methods:**

#### `updateProgress(userId, courseId, lessonId, progressValue)`
- Updates or inserts lesson progress
- **Auto-completes** when progress >= 90
- Returns updated record

**Example:**
```javascript
const progress = await LessonProgress.updateProgress(userId, courseId, lessonId, 85);
// { progress: 85, completed: false, updated_at: ... }
```

#### `getProgress(userId, courseId, lessonId)`
- Retrieves progress for a specific user-lesson combination
- Returns `{ progress, completed }`
- Default: `{ progress: 0, completed: false }` if not found

#### `isLessonCompleted(userId, lessonId)`
- Boolean check if lesson is completed
- Used for quiz access control

#### `isAllLessonsCompleted(userId, courseId)`
- Checks if ALL lessons in course are completed
- Used for final test unlock
- Counts total lessons vs. completed lessons

#### `markCompleted(userId, courseId, lessonId)`
- Directly marks lesson as completed (sets progress to 100)
- Bypasses 90% threshold
- Useful for manual intervention or special cases

#### `getCourseProgress(userId, courseId)`
- Gets progress for ALL lessons in a course
- Includes lesson metadata (title, order_index)
- Returns array of `{ lesson_id, progress, completed, ... }`

#### `countCompletedLessons(userId, courseId)`
- Returns count of completed lessons

## 3. API Endpoints

### File: `controllers/lessonProgressController.js`

#### 1. POST `/api/lesson-progress/update`
**Update lesson progress**

**Request Body:**
```json
{
  "userId": 73,
  "courseId": 1,
  "lessonId": 5,
  "progress": 85
}
```

**Response:**
```json
{
  "success": true,
  "message": "Progress updated to 85%",
  "data": {
    "progress": 85,
    "completed": false,
    "updated_at": "2026-04-14T12:00:00Z"
  }
}
```

**Auto-completion Logic:**
- If `progress >= 90` → `completed` is automatically set to `true`
- If `progress >= 90` → Message shows "Progress updated to 90% - Lesson completed!"

**Validation:**
- ✅ User must be enrolled in course or admin/instructor
- ✅ `userId`, `courseId`, `lessonId` required
- ✅ `progress` must be 0-100
- ✅ Lesson must exist in course

---

#### 2. GET `/api/lesson-progress/:courseId/:lessonId`
**Get lesson progress for current user**

**Response:**
```json
{
  "success": true,
  "data": {
    "progress": 85,
    "completed": false
  }
}
```

**Default Response (if not started):**
```json
{
  "success": true,
  "data": {
    "progress": 0,
    "completed": false
  }
}
```

---

#### 3. GET `/api/lesson-progress/:courseId`
**Get all lessons progress in a course**

**Response:**
```json
{
  "success": true,
  "data": {
    "lessons": [
      {
        "lesson_id": 1,
        "title": "Introduction to Python",
        "order_index": 1,
        "progress": 100,
        "completed": true
      },
      {
        "lesson_id": 2,
        "title": "Variables and Data Types",
        "order_index": 2,
        "progress": 50,
        "completed": false
      },
      {
        "lesson_id": 3,
        "title": "Control Flow",
        "order_index": 3,
        "progress": 0,
        "completed": false
      }
    ],
    "completed_lessons": 1,
    "total_lessons": 3,
    "all_completed": false
  }
}
```

---

#### 4. GET `/api/lesson-progress/user/:userId/course/:courseId`
**Get progress for specific user (admin/instructor only)**

Same response structure as above but for any user.

---

### File: `routes/lessonProgressRoutes.js`

All routes require JWT authentication via `validateToken` middleware.

Routes are ordered to avoid conflicts:
1. POST `/update` - Specific action
2. GET `/user/:userId/course/:courseId` - Most specific
3. GET `/:courseId/:lessonId` - Two params
4. GET `/:courseId` - Most generic

## 4. Quiz Access Control Integration

### Quiz Completion Requirement Check

**Implemented in:**
- `controllers/quizSystemController.js` - Lesson quizzes
- `controllers/finalTestController.js` - Final course test

#### Lesson Quiz Access (`getLessonQuiz`)

```javascript
// IMPORTANT: Check if lesson is completed (quiz unlock requirement)
const lessonCompleted = await LessonProgress.isLessonCompleted(userId, lessonId);
if (!lessonCompleted) {
  return res.status(403).json({
    success: false,
    message: 'Complete the lesson first to access quiz',
    data: null
  });
}
```

**When triggered:**
- ✅ Student tries to open a lesson quiz
- ✅ GET `/api/quiz/lesson/:lessonId`
- ✅ Backend verifies `lesson_progress.completed == true`

**Response if blocked:**
```json
{
  "success": false,
  "message": "Complete the lesson first to access quiz",
  "data": null
}
```

---

#### Lesson Quiz Submission (`submitLessonQuiz`)

Same check applied to prevent submission bypass:
```javascript
const lessonCompleted = await LessonProgress.isLessonCompleted(userId, parsedLessonId);
if (!lessonCompleted) {
  return res.status(403).json({
    success: false,
    message: 'Complete the lesson first to access quiz',
    data: null
  });
}
```

---

#### Final Test Access (`getFinalTestByCourse`)

```javascript
// IMPORTANT: Check if ALL lessons in course are completed
const allCompleted = await LessonProgress.isAllLessonsCompleted(userId, courseId);
if (!allCompleted) {
  return res.status(403).json({
    success: false,
    message: 'Complete all lessons before accessing final test',
    data: null
  });
}
```

**When triggered:**
- ✅ Student tries to open final test
- ✅ GET `/api/test/final/:courseId`
- ✅ Backend verifies ALL lessons are completed

---

#### Final Test Submission (`submitFinalTest`)

Same check to prevent submission bypass.

## 5. Progressive Unlock Workflow

### Example User Journey

**User starts Course 1:**

1. **Access Lesson 1:**
   - `lesson_progress.completed = false` (initial)
   - Frontend tracks: User watches 30 min of 45 min video
   - Frontend calls: `POST /api/lesson-progress/update` with `progress: 67`
   - Backend: Stores progress (not yet 90%)

2. **Watch Complete Lesson 1:**
   - User watches remaining 15 min
   - Frontend calls: `POST /api/lesson-progress/update` with `progress: 100`
   - Backend: Sets `completed = true` (auto-mark since >= 90%)
   - ✅ **Lesson 1 Quiz NOW UNLOCKED**

3. **Attempt Quiz 1:**
   - Frontend calls: `GET /api/quiz/lesson/1`
   - Backend checks: `completed == true` ✓
   - Backend returns questions
   - ✅ **Quiz Accessible**

4. **After Course Completion:**
   - Student completes all lessons (Lessons 1, 2, 3, N)
   - `getCourseProgress` returns: `all_completed: true`
   - ✅ **Final Test Unlocked**

5. **Access Final Test:**
   - Frontend calls: `GET /api/test/final/1`
   - Backend checks: `isAllLessonsCompleted(userId, courseId)` ✓
   - Backend returns final test questions
   - ✅ **Final Test Accessible**

## 6. Global Enforcement

### Coverage: ALL Quizzes

This system is applied globally to:
- ✅ ALL courses
- ✅ ALL lessons with quizzes
- ✅ Course-level quizzes
- ✅ Lesson-level quizzes
- ✅ Final course tests

### Bypass Prevention

**Even if user manually opens quiz URL:**
1. Frontend route shows quiz interface
2. Backend API call (GET) is intercepted
3. Access control check fails
4. 403 Forbidden response
5. No quiz data returned

**Result:** Impossible to bypass from either frontend or API layer.

## 7. Implementation Files

| File | Purpose |
|------|---------|
| `services/schemaInitializer.js` | Database table creation + indexes |
| `models/lessonProgressModel.js` | Data access layer |
| `controllers/lessonProgressController.js` | API logic + validation |
| `routes/lessonProgressRoutes.js` | Route registration |
| `routes/index.js` | Master route registration |
| `controllers/quizSystemController.js` | Quiz access control (lesson) |
| `controllers/finalTestController.js` | Quiz access control (final) |

## 8. Configuration & Behavior

| Setting | Value | Notes |
|---------|-------|-------|
| Auto-complete threshold | 90% | Progress >= 90 automatically sets completed = true |
| Progress range | 0-100 | Validated in schema (CHECK constraint) |
| Route prefix | `/api/lesson-progress` | RESTful and descriptive |
| Auth requirement | JWT token | All routes protected |
| Admin override | Via direct DB update | Lesson can be manually marked completed |

## 9. Database Indexes

**Performance optimizations:**

1. `idx_lesson_progress_user_course` - Fast course-wide progress lookups
2. `idx_lesson_progress_user_lesson` - Fast single lesson lookups
3. `idx_lesson_progress_completed` - Fast completed-lesson filtering (partial index)

## 10. Error Responses

| Scenario | HTTP Status | Message |
|----------|-------------|---------|
| Lesson not completed | 403 | "Complete the lesson first to access quiz" |
| All lessons not completed | 403 | "Complete all lessons before accessing final test" |
| Not enrolled | 403 | "Forbidden: not enrolled in this course" |
| Invalid parameters | 400 | "Invalid courseId or lessonId" |
| Missing required fields | 400 | "userId, courseId, lessonId, and progress are required" |
| Invalid progress value | 400 | "progress must be a number between 0 and 100" |

## 11. Monitoring & Tracking (Optional)

**Future enhancements:**

```javascript
// Track course completion events
const allCompleted = await LessonProgress.isAllLessonsCompleted(userId, courseId);
if (allCompleted) {
  // Emit event: "course_unlocked_final_test"
  // Send notification: "All lessons completed! Final test now available."
}
```

## 12. Testing Checklist

- [x] Schema initialization (table + indexes)
- [x] Progress update (auto-complete at 90%)
- [x] Progress retrieval (single lesson & course)
- [x] Lesson quiz access blocked (before completion)
- [x] Lesson quiz access allowed (after completion)
- [x] Final test unlocked (all lessons completed)
- [x] Final test blocked (incomplete lessons)
- [x] Syntax validation - all files
- [x] Linting check - zero errors
- [x] Route ordering - specific before generic

---

**Status:** ✅ **COMPLETE** - Production-ready implementation
