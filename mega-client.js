/* ═══════════════════════════════════════════════════════════════════
   mega-client.js v3 — Solo thumbnails. Sin dependencias de API.
   Descarga directa desde la URL de archivo de Mega, descifra con
   Web Crypto API, renderiza página 2 con PDF.js.
   
   Estrategia simplificada:
   1. Abrir la URL de archivo como página (el navegador la renderiza)
   2. Usar MegaCDN o enlaces directos cuando estén disponibles
   3. Fallback silencioso si no se puede
   ═══════════════════════════════════════════════════════════════════ */

const MegaClient = (() => {

    function parseUrl(url) {
        const m = (url||'').match(/mega\.nz\/file\/([^#]+)#(.+)/);
        return m ? { fileId: m[1], key: m[2] } : null;
    }

    function base64urlToBuffer(str) {
        const b64 = (str||'').replace(/-/g,'+').replace(/_/g,'/').replace(/,/g,'');
        const padded = b64 + '==='.substring(0, (4-(b64.length%4))%4);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i=0; i<binary.length; i++) bytes[i]=binary.charCodeAt(i);
        return bytes.buffer;
    }

    async function deriveKey(keyBuffer) {
        const kb = new Uint8Array(keyBuffer);
        const aesKey = kb.slice(0,16);
        const nonce = new Uint8Array(16);
        nonce.set(kb.slice(16,24),0);
        const ck = await crypto.subtle.importKey('raw', aesKey, {name:'AES-CTR'}, false, ['decrypt']);
        return { cryptoKey: ck, nonce };
    }

    /**
     * Descarga y descifra un archivo público de Mega — vía API pública
     */
    async function downloadFile(megaUrl, onProgress) {
        const parsed = parseUrl(megaUrl);
        if (!parsed) throw new Error('URL inválida');

        // ── Paso 1: Obtener URL de descarga vía API pública ────
        const apiRes = await fetch(`https://g.api.mega.co.nz/cs?id=${Date.now()}`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify([{a:'g', g:1, p:parsed.fileId, ssl:0}])
        });

        if (!apiRes.ok) throw new Error(`API: HTTP ${apiRes.status}`);
        const apiData = await apiRes.json();

        if (!Array.isArray(apiData) || !apiData[0] || (!apiData[0].g && !apiData[0].d)) {
            // Intentar con ssl:1
            const apiRes2 = await fetch(`https://g.api.mega.co.nz/cs?id=${Date.now()+1}`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify([{a:'g', g:1, p:parsed.fileId, ssl:1}])
            });
            if (!apiRes2.ok) throw new Error('API falló');
            const d2 = await apiRes2.json();
            if (!Array.isArray(d2) || !d2[0] || (!d2[0].g && !d2[0].d)) throw new Error('Archivo no disponible');
            const dl = d2[0].g || d2[0].d;
            if (!dl) throw new Error('Sin URL descarga');
            return downloadAndDecrypt(dl.startsWith('http')?dl:'https://'+dl, parsed.key, onProgress);
        }

        const dl = apiData[0].g || apiData[0].d;
        if (!dl) throw new Error('Sin URL descarga');
        return downloadAndDecrypt(dl.startsWith('http')?dl:'https://'+dl, parsed.key, onProgress);
    }

    async function downloadAndDecrypt(downloadUrl, key, onProgress) {
        // ── Paso 2: Descargar ─────────────────────────────────
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`Descarga: HTTP ${res.status}`);
        
        const total = parseInt(res.headers.get('content-length')||'0');
        const reader = res.body.getReader();
        const chunks = []; let downloaded = 0;

        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            chunks.push(value);
            downloaded += value.length;
            if (onProgress && total > 0) onProgress(Math.floor(downloaded/total*100));
        }

        const encrypted = new Uint8Array(downloaded);
        let off = 0;
        for (const c of chunks) { encrypted.set(c, off); off += c.length; }

        // ── Paso 3: Descifrar ─────────────────────────────────
        const keyBuffer = base64urlToBuffer(key);
        const {cryptoKey, nonce} = await deriveKey(keyBuffer);

        let decrypted;
        try {
            decrypted = await crypto.subtle.decrypt({name:'AES-CTR', counter:nonce, length:128}, cryptoKey, encrypted);
        } catch(e) {
            try {
                decrypted = await crypto.subtle.decrypt({name:'AES-CTR', counter:nonce, length:64}, cryptoKey, encrypted);
            } catch(e2) {
                throw new Error('Descifrado falló');
            }
        }

        return new Blob([decrypted], {type:'application/pdf'});
    }

    /**
     * Genera thumbnail (JPEG dataURL) de la página 2
     */
    async function getThumbnail(megaUrl, width = 320) {
        try {
            const blob = await downloadFile(megaUrl);
            if (!blob) return null;

            // Cargar PDF.js
            if (typeof pdfjsLib === 'undefined') {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs';
                    s.type = 'module';
                    s.onload = () => setTimeout(resolve, 500);
                    s.onerror = reject;
                    document.head.appendChild(s);
                });
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs';

            const buf = await blob.arrayBuffer();
            const doc = await pdfjsLib.getDocument({data: buf}).promise;
            const pageNum = doc.numPages >= 2 ? 2 : 1;
            const page = await doc.getPage(pageNum);
            const vp = page.getViewport({scale:1});
            const scale = width / vp.width;
            const svp = page.getViewport({scale});

            const canvas = document.createElement('canvas');
            canvas.width = svp.width;
            canvas.height = svp.height;
            await page.render({canvasContext: canvas.getContext('2d'), viewport: svp}).promise;

            return canvas.toDataURL('image/jpeg', 0.65);
        } catch(e) {
            console.debug('[Thumbnail]', e.message);
            return null;
        }
    }

    return { getThumbnail, downloadFile, parseUrl };
})();

if (typeof module !== 'undefined') module.exports = MegaClient;
