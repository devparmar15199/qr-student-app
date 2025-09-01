import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { InterfaceOrientation } from 'react-native-reanimated';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AttendanceSubmission {
  sessionId: string;
  classId: string;
  scheduleId: string;
  studentCoordinates: Coordinates;
  livenessPassed: boolean;
  faceEmbedding: number[];
}

export interface ManualAttendance {
  studentId: string;
  classId: string;
  scheduleId: string;
  status?: 'present' | 'late' | 'absent';
  attendedAt?: string;
}

export interface Class {
  _id: string;
  classNumber: string;
  subjectCode: string;
  subjectName: string;
  classYear: string;
  semester: string;
  division: string;
  teacherId: string;
}

export interface Schedule {
  _id: string;
  classId: string;
  sessionType: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  semester: string;
  academicYear: string;
  location: { latitude: number; longitude: number };
}

export interface User {
  _id: string;
  fullName: string;
  enrollmentNo?: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

export interface Attendance {
  _id: string;
  studentId: User;
  sessionId?: { qrPayload: { timestamp: string } };
  classId: Class;
  scheduleId: Schedule;
  studentCoordinates?: Coordinates;
  attendedAt: string;
  livenessPassed: boolean;
  faceEmbedding: number[];
  synced: boolean;
  syncVersion: number;
  manualEntry: boolean;
  status: 'present' | 'late' | 'absent';
}

export interface AttendanceResponse {
  attendance: Attendance[];
  stats: {
    total: number;
    present: number;
    late: number;
    absent: number;
    manualEntries?: number;
  };
}

export interface AuditLog {
  _id: string;
  userId: User;
  action: string;
  details: any;
  status: 'success' | 'failed';
  createdAt: string;
}

export interface QRValidateResponse {
  valid: boolean;
  sessionId: string;
  classId: string;
  scheduleId: string;
}

export interface SyncResponse {
  success: number;
  failed: number;
  skipped: number;
  details: Array<{
    status: 'success' | 'failed' | 'skipped';
    error?: string;
    data: AttendanceSubmission
  }>;
}

export interface AuthResponse {
  token: string;
  user: User;
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const message = error.response?.data?.error || error.message || 'Unknown error';
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      await SecureStore.deleteItemAsync('role');
      throw new Error('Session expired. Please log in again.');
    }
    console.error('API Error:', message);
    throw new Error(message);
  }
);

const checkRole = async (requiredRoles: string[]): Promise<boolean> => {
  const role = await SecureStore.getItemAsync('role');
  return role ? requiredRoles.includes(role) : false;
}

export const auth = {
  login: async (data: { enrollmentNo?: string; email?: string; password: string }) => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },
  register: async (data: {  
    enrollmentNo?: string;
    email: string;
    password: string;
    fullName: string;
    role: 'student' | 'teacher' | 'admin';
    faceEmbedding?: number[];
  }) => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },
};

export const users = {
  getStudents: async () => {
    if (!(await checkRole(['teacher', 'admin']))) {
      throw new Error('Unauthorized: Teacher or admin role required');
    }
    return api.get<User[]>('/users?role=student');
  },
};

export const attendance = {
  submit: async (data: AttendanceSubmission) => {
    if (!(await checkRole(['student']))) {
      throw new Error('Unauthorized: Student role required');
    }
    return api.post<Attendance>('/attendances', data);
  },
  sync: async (offlineAttendance: AttendanceSubmission[]) => {
    if (!(await checkRole(['student']))) {
      throw new Error('Unauthorized: Student role required');
    }
    return api.post<SyncResponse>('/attendances/sync', { attendances: offlineAttendance });
  },
  getByClass: async (classId: string, query: { startDate?: string; endDate?: string; status?: string } = {}) => {
    if (!(await checkRole(['teacher', 'admin', 'student']))) {
      throw new Error('Unauthorized: Teacher, admin, or student role required');
    }
    return api.get<AttendanceResponse>(`/attendances/records/class/${classId}`, { params: query });
  },
  manual: async (data: ManualAttendance) => {
    if (!(await checkRole(['teacher', 'admin']))) {
      throw new Error('Unauthorized: Teacher or admin role required');
    }
    return api.post<Attendance>('/attendances/manual', data);
  },
  getAll: async (query: { startDate?: string; endDate?: string; status?: string } = {}) => {
    if (!(await checkRole(['teacher', 'admin']))) {
      throw new Error('Unauthorized: Teacher or admin role required');
    }
    return api.get<Attendance[]>('/attendances/records', { params: query });
  },
  getByStudent: async (studentId: string, query: { startDate?: string; endDate?: string; classId?: string } = {}) => {
    if (!(await checkRole(['teacher', 'admin']))) {
      throw new Error('Unauthorized: Teacher or admin role required');
    }
    return api.get<AttendanceResponse>(`/attendances/records/student/${studentId}`, { params: query });
  }
};

export const classes = {
  getAll: () => api.get<Class[]>('/classes'),
  create: async (data: Omit<Class, '_id'>) => {
    if (!(await checkRole(['teacher', 'admin']))) {
      throw new Error('Unauthorized: Teacher or admin role required');
    }
    return api.post<Class>('/classes', data);
  },
  enrollStudent: async (data: { classId: string; studentId: string }) => {
    if (!(await checkRole(['admin']))) {
      throw new Error('Unauthorized: Admin role required');
    }
    return api.post<{ message: string }>('/classes/enroll', data);
  },
  getEnrolled: async () => {
    if (!(await checkRole(['student']))) {
      throw new Error('Unauthorized: Student role required');
    }
    return api.get<Class[]>('/classes/enrolled');
  },
  getTeacherClasses: async () => {
    if (!(await checkRole(['teacher']))) {
      throw new Error('Unauthorized: Teacher role required');
    }
    return api.get<Class[]>('/classes/teacher');
  }
};

export const schedule = {
  create: async (data: Omit<Schedule, '_id'>) => {
    if (!(await checkRole(['teacher', 'admin']))) {
      throw new Error('Unauthorized: Teacher or admin role required');
    }
    return api.post<Schedule>('/schedules', data);
  },
  getByClass: (classId: string) => api.get<Schedule[]>(`/schedules/${classId}`),
};

export const qr = {
  generate: async (data: { classId: string; scheduleId: string; teacherId: string; coordinates: Coordinates; }) => {
    if (!(await checkRole(['teacher']))) {
      throw new Error('Unauthorized: Teacher role required');
    }
    return api.post<{ sessionId: string; token: string; expiredAt: string }>('/qr/generate', data);
  },
  validate: (data: { token: string }) =>
    api.post<{ valid: boolean; sessionId: string }>('/qr/validate', data),
};

export const audit = {
  getLogs: async (query: { userId?: string; action?: string; startDate?: string; endDate?: string; status?: string } = {}) => {
    if (!(await checkRole(['admin']))) {
      throw new Error('Unauthorized: Admin role required');
    }
    return api.get<AuditLog[]>('/audit-logs', { params: query });
  },
};

export default api;
