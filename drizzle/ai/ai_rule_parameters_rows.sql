-- Delete all existing AI rule parameters before inserting new ones
DELETE FROM "public"."ai_rule_parameters";

-- Insert AI rule parameters
INSERT INTO "public"."ai_rule_parameters" ("id", "rule_key", "parameter_key", "parameter_value", "created_at", "updated_at") VALUES
('14763194-0250-40fa-ac8f-198325fe11d9', 'title.max_length', 'max_length', '80', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'title.min_length', 'min_length', '20', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('76951406-2ef7-4515-bc11-46c9320c32dd', 'title.style', 'style', 'catchy', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('bfdb67e1-232c-439e-a3e7-2e8162c3b7e8', 'title.tone', 'tone', 'compassionate', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('b1c2d3e4-f5a6-7890-bcde-f12345678901', 'title.max_length.ar', 'max_length', '80', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('c2d3e4f5-a6b7-8901-cdef-123456789012', 'title.min_length.ar', 'min_length', '20', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('d3e4f5a6-b7c8-9012-defa-234567890123', 'title.style.ar', 'style', 'catchy', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('e4f5a6b7-c8d9-0123-efab-345678901234', 'title.tone.ar', 'tone', 'compassionate', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('10750244-8635-405e-b996-65b9f79797f1', 'description.max_length', 'max_length', '500', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('a0f45ee4-25d0-475b-be88-d6e1bfaf6c2c', 'description.min_length', 'min_length', '100', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('5d17eea5-4cff-4775-8cea-25b3fe4e598c', 'description.style', 'style', 'factual', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('72e31b00-4c4e-4a96-ba17-35cc5c63dc04', 'description.structure', 'structure', 'narrative', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('8eb7fb23-d239-4ac6-95d5-cfefa208e15d', 'description.tone', 'tone', 'professional', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('f5a6b7c8-d9e0-1234-fabc-456789012345', 'description.max_length.ar', 'max_length', '500', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('a6b7c8d9-e0f1-2345-abcd-567890123456', 'description.min_length.ar', 'min_length', '100', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('b7c8d9e0-f1a2-3456-bcde-678901234567', 'description.style.ar', 'style', 'factual', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('c8d9e0f1-a2b3-4567-cdef-789012345678', 'description.structure.ar', 'structure', 'narrative', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02'),
('d9e0f1a2-b3c4-5678-defa-890123456789', 'description.tone.ar', 'tone', 'professional', '2025-12-27 01:02:54.337003+02', '2025-12-27 01:02:54.337003+02');
