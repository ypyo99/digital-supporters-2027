// ==============================================================
// 2027년 역량활용사업 참여신청서 및 사전/사후설문지 일괄 인쇄 템플릿
// ==============================================================

const QUESTIONS = [
  { id: 1, domain: 'awareness', domainTitle: '디지털 인식', text: '나는 새로운 디지털 기기에 두려움 없이 잘 적응하는 편이다.' },
  { id: 2, domain: 'awareness', domainTitle: '디지털 인식', text: '나는 새로운 디지털 기기를 적극적으로 이용해 보는 편이다.' },
  { id: 3, domain: 'awareness', domainTitle: '디지털 인식', text: '나는 익숙하지 않은 디지털 기기를 사용할 때도 편안하다.' },
  { id: 4, domain: 'usage', domainTitle: '디지털 이용', text: '나는 스마트폰에서 화면/소리/보안/알림/와이파이 등 환경설정을 할 수 있다.' },
  { id: 5, domain: 'usage', domainTitle: '디지털 이용', text: '나는 스마트폰이나 컴퓨터에서 필요한 앱이나 프로그램을 설치하고 삭제할 수 있다.' },
  { id: 6, domain: 'usage', domainTitle: '디지털 이용', text: '나는 필요한 정보를 인터넷 검색을 통해 찾을 수 있다.' },
  { id: 7, domain: 'usage', domainTitle: '디지털 이용', text: '나는 유튜브 등 동영상 플랫폼에서 원하는 영상을 검색하고 시청할 수 있다.' },
  { id: 8, domain: 'usage', domainTitle: '디지털 이용', text: '병원·식당·기차 등을 모바일로 예약할 수 있다.' },
  { id: 9, domain: 'usage', domainTitle: '디지털 이용', text: '나는 송금, 간편결제 등 디지털 금융 서비스를 사용할 수 있다.' },
  { id: 10, domain: 'communication', domainTitle: '디지털 소통', text: '나는 메신저(카카오톡, 문자 등)을 활용하여 대화를 나누거나 사진, 파일 등을 전송할 수 있다.' },
  { id: 11, domain: 'communication', domainTitle: '디지털 소통', text: '나는 복지관·구청 등 일상생활에 필요한 안내 문자나 링크를 확인하고 활용할 수 있다.' },
  { id: 12, domain: 'communication', domainTitle: '디지털 소통', text: '나는 온라인 교육 또는 줌(Zoom) 수업에 참여 또는 활용할 수 있다.' },
  { id: 13, domain: 'citizenship', domainTitle: '디지털 시민성', text: '나는 의심되는 문자나 링크를 함부로 누르지 않는다.' },
  { id: 14, domain: 'citizenship', domainTitle: '디지털 시민성', text: '다른 사람의 사진이나 정보를 허락 없이 공유하면 안 된다는 것을 알고 있다.' },
  { id: 15, domain: 'citizenship', domainTitle: '디지털 시민성', text: '나는 스팸, 스미싱, 보이스피싱 등 사이버 범죄에 대응하는 방법(신고 등)을 알고 있다.' }
];

const DOMAIN_SECTIONS = [
  {
    key: 'awareness',
    title: '■ 디지털 인식',
    desc: '(핵심변화: 디지털에 대한 두려움 감소 및 자신감 향상)',
    range: '1번 ~ 3번 문항',
    headerBg: '#1e293b',
    badgeBg: '#334155',
    badgeColor: '#f1f5f9',
    qIds: [1, 2, 3],
    page: 1
  },
  {
    key: 'usage',
    title: '■ 디지털 이용',
    desc: '(핵심변화: 생활 속 디지털 활용 능력 향상)',
    range: '4번 ~ 9번 문항',
    headerBg: '#1e3a8a',
    badgeBg: '#1d4ed8',
    badgeColor: '#eff6ff',
    qIds: [4, 5, 6, 7, 8, 9],
    page: 1
  },
  {
    key: 'communication',
    title: '■ 디지털 소통',
    desc: '(핵심변화: 가족·사회와의 소통 확대)',
    range: '10번 ~ 12번 문항',
    headerBg: '#312e81',
    badgeBg: '#3730a3',
    badgeColor: '#e0e7ff',
    qIds: [10, 11, 12],
    page: 2
  },
  {
    key: 'citizenship',
    title: '■ 디지털 시민성',
    desc: '(핵심변화: 안전한 디지털 사용 습관 형성)',
    range: '13번 ~ 15번 문항',
    headerBg: '#134e4a',
    badgeBg: '#115e59',
    badgeColor: '#ccfbf1',
    qIds: [13, 14, 15],
    page: 2
  }
];

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -------------------------------------------------------------
// 1. 참여 신청서 HTML 렌더러 (1페이지 완결형)
// -------------------------------------------------------------
export function renderApplicationFormHtml(app, studentName, isBlank = false) {
  const name = isBlank ? (studentName || '') : (app?.applicant_name || studentName || '');
  const gender = isBlank ? '' : (app?.gender || '');
  const phone = isBlank ? '010-' : (app?.phone || '010-');
  const address = isBlank ? '서울시 성동구 ' : (app?.address || '서울시 성동구 ');
  const applyRoutes = isBlank ? ['복지관 소개'] : (Array.isArray(app?.apply_routes) ? app.apply_routes : []);
  const hopeServices = isBlank ? ['스마트폰 프로그램(1:1 맞춤형)'] : (Array.isArray(app?.hope_services) ? app.hope_services : []);
  const hopeDays = isBlank ? [] : (Array.isArray(app?.hope_days) ? app.hope_days : []);
  const hopeTime = isBlank ? {} : (app?.hope_time || {});
  const memo = isBlank ? '' : (app?.memo || '');
  const privacyConsent = isBlank ? true : (app?.privacy_consent !== false);
  const portraitConsent = isBlank ? true : (app?.portrait_consent !== false);

  let signDateStr = isBlank ? '' : (app?.sign_date || '');
  if (!signDateStr && !isBlank && app?.created_at) {
    signDateStr = app.created_at.slice(0, 10);
  }
  const dateParts = signDateStr ? signDateStr.split('-') : ['', '', ''];
  const year = dateParts[0] || '2027';
  const month = dateParts[1] ? String(Number(dateParts[1])) : '';
  const day = dateParts[2] ? String(Number(dateParts[2])) : '';

  const signerName = isBlank ? name : (app?.signer_name || name || '');
  const signatureData = isBlank ? '' : (app?.signature_data || '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const check = (condition) => condition ? '☑' : '☐';

  return `
    <div class="print-page app-form-page">
      <!-- Header -->
      <div class="app-header">
        <div class="app-title-sub">2027년 노인일자리 및 사회활동지원사업(역량활용)</div>
        <div class="app-title-main">프로그램 참여 신청서</div>
      </div>

      <div class="app-section-title">■ 프로그램 참여 신청자 정보</div>

      <!-- Applicant Info Table -->
      <table class="app-table">
        <colgroup>
          <col style="width: 14%;">
          <col style="width: 23%;">
          <col style="width: 13%;">
          <col style="width: 17%;">
          <col style="width: 13%;">
          <col style="width: 20%;">
        </colgroup>
        <tbody>
          <tr>
            <th>성 명</th>
            <td class="font-bold text-center">${escapeHtml(name)}</td>
            <th>성 별</th>
            <td class="text-center">
              <span class="inline-check">${check(gender === '남')} 남</span>
              <span class="inline-check ml-4">${check(gender === '여')} 여</span>
            </td>
            <th>연락처(휴대폰)</th>
            <td class="text-center font-bold">${escapeHtml(phone)}</td>
          </tr>
          <tr>
            <th>주 소</th>
            <td colspan="5">${escapeHtml(address)}</td>
          </tr>
          <tr>
            <th>신청경로</th>
            <td colspan="5" class="py-2">
              <div class="grid-2col">
                <div>${check(applyRoutes.some(r => r.includes('치매안심센터')))} 성동구치매안심센터 소개</div>
                <div>${check(applyRoutes.some(r => r.includes('정신건강복지센터')))} 성동정신건강복지센터 소개</div>
                <div>${check(applyRoutes.some(r => r.includes('대한노인회')))} 대한노인회 소개</div>
                <div>${check(applyRoutes.some(r => r.includes('복지관')))} 복지관 소개</div>
                <div>${check(applyRoutes.some(r => r.includes('생활지원사')))} 생활지원사 소개</div>
                <div>${check(applyRoutes.some(r => r.includes('지인')))} 지인 소개(가족,친구,이웃 등)</div>
                <div>${check(applyRoutes.some(r => r.includes('기타')))} 기타</div>
              </div>
            </td>
          </tr>
          <tr>
            <th>희망서비스</th>
            <td colspan="5" class="py-2">
              <div class="service-list">
                <div class="service-row">
                  <span>${check(hopeServices.some(s => s.includes('마음이음')))}</span>
                  <div>
                    <strong>마음이음 프로그램</strong>
                    <span class="text-desc">(정서적 지지와 소통 활동을 통해 고립감 해소 및 심리적 안정을 지원)</span>
                  </div>
                </div>
                <div class="service-row">
                  <span>${check(hopeServices.some(s => s.includes('기억돌봄')))}</span>
                  <div>
                    <strong>기억돌봄 프로그램</strong>
                    <span class="text-desc">(인지활동 프로그램 운영을 통해 치매 예방 지원)</span>
                  </div>
                </div>
                <div class="service-row">
                  <span>${check(hopeServices.some(s => s.includes('스마트폰')))}</span>
                  <div>
                    <strong>스마트폰 프로그램(1:1 맞춤형)</strong>
                    <span class="text-desc">(디지털 기초교육을 통해 정보 접근성 향상 및 디지털 소외 해소 지원)</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <th>희망요일</th>
            <td colspan="5">
              <div class="days-row">
                <span>${check(hopeDays.includes('월'))} 월</span>
                <span>${check(hopeDays.includes('화'))} 화</span>
                <span>${check(hopeDays.includes('수'))} 수</span>
                <span>${check(hopeDays.includes('목'))} 목</span>
                <span>${check(hopeDays.includes('금'))} 금</span>
              </div>
            </td>
          </tr>
          <tr>
            <th>희망시간</th>
            <td colspan="5">
              <div class="time-row">
                <span>${check(hopeTime?.morning_check || Boolean(hopeTime?.morning))} 오전: ${escapeHtml(hopeTime?.morning || '09:00~12:00')}</span>
                <span class="ml-6">${check(hopeTime?.afternoon_check || Boolean(hopeTime?.afternoon))} 오후: ${escapeHtml(hopeTime?.afternoon || '13:00~16:00')}</span>
              </div>
            </td>
          </tr>
          <tr>
            <th>비 고</th>
            <td colspan="5" style="height: 48px; vertical-align: top;">
              ${escapeHtml(memo)}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Consent Box -->
      <div class="consent-box">
        <div class="consent-head">■ [필수] 개인정보 수집 및 이용 동의 <span class="consent-law">(개인정보 보호법 제15조, 제22조, 제23조)</span></div>
        <table class="consent-table">
          <tr>
            <th style="width: 32%;">항목</th>
            <th style="width: 44%;">목적</th>
            <th style="width: 24%;">이용 및 보유기간</th>
          </tr>
          <tr>
            <td class="text-center">성명, 연락처, 주소</td>
            <td class="text-center">프로그램 신청자 확인</td>
            <td class="text-center">신청일로부터 5년</td>
          </tr>
        </table>
        <div class="consent-check-row">
          <span>${check(privacyConsent)} 동의함</span>
          <span class="ml-6">${check(!privacyConsent)} 동의하지 않음</span>
        </div>

        <div class="consent-head mt-3">■ [선택] 초상권 활용 동의</div>
        <table class="consent-table">
          <tr>
            <th style="width: 32%;">항목</th>
            <th style="width: 44%;">목적</th>
            <th style="width: 24%;">이용 및 보유기간</th>
          </tr>
          <tr>
            <td class="text-center">프로그램 참여 사진, 동영상</td>
            <td class="text-center">복지관 홈페이지 게재, 유튜브, 홍보물 제작 등</td>
            <td class="text-center">사용 목적 종료 시까지</td>
          </tr>
        </table>
        <div class="consent-check-row">
          <span>${check(portraitConsent)} 동의함</span>
          <span class="ml-6">${check(!portraitConsent)} 동의하지 않음</span>
        </div>

        <div class="consent-notice">
          ※ 개인정보 수집·이용 동의, 초상권 활용 동의를 거부할 권리가 있으며, 거부 시 프로그램 참여가 제한될 수 있습니다.
        </div>
      </div>

      <!-- Signature Section -->
      <div class="app-sign-section">
        <div class="app-sign-date">
          <strong>${year || '2027'}</strong>년 <strong>${month || '&nbsp;&nbsp;'}</strong>월 <strong>${day || '&nbsp;&nbsp;'}</strong>일
        </div>
        <div class="app-sign-row">
          <span>신청자 : </span>
          <span class="signer-name font-bold">${escapeHtml(signerName)}</span>
          <span class="sig-wrapper">
            ${signatureData ? `<img src="${signatureData}" class="sig-img" alt="서명">` : '<span class="sig-blank"></span>'}
            <span class="sig-label">(서명/인)</span>
          </span>
        </div>
      </div>

      <!-- Footer Org -->
      <div class="app-footer">
        <img src="${origin}/Logo_of_Seoul.jpg" class="app-footer-logo" alt="서울시 로고" onerror="this.style.display='none'">
        <div>
          <div class="app-footer-sub">사회복지법인 서울가톨릭사회복지회</div>
          <div class="app-footer-title">시립성동노인종합복지관 귀중</div>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 2. 설문조사지 HTML 렌더러 (사전 / 사후, 2페이지)
// -------------------------------------------------------------
export function renderSurveyFormHtml(survey, studentName, type = 'pre', isBlank = false, preSurvey = null) {
  const isPost = type === 'post';
  const typeLabel = isPost ? '사후' : '사전';
  const participantName = isBlank ? (studentName || '') : (survey?.participant_name || survey?.participantName || studentName || '');
  const surveyDate = isBlank ? '' : (survey?.survey_date || survey?.surveyDate || (survey?.created_at ? survey.created_at.slice(0, 10) : ''));
  const surveyorName = isBlank ? '' : (survey?.surveyor_name || survey?.surveyorName || '-');
  const answers = isBlank ? {} : (survey?.answers || {});
  const feedback = isBlank ? '' : (survey?.feedback || '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Metrics calculation
  let totalScore = 0;
  let scoreAwareness = 0;
  let scoreUsage = 0;
  let scoreCommunication = 0;
  let scoreCitizenship = 0;

  if (!isBlank) {
    for (let i = 1; i <= 15; i++) {
      const val = Number(answers[`q${i}`]) || 0;
      totalScore += val;
      if (i <= 3) scoreAwareness += val;
      else if (i <= 9) scoreUsage += val;
      else if (i <= 12) scoreCommunication += val;
      else scoreCitizenship += val;
    }
  }

  const avgAwareness = (scoreAwareness / 3).toFixed(1);
  const avgUsage = (scoreUsage / 6).toFixed(1);
  const avgCommunication = (scoreCommunication / 3).toFixed(1);
  const avgCitizenship = (scoreCitizenship / 3).toFixed(1);
  const avgTotal = (totalScore / 15).toFixed(1);

  // Pre-Post Comparison metrics (for post survey)
  let preAnswers = preSurvey?.answers || {};
  let preTotal = 0;
  let preAwareness = 0, preUsage = 0, preCommunication = 0, preCitizenship = 0;
  const hasPreData = isPost && !isBlank && preSurvey && preSurvey.answers;
  if (hasPreData) {
    for (let i = 1; i <= 15; i++) {
      const v = Number(preAnswers[`q${i}`]) || 0;
      preTotal += v;
      if (i <= 3) preAwareness += v;
      else if (i <= 9) preUsage += v;
      else if (i <= 12) preCommunication += v;
      else preCitizenship += v;
    }
  }
  const preDateStr = preSurvey?.survey_date || (preSurvey?.created_at ? preSurvey.created_at.slice(0, 10) : '');

  const renderQuestionRow = (q) => {
    const val = Number(answers[`q${q.id}`]) || 0;
    return `
      <div class="survey-q-item">
        <div class="survey-q-head">
          <span class="survey-q-badge">${q.id}</span>
          <span class="survey-q-text">${escapeHtml(q.text)}</span>
        </div>
        <div class="survey-options-grid">
          ${[1, 2, 3, 4, 5].map(score => {
            const isSelected = !isBlank && val === score;
            const labels = ['전혀 아님', '별로 아님', '보통이다', '그렇다', '매우 그렇다'];
            return `
              <div class="survey-opt-box ${isSelected ? 'selected' : ''}">
                <span class="survey-opt-num ${isSelected ? 'selected' : ''}">${score}</span>
                <span class="survey-opt-label">${labels[score - 1]}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderDomainCard = (sec) => {
    return `
      <div class="survey-sec-card">
        <div class="survey-sec-head" style="background-color: ${sec.headerBg};">
          <div class="survey-sec-title">${sec.title}</div>
          <div class="survey-sec-desc">${sec.desc}</div>
        </div>
        <div class="survey-sec-body">
          ${QUESTIONS.filter(q => sec.qIds.includes(q.id)).map(q => renderQuestionRow(q)).join('')}
        </div>
      </div>
    `;
  };

  return `
    <!-- PAGE 1: Header, Scores, Domain 1 & 2 -->
    <div class="print-page survey-form-page">
      <div class="survey-header">
        <div class="survey-header-title">2027년 역량활용사업 1:1 디지털 교육 설문조사지 (${typeLabel})</div>
        <div class="survey-header-sub">사회복지법인 서울가톨릭사회복지회 시립성동노인종합복지관</div>
      </div>

      <!-- Respondent Table -->
      <table class="survey-resp-table">
        <tr>
          <th style="width: 14%;">조사일자</th>
          <td style="width: 20%; font-weight: bold;">${escapeHtml(surveyDate || '2027-&nbsp;&nbsp;-&nbsp;&nbsp;')}</td>
          <th style="width: 18%;">참여자(성명)</th>
          <td style="width: 22%; font-weight: bold;">${escapeHtml(participantName)}</td>
          <th style="width: 13%;">조사자</th>
          <td style="width: 13%; font-weight: bold;">${escapeHtml(surveyorName)}</td>
        </tr>
      </table>

      <!-- Domain Scores Bar -->
      <div class="survey-score-banner">
        <div class="survey-domain-boxes">
          <div class="survey-domain-box border-blue">
            <div class="title text-blue">디지털 인식</div>
            <div class="score">${isBlank ? '-' : `${scoreAwareness}점`} <span class="sub">(${isBlank ? '-' : avgAwareness}/5)</span></div>
          </div>
          <div class="survey-domain-box border-green">
            <div class="title text-green">디지털 이용</div>
            <div class="score">${isBlank ? '-' : `${scoreUsage}점`} <span class="sub">(${isBlank ? '-' : avgUsage}/5)</span></div>
          </div>
          <div class="survey-domain-box border-indigo">
            <div class="title text-indigo">디지털 소통</div>
            <div class="score">${isBlank ? '-' : `${scoreCommunication}점`} <span class="sub">(${isBlank ? '-' : avgCommunication}/5)</span></div>
          </div>
          <div class="survey-domain-box border-teal">
            <div class="title text-teal">디지털 시민성</div>
            <div class="score">${isBlank ? '-' : `${scoreCitizenship}점`} <span class="sub">(${isBlank ? '-' : avgCitizenship}/5)</span></div>
          </div>
        </div>
        <div class="survey-total-bar">
          총점 : <strong>${isBlank ? '-' : totalScore}</strong> / 75점 (평균 ${isBlank ? '-' : avgTotal}점)
        </div>
      </div>

      <!-- 5-Point Scale Legend -->
      <div class="survey-scale-legend">
        <span>[5단계 응답 기준]</span>
        <span>① 전혀 그렇지 않다</span>
        <span>② 별로 그렇지 않다</span>
        <span>③ 보통이다</span>
        <span>④ 그렇다</span>
        <span>⑤ 매우 그렇다</span>
      </div>

      <!-- Page 1 Domains (Domain 1, Domain 2) -->
      ${DOMAIN_SECTIONS.filter(s => s.page === 1).map(s => renderDomainCard(s)).join('')}

      <div class="survey-page-num">- 1 -</div>
    </div>

    <!-- PAGE 2: Domain 3, 4, Feedback/Comparison, Footer -->
    <div class="print-page survey-form-page">
      <div class="survey-header-small">
        <span>2027년 1:1 디지털 교육 설문조사지 (${typeLabel})</span>
        <span class="font-bold">참여자 : ${escapeHtml(participantName)}</span>
      </div>

      <!-- Page 2 Domains (Domain 3, Domain 4) -->
      ${DOMAIN_SECTIONS.filter(s => s.page === 2).map(s => renderDomainCard(s)).join('')}

      <!-- Post-Survey Analysis or Pre-Survey Feedback -->
      ${isPost ? `
        <div class="survey-feedback-box">
          <div class="feedback-title flex-between">
            <span>■ 사전 · 사후 디지털 역량 변화 분석 (교육 효과성 평가)</span>
            ${hasPreData ? `<span class="text-blue text-xs font-normal">사전: ${escapeHtml(preDateStr)} ➔ 사후: ${escapeHtml(surveyDate)}</span>` : ''}
          </div>
          <table class="survey-analysis-table">
            <thead>
              <tr>
                <th style="text-align: left;">평가 영역</th>
                <th>사전 점수</th>
                <th>사후 점수</th>
                <th>점수 증감</th>
                <th>평균 평점</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: left; font-weight: bold;">디지털 인식 (1~3번)</td>
                <td>${hasPreData ? `${preAwareness}점` : '-'}</td>
                <td class="font-bold text-blue">${isBlank ? '-' : `${scoreAwareness}점`}</td>
                <td class="font-bold">${hasPreData ? (scoreAwareness >= preAwareness ? `▲ +${scoreAwareness - preAwareness}` : `▼ ${scoreAwareness - preAwareness}`) : '-'}</td>
                <td>${hasPreData ? `${(preAwareness/3).toFixed(1)} ➔ ${avgAwareness}` : `${avgAwareness}점`}</td>
              </tr>
              <tr>
                <td style="text-align: left; font-weight: bold;">디지털 이용 (4~9번)</td>
                <td>${hasPreData ? `${preUsage}점` : '-'}</td>
                <td class="font-bold text-blue">${isBlank ? '-' : `${scoreUsage}점`}</td>
                <td class="font-bold">${hasPreData ? (scoreUsage >= preUsage ? `▲ +${scoreUsage - preUsage}` : `▼ ${scoreUsage - preUsage}`) : '-'}</td>
                <td>${hasPreData ? `${(preUsage/6).toFixed(1)} ➔ ${avgUsage}` : `${avgUsage}점`}</td>
              </tr>
              <tr>
                <td style="text-align: left; font-weight: bold;">디지털 소통 (10~12번)</td>
                <td>${hasPreData ? `${preCommunication}점` : '-'}</td>
                <td class="font-bold text-blue">${isBlank ? '-' : `${scoreCommunication}점`}</td>
                <td class="font-bold">${hasPreData ? (scoreCommunication >= preCommunication ? `▲ +${scoreCommunication - preCommunication}` : `▼ ${scoreCommunication - preCommunication}`) : '-'}</td>
                <td>${hasPreData ? `${(preCommunication/3).toFixed(1)} ➔ ${avgCommunication}` : `${avgCommunication}점`}</td>
              </tr>
              <tr>
                <td style="text-align: left; font-weight: bold;">디지털 시민성 (13~15번)</td>
                <td>${hasPreData ? `${preCitizenship}점` : '-'}</td>
                <td class="font-bold text-blue">${isBlank ? '-' : `${scoreCitizenship}점`}</td>
                <td class="font-bold">${hasPreData ? (scoreCitizenship >= preCitizenship ? `▲ +${scoreCitizenship - preCitizenship}` : `▼ ${scoreCitizenship - preCitizenship}`) : '-'}</td>
                <td>${hasPreData ? `${(preCitizenship/3).toFixed(1)} ➔ ${avgCitizenship}` : `${avgCitizenship}점`}</td>
              </tr>
              <tr class="total-row">
                <td style="text-align: left; font-weight: 800; color: #1e3a8a;">종합 총점 / 평균</td>
                <td>${hasPreData ? `${preTotal}점` : '-'}</td>
                <td class="font-black text-blue" style="font-size: 13px;">${isBlank ? '-' : `${totalScore}점`}</td>
                <td class="font-black text-green">${hasPreData ? `▲ +${totalScore - preTotal}점` : '-'}</td>
                <td class="font-bold">${hasPreData ? `${(preTotal/15).toFixed(1)} ➔ ${avgTotal}` : `${avgTotal}점`}</td>
              </tr>
            </tbody>
          </table>

          <div class="feedback-subhead">■ 강사 종합 소견 및 특이사항</div>
          <div class="feedback-content-box">${escapeHtml(feedback) || '(작성된 소견 없음)'}</div>
        </div>
      ` : `
        <div class="survey-feedback-box">
          <div class="feedback-title">■ 이번 교육을 통해 배우고 싶은 내용이나 희망하는 부분</div>
          <div class="feedback-content-box">${escapeHtml(feedback) || '(자유 작성 희망사항 없음)'}</div>
        </div>
      `}

      <!-- Footer -->
      <div class="survey-footer">
        <div class="ref-note">※ 설문지 문항참고: 어르신 맞춤형 디지털 역량 진단도구 개발연구(2022.10. / 길혜자_충북대) ※</div>
        <div class="footer-org">
          <img src="${origin}/Logo_of_Seoul.jpg" class="footer-logo" alt="서울시 로고" onerror="this.style.display='none'">
          <div class="footer-text">
            <div class="footer-sub">사회복지법인 서울가톨릭사회복지회</div>
            <div class="footer-title">시립성동노인종합복지관</div>
          </div>
        </div>
      </div>

      <div class="survey-page-num">- 2 -</div>
    </div>
  `;
}

// -------------------------------------------------------------
// 3. 일괄 인쇄 문서 래퍼 (Multi-page Print Bundle)
// -------------------------------------------------------------
export function buildBatchPrintHtml(renderedPagesHtml, title = '참여자_서류_일괄인쇄') {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #f1f5f9;
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
      color: #1e293b;
      line-height: 1.35;
      -webkit-font-smoothing: antialiased;
    }

    /* Top Action Bar (Screen Only) */
    .top-action-bar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .top-action-info {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
    }
    .top-action-title {
      font-weight: 800;
      font-size: 16px;
      color: #38bdf8;
    }
    .top-action-notice {
      font-size: 12px;
      color: #94a3b8;
    }
    .top-action-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-print:hover { background: #1d4ed8; }
    .btn-close {
      background: #475569;
      color: #ffffff;
      border: none;
      padding: 8px 14px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-close:hover { background: #334155; }

    /* Screen Preview Paper Sheet */
    .print-doc-container {
      max-width: 210mm;
      margin: 20px auto 40px auto;
    }

    .print-page {
      background: #ffffff;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto 20px auto;
      padding: 12mm 14mm;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
      border-radius: 2px;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
    }

    /* Print Page Rules */
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }

    @media print {
      body {
        background: #ffffff !important;
      }
      .top-action-bar {
        display: none !important;
      }
      .print-doc-container {
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
      }
      .print-page {
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        width: 100% !important;
        min-height: 100% !important;
        page-break-after: always !important;
        break-after: page !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    /* ========================================================= */
    /* APPLICATION FORM STYLES                                  */
    /* ========================================================= */
    .app-header {
      text-align: center;
      margin-bottom: 12px;
      line-height: 1.3;
    }
    .app-title-sub {
      font-size: 13.5px;
      font-weight: 600;
      color: #334155;
    }
    .app-title-main {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-top: 2px;
    }
    .app-section-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .app-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #1e293b;
      margin-bottom: 10px;
      font-size: 11px;
    }
    .app-table th, .app-table td {
      border: 1px solid #1e293b;
      padding: 5px 8px;
      line-height: 1.3;
    }
    .app-table th {
      background-color: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
    }
    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 12px;
      font-size: 10.5px;
    }
    .service-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 10.5px;
    }
    .service-row {
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }
    .text-desc {
      color: #475569;
      font-size: 9.5px;
      display: block;
    }
    .days-row {
      display: flex;
      gap: 18px;
      font-size: 11px;
      font-weight: 600;
    }
    .time-row {
      display: flex;
      font-size: 11px;
    }
    .consent-box {
      border: 1.5px solid #1e293b;
      padding: 8px 10px;
      background: #fafafa;
      margin-bottom: 10px;
    }
    .consent-head {
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .consent-law {
      font-size: 10px;
      font-weight: normal;
      color: #64748b;
    }
    .consent-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      margin-bottom: 5px;
      font-size: 10px;
    }
    .consent-table th, .consent-table td {
      border: 1px solid #cbd5e1;
      padding: 3px 6px;
    }
    .consent-table th {
      background: #f1f5f9;
      font-weight: 700;
    }
    .consent-check-row {
      display: flex;
      justify-content: flex-end;
      gap: 20px;
      font-size: 11px;
      font-weight: 700;
    }
    .consent-notice {
      text-align: center;
      font-size: 9.5px;
      color: #475569;
      margin-top: 6px;
      line-height: 1.35;
    }
    .app-sign-section {
      text-align: center;
      margin-top: 10px;
      margin-bottom: 12px;
    }
    .app-sign-date {
      font-size: 14px;
      margin-bottom: 8px;
    }
    .app-sign-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
    }
    .signer-name {
      font-size: 15px;
      min-width: 60px;
      display: inline-block;
      text-align: center;
    }
    .sig-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .sig-img {
      height: 38px;
      max-width: 110px;
      object-fit: contain;
      vertical-align: middle;
    }
    .sig-blank {
      width: 80px;
      height: 28px;
      display: inline-block;
      border-bottom: 1px solid #94a3b8;
    }
    .sig-label {
      font-size: 11px;
      color: #64748b;
    }
    .app-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
    }
    .app-footer-logo {
      width: 34px;
      height: 34px;
      object-fit: contain;
    }
    .app-footer-sub {
      font-size: 10.5px;
      color: #64748b;
    }
    .app-footer-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }

    /* ========================================================= */
    /* SURVEY FORM STYLES                                       */
    /* ========================================================= */
    .survey-header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .survey-header-title {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .survey-header-sub {
      font-size: 10.5px;
      color: #475569;
      margin-top: 2px;
    }
    .survey-header-small {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #475569;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .survey-resp-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
      font-size: 11px;
      margin-bottom: 8px;
    }
    .survey-resp-table th, .survey-resp-table td {
      border: 1px solid #0f172a;
      padding: 5px 6px;
      text-align: center;
    }
    .survey-resp-table th {
      background-color: #f1f5f9;
      font-weight: 700;
    }
    .survey-score-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .survey-domain-boxes {
      display: flex;
      gap: 6px;
    }
    .survey-domain-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      text-align: center;
      background: #f8fafc;
      min-width: 82px;
    }
    .survey-domain-box .title {
      font-size: 9.5px;
      font-weight: 700;
    }
    .survey-domain-box .score {
      font-size: 12px;
      font-weight: 800;
    }
    .survey-domain-box .sub {
      font-size: 9px;
      font-weight: normal;
      color: #64748b;
    }
    .survey-total-bar {
      font-size: 11.5px;
      font-weight: 700;
      text-align: right;
    }
    .survey-scale-legend {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 4px 10px;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .survey-sec-card {
      margin-bottom: 8px;
    }
    .survey-sec-head {
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 6px 6px 0 0;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .survey-sec-title {
      font-size: 12px;
      font-weight: 700;
    }
    .survey-sec-desc {
      font-size: 9.5px;
      opacity: 0.9;
    }
    .survey-sec-body {
      border: 1.2px solid #cbd5e1;
      border-top: none;
      border-radius: 0 0 6px 6px;
      background: #ffffff;
    }
    .survey-q-item {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .survey-q-item:last-child {
      border-bottom: none;
    }
    .survey-q-head {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 3px;
    }
    .survey-q-badge {
      width: 17px;
      height: 17px;
      border-radius: 9999px;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .survey-q-text {
      font-size: 11px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.3;
    }
    .survey-options-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
    }
    .survey-opt-box {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 2px 2px;
      text-align: center;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 34px;
    }
    .survey-opt-box.selected {
      border: 2px solid #1d4ed8;
      background: #ffffff;
    }
    .survey-opt-num {
      width: 15px;
      height: 15px;
      border-radius: 9999px;
      background: #f1f5f9;
      color: #64748b;
      font-size: 9px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1px;
    }
    .survey-opt-num.selected {
      background: #1d4ed8;
      color: #ffffff;
      font-weight: 900;
    }
    .survey-opt-label {
      font-size: 8px;
      color: #64748b;
      white-space: nowrap;
    }
    .survey-opt-box.selected .survey-opt-label {
      color: #1d4ed8;
      font-weight: 700;
    }
    .survey-feedback-box {
      border: 1.2px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      background: #ffffff;
      margin-top: 6px;
    }
    .feedback-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .feedback-subhead {
      font-size: 10.5px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 6px;
      margin-bottom: 3px;
    }
    .feedback-content-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      color: #334155;
      min-height: 36px;
      white-space: pre-wrap;
    }
    .survey-analysis-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      font-size: 9.5px;
      text-align: center;
      margin-bottom: 4px;
    }
    .survey-analysis-table th, .survey-analysis-table td {
      border: 1px solid #cbd5e1;
      padding: 3px 5px;
    }
    .survey-analysis-table th {
      background: #f1f5f9;
      font-weight: 700;
    }
    .survey-analysis-table tr.total-row {
      background: #eff6ff;
      font-weight: 700;
    }
    .survey-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      margin-top: 6px;
    }
    .ref-note {
      font-size: 8.5px;
      color: #64748b;
    }
    .footer-org {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .footer-logo {
      width: 26px;
      height: 26px;
      object-fit: contain;
    }
    .footer-text {
      text-align: left;
    }
    .footer-sub {
      font-size: 9px;
      color: #64748b;
    }
    .footer-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .survey-page-num {
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      margin-top: 4px;
    }

    /* Colors */
    .text-blue { color: #1d4ed8; }
    .text-green { color: #047857; }
    .text-indigo { color: #4338ca; }
    .text-teal { color: #0f766e; }
    .border-blue { border-color: #93c5fd; }
    .border-green { border-color: #a7f3d0; }
    .border-indigo { border-color: #c7d2fe; }
    .border-teal { border-color: #99f6e4; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .text-center { text-align: center; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="top-action-bar">
    <div class="top-action-info">
      <span class="top-action-title">🖨️ ${escapeHtml(title)}</span>
      <span class="top-action-notice">💡 인쇄 창에서 대상을 [PDF로 저장]으로 선택하시면 하나의 PDF 문서로 일괄 저장됩니다.</span>
    </div>
    <div class="top-action-buttons">
      <button class="btn-print" onclick="window.print()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        <span>인쇄 / PDF 저장</span>
      </button>
      <button class="btn-close" onclick="window.close()">창 닫기</button>
    </div>
  </div>

  <div class="print-doc-container">
    ${renderedPagesHtml}
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      // Small timeout to allow images/fonts to render
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;
}

// -------------------------------------------------------------
// 4. 일괄 인쇄 팝업 호출 함수
// -------------------------------------------------------------
export function executeBatchPrint(documentsHtml, title = '참여자_서류_일괄인쇄') {
  const fullHtml = buildBatchPrintHtml(documentsHtml, title);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('팝업 차단이 감지되었습니다.\n브라우저 주소창 우측에서 [팝업 허용]을 설정해주세요.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
}
