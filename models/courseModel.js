const pool = require('../db');

class CourseModel {
  static async create(courseData) {
    const { 
      title, 
      description, 
      instructor_id, 
      category, 
      level, 
      duration, 
      status, 
      thumbnail, 
      preview_video,
      youtube_playlist_id,
      is_free
    } = courseData;
    
    const { rows } = await pool.query(
      `INSERT INTO courses 
       (title, description, instructor_id, category, level, duration, status, thumbnail, preview_video, youtube_playlist_id, is_free) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [title, description, instructor_id, category, level, duration, status, thumbnail, preview_video, youtube_playlist_id || null, true]
    );
    return rows[0];
  }
  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM courses WHERE id=$1', [id]);
    return rows[0] || null;
  }
  static async findAll() {
    const { rows } = await pool.query('SELECT * FROM courses ORDER BY id');
    return rows;
  }
  static async findAllWithQuery(query, params = []) {
    const { rows } = await pool.query(query, params);
    return rows;
  }
  static async update(id, { title, description }) {
    const { rows } = await pool.query(
      'UPDATE courses SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [title, description, id]
    );
    return rows[0];
  }
  static async remove(id) {
    await pool.query('DELETE FROM courses WHERE id=$1', [id]);
    return true;
  }
}

module.exports = CourseModel;
