-- Give every existing course a colour, in the order new courses take them
-- (server/src/users/courseColors.ts ASSIGN_ORDER). Courses that already have
-- one keep it.
UPDATE "users" SET "courses" = (
	SELECT jsonb_agg(
		CASE
			WHEN "course" ? 'color' THEN "course"
			ELSE "course" || jsonb_build_object(
				'color',
				(ARRAY['indigo', 'emerald', 'amber', 'rose', 'blue', 'purple', 'green', 'slate', 'red-pen'])[(("position" - 1) % 9) + 1]
			)
		END
		ORDER BY "position"
	)
	FROM jsonb_array_elements("courses") WITH ORDINALITY AS t("course", "position")
)
WHERE jsonb_typeof("courses") = 'array' AND jsonb_array_length("courses") > 0;
