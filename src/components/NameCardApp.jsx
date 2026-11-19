// 디지털교육서포터즈 명함 만들기 (ypyo99/ds-namecard 통합)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Home } from './Icons';
import { SEOUL_SYMBOL_BASE64 } from '../utils/seoulSymbolBase64';
import { getGlobalTeachersList, getSavedItem } from '../utils/helpers';

const TARGET_NAMECARD_DIR = 'G:\\내 드라이브\\2027-Digital Supporters\\명함';
const STORAGE_KEY = 'ds_card_custom_defaults_v2';
const IDB_NAME = 'ds_namecard_fs_v1';
const IDB_STORE = 'handles';
const IDB_KEY = 'saveDir';

const OPTIMAL_PRESET = {
  sizes: {
    logo: 60,
    org: 27,
    name: 58,
    title: 33,
    slogan: 21,
    contact: 29.5
  },
  nameColorPercent: 4 // #151E2E (다크 차콜)
};

const COMPONENT_CONFIGS = [
  { key: 'logo', label: '로고', defaultVal: 60, min: 24, max: 110, step: 2, sliderStep: 1 },
  { key: 'org', label: '기관명', defaultVal: 27, min: 14, max: 42, step: 1, sliderStep: 1 },
  { key: 'name', label: '성함', defaultVal: 58, min: 24, max: 78, step: 2, sliderStep: 1 },
  { key: 'title', label: '직책', defaultVal: 33, min: 14, max: 42, step: 1, sliderStep: 1 },
  { key: 'slogan', label: '부제문구', defaultVal: 21, min: 11, max: 28, step: 1, sliderStep: 1 },
  { key: 'contact', label: '연락처', defaultVal: 29.5, min: 14, max: 38, step: 1, sliderStep: 0.5 }
];

const CONFIG_MAP = Object.fromEntries(COMPONENT_CONFIGS.map(c => [c.key, c]));

const clampSize = (key, val) => {
  const cfg = CONFIG_MAP[key];
  if (!cfg) return val;
  return Math.max(cfg.min, Math.min(cfg.max, Math.round(val * 10) / 10));
};

const calculateGrayColor = (percent) => {
  const t = Math.max(0, Math.min(100, percent)) / 100;
  const r = Math.round(16 + (148 - 16) * t);
  const g = Math.round(24 + (163 - 24) * t);
  const b = Math.round(40 + (184 - 40) * t);
  const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join('');

  let desc = '기본 블랙';
  if (percent === 0) desc = '기본 블랙';
  else if (percent < 25) desc = '다크 차콜';
  else if (percent < 50) desc = '딥 그레이';
  else if (percent < 75) desc = '미디엄 그레이';
  else desc = '라이트 그레이';

  return { hex, desc };
};

const getActiveDefaults = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.sizes) {
        return {
          sizes: { ...OPTIMAL_PRESET.sizes, ...parsed.sizes },
          nameColorPercent: parsed.nameColorPercent !== undefined
            ? parsed.nameColorPercent
            : OPTIMAL_PRESET.nameColorPercent
        };
      }
    }
  } catch (e) {
    console.warn('localStorage 읽기 실패:', e);
  }
  return OPTIMAL_PRESET;
};

const formatDisplayName = (rawName) => {
  const trimmed = (rawName || '').trim();
  if (!trimmed) {
    return { text: '이름', trackingClass: 'tracking-[0.25em]' };
  }
  if (trimmed.length === 2) {
    return { text: `${trimmed[0]} ${trimmed[1]}`, trackingClass: 'tracking-[0.18em]' };
  }
  if (trimmed.length === 3) {
    return { text: trimmed, trackingClass: 'tracking-[0.06em]' };
  }
  return { text: trimmed, trackingClass: 'tracking-[0.02em]' };
};

// IndexedDB helpers for FileSystemDirectoryHandle persistence
const openFsDb = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('IndexedDB unavailable'));
    return;
  }
  const req = indexedDB.open(IDB_NAME, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(IDB_STORE)) {
      db.createObjectStore(IDB_STORE);
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const loadSavedDirHandle = async () => {
  try {
    const db = await openFsDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const persistDirHandle = async (handle) => {
  try {
    const db = await openFsDb();
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore IndexedDB errors
  }
};

const dataUrlToBlob = (dataUrl) => {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

const drawRightNavyPanelOnCanvas = (canvas) => {
  const s = canvas.width / 900;
  const pw = 250;
  const ph = 500;
  const ox = (900 - pw) * s;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(ox, 0);

  ctx.beginPath();
  ctx.rect(0, 0, pw * s, ph * s);
  ctx.clip();

  const baseGrad = ctx.createLinearGradient(0, 0, pw * 0.3 * s, ph * s);
  baseGrad.addColorStop(0, '#1B3A6F');
  baseGrad.addColorStop(0.45, '#122B55');
  baseGrad.addColorStop(1, '#08142D');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, pw * s, ph * s);

  const topGlow = ctx.createRadialGradient(
    pw * 0.85 * s,
    ph * 0.08 * s,
    0,
    pw * 0.85 * s,
    ph * 0.08 * s,
    pw * 1.2 * s
  );
  topGlow.addColorStop(0, 'rgba(65, 110, 168, 0.55)');
  topGlow.addColorStop(1, 'rgba(27, 58, 111, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, pw * s, ph * s);

  const cx = 254 * s;
  const cy = 510 * s;

  ctx.beginPath();
  ctx.arc(cx, cy, 238 * s, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(24, 67, 125, 0.52)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 135 * s, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14, 35, 74, 0.72)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 80 * s, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(7, 18, 42, 0.88)';
  ctx.fill();

  const orbits = [
    { r: 290.0, color: 'rgba(80, 126, 186, 0.35)', w: 1.2 },
    { r: 238.0, color: 'rgba(92, 139, 204, 0.45)', w: 1.3 },
    { r: 178.0, color: 'rgba(123, 168, 232, 0.75)', w: 1.6 },
    { r: 116.0, color: 'rgba(80, 126, 186, 0.45)', w: 1.3 },
    { r: 66.0, color: 'rgba(80, 126, 186, 0.30)', w: 1.2 }
  ];

  orbits.forEach(orb => {
    ctx.beginPath();
    ctx.arc(cx, cy, orb.r * s, 0, Math.PI * 2);
    ctx.strokeStyle = orb.color;
    ctx.lineWidth = orb.w * s;
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.arc(110.0 * s, 405.0 * s, 9.5 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#F58220';
  ctx.fill();

  const bx = 42.0 * s;
  const by = 48.0 * s;
  const bw = 40.0 * s;
  const bh = 5.0 * s;
  const br = 2.5 * s;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(bx, by, bw, bh, br);
  } else {
    ctx.rect(bx, by, bw, bh);
  }
  ctx.fillStyle = '#F58220';
  ctx.fill();

  const texts = [
    { text: 'DIGITAL', y: 80.0 * s, opacity: 1.0 },
    { text: 'EDUCATION', y: 106.0 * s, opacity: 1.0 },
    { text: 'SUPPORTERS', y: 132.0 * s, opacity: 0.88 }
  ];

  const fontSize = 16.0 * s;
  const letterSpacing = 3.2 * s;
  ctx.font = `800 ${fontSize}px "Outfit", "Noto Sans KR", sans-serif`;
  ctx.textBaseline = 'alphabetic';

  texts.forEach(item => {
    ctx.fillStyle = `rgba(255, 255, 255, ${item.opacity})`;
    let curX = bx;
    for (let i = 0; i < item.text.length; i++) {
      const ch = item.text[i];
      ctx.fillText(ch, curX, item.y);
      curX += ctx.measureText(ch).width + letterSpacing;
    }
  });

  ctx.restore();
};

export default function NameCardApp({ onNavigateBack }) {
  const initialDefaults = useRef(getActiveDefaults()).current;
  const [nameInput, setNameInput] = useState('표영');
  const [phoneInput, setPhoneInput] = useState('010-2687-7190');
  const [sizes, setSizes] = useState(() => ({ ...initialDefaults.sizes }));
  const [nameColorPercent, setNameColorPercent] = useState(() => initialDefaults.nameColorPercent);
  const [cardScale, setCardScale] = useState(1);

  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null); // { type: 'success' | 'error', text: string }
  const [defaultSavedToast, setDefaultSavedToast] = useState(false);

  const [localApiAvailable, setLocalApiAvailable] = useState(false);
  const [dirHandle, setDirHandle] = useState(null);
  const [teacherOptions, setTeacherOptions] = useState([]);

  const cardWrapRef = useRef(null);
  const cardRef = useRef(null);
  const pressTimerRef = useRef(null);
  const pressIntervalRef = useRef(null);

  // Check local Vite save endpoint & saved FileSystemDirectoryHandle + teachers list
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/save-namecard', { method: 'GET' });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (active && data?.ok && data?.available) {
            setLocalApiAvailable(true);
          }
        }
      } catch {
        // Not running against local Vite middleware
      }

      const savedHandle = await loadSavedDirHandle();
      if (active && savedHandle) {
        setDirHandle(savedHandle);
      }

      const list = getGlobalTeachersList() || [];
      if (active && list.length > 0) {
        const uniqueNames = Array.from(new Set(
          list
            .filter(t => t.is_active !== false && t.name)
            .map(t => t.name.replace(/\n/g, ' ').trim())
        ));
        setTeacherOptions(uniqueNames);
      }

      const savedTeacher = (getSavedItem('sungdong_teacher', '') || '').replace(/\n/g, ' ').trim();
      if (active && savedTeacher) {
        setNameInput(savedTeacher);
      }
    })();
    return () => { active = false; };
  }, []);

  // Responsive card scaling
  useEffect(() => {
    const updateScale = () => {
      const containerWidth = cardWrapRef.current
        ? cardWrapRef.current.clientWidth
        : Math.max(280, window.innerWidth - 32);
      const avail = Math.min(900, containerWidth);
      setCardScale(Math.min(1, avail / 900));
    };

    updateScale();
    let ro;
    if (typeof ResizeObserver !== 'undefined' && cardWrapRef.current) {
      ro = new ResizeObserver(updateScale);
      ro.observe(cardWrapRef.current);
    }
    window.addEventListener('resize', updateScale);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const stopAdjusting = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (pressIntervalRef.current) {
      clearInterval(pressIntervalRef.current);
      pressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => stopAdjusting, [stopAdjusting]);

  const adjustSize = useCallback((key, delta) => {
    setSizes(prev => ({
      ...prev,
      [key]: clampSize(key, (prev[key] ?? CONFIG_MAP[key].defaultVal) + delta)
    }));
  }, []);

  const startAdjusting = (key, delta) => {
    stopAdjusting();
    adjustSize(key, delta);
    pressTimerRef.current = setTimeout(() => {
      pressIntervalRef.current = setInterval(() => {
        adjustSize(key, delta);
      }, 70);
    }, 300);
  };

  const handleResetDefaults = () => {
    const target = getActiveDefaults();
    setSizes({ ...target.sizes });
    setNameColorPercent(target.nameColorPercent);
  };

  const handleSaveAsDefault = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sizes, nameColorPercent }));
      setDefaultSavedToast(true);
      setTimeout(() => setDefaultSavedToast(false), 1600);
    } catch (e) {
      console.warn('localStorage 저장 실패:', e);
    }
  };

  const handleConnectFolder = async () => {
    if (typeof window.showDirectoryPicker !== 'function') {
      alert('현재 브라우저에서는 폴더 직접 연결을 지원하지 않습니다. PC용 Chrome 또는 Edge를 사용해 주세요.');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({
        id: 'ds-namecard-dir',
        mode: 'readwrite'
      });
      await persistDirHandle(handle);
      setDirHandle(handle);
      setSaveFeedback({
        type: 'success',
        text: `저장 폴더(${handle.name})가 연결되었습니다. 이제 저장 버튼 클릭 시 이 폴더에 바로 저장됩니다.`
      });
      setTimeout(() => setSaveFeedback(null), 3500);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        alert('폴더 연결 중 오류가 발생했습니다: ' + err.message);
      }
    }
  };

  const triggerBrowserDownload = (dataUrl, fileName) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadOrSave = async () => {
    if (!cardRef.current || isSaving) return;

    setIsSaving(true);
    setSaveFeedback(null);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#faf9f6',
        logging: false,
        onclone: (doc) => {
          const cs = doc.getElementById('card-scale');
          const cf = doc.getElementById('card-fit');
          if (cs) cs.style.transform = 'none';
          if (cf) {
            cf.style.width = '900px';
            cf.style.height = '500px';
            cf.style.maxWidth = 'none';
          }
        }
      });

      drawRightNavyPanelOnCanvas(canvas);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
      const safeTeacherName = (nameInput.trim() || '디지털교육서포터즈').replace(/[<>:"/\\|?*]/g, '_');
      const fileName = `${safeTeacherName}_디지털교육서포터즈_명함(9x5cm).jpg`;

      // 1. 로컬 PC 서버(/api/save-namecard)를 통해 G:\내 드라이브\2027-Digital Supporters\명함 에 직접 저장
      if (localApiAvailable) {
        try {
          const res = await fetch('/api/save-namecard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName, dataUrl })
          });
          const data = await res.json();
          if (res.ok && data?.ok) {
            setSaveFeedback({
              type: 'success',
              text: `${data.path} 에 저장 완료!`
            });
            return;
          }
          throw new Error(data?.error || '로컬 폴더 저장 실패');
        } catch (localErr) {
          console.warn('로컬 직접 저장 실패, 대체 저장 시도:', localErr);
        }
      }

      // 2. 브라우저에서 연결된 저장 폴더(FileSystemDirectoryHandle)가 있으면 직접 저장
      if (dirHandle) {
        try {
          let perm = await dirHandle.queryPermission({ mode: 'readwrite' });
          if (perm !== 'granted') {
            perm = await dirHandle.requestPermission({ mode: 'readwrite' });
          }
          if (perm === 'granted') {
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(dataUrlToBlob(dataUrl));
            await writable.close();
            setSaveFeedback({
              type: 'success',
              text: `연결된 폴더(${dirHandle.name})에 '${fileName}' 저장 완료!`
            });
            return;
          }
        } catch (fsErr) {
          console.warn('연결된 폴더 저장 실패, 브라우저 다운로드로 대체:', fsErr);
        }
      }

      // 3. 기본 브라우저 파일 다운로드
      triggerBrowserDownload(dataUrl, fileName);
      setSaveFeedback({
        type: 'success',
        text: `'${fileName}' 파일이 다운로드되었습니다.`
      });
    } catch (err) {
      console.error('명함 이미지 생성 오류:', err);
      setSaveFeedback({
        type: 'error',
        text: '명함 이미지 생성 중 오류가 발생했습니다: ' + err.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  const { hex: nameColorHex, desc: nameColorDesc } = calculateGrayColor(nameColorPercent);
  const { text: formattedName, trackingClass } = formatDisplayName(nameInput);
  const displayPhone = phoneInput.trim() || '010-2687-7190';

  const contactLabelSize = (sizes.contact * (18.5 / 26.5)).toFixed(1);
  const contactIconSize = (sizes.contact * (24 / 26.5)).toFixed(1);
  const subOrgSize = (sizes.org * (18.5 / 27)).toFixed(1);

  return (
    <div className="min-h-[100dvh] flex flex-col app-surface font-sans text-slate-800 pb-10">
      <style>{`
        .ds-namecard-font { font-family: 'Noto Sans KR', 'Pretendard Variable', sans-serif; }
        .name-color-slider {
          background: linear-gradient(to right, #101828 0%, #334155 30%, #64748B 60%, #94A3B8 85%, #CBD5E1 100%);
          outline: none;
        }
        .name-color-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #13386E;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
          cursor: pointer;
        }
        .name-color-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #13386E;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
          cursor: pointer;
        }
      `}</style>

      {/* 앱 공통 상단 헤더 */}
      <header className="app-header text-white z-40 relative shrink-0">
        <div className="max-w-5xl lg:max-w-[1536px] mx-auto px-2.5 sm:px-5 pt-safe-4 pb-4 flex justify-between items-start relative">
          <div className="flex items-center">
            <div className="flex flex-col">
              <div className="flex items-center mb-1">
                <img
                  src="/Logo_of_Seoul.jpg"
                  alt="서울시 로고"
                  className="h-7 hdr-logo object-contain mr-2 shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <h1 className="font-black text-xl leading-tight">성동노인종합복지관</h1>
              </div>
              <p className="text-lg font-semibold text-yellow-300">디지털교육 서포터즈</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateBack}
            className="text-xs flex flex-col items-center font-bold p-2 rounded-lg shadow-md transition-all touch-manipulation hdr-btn shrink-0 cursor-pointer"
          >
            <Home className="w-5 h-5 mb-1" /> 처음으로
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[940px] mx-auto px-2.5 sm:px-5 pt-4 flex flex-col items-center">
        {/* 상단 제목 */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 px-1 mb-3">
          <h2 className="text-[19px] sm:text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2.5" />
                <circle cx="8" cy="11.5" r="2" />
                <path d="M5.5 16a3 3 0 0 1 5 0M14 10h4.5M14 14h3.5" />
              </svg>
            </span>
            <span>서포터즈 명함 만들기</span>
          </h2>
          <span className="text-xs text-slate-600 font-bold bg-white border border-slate-300 px-3 py-1 rounded-full shadow-xs">
            9×5cm · 300DPI 고해상도 JPG
          </span>
        </div>

        {/* 컨트롤 패널 */}
        <div className="w-full bg-white rounded-2xl p-4 sm:p-5 mb-5 shadow-sm border border-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3.5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#13386E]" />
              </span>
              <h3 className="text-slate-800 font-extrabold text-base">명함 정보 수정 및 저장</h3>
            </div>

            {teacherOptions.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) setNameInput(e.target.value);
                }}
                className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#13386E] cursor-pointer"
                aria-label="선생님 명단에서 이름 선택"
              >
                <option value="">선생님 명단에서 선택...</option>
                {teacherOptions.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5 md:col-span-4">
              <label htmlFor="input-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                선생님 성함
              </label>
              <input
                id="input-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="성함 입력"
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-sky-50 border border-sky-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13386E] font-bold transition-all"
              />
            </div>

            <div className="col-span-7 md:col-span-4">
              <label htmlFor="input-phone" className="block text-xs font-bold text-slate-700 mb-1.5">
                휴대폰 번호
              </label>
              <input
                id="input-phone"
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-sky-50 border border-sky-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13386E] font-bold transition-all"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <button
                type="button"
                onClick={handleDownloadOrSave}
                disabled={isSaving}
                className="w-full py-2.5 px-4 bg-[#13386E] hover:bg-[#1a4484] active:scale-[0.98] disabled:opacity-70 text-white text-sm font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isSaving ? '고해상도 저장 중...' : '고해상도 JPG 저장'}</span>
              </button>
            </div>
          </div>

          {/* 저장 경로 안내 및 폴더 연결 바 */}
          <div className="mt-3 p-2.5 sm:px-3.5 rounded-xl bg-slate-50 border border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0 text-slate-700 font-semibold">
              <span className="shrink-0">📁 저장 위치:</span>
              <code className="text-[11.5px] font-bold text-[#13386E] bg-white px-2 py-0.5 rounded border border-slate-200 truncate">
                {TARGET_NAMECARD_DIR}
              </code>
              {localApiAvailable ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] shrink-0">
                  자동 저장 연결됨
                </span>
              ) : dirHandle ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] shrink-0">
                  폴더 연결됨 ({dirHandle.name})
                </span>
              ) : null}
            </div>

            {!localApiAvailable && typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function' && (
              <button
                type="button"
                onClick={handleConnectFolder}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-[#13386E] border border-slate-300 font-bold text-xs transition cursor-pointer shrink-0"
              >
                {dirHandle ? '저장 폴더 변경' : '저장 폴더 연결'}
              </button>
            )}
          </div>

          {saveFeedback && (
            <div className={`mt-2.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border ${
              saveFeedback.type === 'error'
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}>
              {saveFeedback.text}
            </div>
          )}

          {/* 이름 폰트색 (회색계열) 슬라이더 */}
          <div className="mt-3.5 p-3 bg-slate-50/90 rounded-xl border border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="range-name-color" className="text-xs font-bold text-slate-700 cursor-pointer">
                이름 폰트색 (회색계열)
              </label>
              <span
                className="w-4 h-4 rounded-full border border-slate-400 inline-block"
                style={{ backgroundColor: nameColorHex }}
              />
              <span className="text-[11px] font-extrabold text-[#13386E] font-mono bg-white border border-slate-300 px-2 py-0.5 rounded">
                {nameColorHex} ({nameColorDesc})
              </span>
            </div>

            <div className="flex-1 flex items-center gap-2.5 max-w-[420px]">
              <span className="text-[10.5px] font-bold text-slate-500 whitespace-nowrap">블랙</span>
              <input
                type="range"
                id="range-name-color"
                min={0}
                max={100}
                step={1}
                value={nameColorPercent}
                onChange={(e) => setNameColorPercent(parseFloat(e.target.value))}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer name-color-slider"
              />
              <span className="text-[10.5px] font-bold text-slate-500 whitespace-nowrap">밝은 회색</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setNameColorPercent(4)}
                className={`px-2 py-1 text-[11px] font-bold border rounded-lg transition cursor-pointer ${
                  nameColorPercent === 4
                    ? 'bg-blue-50 border-blue-300 text-[#13386E]'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                다크 차콜(#151E2E)
              </button>
              <button
                type="button"
                onClick={() => setNameColorPercent(0)}
                className={`px-2 py-1 text-[11px] font-bold border rounded-lg transition cursor-pointer ${
                  nameColorPercent === 0
                    ? 'bg-blue-50 border-blue-300 text-[#13386E]'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                기본 블랙
              </button>
            </div>
          </div>

          {/* 컴포넌트별 크기 조절 */}
          <div className="mt-4 pt-3.5 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">크기 조절</span>
                <span className="text-[11px] text-slate-500 hidden sm:inline">(버튼을 클릭하거나 꾹 누르면 연속 조절됩니다)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveAsDefault}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    defaultSavedToast
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#13386E] hover:bg-[#1a4484] text-white'
                  }`}
                >
                  {defaultSavedToast ? '기본값 저장 완료!' : '현재 설정 기본값 저장'}
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[11px] text-slate-700 hover:text-[#13386E] py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold border border-slate-300 transition cursor-pointer"
                >
                  기본값 복원
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {COMPONENT_CONFIGS.map(cfg => {
                const val = sizes[cfg.key] ?? cfg.defaultVal;
                return (
                  <div
                    key={cfg.key}
                    className="bg-slate-50 hover:bg-slate-100/80 transition-colors p-2.5 rounded-xl border border-slate-300 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-700">{cfg.label}</span>
                      <span className="text-[11px] font-extrabold text-[#13386E] bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono">
                        {val}px
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <button
                        type="button"
                        onMouseDown={(e) => { if (e.button === 0) startAdjusting(cfg.key, -cfg.step); }}
                        onMouseUp={stopAdjusting}
                        onMouseLeave={stopAdjusting}
                        onTouchStart={(e) => { e.preventDefault(); startAdjusting(cfg.key, -cfg.step); }}
                        onTouchEnd={stopAdjusting}
                        onTouchCancel={stopAdjusting}
                        className="flex-1 py-1 bg-white hover:bg-blue-50 active:scale-90 border border-slate-300 rounded-lg text-slate-700 hover:text-[#13386E] font-bold text-xs transition select-none cursor-pointer"
                        title={`${cfg.label} 축소`}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { if (e.button === 0) startAdjusting(cfg.key, cfg.step); }}
                        onMouseUp={stopAdjusting}
                        onMouseLeave={stopAdjusting}
                        onTouchStart={(e) => { e.preventDefault(); startAdjusting(cfg.key, cfg.step); }}
                        onTouchEnd={stopAdjusting}
                        onTouchCancel={stopAdjusting}
                        className="flex-1 py-1 bg-white hover:bg-blue-50 active:scale-90 border border-slate-300 rounded-lg text-slate-700 hover:text-[#13386E] font-bold text-xs transition select-none cursor-pointer"
                        title={`${cfg.label} 확대`}
                      >
                        +
                      </button>
                    </div>
                    <input
                      type="range"
                      min={cfg.min}
                      max={cfg.max}
                      step={cfg.sliderStep}
                      value={val}
                      onChange={(e) => {
                        const next = parseFloat(e.target.value);
                        setSizes(prev => ({ ...prev, [cfg.key]: clampSize(cfg.key, next) }));
                      }}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#13386E]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 명함 본체 미리보기 (900x500px, 9:5 비율 반응형 축소) */}
        <div ref={cardWrapRef} className="w-full max-w-[900px] flex justify-center">
          <div
            id="card-fit"
            style={{
              width: `${900 * cardScale}px`,
              height: `${500 * cardScale}px`,
              position: 'relative'
            }}
          >
            <div
              id="card-scale"
              style={{
                width: '900px',
                height: '500px',
                transformOrigin: 'top left',
                transform: `scale(${cardScale})`
              }}
            >
              <div
                id="business-card"
                ref={cardRef}
                className="ds-namecard-font relative w-[900px] h-[500px] bg-[#faf9f6] overflow-hidden box-border rounded-[6px]"
                style={{
                  boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 0 1px 1px rgba(0, 0, 0, 0.04)'
                }}
              >
                {/* 우측 네이비 테크/궤도 패널 */}
                <svg
                  id="deco-svg"
                  data-html2canvas-ignore="true"
                  className="absolute top-0 right-0 w-[250px] h-[500px] pointer-events-none"
                  viewBox="0 0 250 500"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="panelBaseGrad" x1="0" y1="0" x2="0.3" y2="1">
                      <stop offset="0%" stopColor="#1B3A6F" />
                      <stop offset="45%" stopColor="#122B55" />
                      <stop offset="100%" stopColor="#08142D" />
                    </linearGradient>
                    <radialGradient id="topHighlight" cx="0.85" cy="0.08" r="0.75">
                      <stop offset="0%" stopColor="#416EA8" stopOpacity="0.55" />
                      <stop offset="60%" stopColor="#1B3A6F" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <rect width="250" height="500" fill="url(#panelBaseGrad)" />
                  <rect width="250" height="500" fill="url(#topHighlight)" />

                  <circle cx="254" cy="510" r="238" fill="#18437D" opacity="0.52" />
                  <circle cx="254" cy="510" r="135" fill="#0E234A" opacity="0.72" />
                  <circle cx="254" cy="510" r="80" fill="#07122A" opacity="0.88" />

                  <circle cx="254" cy="510" r="290" fill="none" stroke="#507EBA" strokeWidth="1.2" opacity="0.35" />
                  <circle cx="254" cy="510" r="238" fill="none" stroke="#5C8BCC" strokeWidth="1.3" opacity="0.45" />
                  <circle cx="254" cy="510" r="178" fill="none" stroke="#7BA8E8" strokeWidth="1.6" opacity="0.75" />
                  <circle cx="254" cy="510" r="116" fill="none" stroke="#507EBA" strokeWidth="1.3" opacity="0.45" />
                  <circle cx="254" cy="510" r="66" fill="none" stroke="#507EBA" strokeWidth="1.2" opacity="0.30" />

                  <circle cx="110" cy="405" r="9.5" fill="#F58220" />
                  <rect x="42" y="48" width="40" height="5" rx="2.5" fill="#F58220" />

                  <text x="42" y="80" fill="#FFFFFF" fontFamily="'Outfit', sans-serif" fontWeight="800" fontSize="16" letterSpacing="3.2">DIGITAL</text>
                  <text x="42" y="106" fill="#FFFFFF" fontFamily="'Outfit', sans-serif" fontWeight="800" fontSize="16" letterSpacing="3.2">EDUCATION</text>
                  <text x="42" y="132" fill="#FFFFFF" opacity="0.88" fontFamily="'Outfit', sans-serif" fontWeight="800" fontSize="16" letterSpacing="3.2">SUPPORTERS</text>
                </svg>

                {/* 좌측 메인 콘텐츠 영역 */}
                <div className="h-full flex flex-col justify-between pt-[40px] pb-[38px] pl-[60px] pr-[270px]">
                  {/* 1. 헤더 (서울시 심볼 로고 & 기관명) */}
                  <div className="flex items-center">
                    <img
                      id="card-logo"
                      src={SEOUL_SYMBOL_BASE64}
                      alt="서울시 로고"
                      style={{ height: `${sizes.logo}px` }}
                      className="w-auto mr-[18px] object-contain"
                    />
                    <div>
                      <div
                        style={{ fontSize: `${subOrgSize}px` }}
                        className="font-medium text-[#1E2530] leading-none mb-1.5 tracking-[-0.01em]"
                      >
                        사회복지법인 서울가톨릭사회복지회
                      </div>
                      <div
                        style={{ fontSize: `${sizes.org}px` }}
                        className="font-extrabold text-[#101726] leading-none tracking-[-0.02em]"
                      >
                        시립성동노인종합복지관
                      </div>
                    </div>
                  </div>

                  {/* 2. 중앙 메인 텍스트 (성함, 직책, 부제) */}
                  <div className="mt-1">
                    <div className="flex items-baseline flex-wrap">
                      <div
                        id="card-name"
                        style={{ fontSize: `${sizes.name}px`, color: nameColorHex }}
                        className={`font-black leading-none whitespace-nowrap ${trackingClass}`}
                      >
                        {formattedName}
                      </div>
                      <div
                        style={{ fontSize: `${sizes.title}px` }}
                        className="font-extrabold text-[#13386E] ml-6 whitespace-nowrap tracking-[-0.01em] pb-0.5"
                      >
                        디지털교육서포터즈
                      </div>
                    </div>
                    <div
                      style={{ fontSize: `${sizes.slogan}px` }}
                      className="font-medium text-[#1E2738] mt-3.5 tracking-[-0.01em]"
                    >
                      배우는 기쁨, 쓰는 즐거움! 디지털로 일상에 재미를 더해 드려요
                    </div>
                  </div>

                  {/* 3. 구분선 및 하단 연락처 */}
                  <div>
                    <div className="w-[530px] border-t-[1.5px] border-[#CBD5E1] mb-5" />
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center">
                        <svg
                          style={{ width: `${contactIconSize}px`, height: `${contactIconSize}px` }}
                          className="text-[#13386E] shrink-0"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M4.5 7.2c.2-1.5 1.5-2.6 3-2.3l1.8.4c1.1.2 1.9 1.2 1.8 2.3l-.4 1.6c-.2.7-.6 1.2-1.2 1.4-.2.1-.5.3-.7.5 1.1 2.2 2.9 4 5.1 5.1.2-.2.4-.5.5-.7.2-.6.7-1 1.4-1.2l1.6-.4c1.1-.2 2.1.6 2.3 1.8l.4 1.8c.3 1.5-.8 2.8-2.3 3-1.3.2-2.7.1-4.2-.6-3.3-1.5-6.1-4.3-7.6-7.6-.7-1.5-.8-2.9-.6-4.2z" />
                          <path d="M15 7c1.3.7 2.3 1.7 3 3" fill="none" stroke="#13386E" strokeWidth="2.6" strokeLinecap="round" />
                          <path d="M15 3.5c2.9.9 5.3 3.3 6.2 6.2" fill="none" stroke="#13386E" strokeWidth="2.6" strokeLinecap="round" />
                        </svg>
                        <span
                          style={{ fontSize: `${contactLabelSize}px` }}
                          className="font-bold text-[#13386E] ml-3 mr-4 tracking-[-0.01em]"
                        >
                          휴대폰
                        </span>
                        <span
                          style={{ fontSize: `${sizes.contact}px` }}
                          className="font-extrabold text-[#0A0F1D] tracking-[0.03em] font-sans"
                        >
                          {displayPhone}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <svg
                          style={{ width: `${contactIconSize}px`, height: `${contactIconSize}px` }}
                          className="text-[#13386E] shrink-0"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <rect x="2" y="2.5" width="12" height="19" rx="0.6" />
                          <rect x="6.5" y="15.5" width="3" height="6" fill="#faf9f6" />
                          <rect x="4.2" y="5" width="2.8" height="2.8" rx="0.3" fill="#faf9f6" />
                          <rect x="9" y="5" width="2.8" height="2.8" rx="0.3" fill="#faf9f6" />
                          <rect x="4.2" y="8.8" width="2.8" height="2.8" rx="0.3" fill="#faf9f6" />
                          <rect x="9" y="8.8" width="2.8" height="2.8" rx="0.3" fill="#faf9f6" />
                          <rect x="4.2" y="12.6" width="2.8" height="2.8" rx="0.3" fill="#faf9f6" />
                          <rect x="9" y="12.6" width="2.8" height="2.8" rx="0.3" fill="#faf9f6" />
                          <rect x="15.2" y="8" width="6" height="13.5" rx="0.6" />
                          <rect x="17" y="10" width="2.4" height="2.4" rx="0.3" fill="#faf9f6" />
                          <rect x="17" y="13.5" width="2.4" height="2.4" rx="0.3" fill="#faf9f6" />
                          <rect x="17" y="17" width="2.4" height="2.4" rx="0.3" fill="#faf9f6" />
                          <rect x="1" y="20.5" width="22" height="1.8" rx="0.4" />
                        </svg>
                        <span
                          style={{ fontSize: `${contactLabelSize}px` }}
                          className="font-bold text-[#13386E] ml-3 mr-4 tracking-[-0.01em]"
                        >
                          복지관
                        </span>
                        <span
                          style={{ fontSize: `${sizes.contact}px` }}
                          className="font-extrabold text-[#0A0F1D] tracking-[0.03em] font-sans"
                        >
                          02-2298-5117
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
