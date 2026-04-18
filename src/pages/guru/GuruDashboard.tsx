import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '../../store/auth.store';

export default function GuruDashboard() {
  const { profile } = useAuthStore();

  return (
    <div className="font-sans">
      <main className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-4 md:grid-rows-[100px_240px_minmax(200px,1fr)] gap-5">
        
        {/* Stats */}
        <Card className="p-5 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paket Soal Anda</p>
          <p className="text-2xl font-bold">12</p>
        </Card>
        <Card className="p-5 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ujian Berlangsung</p>
          <p className="text-2xl font-bold text-[var(--success)]">1</p>
        </Card>
        <Card className="p-5 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Kelas</p>
          <p className="text-2xl font-bold">4</p>
        </Card>
        <Card className="p-5 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status Server</p>
          <p className="text-2xl font-bold text-primary">Normal</p>
        </Card>
        
        <Card className="p-5 md:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              Statistik Evaluasi
            </h3>
            <span className="text-xs text-muted-foreground">Semester Ganjil</span>
          </div>
          <div className="flex-1 border-t py-6 flex flex-col items-center justify-center text-center">
            <p className="font-medium text-muted-foreground mb-4">Tidak ada sesi ujian yang berjalan saat ini.</p>
            <Button variant="outline">Lihat Paket Soal</Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
