// Auditoría de metadatos — Biblioteca Caótica
const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.join(__dirname, '..', 'biblioteca_datos.js'), 'utf8');
const data = eval(raw.match(/\[([\s\S]*)\]/)[0]);

console.log('TOTAL LIBROS:', data.length);

// 1. Pattern: titles starting with numeric IDs
console.log('TITULOS con ID numerico:', data.filter(b => /^\d{5,}/.test(b.titulo)).length);

// 2. Junk de repositorios
console.log('TITULOS con junk de repositorio:', data.filter(b => /\((bookfi|z-lib|pdfymirror|book4you|b-ok|1lib)\)/i.test(b.titulo)).length);

// 3. Autores raros
console.log('AUTORES raros (comillas/parentesis/numeros):', data.filter(b => /["'\u2018\u2019\u201c\u201d]|^\(|^\d{4,}/.test(b.autor)).length);

// 4. Autor transpuesto (aparece dentro del titulo)
console.log('AUTOR contenido en TITULO:', data.filter(b => b.autor && b.autor !== 'Autor Desconocido' && b.titulo.toLowerCase().includes(b.autor.toLowerCase().slice(0, 20))).length);

// 5. Slop en resumenes
console.log('RESUMENES plantilla "Obra sobre X de Y.":', data.filter(b => /^Obra sobre .+ de .+\.$/.test(b.resumen)).length);
console.log('RESUMENES slop mistico-ES:', data.filter(b => /tesoro ancestral|verdadero despertar|portal a la aut|despertar ineludible|tu acceso al conocimiento oculto|mapa secreto/i.test(b.resumen)).length);
console.log('RESUMENES slop mistico-EN:', data.filter(b => /unveil|delve|forbidden knowledge|esoteric (wisdom|journey)|spiritual (apotheosis|liberation|transformation)|hidden (currents|mysteries)|ultimate (quest|power|spiritual)/i.test(b.resumen)).length);

// 6. Duplicados
const links = new Set(); let dupL = 0;
data.forEach(b => { if (links.has(b.link)) dupL++; links.add(b.link); });
console.log('LINKS duplicados:', dupL);
const tt = new Set(); let dupT = 0;
data.forEach(b => { const k = b.titulo.toLowerCase().replace(/[^a-z0-9]/g, ''); if (tt.has(k)) dupT++; tt.add(k); });
console.log('TITULOS duplicados (exactos tras normalizar):', dupT);

// 7. Muestra del blob de Misterios Egipcios
const me = data.filter(b => b.categoria === 'Misterios Egipcios y Oriente Medio').slice(0, 30);
console.log('\n--- MUESTRA del blob Misterios Egipcios (951 libros) ---');
me.forEach(b => console.log('  [' + b.autor.slice(0, 25) + '] ' + b.titulo.slice(0, 75)));

// 8. Muestra de titulos con ID numerico
console.log('\n--- MUESTRA titulos con ID ---');
data.filter(b => /^\d{5,}/.test(b.titulo)).slice(0, 15).forEach(b => console.log('  [' + b.autor.slice(0, 25) + '] ' + b.titulo.slice(0, 75)));

// 9. Libros fuera de tema (basura no ocultista evidente)
console.log('\n--- POSIBLES LIBROS FUERA DE TEMA ---');
const fuera = data.filter(b => /dinosaurio|esclavo|carnegie|wittgenstein|tractatus|cocina|recetas de|marketing|negoci|contabilidad|excel|windows|manual de auto/i.test(b.titulo + ' ' + b.autor));
fuera.slice(0, 30).forEach(b => console.log('  [' + b.autor.slice(0, 25) + '] ' + b.titulo.slice(0, 70) + '  {' + b.categoria + '}'));
console.log('TOTAL fuera de tema detectable:', fuera.length);
