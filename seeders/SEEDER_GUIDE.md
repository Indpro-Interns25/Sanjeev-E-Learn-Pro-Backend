# 🌱 Course Seeder - Setup Guide

This guide will help you populate your LMS database with 20 professionally curated courses and 110+ lectures.

## 📋 What's Included

- **20 Complete Courses** across 13 categories
- **110+ Video Lectures** with YouTube URLs
- Professional thumbnails from Unsplash
- All courses are **FREE** (`isFree: true`)
- Ready-to-use content for demos and testing

## 🚀 Quick Start (3 Steps)

### Step 1: Run Database Migration
This adds the necessary columns to your database tables.

```bash
node scripts/add-course-columns.js
```

**What it does:**
- Adds `level`, `duration`, `rating`, `thumbnail`, `preview_video` to courses table
- Adds `duration` to lessons table
- Adds constraints for data validation

### Step 2: Verify Instructor User Exists
The seeder needs an instructor user to assign courses to.

```bash
# Check if you have an instructor user
node scripts/create-admin.js
```

If you don't have an instructor, create one using the script above.

### Step 3: Run the Course Seeder
This populates your database with all 20 courses.

```bash
node seeders/courses-seeder.js
```

**Expected output:**
```
🌱 Starting course database seeding...
👤 Checking for instructor user...
✅ Found instructor: John Smith (ID: 2)

✅ [1/20] Created course: Full Stack Web Development (MERN)
   📚 Added 6 lectures
✅ [2/20] Created course: React.js Complete Guide
   📚 Added 6 lectures
...
✅ [20/20] Created course: Placement Preparation Bootcamp
   📚 Added 5 lectures

🎉 Seeding completed successfully!
✅ Total courses created: 20
✅ Total lectures created: 110
```

## 📚 Course Categories

The seeder includes courses from these categories:

1. **Web Development** (3 courses)
2. **Backend Development** (2 courses)
3. **Mobile Development** (1 course)
4. **Database** (2 courses)
5. **Programming** (2 courses)
6. **Computer Science** (2 courses)
7. **Data Science** (2 courses)
8. **Security** (1 course)
9. **DevOps** (1 course)
10. **Cloud Computing** (1 course)
11. **Design** (1 course)
12. **Soft Skills** (1 course)
13. **Career** (1 course)

## 🎓 Difficulty Levels

- **Beginner**: 5 courses
- **Intermediate**: 11 courses
- **Advanced**: 4 courses

## ✅ Verification

After seeding, verify the data:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d pfadmin

# Check courses
SELECT id, title, category, level FROM courses;

# Check lectures
SELECT c.title as course, COUNT(l.id) as lectures
FROM courses c
LEFT JOIN lessons l ON l.course_id = c.id
GROUP BY c.id, c.title;
```

## 🔧 Troubleshooting

### Error: "No instructor found"
**Solution:** Create an instructor user first:
```bash
node scripts/create-admin.js
```

### Error: "Column 'level' does not exist"
**Solution:** Run the migration first:
```bash
node scripts/add-course-columns.js
```

### Error: "Connection refused"
**Solution:** Check your `.env` file has correct database credentials:
```env
PG_HOST=localhost
PG_PORT=5432
PG_USER=your_username
PG_PASSWORD=your_password
PG_DATABASE=pfadmin
```

### Duplicate Courses
If you run the seeder twice, it will create duplicate courses. To reset:

```sql
-- Clear all data
DELETE FROM lessons;
DELETE FROM courses;

-- Reset sequences
ALTER SEQUENCE courses_id_seq RESTART WITH 1;
ALTER SEQUENCE lessons_id_seq RESTART WITH 1;
```

Then re-run the seeder.

## 📝 Course List

| # | Course Name | Category | Level | Lectures |
|---|-------------|----------|-------|----------|
| 1 | Full Stack Web Development (MERN) | Web Development | Advanced | 6 |
| 2 | React.js Complete Guide | Web Development | Intermediate | 6 |
| 3 | Node.js Backend Mastery | Backend Development | Intermediate | 6 |
| 4 | PostgreSQL Database Design | Database | Intermediate | 6 |
| 5 | Python for Beginners | Programming | Beginner | 6 |
| 6 | Data Structures & Algorithms | Computer Science | Intermediate | 6 |
| 7 | Machine Learning Basics | Data Science | Intermediate | 6 |
| 8 | Flutter App Development | Mobile Development | Intermediate | 6 |
| 9 | HTML, CSS & Bootstrap | Web Development | Beginner | 6 |
| 10 | Cyber Security Fundamentals | Security | Beginner | 6 |
| 11 | DevOps with Docker & CI/CD | DevOps | Advanced | 6 |
| 12 | Data Science with Python | Data Science | Intermediate | 6 |
| 13 | AWS Cloud Fundamentals | Cloud Computing | Intermediate | 6 |
| 14 | UI/UX Design Basics | Design | Beginner | 6 |
| 15 | Java Programming Mastery | Programming | Intermediate | 6 |
| 16 | System Design Basics | Computer Science | Advanced | 6 |
| 17 | Advanced SQL & Optimization | Database | Advanced | 5 |
| 18 | REST API Development | Backend Development | Intermediate | 5 |
| 19 | Communication Skills for Interviews | Soft Skills | Beginner | 5 |
| 20 | Placement Preparation Bootcamp | Career | Intermediate | 5 |

## 🎥 Video Sources

All video URLs are from YouTube educational content. These are placeholder links to public tutorials. For production:
- Replace with your own course videos
- Upload to your preferred video hosting service
- Update video_url in the database

## 🖼️ Thumbnails

Thumbnails are sourced from Unsplash (free stock images). For production:
- Replace with custom course thumbnails
- Upload to your CDN or image hosting service
- Update thumbnail URLs in the database

## 🔄 Updating Courses

To modify course data:
1. Edit `seeders/courses-seeder.js`
2. Clear existing data (see Troubleshooting)
3. Re-run the seeder

## 📦 Files Created

```
scripts/
  └── add-course-columns.js    # Database migration
seeders/
  └── courses-seeder.js        # Main seeder script
  └── SEEDER_GUIDE.md         # This guide
```

## 🚀 Next Steps

After seeding:
1. Start your backend server: `npm start`
2. Test the API: `GET http://localhost:5000/api/courses`
3. Access frontend and view course catalog
4. Enroll in courses and test functionality

## 📞 Support

If you encounter issues:
1. Check the error message carefully
2. Verify database connection
3. Ensure all migrations are run
4. Check instructor user exists

## 🎉 Success!

Your LMS is now populated with professional course content ready for demos, testing, and development!

---

**Created for:** Sanjeev E-Learn Pro Backend
**Date:** February 2026
**Version:** 1.0
