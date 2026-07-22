/* ═══════════════════════════════════════════════════════════════════
   mega-client.js — Cliente ligero de Mega.nz para navegador
   Descarga pública + descifrado AES-128-CTR con Web Crypto API.
   Sin dependencias. ~3 KB.
   ═══════════════════════════════════════════════════════════════════ */

const MegaClient = (() => {
    const API_URL = 'https://g.api.mega.co.nz/cs';

    /**
     * Parsea una URL de Mega.nz y extrae fileId + key
     * Formatos soportados:
     *   https://mega.nz/file/FILE_ID#KEY
     *   https://mega.nz/#!FILE_ID!KEY
     */
    function parseUrl(url) {
        // Formato 1: mega.nz/file/FILE_ID#KEY
        let m = url.match(/mega\.nz\/file\/([^#]+)#(.+)/);
        if (m) return { fileId: m[1], key: m[2] };

        // Formato 2: mega.nz/#!FILE_ID!KEY
        m = url.match(/mega\.nz\/#!([^!]+)!(.+)/);
        if (m) return { fileId: m[1], key: m[2] };

        return null;
    }

    /**
     * Decodifica una key de Mega (base64url → ArrayBuffer)
     */
    function base64urlToBuffer(str) {
        // Normalizar base64url a base64 estándar
        const b64 = str.replace(/-/g, '+').replace(/_/g, '/').replace(/,/g, '');
        // Añadir padding
        const padded = b64 + '==='.substring(0, (4 - (b64.length % 4)) % 4);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    }

    /**
     * Deriva la clave AES-128-CTR a partir del key buffer de Mega
     */
    async function deriveKey(keyBuffer) {
        const keyBytes = new Uint8Array(keyBuffer);
        // Primeros 16 bytes = clave AES
        const aesKey = keyBytes.slice(0, 16);
        
        // Siguientes 8 bytes = nonce para CTR
        // Mega usa: primeros 4 bytes como ctr high, siguientes 4 como ctr low
        const nonce = new Uint8Array(16); // AES-CTR usa nonce de 16 bytes
        nonce.set(keyBytes.slice(16, 24), 0); // bytes 16-23 → posición 0-7 del nonce
        // bytes 8-15 del nonce quedan en 0
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw', aesKey, { name: 'AES-CTR' }, false, ['decrypt']
        );
        return { cryptoKey, nonce };
    }

    /**
     * Descarga y descifra un archivo público de Mega.nz
     * @param {string} megaUrl - URL completa del archivo
     * @param {function} onProgress - callback(porcentaje)
     * @returns {Promise<{blob: Blob, fileName: string, fileSize: number}>}
     */
    async function download(megaUrl, onProgress) {
        const parsed = parseUrl(megaUrl);
        if (!parsed) throw new Error('URL de Mega no válida');

        // 1. Obtener metadata del archivo (incluyendo URL de descarga)
        const metaReq = await fetch(`${API_URL}?id=${Date.now()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{ a: 'g', g: 1, p: parsed.fileId }])
        });
        
        if (!metaReq.ok) throw new Error('Error al conectar con Mega API');
        
        const metaRes = await metaReq.json();
        if (!Array.isArray(metaRes) || metaRes[0] === undefined || metaRes[0] === null) {
            throw new Error('Archivo no encontrado en Mega');
        }
        
        const meta = metaRes[0];
        const fileSize = meta.s || 0;
        const fileName = meta.at || 'documento.pdf';
        
        // 2. Construir URL de descarga
        let downloadUrl = meta.g || meta.d || '';
        if (!downloadUrl && meta.p) {
            // Reconstruir manualmente
            downloadUrl = `https://${meta.srv || 'gfs'}.${meta.dmn || 'mega.co.nz'}/dl/${meta.p}`;
        }
        
        if (!downloadUrl) throw new Error('No se pudo obtener URL de descarga');

        // 3. Descargar archivo cifrado
        const fileReq = await fetch(downloadUrl);
        if (!fileReq.ok) throw new Error('Error al descargar el archivo');
        
        const encryptedBuffer = await fileReq.arrayBuffer();
        
        // 4. Descifrar
        const keyBuffer = base64urlToBuffer(parsed.key);
        const { cryptoKey, nonce } = await deriveKey(keyBuffer);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-CTR', counter: nonce, length: 128 },
            cryptoKey,
            encryptedBuffer
        );

        if (onProgress) onProgress(100);

        return {
            blob: new Blob([decrypted], { type: 'application/pdf' }),
            fileName,
            fileSize
        };
    }

    return { download, parseUrl };
})();

// Exportar para usar en módulos o script tag
if (typeof module !== 'undefined') module.exports = MegaClient;
