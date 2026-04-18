import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/auth.store';
import { LogOut } from 'lucide-react';
import { useIdleLogout } from '../hooks/useIdleLogout';

export default function AdminLayout() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useIdleLogout(10); // Auto logout 10 menit

  const navItems = [
    { label: 'Dashboard', path: '/admin' },
    { label: 'Master Data', path: '/admin/master-data' },
    { label: 'Manajemen Ujian', path: '/admin/ujian' },
    { label: 'Hasil Ujian', path: '/admin/hasil' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background">
      {/* Top Navbar */}
      <nav className="h-16 bg-card border-b flex items-center px-4 md:px-8 shrink-0">
        <div className="flex items-center gap-3 w-1/3">
          <div className="w-8 h-8 bg-primary rounded-lg shrink-0" />
          <span className="font-extrabold text-xl tracking-tight hidden md:inline">EduTest CBT</span>
          <span className="bg-secondary text-primary px-3 py-1 rounded-full text-xs font-semibold uppercase">
            Admin
          </span>
        </div>

        <div className="flex-1 flex justify-center gap-1 md:gap-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-5 justify-end w-1/3">
           <div className="text-right hidden md:block">
             <p className="text-sm font-semibold">{profile?.displayName || 'Administrator'}</p>
             <p className="text-xs text-muted-foreground">Otoritas Sistem</p>
           </div>
           <div 
             className="w-10 h-10 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors" 
             onClick={() => auth.signOut()}
             title="Logout"
           >
             <LogOut className="h-4 w-4 text-muted-foreground" />
           </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
