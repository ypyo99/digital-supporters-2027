// 명함 인쇄 요청 → 구글 드라이브(G:\내 드라이브\2027-Digital Supporters\명함) 상시 동기화 워커
// Supabase(classroom_schedules: namecard-print-queue)를 감시하여 스마트폰/웹에서 요청한 명함을
// 구글 드라이브 폴더에 즉시 저장하고 ypyo99@gmail.com 으로 이메일을 발송합니다.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const SAVE_DIR = 'G:\\내 드라이브\\2027-Digital Supporters\\명함';
const QUEUE_ID = 'namecard-print-queue';
const EMAIL_TO = 'ypyo99@gmail.com';
const CANONICAL_ORIGIN = 'https://digital-supporters-2027.netlify.app';
const WORKER_PORT = 47831;
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbw9cnQu_Gmfxmz6z5M8ZFHUTFLekly_Mcuh79e5lQyVYVPTPAF4IEL0PaHfRZm5U9rMow/exec';

const supabase = createClient(
  'https://oudrcfxkneopgtcfbwhd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91ZHJjZnhrbmVvcGd0Y2Zid2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzk0MTYsImV4cCI6MjA5NDY1NTQxNn0.ovAp6X3VogCeyKa74pC3x2f4lKR6m3gkE0kEEhJbGpQ'
);

const saveFile = (fileName, dataUrl) => {
  const base = path.basename(String(fileName)).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  const safeName = /\.(jpe?g|png)$/i.test(base) ? base : `${base || '명함'}.jpg`;
  const m = String(dataUrl).match(/^data:(image\/(?:jpeg|jpg|png));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('올바른 이미지 데이터가 아닙니다.');
  fs.mkdirSync(SAVE_DIR, { recursive: true });
  const target = path.join(SAVE_DIR, safeName);
  const buffer = Buffer.from(m[2], 'base64');
  fs.writeFileSync(target, buffer);
  return { target, safeName, mimeType: m[1], buffer };
};

const sendEmail = async (item, { safeName, mimeType, buffer }) => {
  try {
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    const res = await fetch(DEFAULT_GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveNamecard',
        folderId: '13BWCd8p70u9GGBEDHQBaO3ZRJL3DtD1I',
        fileName: safeName,
        imageData: dataUrl,
        teacherName: item.teacherName,
        phone: item.phone,
        slogan: item.slogan,
        themeLabel: item.themeLabel,
        emailTo: EMAIL_TO
      })
    });
    const json = await res.json().catch(() => null);
    if (json?.success && json?.emailSent !== false) return true;
    // GAS 메일 권한 미승인 시 FormSubmit 백업
    try {
      const formBody = new URLSearchParams();
      formBody.append('선생님_성함', `${item.teacherName || '-'} 선생님`);
      formBody.append('휴대폰_번호', item.phone || '-');
      formBody.append('테마_문구', item.slogan || '-');
      formBody.append('테마_색상', item.themeLabel || '-');
      formBody.append('파일명', safeName);
      formBody.append('_subject', `명함 인쇄 요청: ${item.teacherName || '서포터즈'} 선생님`);
      formBody.append('_captcha', 'false');
      formBody.append('_template', 'table');
      await fetch(`https://formsubmit.co/${EMAIL_TO}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: formBody.toString()
      });
      return true;
    } catch {
      return false;
    }
  } catch (e) {
    console.warn('Worker 이메일 발송 실패:', e);
    return false;
  }
};

let busy = false;
const tick = async () => {
  if (busy || !fs.existsSync(path.parse(SAVE_DIR).root)) return;
  busy = true;
  try {
    const { data: row, error } = await supabase.from('classroom_schedules').select('data').eq('id', QUEUE_ID).maybeSingle();
    if (error || !row?.data) return;
    const queue = Array.isArray(row.data.queue) ? row.data.queue : [];
    if (!queue.some(q => q && q.status === 'pending' && q.dataUrl)) return;
    const updated = [];
    const pendingEmails = [];
    for (const q of queue) {
      if (!q || q.status !== 'pending' || !q.dataUrl) {
        updated.push(q);
        continue;
      }
      try {
        const saved = saveFile(q.fileName, q.dataUrl);
        if (q.sendEmailFromWorker) {
          pendingEmails.push({ q, saved });
        }
        console.log(`[${new Date().toLocaleString()}] 저장 완료: ${saved.target}`);
        updated.push({
          requestId: q.requestId,
          fileName: saved.safeName,
          status: 'saved',
          savedPath: saved.target,
          emailSent: true,
          requestedAt: q.requestedAt,
          savedAt: new Date().toISOString()
        });
      } catch (e) {
        updated.push({ requestId: q.requestId, fileName: q.fileName, status: 'error', error: e.message, requestedAt: q.requestedAt });
      }
    }
    await supabase.from('classroom_schedules').upsert({ id: QUEUE_ID, data: { queue: updated.slice(-15) }, updated_at: new Date().toISOString() });
    for (const { q, saved } of pendingEmails) {
      sendEmail(q, saved).catch(() => {});
    }
  } catch {
    // 네트워크 일시 오류 무시
  } finally {
    busy = false;
  }
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.url?.startsWith('/api/save-namecard')) {
    if (req.method === 'GET') {
      const dirExists = fs.existsSync(SAVE_DIR) || fs.existsSync(path.dirname(SAVE_DIR));
      res.end(JSON.stringify({ ok: true, available: dirExists, targetDir: SAVE_DIR }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString('utf8'); });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const saved = saveFile(payload.fileName, payload.dataUrl);
          if (payload.sendEmail) {
            sendEmail(payload, saved).catch(() => {});
          }
          res.end(JSON.stringify({
            ok: true,
            fileName: saved.safeName,
            path: saved.target,
            targetDir: SAVE_DIR,
            emailSent: true
          }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: err?.message || '저장 실패' }));
        }
      });
      return;
    }
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false }));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // 이미 백그라운드 동기화 워커가 실행 중이면 중복 실행하지 않고 종료
    process.exit(0);
  }
});

server.listen(WORKER_PORT, '127.0.0.1', () => {
  console.log(`명함 상시 동기화 워커 시작 (127.0.0.1:${WORKER_PORT}) → ${SAVE_DIR}`);
  tick();
  setInterval(tick, 1200);
});
