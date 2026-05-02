import { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function AdminReset() {
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});

  const handleDeleteAll = async (collectionName: string, label: string) => {
    const confirmation = window.prompt(
      `PERINGATAN BAHAYA!\n\nAnda akan MENGHAPUS SEMUA DATA ${label}.\nAksi ini tidak dapat dibatalkan.\n\nKetik "HAPUS ${label}" untuk melanjutkan:`
    );

    if (confirmation !== `HAPUS ${label}`) {
      if (confirmation !== null) {
        toast.error('Konfirmasi tidak cocok. Dibatalkan.');
      }
      return;
    }

    setIsDeleting(prev => ({ ...prev, [collectionName]: true }));
    try {
      const snap = await getDocs(collection(db, collectionName));
      if (snap.empty) {
        toast.info(`Tidak ada data ${label} untuk dihapus.`);
        setIsDeleting(prev => ({ ...prev, [collectionName]: false }));
        return;
      }

      // Firestore batches support up to 500 operations
      const batches = [];
      let currentBatch = writeBatch(db);
      let opCount = 0;

      for (const d of snap.docs) {
        // Special case for users collection, do not delete admins
        if (collectionName === 'users') {
          const data = d.data();
          if (data.role === 'admin' || data.role === 'guru') {
            continue; // Skip admin & guru
          }
        }

        // Handle subcollection 'soal' for 'paket_soal'
        if (collectionName === 'paket_soal') {
          const soalSnap = await getDocs(collection(db, `paket_soal/${d.id}/soal`));
          for (const sDoc of soalSnap.docs) {
             currentBatch.delete(sDoc.ref);
             opCount++;
             if (opCount >= 490) {
                batches.push(currentBatch);
                currentBatch = writeBatch(db);
                opCount = 0;
             }
          }
        }
        
        // Handle subcollection 'pelanggaran' for 'hasil_ujian'
        if (collectionName === 'hasil_ujian') {
          const pelSnap = await getDocs(collection(db, `hasil_ujian/${d.id}/pelanggaran`));
          for (const pDoc of pelSnap.docs) {
             currentBatch.delete(pDoc.ref);
             opCount++;
             if (opCount >= 490) {
                batches.push(currentBatch);
                currentBatch = writeBatch(db);
                opCount = 0;
             }
          }
        }

        currentBatch.delete(d.ref);
        opCount++;

        if (opCount >= 490) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      }

      if (opCount > 0) batches.push(currentBatch);

      await Promise.all(batches.map(b => b.commit()));

      toast.success(`Semua data ${label} berhasil dihapus.`);
    } catch (error: any) {
      console.error(error);
      toast.error(`Gagal menghapus data: ${error.message}`);
    } finally {
      setIsDeleting(prev => ({ ...prev, [collectionName]: false }));
    }
  };

  const deleteItems = [
    {
      id: 'ujian',
      label: 'Jadwal Ujian',
      desc: 'Menghapus semua jadwal dan kegiatan ujian yang telah dibuat.',
      coll: 'ujian'
    },
    {
      id: 'paket_soal',
      label: 'Bank Soal',
      desc: 'Menghapus semua paket soal beserta butir soal di dalamnya secara permanen.',
      coll: 'paket_soal'
    },
    {
      id: 'hasil_ujian',
      label: 'Nilai / Hasil Ujian',
      desc: 'Menghapus semua data nilai dan riwayat pengerjaan ujian siswa.',
      coll: 'hasil_ujian'
    },
    {
      id: 'users',
      label: 'Data Siswa',
      desc: 'Menghapus SEMUA data siswa dari database. Akun guru dan admin TIDAK akan dihapus.',
      coll: 'users'
    }
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
          Manajemen Hapus Data
        </h1>
        <p className="text-slate-500 mt-2">
          Gunakan fitur ini dengan hati-hati saat pergantian semester atau tahun ajaran baru.
        </p>
      </div>

      <div className="bg-rose-50 border border-rose-100 rounded-xl p-6">
        <h2 className="text-lg font-bold text-rose-800 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5" />
          Peringatan Zona Berbahaya
        </h2>
        <p className="text-sm text-rose-700 leading-relaxed font-medium">
          Aksi penghapusan di bawah ini bersifat permanen dan tidak dapat dikembalikan. Pastikan Anda sudah mem-backup atau mencetak Laporan / Leger Nilai sebelum melakukan penghapusan data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deleteItems.map(item => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">{item.label}</h3>
              <p className="text-sm text-slate-500 min-h-[40px]">{item.desc}</p>
            </div>
            
            <button 
              onClick={() => handleDeleteAll(item.coll, item.label)}
              disabled={isDeleting[item.coll]}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all text-sm ${
                isDeleting[item.coll] 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-rose-100 text-rose-700 hover:bg-rose-200 hover:text-rose-800'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting[item.coll] ? 'Sedang Menghapus...' : `Hapus Seluruh ${item.label}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
