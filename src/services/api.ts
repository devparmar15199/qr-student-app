import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://192.168.136.227:5001/api'; // Change this to your backend URL

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface AttendanceSubmission {
  sessionId: string;
  classId: string;
  scheduleId: string;
  studentCoordinates: Coordinates;
  livenessPassed: boolean;
  faceEmbedding?: number[];
}

interface Class {
  _id: string;
  classNumber: string;
  subjectCode: string;
  subjectName: string;
  classYear: number;
  semester: number;
  division: string;
}

interface Schedule {
  _id: string;
  classId: string;
  sessionType: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  location: Coordinates;
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
  response => response,
  error => {
    console.error('API Error Response:', error.response?.data);
    return Promise.reject(error);
  }
);

export const auth = {
  login: (data: { enrollmentNo: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: { 
    enrollmentNo: string;
    email: string;
    password: string;
    fullName: string;
    role: 'student' | 'teacher';
  }) => api.post('/auth/register', data),
};

export const attendance = {
  submit: (data: AttendanceSubmission) =>
    api.post('/attendance', data),
  sync: (offlineAttendance: AttendanceSubmission[]) =>
    api.post('/attendance/sync', { attendances: offlineAttendance }),
  getByClass: (classId: string) =>
    api.get(`/attendance/${classId}`),
};

export const classes = {
  getAll: () => api.get<Class[]>('/classes'),
  create: (data: Omit<Class, '_id'>) =>
    api.post('/classes', data),
  enrollStudent: (data: { classId: string; studentId: string }) =>
    api.post('/classes/enroll', data),
};

export const schedule = {
  create: (data: Omit<Schedule, '_id'>) =>
    api.post('/schedule', data),
  getByClass: (classId: string) =>
    api.get<Schedule[]>(`/schedule/${classId}`),
};

export const qr = {
  generate: (data: { 
    classId: string;
    scheduleId: string;
    coordinates: Coordinates;
  }) => api.post('/qr', data),
  validate: (data: { token: string }) =>
    api.post('/qr/validate', data),
};

export default api;
