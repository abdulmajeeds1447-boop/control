
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import BarcodeCard from './components/BarcodeCard';
import { UserRole, User, ExamEnvelope, HandoverLog, AttendanceRecord, Student, Committee, ExamScheduleItem } from './types';
import { MOCK_COMMITTEES, MOCK_USERS, MOCK_ENVELOPES, MOCK_STUDENTS } from './constants';
import { db, firebaseConfig } from './firebaseConfig';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  setDoc, 
  query, 
  orderBy,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { 
  ShieldCheck, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  QrCode, 
  Phone, 
  ArrowRightLeft,
  Printer,
  ScanLine,
  Bell,
  FileText,
  GraduationCap,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Database,
  Building,
  X,
  ExternalLink,
  Wifi,
  WifiOff,
  Calendar,
  Plus,
  Save,
  MapPin,
  UserCheck,
  Search,
  CheckSquare,
  Zap,
  Upload,
  Filter
} from 'lucide-react';

// --- INTEGRATION CONFIGURATION ---
const COLLECTION_NAMES = {
  USERS: 'users',
  STUDENTS: 'students',
  COMMITTEES: 'committees',
  ENVELOPES: 'envelopes',
  LOGS: 'handover_logs',
  ATTENDANCE: 'attendance',
  SCHEDULE: 'exam_schedule'
};

// --- HELPER: Sanitize Firestore Data ---
const sanitizeFirestoreData = (data: any): any => {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'object' && data.toDate && typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeFirestoreData);
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
         sanitized[key] = sanitizeFirestoreData(data[key]);
      }
    }
    return sanitized;
  }

  return data;
};

const App: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [connectionError, setConnectionError] = useState<{title: string, msg: string} | null>(null);
  const [isLiveConnection, setIsLiveConnection] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  // UX State
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [filterProctorId, setFilterProctorId] = useState<string>('');
  
  // Database State
  const [envelopes, setEnvelopes] = useState<ExamEnvelope[]>([]);
  const [logs, setLogs] = useState<HandoverLog[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ExamScheduleItem[]>([]);

  // Schedule Form State
  const [newScheduleItem, setNewScheduleItem] = useState<Partial<ExamScheduleItem>>({
    grade: 'الأول ثانوي',
    period: 'First',
    startTime: '07:30'
  });

  // Handover Form State
  const [scanTeacherCode, setScanTeacherCode] = useState('');
  const [scanEnvelopeCode, setScanEnvelopeCode] = useState('');
  const [handoverMessage, setHandoverMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Refs for auto-focus
  const envelopeInputRef = useRef<HTMLInputElement>(null);

  // Initial Data Fetch
  useEffect(() => {
    if (firebaseConfig.apiKey === "YOUR_WEB_API_KEY_HERE") {
        setConnectionError({
            title: "مفتاح API مفقود",
            msg: "لم يتم إعداد التطبيق للاتصال بـ Firebase بعد."
        });
        setLoading(false);
        return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setConnectionError(null);
    try {
      // 1. Fetch Users
      const usersSnapshot = await getDocs(collection(db, COLLECTION_NAMES.USERS));
      let usersData = usersSnapshot.docs.map(doc => sanitizeFirestoreData({ id: doc.id, ...doc.data() })) as User[];
      
      setIsLiveConnection(true);
      setIsDemoMode(false);
      setUsers(usersData);
      
      if (!currentUser && usersData.length > 0) {
        setCurrentUser(usersData[0]);
        setCurrentRole(usersData[0].role);
      } else if (!currentUser && usersData.length === 0) {
        const tempAdmin: User = { id: 'temp', name: 'Admin (Setup)', role: 'ADMIN', barcode: 'ADM-000' };
        setCurrentUser(tempAdmin);
      }

      // 2. Fetch Other Collections
      const [
        studentsSnap, 
        committeesSnap, 
        envelopesSnap, 
        logsSnap, 
        attendanceSnap, 
        scheduleSnap
      ] = await Promise.all([
        getDocs(collection(db, COLLECTION_NAMES.STUDENTS)),
        getDocs(collection(db, COLLECTION_NAMES.COMMITTEES)),
        getDocs(collection(db, COLLECTION_NAMES.ENVELOPES)),
        getDocs(query(collection(db, COLLECTION_NAMES.LOGS), orderBy('timestamp', 'desc'))),
        getDocs(collection(db, COLLECTION_NAMES.ATTENDANCE)),
        getDocs(query(collection(db, COLLECTION_NAMES.SCHEDULE), orderBy('date', 'asc')))
      ]);

      // Apply sanitization to all fetched data
      setStudents(studentsSnap.docs.map(doc => sanitizeFirestoreData({ id: doc.id, ...doc.data() })) as Student[]);
      setCommittees(committeesSnap.docs.map(doc => sanitizeFirestoreData({ id: doc.id, ...doc.data() })) as Committee[]);
      setEnvelopes(envelopesSnap.docs.map(doc => sanitizeFirestoreData({ id: doc.id, ...doc.data() })) as ExamEnvelope[]);
      setLogs(logsSnap.docs.map(doc => sanitizeFirestoreData({ id: doc.id, ...doc.data() })) as HandoverLog[]);
      setAttendance(attendanceSnap.docs.map(doc => sanitizeFirestoreData({ id: doc.id, ...doc.data() })) as AttendanceRecord[]);
      setScheduleItems(scheduleSnap.docs.map(doc => sanitizeFirestoreData({ id: doc.id, ...doc.data() })) as ExamScheduleItem[]);

    } catch (error: any) {
      console.error('Error fetching data:', error.message || String(error));
      setIsLiveConnection(false);
      setConnectionError({ 
          title: "فشل الاتصال بقاعدة البيانات", 
          msg: error.message || "تأكد من إعدادات Firebase" 
      });
    } finally {
      setLoading(false);
    }
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    setConnectionError(null);
    setLoading(true);

    setUsers(MOCK_USERS);
    setStudents(MOCK_STUDENTS);
    setCommittees(MOCK_COMMITTEES);
    setEnvelopes(MOCK_ENVELOPES);
    setLogs([]); 
    setAttendance([]);
    setScheduleItems([]); // No mock schedule initially

    if (MOCK_USERS.length > 0) {
        setCurrentUser(MOCK_USERS[0]);
        setCurrentRole(MOCK_USERS[0].role);
    }
    setTimeout(() => setLoading(false), 500);
  };

  // --- Logic Functions ---

  const switchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setCurrentRole(user.role);
      setActivePage('dashboard');
    }
  };

  const handleHandover = async (action: 'CHECK_OUT' | 'CHECK_IN') => {
    setHandoverMessage(null);
    const teacher = users.find(u => u.barcode === scanTeacherCode && (u.role === 'TEACHER' || u.role === 'ADMIN'));
    if (!teacher) { setHandoverMessage({ type: 'error', text: 'باركود المعلم غير صحيح' }); return; }

    const envelope = envelopes.find(e => e.barcode === scanEnvelopeCode);
    if (!envelope) { setHandoverMessage({ type: 'error', text: 'باركود المظروف غير صحيح' }); return; }

    const committee = committees.find(c => c.id === envelope.committeeId);

    if (action === 'CHECK_OUT' && envelope.status !== 'STORAGE') {
        setHandoverMessage({ type: 'error', text: 'المظروف تم تسليمه مسبقاً!' }); return;
    }
    if (action === 'CHECK_IN' && envelope.status !== 'WITH_TEACHER') {
        setHandoverMessage({ type: 'error', text: 'المظروف موجود في المخزن بالفعل' }); return;
    }

    const newStatus = action === 'CHECK_OUT' ? 'WITH_TEACHER' : 'COMPLETED';
    const newLog = {
        id: isDemoMode ? `log-${Date.now()}` : '',
        timestamp: new Date().toISOString(),
        type: action,
        teacherName: teacher.name,
        envelopeSubject: envelope.subject,
        committeeName: committee?.name || 'غير معروف'
    };

    const updateLocalState = () => {
      setEnvelopes(envelopes.map(e => e.id === envelope.id ? { ...e, status: newStatus } : e));
      setLogs([{ id: isDemoMode ? `log-${Date.now()}` : 'temp-id', ...newLog, timestamp: new Date().toLocaleString('ar-SA') }, ...logs]);
      setHandoverMessage({ type: 'success', text: action === 'CHECK_OUT' ? `تم التسليم: ${envelope.subject}` : `تم الاستلام: ${envelope.subject}` });
      setScanTeacherCode(''); setScanEnvelopeCode('');
      
      // AUTO-REDIRECT: If checking out, go to attendance
      if (action === 'CHECK_OUT') {
        setTimeout(() => {
          setSelectedExamId(envelope.id);
          setActivePage('attendance');
          // Removed Alert to make UX smoother
        }, 1000);
      }
    };

    if (isDemoMode) {
        updateLocalState();
        return;
    }
    
    try {
        const envRef = doc(db, COLLECTION_NAMES.ENVELOPES, envelope.id);
        await updateDoc(envRef, { status: newStatus });
        const logRef = await addDoc(collection(db, COLLECTION_NAMES.LOGS), newLog);
        
        updateLocalState();
    } catch (error: any) {
        console.error(error.message);
        setHandoverMessage({ type: 'error', text: 'خطأ في الاتصال بقاعدة البيانات' });
    }
  };

  const toggleAttendance = async (studentId: string, examId: string, isPresent: boolean) => {
    const status = isPresent ? 'PRESENT' : 'ABSENT';
    const timestamp = new Date().toISOString();
    
    setAttendance(prev => [...prev.filter(a => !(a.studentId === studentId && a.examId === examId)), { studentId, examId, status, timestamp }]);
    
    if (isDemoMode) return;
    try {
        await setDoc(doc(db, COLLECTION_NAMES.ATTENDANCE, `${studentId}_${examId}`), { studentId, examId, status, timestamp });
    } catch (error) { console.error(error); }
  };

  const markAllPresent = async (examId: string, studentsList: Student[]) => {
    if (!window.confirm("هل أنت متأكد من تحضير جميع الطلاب المتبقين في القائمة؟")) return;

    const timestamp = new Date().toISOString();
    const newRecords: AttendanceRecord[] = [];
    const batch = writeBatch(db);

    studentsList.forEach(student => {
        // Check if already has a record
        const exists = attendance.some(a => a.studentId === student.id && a.examId === examId);
        if (!exists) {
            const record = { studentId: student.id, examId, status: 'PRESENT' as const, timestamp };
            newRecords.push(record);
            
            if (!isDemoMode) {
                const ref = doc(db, COLLECTION_NAMES.ATTENDANCE, `${student.id}_${examId}`);
                batch.set(ref, record);
            }
        }
    });

    setAttendance(prev => [...prev, ...newRecords]);

    if (!isDemoMode && newRecords.length > 0) {
        try {
            await batch.commit();
        } catch(e) { console.error(e); }
    }
  };

  const handleStudentImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemoMode) { alert("الاستيراد غير متاح"); return; }
    
    const fileInput = e.target;
    const file = fileInput.files?.[0];
    
    if (!file) return;

    try {
      setLoading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      // 1. Identify Distinct Committees from Excel
      const distinctCommittees = new Set<string>();
      
      const imported = jsonData.map((row: any) => {
        // Normalize Committee Name
        const commName = row['اللجنة'] || row['Committee'] || null;
        if (commName) distinctCommittees.add(String(commName).trim());

        return {
          name: row['اسم الطالب'] || row['Name'] || 'غير محدد',
          seatNumber: row['رقم الجلوس'] ? String(row['رقم الجلوس']) : null,
          committee: commName,
          stage: row['المرحلة'] || null,
          grade: row['الصف'] || row['Grade'] || 'عام',
          class: row['الفصل'] || row['Class'] || 'عام',
          nationalId: row['رقم الهوية'] || String(Math.floor(Math.random() * 1000000000)),
          parentPhone: row['جوال ولي الأمر'] || ''
        };
      });

      if (imported.length > 0) {
        const batch = writeBatch(db);
        let createdCommitteesCount = 0;

        // 2. Create Missing Committees
        const existingCommitteeNames = new Set(committees.map(c => c.name));
        
        distinctCommittees.forEach(commName => {
            if (!existingCommitteeNames.has(commName)) {
                const newCommRef = doc(collection(db, COLLECTION_NAMES.COMMITTEES));
                batch.set(newCommRef, {
                    name: commName,
                    location: 'موقع غير محدد (تلقائي)',
                    id: newCommRef.id
                });
                createdCommitteesCount++;
            }
        });

        // 3. Add Students
        imported.forEach((st) => {
            const ref = doc(collection(db, COLLECTION_NAMES.STUDENTS));
            batch.set(ref, { ...st, id: ref.id });
        });

        await batch.commit();
        
        let successMsg = `تم رفع ${imported.length} طالب بنجاح.`;
        if (createdCommitteesCount > 0) {
            successMsg += ` تم إنشاء ${createdCommitteesCount} لجنة جديدة تلقائياً بناءً على البيانات.`;
        }
        
        alert(successMsg);
        fetchData();
      }
    } catch (error: any) {
      console.error('Import Error:', error.message || String(error));
      alert('حدث خطأ أثناء الاستيراد. تأكد من صحة الملف.');
    } finally {
      setLoading(false);
      if(fileInput) fileInput.value = '';
    }
  };

  const handleProctorImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemoMode) { alert("الاستيراد غير متاح في وضع التجربة"); return; }
    
    const fileInput = e.target;
    const file = fileInput.files?.[0];
    if (!file) return;

    if(!confirm("سيتم استيراد توزيع الملاحظين وتحديث البيانات الحالية. يجب أن يحتوي ملف الإكسل على الأعمدة: 'اسم المراقب'، 'اللجنة'، 'المادة'، 'التاريخ'. هل تريد المتابعة؟")) {
        fileInput.value = '';
        return;
    }

    try {
        setLoading(true);
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        let updatedCount = 0;
        let notFoundCount = 0;
        const batch = writeBatch(db);
        const tempEnvelopes = [...envelopes];

        jsonData.forEach((row: any) => {
            // Extract and clean data
            const teacherName = (row['اسم المراقب'] || row['المراقب'] || row['Teacher'])?.toString().trim();
            const commName = (row['اللجنة'] || row['Committee'])?.toString().trim();
            const subject = (row['المادة'] || row['Subject'])?.toString().trim();
            // Handle Excel dates (which might be integers or strings)
            let dateVal = row['التاريخ'] || row['Date'];
            
            // Basic date parsing logic for Excel serial date or string
            if (typeof dateVal === 'number') {
                 const dateObj = new Date(Math.round((dateVal - 25569)*86400*1000));
                 dateVal = dateObj.toISOString().split('T')[0];
            } else if (dateVal) {
                 dateVal = dateVal.toString().trim();
            }

            if (teacherName && commName && subject && dateVal) {
                // 1. Find the User (Proctor)
                const proctor = users.find(u => u.name.trim() === teacherName);
                // 2. Find the Committee
                const committee = committees.find(c => c.name.trim() === commName);

                if (proctor && committee) {
                    // 3. Find the exact exam envelope
                    const envIndex = tempEnvelopes.findIndex(e => 
                        e.committeeId === committee.id && 
                        e.subject.trim() === subject && 
                        e.date === dateVal
                    );

                    if (envIndex !== -1) {
                        const env = tempEnvelopes[envIndex];
                        // Update in local array
                        tempEnvelopes[envIndex] = { 
                            ...env, 
                            proctorId: proctor.id, 
                            proctorName: proctor.name 
                        };

                        // Add to batch
                        const ref = doc(db, COLLECTION_NAMES.ENVELOPES, env.id);
                        batch.update(ref, { 
                            proctorId: proctor.id, 
                            proctorName: proctor.name 
                        });
                        updatedCount++;
                    } else {
                        notFoundCount++;
                    }
                } else {
                    notFoundCount++;
                }
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
            setEnvelopes(tempEnvelopes);
            alert(`تم تعيين ${updatedCount} مراقب بنجاح!`);
            if (notFoundCount > 0) alert(`ملاحظة: لم يتم العثور على ${notFoundCount} صفوف (قد تكون البيانات غير مطابقة أو المظاريف غير مولدة).`);
        } else {
            alert("لم يتم تحديث أي بيانات. تأكد من مطابقة الأسماء والتواريخ والمواد.");
        }

    } catch (error: any) {
        console.error("Proctor Import Error:", error);
        alert("خطأ في قراءة الملف: " + error.message);
    } finally {
        setLoading(false);
        fileInput.value = '';
    }
  };

  const deleteStudent = async (id: string) => {
    if(window.confirm('حذف الطالب؟')) {
      if (isDemoMode) { setStudents(students.filter(s => s.id !== id)); return; }
      try {
          await deleteDoc(doc(db, COLLECTION_NAMES.STUDENTS, id));
          setStudents(students.filter(s => s.id !== id));
      } catch (error) { alert('خطأ في الحذف'); }
    }
  };

  const deleteAllStudents = async () => {
    const confirmMsg = `تحذير هام!\n\nسيتم حذف جميع الطلاب (${students.length} طالب) من قاعدة البيانات نهائياً.\nهل أنت متأكد تماماً من رغبتك في الحذف؟`;
    if (!window.confirm(confirmMsg)) return;
    
    // Double confirmation
    const doubleCheck = prompt("للتأكيد، اكتب كلمة 'حذف' في المربع أدناه:");
    if (doubleCheck !== 'حذف') {
        alert("إلغاء العملية.");
        return;
    }

    if (isDemoMode) {
      setStudents([]);
      alert("تم حذف جميع الطلاب (وضع التجربة).");
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch fresh Snapshot to ensure we target existing docs
      const snapshot = await getDocs(collection(db, COLLECTION_NAMES.STUDENTS));
      
      if (snapshot.empty) {
        setStudents([]);
        alert("قاعدة البيانات فارغة بالفعل.");
        setLoading(false);
        return;
      }

      const allDocs = snapshot.docs;
      const total = allDocs.length;
      
      // 2. Batch Delete
      const chunkSize = 400; // Safe batch size limit
      let deletedCount = 0;

      for (let i = 0; i < total; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = allDocs.slice(i, i + chunkSize);
        
        chunk.forEach(docSnap => {
          batch.delete(docSnap.ref); // Using ref directly is safer
        });

        await batch.commit();
        deletedCount += chunk.length;
        console.log(`Deleted batch ${Math.ceil((i+1)/chunkSize)}: ${chunk.length} docs`);
      }
      
      setStudents([]);
      alert(`تم حذف ${deletedCount} طالب من قاعدة البيانات بنجاح.`);

    } catch (error: any) {
      console.error("Delete Error:", error);
      alert("حدث خطأ أثناء الحذف: " + (error.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  // --- Schedule Logic ---

  const addScheduleItem = async () => {
    if (!newScheduleItem.subject || !newScheduleItem.date || !newScheduleItem.grade) {
      alert("الرجاء تعبئة البيانات الأساسية (المادة، التاريخ، الصف)");
      return;
    }

    const item: ExamScheduleItem = {
      id: isDemoMode ? `sch-${Date.now()}` : '', // placeholder
      subject: newScheduleItem.subject,
      grade: newScheduleItem.grade,
      date: newScheduleItem.date,
      day: new Date(newScheduleItem.date).toLocaleDateString('ar-SA', { weekday: 'long' }),
      period: newScheduleItem.period as any || 'First',
      startTime: newScheduleItem.startTime || '07:30'
    };

    if (isDemoMode) {
      setScheduleItems([...scheduleItems, { ...item, id: `sch-${Date.now()}` }]);
      setNewScheduleItem({ ...newScheduleItem, subject: '' }); // clear subject only
      return;
    }

    try {
      const ref = await addDoc(collection(db, COLLECTION_NAMES.SCHEDULE), item);
      setScheduleItems([...scheduleItems, { ...item, id: ref.id }]);
      setNewScheduleItem({ ...newScheduleItem, subject: '' }); 
    } catch (error: any) {
      console.error(error.message);
      alert('خطأ أثناء حفظ الجدول');
    }
  };

  const deleteScheduleItem = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاختبار من الجدول؟")) return;
    if (isDemoMode) {
      setScheduleItems(scheduleItems.filter(i => i.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, COLLECTION_NAMES.SCHEDULE, id));
      setScheduleItems(scheduleItems.filter(i => i.id !== id));
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const generateEnvelopesFromSchedule = async () => {
    if (scheduleItems.length === 0) {
      alert("لا يوجد جدول اختبارات لتوليد المظاريف منه.");
      return;
    }
    if (committees.length === 0) {
      alert("يجب إضافة لجان (Committees) أولاً لتوزيع المظاريف عليها.");
      return;
    }

    if (!confirm(`سيتم توليد مظاريف لجميع المواد في الجدول وتوزيعها على ${committees.length} لجنة. هل تريد المتابعة؟`)) return;

    setLoading(true);
    let newEnvelopesCount = 0;
    
    try {
      const batch = writeBatch(db);
      const newLocalEnvelopes: ExamEnvelope[] = [];

      for (const item of scheduleItems) {
        for (const committee of committees) {
          const exists = envelopes.some(e => 
            e.subject === item.subject && 
            e.grade === item.grade && 
            e.committeeId === committee.id && 
            e.date === item.date
          ) || newLocalEnvelopes.some(e => 
             e.subject === item.subject && 
             e.committeeId === committee.id
          );

          if (!exists) {
             const randomSuffix = Math.floor(1000 + Math.random() * 9000);
             const barcode = `ENV-${item.date.replaceAll('-','')}-${randomSuffix}`;
             
             const newEnv: any = {
                subject: item.subject,
                grade: item.grade,
                date: item.date,
                committeeId: committee.id,
                status: 'STORAGE',
                period: item.period,
                barcode: barcode
             };

             if (isDemoMode) {
                newLocalEnvelopes.push({ ...newEnv, id: `env-${Date.now()}-${randomSuffix}` });
             } else {
                const ref = doc(collection(db, COLLECTION_NAMES.ENVELOPES));
                batch.set(ref, { ...newEnv, id: ref.id });
             }
             newEnvelopesCount++;
          }
        }
      }

      if (isDemoMode) {
        setEnvelopes([...envelopes, ...newLocalEnvelopes]);
        alert(`(تجربة) تم توليد ${newEnvelopesCount} مظروف بنجاح!`);
      } else {
        if (newEnvelopesCount > 0) {
           await batch.commit();
           alert(`تم توليد ${newEnvelopesCount} مظروف في قاعدة البيانات بنجاح!`);
           const envSnap = await getDocs(collection(db, COLLECTION_NAMES.ENVELOPES));
           setEnvelopes(envSnap.docs.map(doc => sanitizeFirestoreData({ id: doc.id, ...doc.data() })) as ExamEnvelope[]);
        } else {
           alert("لم يتم إضافة مظاريف جديدة (قد تكون موجودة مسبقاً).");
        }
      }

    } catch (error: any) {
      console.error(error.message);
      alert("حدث خطأ أثناء توليد المظاريف.");
    } finally {
      setLoading(false);
    }
  };

  // --- Proctor Assignment Logic ---
  const assignProctor = async (envelopeId: string, proctorId: string) => {
    const proctor = users.find(u => u.id === proctorId);
    const proctorName = proctor ? proctor.name : '';
    
    // Update local state
    setEnvelopes(prev => prev.map(env => 
      env.id === envelopeId ? { ...env, proctorId, proctorName } : env
    ));

    if (isDemoMode) return;

    try {
      const envRef = doc(db, COLLECTION_NAMES.ENVELOPES, envelopeId);
      await updateDoc(envRef, { proctorId, proctorName });
    } catch (error) {
      console.error("Error assigning proctor:", error);
      alert("حدث خطأ أثناء تعيين المراقب");
    }
  };

  // --- Views ---

  const renderDashboard = () => {
    const absentCount = attendance.filter(a => a.status === 'ABSENT').length;
    const activeEnvelopes = envelopes.filter(e => e.status === 'WITH_TEACHER').length;
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">لوحة المعلومات</h2>
        
        {/* Quick Actions for UX Improvement */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4">
             <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
                <Zap size={16} className="text-yellow-500"/>
                إجراءات سريعة
             </h3>
             <div className="flex flex-wrap gap-3">
                 <button onClick={() => setActivePage('handover')} className="bg-slate-50 border hover:bg-slate-100 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                    <ScanLine size={16}/> استلام/تسليم مظروف
                 </button>
                 <button onClick={() => setActivePage('attendance')} className="bg-slate-50 border hover:bg-slate-100 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                    <CheckSquare size={16}/> رصد الغياب
                 </button>
                 <button onClick={() => setActivePage('alerts')} className="bg-slate-50 border hover:bg-slate-100 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                    <Bell size={16}/> التنبيهات ({absentCount})
                 </button>
                 {currentUser?.role === 'ADMIN' && (
                     <button onClick={() => setActivePage('schedule')} className="bg-slate-50 border hover:bg-slate-100 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                        <Plus size={16}/> إضافة اختبار
                     </button>
                 )}
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 space-x-reverse cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActivePage('committees')}>
            <div className="p-4 bg-blue-100 text-blue-600 rounded-full"><ShieldCheck size={32} /></div>
            <div><p className="text-gray-500 text-sm">اللجان النشطة</p><h3 className="text-2xl font-bold">{committees.length}</h3></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 space-x-reverse cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActivePage('handover')}>
            <div className="p-4 bg-orange-100 text-orange-600 rounded-full"><ArrowRightLeft size={32} /></div>
            <div><p className="text-gray-500 text-sm">مظاريف قيد الاختبار</p><h3 className="text-2xl font-bold">{activeEnvelopes}</h3></div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 space-x-reverse cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActivePage('alerts')}>
            <div className="p-4 bg-red-100 text-red-600 rounded-full"><AlertTriangle size={32} /></div>
            <div><p className="text-gray-500 text-sm">حالات الغياب اليوم</p><h3 className="text-2xl font-bold">{absentCount}</h3></div>
          </div>
        </div>

        {/* Quick Log View */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">آخر حركات النظام</h3>
            <button onClick={() => fetchData()} className="text-gray-400 hover:text-emerald-600"><RefreshCw size={16}/></button>
          </div>
          <div className="p-0">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">لا توجد حركات مسجلة اليوم</div>
            ) : (
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 font-medium">الوقت</th>
                    <th className="p-3 font-medium">الحركة</th>
                    <th className="p-3 font-medium">المعلم</th>
                    <th className="p-3 font-medium">المادة</th>
                    <th className="p-3 font-medium">اللجنة</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 5).map(log => (
                    <tr key={log.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="p-3 text-gray-500" dir="ltr">{new Date(log.timestamp).toLocaleTimeString('ar-SA')}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${log.type === 'CHECK_OUT' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {log.type === 'CHECK_OUT' ? 'تسليم لجنة' : 'استلام من لجنة'}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{log?.teacherName}</td>
                      <td className="p-3">{log.envelopeSubject}</td>
                      <td className="p-3 text-gray-500">{log.committeeName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSchedule = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">جدول الاختبارات</h2>
        <button 
          onClick={generateEnvelopesFromSchedule}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 shadow-sm"
        >
          <QrCode size={18} />
          توليد باركود المظاريف
        </button>
      </div>

      {/* Input Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Plus size={18} className="text-emerald-500"/> إضافة اختبار جديد
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">المادة الدراسية</label>
            <input 
              type="text" 
              className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
              placeholder="مثال: رياضيات"
              value={newScheduleItem.subject || ''}
              onChange={(e) => setNewScheduleItem({...newScheduleItem, subject: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">الصف/المرحلة</label>
            <select 
              className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
              value={newScheduleItem.grade}
              onChange={(e) => setNewScheduleItem({...newScheduleItem, grade: e.target.value})}
            >
              <option value="الأول ثانوي">الأول ثانوي</option>
              <option value="الثاني ثانوي">الثاني ثانوي</option>
              <option value="الثالث ثانوي">الثالث ثانوي</option>
              <option value="الأول متوسط">الأول متوسط</option>
              <option value="الثاني متوسط">الثاني متوسط</option>
              <option value="الثالث متوسط">الثالث متوسط</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">التاريخ</label>
            <input 
              type="date" 
              className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
              value={newScheduleItem.date || ''}
              onChange={(e) => setNewScheduleItem({...newScheduleItem, date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">الفترة</label>
            <select 
              className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
              value={newScheduleItem.period}
              onChange={(e) => setNewScheduleItem({...newScheduleItem, period: e.target.value as any})}
            >
              <option value="First">الفترة الأولى</option>
              <option value="Second">الفترة الثانية</option>
            </select>
          </div>
          <button 
            onClick={addScheduleItem}
            className="bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex justify-center items-center gap-2"
          >
             <Save size={18} /> حفظ
          </button>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3 font-medium">التاريخ</th>
              <th className="p-3 font-medium">اليوم</th>
              <th className="p-3 font-medium">المادة</th>
              <th className="p-3 font-medium">الصف</th>
              <th className="p-3 font-medium">الفترة</th>
              <th className="p-3 font-medium text-center">حذف</th>
            </tr>
          </thead>
          <tbody>
            {scheduleItems.length === 0 ? (
               <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا يوجد جدول اختبارات مسجل. ابدأ بإضافة المواد.</td></tr>
            ) : (
               scheduleItems.map(item => (
                 <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="p-3 text-gray-600 font-mono" dir="ltr">{item.date}</td>
                    <td className="p-3">{item.day}</td>
                    <td className="p-3 font-bold text-gray-800">{item.subject}</td>
                    <td className="p-3">{item.grade}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${item.period === 'First' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {item.period === 'First' ? 'الأولى' : 'الثانية'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => deleteScheduleItem(item.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </td>
                 </tr>
               ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReports = () => (
     <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">التقارير والسجلات</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="text-blue-500" /> سجل حركة المظاريف</h3>
              <div className="overflow-y-auto max-h-96">
                <table className="w-full text-sm">
                   <thead className="bg-slate-50 text-slate-500 sticky top-0">
                      <tr><th className="p-2 text-right">الوقت</th><th className="p-2 text-right">الحركة</th><th className="p-2 text-right">المعلم</th><th className="p-2 text-right">المادة</th></tr>
                   </thead>
                   <tbody>
                      {logs.map(log => (
                         <tr key={log.id} className="border-b">
                            <td className="p-2 text-xs" dir="ltr">{new Date(log.timestamp).toLocaleTimeString('ar-SA')}</td>
                            <td className="p-2">{log.type === 'CHECK_OUT' ? 'تسليم' : 'استلام'}</td>
                            <td className="p-2 font-bold">{log?.teacherName}</td>
                            <td className="p-2">{log.envelopeSubject}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
              </div>
           </div>
           
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Users className="text-red-500" /> تقرير الغياب اليومي</h3>
               <div className="overflow-y-auto max-h-96">
                <table className="w-full text-sm">
                   <thead className="bg-slate-50 text-slate-500 sticky top-0">
                      <tr><th className="p-2 text-right">الطالب</th><th className="p-2 text-right">المادة</th><th className="p-2 text-right">الحالة</th></tr>
                   </thead>
                   <tbody>
                      {attendance.filter(a => a.status === 'ABSENT').map(att => {
                         const st = students.find(s => s.id === att.studentId);
                         const ex = envelopes.find(e => e.id === att.examId);
                         return (
                            <tr key={`${att.studentId}-${att.examId}`} className="border-b">
                               <td className="p-2 font-bold">{st?.name}</td>
                               <td className="p-2">{ex?.subject}</td>
                               <td className="p-2 text-red-600 font-bold text-xs">غائب</td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
              </div>
           </div>
        </div>
     </div>
  );
  
  // --- COMMITTEES View (Updated) ---
  const renderCommittees = () => {
     // Filter Logic
     const filteredCommittees = committees.filter(committee => {
       if (!filterProctorId) return true;
       // Return committees where at least one exam is assigned to the selected proctor
       return envelopes.some(e => e.committeeId === committee.id && e.proctorId === filterProctorId);
     });

     return (
     <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
           <h2 className="text-2xl font-bold text-gray-800">إدارة اللجان والمراقبين</h2>
           <div className="flex flex-wrap items-center gap-2">
             {/* Filter Dropdown */}
             <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2 py-2 shadow-sm">
                <Filter size={16} className="text-gray-400" />
                <select
                    className="bg-transparent text-sm outline-none w-40 text-gray-700"
                    value={filterProctorId}
                    onChange={(e) => setFilterProctorId(e.target.value)}
                >
                    <option value="">جميع المراقبين</option>
                    {users.filter(u => u.role === 'TEACHER' || u.role === 'ADMIN').map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
             </div>

             <div className="relative">
                <input type="file" accept=".xlsx, .xls" onChange={handleProctorImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm text-sm font-bold">
                    <Upload size={16} /> استيراد توزيع
                </button>
             </div>
             <button onClick={() => window.print()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 shadow-sm text-sm font-bold"><Printer size={16} /> طباعة</button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
           {filteredCommittees.map(committee => {
             const studentCount = students.filter(s => s.committee === committee.name).length;
             // Filter envelopes for this committee and sort by date
             const committeeExams = envelopes
                .filter(e => e.committeeId === committee.id)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

             return (
               <div key={committee.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col space-y-4 break-inside-avoid">
                  <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <Building size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">{committee.name}</h3>
                            <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                            <MapPin size={14} />
                            <span>{committee.location}</span>
                            </div>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500 block">عدد الطلاب</span>
                        <span className="font-bold bg-gray-100 px-2 py-1 rounded block text-center mt-1">{studentCount}</span>
                      </div>
                  </div>
                  
                  {/* Exams & Proctors List */}
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <UserCheck size={16} className="text-blue-500" />
                        جدول الاختبارات والمراقبين
                    </h4>
                    {committeeExams.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2 bg-slate-50 rounded">لا توجد اختبارات مسجلة لهذه اللجنة</p>
                    ) : (
                        <div className="space-y-3">
                            {committeeExams.map(env => (
                                <div key={env.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{env.subject}</span>
                                        <span className="text-xs bg-white border px-2 py-0.5 rounded text-gray-500 font-mono">{env.date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-500 whitespace-nowrap">المراقب:</label>
                                        <select 
                                            className="flex-1 text-xs border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400 bg-white"
                                            value={env.proctorId || ''}
                                            onChange={(e) => assignProctor(env.id, e.target.value)}
                                        >
                                            <option value="">-- اختر مراقب --</option>
                                            {users.filter(u => u.role === 'TEACHER' || u.role === 'ADMIN').map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
                  
                  {/* Barcode (Smaller) */}
                  <div className="pt-2 flex justify-center opacity-70 hover:opacity-100 transition-opacity">
                      <div className="text-[10px] text-center w-full">
                        <div className="font-mono text-gray-300 text-xs mb-1">{`COM-${committee.id.substring(0,6)}`}</div>
                      </div>
                  </div>
               </div>
             );
           })}
           {filteredCommittees.length === 0 && (
             <div className="col-span-full py-12 text-center text-gray-400">
               {filterProctorId ? 'لا توجد لجان مسندة لهذا المراقب.' : 'لا توجد لجان مضافة حالياً. قم باستيراد الطلاب لتوليد اللجان تلقائياً.'}
             </div>
           )}
        </div>
     </div>
  );
  };

  const renderSetup = () => (
     <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">إعدادات النظام</h2>
        <div className="grid grid-cols-1 gap-8">
           <section>
              <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">بطاقات المعلمين</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {users.filter(u => u.role === 'TEACHER').map(teacher => (
                    <BarcodeCard key={teacher.id} title={teacher?.name || 'مستخدم غير معروف'} subtitle="عضو لجنة اختبارات" code={teacher.barcode} type="TEACHER" />
                 ))}
              </div>
           </section>

           <section>
              <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">ملصقات مظاريف الاختبارات</h3>
              <p className="text-sm text-gray-500 mb-4">يتم توليد هذه القائمة تلقائياً من جدول الاختبارات.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {envelopes.map(env => (
                    <BarcodeCard key={env.id} title={`${env.subject} - ${env.grade}`} subtitle={committees.find(c => c.id === env.committeeId)?.name} code={env.barcode} type="ENVELOPE" />
                 ))}
              </div>
           </section>
        </div>
     </div>
  );

  const renderStudents = () => {
    // Sort students by Committee Name first, then by Name
    const sortedStudents = [...students].sort((a, b) => {
      const commA = a.committee || '';
      const commB = b.committee || '';
      if (commA !== commB) return commA.localeCompare(commB, 'ar');
      return a.name.localeCompare(b.name, 'ar');
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">بيانات الطلاب</h2>
          <div className="flex gap-2">
            {/* Delete All Button */}
            <button 
              onClick={deleteAllStudents}
              className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-100 hover:border-red-300 transition-colors disabled:opacity-50"
            >
              <Trash2 size={18} />
              حذف جميع البيانات
            </button>
            
            <div className="relative">
              <input type="file" accept=".xlsx, .xls" onChange={handleStudentImport} disabled={isDemoMode} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
              <button disabled={isDemoMode} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 disabled:bg-gray-400"><FileSpreadsheet size={18} /> استيراد ملف إكسل</button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3 font-medium">الاسم</th>
                <th className="p-3 font-medium">اللجنة</th>
                <th className="p-3 font-medium">الصف</th>
                <th className="p-3 font-medium">رقم الجلوس</th>
                <th className="p-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map(student => (
                <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-3 font-bold text-gray-700">{student?.name}</td>
                  <td className="p-3 text-blue-600 font-semibold">{student.committee || '-'}</td>
                  <td className="p-3">{student.grade}</td>
                  <td className="p-3 font-mono text-gray-500">{student.seatNumber || '-'}</td>
                  <td className="p-3"><button onClick={() => deleteStudent(student.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button></td>
                </tr>
              ))}
              {sortedStudents.length === 0 && (
                <tr>
                   <td colSpan={5} className="p-8 text-center text-gray-400">لا توجد بيانات طلاب. قم باستيراد ملف إكسل.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderHandover = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-bold text-gray-800">نقطة الفحص والاستلام</h2>
        <p className="text-gray-500">امسح الباركود لتسجيل حركة المظاريف</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Scanning Area */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 space-y-6">
            <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                <ScanLine size={20} /> منطقة المسح
            </h3>

            {handoverMessage && (
            <div className={`p-4 rounded-lg flex items-center gap-3 animate-pulse ${handoverMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {handoverMessage.type === 'success' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                <span className="font-bold">{handoverMessage.text}</span>
            </div>
            )}

            <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">1. باركود المعلم</label>
                <div className="flex items-center gap-2 border-2 border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all bg-slate-50">
                    <Users className="text-gray-400" />
                    <input 
                        type="text" 
                        value={scanTeacherCode} 
                        onChange={(e) => {
                             setScanTeacherCode(e.target.value);
                             if (e.target.value.length > 3) {
                                 // Simple logic to auto focus next input if needed, 
                                 // though barcode scanners usually send Enter
                             }
                        }} 
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && scanTeacherCode) {
                                envelopeInputRef.current?.focus();
                            }
                        }}
                        placeholder="امسح هوية المعلم..." 
                        className="flex-1 outline-none text-lg font-mono placeholder:text-gray-300 bg-transparent" 
                        autoFocus 
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">2. باركود المظروف</label>
                <div className="flex items-center gap-2 border-2 border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all bg-slate-50">
                    <QrCode className="text-gray-400" />
                    <input 
                        ref={envelopeInputRef}
                        type="text" 
                        value={scanEnvelopeCode} 
                        onChange={(e) => setScanEnvelopeCode(e.target.value)} 
                        placeholder="امسح كود المظروف..." 
                        className="flex-1 outline-none text-lg font-mono placeholder:text-gray-300 bg-transparent" 
                    />
                </div>
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
            <button onClick={() => handleHandover('CHECK_OUT')} disabled={!scanTeacherCode || !scanEnvelopeCode} className="flex flex-col items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-xl hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md">
                <ScanLine size={24} /><span className="font-bold">تسليم للجنة</span>
            </button>
            <button onClick={() => handleHandover('CHECK_IN')} disabled={!scanTeacherCode || !scanEnvelopeCode} className="flex flex-col items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md">
                <CheckCircle size={24} /><span className="font-bold">استلام من لجنة</span>
            </button>
            </div>
        </div>

        {/* Live History Area */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 h-full max-h-[500px] flex flex-col">
             <h3 className="font-bold text-gray-700 border-b pb-2 mb-4 flex items-center gap-2">
                <RefreshCw size={20} /> آخر العمليات المسجلة
            </h3>
            <div className="flex-1 overflow-auto">
                {logs.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">لا توجد عمليات اليوم</div>
                ) : (
                    <div className="space-y-3">
                        {logs.slice(0, 8).map(log => (
                            <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                                <div>
                                    <div className="font-bold text-gray-800">{log.envelopeSubject}</div>
                                    <div className="text-xs text-gray-500">{log.teacherName}</div>
                                </div>
                                <div className="text-left">
                                    <span className={`px-2 py-1 rounded text-xs block mb-1 ${log.type === 'CHECK_OUT' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                        {log.type === 'CHECK_OUT' ? 'تسليم' : 'استلام'}
                                    </span>
                                    <div className="text-xs text-gray-400 font-mono" dir="ltr">{new Date(log.timestamp).toLocaleTimeString('ar-SA')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => {
    const targetEnvelope = envelopes.find(e => e.id === selectedExamId) || envelopes[0];
    
    // Apply Search Filter
    const targetStudents = targetEnvelope 
        ? students.filter(s => 
            s.grade === targetEnvelope.grade && 
            s.name.includes(studentSearchTerm)
          ) 
        : [];
        
    const originalCount = targetEnvelope ? students.filter(s => s.grade === targetEnvelope.grade).length : 0;

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">رصد الغياب</h2>
          <select className="border border-slate-300 rounded-lg px-4 py-2 bg-white w-full md:w-auto" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
            <option value="">اختر الاختبار...</option>
            {envelopes.map(env => (
              <option key={env.id} value={env.id}>{env.subject} - {env.grade} ({committees.find(c => c.id === env.committeeId)?.name})</option>
            ))}
          </select>
        </div>

        {!targetEnvelope ? (
          <div className="bg-white p-12 rounded-xl text-center text-gray-400 shadow-sm border border-slate-100">يرجى اختيار اختبار لرصد الدرجات.</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             {/* Header with Search and Actions */}
             <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="font-bold text-lg">{targetEnvelope.subject}</h3>
                    <p className="text-sm text-gray-500">{committees.find(c => c.id === targetEnvelope.committeeId)?.name}</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="بحث عن طالب..." 
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                    <button 
                        onClick={() => markAllPresent(targetEnvelope.id, targetStudents)}
                        className="whitespace-nowrap bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                    >
                        <CheckSquare size={16} />
                         الجميع حاضر
                    </button>
                    <div className="text-sm font-bold bg-white px-3 py-2 rounded border shadow-sm">
                        {targetStudents.length} / {originalCount}
                    </div>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {targetStudents.map(student => {
                   const isAbsent = attendance.some(a => a.studentId === student.id && a.examId === targetEnvelope.id && a.status === 'ABSENT');
                   return (
                      <div key={student.id} onClick={() => toggleAttendance(student.id, targetEnvelope.id, isAbsent)} className={`cursor-pointer border-2 rounded-xl p-4 flex items-center justify-between transition-all select-none ${isAbsent ? 'border-red-500 bg-red-50 shadow-inner' : 'border-slate-100 hover:border-emerald-400 bg-white hover:shadow-md'}`}>
                         <div><p className="font-bold text-gray-800">{student?.name}</p><p className="text-xs text-gray-400">رقم الجلوس: {student.seatNumber || '-'}</p></div>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAbsent ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-300'}`}>{isAbsent ? <X size={20} /> : <CheckCircle size={20} />}</div>
                      </div>
                   );
                })}
                {targetStudents.length === 0 && (
                    <div className="col-span-full py-8 text-center text-gray-400">لا يوجد طلاب يطابقون البحث</div>
                )}
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderAlerts = () => {
    const absentRecords = attendance.filter(a => a.status === 'ABSENT');
    return (
       <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">تنبيهات الغياب</h2>
          <div className="grid grid-cols-1 gap-4">
             {absentRecords.map(record => {
                const student = students.find(s => s.id === record.studentId);
                const exam = envelopes.find(e => e.id === record.examId);
                if (!student || !exam) return null;
                return (
                   <div key={`${record.studentId}-${record.examId}`} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 border-r-4 border-r-red-500">
                      <div className="flex items-start gap-4">
                         <div className="bg-red-100 p-3 rounded-full text-red-600"><AlertTriangle size={24} /></div>
                         <div><h3 className="text-lg font-bold text-gray-800">{student?.name}</h3><p className="text-gray-500 text-sm">غائب عن اختبار: <span className="font-bold text-gray-700">{exam.subject}</span></p></div>
                      </div>
                      <div className="flex gap-3 w-full md:w-auto">
                         <a href={`tel:${student.parentPhone}`} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 font-bold transition-colors"><Phone size={18} /> اتصال</a>
                         <a href={`https://wa.me/966${student.parentPhone.startsWith('0') ? student.parentPhone.substring(1) : student.parentPhone}`} target="_blank" rel="noreferrer" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-lg hover:bg-green-100 font-bold transition-colors">WhatsApp</a>
                      </div>
                   </div>
                );
             })}
             {absentRecords.length === 0 && <div className="bg-white p-12 rounded-xl text-center flex flex-col items-center gap-4"><div className="bg-green-100 p-4 rounded-full text-green-600"><CheckCircle size={48} /></div><h3 className="text-xl font-bold text-gray-700">لا يوجد غياب اليوم</h3></div>}
          </div>
       </div>
    );
  };

  // --- Main Layout ---
  return (
    <div className="flex h-screen bg-slate-50 font-sans" dir="rtl">
      <Sidebar 
        currentRole={currentRole} 
        activePage={activePage} 
        onNavigate={setActivePage}
        onLogout={() => { window.location.reload() }}
        alertCount={attendance.filter(a => a.status === 'ABSENT').length}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
           <div className="flex items-center text-slate-500 gap-4">
              <div className="flex items-center">
                <span className="ml-2">أهلاً بك،</span>
                <span className="font-bold text-slate-800">{currentUser?.name}</span>
                <span className="mr-2 text-xs bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                    {currentUser?.role === 'ADMIN' ? 'قائد المدرسة' : currentUser?.role === 'TEACHER' ? 'معلم' : 'مرشد طلابي'}
                </span>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isDemoMode ? 'bg-orange-50 text-orange-700 border-orange-200' : isLiveConnection ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                 {isDemoMode ? <Database size={14} className="text-orange-600" /> : isLiveConnection ? <Wifi size={14} className="text-green-600" /> : <WifiOff size={14} />}
                 {isDemoMode ? 'وضع التجربة (بيانات وهمية)' : isLiveConnection ? 'متصل بقاعدة البيانات المركزية' : 'غير متصل'}
              </div>
           </div>
           <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">المستخدم الحالي:</span>
              <select className="border rounded p-1 bg-slate-50" onChange={(e) => switchUser(e.target.value)} value={currentUser?.id}>
                 {users.map(u => <option key={u.id} value={u.id}>{u?.name} ({u.role})</option>)}
              </select>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
            {connectionError && !isDemoMode && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r shadow-sm relative animate-pulse">
                <div className="flex items-start">
                  <AlertTriangle className="text-red-500 mt-0.5 ml-3" size={24} />
                  <div className="flex-1">
                    <h3 className="font-bold text-red-800 text-lg">{connectionError.title}</h3>
                    <p className="text-sm text-red-700 mt-1 font-semibold">{connectionError.msg}</p>
                    <div className="mt-3 flex gap-4">
                      <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors"><ExternalLink size={12} /> اذهب إلى Firebase Console</a>
                    </div>
                  </div>
                  <button onClick={() => setConnectionError(null)} className="text-red-400 hover:text-red-600 p-1"><X size={20} /></button>
                </div>
              </div>
            )}

           {activePage === 'dashboard' && renderDashboard()}
           {activePage === 'schedule' && renderSchedule()} 
           {activePage === 'committees' && renderCommittees()}
           {activePage === 'students' && renderStudents()}
           {activePage === 'handover' && renderHandover()}
           {activePage === 'attendance' && renderAttendance()}
           {activePage === 'alerts' && renderAlerts()}
           {activePage === 'reports' && renderReports()}
           {activePage === 'setup' && renderSetup()}
        </div>
      </main>
    </div>
  );
};

export default App;
