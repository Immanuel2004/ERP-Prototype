import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('available');
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSemesters();
    fetchMyEnrollments();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      fetchSubjects();
    }
  }, [selectedSemester]);

  const fetchSemesters = async () => {
    try {
      const response = await api.get('/semesters');
      const activeSemesters = response.data.semesters.filter(sem => sem.is_active);
      setSemesters(activeSemesters);
      if (activeSemesters.length > 0) {
        setSelectedSemester(activeSemesters[0].id);
      }
    } catch (err) {
      console.error('Error fetching semesters:', err);
      setError('Failed to load semesters');
    }
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/student/subjects', {
        params: { semester_id: selectedSemester }
      });
      setSubjects(response.data.subjects);
      setError('');
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setError('Failed to load subjects. Please try again.');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyEnrollments = async () => {
    try {
      const response = await api.get('/student/enrollments');
      setMyEnrollments(response.data.enrollments);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    }
  };

  const handleEnroll = async (subject_id) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/student/enroll', {
        subject_id,
        semester_id: selectedSemester
      });
      setSuccess('Successfully enrolled!');
      fetchSubjects();
      fetchMyEnrollments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Enrollment failed');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const getEnrollButtonState = (subject) => {
    if (subject.already_completed) {
      return { disabled: true, text: 'Already Completed', class: 'btn-disabled' };
    }
    if (subject.already_taken_course) {
      return { disabled: true, text: 'Already Taken', class: 'btn-disabled' };
    }
    if (subject.already_enrolled) {
      return { disabled: true, text: 'Enrolled', class: 'btn-enrolled' };
    }
    if (subject.enrolled_in_semester && !subject.already_enrolled) {
      return { disabled: true, text: 'Enrolled in Other Subject', class: 'btn-disabled' };
    }
    if (subject.available_seats <= 0) {
      return { disabled: true, text: 'Seats Full', class: 'btn-full' };
    }
    return { disabled: false, text: 'Enroll', class: 'btn-enroll' };
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>Student Dashboard</h1>
        <div className="nav-right">
          <span>Welcome, {user?.full_name} ({user?.roll_number})</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        {/* Tabs */}
        <div className="tabs">
          <button
            className={activeTab === 'available' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('available')}
          >
            Available Subjects
          </button>
          <button
            className={activeTab === 'enrolled' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('enrolled')}
          >
            My Enrollments
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'available' && (
            <div>
              <div className="semester-selector">
                <label>Select Semester:</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                >
                  {semesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="subjects-grid">
                {loading ? (
                  <p>Loading subjects...</p>
                ) : subjects.length === 0 ? (
                  <p>No subjects available for this semester.</p>
                ) : (
                  subjects.map((subject) => {
                    const buttonState = getEnrollButtonState(subject);
                    return (
                      <div key={subject.id} className="subject-card">
                        <div className="subject-header">
                          <h3>{subject.name}</h3>
                          <span className="subject-code">{subject.code}</span>
                        </div>
                        
                        {subject.description && (
                          <p className="subject-description">{subject.description}</p>
                        )}

                        <div className="subject-info">
                          <div className="info-item">
                            <span className="label">Total Seats:</span>
                            <span className="value">{subject.total_seats}</span>
                          </div>
                          <div className="info-item">
                            <span className="label">Available:</span>
                            <span className={`value ${subject.available_seats === 0 ? 'text-danger' : 'text-success'}`}>
                              {subject.available_seats}
                            </span>
                          </div>
                          <div className="info-item">
                            <span className="label">Enrolled:</span>
                            <span className="value">{subject.enrolled_count}</span>
                          </div>
                        </div>

                        <button
                          className={`btn-action ${buttonState.class}`}
                          disabled={buttonState.disabled || loading}
                          onClick={() => handleEnroll(subject.id)}
                        >
                          {buttonState.text}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'enrolled' && (
            <div className="enrollments-list">
              <h2>My Current Enrollments</h2>
              {myEnrollments.length === 0 ? (
                <p>You haven't enrolled in any subjects yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Semester</th>
                      <th>Enrolled On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myEnrollments.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td>{enrollment.subject_name}</td>
                        <td>{enrollment.subject_code}</td>
                        <td>{enrollment.semester_name}</td>
                        <td>{new Date(enrollment.enrolled_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
