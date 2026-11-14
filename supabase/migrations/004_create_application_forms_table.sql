-- 2027 프로그램 참여 신청서 테이블 생성
CREATE TABLE IF NOT EXISTS public.application_forms (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    applicant_name TEXT NOT NULL,
    gender TEXT,
    phone TEXT,
    address TEXT,
    apply_routes JSONB DEFAULT '[]'::jsonb,
    hope_services JSONB DEFAULT '[]'::jsonb,
    hope_days JSONB DEFAULT '[]'::jsonb,
    hope_time JSONB DEFAULT '{}'::jsonb,
    memo TEXT,
    privacy_consent BOOLEAN DEFAULT true,
    portrait_consent BOOLEAN DEFAULT true,
    sign_date DATE,
    signer_name TEXT,
    signature_data TEXT,
    raw_data JSONB DEFAULT '{}'::jsonb
);

-- RLS (Row Level Security) 설정: 익명 사용자(anon) 및 인증 사용자 모두 읽기/쓰기 허용
ALTER TABLE public.application_forms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'application_forms' 
        AND policyname = 'Allow public access to application_forms'
    ) THEN
        CREATE POLICY "Allow public access to application_forms"
        ON public.application_forms
        FOR ALL
        TO anon, authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_application_forms_name ON public.application_forms(applicant_name);
CREATE INDEX IF NOT EXISTS idx_application_forms_date ON public.application_forms(sign_date);

