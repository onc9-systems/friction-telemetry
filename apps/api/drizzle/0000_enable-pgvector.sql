-- Custom SQL migration file, put your code below! --
-- pgvector for passage and qa_entry embeddings. drizzle-kit never emits CREATE EXTENSION, so it lives here, before any table.
CREATE EXTENSION IF NOT EXISTS vector;
