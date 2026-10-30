ALTER TABLE posts ADD COLUMN author_id TEXT REFERENCES users(id);
ALTER TABLE posts ADD COLUMN review_state TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE posts ADD COLUMN submitted_version INTEGER;
ALTER TABLE posts ADD COLUMN review_note TEXT NOT NULL DEFAULT '';
CREATE INDEX posts_author ON posts(author_id, updated_at);
CREATE INDEX posts_review ON posts(review_state, updated_at);
CREATE TABLE images (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), extension TEXT NOT NULL,
  data TEXT NOT NULL, size INTEGER NOT NULL, created INTEGER NOT NULL, public_path TEXT
);
CREATE INDEX images_owner ON images(user_id, created);
