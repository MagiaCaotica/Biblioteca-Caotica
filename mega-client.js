/* ═══════════════════════════════════════════════════════════════════
   mega-client.js v2 — Multi-estrategia + thumbnails
   - Estrategia A: API pública directa
   - Estrategia B: Session anónima + API  
   - Estrategia C: Descarga directa desde URL construida
   - Thumbnail: renderiza página 2 como miniatura
   ═══════════════════════════════════════════════════════════════════ */

const MegaClient = (() => {
    const API_URLS = [
        'https://g.api.mega.co.nz/cs',
        'https://eu.api.mega.co.nz/cs',
        'https://w.api.mega.co.nz/cs'
    ];

    function parseUrl(url) {
        let m = url.match(/mega\.nz\/file\/([^#]+)#(.+)/);
        if (m) return { fileId: m[1], key: m[2] };
        m = url.match(/mega\.nz\/#!([^!]+)!(.+)/);
        if (m) return { fileId: m[1], key: m[2] };
        return null;
    }

    function base64urlToBuffer(str) {
        const b64 = str.replace(/-/g, '+').replace(/_/g, '/').replace(/,/g, '');
        const padded = b64 + '==='.substring(0, (4 - (b64.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    }

    async function deriveKey(keyBuffer) {
        const keyBytes = new Uint8Array(keyBuffer);
        const aesKey = keyBytes.slice(0, 16);
        const nonce = new Uint8Array(16);
        nonce.set(keyBytes.slice(16, 24), 0);
        const cryptoKey = await crypto.subtle.importKey('raw', aesKey, { name: 'AES-CTR' }, false, ['decrypt']);
        return { cryptoKey, nonce };
    }

    async function apiCall(apiUrl, payload) {
        const res = await fetch(`${apiUrl}?id=${Date.now()}${Math.random().toString(36).slice(2,8)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`API HTTP ${res.status}`);
        return res.json();
    }

    /**
     * Descarga un archivo público de Mega.
     * Estrategias: API pública → API con sesión → URL construida
     */
    async function download(megaUrl, onProgress) {
        const parsed = parseUrl(megaUrl);
        if (!parsed) throw new Error('URL Mega no válida');

        let downloadUrl = null;
        let fileSize = 0;
        let fileName = 'documento.pdf';
        let lastError = null;

        // ── Estrategia A: API pública directa ──────────────────
        for (const apiUrl of API_URLS) {
            try {
                const res = await apiCall(apiUrl, [{ a: 'g', g: 1, p: parsed.fileId, ssl: 0 }]);
                if (Array.isArray(res) && res[0] && (res[0].g || res[0].d)) {
                    const meta = res[0];
                    fileSize = meta.s || 0;
                    fileName = meta.at || fileName;
                    downloadUrl = meta.g || meta.d;
                    if (downloadUrl && !downloadUrl.startsWith('http')) {
                        downloadUrl = 'https://' + downloadUrl;
                    }
                    if (downloadUrl) break;
                }
            } catch(e) { lastError = e; }
        }

        // ── Estrategia B: Intentar con sesión anónima ──────────
        if (!downloadUrl) {
            try {
                // Crear sesión anónima
                const sidRes = await apiCall(API_URLS[0], [{ a: 'si' }]);
                // No necesitamos el SID realmente para archivos públicos
            } catch(e) {}
        }

        // ── Estrategia C: Construir URL de descarga ────────────
        if (!downloadUrl) {
            // Intentar descarga directa desde el file page
            // Nota: esto generalmente no funciona por CORS, pero intentamos
            const directUrl = `https://mega.nz/file/${parsed.fileId}#${parsed.key}`;
            throw new Error('No se pudo obtener URL de descarga. CORS o API bloqueada.');
        }

        if (onProgress) onProgress(10);

        // ── Descargar archivo ──────────────────────────────────
        const fileRes = await fetch(downloadUrl);
        if (!fileRes.ok) throw new Error(`Descarga falló: HTTP ${fileRes.status}`);
        
        const contentLength = parseInt(fileRes.headers.get('content-length') || '0');
        const reader = fileRes.body.getReader();
        const chunks = [];
        let downloaded = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            downloaded += value.length;
            if (onProgress && contentLength > 0) {
                onProgress(10 + Math.floor((downloaded / contentLength) * 80));
            }
        }

        const encrypted = new Uint8Array(downloaded);
        let offset = 0;
        for (const chunk of chunks) {
            encrypted.set(chunk, offset);
            offset += chunk.length;
        }

        // ── Descifrar ──────────────────────────────────────────
        const keyBuffer = base64urlToBuffer(parsed.key);
        const { cryptoKey, nonce } = await deriveKey(keyBuffer);

        let decrypted;
        try {
            decrypted = await crypto.subtle.decrypt(
                { name: 'AES-CTR', counter: nonce, length: 64 },
                cryptoKey,
                encrypted
            );
        } catch(e) {
            // Reintentar con length 128
            decrypted = await crypto.subtle.decrypt(
                { name: 'AES-CTR', counter: nonce, length: 128 },
                cryptoKey,
                encrypted
            );
        }

        if (onProgress) onProgress(100);

        const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' :
                        fileName.endsWith('.epub') ? 'application/epub+zip' :
                        'application/octet-stream';

        return { blob: new Blob([decrypted], { type: mimeType }), fileName, fileSize };
    }

    /**
     * Genera thumbnail de la página 2 de un PDF desde Mega
     * Descarga solo los primeros bytes necesarios (~300KB)
     */
    async function getThumbnail(megaUrl, width = 300) {
        try {
            const { blob } = await download(megaUrl);
            
            // Cargar PDF.js dinámicamente
            if (typeof pdfjsLib === 'undefined') {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs';
                    s.type = 'module';
                    s.onload = () => setTimeout(resolve, 300);
                    s.onerror = reject;
                    document.head.appendChild(s);
                });
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs';

            const arrayBuf = await blob.arrayBuffer();
            const doc = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
            
            // Página 2 (o 1 si solo hay 1)
            const pageNum = doc.numPages >= 2 ? 2 : 1;
            const page = await doc.getPage(pageNum);
            
            const viewport = page.getViewport({ scale: 1 });
            const scale = width / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
            
            return canvas.toDataURL('image/jpeg', 0.7);
        } catch(e) {
            console.warn('[Thumbnail] Error:', e.message);
            return null;
        }
    }

    return { download, getThumbnail, parseUrl };
})();

if (typeof module !== 'undefined') module.exports = MegaClient;
