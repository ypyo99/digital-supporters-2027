-- 2027 1:1 디지털 교육 사전 설문조사 테이블 생성
CREATE TABLE IF NOT EXISTS public.pre_surveys (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    survey_date DATE NOT NULL,
    participant_name TEXT NOT NULL,
    surveyor_name TEXT,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    score_awareness INT,
    score_usage INT,
    score_communication INT,
    score_citizenship INT,
    score_total INT,
    score_average NUMERIC(4,2),
    feedback TEXT,
    raw_data JSONB DEFAULT '{}'::jsonb
);

-- RLS (Row Level Security) 설정: 익명 사용자(anon) 및 인증 사용자 모두 읽기/쓰기/수정/삭제 허용
ALTER TABLE public.pre_surveys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pre_surveys' 
        AND policyname = 'Allow public access to pre_surveys'
    ) THEN
        CREATE POLICY "Allow public access to pre_surveys"
        ON public.pre_surveys
        FOR ALL
        TO anon, authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pre_surveys_participant ON public.pre_surveys(participant_name);
CREATE INDEX IF NOT EXISTS idx_pre_surveys_date ON public.pre_surveys(survey_date);

