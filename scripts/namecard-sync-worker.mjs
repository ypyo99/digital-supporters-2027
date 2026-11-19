// 명함 인쇄 요청 → 구글 드라이브(G:\내 드라이브\2027-Digital Supporters\명함) 동기화 워커
// 스마트폰에서 [인쇄 요청]한 명함을 Supabase 큐에서 받아 PC의 구글 드라이브 폴더에 저장합니다.
// 실행: node scripts/namecard-sync-worker.mjs  (또는 명함동기화.bat 더블클릭)
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const SAVE_DIR = 'G:\\내 드라이브\\2027-Digital Supporters\\명함';
const QUEUE_ID = 'namecard-print-queue';
const supabase = createClient(
  'https://oudrcfxkneopgtcfbwhd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91ZHJjZnhrbmVvcGd0Y2Zid2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzk0MTYsImV4cCI6MjA5NDY1NTQxNn0.ovAp6X3VogCeyKa74pC3x2f4lKR6m3gkE0kEEhJbGpQ'
);

const saveFile = (fileName, dataUrl) => {
  const base = path.basename(String(fileName)).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  const safeName = /\.(jpe?g|png)$/i.test(base) ? base : `${base || '명함'}.jpg`;
  const m = String(dataUrl).match(/^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('올바른 이미지 데이터가 아닙니다.');
  fs.mkdirSync(SAVE_DIR, { recursive: true });
  const target = path.join(SAVE_DIR, safeName);
  fs.writeFileSync(target, Buffer.from(m[2], 'base64'));
  return target;
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
    const updated = queue.map(q => {
      if (!q || q.status !== 'pending' || !q.dataUrl) return q;
      try {
        const savedPath = saveFile(q.fileName, q.dataUrl);
        console.log(`[${new Date().toLocaleString()}] 저장: ${savedPath}`);
        return { requestId: q.requestId, fileName: q.fileName, status: 'saved', savedPath, requestedAt: q.requestedAt, savedAt: new Date().toISOString() };
      } catch (e) {
        return { requestId: q.requestId, fileName: q.fileName, status: 'error', error: e.message, requestedAt: q.requestedAt };
      }
    });
    await supabase.from('classroom_schedules').upsert({ id: QUEUE_ID, data: { queue: updated.slice(-20) }, updated_at: new Date().toISOString() });
  } catch {
    // 네트워크 일시 오류 무시
  } finally {
    busy = false;
  }
};

console.log(`명함 동기화 워커 시작 → ${SAVE_DIR}`);
tick();
setInterval(tick, 1500);
