const Course = require('../models/courseModel');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { featured, sortBy, sortOrder, limit } = req.query;
  
  let query = 'SELECT * FROM courses';
  const queryParams = [];
  const conditions = [];
  
  // Handle featured filter
  if (featured === 'true') {
    conditions.push('is_featured = $' + (queryParams.length + 1));
    queryParams.push(true);
  }
  
  // Add WHERE clause if there are conditions
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Handle sorting
  if (sortBy) {
    const validSortFields = ['rating', 'created_at', 'title', 'enrolled_count'];
    const validSortOrders = ['asc', 'desc'];
    
    if (validSortFields.includes(sortBy)) {
      const order = validSortOrders.includes(sortOrder?.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';
      query += ` ORDER BY ${sortBy} ${order}`;
    }
  } else {
    query += ' ORDER BY id';
  }
  
  // Handle limit
  if (limit && !isNaN(parseInt(limit))) {
    query += ' LIMIT $' + (queryParams.length + 1);
    queryParams.push(parseInt(limit));
  }
  
  const courses = await Course.findAllWithQuery(query, queryParams);
  res.json(courses);
});

exports.get = asyncHandler(async (req, res) => {
  const course = await Course.findById(parseInt(req.params.id, 10));
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

exports.create = asyncHandler(async (req, res) => {
  const { 
    title, 
    description, 
    category,
    level,
    price,
    duration,
    instructor_id,
    thumbnail,
    preview_video,
    status = 'published'
  } = req.body;
  
  if (!title) return res.status(400).json({ error: 'title required' });
  
  // Validate and normalize level
  const validLevels = ['beginner', 'intermediate', 'advanced'];
  const normalizedLevel = level ? level.toLowerCase() : 'beginner';
  if (!validLevels.includes(normalizedLevel)) {
    return res.status(400).json({ 
      error: 'Invalid level', 
      message: 'Level must be one of: beginner, intermediate, advanced' 
    });
  }

  // Validate and normalize status
  const validStatuses = ['draft', 'published', 'archived'];
  const normalizedStatus = status ? status.toLowerCase() : 'published';
  if (!validStatuses.includes(normalizedStatus)) {
    return res.status(400).json({ 
      error: 'Invalid status', 
      message: 'Status must be one of: draft, published, archived' 
    });
  }
  
  // Set default values for required fields
  const courseData = {
    title,
    description: description || 'No description provided',
    instructor_id: instructor_id || 1,
    category: category || 'General',
    level: normalizedLevel,
    price: price || 0,
    duration: duration || '4 weeks',
    status: normalizedStatus,
    thumbnail: thumbnail || null,
    preview_video: preview_video || null
  };

  const created = await Course.create(courseData);
  res.status(201).json(created);
});

exports.update = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, description } = req.body;
  
  const existing = await Course.findById(id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  
  const updated = await Course.update(id, { title, description });
  res.json(updated);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await Course.findById(id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  await Course.remove(id);
  res.status(204).send();
});
