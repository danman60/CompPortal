-- Add consent fields to studios table
ALTER TABLE studios
ADD COLUMN consent_photo_video BOOLEAN DEFAULT false,
ADD COLUMN consent_photo_video_at TIMESTAMP(6),
ADD COLUMN consent_legal_info BOOLEAN DEFAULT false,
ADD COLUMN consent_legal_info_at TIMESTAMP(6);

COMMENT ON COLUMN studios.consent_photo_video IS 'Studio consent to photo/video usage for competition materials';
COMMENT ON COLUMN studios.consent_photo_video_at IS 'Timestamp when photo/video consent was given';
COMMENT ON COLUMN studios.consent_legal_info IS 'Studio consent to share legal information with platform';
COMMENT ON COLUMN studios.consent_legal_info_at IS 'Timestamp when legal info consent was given';
