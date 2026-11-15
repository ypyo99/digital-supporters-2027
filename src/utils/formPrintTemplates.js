// ==============================================================
// 2027년 역량활용사업 참여신청서 및 사전/사후설문지 일괄 인쇄 템플릿
// (public/application_form.html 및 public/survey_form.html 과 100% 동일한 페이지 포맷/스타일)
// ==============================================================

export const SCALE_OPTIONS = [
  { value: 1, label: '전혀 그렇지 않다', displayHtml: '전혀 그렇지<br>않다' },
  { value: 2, label: '별로 그렇지 않다', displayHtml: '별로 그렇지<br>않다' },
  { value: 3, label: '보통이다', displayHtml: '보통이다' },
  { value: 4, label: '그렇다', displayHtml: '그렇다' },
  { value: 5, label: '매우 그렇다', displayHtml: '매우 그렇다' }
];

export const QUESTIONS = [
  { id: 1, domain: 'awareness', domainTitle: '디지털 인식', text: '나는 새로운 디지털 기기에 두려움 없이 잘 적응하는 편이다.' },
  { id: 2, domain: 'awareness', domainTitle: '디지털 인식', text: '나는 새로운 디지털 기기를 적극적으로 이용해 보는 편이다.' },
  { id: 3, domain: 'awareness', domainTitle: '디지털 인식', text: '나는 익숙하지 않은 디지털 기기를 사용할 때도 편안하다.' },
  { id: 4, domain: 'usage', domainTitle: '디지털 이용', text: '나는 스마트폰에서 화면/소리/보안/알림/와이파이 등 환경설정을 할 수 있다.' },
  { id: 5, domain: 'usage', domainTitle: '디지털 이용', text: '나는 스마트폰으로 사진을 찍고, 저장할 수 있다.' },
  { id: 6, domain: 'usage', domainTitle: '디지털 이용', text: '나는 스마트폰에서 필요한 앱을 검색, 설치, 삭제 할 수 있다.' },
  { id: 7, domain: 'usage', domainTitle: '디지털 이용', text: '나는 필요한 정보를 인터넷이나 앱으로 검색할 수 있다.' },
  { id: 8, domain: 'usage', domainTitle: '디지털 이용', text: '병원·식당·기차 등을 모바일로 예약할 수 있다.' },
  { id: 9, domain: 'usage', domainTitle: '디지털 이용', text: '나는 송금, 간편결제 등 디지털 금융 서비스를 사용할 수 있다.' },
  { id: 10, domain: 'communication', domainTitle: '디지털 소통', text: '나는 메신저(카카오톡, 문자 등)을 활용하여 대화를 나누거나 사진, 파일 등을 전송할 수 있다.' },
  { id: 11, domain: 'communication', domainTitle: '디지털 소통', text: '나는 복지관·구청 등 일상생활에 필요한 안내 문자나 링크를 확인하고 활용할 수 있다.' },
  { id: 12, domain: 'communication', domainTitle: '디지털 소통', text: '나는 온라인 교육 또는 줌(Zoom) 수업에 참여 또는 활용할 수 있다.' },
  { id: 13, domain: 'citizenship', domainTitle: '디지털 시민성', text: '나는 의심되는 문자나 링크를 함부로 누르지 않는다.' },
  { id: 14, domain: 'citizenship', domainTitle: '디지털 시민성', text: '다른 사람의 사진이나 정보를 허락 없이 공유하면 안 된다는 것을 알고 있다.' },
  { id: 15, domain: 'citizenship', domainTitle: '디지털 시민성', text: '나는 스팸, 스미싱, 보이스피싱 등 사이버 범죄에 대응하는 방법(신고 등)을 알고 있다.' }
];

export const DOMAIN_SECTIONS = [
  {
    key: 'awareness',
    title: '■ 디지털 인식',
    desc: '(핵심변화: 디지털에 대한 두려움 감소 및 자신감 향상)',
    range: '1번 ~ 3번 문항',
    headerClass: 'print-header-awareness',
    badgeClass: 'print-badge-awareness',
    qIds: [1, 2, 3],
    page: 1
  },
  {
    key: 'usage',
    title: '■ 디지털 이용',
    desc: '(핵심변화: 생활 속 디지털 활용 능력 향상)',
    range: '4번 ~ 9번 문항',
    headerClass: 'print-header-usage',
    badgeClass: 'print-badge-usage',
    qIds: [4, 5, 6, 7, 8, 9],
    page: 1
  },
  {
    key: 'communication',
    title: '■ 디지털 소통',
    desc: '(핵심변화: 가족·사회와의 소통 확대)',
    range: '10번 ~ 12번 문항',
    headerClass: 'print-header-communication',
    badgeClass: 'print-badge-communication',
    qIds: [10, 11, 12],
    page: 2
  },
  {
    key: 'citizenship',
    title: '■ 디지털 시민성',
    desc: '(핵심변화: 안전한 디지털 사용 습관 형성)',
    range: '13번 ~ 15번 문항',
    headerClass: 'print-header-citizenship',
    badgeClass: 'print-badge-citizenship',
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
// 1. 참여 신청서 HTML 렌더러 (1페이지 완결형, application_form.html 과 동일 서식)
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
    <div class="doc-page-app page-container">
      <!-- Title -->
      <h1 id="docTitle">
        <span class="title-project">2027년 노인일자리 및 사회활동지원사업(역량활용)</span>
        <span class="title-main">프로그램 참여 신청서</span>
      </h1>

      <div id="applicantSubTitle">프로그램 참여 신청자 정보</div>

      <!-- Applicant Info Table -->
      <table id="applicantTable">
        <colgroup>
          <col style="width: 12%;">
          <col style="width: 23%;">
          <col style="width: 12%;">
          <col style="width: 18%;">
          <col style="width: 15%;">
          <col style="width: 20%;">
        </colgroup>
        <tbody>
          <tr>
            <th>성 명</th>
            <td style="font-weight: 700; text-align: center;">${escapeHtml(name)}</td>
            <th>성 별</th>
            <td style="text-align: center;">
              <span>${check(gender === '남')} 남</span>
              <span style="margin-left: 12px;">${check(gender === '여')} 여</span>
            </td>
            <th>연락처<br>(휴대폰)</th>
            <td style="font-weight: 700; text-align: center;">${escapeHtml(phone)}</td>
          </tr>
          <tr>
            <th>주 소</th>
            <td colspan="5">${escapeHtml(address)}</td>
          </tr>
          <tr>
            <th>신청경로</th>
            <td colspan="5">
              <div id="applyRouteGrid">
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
            <td colspan="5">
              <div id="hopeServiceList">
                <div class="service-item">
                  <span>${check(hopeServices.some(s => s.includes('마음이음')))}</span>
                  <span class="service-name">마음이음 프로그램</span>
                  <span class="service-desc">(정서적 지지와 소통 활동을 통해 고립감 해소 및 심리적 안정을 지원)</span>
                </div>
                <div class="service-item">
                  <span>${check(hopeServices.some(s => s.includes('기억돌봄')))}</span>
                  <span class="service-name">기억돌봄 프로그램</span>
                  <span class="service-desc">(인지활동 프로그램 운영을 통해 치매 예방 지원)</span>
                </div>
                <div class="service-item">
                  <span>${check(hopeServices.some(s => s.includes('스마트폰')))}</span>
                  <span class="service-name">스마트폰 프로그램(1:1 맞춤형)</span>
                  <span class="service-desc">(디지털 기초교육을 통해 정보 접근성 향상 및 디지털 소외 해소 지원)</span>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <th>희망요일</th>
            <td colspan="5">
              <div id="hopeDaysList">
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
              <div id="hopeTimeList">
                <span>${check(hopeTime?.morning_check || Boolean(hopeTime?.morning))} 오전: ${escapeHtml(hopeTime?.morning || '09:00~12:00')}</span>
                <span>${check(hopeTime?.afternoon_check || Boolean(hopeTime?.afternoon))} 오후: ${escapeHtml(hopeTime?.afternoon || '13:00~16:00')}</span>
              </div>
            </td>
          </tr>
          <tr>
            <th>비 고</th>
            <td id="memoCell" colspan="5" style="vertical-align: top;">
              <div>${escapeHtml(memo)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Privacy Container -->
      <div id="privacyContainer">
        <div id="privacyInner">
          <div class="privacy-head">■ [필수] 개인정보 수집 및 이용 동의</div>
          <div class="privacy-law">관련 법규 : 개인정보 보호법 제15조, 제22조, 제23조</div>
          <table class="privacy-table">
            <thead>
              <tr>
                <th style="width: 30%;">항목</th>
                <th style="width: 40%;">목적</th>
                <th style="width: 30%;">이용 및 보유기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">성명, 연락처, 주소</td>
                <td style="text-align: center;">프로그램 신청자 확인</td>
                <td style="text-align: center;">신청일로부터 5년</td>
              </tr>
            </tbody>
          </table>
          <div class="consent-radios">
            <span>${check(privacyConsent)} 동의함</span>
            <span>${check(!privacyConsent)} 동의하지 않음</span>
          </div>

          <div id="portraitHeader" class="privacy-head">■ [선택] 초상권 활용 동의</div>
          <table class="privacy-table">
            <thead>
              <tr>
                <th style="width: 30%;">항목</th>
                <th style="width: 40%;">목적</th>
                <th style="width: 30%;">이용 및 보유기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">프로그램 참여 사진, 동영상</td>
                <td style="text-align: center;">복지관 홈페이지 게재, 유튜브, 홍보물 제작 등</td>
                <td style="text-align: center;">사용 목적 종료 시까지</td>
              </tr>
            </tbody>
          </table>
          <div class="consent-radios">
            <span>${check(portraitConsent)} 동의함</span>
            <span>${check(!portraitConsent)} 동의하지 않음</span>
          </div>

          <div id="consentNotice">
            ※ 개인정보 수집 및 이용 동의, 초상권 활용 동의를 거부할 권리가 있으며,<br>
            동의 거부 시에 프로그램 참여가 제한될 수 있습니다.
          </div>
        </div>
      </div>

      <!-- Signature Section -->
      <div id="signatureSection">
        <div id="dateRow">
          <span>${year || '2027'} 년</span>
          <span>${month || '&nbsp;&nbsp;'} 월</span>
          <span>${day || '&nbsp;&nbsp;'} 일</span>
        </div>
        <div id="signerRow">
          <span>신청자 : </span>
          <span style="font-weight: 700; margin-right: 6px;">${escapeHtml(signerName)}</span>
          ${signatureData
            ? `<img src="${signatureData}" style="height: 38px; max-width: 130px; object-fit: contain; vertical-align: middle; border-bottom: 1px solid #111;" alt="서명">`
            : `<span style="display: inline-block; width: 90px; border-bottom: 1px solid #111; height: 24px;"></span>`
          }
          <span style="color: #64748b; font-size: 13px; margin-left: 4px;">(서명)</span>
        </div>
      </div>

      <!-- Print Footer Logo -->
      <div id="printFooterLogo">
        <img src="${origin}/Logo_of_Seoul.jpg" alt="서울시 로고" onerror="this.style.display='none'">
        <div style="text-align: left;">
          <div id="printLogoSub" class="org-sub">사회복지법인 서울가톨릭사회복지회</div>
          <div id="printLogoTitle" class="org-title">시립성동노인종합복지관</div>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 2. 설문조사지 HTML 렌더러 (사전 / 사후, 2페이지 완결형, survey_form.html 과 동일 서식)
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

  // Comparison metrics for Post Survey
  const preAnswers = preSurvey?.answers || {};
  let comparison = null;
  if (isPost) {
    let preTotal = 0, preAw = 0, preUs = 0, preCom = 0, preCit = 0;
    const hasPre = !isBlank && Boolean(preSurvey && preSurvey.answers);
    if (hasPre) {
      for (let i = 1; i <= 15; i++) {
        const v = Number(preAnswers[`q${i}`]) || 0;
        preTotal += v;
        if (i <= 3) preAw += v;
        else if (i <= 9) preUs += v;
        else if (i <= 12) preCom += v;
        else preCit += v;
      }
    }
    const preDateStr = preSurvey?.survey_date || preSurvey?.surveyDate || (preSurvey?.created_at ? preSurvey.created_at.slice(0, 10) : '');
    
    const domains = [
      { key: 'awareness', title: '디지털 인식', range: '1~3번', maxScore: 15, preScore: preAw, preAvg: (preAw/3).toFixed(1), postScore: scoreAwareness, postAvg: avgAwareness, diff: scoreAwareness - preAw, diffAvg: ((scoreAwareness - preAw)/3).toFixed(2) },
      { key: 'usage', title: '디지털 이용', range: '4~9번', maxScore: 30, preScore: preUs, preAvg: (preUs/6).toFixed(1), postScore: scoreUsage, postAvg: avgUsage, diff: scoreUsage - preUs, diffAvg: ((scoreUsage - preUs)/6).toFixed(2) },
      { key: 'communication', title: '디지털 소통', range: '10~12번', maxScore: 15, preScore: preCom, preAvg: (preCom/3).toFixed(1), postScore: scoreCommunication, postAvg: avgCommunication, diff: scoreCommunication - preCom, diffAvg: ((scoreCommunication - preCom)/3).toFixed(2) },
      { key: 'citizenship', title: '디지털 시민성', range: '13~15번', maxScore: 15, preScore: preCit, preAvg: (preCit/3).toFixed(1), postScore: scoreCitizenship, postAvg: avgCitizenship, diff: scoreCitizenship - preCit, diffAvg: ((scoreCitizenship - preCit)/3).toFixed(2) },
    ];
    const totalDiff = totalScore - preTotal;
    const growthRate = preTotal > 0 ? ((totalDiff / preTotal) * 100).toFixed(1) : '0.0';
    const sortedDomains = [...domains].sort((a, b) => b.diff - a.diff);
    const bestDomain = sortedDomains[0];

    comparison = {
      hasPreData: hasPre,
      preDateStr,
      preTotal,
      preAvgTotal: (preTotal / 15).toFixed(1),
      totalDiff,
      growthRate,
      bestDomain,
      domains
    };
  }

  const renderDomain = (domainDef) => {
    const isPage2Start = domainDef.key === 'communication';
    return `
      <section class="print-section ${isPage2Start ? 'print-page-break' : ''}">
        <div class="print-section-header ${domainDef.headerClass}">
          <div class="print-section-title-wrap">
            <span class="print-section-title">${domainDef.title}</span>
            <span class="print-section-desc">${domainDef.desc}</span>
          </div>
          <span class="print-section-badge ${domainDef.badgeClass}">${domainDef.range}</span>
        </div>
        <div class="print-section-body">
          ${domainDef.qIds.map(qId => {
            const q = QUESTIONS.find(item => item.id === qId);
            const val = Number(answers[`q${q.id}`]) || 0;
            return `
              <div class="print-q-item">
                <div class="print-q-head">
                  <span class="print-q-badge">${q.id}</span>
                  <p class="print-q-text">${q.text}</p>
                </div>
                <div class="print-options-grid">
                  ${SCALE_OPTIONS.map(opt => {
                    const isSelected = !isBlank && val === opt.value;
                    return `
                      <div class="print-scale-btn ${isSelected ? 'selected' : ''}">
                        <span class="score-num">${opt.value}</span>
                        <span class="score-label">${opt.displayHtml || opt.label}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  };

  return `
    <div class="doc-page-survey print-doc-container">
      <!-- Header Title -->
      <div class="print-header">
        <h2>2027년 역량활용사업 1:1 디지털 교육 설문조사지(${typeLabel})</h2>
        <div class="print-subtitle">사회복지법인 서울가톨릭사회복지회 시립성동노인종합복지관</div>
      </div>

      <!-- Respondent Info Table -->
      <table class="print-respondent-table">
        <tr>
          <th style="width: 14%;">조사일자</th>
          <td style="width: 20%; font-weight: bold;">${escapeHtml(surveyDate)}</td>
          <th style="width: 20%;">참여자(성명)</th>
          <td style="width: 20%; font-weight: bold;">${escapeHtml(participantName)}</td>
          <th style="width: 13%;">조사자</th>
          <td style="width: 13%; font-weight: bold;">${escapeHtml(surveyorName)}</td>
        </tr>
      </table>

      <!-- Domain Scores Summary + Total -->
      <div>
        <div class="print-domain-grid">
          <div class="print-domain-card">
            <div class="print-domain-title text-blue-900">디지털 인식</div>
            <div class="print-domain-score text-blue-700">${scoreAwareness}점 <span style="font-size: 10.5px; font-weight: normal; color: #64748b;">(${avgAwareness}/5)</span></div>
          </div>
          <div class="print-domain-card">
            <div class="print-domain-title text-emerald-900">디지털 이용</div>
            <div class="print-domain-score text-emerald-700">${scoreUsage}점 <span style="font-size: 10.5px; font-weight: normal; color: #64748b;">(${avgUsage}/5)</span></div>
          </div>
          <div class="print-domain-card">
            <div class="print-domain-title text-indigo-900">디지털 소통</div>
            <div class="print-domain-score text-indigo-700">${scoreCommunication}점 <span style="font-size: 10.5px; font-weight: normal; color: #64748b;">(${avgCommunication}/5)</span></div>
          </div>
          <div class="print-domain-card">
            <div class="print-domain-title text-teal-900">디지털 시민성</div>
            <div class="print-domain-score text-teal-700">${scoreCitizenship}점 <span style="font-size: 10.5px; font-weight: normal; color: #64748b;">(${avgCitizenship}/5)</span></div>
          </div>
        </div>
        <div class="print-total-score-bar">
          총점: <span class="print-total-score-num">${totalScore}</span> / 75점 (평균 ${avgTotal}점)
        </div>
      </div>

      <!-- Page 1 Domains (Domain 1: 인식 & Domain 2: 이용) -->
      ${DOMAIN_SECTIONS.filter(d => d.page === 1).map(renderDomain).join('')}

      <!-- Page 2 Domains (Domain 3: 소통 & Domain 4: 시민성, page-break at Domain 3) -->
      ${DOMAIN_SECTIONS.filter(d => d.page === 2).map(renderDomain).join('')}

      <!-- Feedback / Comparison Section (Page 2) -->
      ${isPost && comparison ? `
        <div class="print-feedback-section">
          <div class="print-feedback-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>■ 사전 · 사후 디지털 역량 변화 분석 (교육 효과성 평가)</span>
            ${comparison.hasPreData ? `
              <span style="font-size: 10px; font-weight: normal; color: #1e40af;">
                사전조사: ${escapeHtml(comparison.preDateStr)} ➔ 사후조사: ${escapeHtml(surveyDate)}
              </span>
            ` : ''}
          </div>
          <div class="print-feedback-desc">
            사전 및 사후 설문조사의 4대 영역별 점수 변화 및 종합 성장도를 분석한 결과입니다.
          </div>

          <table class="print-analysis-table">
            <thead>
              <tr>
                <th style="width: 26%; text-align: left; padding-left: 8px;">평가 영역</th>
                <th style="width: 17%;">사전 점수</th>
                <th style="width: 17%;">사후 점수</th>
                <th style="width: 20%;">점수 증감</th>
                <th style="width: 20%;">평균 평점</th>
              </tr>
            </thead>
            <tbody>
              ${comparison.domains.map(d => `
                <tr>
                  <td style="text-align: left; padding-left: 8px; font-weight: 600;">
                    ${d.title} <span style="font-size: 8.5px; color: #64748b; font-weight: normal;">(${d.range})</span>
                  </td>
                  <td>${comparison.hasPreData ? `${d.preScore}점` : '-'}</td>
                  <td style="font-weight: 700;">${d.postScore}점</td>
                  <td style="font-weight: 700; ${d.diff > 0 ? 'color: #1d4ed8;' : d.diff < 0 ? 'color: #dc2626;' : 'color: #64748b;'}">
                    ${comparison.hasPreData ? (d.diff > 0 ? `▲ +${d.diff}점` : d.diff < 0 ? `▼ ${d.diff}점` : '0점') : '-'}
                  </td>
                  <td>${d.postAvg} / 5.0</td>
                </tr>
              `).join('')}
              <tr style="background-color: #eff6ff; font-weight: 800;">
                <td style="text-align: left; padding-left: 8px;">종합 합계 (총점)</td>
                <td>${comparison.hasPreData ? `${comparison.preTotal}점` : '-'}</td>
                <td style="color: #1d4ed8;">${totalScore}점</td>
                <td style="${comparison.totalDiff > 0 ? 'color: #1d4ed8;' : comparison.totalDiff < 0 ? 'color: #dc2626;' : 'color: #64748b;'}">
                  ${comparison.hasPreData ? (comparison.totalDiff > 0 ? `▲ +${comparison.totalDiff}점 (+${comparison.growthRate}%)` : comparison.totalDiff < 0 ? `▼ ${comparison.totalDiff}점` : '0점') : '-'}
                </td>
                <td style="color: #1d4ed8;">${avgTotal} / 5.0</td>
              </tr>
            </tbody>
          </table>

          <div class="print-analysis-summary-box" style="font-size: 10px; color: #1e3a8a;">
            💡 <strong>종합 분석:</strong> ${(() => {
              if (!comparison.hasPreData) return `${participantName} 어르신의 사후 평가 총점은 ${totalScore}점(평균 ${avgTotal}점/5.0점)입니다.`;
              if (comparison.totalDiff > 0) {
                return `1:1 맞춤형 디지털 교육을 통해 ${participantName} 어르신의 디지털 역량 총점이 사전 대비 +${comparison.totalDiff}점 향상(+${comparison.growthRate}%)되었습니다. 특히 [${comparison.bestDomain.title}] 영역에서 가장 두드러진 역량 향상을 나타냈습니다.`;
              } else if (comparison.totalDiff === 0) {
                return `사전 조사 점수(${comparison.preTotal}점)와 동일한 역량 수준(${totalScore}점)을 유지하고 계십니다.`;
              } else {
                return `사후 평가 총점은 ${totalScore}점(사전 ${comparison.preTotal}점, ${comparison.totalDiff}점)으로 집계되었습니다.`;
              }
            })()}
            ${feedback ? `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-size: 9.5px; color: #1e293b;"><strong>[강사 종합 소견]:</strong> ${escapeHtml(feedback)}</div>` : ''}
          </div>
        </div>
      ` : `
        <div class="print-feedback-section">
          <div class="print-feedback-title">
            ■ 이번 교육을 통해 배우고 싶은 내용이나 희망하는 부분을 자유롭게 작성해 주세요.
          </div>
          <div class="print-feedback-desc">
            (예: 스마트폰으로 버스/지하철 길찾기, 카카오페이 송금하기, 사진 예쁘게 편집해서 가족에게 보내기 등)
          </div>
          <div class="print-feedback-content-box">
            ${escapeHtml(feedback || '(작성된 희망사항이 없습니다.)')}
          </div>
        </div>
      `}

      <!-- Footer (Page 2) -->
      <div class="print-footer">
        <img src="${origin}/Logo_of_Seoul.jpg" alt="서울시 로고" class="print-footer-logo" onerror="this.style.display='none'">
        <div class="print-footer-text">
          <div class="print-footer-sub">사회복지법인 서울가톨릭사회복지회</div>
          <div class="print-footer-title">시립성동노인종합복지관</div>
        </div>
      </div>
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

    /* Screen Top Action Bar */
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

    /* Screen View Container */
    .print-doc-container-screen {
      max-width: 900px;
      margin: 20px auto;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Common Styles for Application Form (Mirrors application_form.html - Strictly 1 Page) */
    .page-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      padding: 24px 32px;
      color: #111111;
      width: 100%;
    }
    #docTitle {
      text-align: center;
      margin-bottom: 0px;
      line-height: 1.35;
    }
    #docTitle .title-project {
      display: block;
      font-size: 15px;
      font-weight: 600;
      color: #111111;
    }
    #docTitle .title-main {
      display: block;
      font-size: 24px;
      font-weight: 800;
      color: #111111;
      margin-top: 4px;
    }
    #applicantSubTitle {
      font-size: 13.5px;
      font-weight: 700;
      margin-bottom: 4px;
      color: #111111;
    }
    #applicantTable {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0px;
    }
    #applicantTable th, #applicantTable td {
      padding: 6.5px 8px;
      font-size: 12px;
      line-height: 1.3;
      border: 1px solid #111111;
    }
    #applicantTable th {
      background-color: #e5e7eb;
      font-weight: 700;
      text-align: center;
      color: #111111;
    }
    #applyRouteGrid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 10px;
      font-size: 11.5px;
    }
    #hopeServiceList {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .service-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .service-item .service-name {
      font-size: 12px;
      font-weight: 700;
    }
    .service-item .service-desc {
      font-size: 11px;
      color: #4b5563;
    }
    #hopeDaysList {
      display: flex;
      gap: 16px;
      font-size: 12px;
      font-weight: 600;
      padding: 2px 0;
    }
    #hopeTimeList {
      display: flex;
      flex-direction: row;
      gap: 20px;
      font-size: 12px;
      padding: 2px 0;
    }
    #memoCell {
      height: 64px;
      padding: 6px 8px;
      font-size: 11.5px;
      line-height: 1.3;
    }
    #privacyContainer {
      margin-top: 0px;
      border: 1px solid #111111;
      background-color: transparent;
      padding: 0;
    }
    #privacyInner {
      padding: 12px 14px;
    }
    .privacy-head {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .privacy-law {
      font-size: 10.5px;
      margin-bottom: 4px;
      color: #4b5563;
    }
    .privacy-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
    }
    .privacy-table th, .privacy-table td {
      padding: 4.5px 6px;
      font-size: 11px;
      line-height: 1.25;
      border: 1px solid #111111;
    }
    .privacy-table th {
      background-color: #e5e7eb;
      font-weight: 700;
    }
    .consent-radios {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      font-size: 11.5px;
      font-weight: 700;
      margin-top: 3px;
      margin-bottom: 4px;
    }
    #portraitHeader {
      margin-top: 10px;
      margin-bottom: 3px;
      font-size: 13px;
    }
    #consentNotice {
      text-align: center;
      margin-top: 8px;
      font-size: 10.5px;
      line-height: 1.35;
      color: #334155;
      font-weight: 600;
    }
    #signatureSection {
      margin-top: 0px;
      font-size: 14.5px;
      text-align: center;
    }
    #dateRow {
      margin-bottom: 12px;
      font-size: 15px;
      display: flex;
      justify-content: center;
      gap: 8px;
      font-weight: 600;
    }
    #signerRow {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      padding-right: 12px;
    }
    #printFooterLogo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 0px;
      margin-bottom: 0px;
    }
    #printFooterLogo img {
      width: 38px;
      height: 38px;
      object-fit: contain;
    }
    #printFooterLogo .org-sub {
      font-size: 11.5px;
      font-weight: 600;
      color: #475569;
    }
    #printFooterLogo .org-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }

    /* Common Styles for Survey Form (Mirrors survey_form.html) */
    .print-doc-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      padding: 32px 36px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #0f172a;
      width: 100%;
    }
    .print-header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-top: 6px;
      padding-bottom: 5px;
      margin-bottom: 2px;
    }
    .print-header h2 {
      font-size: 19px;
      font-weight: 900;
      letter-spacing: -0.025em;
      line-height: 1.2;
      margin: 0;
      color: #0f172a;
    }
    .print-header .print-subtitle {
      font-size: 10.5px;
      color: #475569;
      margin-top: 3px;
    }
    .print-respondent-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
      font-size: 12.5px;
    }
    .print-respondent-table th, .print-respondent-table td {
      border: 1px solid #0f172a;
      padding: 8px 8px;
      text-align: center;
      vertical-align: middle;
      line-height: 1.35;
    }
    .print-respondent-table th {
      background-color: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
    }
    .print-respondent-table td {
      font-weight: 700;
      color: #0f172a;
    }
    .print-domain-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      text-align: center;
    }
    .print-domain-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 3px;
      background-color: #f8fafc;
    }
    .print-domain-title {
      font-size: 10px;
      font-weight: 700;
    }
    .print-domain-score {
      font-size: 12px;
      font-weight: 800;
      margin-top: 1px;
    }
    .print-total-score-bar {
      text-align: right;
      font-size: 11px;
      font-weight: 700;
      margin-top: 3px;
    }
    .print-total-score-num {
      font-size: 13.5px;
      font-weight: 900;
      color: #1d4ed8;
    }
    .print-section {
      margin-bottom: 8px;
    }
    .print-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      border-radius: 8px 8px 0 0;
      color: #ffffff;
    }
    .print-section-title-wrap {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .print-section-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #ffffff;
    }
    .print-section-desc {
      font-size: 10px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.85);
    }
    .print-section-badge {
      font-size: 9.5px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      white-space: nowrap;
    }
    .print-header-awareness { background-color: #1e293b; }
    .print-badge-awareness { background-color: #334155; color: #f1f5f9; }
    .print-header-usage { background-color: #1e3a8a; }
    .print-badge-usage { background-color: #1d4ed8; color: #eff6ff; }
    .print-header-communication { background-color: #312e81; }
    .print-badge-communication { background-color: #3730a3; color: #e0e7ff; }
    .print-header-citizenship { background-color: #134e4a; }
    .print-badge-citizenship { background-color: #115e59; color: #ccfbf1; }

    .print-section-body {
      border: 1.2px solid #cbd5e1;
      border-top: none;
      border-radius: 0 0 8px 8px;
      background-color: #ffffff;
    }
    .print-q-item {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .print-q-item:last-child {
      border-bottom: none;
    }
    .print-q-head {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 5px;
    }
    .print-q-badge {
      width: 18px;
      height: 18px;
      border-radius: 9999px;
      background-color: #dbeafe;
      color: #1e40af;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .print-q-text {
      font-size: 11.5px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.35;
      margin: 0;
    }
    .print-options-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 5px;
      width: 100%;
    }
    .print-scale-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border: 1.2px solid #cbd5e1;
      border-radius: 7px;
      background-color: #ffffff;
      padding: 4px 2px 3px 2px;
      height: 44px;
      box-sizing: border-box;
    }
    .print-scale-btn.selected {
      background-color: #ffffff;
      border: 2px solid #1d4ed8;
    }
    .print-scale-btn .score-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      background-color: #f1f5f9;
      border: 1px solid #e2e8f0;
      margin-bottom: 3px;
      flex-shrink: 0;
    }
    .print-scale-btn.selected .score-num {
      background-color: #1d4ed8;
      color: #ffffff;
      border: 1px solid #1d4ed8;
      font-weight: 900;
    }
    .print-scale-btn .score-label {
      font-size: 8.5px;
      font-weight: 500;
      line-height: 1.15;
      text-align: center;
      color: #64748b;
      word-break: keep-all;
    }
    .print-scale-btn.selected .score-label {
      color: #1d4ed8;
      font-weight: 800;
    }
    .print-feedback-section {
      border: 1.2px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      background-color: #ffffff;
      margin-top: 8px;
    }
    .print-feedback-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .print-feedback-desc {
      font-size: 9.5px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .print-feedback-content-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 11px;
      color: #1e293b;
      min-height: 160px;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .print-analysis-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 6px;
      font-size: 9.5px;
      text-align: center;
    }
    .print-analysis-table th, .print-analysis-table td {
      border: 1px solid #cbd5e1;
      padding: 3.5px 5px;
    }
    .print-analysis-table th {
      background-color: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
    }
    .print-analysis-summary-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-top: 6px;
      line-height: 1.4;
    }
    .print-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      text-align: center;
      padding-top: 20px;
      padding-bottom: 8px;
    }
    .print-footer-logo {
      width: 36px;
      height: 36px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .print-footer-text {
      text-align: left;
      line-height: 1.25;
    }
    .print-footer-sub {
      font-size: 11px;
      font-weight: 500;
      color: #64748b;
    }
    .print-footer-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
    }

    /* Colors */
    .text-blue-900 { color: #1e3a8a; }
    .text-blue-700 { color: #1d4ed8; }
    .text-emerald-900 { color: #064e3b; }
    .text-emerald-700 { color: #047857; }
    .text-indigo-900 { color: #312e81; }
    .text-indigo-700 { color: #4338ca; }
    .text-teal-900 { color: #134e4a; }
    .text-teal-700 { color: #0f766e; }

    /* ========================================================= */
    /* EXACT PRINT MEDIA RULES (Mirrors application & survey)    */
    /* ========================================================= */
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }

    @media print {
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        font-family: 'Pretendard', 'Noto Sans KR', sans-serif !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color: #111111 !important;
      }

      .top-action-bar, .print-hide {
        display: none !important;
      }

      .print-doc-container-screen {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
      }

      /* Application Form Exact Print Overrides - 100% Exactly 1 Page Full-Height */
      .doc-page-app {
        box-sizing: border-box !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        height: 275mm !important;
        min-height: 275mm !important;
        max-height: 275mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        overflow: hidden !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .doc-page-app * {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .doc-page-app #docTitle {
        margin-bottom: 0px !important;
        line-height: 1.35 !important;
      }
      .doc-page-app #docTitle .title-project {
        font-size: 15px !important;
        font-weight: 600 !important;
      }
      .doc-page-app #docTitle .title-main {
        font-size: 24px !important;
        font-weight: 800 !important;
        margin-top: 4px !important;
      }
      .doc-page-app #applicantSubTitle {
        font-size: 13.5px !important;
        font-weight: 700 !important;
        margin-bottom: 4px !important;
      }
      .doc-page-app #applicantTable {
        margin-bottom: 0px !important;
        width: 100% !important;
      }
      .doc-page-app #applicantTable th, .doc-page-app #applicantTable td {
        padding: 6.5px 8px !important;
        font-size: 12px !important;
        line-height: 1.3 !important;
        border: 1px solid #111111 !important;
      }
      .doc-page-app #applyRouteGrid {
        gap: 4px 10px !important;
        font-size: 11.5px !important;
      }
      .doc-page-app #hopeServiceList {
        gap: 5px !important;
      }
      .doc-page-app .service-item .service-name {
        font-size: 12px !important;
      }
      .doc-page-app .service-item .service-desc {
        font-size: 11px !important;
      }
      .doc-page-app #hopeDaysList {
        gap: 16px !important;
        font-size: 12px !important;
      }
      .doc-page-app #hopeTimeList {
        gap: 20px !important;
        font-size: 12px !important;
      }
      .doc-page-app #memoCell {
        height: 64px !important;
        padding: 6px 8px !important;
        font-size: 11.5px !important;
        line-height: 1.3 !important;
      }
      .doc-page-app #privacyContainer {
        margin-top: 0px !important;
        border: 1px solid #111111 !important;
        background-color: transparent !important;
        padding: 0 !important;
      }
      .doc-page-app #privacyInner {
        padding: 12px 14px !important;
      }
      .doc-page-app .privacy-head {
        font-size: 13px !important;
        font-weight: 700 !important;
        margin-bottom: 4px !important;
      }
      .doc-page-app .privacy-law {
        font-size: 10.5px !important;
        margin-bottom: 4px !important;
      }
      .doc-page-app .privacy-table {
        margin-bottom: 5px !important;
        width: 100% !important;
      }
      .doc-page-app .privacy-table th, .doc-page-app .privacy-table td {
        padding: 4.5px 6px !important;
        font-size: 11px !important;
        line-height: 1.25 !important;
        border: 1px solid #111111 !important;
      }
      .doc-page-app .consent-radios {
        margin-top: 3px !important;
        margin-bottom: 4px !important;
        gap: 16px !important;
        font-size: 11.5px !important;
      }
      .doc-page-app #portraitHeader {
        margin-top: 10px !important;
        margin-bottom: 3px !important;
        font-size: 13px !important;
      }
      .doc-page-app #consentNotice {
        margin-top: 8px !important;
        font-size: 10.5px !important;
        line-height: 1.35 !important;
      }
      .doc-page-app #signatureSection {
        margin-top: 0px !important;
        font-size: 14.5px !important;
      }
      .doc-page-app #dateRow {
        margin-bottom: 12px !important;
        font-size: 15px !important;
      }
      .doc-page-app #signerRow {
        font-size: 15px !important;
      }
      .doc-page-app #printFooterLogo {
        display: flex !important;
        margin-top: 0px !important;
        margin-bottom: 0px !important;
        gap: 12px !important;
      }
      .doc-page-app #printFooterLogo img {
        width: 38px !important;
        height: 38px !important;
      }
      .doc-page-app #printFooterLogo .org-sub {
        font-size: 11.5px !important;
      }
      .doc-page-app #printFooterLogo .org-title {
        font-size: 18px !important;
        font-weight: 800 !important;
      }

      /* Survey Form Exact Print Overrides */
      .doc-page-survey {
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .print-page-break {
        page-break-before: always !important;
        break-before: page !important;
        padding-top: 6px !important;
      }
      .print-respondent-table {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .print-domain-grid {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .print-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .print-feedback-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .print-footer {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="top-action-bar">
    <div class="top-action-info">
      <span class="top-action-title">🖨️ ${escapeHtml(title)}</span>
      <span class="top-action-notice">💡 인쇄 창에서 대상을 [PDF로 저장]으로 선택하시면 하나의 깔끔한 PDF 문서로 일괄 저장됩니다.</span>
    </div>
    <div class="top-action-buttons">
      <button class="btn-print" onclick="window.print()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        <span>인쇄 / PDF 저장</span>
      </button>
      <button class="btn-close" onclick="window.close()">창 닫기</button>
    </div>
  </div>

  <div class="print-doc-container-screen">
    ${renderedPagesHtml}
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      // Small timeout to allow images/fonts to render before print dialog
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
