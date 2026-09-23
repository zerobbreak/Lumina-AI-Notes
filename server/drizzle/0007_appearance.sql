ALTER TABLE "users" ADD COLUMN "appearance" jsonb;--> statement-breakpoint
-- Existing users keep the look they have: the dark Observatory world, the
-- Outfit UI font and their old accent. New users (appearance null) get the
-- new defaults.
UPDATE "users" SET "appearance" = jsonb_build_object(
	'world', 'observatory',
	'mode', 'dark',
	'uiFont', 'outfit',
	'accent', jsonb_build_object(
		'kind', 'swatch',
		'id', CASE
			WHEN "theme" IN ('indigo', 'blue', 'purple', 'rose', 'amber', 'emerald', 'green', 'slate') THEN "theme"
			ELSE 'indigo'
		END
	)
);
