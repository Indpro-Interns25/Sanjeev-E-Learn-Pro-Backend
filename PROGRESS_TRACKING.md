# Progress Tracking System Documentation

## Overview
Complete real-time progress tracking for courses and lectures. All progress is calculated from actual database records with no hardcoded or random values.

## Database Schema

### user_progress Table
```sql
CREATE TABLE user_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lecture_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  watched_time INTEGER NOT NULL DEFAULT 0,  -- in seconds
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lecture_id)
);

-- Performance indexes
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX idx_user_progress_user_course ON user_progress(user_id, course_id);
```

## Setup

### 1. Create the Table
Run the migration script to create the `user_progress` table:
```bash
node scripts/migrate-user-progress.js
```

### 2. Verify Table Creation
```bash
# Connect to your PostgreSQL database and verify:
SELECT table_name FROM information_schema.tables WHERE table_name = 'user_progress';
```

## API Endpoints

All endpoints require JWT authentication (Bearer token in Authorization header)

### 1. Mark Lecture as Completed
**POST** `/api/progress/complete`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "courseId": 1,
  "lectureId": 5
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Lecture marked as completed",
  "data": {
    "id": 42,
    "user_id": 10,
    "course_id": 1,
    "lecture_id": 5,
    "completed": true,
    "watched_time": 0,
    "completed_at": "2024-01-15T10:30:00.000Z",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Save Watch Time
**POST** `/api/progress/watch`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "courseId": 1,
  "lectureId": 5,
  "watchedTime": 450
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Watch time saved successfully",
  "data": {
    "id": 42,
    "user_id": 10,
    "course_id": 1,
    "lecture_id": 5,
    "completed": false,
    "watched_time": 450,
    "completed_at": null,
    "created_at": "2024-01-15T10:25:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Get Course Progress Percentage
**GET** `/api/progress/:courseId`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**URL:** `/api/progress/1`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "progress": 65,
    "totalLectures": 20,
    "completedLectures": 13
  }
}
```

**Calculation Logic:**
- `totalLectures`: COUNT of all lessons in the course
- `completedLectures`: COUNT of user_progress records where completed = true
- `progress`: (completedLectures / totalLectures) * 100, rounded to nearest integer

### 4. Get Detailed Course Progress
**GET** `/api/progress/:courseId/details`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**URL:** `/api/progress/1/details`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "progress": 65,
    "totalLectures": 20,
    "completedLectures": 13,
    "lectures": [
      {
        "lecture_id": 1,
        "lecture_title": "Introduction to Python",
        "order_index": 1,
        "completed": true,
        "watched_time": 1200,
        "completed_at": "2024-01-10T14:00:00.000Z",
        "updated_at": "2024-01-10T14:00:00.000Z"
      },
      {
        "lecture_id": 2,
        "lecture_title": "Variables and Data Types",
        "order_index": 2,
        "completed": false,
        "watched_time": 300,
        "completed_at": null,
        "updated_at": "2024-01-11T10:00:00.000Z"
      }
    ]
  }
}
```

## Testing with cURL

### Get JWT Token
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Save the token from response.

### Mark Lecture Complete
```bash
TOKEN="your_jwt_token_here"
curl -X POST http://localhost:3002/api/progress/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId":1,"lectureId":5}'
```

### Save Watch Time
```bash
TOKEN="your_jwt_token_here"
curl -X POST http://localhost:3002/api/progress/watch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courseId":1,"lectureId":5,"watchedTime":450}'
```

### Get Course Progress
```bash
TOKEN="your_jwt_token_here"
curl -X GET http://localhost:3002/api/progress/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Get Detailed Progress
```bash
TOKEN="your_jwt_token_here"
curl -X GET http://localhost:3002/api/progress/1/details \
  -H "Authorization: Bearer $TOKEN"
```

## Data Flow

1. **User watches a lecture:** Video player calls `POST /api/progress/watch` periodically (e.g., every 10 seconds) with current watched_time
2. **User completes a lecture:** Frontend calls `POST /api/progress/complete` when video ends or user marks complete
3. **User views dashboard:** Frontend calls `GET /api/progress/:courseId` to display progress percentage
4. **Detailed view:** Frontend calls `GET /api/progress/:courseId/details` to show all lecture statuses

## Key Features

✅ **Real Database Calculations**
- No hardcoded progress values
- No random values
- Always calculated from actual user data

✅ **JWT Protected**
- All user-facing APIs require authentication
- User can only access their own progress
- Admin endpoints separate

✅ **Performance Optimized**
- Indexed queries on user_id, course_id, and user_course combination
- Uses SQL aggregation (COUNT, SUM) for calculations
- Efficient UPSERT with ON CONFLICT

✅ **Data Integrity**
- UNIQUE constraint on (user_id, lecture_id) prevents duplicates
- Cascading deletes maintain referential integrity
- Timestamps track creation and updates

## Error Responses

### Invalid Course ID
```json
{
  "success": false,
  "error": "Invalid courseId"
}
```

### Missing Required Fields
```json
{
  "success": false,
  "error": "courseId, lectureId, and watchedTime are required"
}
```

### Unauthorized
```json
{
  "success": false,
  "message": "Not authorized, no token"
}
```

### Not Found
```json
{
  "success": false,
  "error": "Course not found"
}
```

## Database Queries Used

All calculations use raw SQL queries without ORMs for performance:

### Count Total Lectures
```sql
SELECT COUNT(*)::int as total_lectures
FROM lessons
WHERE course_id = $1
```

### Count Completed Lectures
```sql
SELECT COUNT(*)::int as completed_lectures
FROM user_progress
WHERE user_id = $1 AND course_id = $2 AND completed = true
```

### Get Progress Percentage
```sql
SELECT
  COUNT(*)::int as total_lectures,
  SUM(CASE WHEN up.completed = true THEN 1 ELSE 0 END)::int as completed_lectures
FROM lessons l
LEFT JOIN user_progress up ON l.id = up.lecture_id AND up.user_id = $1
WHERE l.course_id = $2
```

## Frontend Integration Example

```javascript
// React Example
const [progress, setProgress] = useState(null);

// Get progress when component mounts
useEffect(() => {
  const fetchProgress = async () => {
    const response = await fetch(`/api/progress/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    setProgress(data.data.progress);
  };
  
  fetchProgress();
}, [courseId, token]);

// Mark lecture complete
const markComplete = async (lectureId) => {
  await fetch('/api/progress/complete', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      courseId,
      lectureId
    })
  });
  
  // Refresh progress
  await fetchProgress();
};
```
