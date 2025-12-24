import React, { useState } from 'react';
import { Trash2, FileSpreadsheet } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { UserRole, Student } from './types';
import { MOCK_STUDENTS } from './constants';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<string>('students');
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  const handleStudentImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
      // Implementation logic for file import would go here
    }
  };

  const deleteAllStudents = () => {
    if (window.confirm('هل أنت متأكد من حذف جميع الطلاب؟')) {
      setStudents([]);
    }
  };

  const deleteStudent = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      setStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  const renderStudents = () => {
    // Sort students by Committee Name first, then by Grade (custom order), then by Name
    const sortedStudents = [...students].sort((a, b) => {
      // 1. Committee (Numeric Sort for "1", "2", "10")
      const commA = a.committee || '';
      const commB = b.committee || '';
      const commCompare = commA.localeCompare(commB, 'ar', { numeric: true });
      if (commCompare !== 0) return commCompare;

      // 2. Grade (Custom Order: First -> Second -> Third)
      const getGradeRank = (g: string) => {
        const grade = g || '';
        if (grade.includes('أول') || grade.includes('First')) return 1;
        if (grade.includes('ثاني') || grade.includes('Second')) return 2;
        if (grade.includes('ثالث') || grade.includes('Third')) return 3;
        return 99; // Fallback
      };

      const rankA = getGradeRank(a.grade);
      const rankB = getGradeRank(b.grade);

      if (rankA !== rankB) return rankA - rankB;

      // 3. Name
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

  return (
    <div className="flex h-screen bg-slate-100 font-sans" dir="rtl">
      <Sidebar 
        currentRole={currentRole} 
        activePage={activePage} 
        onNavigate={setActivePage} 
        onLogout={() => console.log("Logout")} 
      />
      <main className="flex-1 overflow-auto p-8">
        {activePage === 'students' ? renderStudents() : <div className="text-center p-10 text-gray-500">صفحة {activePage} قيد التطوير</div>}
      </main>
    </div>
  );
};

export default App;