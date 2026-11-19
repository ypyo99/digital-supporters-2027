import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const BUILD_TIMESTAMP = new Date().getTime().toString();
const NAMECARD_SAVE_DIR = 'G:\\내 드라이브\\2027-Digital Supporters\\명함';

const isLoopbackAddress = (addr = '') => (
  addr === '127.0.0.1' ||
  addr === '::1' ||
  addr === '::ffff:127.0.0.1'
);

const registerNamecardMiddleware = (middlewares) => {
  middlewares.use('/api/save-namecard', (req, res) => {
    const remoteAddr = req.socket?.remoteAddress || '';
    if (!isLoopbackAddress(remoteAddr)) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: '로컬 PC에서만 직접 저장을 지원합니다.' }));
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'GET') {
      const dirExists = fs.existsSync(NAMECARD_SAVE_DIR);
      const parentExists = fs.existsSync(path.dirname(NAMECARD_SAVE_DIR));
      res.end(JSON.stringify({
        ok: true,
        available: dirExists || parentExists,
        targetDir: NAMECARD_SAVE_DIR
      }));
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
      return;
    }

    let body = '';
    let aborted = false;
    const MAX_BYTES = 25 * 1024 * 1024;
    req.on('data', (chunk) => {
      if (aborted) return;
      body += chunk.toString('utf8');
      if (body.length > MAX_BYTES) {
        aborted = true;
        res.statusCode = 413;
        res.end(JSON.stringify({ ok: false, error: '파일 크기가 너무 큽니다.' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (aborted) return;
      try {
        const { fileName, dataUrl } = JSON.parse(body || '{}');
        if (typeof fileName !== 'string' || typeof dataUrl !== 'string') {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: '잘못된 요청 형식입니다.' }));
          return;
        }

        const base = path.basename(fileName).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
        const safeName = /\.(jpe?g|png)$/i.test(base) ? base : `${base || '명함'}.jpg`;
        const match = dataUrl.match(/^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/);
        if (!match) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: '올바른 이미지 데이터가 아닙니다.' }));
          return;
        }

        const driveRoot = path.parse(NAMECARD_SAVE_DIR).root;
        if (!fs.existsSync(driveRoot)) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: `드라이브(${driveRoot})에 접근할 수 없습니다.` }));
          return;
        }

        fs.mkdirSync(NAMECARD_SAVE_DIR, { recursive: true });
        const targetPath = path.resolve(NAMECARD_SAVE_DIR, safeName);
        if (!targetPath.startsWith(path.resolve(NAMECARD_SAVE_DIR) + path.sep)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: '유효하지 않은 파일 경로입니다.' }));
          return;
        }

        const buffer = Buffer.from(match[2], 'base64');
        fs.writeFileSync(targetPath, buffer);
        res.end(JSON.stringify({
          ok: true,
          fileName: safeName,
          path: targetPath,
          targetDir: NAMECARD_SAVE_DIR
        }));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, error: err?.message || '파일 저장 중 오류가 발생했습니다.' }));
      }
    });
  });
};

const namecardSavePlugin = () => ({
  name: 'namecard-local-save',
  configureServer(server) {
    registerNamecardMiddleware(server.middlewares);
  },
  configurePreviewServer(server) {
    registerNamecardMiddleware(server.middlewares);
  }
});

// 자동 새로고침을 위한 버전 관리 플러그인
// 앱이 최신 버전인지 확인하기 위해 배포/실행될 때마다 새로운 시간값을 가진 version.json을 제공합니다.
const versionUpdatePlugin = () => {
  return {
    name: 'version-update',
    // 1. 실제 배포용으로 빌드(npm run build)할 때 dist 폴더 안에 version.json을 생성합니다.
    generateBundle() {
      const versionInfo = JSON.stringify({
        version: BUILD_TIMESTAMP
      });
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: versionInfo
      });
    },
    // 2. 개발 모드(npm run dev)일 때는 가상으로 /version.json 요청에 응답합니다.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/version.json') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.end(JSON.stringify({ version: BUILD_TIMESTAMP }));
        } else {
          next();
        }
      });
    }
  };
};

export default defineConfig({
  plugins: [react(), versionUpdatePlugin(), namecardSavePlugin()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(BUILD_TIMESTAMP)
  },
  server: {
    port: 3000,
    open: true
  }
});
