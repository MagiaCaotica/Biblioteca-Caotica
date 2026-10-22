// Dump de autores distintos y patrones para construir el diccionario de reparación
const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.join(__dirname, '..', 'biblioteca_datos.js'), 'utf8');
const data = eval(raw.match(/\[([\s\S]*)\]/)[0]);

// Autores distintos ordenados por frecuencia
const autores = {};
data.forEach(b => { autores[b.autor] = (autores[b.autor] || 0) + 1; });
const lista = Object.entries(autores).sort((a, b) => b[1] - a[1]);
console.log('AUTORES DISTINTOS:', lista.length);
console.log('--- TOP 80 ---');
lista.slice(0, 80).forEach(([a, n]) => console.log(String(n).padStart(4), a));

// Cuantos autores distintos son solo un numero
const soloNum = lista.filter(([a]) => /^\d+$/.test(a));
console.log('\nAUTORES solo-numéricos:', soloNum.length, 'libros:', soloNum.reduce((s, [, n]) => s + n, 0));

// Patrones de resumen: primeras 6 palabras mas frecuentes
const prefijos = {};
data.forEach(b => {
    const p = (b.resumen || '').split(/\s+/).slice(0, 4).join(' ').toLowerCase();
    prefijos[p] = (prefijos[p] || 0) + 1;
});
console.log('\n--- PREFIJOS de resumen más comunes (TOP 20) ---');
Object.entries(prefijos).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([p, n]) => console.log(String(n).padStart(5), '|', p));
