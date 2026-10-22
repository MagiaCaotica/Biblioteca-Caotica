const fs = require('fs'), crypto = require('crypto'), https = require('https');
const vm = require('vm');
const t = fs.readFileSync('biblioteca_datos.js', 'utf8');
const c = {}; vm.createContext(c); vm.runInContext(t + ';this.D=BIBLIOTECA_DATOS', c);
const D = c.D;

const codeRe = /^(?:ARQ[-\s]?\d+|(?:0[0-9]|1[0-9])\d{2,3}TL[-\s]?\d+|REV[-\s]?\d+[-\s]?v?\d*[a-z]?\d*|20\d{6}TR[-\s]?\d+)$/i;

const doh = host => new Promise((res, rej) => {
    https.get('https://cloudflare-dns.com/dns-query?name=' + host + '&type=A', { headers: { accept: 'application/dns-json' } }, r => {
        let d = ''; r.on('data', x => d += x); r.on('end', () => { const j = JSON.parse(d); const a = (j.Answer || []).filter(x => x.type === 1); a.length ? res(a[0].data) : rej(new Error('noA')); });
    }).on('error', rej);
});
const post = (url, body) => new Promise((res, rej) => {
    const u = new URL(url);
    const r = https.request({ host: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(JSON.parse(d)[0])); });
    r.on('error', rej); r.write(body); r.end();
});
const getRange = async (url, range) => {
    const u = new URL(url); const ip = await doh(u.hostname);
    return new Promise((res, rej) => {
        https.get({ host: ip, servername: u.hostname, path: u.pathname + u.search, headers: { Host: u.hostname, Range: range } }, r => {
            const b = []; r.on('data', x => b.push(x)); r.on('end', () => res(Buffer.concat(b)));
        }).on('error', rej);
    });
};

function deriveKey(kstr) {
    const kb = Buffer.from(kstr.replace(/-/g, '+').replace(/_/g, '/') + '=', 'base64');
    const key = Buffer.alloc(16); for (let i = 0; i < 16; i++) key[i] = kb[i] ^ kb[16 + i];
    const nonce = kb.subarray(16, 24);
    return { key, nonce };
}

function decrypt(buf, key, nonce, offset) {
    const iv = Buffer.alloc(16);
    nonce.copy(iv, 0);
    const counter = Math.floor(offset / 16);
    iv.writeBigUInt64BE(BigInt(counter), 8);
    const d = crypto.createDecipheriv('aes-128-ctr', key, iv);
    return Buffer.concat([d.update(buf), d.final()]);
}

function decodePdfString(raw) {
    // raw includes delimiters
    raw = raw.trim();
    if (raw.startsWith('<')) {
        const hex = raw.replace(/[<>]/g, '').replace(/\s/g, '');
        const buf = Buffer.from(hex, 'hex');
        if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
            // UTF-16BE
            let s = '';
            for (let i = 2; i + 1 < buf.length; i += 2) s += String.fromCharCode((buf[i] << 8) | buf[i + 1]);
            return s;
        }
        return buf.toString('latin1');
    }
    // literal ( ... )
    const inner = raw.replace(/^\(/, '').replace(/\)$/, '');
    return inner.replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
        .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
}

function extractMeta(text) {
    const title = text.match(/\/Title\s*(\([^)]*\)|<[0-9A-Fa-f\s]*>)/);
    const author = text.match(/\/Author\s*(\([^)]*\)|<[0-9A-Fa-f\s]*>)/);
    return {
        title: title ? decodePdfString(title[1]).trim() : null,
        author: author ? decodePdfString(author[1]).trim() : null
    };
}

// Load checkpoint
let sondeo = {};
try { sondeo = JSON.parse(fs.readFileSync('_auditoria/sondeo.json', 'utf8')); } catch (e) {}

const codeEntries = D.filter(b => codeRe.test((b.titulo || '').trim()));
console.log('code entries to probe:', codeEntries.length);

async function probe(entry) {
    const key = entry.titulo.trim();
    if (sondeo[key] && sondeo[key].done) return sondeo[key];
    const link = entry.link;
    const [h, kstr] = link.split('#');
    const handle = h.split('/file/')[1];
    const { key: aesKey, nonce } = deriveKey(kstr);
    try {
        const api = await post('https://g.api.mega.co.nz/cs?id=' + Date.now(), JSON.stringify([{ a: 'g', g: 1, p: handle, ssl: 1 }]));
        if (api.e) throw new Error('api ' + api.e);
        const size = api.s;
        // first 64KB
        const first = await getRange(api.g, 'bytes=0-65535');
        const decFirst = decrypt(first, aesKey, nonce, 0);
        let text = decFirst.toString('latin1');
        let meta = extractMeta(text);
        // tail 64KB
        if (!meta.title || !meta.author) {
            const start = Math.max(0, size - 65536);
            const tail = await getRange(api.g, 'bytes=' + start + '-' + (size - 1));
            const decTail = decrypt(tail, aesKey, nonce, start);
            const t2 = decTail.toString('latin1');
            const m2 = extractMeta(t2);
            if (!meta.title) meta.title = m2.title;
            if (!meta.author) meta.author = m2.author;
            text += '\n' + t2;
        }
        const res = { done: true, title: meta.title, author: meta.author, size };
        sondeo[key] = res;
        fs.writeFileSync('_auditoria/sondeo.json', JSON.stringify(sondeo, null, 2), 'utf8');
        return res;
    } catch (e) {
        sondeo[key] = { done: true, title: null, author: null, error: String(e) };
        fs.writeFileSync('_auditoria/sondeo.json', JSON.stringify(sondeo, null, 2), 'utf8');
        return sondeo[key];
    }
}

(async () => {
    const CONC = 4;
    let i = 0;
    async function worker() {
        while (i < codeEntries.length) {
            const idx = i++;
            const e = codeEntries[idx];
            const r = await probe(e);
            console.log(idx + 1, '/', codeEntries.length, e.titulo, '->', r.title || '-', '|', r.author || '-');
        }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
    const found = Object.values(sondeo).filter(r => r.title).length;
    console.log('done. with title:', found, 'of', codeEntries.length);
})();
