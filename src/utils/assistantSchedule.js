// 보조강사 시간표(최종 배정표) 데이터 관리
// - Supabase 'assistant_schedules' 테이블에 저장
// - 시간표 작성 화면의 [② 보조강사 적용]에서 이 데이터를 사용

import { supabaseClient } from './supabase';

export const ASSISTANT_TABLE = 'assistant_schedules';
export const ASSISTANT_DAYS = ['월', '화', '수', '목', '금'];
export const ASSISTANT_TEAMS = ['1팀', '2팀', '3팀', '취업팀'];
export const getGroupOptions = (team) =>
  team === '취업팀' ? ['오전', '오후'] : ['1조', '2조', '3조', '4조', '5조', '6조'];

// 2026년 4분기 기본 데이터 (마이그레이션 007과 동일)
const DEFAULT_START = '2026-09-21';
const DEFAULT_END = '2026-11-27';
const d = (program_name, subject, day_of_week, start_time, end_time, location, team, group_name, instructors) => ({
  program_name, subject, day_of_week, start_time, end_time, location, team, group_name, instructors,
  course_start: DEFAULT_START, course_end: DEFAULT_END
});
export const DEFAULT_ASSISTANT_ROWS = [
  d('스마트폰/키오스크 기초 1반', '보조강사스마트폰1', '화', '10:00', '10:50', '3층 평생교육실1', '2팀', '4조', '권용의/김향숙'),
  d('스마트폰/키오스크 기초 2반', '보조강사스마트폰2', '화', '11:00', '11:50', '3층 평생교육실1', '1팀', '4조', '권오삼/육수영'),
  d('스마트폰/키오스크 기초 3반', '보조강사스마트폰3', '화', '13:00', '13:50', '3층 평생교육실1', '3팀', '2조', '윤성배/천은선'),
  d('스마트폰 활용반', '보조강사스마트폰활용', '화', '14:00', '14:50', '3층 평생교육실1', '3팀', '1조', '강계환/박선화'),
  d('컴퓨터 기초 1반', '보조강사컴기초1', '월', '10:00', '10:50', '2층 디지털 배움터', '1팀', '2조', '김성수/이혜섭'),
  d('컴퓨터 기초 2반', '보조강사컴기초2', '월', '11:00', '11:50', '2층 디지털 배움터', '1팀', '1조', '김종철/이근홍'),
  d('왕초보 컴퓨터반(월)', '보조강사왕초보컴퓨터', '월', '13:00', '13:50', '2층 디지털 배움터', '3팀', '4조', '이현숙/김용하'),
  d('왕초보 컴퓨터반(목)', '보조강사왕초보컴퓨터', '목', '13:00', '13:50', '2층 디지털 배움터', '취업팀', '오후', '전성주/차미혜'),
  d('유튜브 쇼츠크리에이터 1반', '보조강사쇼츠1', '화', '10:00', '10:50', '2층 디지털 배움터', '취업팀', '오전', '이수인/강유정'),
  d('유튜브 쇼츠크리에이터 2반', '보조강사쇼츠2', '화', '11:00', '11:50', '2층 디지털 배움터', '2팀', '3조', '박정숙/백응현'),
  d('★컴퓨터 활용반(엑셀,파워포인트)', '보조강사컴활용', '목', '11:00', '12:30', '2층 디지털 배움터', '1팀', '3조', '이성호/김영송'),
  d('★AI 챗GPT 활용하기 1반', '보조강사AI1', '수', '10:00', '12:00', '2층 디지털 배움터', '2팀', '1조', '표영/주청자'),
  d('★AI 챗GPT 활용하기 2반', '보조강사AI2', '수', '13:00', '15:00', '2층 디지털 배움터', '3팀', '3조', '이근수/임미자'),
  d('★AI 챗GPT 활용하기 3반', '보조강사AI3', '금', '10:00', '12:00', '2층 디지털 배움터', '2팀', '2조', '김겸숙/이광범'),
  d('★AI 챗GPT 활용하기 4반', '보조강사AI4', '금', '13:00', '15:00', '2층 디지털 배움터', '3팀', '5조', '강미영/김금미')
];

// 테이블이 아직 만들어지지 않았는지 판별
export const isMissingTableError = (error) => {
  if (!error) return false;
  const msg = `${error.code || ''} ${error.message || ''}`;
  return /42P01|PGRST205|does not exist|Could not find the table/i.test(msg);
};

export const fetchAssistantSchedules = async () => {
  const { data, error } = await supabaseClient
    .from(ASSISTANT_TABLE)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
};

const toDbRow = (row, index, courseStart, courseEnd) => ({
  sort_order: index + 1,
  program_name: (row.program_name || '').trim(),
  subject: (row.subject || '').trim(),
  day_of_week: row.day_of_week || '월',
  start_time: row.start_time || '',
  end_time: row.end_time || '',
  location: (row.location || '').trim(),
  team: row.team || '',
  group_name: row.group_name || '',
  instructors: (row.instructors || '').trim(),
  course_start: courseStart || null,
  course_end: courseEnd || null,
  updated_at: new Date().toISOString()
});

// 편집 화면의 전체 목록을 저장: 사라진 행은 삭제, 기존 행은 수정, 새 행은 추가
export const saveAssistantSchedules = async (rows, originalIds, courseStart, courseEnd) => {
  const keepIds = new Set(rows.filter(r => r.id).map(r => r.id));
  const deleteIds = originalIds.filter(id => !keepIds.has(id));

  if (deleteIds.length > 0) {
    const { error } = await supabaseClient.from(ASSISTANT_TABLE).delete().in('id', deleteIds);
    if (error) throw error;
  }

  const existing = [];
  const inserts = [];
  rows.forEach((r, i) => {
    const dbRow = toDbRow(r, i, courseStart, courseEnd);
    if (r.id) existing.push({ id: r.id, ...dbRow });
    else inserts.push(dbRow);
  });

  if (existing.length > 0) {
    const { error } = await supabaseClient.from(ASSISTANT_TABLE).upsert(existing, { onConflict: 'id' });
    if (error) throw error;
  }
  if (inserts.length > 0) {
    const { error } = await supabaseClient.from(ASSISTANT_TABLE).insert(inserts);
    if (error) throw error;
  }
};

// [② 보조강사 적용]에서 사용하는 형식으로 변환
// teamKey: '1'~'3' 또는 '취업팀', groupKey: '1'~ 또는 '오전'/'오후'
export const toApplyEntries = (rows) =>
  rows
    .filter(r => r.subject && r.day_of_week && r.start_time && r.team && r.group_name)
    .map(r => ({
      subject: String(r.subject).normalize('NFC').trim(),
      day: r.day_of_week,
      startTime: r.start_time,
      endTime: r.end_time,
      teamKey: r.team === '취업팀' ? '취업팀' : (r.team.match(/\d+/) || [''])[0],
      groupKey: r.team === '취업팀' ? r.group_name : (r.group_name.match(/\d+/) || [''])[0],
      courseStart: r.course_start || '',
      courseEnd: r.course_end || ''
    }));
