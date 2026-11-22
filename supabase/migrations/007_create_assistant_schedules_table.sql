-- 보조강사 시간표(최종 배정표) 테이블 생성 + 기본 데이터(2026년 4분기)
-- 시간표 작성 화면의 [보조강사 시간표] 메뉴에서 입력/수정/삭제/저장합니다.
CREATE TABLE IF NOT EXISTS public.assistant_schedules (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    sort_order INT NOT NULL DEFAULT 0,
    program_name TEXT NOT NULL DEFAULT '',   -- 프로그램명 (예: 스마트폰/키오스크 기초 1반)
    subject TEXT NOT NULL DEFAULT '',        -- 시간표 과목명 (예: 보조강사스마트폰1) → 시간표의 학생이름 칸에 들어감
    day_of_week TEXT NOT NULL DEFAULT '월',  -- 요일 (월~금)
    start_time TEXT NOT NULL DEFAULT '',     -- 시작 시간 (HH:MM)
    end_time TEXT NOT NULL DEFAULT '',       -- 종료 시간 (HH:MM)
    location TEXT NOT NULL DEFAULT '',       -- 장소
    team TEXT NOT NULL DEFAULT '',           -- 배정팀 (1팀/2팀/3팀/취업팀)
    group_name TEXT NOT NULL DEFAULT '',     -- 배정조 (1조~ / 오전·오후)
    instructors TEXT NOT NULL DEFAULT '',    -- 강사명 (예: 권용의/김향숙)
    course_start DATE,                       -- 수강기간 시작일
    course_end DATE                          -- 수강기간 종료일
);

ALTER TABLE public.assistant_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'assistant_schedules'
        AND policyname = 'Allow public access to assistant_schedules'
    ) THEN
        CREATE POLICY "Allow public access to assistant_schedules"
        ON public.assistant_schedules
        FOR ALL
        TO anon, authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 기본 데이터: 테이블이 비어 있을 때만 입력
INSERT INTO public.assistant_schedules
    (sort_order, program_name, subject, day_of_week, start_time, end_time, location, team, group_name, instructors, course_start, course_end)
SELECT * FROM (VALUES
    (1,  '스마트폰/키오스크 기초 1반',        '보조강사스마트폰1',     '화', '10:00', '10:50', '3층 평생교육실1',   '2팀',   '4조', '권용의/김향숙', DATE '2026-09-21', DATE '2026-11-27'),
    (2,  '스마트폰/키오스크 기초 2반',        '보조강사스마트폰2',     '화', '11:00', '11:50', '3층 평생교육실1',   '1팀',   '4조', '권오삼/육수영', DATE '2026-09-21', DATE '2026-11-27'),
    (3,  '스마트폰/키오스크 기초 3반',        '보조강사스마트폰3',     '화', '13:00', '13:50', '3층 평생교육실1',   '3팀',   '2조', '윤성배/천은선', DATE '2026-09-21', DATE '2026-11-27'),
    (4,  '스마트폰 활용반',                   '보조강사스마트폰활용',  '화', '14:00', '14:50', '3층 평생교육실1',   '3팀',   '1조', '강계환/박선화', DATE '2026-09-21', DATE '2026-11-27'),
    (5,  '컴퓨터 기초 1반',                   '보조강사컴기초1',       '월', '10:00', '10:50', '2층 디지털 배움터', '1팀',   '2조', '김성수/이혜섭', DATE '2026-09-21', DATE '2026-11-27'),
    (6,  '컴퓨터 기초 2반',                   '보조강사컴기초2',       '월', '11:00', '11:50', '2층 디지털 배움터', '1팀',   '1조', '김종철/이근홍', DATE '2026-09-21', DATE '2026-11-27'),
    (7,  '왕초보 컴퓨터반(월)',               '보조강사왕초보컴퓨터',  '월', '13:00', '13:50', '2층 디지털 배움터', '3팀',   '4조', '이현숙/김용하', DATE '2026-09-21', DATE '2026-11-27'),
    (8,  '왕초보 컴퓨터반(목)',               '보조강사왕초보컴퓨터',  '목', '13:00', '13:50', '2층 디지털 배움터', '취업팀', '오후', '전성주/차미혜', DATE '2026-09-21', DATE '2026-11-27'),
    (9,  '유튜브 쇼츠크리에이터 1반',         '보조강사쇼츠1',         '화', '10:00', '10:50', '2층 디지털 배움터', '취업팀', '오전', '이수인/강유정', DATE '2026-09-21', DATE '2026-11-27'),
    (10, '유튜브 쇼츠크리에이터 2반',         '보조강사쇼츠2',         '화', '11:00', '11:50', '2층 디지털 배움터', '2팀',   '3조', '박정숙/백응현', DATE '2026-09-21', DATE '2026-11-27'),
    (11, '★컴퓨터 활용반(엑셀,파워포인트)',   '보조강사컴활용',        '목', '11:00', '12:30', '2층 디지털 배움터', '1팀',   '3조', '이성호/김영송', DATE '2026-09-21', DATE '2026-11-27'),
    (12, '★AI 챗GPT 활용하기 1반',            '보조강사AI1',           '수', '10:00', '12:00', '2층 디지털 배움터', '2팀',   '1조', '표영/주청자',   DATE '2026-09-21', DATE '2026-11-27'),
    (13, '★AI 챗GPT 활용하기 2반',            '보조강사AI2',           '수', '13:00', '15:00', '2층 디지털 배움터', '3팀',   '3조', '이근수/임미자', DATE '2026-09-21', DATE '2026-11-27'),
    (14, '★AI 챗GPT 활용하기 3반',            '보조강사AI3',           '금', '10:00', '12:00', '2층 디지털 배움터', '2팀',   '2조', '김겸숙/이광범', DATE '2026-09-21', DATE '2026-11-27'),
    (15, '★AI 챗GPT 활용하기 4반',            '보조강사AI4',           '금', '13:00', '15:00', '2층 디지털 배움터', '3팀',   '5조', '강미영/김금미', DATE '2026-09-21', DATE '2026-11-27')
) AS v(sort_order, program_name, subject, day_of_week, start_time, end_time, location, team, group_name, instructors, course_start, course_end)
WHERE NOT EXISTS (SELECT 1 FROM public.assistant_schedules);
