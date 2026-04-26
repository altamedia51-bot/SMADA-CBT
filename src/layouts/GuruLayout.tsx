import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/auth.store';
import { LogOut, LayoutDashboard, ClipboardCheck, BookOpen } from 'lucide-react';
import { useIdleLogout } from '../hooks/useIdleLogout';

export default function GuruLayout() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useIdleLogout(10); // Auto logout 10 menit

  const navItems = [
    { label: 'Dashboard', path: '/guru', icon: LayoutDashboard },
    { label: 'Paket Soal', path: '/guru/paket-soal', icon: BookOpen },
    { label: 'Hasil Ujian', path: '/guru/hasil', icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen flex font-sans bg-slate-50">
      {/* Sidebar - Dark theme like admin */}
      <aside className="w-[260px] bg-[#0E1726] text-slate-300 flex flex-col hidden md:flex shrink-0 border-r border-[#1a2942]">
        <div className="h-20 flex items-center px-6 border-b border-[#1a2942]">
          <div className="w-8 h-8 bg-blue-500 rounded-lg shrink-0 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30 text-xs">
            SMA
          </div>
          <span className="font-extrabold text-xl tracking-tight ml-3 text-white">CBT System</span>
          <span className="ml-2 bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            GURU
          </span>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
           {navItems.map((item) => {
             const isActive = location.pathname === item.path || (item.path !== '/guru' && location.pathname.startsWith(item.path));
             const Icon = item.icon;

             return (
               <button
                 key={item.path}
                 onClick={() => navigate(item.path)}
                 className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                   isActive 
                     ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                     : 'text-slate-400 hover:text-slate-100 hover:bg-[#1a2942]'
                 }`}
               >
                 <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                 {item.label}
               </button>
             );
           })}
        </div>
        
        {/* User Info & Logout at bottom */}
        <div className="p-4 border-t border-[#1a2942]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
               {profile?.displayName?.charAt(0).toUpperCase() || 'G'}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-semibold text-white truncate">{profile?.displayName || 'Guru User'}</p>
               <p className="text-xs text-slate-400">Pengajar</p>
            </div>
          </div>
          <button
                 onClick={() => auth.signOut()}
                 className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all text-rose-400 hover:text-rose-300 hover:bg-rose-400/10`}
               >
                 <LogOut className="w-4 h-4" />
                 Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
         {/* Mobile Header */}
         <div className="md:hidden h-16 bg-[#0E1726] text-white flex items-center px-4 justify-between shrink-0">
            <div className="font-bold flex items-center gap-2">
               <div className="w-8 h-8 bg-blue-500 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs">SMA</div>
               <span className="flex items-center gap-2">
                 CBT System 
                 <span className="bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Guru</span>
               </span>
            </div>
            <button onClick={() => auth.signOut()}>
              <LogOut className="w-5 h-5" />
            </button>
         </div>

         <div className="flex-1 overflow-auto bg-slate-50 relative pb-16 md:pb-0">
           <Outlet />
           
           <div className="p-6 text-center text-xs text-slate-400 font-medium tracking-widest uppercase mb-4">
              © 2026 DEVELOPED BY SMADA | VERSI APP 1.1.0
           </div>
         </div>

         {/* Mobile Bottom Navigation */}
         <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-50 pb-safe">
           {navItems.map((item) => {
             const isActive = location.pathname === item.path || (item.path !== '/guru' && location.pathname.startsWith(item.path));
             const Icon = item.icon;
             return (
               <button
                 key={item.path}
                 onClick={() => navigate(item.path)}
                 className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                   isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
                 }`}
               >
                 <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                 <span className="text-[10px] font-medium">{item.label}</span>
               </button>
             );
           })}
         </nav>
      </div>
    </div>
  );
}
