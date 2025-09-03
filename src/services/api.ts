import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as T from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor to add the token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const message = error.response?.data?.error || error.message || 'An Unknown error occurred';
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('role');
      throw new Error('Session expired. Please log in again.');
    }
    console.error('API Error:', message, error.response?.data);
    throw new Error(message);
  }
);

// Reusable Role Check Logic
type UserRole = 'student' | 'teacher' | 'admin';

const checkRole = async (requiredRoles: UserRole[]): Promise<boolean> => {
  const role = (await SecureStore.getItemAsync('role')) as UserRole | null;
  return role ? requiredRoles.includes(role) : false;
}

// Higher-Order Function to wrap API calls with a role check
const withRoleCheck = <T extends any[], R>(
  apiCall: (...args: T) => Promise<R>,
  requiredRoles: UserRole[]
) => {
  return async (...args: T): Promise<R> => {
    const hasPermission = await checkRole(requiredRoles);
    if (!hasPermission) {
      throw new Error(`Unauthorized: Requires one of [${requiredRoles.join(', ')}] roles.`);
    }
    return apiCall(...args);
  };
};

// API Endpoints
export const auth = {
  login: (data: { enrollmentNo?: string; email?: string; password: string }) => {
    return api.post<T.AuthResponse>('/auth/login', data).then(res => res.data);
  },
  register: (data: {  
    enrollmentNo?: string;
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    faceEmbedding?: number[];
  }) => {
    return api.post<T.AuthResponse>('/auth/register', data).then(res => res.data);
  },
};

export const users = {
  // GET /users (teacher, admin)
  getAll: withRoleCheck(
    (query: { role?: string; search?: string; limit?: number; page?: number } = {}) => 
      api.get('/users', { params: query }).then(res => res.data),
    ['teacher', 'admin']
  ),
  // POST /users (admin)
  create: withRoleCheck(
    (data: Omit<T.User, '_id'>) => 
      api.post<T.User>('/users', data).then(res => res.data),
    ['admin']
  ),
  // GET /users/profile (auth)
  getProfile: () => api.get<T.User>('/users/profile').then(res => res.data),
  // PUT /users/profile (auth)
  updateProfile: (data: Omit<T.User, '_id' | 'role' | 'password'>) => 
    api.put<T.User>('/users/profile', data).then(res => res.data),
  // PUT /users/change-password (auth)
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
      api.put('/users/change-password', data).then(res => res.data),
  // GET /users/:id (admin)
  getById: withRoleCheck(
    (id: string) => api.get<T.User>(`/users/${id}`).then(res => res.data),
    ['admin']
  ),
};

export const attendance = {
  // POST /attendances (student)
  submit: withRoleCheck(
    (data: T.AttendanceSubmission) => api.post<T.Attendance>('/attendances', data),
    ['student']
  ),
  sync: withRoleCheck(
    (data: T.AttendanceSubmission[]) => api.post<T.SyncResponse>('/attendances/sync', { attendances: data }),
    ['student']
  ),
  getByClass: withRoleCheck(
    (classId: string, query: { startDate?: string; endDate?: string; status?: string } = {}) =>
      api.get<T.AttendanceResponse>(`/attendances/records/class/${classId}`, { params: query }),
    ['teacher', 'admin', 'student']
  ),
  manual: withRoleCheck(
    (data: T.ManualAttendance) => api.post<T.Attendance>('/attendances/manual', data),
    ['teacher', 'admin']
  ),
  getAll: withRoleCheck(
    (query: { startDate?: string; endDate?: string; status?: string } = {}) =>
      api.get<T.Attendance[]>('/attendances/records', { params: query }),
    ['teacher', 'admin']
  ),
  getByStudent: withRoleCheck(
    (studentId: string, query: { startDate?: string; endDate?: string; classId?: string } = {}) =>
      api.get<T.AttendanceResponse>(`/attendances/records/student/${studentId}`, { params: query }),
    ['teacher', 'admin']
  ),
};

export const classes = {
  getAll: () => api.get<T.Class[]>('/classes'),
  create: withRoleCheck(
    (data: Omit<T.Class, '_id'>) =>
      api.post<T.Class>('/classes', data),
    ['teacher', 'admin']
  ),
  enrollStudent: withRoleCheck(
    (data: { classId: string; studentId: string }) =>
      api.post<{ message: string }>('/classes/enroll', data),
    ['admin']
  ),
  getEnrolled: withRoleCheck(
    () => api.get<T.Class[]>('/classes/enrolled'),
    ['student']
  ),
  getTeacherClasses: withRoleCheck(
    () => api.get<T.Class[]>('/classes/teacher'),
    ['teacher']
  ),
};

export const schedule = {
  create: withRoleCheck(
    (data: Omit<T.Schedule, '_id'>) =>
      api.post<T.Schedule>('/schedules', data),
    ['teacher', 'admin']
  ),
  getByClass: (classId: string) => api.get<T.Schedule[]>(`/schedules/${classId}`),
};

export const qr = {
  generate: withRoleCheck(
    (data: { classId: string; scheduleId: string, teacherId: string; coordinates: T.Coordinates }) =>
      api.post<{ sessionId: string; token: string; expiredAt: string }>('/qr/generate', data),
    ['teacher']
  ),
  validate: (data: { token: string }) => api.post<{ valid: boolean; sessionId: string }>('/qr/validate', data),
};

export const audit = {
  getLogs: withRoleCheck(
    (query: { userId?: string; action?: string; startDate?: string; endDate?: string; status?: string } = {}) =>
      api.get<T.AuditLog[]>('/audit-logs', { params: query }),
    ['admin']
  ),
};

export default api;
