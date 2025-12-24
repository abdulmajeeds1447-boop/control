
export type UserRole = 'ADMIN' | 'TEACHER' | 'COUNSELOR';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  barcode: string;
}

export interface Student {
  id: string;
  name: string;
  nationalId: string; // Still kept for backward compatibility or as fallback
  seatNumber?: string; // رقم الجلوس
  grade: string; // الصف
  class: string; // الفصل
  stage?: string; // المرحلة
  committee?: string; // اللجنة
  parentPhone: string;
}

export interface Committee {
  id: string;
  name: string;
  location: string;
  proctorId?: string; // Teacher responsible (General fallback)
}

export interface ExamEnvelope {
  id: string;
  subject: string;
  grade: string;
  date: string;
  barcode: string;
  committeeId: string;
  status: 'STORAGE' | 'WITH_TEACHER' | 'COMPLETED';
  period?: string; // Period added to envelope
  proctorId?: string; // Specific proctor for this exam session
  proctorName?: string; // Denormalized name for easier display
}

export interface ExamScheduleItem {
  id: string;
  subject: string;
  grade: string;
  date: string;
  day: string;
  period: 'First' | 'Second' | 'Third';
  startTime: string;
}

export interface HandoverLog {
  id: string;
  timestamp: string;
  type: 'CHECK_OUT' | 'CHECK_IN'; // Teacher receiving or returning
  teacherName: string;
  envelopeSubject: string;
  committeeName: string;
}

export interface AttendanceRecord {
  examId: string; // Linking to the envelope/subject
  studentId: string;
  status: 'PRESENT' | 'ABSENT';
  timestamp: string;
}
