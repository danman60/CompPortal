-- Add reservation token tracking to competitions table
ALTER TABLE public.competitions
ADD COLUMN IF NOT EXISTS total_reservation_tokens INT DEFAULT 600,
ADD COLUMN IF NOT EXISTS available_reservation_tokens INT DEFAULT 600,
ADD COLUMN IF NOT EXISTS tokens_override_enabled BOOLEAN DEFAULT false;

-- Update existing competitions to have 600 tokens
UPDATE public.competitions
SET
  total_reservation_tokens = 600,
  available_reservation_tokens = 600,
  tokens_override_enabled = false
WHERE total_reservation_tokens IS NULL;

-- Create function to update available tokens when reservations change
CREATE OR REPLACE FUNCTION update_competition_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF (TG_OP = 'INSERT') THEN
    -- Only deduct tokens if status is approved
    IF NEW.status = 'approved' AND NEW.spaces_confirmed IS NOT NULL THEN
      UPDATE public.competitions
      SET available_reservation_tokens = available_reservation_tokens - NEW.spaces_confirmed
      WHERE id = NEW.competition_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF (TG_OP = 'UPDATE') THEN
    -- If status changed to approved, deduct tokens
    IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.spaces_confirmed IS NOT NULL THEN
      UPDATE public.competitions
      SET available_reservation_tokens = available_reservation_tokens - NEW.spaces_confirmed
      WHERE id = NEW.competition_id;
    END IF;

    -- If status changed from approved to something else, return tokens
    IF OLD.status = 'approved' AND NEW.status != 'approved' AND OLD.spaces_confirmed IS NOT NULL THEN
      UPDATE public.competitions
      SET available_reservation_tokens = available_reservation_tokens + OLD.spaces_confirmed
      WHERE id = OLD.competition_id;
    END IF;

    -- If spaces_confirmed changed while approved, adjust tokens
    IF NEW.status = 'approved' AND OLD.status = 'approved' THEN
      IF NEW.spaces_confirmed != OLD.spaces_confirmed THEN
        UPDATE public.competitions
        SET available_reservation_tokens = available_reservation_tokens + COALESCE(OLD.spaces_confirmed, 0) - COALESCE(NEW.spaces_confirmed, 0)
        WHERE id = NEW.competition_id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    -- Return tokens if reservation was approved
    IF OLD.status = 'approved' AND OLD.spaces_confirmed IS NOT NULL THEN
      UPDATE public.competitions
      SET available_reservation_tokens = available_reservation_tokens + OLD.spaces_confirmed
      WHERE id = OLD.competition_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS reservation_tokens_trigger ON public.reservations;

CREATE TRIGGER reservation_tokens_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION update_competition_tokens();

-- Add comment to explain the token system
COMMENT ON COLUMN public.competitions.total_reservation_tokens IS 'Total reservation tokens allocated to this competition (default: 600 per weekend)';
COMMENT ON COLUMN public.competitions.available_reservation_tokens IS 'Currently available reservation tokens (decremented when reservations are approved)';
COMMENT ON COLUMN public.competitions.tokens_override_enabled IS 'Whether admin has overridden token limits for this competition';
