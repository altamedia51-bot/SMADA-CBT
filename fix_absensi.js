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

fs.writeFileSync('src/pages/guru/GuruRaportKelas.tsx', content);
