import React, { useEffect, useRef, useState } from 'react';
import { fetchDailyHumor, wasHumorShownToday, markHumorShownToday } from '../utils/dailyHumor';

// 같은 실행(페이지 로드) 안에서 중복 요청을 막기 위한 플래그
let autoAttemptedThisSession = false;

/**
 * 하루에 한 번, 앱 실행 시 Gemini로 생성한 유머 + 디지털서포터즈 격려 글귀를 보여주는 팝업.
 * - apiKey가 없으면 아무것도 하지 않습니다.
 * - paused가 true(예: 설정창이 열려 있음)인 동안에는 자동 표시를 미룹니다.
 * - previewRequest 값이 바뀌면 오늘 표시 여부와 상관없이 새 유머를 불러와 보여줍니다(설정창 미리보기용).
 */
const DailyHumorPopup = ({ apiKey, paused = false, teacherName = '', previewRequest = 0 }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = async ({ forceNew = false, markShown = false } = {}) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchDailyHumor(apiKey, { forceNew });
      if (!mountedRef.current) return;
      setContent(result);
      setOpen(true);
      if (markShown) markHumorShownToday();
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn('오늘의 유머 불러오기 실패:', err);
      setError(err?.message || '유머를 불러오지 못했습니다.');
      if (!markShown) setOpen(true); // 미리보기 요청일 때만 오류를 보여줌
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // 앱 실행 시 하루 한 번 자동 표시
  useEffect(() => {
    if (!apiKey || paused || autoAttemptedThisSession) return;
    if (wasHumorShownToday()) return;
    autoAttemptedThisSession = true;
    load({ markShown: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, paused]);

  // 설정창의 "미리보기" 요청
  useEffect(() => {
    if (!previewRequest || !apiKey) return;
    load({ forceNew: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewRequest]);

  if (!open) return null;

  const close = () => setOpen(false);

  return (
    <div
      className="fixed inset-0 bg-slate-900/55 backdrop-blur-[3px] flex items-center justify-center z-[90] p-4"
      onClick={close}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn border border-amber-200"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-humor-title"
      >
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[28px] leading-none" aria-hidden="true">😄</span>
            <div>
              <h3 id="daily-humor-title" className="font-extrabold text-[18px] text-white tracking-tight leading-tight">
                오늘의 유머
              </h3>
              <p className="text-[12.5px] font-bold text-white/90 leading-tight mt-0.5">
                잠깐 웃고 시작해요!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-1 rounded-lg text-white hover:bg-white/20 active:scale-90 transition"
            aria-label="닫기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-4 text-left">
          {loading && !content && (
            <div className="py-8 text-center text-[14.5px] font-bold text-slate-500">유머를 준비하는 중...</div>
          )}

          {error && !content && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[13.5px] font-bold text-rose-700 break-words">
              유머를 불러오지 못했습니다.<br />
              <span className="font-medium text-rose-600">{error}</span>
            </div>
          )}

          {content && (
            <>
              <p className="text-[16px] sm:text-[17px] leading-relaxed font-bold text-slate-800 whitespace-pre-line">
                {content.humor}
              </p>
              {content.encouragement && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                  <span className="text-[20px] leading-none mt-0.5" aria-hidden="true">💚</span>
                  <p className="text-[14.5px] sm:text-[15px] leading-snug font-bold text-emerald-800">
                    {teacherName ? `${teacherName} 선생님, ` : ''}{content.encouragement}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => load({ forceNew: true })}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-[13.5px] font-extrabold border border-slate-300 text-slate-600 hover:bg-white disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? '불러오는 중...' : '다른 유머 보기'}
          </button>
          <button
            type="button"
            onClick={close}
            className="px-6 py-2.5 rounded-xl text-[14px] sm:text-[15px] font-extrabold bg-orange-500 hover:bg-orange-600 text-white shadow-sm active:scale-95 transition cursor-pointer"
          >
            오늘도 화이팅!
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyHumorPopup;
