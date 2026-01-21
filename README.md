# ERP Enrollment System

A scalable, secure web-based role-based application for managing course enrollments in educational institutions.

##  Features

### For Teachers
- Create and manage semesters
- Create subjects with seat limits
- Monitor enrollments in real-time
- View enrollment statistics
- Update subject details and seat capacity

### For Students
- Browse available subjects by semester
- Enroll in subjects (first-come-first-served)
- View real-time seat availability
- Smart enrollment restrictions:
  - One subject per semester
  - Cannot re-enroll in completed subjects
  - Automatic UI updates based on status

### System Features
- **High Concurrency Support**: Handles 1000+ simultaneous users
- **Transaction-based Enrollment**: Row-level locking prevents overbooking
- **Real-time Updates**: Instant seat availability updates
- **Security**: JWT authentication, helmet protection, rate limiting
- **Scalability**: Connection pooling, optimized queries

## 🏗 Tech Stack

### Backend
- **Node.js** with Express
- **PostgreSQL** (with row-level locking for concurrency)
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend
- **React** with React Router
- **Axios** for API calls
- **Context API** for state management

##  Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

##  Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd ERP-Prototype
```

### 2. Install dependencies
```bash
npm run install-all
```

### 3. Set up PostgreSQL Database

Create a PostgreSQL database:
```sql
CREATE DATABASE erp_enrollment;
```

### 4. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_enrollment
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# Client URL
CLIENT_URL=http://localhost:3000
```

### 5. Run Database Migrations
```bash
npm run db:migrate
```

### 6. Start the Application

**Development mode** (runs both backend and frontend):
```bash
npm run dev
```

**Or run separately:**
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

##  Project Structure

```
ERP-Prototype/
├── server/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── database/
│   │   └── migrate.js           # Database schema & migrations
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── teacher.js           # Teacher routes
│   │   └── student.js           # Student routes
│   └── index.js                 # Server entry point
├── client/
│   ├── public/
│   └── src/
│       ├── api/
│       │   └── axios.js         # API configuration
│       ├── components/
│       │   ├── Login.js
│       │   ├── Register.js
│       │   ├── Teacher/
│       │   │   ├── TeacherDashboard.js
│       │   │   └── TeacherDashboard.css
│       │   └── Student/
│       │       ├── StudentDashboard.js
│       │       └── StudentDashboard.css
│       ├── context/
│       │   └── AuthContext.js   # Authentication context
│       ├── App.js
│       └── index.js
├── package.json
└── .env
```

##  API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Teacher Routes (Protected)
- `GET /api/teacher/semesters` - Get all semesters
- `POST /api/teacher/semesters` - Create semester
- `GET /api/teacher/subjects` - Get all subjects
- `POST /api/teacher/subjects` - Create subject
- `PUT /api/teacher/subjects/:id` - Update subject
- `GET /api/teacher/statistics` - Get enrollment statistics
- `GET /api/teacher/subjects/:id/enrollments` - Get subject enrollments

### Student Routes (Protected)
- `GET /api/student/subjects?semester_id=<id>` - Get available subjects
- `POST /api/student/enroll` - Enroll in subject
- `GET /api/student/enrollments` - Get student's enrollments
- `GET /api/student/history` - Get enrollment history
- `DELETE /api/student/enrollments/:id` - Drop enrollment

##  Concurrency Handling

The system uses several mechanisms to handle high concurrency:

1. **SERIALIZABLE Transaction Isolation**: Prevents race conditions
2. **Row-Level Locking (FOR UPDATE)**: Locks subject rows during enrollment
3. **Atomic Operations**: Seat decrements are atomic
4. **Database Constraints**: Unique constraints prevent duplicate enrollments
5. **Connection Pooling**: Efficient database connection management

Example enrollment transaction:
```javascript
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE
  -- Lock subject row
  SELECT * FROM subjects WHERE id = $1 FOR UPDATE
  
  -- Check seat availability
  -- Decrement seats
  UPDATE subjects SET available_seats = available_seats - 1
  
  -- Create enrollment
  INSERT INTO enrollments (student_id, subject_id, semester_id)
COMMIT
```

## 🎨 UI Behavior

### Student Enrollment Button States:
| Condition | Button State | Description |
|-----------|-------------|-------------|
| Seats available | **Enroll** (enabled) | Student can enroll |
| No seats | **Seats Full** (disabled) | Subject is full |
| Already completed | **Already Completed** (disabled) | Subject taken previously |
| Enrolled in semester | **Enrolled in Other Subject** (disabled) | One subject limit |

## 🧪 Testing High Concurrency

To test the system with multiple concurrent enrollments:

```bash
# Install Apache Bench (if not installed)
brew install apache2  # macOS
apt-get install apache2-utils  # Ubuntu

# Test concurrent enrollments
ab -n 1000 -c 100 -p enroll.json -T application/json \
   -H "Authorization: Bearer YOUR_TOKEN" \
   http://localhost:5000/api/student/enroll
```

##  Database Schema

### Users Table
- id (UUID, Primary Key)
- email (Unique, must end with @edu.in)
- password (Hashed)
- role (teacher/student)
- roll_number (for students)
- full_name

### Semesters Table
- id (UUID, Primary Key)
- name (Unique)
- start_date, end_date
- is_active (Boolean)

### Subjects Table
- id (UUID, Primary Key)
- name, code
- semester_id (Foreign Key)
- total_seats, available_seats
- Constraint: available_seats <= total_seats

### Enrollments Table
- id (UUID, Primary Key)
- student_id, subject_id, semester_id
- Unique constraint: (student_id, subject_id) - No re-enrollment
- Unique constraint: (student_id, semester_id) - One subject per semester

##  Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Helmet.js for HTTP headers
- Rate limiting (100 requests/15min)
- CORS configuration
- Input validation with express-validator
- SQL injection prevention (parameterized queries)

## 🚨 Error Handling

The system handles:
- Concurrent enrollment attempts
- Seat overflow prevention
- Duplicate enrollments
- Authentication failures
- Database connection issues
- Invalid inputs

##  License

MIT

## 👥 Contributors

Joshua Immanuel

##  Support

For issues or questions, please open an issue in the repository.
