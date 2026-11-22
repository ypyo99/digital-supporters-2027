import { getSavedItem, setSavedItem, removeSavedItem, getLocalDateString } from './helpers';

export const GEMINI_API_KEY_KEY = 'sungdong_gemini_api_key';
const HUMOR_SHOWN_DATE_KEY = 'sungdong_daily_humor_shown_date';
const HUMOR_CACHE_KEY = 'sungdong_daily_humor_cache';
const HUMOR_HISTORY_KEY = 'sungdong_daily_humor_history';

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

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

// 매번 다른 소재가 나오도록 디지털서포터즈 현장의 소재 중 하나를 무작위로 골라 줍니다.
const HUMOR_TOPICS = [
  '스마트폰 글씨 크기·화면 밝기 설정',
  '카카오톡 사진 보내기·이모티콘',
  '키오스크로 햄버거·커피 주문하기',
  '와이파이·블루투스 연결',
  '비밀번호·패턴 잠금을 잊어버린 상황',
  '영상통화·화상회의 앱',
  '모바일 뱅킹·간편결제 배우기',
  '유튜브 검색·구독 버튼',
  '사진 찍기·셀카·갤러리 정리',
  '배달앱·기차표 예매 앱',
  '음성비서(AI 스피커·빅스비·시리)',
  '스마트폰 충전기·배터리',
  'QR코드 찍기',
  '수업 시간에 받는 질문과 선생님의 끈기',
  '디지털배움터 수업 준비와 출근길',
  'AI 챗봇(제미나이·챗GPT) 처음 써보기'
];

const buildPrompt = (recent) => {
  const topic = HUMOR_TOPICS[Math.floor(Math.random() * HUMOR_TOPICS.length)];
  const avoid = recent.length
    ? `\n\n최근에 이미 보여준 유머(비슷한 내용·같은 말장난 금지):\n${recent.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
    : '';
  return `당신은 복지관 디지털배움터에서 어르신들께 스마트폰·키오스크·앱 사용법을 가르치는 "디지털서포터즈" 선생님들을 위해 매일 아침 웃음을 선물하는 작가입니다.

오늘(${todayStr()})의 유머 한 가지와 짧은 격려 글귀를 한국어로 만들어 주세요.

오늘의 소재: ${topic}

조건:
- humor: 반드시 디지털서포터즈 선생님의 일상(디지털 기기 교육 현장, 스마트폰·앱·키오스크·인터넷, 수업 준비, 수강생과의 따뜻한 에피소드)과 관련된 유머 1개. 디지털 교육과 무관한 일반 유머는 금지.
- 형식: 넌센스 퀴즈, 디지털 용어 말장난(아재개그), 재치 있는 짧은 교실 에피소드 중 하나. 2~5문장 이내. 퀴즈 형식이면 질문과 정답을 줄바꿈으로 구분.
- 어르신 수강생을 놀리거나 무시하는 내용 금지. 어르신도 함께 웃을 수 있는 따뜻한 웃음으로.
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
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
  const prompt = buildPrompt(recent);

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const result = await callGemini(apiKey, model, prompt);
      setSavedItem(HUMOR_CACHE_KEY, JSON.stringify({ date: todayStr(), ...result }));
      setSavedItem(HUMOR_HISTORY_KEY, JSON.stringify([...recent, result.humor].slice(-10)));
      return result;
    } catch (err) {
      lastError = err;
      // 키 오류(400/401/403)는 다른 모델로 재시도해도 소용없음
      if (err.status === 400 || err.status === 401 || err.status === 403) break;
    }
  }
  throw lastError || new Error('유머를 가져오지 못했습니다.');
};
