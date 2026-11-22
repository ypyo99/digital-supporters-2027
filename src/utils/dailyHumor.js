import { getSavedItem, setSavedItem, removeSavedItem, getLocalDateString } from './helpers';

export const GEMINI_API_KEY_KEY = 'sungdong_gemini_api_key';
const HUMOR_SHOWN_DATE_KEY = 'sungdong_daily_humor_shown_date';
// 프롬프트가 바뀌면 버전을 올려 오늘 이미 캐시된 이전 유머 대신 새로 생성
const HUMOR_CACHE_KEY = 'sungdong_daily_humor_cache_v2';
const HUMOR_HISTORY_KEY = 'sungdong_daily_humor_history';

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
const REQUEST_TIMEOUT_MS = 20000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const todayStr = () => getLocalDateString(new Date());

export const getGeminiApiKey = () => {
  try {
    return (getSavedItem(GEMINI_API_KEY_KEY, '') || '').trim();
  } catch (_) {
    return '';
  }
};

export const saveGeminiApiKey = (key) => {
  const trimmed = (key || '').trim();
  if (trimmed) setSavedItem(GEMINI_API_KEY_KEY, trimmed);
  else removeSavedItem(GEMINI_API_KEY_KEY);
  return trimmed;
};

export const clearGeminiApiKey = () => removeSavedItem(GEMINI_API_KEY_KEY);

export const wasHumorShownToday = () => getSavedItem(HUMOR_SHOWN_DATE_KEY, '') === todayStr();

export const markHumorShownToday = () => setSavedItem(HUMOR_SHOWN_DATE_KEY, todayStr());

const readJson = (key, fallback) => {
  try {
    const raw = getSavedItem(key, '');
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
};

const getTodayCache = () => {
  const cache = readJson(HUMOR_CACHE_KEY, null);
  return cache && cache.date === todayStr() && cache.humor ? cache : null;
};

// 매번 다른 소재가 나오도록 디지털서포터즈 선생님의 실제 업무 장면 중 하나를 무작위로 골라 줍니다.
const HUMOR_TOPICS = [
  '수강생 옆에 앉아 1:1로 스마트폰 사용법을 알려드리는 장면',
  '주강사 수업을 보조하며 교실을 돌아다니며 도와드리는 장면',
  '"선생님, 소리가 안 나요!" 같은 기기 문제를 해결해 드리는 장면',
  '키오스크 주문 실습을 도와드리는 장면',
  '카카오톡 사진·선물하기 실습을 도와드리는 장면',
  '잊어버린 비밀번호·계정 찾기를 함께 해결하는 장면',
  '수업 전 교육실 세팅(태블릿 충전, 와이파이 확인, 의자 정리)',
  '수업이 끝난 뒤 하루 업무일지를 작성하는 장면',
  '출석부를 확인하고 수강생 출결을 체크하는 장면',
  '교육 신청·접수를 안내하는 장면',
  '오전조·오후조 근무 일정과 동료 서포터즈와의 협업',
  '같은 내용을 여러 번 친절하게 다시 설명하는 선생님의 인내심',
  '수업 자료·교재를 준비하고 인쇄하는 장면',
  '수강생이 처음으로 혼자 성공했을 때 함께 기뻐하는 장면',
  'AI 챗봇(제미나이·챗GPT) 사용법을 알려드리는 장면',
  '영상통화·사진 찍기 실습을 도와드리는 장면',
  '모바일 뱅킹·간편결제를 안전하게 쓰는 법과 보이스피싱 예방을 알려드리는 장면',
  '수강생에게 받은 감사 인사나 간식'
];

const buildPrompt = (recent) => {
  const topic = HUMOR_TOPICS[Math.floor(Math.random() * HUMOR_TOPICS.length)];
  const avoid = recent.length
    ? `\n\n최근에 이미 보여준 유머(비슷한 내용·같은 말장난 금지):\n${recent.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : '';
  return `당신은 복지관 디지털배움터의 "디지털서포터즈" 선생님들을 위해 매일 아침 웃음을 선물하는 작가입니다.

디지털서포터즈 선생님이 하는 일:
- 어르신·주민 수강생에게 스마트폰·키오스크·앱·AI 사용법을 1:1 또는 수업 보조로 가르침
- 수업 전 교육실과 기기 준비, 수업 후 정리
- 출결 확인, 교육 신청 안내, 하루 업무일지 작성
- 오전조·오후조로 나누어 동료 서포터즈와 함께 근무

오늘(${todayStr()})의 유머 한 가지와 짧은 격려 글귀를 한국어로 만들어 주세요.

오늘의 업무 장면: ${topic}

조건:
- humor: 반드시 위 "디지털서포터즈 선생님이 하는 일"의 한 장면을 배경으로 한 유머 1개. 선생님(서포터즈)이 직접 등장하거나 선생님의 업무와 분명히 연결되어야 함.
- 디지털 기기에 대한 단순 말장난만 있는 유머, 업무와 무관한 일반 유머는 금지.
- 형식: 교육 현장의 재치 있는 짧은 에피소드, 업무 관련 넌센스 퀴즈, 업무 용어 말장난(아재개그) 중 하나. 2~5문장 이내. 퀴즈 형식이면 질문과 정답을 줄바꿈으로 구분.
- 서포터즈 선생님이 공감하며 웃을 수 있는 내용으로. 어르신 수강생을 놀리거나 무시하는 내용 금지.
- 특정 인물·집단을 비하하거나 정치·종교적인 내용은 절대 금지.
- encouragement: 디지털서포터즈 선생님의 수고를 알아주고 응원하는 따뜻한 한두 문장(60자 이내). "선생님" 같은 호칭으로 시작하지 말고 바로 본문으로 시작.${avoid}`;
};

const responseSchema = {
  type: 'OBJECT',
  properties: {
    humor: { type: 'STRING' },
    encouragement: { type: 'STRING' }
  },
  required: ['humor', 'encouragement']
};

const callGemini = async (apiKey, model, prompt) => {
  const generationConfig = {
    temperature: 1.1,
    responseMimeType: 'application/json',
    responseSchema
  };
  if (model.startsWith('gemini-2.5')) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  let res;
  try {
    res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      signal: controller ? controller.signal : undefined,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      })
    }
  );
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('응답 시간이 초과되었습니다.');
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      if (err?.error?.message) message = err.error.message;
    } catch (_) {}
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  const parsed = JSON.parse(text);
  const humor = String(parsed.humor || '').trim();
  const encouragement = String(parsed.encouragement || '').trim();
  if (!humor) throw new Error('유머 내용이 비어 있습니다.');
  return { humor, encouragement };
};

/**
 * 오늘의 유머를 가져옵니다. 오늘 이미 생성된 내용이 있으면 그대로 사용하고,
 * forceNew가 true면 새로 생성합니다.
 */
export const fetchDailyHumor = async (apiKey, { forceNew = false } = {}) => {
  if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다.');

  if (!forceNew) {
    const cached = getTodayCache();
    if (cached) return { humor: cached.humor, encouragement: cached.encouragement };
  }

  const history = readJson(HUMOR_HISTORY_KEY, []);
  const recent = Array.isArray(history) ? history.slice(-10) : [];
  const current = getTodayCache()?.humor || '';
  const avoidList = current && !recent.includes(current) ? [...recent, current] : recent;

  // 모델이 바쁘거나(429/5xx) 응답 형식이 깨진 경우, 같은 유머가 다시 온 경우 자동으로 재시도
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await callGemini(apiKey, model, buildPrompt(avoidList));
        if (forceNew && current && result.humor === current) {
          lastError = new Error('같은 유머가 생성되어 다시 시도합니다.');
          continue;
        }
        setSavedItem(HUMOR_CACHE_KEY, JSON.stringify({ date: todayStr(), ...result }));
        setSavedItem(HUMOR_HISTORY_KEY, JSON.stringify([...avoidList, result.humor].slice(-10)));
        return result;
      } catch (err) {
        lastError = err;
        // 키 오류(400/401/403)는 재시도해도 소용없음
        if (err.status === 400 || err.status === 401 || err.status === 403) {
          throw err;
        }
        // 모델이 없는 경우(404)는 바로 다음 모델로
        if (err.status === 404) break;
        await sleep(600);
      }
    }
  }
  throw lastError || new Error('유머를 가져오지 못했습니다.');
};
