// Navigation Param Lists
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
};

export type TabParamList = {
  Home: undefined;
  Scan: undefined;
  Classes: undefined;
  Profile: undefined;
  AttendanceManagement: { classId: string };
  AuditLogs: undefined;
};

// API & Data Models
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface User {
  _id: string;
  fullName: string;
  email: string;
  enrollmentNo?: string;
  role: 'student' | 'teacher' | 'admin';
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

export interface AuditLog {
  _id: string;
  userId: User;
  action: string;
  details: any;
  status: 'success' | 'failed';
  createdAt: string;
}

// API Response Types
export interface AuthResponse {
  token: string;
  user: User;
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