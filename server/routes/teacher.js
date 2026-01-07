const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and teacher role
router.use(authMiddleware);
router.use(roleMiddleware('teacher'));

// Create semester
router.post('/semesters', [
  body('name').notEmpty().withMessage('Semester name is required'),
  body('start_date').isDate().withMessage('Valid start date is required'),
  body('end_date').isDate().withMessage('Valid end date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, start_date, end_date, is_active = true } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO semesters (name, start_date, end_date, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, start_date, end_date, is_active, req.user.id]
    );

    res.status(201).json({
      message: 'Semester created successfully',
      semester: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Semester with this name already exists' });
    }
    console.error('Create semester error:', error);
    res.status(500).json({ error: 'Server error while creating semester' });
  }
});

// Get all semesters
router.get('/semesters', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM semesters ORDER BY start_date DESC'
    );

    res.json({ semesters: result.rows });
  } catch (error) {
    console.error('Get semesters error:', error);
    res.status(500).json({ error: 'Server error while fetching semesters' });
  }
});

// Update semester
router.put('/semesters/:id', [
  body('name').optional().notEmpty().withMessage('Semester name cannot be empty'),
  body('start_date').optional().notEmpty().withMessage('Start date is required'),
  body('end_date').optional().notEmpty().withMessage('End date is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, start_date, end_date, is_active } = req.body;

  console.log('Update semester request:', { id, name, start_date, end_date, is_active });

  try {
    // Check if semester exists
    const existingCheck = await pool.query('SELECT * FROM semesters WHERE id = $1', [id]);
    
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Semester not found' });
    }

    const result = await pool.query(
      `UPDATE semesters 
       SET name = COALESCE($1, name),
           start_date = COALESCE($2::date, start_date),
           end_date = COALESCE($3::date, end_date),
           is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING *`,
      [name, start_date, end_date, is_active, id]
    );

    console.log('Semester updated successfully:', result.rows[0]);

    res.json({
      message: 'Semester updated successfully',
      semester: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Semester with this name already exists' });
    }
    console.error('Update semester error:', error);
    res.status(500).json({ error: 'Server error while updating semester' });
  }
});

// Create subject
router.post('/subjects', [
  body('name').notEmpty().withMessage('Subject name is required'),
  body('code').notEmpty().withMessage('Subject code is required'),
  body('semester_id').isUUID().withMessage('Valid semester ID is required'),
  body('total_seats').isInt({ min: 1 }).withMessage('Total seats must be at least 1')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, code, description, semester_id, total_seats } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO subjects (name, code, description, semester_id, total_seats, available_seats, created_by)
       VALUES ($1, $2, $3, $4, $5, $5, $6)
       RETURNING *`,
      [name, code, description, semester_id, total_seats, req.user.id]
    );

    res.status(201).json({
      message: 'Subject created successfully',
      subject: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Subject with this code already exists for this semester' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Invalid semester ID' });
    }
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Server error while creating subject' });
  }
});

// Get subjects by semester
router.get('/subjects', async (req, res) => {
  const { semester_id } = req.query;

  try {
    let query = `
      SELECT s.*, sem.name as semester_name,
             (SELECT COUNT(*) FROM enrollments WHERE subject_id = s.id AND status = 'active') as enrolled_count
      FROM subjects s
      JOIN semesters sem ON s.semester_id = sem.id
    `;
    
    const params = [];
    if (semester_id) {
      query += ' WHERE s.semester_id = $1';
      params.push(semester_id);
    }
    
    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ subjects: result.rows });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Server error while fetching subjects' });
  }
});

// Update subject
router.put('/subjects/:id', [
  body('total_seats').optional().isInt({ min: 1 }).withMessage('Total seats must be at least 1')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, description, total_seats } = req.body;

  try {
    // Get current subject data
    const currentSubject = await pool.query('SELECT * FROM subjects WHERE id = $1', [id]);
    
    if (currentSubject.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const current = currentSubject.rows[0];
    const enrolledCount = current.total_seats - current.available_seats;

    // If updating total_seats, ensure it's not less than enrolled count
    if (total_seats !== undefined && total_seats < enrolledCount) {
      return res.status(400).json({ 
        error: `Cannot reduce seats below enrolled count (${enrolledCount})` 
      });
    }

    const newAvailableSeats = total_seats !== undefined 
      ? total_seats - enrolledCount 
      : current.available_seats;

    const result = await pool.query(
      `UPDATE subjects 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           total_seats = COALESCE($3, total_seats),
           available_seats = $4
       WHERE id = $5
       RETURNING *`,
      [name, description, total_seats, newAvailableSeats, id]
    );

    res.json({
      message: 'Subject updated successfully',
      subject: result.rows[0]
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Server error while updating subject' });
  }
});

// Get enrollment statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM subjects) as total_subjects,
        (SELECT COUNT(*) FROM enrollments WHERE status = 'active') as total_enrollments,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM semesters WHERE is_active = true) as active_semesters
    `);

    res.json({ statistics: stats.rows[0] });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Server error while fetching statistics' });
  }
});

// Get enrollments for a specific subject
router.get('/subjects/:id/enrollments', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT e.*, u.full_name, u.email, u.roll_number,
             s.name as subject_name, s.code as subject_code
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN subjects s ON e.subject_id = s.id
      WHERE e.subject_id = $1 AND e.status = 'active'
      ORDER BY e.enrolled_at ASC
    `, [id]);

    res.json({ enrollments: result.rows });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Server error while fetching enrollments' });
  }
});

module.exports = router;
