const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and student role
router.use(authMiddleware);
router.use(roleMiddleware('student'));

// Get all available subjects for a semester
router.get('/subjects', async (req, res) => {
  const { semester_id } = req.query;

  if (!semester_id) {
    return res.status(400).json({ error: 'Semester ID is required' });
  }

  try {
    // Get all subjects with enrollment info
    const subjectsQuery = await pool.query(`
      SELECT 
        s.*,
        sem.name as semester_name,
        sem.is_active as semester_active,
        (SELECT COUNT(*) FROM enrollments WHERE subject_id = s.id AND status = 'active') as enrolled_count,
        EXISTS(
          SELECT 1 FROM enrollments 
          WHERE student_id = $1 AND subject_id = s.id
        ) as already_enrolled,
        EXISTS(
          SELECT 1 FROM enrollment_history 
          WHERE student_id = $1 AND subject_id = s.id
        ) as already_completed,
        EXISTS(
          SELECT 1 FROM enrollments e2
          JOIN subjects s2 ON e2.subject_id = s2.id
          WHERE e2.student_id = $1 
          AND s2.code = s.code 
          AND e2.status = 'active'
        ) as already_taken_course,
        EXISTS(
          SELECT 1 FROM enrollments 
          WHERE student_id = $1 AND semester_id = $2 AND status = 'active'
        ) as enrolled_in_semester
      FROM subjects s
      JOIN semesters sem ON s.semester_id = sem.id
      WHERE s.semester_id = $2
      ORDER BY s.name
    `, [req.user.id, semester_id]);

    res.json({ subjects: subjectsQuery.rows });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Server error while fetching subjects' });
  }
});

// Enroll in a subject (with concurrency handling)
router.post('/enroll', [
  body('subject_id').isUUID().withMessage('Valid subject ID is required'),
  body('semester_id').isUUID().withMessage('Valid semester ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { subject_id, semester_id } = req.body;
  const student_id = req.user.id;

  const client = await pool.connect();

  try {
    // Start transaction with SERIALIZABLE isolation level for maximum consistency
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    // Get subject details to check course code
    const subjectCheck = await client.query(
      'SELECT code, name FROM subjects WHERE id = $1',
      [subject_id]
    );

    if (subjectCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Subject not found' });
    }

    const subjectCode = subjectCheck.rows[0].code;
    const subjectName = subjectCheck.rows[0].name;

    // Check if student already took this COURSE (by code) in ANY semester
    const courseCheck = await client.query(`
      SELECT s.name, s.code, sem.name as semester_name
      FROM enrollments e
      JOIN subjects s ON e.subject_id = s.id
      JOIN semesters sem ON s.semester_id = sem.id
      WHERE e.student_id = $1 AND s.code = $2 AND e.status = 'active'
    `, [student_id, subjectCode]);

    if (courseCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      const prevSemester = courseCheck.rows[0].semester_name;
      return res.status(400).json({ 
        error: `You have already taken ${subjectName} (${subjectCode}) in ${prevSemester}. You cannot repeat the same course.` 
      });
    }

    // Check if student already completed this course
    const completedCheck = await client.query(`
      SELECT s.name, s.code FROM enrollment_history eh
      JOIN subjects s ON eh.subject_id = s.id
      WHERE eh.student_id = $1 AND s.code = $2
    `, [student_id, subjectCode]);

    if (completedCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `You have already completed ${subjectName} (${subjectCode}) in a previous semester.` 
      });
    }

    // Check if student already enrolled in another subject this semester
    const semesterEnrollment = await client.query(
      'SELECT s.name FROM enrollments e JOIN subjects s ON e.subject_id = s.id WHERE e.student_id = $1 AND e.semester_id = $2 AND e.status = $3',
      [student_id, semester_id, 'active']
    );

    if (semesterEnrollment.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `You are already enrolled in ${semesterEnrollment.rows[0].name} for this semester` 
      });
    }

    // Lock the subject row and check available seats (FOR UPDATE ensures row-level lock)
    const subjectQuery = await client.query(
      'SELECT * FROM subjects WHERE id = $1 FOR UPDATE',
      [subject_id]
    );

    if (subjectQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Subject not found' });
    }

    const subject = subjectQuery.rows[0];

    // Check if seats are available
    if (subject.available_seats <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No seats available for this subject' });
    }

    // Verify semester matches
    if (subject.semester_id !== semester_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Subject does not belong to this semester' });
    }

    // Decrement available seats
    await client.query(
      'UPDATE subjects SET available_seats = available_seats - 1 WHERE id = $1',
      [subject_id]
    );

    // Create enrollment
    const enrollmentResult = await client.query(
      `INSERT INTO enrollments (student_id, subject_id, semester_id, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student_id, subject_id, semester_id, 'active']
    );

    // Commit transaction
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Successfully enrolled in the subject',
      enrollment: enrollmentResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    
    // Handle serialization failure (concurrent enrollment attempts)
    if (error.code === '40001') {
      return res.status(409).json({ 
        error: 'Another enrollment is in progress. Please try again.' 
      });
    }

    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint === 'enrollments_student_id_subject_id_key') {
        return res.status(400).json({ error: 'You are already enrolled in this subject' });
      }
      if (error.constraint === 'one_subject_per_semester') {
        return res.status(400).json({ error: 'You can only enroll in one subject per semester' });
      }
    }

    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Server error during enrollment' });
  } finally {
    client.release();
  }
});

// Get student's enrollments
router.get('/enrollments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        s.name as subject_name,
        s.code as subject_code,
        s.description as subject_description,
        sem.name as semester_name,
        sem.start_date,
        sem.end_date
      FROM enrollments e
      JOIN subjects s ON e.subject_id = s.id
      JOIN semesters sem ON e.semester_id = sem.id
      WHERE e.student_id = $1 AND e.status = 'active'
      ORDER BY e.enrolled_at DESC
    `, [req.user.id]);

    res.json({ enrollments: result.rows });
  } catch (error) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Server error while fetching enrollments' });
  }
});

// Get enrollment history (completed subjects)
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        eh.*,
        s.name as subject_name,
        s.code as subject_code,
        sem.name as semester_name
      FROM enrollment_history eh
      JOIN subjects s ON eh.subject_id = s.id
      JOIN semesters sem ON eh.semester_id = sem.id
      WHERE eh.student_id = $1
      ORDER BY eh.completed_at DESC
    `, [req.user.id]);

    res.json({ history: result.rows });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error while fetching history' });
  }
});

// Drop enrollment (optional feature)
router.delete('/enrollments/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get enrollment details
    const enrollmentQuery = await client.query(
      'SELECT * FROM enrollments WHERE id = $1 AND student_id = $2 AND status = $3',
      [id, req.user.id, 'active']
    );

    if (enrollmentQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Enrollment not found or already dropped' });
    }

    const enrollment = enrollmentQuery.rows[0];

    // Increment available seats
    await client.query(
      'UPDATE subjects SET available_seats = available_seats + 1 WHERE id = $1',
      [enrollment.subject_id]
    );

    // Update enrollment status
    await client.query(
      'UPDATE enrollments SET status = $1 WHERE id = $2',
      ['dropped', id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Enrollment dropped successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Drop enrollment error:', error);
    res.status(500).json({ error: 'Server error while dropping enrollment' });
  } finally {
    client.release();
  }
});

module.exports = router;
