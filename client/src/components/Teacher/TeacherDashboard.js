import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subjectEnrollments, setSubjectEnrollments] = useState([]);
  const [editingSemester, setEditingSemester] = useState(null);

  // Form states
  const [semesterForm, setSemesterForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_active: true,
  });

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: '',
    semester_id: '',
    total_seats: '',
  });

  useEffect(() => {
    fetchSemesters();
    fetchSubjects();
    fetchStatistics();
    fetchAllEnrollments();
  }, []);

  const fetchSemesters = async () => {
    try {
      const response = await api.get('/teacher/semesters');
      setSemesters(response.data.semesters);
    } catch (err) {
      console.error('Error fetching semesters:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/teacher/subjects');
      setSubjects(response.data.subjects);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/teacher/statistics');
      setStatistics(response.data.statistics);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const fetchAllEnrollments = async () => {
    try {
      const response = await api.get('/teacher/subjects');
      const subjectsWithEnrollments = await Promise.all(
        response.data.subjects.map(async (subject) => {
          try {
            const enrollResponse = await api.get(`/teacher/subjects/${subject.id}/enrollments`);
            const students = enrollResponse.data.enrollments.sort((a, b) => {
              const rollA = a.roll_number || '';
              const rollB = b.roll_number || '';
              return rollA.localeCompare(rollB);
            });
            return { ...subject, students };
          } catch (err) {
            return { ...subject, students: [] };
          }
        })
      );
      setSubjectEnrollments(subjectsWithEnrollments);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/teacher/semesters', semesterForm);
      setSemesterForm({ name: '', start_date: '', end_date: '', is_active: true });
      await fetchSemesters();
      setActiveTab('semesters');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create semester');
    } finally {
      setLoading(false);
    }
  };

  const startEditingSemester = (semester) => {
    setEditingSemester(semester.id);
    setSemesterForm({
      name: semester.name,
      start_date: semester.start_date.split('T')[0],
      end_date: semester.end_date.split('T')[0],
      is_active: semester.is_active
    });
    setActiveTab('edit-semester');
  };

  const handleUpdateSemester = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('Updating semester:', editingSemester, semesterForm);

    try {
      const response = await api.put(`/teacher/semesters/${editingSemester}`, semesterForm);
      console.log('Update response:', response.data);
      setSemesterForm({ name: '', start_date: '', end_date: '', is_active: true });
      setEditingSemester(null);
      await fetchSemesters();
      setActiveTab('semesters');
      setError('');
    } catch (err) {
      console.error('Update error:', err.response?.data);
      const errorMsg = err.response?.data?.errors 
        ? err.response.data.errors.map(e => e.msg).join(', ')
        : err.response?.data?.error || 'Failed to update semester';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const cancelEditSemester = () => {
    setEditingSemester(null);
    setSemesterForm({ name: '', start_date: '', end_date: '', is_active: true });
    setActiveTab('semesters');
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/teacher/subjects', subjectForm);
      setSubjectForm({ name: '', code: '', description: '', semester_id: '', total_seats: '' });
      await Promise.all([fetchSubjects(), fetchStatistics()]);
      setActiveTab('subjects');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create subject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>Teacher Dashboard</h1>
        <div className="nav-right">
          <span>Welcome, {user?.full_name}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Subjects</h3>
            <p className="stat-number">{statistics.total_subjects || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Total Enrollments</h3>
            <p className="stat-number">{statistics.total_enrollments || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Total Students</h3>
            <p className="stat-number">{statistics.total_students || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Active Semesters</h3>
            <p className="stat-number">{statistics.active_semesters || 0}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs">
          <button
            className={activeTab === 'dashboard' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="tab-icon">📊</span>
            Dashboard
          </button>
          <button
            className={activeTab === 'semesters' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('semesters')}
          >
            <span className="tab-icon">📅</span>
            Semesters
          </button>
          <button
            className={activeTab === 'subjects' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('subjects')}
          >
            <span className="tab-icon">📚</span>
            Subjects
          </button>
          <button
            className={activeTab === 'enrollments' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('enrollments')}
          >
            <span className="tab-icon">👥</span>
            Enrollments
          </button>
          <button
            className={activeTab === 'create-semester' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('create-semester')}
          >
            <span className="tab-icon">➕</span>
            New Semester
          </button>
          <button
            className={activeTab === 'create-subject' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('create-subject')}
          >
            <span className="tab-icon">➕</span>
            New Subject
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'dashboard' && (
            <div className="dashboard-overview">
              <h2>Welcome back, {user?.full_name}!</h2>
              <p className="dashboard-subtitle">Here's an overview of your enrollment system</p>
              
              <div className="stats-grid-large">
                <div className="stat-card-large">
                  <div className="stat-icon">📚</div>
                  <div className="stat-details">
                    <h3>Total Subjects</h3>
                    <p className="stat-number-large">{statistics.total_subjects || 0}</p>
                    <span className="stat-label">Active Courses</span>
                  </div>
                </div>
                <div className="stat-card-large">
                  <div className="stat-icon">👥</div>
                  <div className="stat-details">
                    <h3>Total Enrollments</h3>
                    <p className="stat-number-large">{statistics.total_enrollments || 0}</p>
                    <span className="stat-label">Student Registrations</span>
                  </div>
                </div>
                <div className="stat-card-large">
                  <div className="stat-icon">🎓</div>
                  <div className="stat-details">
                    <h3>Total Students</h3>
                    <p className="stat-number-large">{statistics.total_students || 0}</p>
                    <span className="stat-label">Registered Users</span>
                  </div>
                </div>
                <div className="stat-card-large">
                  <div className="stat-icon">📅</div>
                  <div className="stat-details">
                    <h3>Active Semesters</h3>
                    <p className="stat-number-large">{statistics.active_semesters || 0}</p>
                    <span className="stat-label">Current Academic Terms</span>
                  </div>
                </div>
              </div>

              <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="action-buttons">
                  <button className="action-btn" onClick={() => setActiveTab('create-semester')}>
                    <span className="action-icon">📅</span>
                    <span>Create New Semester</span>
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('create-subject')}>
                    <span className="action-icon">📚</span>
                    <span>Create New Subject</span>
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('enrollments')}>
                    <span className="action-icon">👥</span>
                    <span>View Enrollments</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="subjects-list">
              <h2>All Subjects</h2>
              {subjects.length === 0 ? (
                <p>No subjects created yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject Name</th>
                      <th>Code</th>
                      <th>Semester</th>
                      <th>Total Seats</th>
                      <th>Available</th>
                      <th>Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => (
                      <tr key={subject.id}>
                        <td>{subject.name}</td>
                        <td>{subject.code}</td>
                        <td>{subject.semester_name}</td>
                        <td>{subject.total_seats}</td>
                        <td>{subject.available_seats}</td>
                        <td>{subject.enrolled_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'enrollments' && (
            <div className="enrollments-list">
              <h2>Student Enrollments by Subject</h2>
              {subjectEnrollments.length === 0 ? (
                <p>No subjects with enrollments yet.</p>
              ) : (
                <div className="subjects-enrollments">
                  {subjectEnrollments.map((subject) => (
                    <div key={subject.id} className="subject-enrollment-card">
                      <div className="subject-header">
                        <h3>{subject.name} ({subject.code})</h3>
                        <div className="subject-info">
                          <span className="semester-badge">{subject.semester_name}</span>
                          <span className="enrollment-stats">
                            {subject.students.length} / {subject.total_seats} students enrolled
                          </span>
                        </div>
                      </div>
                      {subject.students.length === 0 ? (
                        <p className="no-students">No students enrolled yet</p>
                      ) : (
                        <table className="students-table">
                          <thead>
                            <tr>
                              <th>Roll Number</th>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Enrolled Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subject.students.map((student) => (
                              <tr key={student.enrollment_id}>
                                <td><strong>{student.roll_number}</strong></td>
                                <td>{student.name}</td>
                                <td>{student.email}</td>
                                <td>{new Date(student.enrolled_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'semesters' && (
            <div className="semesters-list">
              <h2>All Semesters</h2>
              {semesters.length === 0 ? (
                <p>No semesters created yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Semester Name</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semesters.map((semester) => (
                      <tr key={semester.id}>
                        <td>{semester.name}</td>
                        <td>{new Date(semester.start_date).toLocaleDateString()}</td>
                        <td>{new Date(semester.end_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${semester.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {semester.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn-edit"
                            onClick={() => startEditingSemester(semester)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'create-subject' && (
            <div className="create-form">
              <h2>Create New Subject</h2>
              <form onSubmit={handleCreateSubject}>
                <div className="form-group">
                  <label>Subject Name</label>
                  <input
                    type="text"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Subject Code</label>
                  <input
                    type="text"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Semester</label>
                  <select
                    value={subjectForm.semester_id}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester_id: e.target.value })}
                    required
                  >
                    <option value="">Select Semester</option>
                    {semesters.map((sem) => (
                      <option key={sem.id} value={sem.id}>
                        {sem.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Total Seats</label>
                  <input
                    type="number"
                    min="1"
                    value={subjectForm.total_seats}
                    onChange={(e) => setSubjectForm({ ...subjectForm, total_seats: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Subject'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'create-semester' && (
            <div className="create-form">
              <h2>Create New Semester</h2>
              <form onSubmit={handleCreateSemester}>
                <div className="form-group">
                  <label>Semester Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Fall 2024"
                    value={semesterForm.name}
                    onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={semesterForm.start_date}
                    onChange={(e) => setSemesterForm({ ...semesterForm, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={semesterForm.end_date}
                    onChange={(e) => setSemesterForm({ ...semesterForm, end_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={semesterForm.is_active}
                      onChange={(e) => setSemesterForm({ ...semesterForm, is_active: e.target.checked })}
                    />
                    {' '}Active
                  </label>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Semester'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'edit-semester' && (
            <div className="create-form">
              <h2>Edit Semester</h2>
              <form onSubmit={handleUpdateSemester}>
                <div className="form-group">
                  <label>Semester Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Fall 2024"
                    value={semesterForm.name}
                    onChange={(e) => setSemesterForm({ ...semesterForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={semesterForm.start_date}
                    onChange={(e) => setSemesterForm({ ...semesterForm, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={semesterForm.end_date}
                    onChange={(e) => setSemesterForm({ ...semesterForm, end_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={semesterForm.is_active}
                      onChange={(e) => setSemesterForm({ ...semesterForm, is_active: e.target.checked })}
                    />
                    {' '}Active
                  </label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Semester'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={cancelEditSemester}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
