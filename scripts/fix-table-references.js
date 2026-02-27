#!/usr/bin/env node
/**
 * This script fixes all references from course_lessons to lessons
 * and order_sequence to order_index throughout the codebase
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'controllers/dashboardController.js',
  'controllers/adminController.js',
  'models/enrollmentModel.js',
  'models/progressModel.js'
];

const replacements = [
  {
    from: /course_lessons/g,
    to: 'lessons'
  },
  {
    from: /order_sequence/g,
    to: 'order_index'
  },
  {
    from: /lesson_progress/g,
    to: 'progress'
  },
  {
    from: /course_enrollments/g,
    to: 'enrollments'
  }
];

console.log('🔧 Fixing table and column references...\n');

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} (not found)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changesMade = 0;

  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      changesMade += matches.length;
      content = content.replace(from, to);
    }
  });

  if (changesMade > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${file} (${changesMade} replacements)`);
  } else {
    console.log(`ℹ️  ${file} (no changes needed)`);
  }
});

console.log('\n🎉 Table reference fixes complete!');
console.log('💡 Restart your backend server to apply changes.');
