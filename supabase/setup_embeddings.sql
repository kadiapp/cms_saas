-- 1. Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the ICD-10 embeddings table
CREATE TABLE public.icd_embeddings (
    code text PRIMARY KEY,
    short_description text,
    embedding vector(768)
);

-- 3. Create the CPT embeddings table
CREATE TABLE public.cpt_embeddings (
    code text PRIMARY KEY,
    short_description text,
    embedding vector(768)
);

-- 4. Create the semantic search function for ICD-10
CREATE OR REPLACE FUNCTION match_icd_embeddings (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  code text,
  short_description text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    code,
    short_description,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.icd_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 5. Create the semantic search function for CPT
CREATE OR REPLACE FUNCTION match_cpt_embeddings (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  code text,
  short_description text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    code,
    short_description,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.cpt_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
