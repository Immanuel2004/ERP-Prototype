const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const setupSampleData = async () => {
  const client = await pool.connect();

  try {
    // Hash passwords
    const studentPassword = await bcrypt.hash('password123', 10);
    const teacherPassword = await bcrypt.hash('password123', 10);

    // Insert sample student
    await client.query(
      `INSERT INTO users (email, password, role, full_name, roll_number) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      ['student@edu.in', studentPassword, 'student', 'John Doe', '001']
    );

    // Insert sample teacher
    await client.query(
      `INSERT INTO users (email, password, role, full_name) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['teacher@edu.in', teacherPassword, 'teacher', 'Prof. Jane Smith']
    );

    console.log('✅ Sample users created successfully');
    console.log('\nYou can now login with:');
    console.log('Student: student@edu.in / password123 (Roll: 001)');
    console.log('Teacher: teacher@edu.in / password123');

  } catch (error) {
    console.error('Error setting up sample data:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

setupSampleData();
