import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';

const BUILD_TIMESTAMP = new Date().getTime().toString();
const NAMECARD_SAVE_DIR = 'G:\\내 드라이브\\2027-Digital Supporters\\명함';
const NAMECARD_QUEUE_ID = 'namecard-print-queue';
const NAMECARD_EMAIL_TO = 'ypyo99@gmail.com';
const CANONICAL_ORIGIN = 'https://digital-supporters-2027.netlify.app';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://oudrcfxkneopgtcfbwhd.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91ZHJjZnhrbmVvcGd0Y2Zid2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzk0MTYsImV4cCI6MjA5NDY1NTQxNn0.ovAp6X3VogCeyKa74pC3x2f4lKR6m3gkE0kEEhJbGpQ';

const formatTeacherDisplayName = (rawName = '') => {
  const trimmed = String(rawName || '').trim() || '디지털교육서포터즈';
  return trimmed.replace(/\s*선생님\s*$/, '').trim() || '디지털교육서포터즈';
};

const sendNamecardPrintEmail = async ({
  teacherName = '',
  phone = '',
  slogan = '',
  themeLabel = '',
  fileName = '명함.jpg',
  dataUrl = ''
}) => {
  const match = String(dataUrl).match(/^data:(image\/(?:jpeg|jpg|png));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error('올바른 이미지 데이터가 아닙니다.');
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const cleanTeacher = formatTeacherDisplayName(teacherName);
  const subject = `명함 인쇄 요청: ${cleanTeacher} 선생님`;
  const base = path.basename(String(fileName)).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  const safeName = /\.(jpe?g|png)$/i.test(base) ? base : `${base || '명함'}.jpg`;

  let envVars = {};
  try {
    envVars = loadEnv('development', process.cwd(), '');
  } catch {
    // ignore loadEnv errors
  }

  const gmailAppPassword =
    process.env.GMAIL_APP_PASSWORD ||
    process.env.VITE_GMAIL_APP_PASSWORD ||
    envVars.GMAIL_APP_PASSWORD ||
    envVars.VITE_GMAIL_APP_PASSWORD ||
    '';
  const gmailUser =
    process.env.GMAIL_USER ||
    envVars.GMAIL_USER ||
    NAMECARD_EMAIL_TO;

  if (gmailAppPassword) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });

    const html = `
      <div style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #1e293b; max-width: 640px; line-height: 1.6;">
        <h2 style="margin: 0 0 12px 0; color: #0f294a;">${subject}</h2>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
          디지털교육서포터즈 명함(9x5cm, 300DPI) 인쇄 요청이 접수되었습니다.
        </p>
        <table style="border-collapse: collapse; width: 100%; margin-bottom: 18px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 700; width: 110px;">선생님 성함</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${cleanTeacher} 선생님</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 700;">휴대폰 번호</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${phone || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 700;">테마 문구</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${slogan || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 700;">이미지 색상</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${themeLabel || '-'}</td>
          </tr>
        </table>
        <div style="margin-top: 12px;">
          <p style="margin: 0 0 8px 0; font-weight: 700; font-size: 13px; color: #334155;">[명함 이미지 미리보기 및 첨부파일]</p>
          <img src="cid:namecard_inline" alt="${safeName}" style="max-width: 560px; width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 10px; display: block;" />
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"디지털교육서포터즈 명함" <${gmailUser}>`,
      to: NAMECARD_EMAIL_TO,
      subject,
      text: `${subject}\n\n선생님 성함: ${cleanTeacher} 선생님\n휴대폰 번호: ${phone || '-'}\n테마 문구: ${slogan || '-'}\n이미지 색상: ${themeLabel || '-'}\n\n첨부된 명함 이미지(${safeName})를 확인해 주세요.`,
      html,
      attachments: [
        {
          filename: safeName,
          content: buffer,
          contentType: mimeType,
          cid: 'namecard_inline'
        }
      ]
    });

    return {
      ok: true,
      method: 'smtp',
      to: NAMECARD_EMAIL_TO,
      subject,
      needsActivation: false
    };
  }

  const fd = new FormData();
  fd.append('_subject', subject);
  fd.append('_template', 'table');
  fd.append('_captcha', 'false');
  fd.append('선생님_성함', `${cleanTeacher} 선생님`);
  fd.append('휴대폰_번호', phone || '-');
  fd.append('테마_문구', slogan || '-');
  fd.append('이미지_색상', themeLabel || '-');
  fd.append('attachment', new Blob([buffer], { type: mimeType }), safeName);

  const fsRes = await fetch(`https://formsubmit.co/${NAMECARD_EMAIL_TO}`, {
    method: 'POST',
    headers: {
      Origin: CANONICAL_ORIGIN,
      Referer: `${CANONICAL_ORIGIN}/`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    },
    body: fd
  });

  const fsText = await fsRes.text();
  const needsActivation = /Activate Form|needs Activation|activation/i.test(fsText);

  return {
    ok: fsRes.ok,
    method: 'formsubmit',
    to: NAMECARD_EMAIL_TO,
    subject,
    needsActivation
  };
};

const saveNamecardFileToDisk = (fileName, dataUrl) => {
  if (typeof fileName !== 'string' || typeof dataUrl !== 'string') {
    const err = new Error('잘못된 요청 형식입니다.');
    err.statusCode = 400;
    throw err;
  }

  const base = path.basename(fileName).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  const safeName = /\.(jpe?g|png)$/i.test(base) ? base : `${base || '명함'}.jpg`;
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    const err = new Error('올바른 이미지 데이터가 아닙니다.');
    err.statusCode = 400;
    throw err;
  }

  const driveRoot = path.parse(NAMECARD_SAVE_DIR).root;
  if (!fs.existsSync(driveRoot)) {
    const err = new Error(`드라이브(${driveRoot})에 접근할 수 없습니다.`);
    err.statusCode = 500;
    throw err;
  }

  fs.mkdirSync(NAMECARD_SAVE_DIR, { recursive: true });
  const targetPath = path.resolve(NAMECARD_SAVE_DIR, safeName);
  if (!targetPath.startsWith(path.resolve(NAMECARD_SAVE_DIR) + path.sep)) {
    const err = new Error('유효하지 않은 파일 경로입니다.');
    err.statusCode = 400;
    throw err;
  }

  const buffer = Buffer.from(match[2], 'base64');
  fs.writeFileSync(targetPath, buffer);
  return {
    ok: true,
    fileName: safeName,
    path: targetPath,
    targetDir: NAMECARD_SAVE_DIR
  };
};

const startNamecardSupabaseSync = (server) => {
  if (globalThis.__namecardSyncTimer) {
    clearInterval(globalThis.__namecardSyncTimer);
    globalThis.__namecardSyncTimer = null;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let isSyncing = false;

  const syncOnce = async () => {
    if (isSyncing) return;
    const driveRoot = path.parse(NAMECARD_SAVE_DIR).root;
    if (!fs.existsSync(driveRoot)) return;

    isSyncing = true;
    try {
      const { data: row, error } = await supabase
        .from('classroom_schedules')
        .select('data')
        .eq('id', NAMECARD_QUEUE_ID)
        .maybeSingle();

      if (error || !row?.data) return;
      const queue = Array.isArray(row.data.queue) ? row.data.queue : [];
      const hasPending = queue.some(item => item && item.status === 'pending' && item.dataUrl && item.fileName);
      if (!hasPending) return;

      let changed = false;
      const updatedQueue = [];
      for (const item of queue) {
        if (!item || item.status !== 'pending' || !item.dataUrl || !item.fileName) {
          updatedQueue.push(item);
          continue;
        }
        changed = true;
        try {
          const saved = saveNamecardFileToDisk(item.fileName, item.dataUrl);
          let emailResult = null;
          if (!item.emailSentByServerless) {
            try {
              emailResult = await sendNamecardPrintEmail({
                teacherName: item.teacherName,
                phone: item.phone,
                slogan: item.slogan,
                themeLabel: item.themeLabel,
                fileName: saved.fileName,
                dataUrl: item.dataUrl
              });
            } catch {
              // ignore email error if file saved
            }
          }
          updatedQueue.push({
            requestId: item.requestId,
            fileName: saved.fileName,
            status: 'saved',
            savedPath: saved.path,
            targetDir: saved.targetDir,
            emailSent: Boolean(item.emailSentByServerless || emailResult?.ok),
            emailSubject: emailResult?.subject || `명함 인쇄 요청: ${formatTeacherDisplayName(item.teacherName)} 선생님`,
            needsActivation: Boolean(emailResult?.needsActivation),
            requestedAt: item.requestedAt,
            savedAt: new Date().toISOString()
          });
        } catch (saveErr) {
          updatedQueue.push({
            requestId: item.requestId,
            fileName: item.fileName,
            status: 'error',
            error: saveErr?.message || '파일 저장 중 오류가 발생했습니다.',
            requestedAt: item.requestedAt,
            savedAt: new Date().toISOString()
          });
        }
      }

      if (changed) {
        await supabase
          .from('classroom_schedules')
          .upsert({
            id: NAMECARD_QUEUE_ID,
            data: { queue: updatedQueue.slice(-20) },
            updated_at: new Date().toISOString()
          });
      }
    } catch {
      // Ignore transient network errors during background sync
    } finally {
      isSyncing = false;
    }
  };

  syncOnce();
  const timer = setInterval(syncOnce, 1200);
  globalThis.__namecardSyncTimer = timer;

  server?.httpServer?.once('close', () => {
    clearInterval(timer);
    if (globalThis.__namecardSyncTimer === timer) {
      globalThis.__namecardSyncTimer = null;
    }
  });
};

const registerNamecardMiddleware = (middlewares) => {
  middlewares.use('/api/save-namecard', (req, res) => {
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

    req.on('end', async () => {
      if (aborted) return;
      try {
        const {
          fileName,
          dataUrl,
          teacherName = '',
          phone = '',
          slogan = '',
          themeLabel = ''
        } = JSON.parse(body || '{}');
        const saved = saveNamecardFileToDisk(fileName, dataUrl);
        let emailResult = null;
        try {
          emailResult = await sendNamecardPrintEmail({
            teacherName,
            phone,
            slogan,
            themeLabel,
            fileName: saved.fileName,
            dataUrl
          });
        } catch (mailErr) {
          emailResult = { ok: false, error: mailErr?.message };
        }
        res.end(JSON.stringify({
          ...saved,
          emailSent: Boolean(emailResult?.ok),
          emailTo: NAMECARD_EMAIL_TO,
          emailSubject: emailResult?.subject || `명함 인쇄 요청: ${formatTeacherDisplayName(teacherName)} 선생님`,
          needsActivation: Boolean(emailResult?.needsActivation)
        }));
      } catch (err) {
        res.statusCode = err?.statusCode || 500;
        res.end(JSON.stringify({ ok: false, error: err?.message || '파일 저장 중 오류가 발생했습니다.' }));
      }
    });
  });
};

const namecardSavePlugin = () => ({
  name: 'namecard-local-save',
  configureServer(server) {
    registerNamecardMiddleware(server.middlewares);
    startNamecardSupabaseSync(server);
  },
  configurePreviewServer(server) {
    registerNamecardMiddleware(server.middlewares);
    startNamecardSupabaseSync(server);
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
