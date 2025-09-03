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
      api.get<T.User[]>('/users', { params: query }).then(res => res.data),
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
  updateProfile: (data: Partial<Omit<T.User, '_id' | 'role' | 'enrollmentNo' | 'email'>>) =>
    api.put<T.User>('/users/profile', data).then(res => res.data),

  // PUT /users/change-password (auth)
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<{ message: string }>('/users/change-password', data).then(res => res.data),

  // GET /users/:id (admin)
  getById: withRoleCheck(
    (id: string) => api.get<T.User>(`/users/${id}`).then(res => res.data),
    ['admin']
  ),
};

export const attendance = {
  // POST /attendances (student)
  submit: withRoleCheck(
    (data: T.AttendanceSubmission) => api.post<T.Attendance>('/attendances', data).then(res => res.data),
    ['student']
  ),

  // POST /attendances/sync (student)
  sync: withRoleCheck(
    (data: T.AttendanceSubmission[]) => api.post<T.SyncResponse>('/attendances/sync', { attendances: data }).then(res => res.data),
    ['student']
  ),

  // POST /attendances/manual (teacher, admin)
  manual: withRoleCheck(
    (data: T.ManualAttendance) => api.post<T.Attendance>('/attendances/manual', data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // GET /attendances/records (teacher, admin)
  getAll: withRoleCheck(
    (query: { startDate?: string; endDate?: string; status?: string } = {}) =>
      api.get<T.Attendance[]>('/attendances/records', { params: query }).then(res => res.data),
    ['teacher', 'admin']
  ),

  // GET /attendances/records/student/:studentId (teacher, admin)
  getByStudent: withRoleCheck(
    (studentId: string, query: { startDate?: string; endDate?: string; classId?: string } = {}) =>
      api.get<T.AttendanceResponse>(`/attendances/records/student/${studentId}`, { params: query }).then(res => res.data),
    ['teacher', 'admin']
  ),

  // GET /attendances/records/class/:classId (teacher, admin, student)
  getByClass: async (classId: string, query: { startDate?: string; endDate?: string; status?: string } = {}) => {
    return api.get<T.AttendanceResponse>(`/attendances/records/class/${classId}`, { params: query }).then(res => res.data);
  },
};

export const classes = {
  // GET /classes (auth)
  getAll: () => api.get<T.Class[]>('/classes').then(res => res.data),

  // GET /classes/:id (auth)
  getById: (id: string) => api.get<T.Class>(`/classes/${id}`).then(res => res.data),

  // POST /classes (teacher, admin)
  create: withRoleCheck(
    (data: Omit<T.Class, '_id' | 'teacherId'>) =>
      api.post<T.Class>('/classes', data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // POST /classes/enroll (teacher, admin)
  enrollStudent: withRoleCheck(
    (data: { classId: string; studentId: string }) =>
      api.post<{ message: string }>('/classes/enroll', data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // PUT /classes/:id (teacher, admin)
  update: withRoleCheck(
    (id: string, data: Partial<Omit<T.Class, '_id' | 'teacherId'>>) =>
      api.put<T.Class>(`/classes/${id}`, data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // DELETE /classes/:id (teacher, admin)
  delete: withRoleCheck(
    (id: string) => api.delete<{ message: string }>(`/classes/${id}`).then(res => res.data),
    ['teacher', 'admin']
  ),

  // GET /classes/enrolled (student)
  getEnrolled: withRoleCheck(
    () => api.get<T.Class[]>('/classes/enrolled').then(res => res.data),
    ['student']
  ),

  // GET /classes/teacher (teacher)
  getTeacherClasses: withRoleCheck(
    () => api.get<T.Class[]>('/classes/teacher').then(res => res.data),
    ['teacher']
  ),
};

export const qr = {
  // POST /qr/generate (teacher)
  generate: withRoleCheck(
    (data: { classId: string; scheduleId: string, teacherId: string; coordinates: T.Coordinates }) =>
      api.post<T.QRData>('/qr/generate', data).then(res => res.data),
    ['teacher']
  ),

  // POST /qr/refresh/:sessionId (teacher)
  refresh: withRoleCheck(
    (sessionId: string) => api.post<{ token: string, expiredAt: string }>(`/qr/refresh/${sessionId}`).then(res => res.data),
    ['teacher']
  ),

  // DELETE /qr/terminate/:sessionId (teacher)
  terminate: withRoleCheck(
    (sessionId: string) => api.delete<{ message: string }>(`/qr/terminate/${sessionId}`).then(res => res.data),
    ['teacher']
  ),

  // DELETE /qr/terminate-all (teacher)
  terminateAll: withRoleCheck(
    () => api.delete<{ message: string }>('/qr/terminate-all').then(res => res.data),
    ['teacher']
  ),

  // GET /qr/active (teacher)
  getActive: withRoleCheck(
    () => api.get<any>('/qr/active').then(res => res.data),
    ['teacher']
  ),

  // POST /qr/validate (student)
  validate: withRoleCheck(
    (data: { token: string }) => api.post<{ valid: boolean; sessionId: string }>('/qr/validate', data).then(res => res.data),
    ['student']
  ),
};

export const rooms = {
  // GET /rooms (teacher, admin)
  getAll: withRoleCheck(
    () => api.get<T.Room[]>('/rooms').then(res => res.data),
    ['teacher', 'admin']
  ),

  // GET /rooms/type/:type (teacher, admin)
  getByType: withRoleCheck(
    (type: string) => api.get<T.Room[]>(`/rooms/type/${type}`).then(res => res.data),
    ['teacher', 'admin']
  ),

  // POST /rooms (teacher, admin)
  create: withRoleCheck(
    (data: Omit<T.Room, '_id'>) => api.post<T.Room>('/rooms', data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // POST /rooms/initialize (teacher, admin)
  initialize: withRoleCheck(
    (data: T.Room[]) => api.post<{ message: string }>('/rooms/initialize', data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // PUT /rooms/:id (teacher, admin)
  update: withRoleCheck(
    (id: string, data: Partial<T.Room>) => api.put<T.Room>(`/rooms/${id}`, data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // DELETE /rooms/:id (teacher, admin)
  delete: withRoleCheck(
    (id: string) => api.delete<{ message: string }>(`/rooms/${id}`).then(res => res.data),
    ['teacher', 'admin']
  ),
};

export const schedule = {
  // GET /schedules/weekly (teacher, admin)
  getWeekly: withRoleCheck(
    () => api.get<T.Schedule[]>('/schedules/weekly').then(res => res.data),
    ['teacher', 'admin']
  ),

  // GET /schedules/today (teacher, admin)
  getToday: withRoleCheck(
    () => api.get<T.Schedule[]>('/schedules/today').then(res => res.data),
    ['teacher', 'admin']
  ),

  // POST /schedules/bulk (teacher, admin)
  createBulk: withRoleCheck(
    (data: T.Schedule[]) => api.post<T.Schedule[]>('/schedules/bulk', data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // POST /schedules/check-conflict (teacher, admin)
  checkConflict: withRoleCheck(
    (data: Omit<T.Schedule, '_id'>) => api.post<T.ConflictCheckResponse>('/schedules/check-conflict', data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // POST /schedules/merge (teacher, admin)
  merge: withRoleCheck(
    (data: { scheduleIds: string[] }) => api.post<T.Schedule[]>('/schedules/merge', data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // POST /schedules/split/:id (teacher, admin)
  split: withRoleCheck(
    (id: string, data: { splitTime: string }) => api.post<T.Schedule[]>(`/schedules/split/${id}`, data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // POST /schedules (teacher, admin)
  create: withRoleCheck(
    (data: Omit<T.Schedule, '_id'>) => api.post<T.Schedule>('/schedules', data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // GET /schedules (teacher, admin)
  getAll: withRoleCheck(
    () => api.get<T.Schedule[]>('/schedules').then(res => res.data),
    ['teacher', 'admin']
  ),

  // GET /schedules/:id (teacher, admin)
  getById: withRoleCheck(
    (id: string) => api.get<T.Schedule>(`/schedules/${id}`).then(res => res.data),
    ['teacher', 'admin']
  ),

  // PUT /schedules/:id (teacher, admin)
  update: withRoleCheck(
    (id: string, data: Partial<Omit<T.Schedule, '_id'>>) => api.put<T.Schedule>(`/schedules/${id}`, data).then(res => res.data),
    ['teacher', 'admin']
  ),

  // DELETE /schedules/:id (teacher, admin)
  delete: withRoleCheck(
    (id: string) => api.delete<{ message: string }>(`/schedules/${id}`).then(res => res.data),
    ['teacher', 'admin']
  ),
};

export const timeSlot = {
  // GET /time-slots (public)
  getAll: () => api.get<T.TimeSlot[]>('/time-slots').then(res => res.data),

  // GET /time-slots/available (auth)
  getAvailable: (query: { roomId?: string; date?: string }) => api.get<T.TimeSlot[]>('/time-slots/available', { params: query }).then(res => res.data),
  
  // POST /time-slots (admin)
  create: withRoleCheck(
    (data: Omit<T.TimeSlot, '_id'>) => api.post<T.TimeSlot>('/time-slots', data).then(res => res.data),
    ['admin']
  ),

  // POST /time-slots/initialize (admin)
  initialize: withRoleCheck(
    (data: T.TimeSlot[]) => api.post<{ message: string }>('/time-slots/initialize', data).then(res => res.data),
    ['admin']
  ),

  // PUT /time-slots/:id (admin)
  update: withRoleCheck(
    (id: string, data: Partial<T.TimeSlot>) => api.put<T.TimeSlot>(`/time-slots/${id}`, data).then(res => res.data),
    ['admin']
  ),

  // DELETE /time-slots/:id (admin)
  delete: withRoleCheck(
    (id: string) => api.delete<{ message: string }>(`/time-slots/${id}`).then(res => res.data),
    ['admin']
  ),
};

export const audit = {
  // GET /audit-logs (admin)
  getLogs: withRoleCheck(
    (query: { userId?: string; action?: string; startDate?: string; endDate?: string; status?: string } = {}) =>
      api.get<T.AuditLog[]>('/audit-logs', { params: query }).then(res => res.data),
    ['admin']
  ),
};

export default api;
