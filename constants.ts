import { User, Student, Committee, ExamEnvelope } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'أ. محمد الغامدي', role: 'ADMIN', barcode: 'USR-001' },
  { id: 'u2', name: 'أ. فهد العتيبي', role: 'TEACHER', barcode: 'TCH-101' },
  { id: 'u3', name: 'أ. خالد الدوسري', role: 'TEACHER', barcode: 'TCH-102' },
  { id: 'u4', name: 'أ. صالح العمري', role: 'COUNSELOR', barcode: 'CNS-201' },
];

export const MOCK_STUDENTS: Student[] = [
  { id: 's1', name: 'سلطان القحطاني', nationalId: '1001234567', grade: 'الثالث ثانوي', class: 'أ', parentPhone: '0500000001' },
  { id: 's2', name: 'فيصل المطيري', nationalId: '1001234568', grade: 'الثالث ثانوي', class: 'أ', parentPhone: '0500000002' },
  { id: 's3', name: 'عبدالله السبيعي', nationalId: '1001234569', grade: 'الثالث ثانوي', class: 'أ', parentPhone: '0500000003' },
  { id: 's4', name: 'ياسر الحربي', nationalId: '1001234570', grade: 'الثالث ثانوي', class: 'ب', parentPhone: '0500000004' },
  { id: 's5', name: 'ماجد العنزي', nationalId: '1001234571', grade: 'الثالث ثانوي', class: 'ب', parentPhone: '0500000005' },
];

export const MOCK_COMMITTEES: Committee[] = [
  { id: 'c1', name: 'لجنة (1) - قاعة المتنبي', location: 'الدور الأول' },
  { id: 'c2', name: 'لجنة (2) - قاعة الخوارزمي', location: 'الدور الثاني' },
];

export const MOCK_ENVELOPES: ExamEnvelope[] = [
  { id: 'e1', subject: 'الرياضيات', grade: 'الثالث ثانوي', date: '2023-10-20', barcode: 'ENV-MATH-101', committeeId: 'c1', status: 'STORAGE' },
  { id: 'e2', subject: 'الفيزياء', grade: 'الثالث ثانوي', date: '2023-10-22', barcode: 'ENV-PHYS-102', committeeId: 'c1', status: 'STORAGE' },
  { id: 'e3', subject: 'الرياضيات', grade: 'الثالث ثانوي', date: '2023-10-20', barcode: 'ENV-MATH-103', committeeId: 'c2', status: 'STORAGE' },
];
