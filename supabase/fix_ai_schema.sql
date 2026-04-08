ALTER TABLE public.config
ADD COLUMN IF NOT EXISTS ai_simulation_subtitle text,
ADD COLUMN IF NOT EXISTS ai_simulation_title text,
ADD COLUMN IF NOT EXISTS ai_simulation_quote text,
ADD COLUMN IF NOT EXISTS ai_simulation_body text,
ADD COLUMN IF NOT EXISTS ai_simulation_badge text;
