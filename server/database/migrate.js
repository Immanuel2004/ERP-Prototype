const pool = require('../config/database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Users table (Teachers and Students)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student')),
        roll_number VARCHAR(50), -- Only for students
        full_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@edu\\.in$')
      )
    `);

    // Semesters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS semesters (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name)
      )
    `);

    // Subjects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL,
        description TEXT,
        semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
        total_seats INTEGER NOT NULL CHECK (total_seats > 0),
        available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT available_seats_check CHECK (available_seats <= total_seats),
        UNIQUE(code, semester_id)
      )
    `);

    // Create index for faster seat availability checks
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subjects_available_seats 
      ON subjects(available_seats) 
      WHERE available_seats > 0
    `);

    // Enrollments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES users(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
        semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
        UNIQUE(student_id, subject_id), -- Prevent duplicate enrollments across all semesters
        CONSTRAINT one_subject_per_semester UNIQUE(student_id, semester_id)
      )
    `);

    // Create indexes for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enrollments_student 
      ON enrollments(student_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enrollments_subject 
      ON enrollments(subject_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enrollments_semester 
      ON enrollments(semester_id)
    `);

    // Enrollment history table (tracks all completed subjects)
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollment_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES users(id) ON DELETE CASCADE,
        subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
        semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, subject_id)
      )
    `);

    // Function to automatically update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Triggers for updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_semesters_updated_at ON semesters;
      CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
      CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    await client.query('COMMIT');
    console.log('✅ Database tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createTables;
