# 🎓 Course Seeding - Quick Reference

## 🚀 Quick Setup (Copy & Paste)

Run these commands in order:

```bash
# Step 1: Add missing database columns
npm run migrate:courses

# Step 2: Check/Create instructor user (if needed)
node scripts/create-admin.js

# Step 3: Seed 20 courses with lectures
npm run seed:courses
```

## ✅ What You Get

- **20 Professional Courses** across 13 categories
- **110+ Video Lectures** with real YouTube content
- **All FREE courses** (`isFree: true`) ready for testing
- **Production-ready** course data for your LMS

## 📚 Course Distribution

- **Beginner**: 5 courses
- **Intermediate**: 11 courses  
- **Advanced**: 4 courses

### Categories Included:
Web Development • Backend Development • Mobile Development • Database • Programming • Computer Science • Data Science • Security • DevOps • Cloud Computing • Design • Soft Skills • Career

## 📖 Full Documentation

For detailed instructions, troubleshooting, and course list:
👉 **See [seeders/SEEDER_GUIDE.md](./seeders/SEEDER_GUIDE.md)**

## 🔍 Quick Verification

```bash
# Check courses in database
SELECT COUNT(*) FROM courses;

# Check lectures in database  
SELECT COUNT(*) FROM lessons;
```

**Expected:** 20 courses, 110 lectures

## ⚡ Alternative Commands

```bash
# Using node directly
node scripts/add-course-columns.js
node seeders/courses-seeder.js

# Using npm scripts
npm run migrate:courses
npm run seed:courses
```

## 🎯 Success Checklist

- [ ] Migration completed without errors
- [ ] Instructor user exists in database
- [ ] Seeder shows "20 courses created"
- [ ] Seeder shows "110 lectures created"
- [ ] Frontend displays all courses

## 📞 Common Issues

**"No instructor found"** → Run `node scripts/create-admin.js`

**"Column does not exist"** → Run `npm run migrate:courses`

**"Connection refused"** → Check `.env` database settings

---

**Ready to go!** Your LMS backend is now fully populated with course content. 🎉
