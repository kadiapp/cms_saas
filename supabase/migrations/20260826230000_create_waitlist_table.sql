
CREATE TABLE public.clearinghouse_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    clearinghouse TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
