// 디지털교육서포터즈 명함 만들기 (ypyo99/ds-namecard 통합)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Home } from './Icons';
import { SEOUL_SYMBOL_BASE64 } from '../utils/seoulSymbolBase64';
import { getGlobalTeachersList, getSavedItem } from '../utils/helpers';
import { supabaseClient } from '../utils/supabase';

const TARGET_NAMECARD_DIR = 'G:\\내 드라이브\\2027-Digital Supporters\\명함';
const NAMECARD_QUEUE_ID = 'namecard-print-queue';
const NAMECARD_EMAIL_TO = 'ypyo99@gmail.com';
const GOOGLE_DRIVE_FOLDER_ID = '13BWCd8p70u9GGBEDHQBaO3ZRJL3DtD1I';
const GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/u/0/folders/${GOOGLE_DRIVE_FOLDER_ID}`;
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwtz2B3wl9Bk3AgoPEO9Jz3PkPRAJEq11N28YW8fZC4x3oVo0ls1p9rkUxMEnL7_ak5Hg/exec';
const THEME_STORAGE_KEY = 'ds_card_panel_theme_v1';
const IDB_NAME = 'ds_namecard_fs_v1';
const IDB_STORE = 'handles';
const IDB_KEY = 'saveDir';

const CARD_SIZES = {
  logo: 60,
  org: 27,
  name: 58,
  title: 33,
  slogan: 21,
  contact: 29.5
};
const NAME_COLOR_HEX = '#151E2E';
const DEFAULT_SLOGAN = '배우는 기쁨, 쓰는 즐거움! 디지털로 일상에 재미를 더해 드려요';

const SLOGAN_PRESETS = [
  '천천히 배워도 괜찮아요! 손안의 스마트폰이 든든한 친구가 됩니다',
  '하나씩 차근차근, 함께 웃으며! 스마트폰이 쉬워지는 시간이에요',
  '몰라도 괜찮아요, 물어보세요! 친절하게 끝까지 알려 드릴게요',
  '오늘 배운 한 가지가 내일의 자신감! 즐거운 디지털 배움터입니다',
  '늦은 배움은 없어요! 지금 시작하는 스마트폰이 가장 빠릅니다',
  '누르고, 찍고, 보내고! 손끝으로 열리는 새로운 세상을 만나요',
  '배우는 재미, 써보는 기쁨! 스마트폰과 친해지는 행복한 시간',
  '어렵던 스마트폰이 놀이가 되는 곳! 즐겁게 배우고 신나게 써요',
  '손주와 영상통화, 친구와 단톡방! 디지털로 마음을 잇습니다',
  '사진 한 장, 메시지 한 줄! 소중한 사람과 더 가까워지는 방법',
  '멀리 있어도 가까이! 스마트폰으로 사랑을 전하는 법을 알려 드려요',
  '안부는 문자로, 웃음은 사진으로! 소통이 즐거워지는 스마트폰 교실',
  '기차표 예매부터 은행 업무까지! 혼자서도 척척 해내는 디지털 생활',
  '키오스크 앞에서도 당당하게! 생활 속 디지털이 쉬워집니다',
  '길 찾기, 병원 예약, 장보기까지! 스마트폰으로 편리한 하루를 만들어요',
  '내 손으로 직접 하는 기쁨! 디지털 자립을 함께 응원합니다',
  '스스로 해냈다는 뿌듯함! 그 순간을 위해 곁에서 도와드려요',
  '똑똑하게 쓰고 안전하게 지켜요! 스미싱·보이스피싱 걱정 끝',
  '의심되면 누르지 말고 물어보세요! 안전한 디지털 생활을 지켜드려요',
  '믿고 배우는 스마트폰 교실! 쉽고 안전하게 알려 드립니다',
  '어르신의 디지털 첫걸음, 함께 걷겠습니다! 언제든 편하게 찾아주세요',
  '열 번 물어도 열 번 웃으며! 마음까지 전하는 스마트폰 선생님',
  '디지털 세상의 친절한 길잡이! 모르는 건 언제든 물어보세요',
  '배움에 나이는 숫자일 뿐! 오늘도 한 뼘 더 자라는 우리',
  '함께라서 쉽고, 함께라서 즐거운! 복지관 스마트폰 교실입니다',
  '사진 꾸미고, 영상 만들고! 나만의 추억을 스마트폰에 담아요',
  '유튜브도, 카카오톡도 내 마음대로! 일상이 더 신나는 디지털 생활',
  '손안의 작은 세상, 활짝 열어 드려요! 매일매일 새로운 즐거움',
  '스마트폰 하나로 하루가 풍성하게! 재미와 편리함을 함께 배워요',
  '디지털로 젊어지는 마음! 배우는 즐거움이 일상의 활력이 됩니다'
];

const PANEL_THEMES = [
  {
    id: 'navy',
    label: '딥 네이비',
    swatch: '#1B3A6F',
    grad: ['#1B3A6F', '#122B55', '#08142D'],
    glowHex: '#416EA8',
    glowOpacity: 0.55,
    glowRgba: 'rgba(65, 110, 168, 0.55)',
    glowZeroRgba: 'rgba(27, 58, 111, 0)',
    crescents: ['rgba(24, 67, 125, 0.52)', 'rgba(14, 35, 74, 0.72)', 'rgba(7, 18, 42, 0.88)'],
    orbits: [
      { r: 290.0, color: 'rgba(80, 126, 186, 0.35)', w: 1.2 },
      { r: 238.0, color: 'rgba(92, 139, 204, 0.45)', w: 1.3 },
      { r: 178.0, color: 'rgba(123, 168, 232, 0.75)', w: 1.6 },
      { r: 116.0, color: 'rgba(80, 126, 186, 0.45)', w: 1.3 },
      { r: 66.0, color: 'rgba(80, 126, 186, 0.30)', w: 1.2 }
    ],
    accent: '#F58220'
  },
  {
    id: 'emerald',
    label: '에메랄드',
    swatch: '#0F766E',
    grad: ['#115E59', '#0D4A46', '#042F2E'],
    glowHex: '#2DD4BF',
    glowOpacity: 0.45,
    glowRgba: 'rgba(45, 212, 191, 0.45)',
    glowZeroRgba: 'rgba(17, 94, 89, 0)',
    crescents: ['rgba(15, 118, 110, 0.52)', 'rgba(19, 78, 74, 0.72)', 'rgba(4, 47, 46, 0.88)'],
    orbits: [
      { r: 290.0, color: 'rgba(94, 234, 212, 0.32)', w: 1.2 },
      { r: 238.0, color: 'rgba(45, 212, 191, 0.45)', w: 1.3 },
      { r: 178.0, color: 'rgba(153, 246, 228, 0.75)', w: 1.6 },
      { r: 116.0, color: 'rgba(94, 234, 212, 0.45)', w: 1.3 },
      { r: 66.0, color: 'rgba(94, 234, 212, 0.28)', w: 1.2 }
    ],
    accent: '#F59E0B'
  },
  {
    id: 'purple',
    label: '로열 퍼플',
    swatch: '#5B21B6',
    grad: ['#5B21B6', '#3B0764', '#1E1B4B'],
    glowHex: '#A78BFA',
    glowOpacity: 0.5,
    glowRgba: 'rgba(167, 139, 250, 0.50)',
    glowZeroRgba: 'rgba(91, 33, 182, 0)',
    crescents: ['rgba(109, 40, 217, 0.48)', 'rgba(59, 7, 100, 0.72)', 'rgba(30, 27, 75, 0.88)'],
    orbits: [
      { r: 290.0, color: 'rgba(167, 139, 250, 0.35)', w: 1.2 },
      { r: 238.0, color: 'rgba(196, 181, 253, 0.45)', w: 1.3 },
      { r: 178.0, color: 'rgba(221, 214, 254, 0.75)', w: 1.6 },
      { r: 116.0, color: 'rgba(167, 139, 250, 0.45)', w: 1.3 },
      { r: 66.0, color: 'rgba(167, 139, 250, 0.30)', w: 1.2 }
    ],
    accent: '#F472B6'
  },
  {
    id: 'burgundy',
    label: '버건디',
    swatch: '#881337',
    grad: ['#881337', '#581129', '#2A0815'],
    glowHex: '#FB7185',
    glowOpacity: 0.45,
    glowRgba: 'rgba(251, 113, 133, 0.45)',
    glowZeroRgba: 'rgba(136, 19, 55, 0)',
    crescents: ['rgba(159, 18, 57, 0.52)', 'rgba(76, 5, 25, 0.72)', 'rgba(42, 8, 21, 0.88)'],
    orbits: [
      { r: 290.0, color: 'rgba(253, 164, 175, 0.35)', w: 1.2 },
      { r: 238.0, color: 'rgba(251, 113, 133, 0.45)', w: 1.3 },
      { r: 178.0, color: 'rgba(254, 205, 211, 0.75)', w: 1.6 },
      { r: 116.0, color: 'rgba(253, 164, 175, 0.45)', w: 1.3 },
      { r: 66.0, color: 'rgba(253, 164, 175, 0.28)', w: 1.2 }
    ],
    accent: '#F59E0B'
  }
];

const getInitialThemeId = () => {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && PANEL_THEMES.some(t => t.id === saved)) return saved;
  } catch {
    // ignore storage errors
  }
  return 'navy';
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

const traceRoundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const loadImageElement = (src) =>
  new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const drawRightPanelOnCanvas = (canvas, theme, profileImg = null) => {
  const s = canvas.width / 900;
  const pw = 250;
  const ph = 500;
  const ox = (900 - pw) * s;
  const ctx = canvas.getContext('2d');
  const hasProfile = Boolean(profileImg && (profileImg.naturalWidth || profileImg.width));

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(ox, 0);

  ctx.beginPath();
  ctx.rect(0, 0, pw * s, ph * s);
  ctx.clip();

  const baseGrad = ctx.createLinearGradient(0, 0, pw * 0.3 * s, ph * s);
  baseGrad.addColorStop(0, theme.grad[0]);
  baseGrad.addColorStop(0.45, theme.grad[1]);
  baseGrad.addColorStop(1, theme.grad[2]);
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
  topGlow.addColorStop(0, theme.glowRgba);
  topGlow.addColorStop(1, theme.glowZeroRgba);
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, pw * s, ph * s);

  const cx = 254 * s;
  const cy = 510 * s;
  const crescentRadii = [238, 135, 80];

  crescentRadii.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r * s, 0, Math.PI * 2);
    ctx.fillStyle = theme.crescents[idx];
    ctx.fill();
  });

  theme.orbits.forEach(orb => {
    ctx.beginPath();
    ctx.arc(cx, cy, orb.r * s, 0, Math.PI * 2);
    ctx.strokeStyle = orb.color;
    ctx.lineWidth = orb.w * s;
    ctx.stroke();
  });

  const bx = (hasProfile ? 34.0 : 42.0) * s;
  const by = (hasProfile ? 34.0 : 48.0) * s;
  const bw = 40.0 * s;
  const bh = 5.0 * s;
  const br = 2.5 * s;
  traceRoundedRect(ctx, bx, by, bw, bh, br);
  ctx.fillStyle = theme.accent;
  ctx.fill();

  const texts = hasProfile
    ? [
        { text: 'DIGITAL', y: 63.0 * s, opacity: 1.0 },
        { text: 'EDUCATION', y: 86.0 * s, opacity: 1.0 },
        { text: 'SUPPORTERS', y: 109.0 * s, opacity: 0.9 }
      ]
    : [
        { text: 'DIGITAL', y: 80.0 * s, opacity: 1.0 },
        { text: 'EDUCATION', y: 106.0 * s, opacity: 1.0 },
        { text: 'SUPPORTERS', y: 132.0 * s, opacity: 0.88 }
      ];

  const fontSize = (hasProfile ? 15.0 : 16.0) * s;
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

  if (hasProfile) {
    const fx = 34.0 * s;
    const fy = 136.0 * s;
    const fw = 182.0 * s;
    const fh = 236.0 * s;
    const fr = 22.0 * s;
    const borderPad = 4.5 * s;

    // 외곽 그림자 및 흰색 액자 프레임
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 18 * s;
    ctx.shadowOffsetY = 8 * s;
    traceRoundedRect(
      ctx,
      fx - borderPad,
      fy - borderPad,
      fw + borderPad * 2,
      fh + borderPad * 2,
      fr + 3 * s
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.fill();
    ctx.restore();

    // 포인트 컬러 외곽 테두리
    ctx.save();
    traceRoundedRect(
      ctx,
      fx - borderPad - 1.5 * s,
      fy - borderPad - 1.5 * s,
      fw + (borderPad + 1.5 * s) * 2,
      fh + (borderPad + 1.5 * s) * 2,
      fr + 4.5 * s
    );
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2.0 * s;
    ctx.stroke();
    ctx.restore();

    // 프로필 사진 크롭(object-fit: cover) 렌더링
    ctx.save();
    traceRoundedRect(ctx, fx, fy, fw, fh, fr);
    ctx.clip();
    const iw = profileImg.naturalWidth || profileImg.width;
    const ih = profileImg.naturalHeight || profileImg.height;
    const scale = Math.max(fw / iw, fh / ih);
    const sw = fw / scale;
    const sh = fh / scale;
    const sx = (iw - sw) / 2;
    const sy = Math.max(0, (ih - sh) * 0.32);
    ctx.drawImage(profileImg, sx, sy, sw, sh, fx, fy, fw, fh);
    ctx.restore();

    // 하단 포인트 원
    ctx.beginPath();
    ctx.arc(125.0 * s, 434.0 * s, 7.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(110.0 * s, 405.0 * s, 9.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = theme.accent;
    ctx.fill();
  }

  ctx.restore();
};

const formatPhoneInput = (rawValue = '') => {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed || trimmed === '0' || trimmed === '01' || trimmed === '010' || trimmed === '010-') {
    return '010-';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits || digits === '0' || digits === '01' || digits === '010') {
    return '010-';
  }
  const tail = digits.startsWith('010') ? digits.slice(3, 11) : digits.slice(0, 8);
  if (!tail) return '010-';
  if (tail.length <= 4) return `010-${tail}`;
  return `010-${tail.slice(0, 4)}-${tail.slice(4, 8)}`;
};

export default function NameCardApp({ onNavigateBack }) {
  const [nameInput, setNameInput] = useState('표영');
  const [phoneInput, setPhoneInput] = useState('010-');
  const [sloganInput, setSloganInput] = useState(DEFAULT_SLOGAN);
  const [themeId, setThemeId] = useState(() => getInitialThemeId());
  const [cardScale, setCardScale] = useState(1);

  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null); // { type: 'success' | 'error', text: string }
  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profilePreviewDataUrl, setProfilePreviewDataUrl] = useState('');
  const [isPreviewFresh, setIsPreviewFresh] = useState(false);

  const [localApiAvailable, setLocalApiAvailable] = useState(false);
  const [localApiEndpoint, setLocalApiEndpoint] = useState('/api/save-namecard');
  const [dirHandle, setDirHandle] = useState(null);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [isSloganMenuOpen, setIsSloganMenuOpen] = useState(false);

  const cardWrapRef = useRef(null);
  const cardRef = useRef(null);
  const sloganMenuRef = useRef(null);
  const profileFileInputRef = useRef(null);

  useEffect(() => {
    if (!isSloganMenuOpen) return;
    const handlePointerDown = (e) => {
      if (sloganMenuRef.current && !sloganMenuRef.current.contains(e.target)) {
        setIsSloganMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isSloganMenuOpen]);

  // Check local Vite save endpoint & saved FileSystemDirectoryHandle + teachers list
  useEffect(() => {
    let active = true;
    (async () => {
      for (const candidateUrl of ['/api/save-namecard', 'http://localhost:3000/api/save-namecard', 'http://localhost:47831/api/save-namecard']) {
        try {
          const res = await fetch(candidateUrl, { method: 'GET' });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            if (active && data?.ok && data?.available) {
              setLocalApiEndpoint(candidateUrl);
              setLocalApiAvailable(true);
              break;
            }
          }
        } catch {
          // Next candidate
        }
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

  const activeTheme = PANEL_THEMES.find(t => t.id === themeId) || PANEL_THEMES[0];

  const handleSelectTheme = (id) => {
    setThemeId(id);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // ignore storage errors
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

  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfilePhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const captureCardsDataUrls = useCallback(async () => {
    if (!cardRef.current) return { defaultUrl: '', profileUrl: '' };
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

    let profileUrl = '';
    if (profilePhotoUrl) {
      const profileImg = await loadImageElement(profilePhotoUrl);
      if (profileImg) {
        const profileCanvas = document.createElement('canvas');
        profileCanvas.width = canvas.width;
        profileCanvas.height = canvas.height;
        const pCtx = profileCanvas.getContext('2d');
        pCtx.drawImage(canvas, 0, 0);
        drawRightPanelOnCanvas(profileCanvas, activeTheme, profileImg);
        profileUrl = profileCanvas.toDataURL('image/jpeg', 0.96);
      }
    }

    drawRightPanelOnCanvas(canvas, activeTheme, null);
    const defaultUrl = canvas.toDataURL('image/jpeg', 0.96);
    return { defaultUrl, profileUrl };
  }, [activeTheme, profilePhotoUrl]);

  // 스마트폰에서 명함 이미지를 길게 눌러 갤러리에 바로 저장할 수 있도록 실제 <img> 데이터를 자동 동기화
  useEffect(() => {
    let cancelled = false;
    setIsPreviewFresh(false);
    const timer = setTimeout(async () => {
      try {
        const { defaultUrl, profileUrl } = await captureCardsDataUrls();
        if (!cancelled) {
          if (defaultUrl) setPreviewDataUrl(defaultUrl);
          setProfilePreviewDataUrl(profileUrl || '');
          setIsPreviewFresh(true);
        }
      } catch (e) {
        console.warn('미리보기 이미지 생성 실패:', e);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nameInput, phoneInput, sloganInput, themeId, profilePhotoUrl, captureCardsDataUrls]);

  const handleDownloadOrSave = async (targetMode = 'auto') => {
    if (!cardRef.current || isSaving) return;

    setIsSaving(true);
    setSaveFeedback(null);

    try {
      const wantProfile =
        targetMode === 'profile' || (targetMode === 'auto' && Boolean(profilePhotoUrl));
      let dataUrl = '';
      if (isPreviewFresh) {
        dataUrl = wantProfile ? (profilePreviewDataUrl || previewDataUrl) : previewDataUrl;
      }
      if (!dataUrl) {
        const { defaultUrl, profileUrl } = await captureCardsDataUrls();
        if (defaultUrl) setPreviewDataUrl(defaultUrl);
        setProfilePreviewDataUrl(profileUrl || '');
        setIsPreviewFresh(true);
        dataUrl = wantProfile ? (profileUrl || defaultUrl) : defaultUrl;
      }
      const rawName = (nameInput.trim() || '디지털교육서포터즈').replace(/\s*선생님\s*$/, '').trim() || '디지털교육서포터즈';
      const safeTeacherName = rawName.replace(/[<>:"/\\|?*]/g, '_');
      const now = new Date();
      const pad2 = (n) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
      const timeStr = `${pad2(now.getHours())}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}`;
      const fileName = `${safeTeacherName}_명함_${dateStr}_${timeStr}.jpg`;
      const emailSubject = `명함 인쇄 요청: ${rawName} 선생님`;
      const currentPhone = formatPhoneInput(phoneInput);
      const currentThemeLabel = activeTheme?.label || '';

      // 1. 이메일 발송 (브라우저에서 FormSubmit 표준 엔드포인트로 multipart/form-data 첨부파일 직접 전송)
      const sendEmailFromBrowser = async () => {
        try {
          const fd = new FormData();
          fd.append('_subject', emailSubject);
          fd.append('_template', 'table');
          fd.append('_captcha', 'false');
          fd.append('선생님_성함', `${rawName} 선생님`);
          fd.append('휴대폰_번호', currentPhone);
          fd.append('테마_문구', sloganInput || '-');
          fd.append('이미지_색상', currentThemeLabel || '-');
          fd.append('attachment', dataUrlToBlob(dataUrl), fileName);

          // 표준 엔드포인트(https://formsubmit.co/...)는 파일 첨부(attachment)를 지원하며,
          // multipart/form-data는 CORS-safelisted 요청이므로 no-cors로 브라우저에서 직접 전송 가능
          await fetch(`https://formsubmit.co/${NAMECARD_EMAIL_TO}`, {
            method: 'POST',
            mode: 'no-cors',
            body: fd
          });
          return true;
        } catch (mailErr) {
          console.warn('브라우저 이메일 발송 실패:', mailErr);
          return false;
        }
      };

      // 2. 구글 드라이브 저장 (+ 로컬 PC인 경우 서버에서 인증된 Origin으로 이메일 동시 발송)
      const saveToDriveAndMail = async () => {
        // 2-1. PC(localhost)에서는 G:\ 드라이브에 직접 저장 + Node 서버에서 이메일 발송
        if (localApiAvailable) {
          try {
            const res = await fetch(localApiEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName,
                dataUrl,
                teacherName: rawName,
                phone: currentPhone,
                slogan: sloganInput,
                themeLabel: currentThemeLabel,
                sendEmail: true
              })
            });
            const data = await res.json();
            if (res.ok && data?.ok) {
              return {
                status: 'saved',
                path: data.path,
                emailSent: Boolean(data.emailSent)
              };
            }
          } catch (localErr) {
            console.warn('로컬 직접 저장 실패, 동기화 큐로 대체:', localErr);
          }
        }

        // 2-2. 스마트폰/배포 사이트(Netlify): 브라우저에서 즉시 이메일 발송 + Supabase 큐로 구글 드라이브 저장
        const isActivatedOrigin =
          typeof window !== 'undefined' &&
          window.location.origin === 'https://digital-supporters-2027.netlify.app';
        const browserMailPromise = sendEmailFromBrowser();

        const requestId = `nc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const { data: existingRow, error: fetchErr } = await supabaseClient
          .from('classroom_schedules')
          .select('data')
          .eq('id', NAMECARD_QUEUE_ID)
          .maybeSingle();
        if (fetchErr) {
          const mailOk = await browserMailPromise;
          return { status: 'error', error: '동기화 서버 연결 실패: ' + fetchErr.message, emailSent: mailOk };
        }

        const prevQueue = Array.isArray(existingRow?.data?.queue) ? existingRow.data.queue : [];
        const keptQueue = prevQueue
          .filter(item => item && item.fileName !== fileName)
          .map(item => (item.status === 'pending' ? item : { ...item, dataUrl: undefined }))
          .slice(-10);
        const nextQueue = [
          ...keptQueue,
          {
            requestId,
            fileName,
            dataUrl,
            teacherName: rawName,
            phone: currentPhone,
            slogan: sloganInput,
            themeLabel: currentThemeLabel,
            sendEmailFromWorker: !isActivatedOrigin,
            status: 'pending',
            requestedAt: new Date().toISOString()
          }
        ];
        const { error: upsertErr } = await supabaseClient
          .from('classroom_schedules')
          .upsert({ id: NAMECARD_QUEUE_ID, data: { queue: nextQueue }, updated_at: new Date().toISOString() });
        if (upsertErr) {
          const mailOk = await browserMailPromise;
          return { status: 'error', error: '저장 요청 전송 실패: ' + upsertErr.message, emailSent: mailOk };
        }

        const browserMailOk = await browserMailPromise;

        for (let attempt = 0; attempt < 8; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 750));
          const { data: checkRow } = await supabaseClient
            .from('classroom_schedules')
            .select('data')
            .eq('id', NAMECARD_QUEUE_ID)
            .maybeSingle();
          const queueList = Array.isArray(checkRow?.data?.queue) ? checkRow.data.queue : [];
          const matched = queueList.find(item => item && item.requestId === requestId);
          if (matched?.status === 'saved') {
            return {
              status: 'saved',
              path: matched.savedPath,
              emailSent: Boolean(browserMailOk || matched.emailSent)
            };
          }
          if (matched?.status === 'error') {
            return {
              status: 'error',
              error: matched.error || '구글 드라이브 저장 오류',
              emailSent: browserMailOk
            };
          }
        }
        return { status: 'queued', emailSent: browserMailOk };
      };

      const driveResult = await saveToDriveAndMail().catch(e => ({
        status: 'error',
        error: e.message,
        emailSent: false
      }));
      const emailOk = Boolean(driveResult.emailSent);

      const emailText = emailOk
        ? `✉️ ${NAMECARD_EMAIL_TO} 메일 발송 완료`
        : '✉️ 메일 발송 실패';
      let driveText;
      if (driveResult.status === 'saved') {
        driveText = `📁 구글 드라이브 저장 완료 (${driveResult.path || `${TARGET_NAMECARD_DIR}\\${fileName}`})`;
      } else if (driveResult.status === 'queued') {
        driveText = '📁 구글 드라이브 저장 대기 중 (사무실 PC 동기화가 켜지면 자동 저장됩니다)';
      } else {
        driveText = `📁 구글 드라이브 저장 실패: ${driveResult.error}`;
      }

      setSaveFeedback({
        type: emailOk && driveResult.status !== 'error' ? 'success' : 'error',
        text: `${emailText}\n${driveText}`
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

  const { text: formattedName, trackingClass } = formatDisplayName(nameInput);
  const displayPhone = formatPhoneInput(phoneInput);

  const sizes = CARD_SIZES;
  const nameColorHex = NAME_COLOR_HEX;
  const contactLabelSize = (sizes.contact * (18.5 / 26.5)).toFixed(1);
  const contactIconSize = (sizes.contact * (24 / 26.5)).toFixed(1);
  const subOrgSize = (sizes.org * (18.5 / 27)).toFixed(1);

  return (
    <div className="min-h-[100dvh] flex flex-col app-surface font-sans text-slate-800 pb-10">
      <style>{`
        .ds-namecard-font { font-family: 'Noto Sans KR', 'Pretendard Variable', sans-serif; }
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
          </div>

          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5 sm:col-span-6">
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

            <div className="col-span-7 sm:col-span-6">
              <label htmlFor="input-phone" className="block text-xs font-bold text-slate-700 mb-1.5">
                휴대폰 번호
              </label>
              <input
                id="input-phone"
                type="tel"
                inputMode="numeric"
                value={phoneInput}
                onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
                placeholder="010-"
                maxLength={13}
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-sky-50 border border-sky-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13386E] font-bold transition-all"
              />
            </div>

            <div className="col-span-12 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="select-slogan" className="block text-xs font-bold text-slate-700">
                  테마 문구 (이름 아래 문구)
                </label>
                {sloganInput !== DEFAULT_SLOGAN && (
                  <button
                    type="button"
                    onClick={() => setSloganInput(DEFAULT_SLOGAN)}
                    className="text-[11px] font-bold text-[#13386E] hover:underline cursor-pointer"
                  >
                    기본 문구로 복원
                  </button>
                )}
              </div>
              <div ref={sloganMenuRef} className="relative">
                <button
                  type="button"
                  id="select-slogan"
                  onClick={() => setIsSloganMenuOpen(prev => !prev)}
                  className="w-full px-3 py-2 text-sm sm:text-base text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#13386E] font-bold cursor-pointer transition-all flex items-center justify-between gap-2 text-left"
                  aria-label="추천 테마 문구 30선 선택"
                  aria-expanded={isSloganMenuOpen}
                >
                  <span className="truncate">
                    {SLOGAN_PRESETS.includes(sloganInput)
                      ? `${SLOGAN_PRESETS.indexOf(sloganInput) + 1}. ${sloganInput}`
                      : '-- 추천 테마 문구 30개 중에서 선택 --'}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isSloganMenuOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {isSloganMenuOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 max-h-64 overflow-y-auto bg-white border border-slate-300 rounded-xl shadow-xl z-50 divide-y divide-slate-100">
                    {SLOGAN_PRESETS.map((phrase, idx) => {
                      const isSelected = sloganInput === phrase;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSloganInput(phrase);
                            setIsSloganMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 text-left text-sm sm:text-base leading-snug break-words transition cursor-pointer ${isSelected
                            ? 'bg-blue-50 text-[#13386E] font-extrabold'
                            : 'text-slate-800 font-semibold hover:bg-slate-50 active:bg-slate-100'
                            }`}
                        >
                          <span className="text-slate-400 font-bold mr-1">{idx + 1}.</span>
                          {phrase}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <textarea
                id="input-slogan"
                rows={2}
                value={sloganInput}
                onChange={(e) => setSloganInput(e.target.value)}
                placeholder={DEFAULT_SLOGAN}
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-sky-50 border border-sky-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#13386E] font-medium leading-relaxed break-words whitespace-pre-wrap resize-none transition-all"
              />
            </div>

            {/* 이미지 색상 선택 (4가지) */}
            <div className="col-span-12 p-3 bg-slate-50/90 rounded-xl border border-slate-300 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-bold text-slate-700 shrink-0">이미지 색상</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 max-w-[540px]">
                {PANEL_THEMES.map(theme => {
                  const selected = theme.id === activeTheme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectTheme(theme.id)}
                      className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition cursor-pointer active:scale-95 ${selected
                        ? 'bg-white border-[#13386E] text-slate-900 ring-2 ring-[#13386E]/20 shadow-xs'
                        : 'bg-white/80 border-slate-300 text-slate-600 hover:bg-white hover:border-slate-400'
                        }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 shrink-0 flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${theme.grad[0]}, ${theme.grad[2]})` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                      </span>
                      <span className="whitespace-nowrap">{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 프로필사진 업로드 & 인쇄 요청 버튼 */}
            <div className="col-span-12 flex flex-col gap-2.5">
              <input
                ref={profileFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoUpload}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => profileFileInputRef.current?.click()}
                  className="py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 active:scale-[0.98] text-[#13386E] border border-indigo-300 text-sm font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                  <span>{profilePhotoUrl ? '프로필사진 변경' : '프로필사진'}</span>
                </button>

                {profilePhotoUrl && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl">
                    <img
                      src={profilePhotoUrl}
                      alt="업로드된 프로필"
                      className="w-7 h-7 rounded-lg object-cover border border-slate-300 shrink-0"
                    />
                    <span className="text-xs font-bold text-slate-700">프로필 사진 적용됨</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProfilePhotoUrl('');
                        setProfilePreviewDataUrl('');
                      }}
                      className="ml-1 px-2 py-0.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition"
                    >
                      사진 삭제
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleDownloadOrSave('default')}
                  disabled={isSaving}
                  className="flex-1 min-w-[160px] py-2.5 px-4 bg-[#13386E] hover:bg-[#1a4484] active:scale-[0.98] disabled:opacity-70 text-white text-sm font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isSaving ? '고해상도 저장 중...' : (profilePhotoUrl ? '기본 명함 인쇄 요청 (사진 없음)' : '인쇄 요청')}</span>
                </button>

                {profilePhotoUrl && (
                  <button
                    type="button"
                    onClick={() => handleDownloadOrSave('profile')}
                    disabled={isSaving}
                    className="flex-1 min-w-[180px] py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-70 text-white text-sm font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isSaving ? '고해상도 저장 중...' : '프로필사진 명함 인쇄 요청'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {saveFeedback && (
            <div className={`mt-2.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border whitespace-pre-line leading-relaxed ${saveFeedback.type === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-300'
              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}>
              {saveFeedback.text}
            </div>
          )}
        </div>

        {/* 명함 본체 미리보기 (900x500px, 9:5 비율 반응형 축소 + 스마트폰 길게 눌러 저장용 실제 <img> 오버레이) */}
        <div ref={cardWrapRef} className="w-full max-w-[900px] flex flex-col items-center gap-6">
          {/* 새로 추가: 업로드된 프로필 사진을 포함한 명함 */}
          {profilePhotoUrl && (
            <div className="w-full flex flex-col items-center">
              <div className="w-full flex items-center justify-between px-1 mb-2">
                <span className="text-xs sm:text-sm font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full">
                  프로필 사진 포함 명함 (이미지를 길게 누르면 스마트폰 갤러리에 저장됩니다)
                </span>
                <button
                  type="button"
                  onClick={() => handleDownloadOrSave('profile')}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer transition"
                >
                  이 명함 인쇄 요청
                </button>
              </div>
              <div
                style={{
                  width: `${900 * cardScale}px`,
                  height: `${500 * cardScale}px`,
                  position: 'relative'
                }}
              >
                {profilePreviewDataUrl ? (
                  <img
                    src={profilePreviewDataUrl}
                    alt={`${nameInput.trim() || '디지털교육서포터즈'}_프로필명함.jpg`}
                    className="w-full h-full object-contain rounded-[6px]"
                    style={{
                      WebkitTouchCallout: 'default',
                      boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 0 1px 1px rgba(0, 0, 0, 0.04)'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/80 rounded-[6px] border border-slate-300 text-sm font-bold text-slate-600">
                    프로필 사진 명함 생성 중...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 기존 명함 (프로필 사진 없이 만들고 싶은 사람을 위해 그대로 유지) */}
          <div className="w-full flex flex-col items-center">
            {profilePhotoUrl && (
              <div className="w-full flex items-center justify-between px-1 mb-2">
                <span className="text-xs sm:text-sm font-extrabold text-slate-700 bg-slate-100 border border-slate-300 px-3 py-1 rounded-full">
                  기본 명함 - 프로필 사진 없음 (이미지를 길게 누르면 스마트폰 갤러리에 저장됩니다)
                </span>
                <button
                  type="button"
                  onClick={() => handleDownloadOrSave('default')}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-[#13386E] hover:bg-[#1a4484] text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer transition"
                >
                  이 명함 인쇄 요청
                </button>
              </div>
            )}
            <div
              id="card-fit"
              style={{
                width: `${900 * cardScale}px`,
                height: `${500 * cardScale}px`,
                position: 'relative'
              }}
            >
            {previewDataUrl && (
              <img
                src={previewDataUrl}
                alt={`${nameInput.trim() || '디지털교육서포터즈'}_명함.jpg`}
                data-html2canvas-ignore="true"
                className={`absolute inset-0 w-full h-full object-contain rounded-[6px] z-20 transition-opacity duration-150 ${isPreviewFresh ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                style={{ WebkitTouchCallout: 'default' }}
              />
            )}
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
                {/* 우측 테크/궤도 패널 */}
                <svg
                  id="deco-svg"
                  data-html2canvas-ignore="true"
                  className="absolute top-0 right-0 w-[250px] h-[500px] pointer-events-none"
                  viewBox="0 0 250 500"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="panelBaseGrad" x1="0" y1="0" x2="0.3" y2="1">
                      <stop offset="0%" stopColor={activeTheme.grad[0]} />
                      <stop offset="45%" stopColor={activeTheme.grad[1]} />
                      <stop offset="100%" stopColor={activeTheme.grad[2]} />
                    </linearGradient>
                    <radialGradient id="topHighlight" cx="0.85" cy="0.08" r="0.75">
                      <stop offset="0%" stopColor={activeTheme.glowHex} stopOpacity={activeTheme.glowOpacity} />
                      <stop offset="60%" stopColor={activeTheme.grad[0]} stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <rect width="250" height="500" fill="url(#panelBaseGrad)" />
                  <rect width="250" height="500" fill="url(#topHighlight)" />

                  <circle cx="254" cy="510" r="238" fill={activeTheme.crescents[0]} />
                  <circle cx="254" cy="510" r="135" fill={activeTheme.crescents[1]} />
                  <circle cx="254" cy="510" r="80" fill={activeTheme.crescents[2]} />

                  {activeTheme.orbits.map((orb, idx) => (
                    <circle
                      key={idx}
                      cx="254"
                      cy="510"
                      r={orb.r}
                      fill="none"
                      stroke={orb.color}
                      strokeWidth={orb.w}
                    />
                  ))}

                  <circle cx="110" cy="405" r="9.5" fill={activeTheme.accent} />
                  <rect x="42" y="48" width="40" height="5" rx="2.5" fill={activeTheme.accent} />

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
                      className="font-medium text-[#1E2738] mt-3.5 tracking-[-0.01em] min-h-[26px] leading-snug whitespace-pre-wrap break-words"
                    >
                      {sloganInput}
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
        </div>
      </main>
    </div>
  );
}
