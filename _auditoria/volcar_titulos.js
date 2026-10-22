// Vuelca todos los títulos únicos normalizados, ordenados, para escaneo del bibliotecólogo
const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.join(__dirname, '..', 'biblioteca_datos.js'), 'utf8');
const data = eval(raw.match(/\[([\s\S]*)\]/)[0]);

const vistos = new Set();
const lineas = [];
data.forEach(b => {
    const t = b.titulo.replace(/\s+/g, ' ').trim();
    const k = t.toLowerCase();
    if (vistos.has(k)) return;
    vistos.add(k);
    lineas.push(`[${b.autor.slice(0, 30)}] ${t}`);
});
lineas.sort((a, b) => a.localeCompare(b, 'es'));
fs.writeFileSync(path.join(__dirname, 'titulos.txt'), lineas.join('\n'), 'utf8');
console.log('Titulos unicos:', lineas.length, '→ _auditoria/titulos.txt');
