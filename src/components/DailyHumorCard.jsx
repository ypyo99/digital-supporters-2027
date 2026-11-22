import React from 'react';

/**
 * 오늘의 안내 팝업 안에 들어가는 "오늘의 유머 + 격려 글귀" 카드.
 */
const DailyHumorCard = ({ content, loading, error, teacherName = '', onRefresh }) => (
  <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[20px] leading-none" aria-hidden="true">😄</span>
        <h4 className="font-extrabold text-[15.5px] sm:text-[16.5px] text-amber-900">오늘의 유머</h4>
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="text-[12.5px] font-bold text-amber-700 hover:underline disabled:opacity-50 whitespace-nowrap"
        >
          {loading && content ? '불러오는 중...' : '다른 유머 보기'}
        </button>
      )}
    </div>

    {loading && !content && (
      <div className="py-3 text-center text-[13.5px] font-bold text-amber-700/80">유머를 준비하는 중...</div>
    )}

    {error && !content && !loading && (
      <div className="text-[13px] font-bold text-rose-700 break-words">
        유머를 불러오지 못했습니다. <span className="font-medium text-rose-600">{error}</span>
      </div>
    )}

    {content && (
      <>
        <p className="text-[15px] sm:text-[16px] leading-relaxed font-bold text-slate-800 whitespace-pre-line">
          {content.humor}
        </p>
        {content.encouragement && (
          <div className="p-2.5 rounded-lg bg-white/80 border border-emerald-200 flex items-start gap-2">
            <span className="text-[16px] leading-none mt-0.5" aria-hidden="true">💚</span>
            <p className="text-[13.5px] sm:text-[14px] leading-snug font-bold text-emerald-800">
              {teacherName ? `${teacherName} 선생님, ` : ''}{content.encouragement}
            </p>
          </div>
        )}
      </>
    )}
  </div>
);

export default DailyHumorCard;
