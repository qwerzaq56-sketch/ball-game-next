// Flat, UTF-8 spreadsheet output of the bounded sample list. No names/user text.
export function observationCSV(game){
 const columns=['seed','policy','time','score','size','hp','maxHp','liveAI','apex','companionGroups','era','region','prey','forager','predator','attackStarts','autoplay'];
 const quote=value=>{const s=String(value??'');return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 const rows=game.runMetrics.samples.map(sample=>{
  const row={...sample,seed:game.seed,policy:game.autoplay.policy,...sample.roles};
  return columns.map(key=>quote(row[key])).join(',');
 });
 return '\ufeff'+[columns.join(','),...rows].join('\r\n')+'\r\n';
}
