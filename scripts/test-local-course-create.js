require('dotenv').config();
const Course = require('../models/courseModel');
const { normalizeThumbnail } = require('../utils/thumbnail');
const pool = require('../db');

async function main() {
  const longThumb = 'data:image/jpeg;base64,' + 'A'.repeat(150000);
  const created = await Course.create({
    title: 'Local thumbnail test',
    description: 'test',
    instructor_id: 49,
    category: 'Web Development',
    level: 'beginner',
    duration: '4h',
    status: 'draft',
    thumbnail: normalizeThumbnail(longThumb),
    preview_video: null,
    youtube_playlist_id: null,
    is_free: true,
  });

  console.log('created course id', created.id, 'thumbnail length', created.thumbnail?.length);

  await pool.query('DELETE FROM courses WHERE id = $1', [created.id]);
  console.log('cleaned up test course');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
