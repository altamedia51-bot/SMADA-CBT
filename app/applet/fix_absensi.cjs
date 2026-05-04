const fs = require('fs');
let content = fs.readFileSync('src/pages/guru/GuruRaportKelas.tsx', 'utf8');

content = content.replace(
  /<th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-\[90px\] w-8">\s*<div className="\[writing-mode:vertical-rl\] rotate-180 m-auto whitespace-nowrap text-\[9px\]">Sakit<\/div>\s*<\/th>\s*<th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-\[90px\] w-8">\s*<div className="\[writing-mode:vertical-rl\] rotate-180 m-auto whitespace-nowrap text-\[9px\]">Izin<\/div>\s*<\/th>\s*<th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-\[90px\] w-8">\s*<div className="\[writing-mode:vertical-rl\] rotate-180 m-auto whitespace-nowrap text-\[9px\]">Alpa<\/div>\s*<\/th>/g,
  `{printMode !== 'dkn' && (
                                    <>
                                       <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[90px] w-8">
                                          <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Sakit</div>
                                       </th>
                                       <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[90px] w-8">
                                          <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Izin</div>
                                       </th>
                                       <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[90px] w-8">
                                          <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Alpa</div>
                                       </th>
                                    </>
                                 )}`
);

content = content.replace(
  /<td className="border border-slate-400 px-1 py-1 text-center">{absensiData\[siswa\.id\]\?\.sakit \|\| '0'}<\/td>\s*<td className="border border-slate-400 px-1 py-1 text-center">{absensiData\[siswa\.id\]\?\.izin \|\| '0'}<\/td>\s*<td className="border border-slate-400 px-1 py-1 text-center">{absensiData\[siswa\.id\]\?\.alpa \|\| '0'}<\/td>/g,
  `{printMode !== 'dkn' && (
                                        <>
                                           <td className="border border-slate-400 px-1 py-1 text-center">{absensiData[siswa.id]?.sakit || '0'}</td>
                                           <td className="border border-slate-400 px-1 py-1 text-center">{absensiData[siswa.id]?.izin || '0'}</td>
                                           <td className="border border-slate-400 px-1 py-1 text-center">{absensiData[siswa.id]?.alpa || '0'}</td>
                                        </>
                                     )}`
);

content = content.replace(
  /<th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-\[120px\] w-8">\s*<div className="\[writing-mode:vertical-rl\] rotate-180 m-auto whitespace-nowrap text-\[9px\]">Sakit<\/div>\s*<\/th>\s*<th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-\[120px\] w-8">\s*<div className="\[writing-mode:vertical-rl\] rotate-180 m-auto whitespace-nowrap text-\[9px\]">Izin<\/div>\s*<\/th>\s*<th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-\[120px\] w-8">\s*<div className="\[writing-mode:vertical-rl\] rotate-180 m-auto whitespace-nowrap text-\[9px\]">Alpa<\/div>\s*<\/th>/g,
  `{printMode !== 'dkn' && (
                                    <>
                                       <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[120px] w-8">
                                          <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Sakit</div>
                                       </th>
                                       <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[120px] w-8">
                                          <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Izin</div>
                                       </th>
                                       <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[120px] w-8">
                                          <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Alpa</div>
                                       </th>
                                    </>
                                 )}`
);

content = content.replace(
  /<td className="border border-slate-400 p-0 overflow-hidden w-8">\s*<input[^>]+value=\{absensiData\[siswa\.id\]\?\.sakit \|\| ''\}[^>]+>\s*<\/td>\s*<td className="border border-slate-400 p-0 overflow-hidden w-8">\s*<input[^>]+value=\{absensiData\[siswa\.id\]\?\.izin \|\| ''\}[^>]+>\s*<\/td>\s*<td className="border border-slate-400 p-0 overflow-hidden w-8">\s*<input[^>]+value=\{absensiData\[siswa\.id\]\?\.alpa \|\| ''\}[^>]+>\s*<\/td>/g,
  `{printMode !== 'dkn' && (
                                        <>
                                           <td className="border border-slate-400 p-0 overflow-hidden w-8">
                                              <input 
                                                 type="text" 
                                                 className="w-full h-full px-1 py-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-center text-[10px]" 
                                                 value={absensiData[siswa.id]?.sakit || ''}
                                                 placeholder="0"
                                                 onChange={(e) => setAbsensiData({ ...absensiData, [siswa.id]: { ...(absensiData[siswa.id] || {sakit:'', izin:'', alpa:''}), sakit: e.target.value } })}
                                              />
                                           </td>
                                           <td className="border border-slate-400 p-0 overflow-hidden w-8">
                                              <input 
                                                 type="text" 
                                                 className="w-full h-full px-1 py-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-center text-[10px]" 
                                                 value={absensiData[siswa.id]?.izin || ''}
                                                 placeholder="0"
                                                 onChange={(e) => setAbsensiData({ ...absensiData, [siswa.id]: { ...(absensiData[siswa.id] || {sakit:'', izin:'', alpa:''}), izin: e.target.value } })}
                                              />
                                           </td>
                                           <td className="border border-slate-400 p-0 overflow-hidden w-8">
                                              <input 
                                                 type="text" 
                                                 className="w-full h-full px-1 py-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-center text-[10px]" 
                                                 value={absensiData[siswa.id]?.alpa || ''}
                                                 placeholder="0"
                                                 onChange={(e) => setAbsensiData({ ...absensiData, [siswa.id]: { ...(absensiData[siswa.id] || {sakit:'', izin:'', alpa:''}), alpa: e.target.value } })}
                                              />
                                           </td>
                                        </>
                                     )}`
);

content = content.replace(
  /<th colSpan=\{3\} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center font-bold">ABSENSI<\/th>/g,
  `{printMode !== 'dkn' && (
                                    <th colSpan={3} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center font-bold">ABSENSI</th>
                                 )}`
);

fs.writeFileSync('src/pages/guru/GuruRaportKelas.tsx', content);
