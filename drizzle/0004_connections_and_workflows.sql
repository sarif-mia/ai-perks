ALTER TABLE workspaces ADD COLUMN usage_mode TEXT NOT NULL DEFAULT 'business';
CREATE TABLE integrations (id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,provider TEXT NOT NULL,account_email TEXT NOT NULL,credentials TEXT NOT NULL,config TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(workspace_id,provider));
CREATE TABLE oauth_states (state_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,provider TEXT NOT NULL,verifier TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE automation_runs (id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,automation_id TEXT NOT NULL,source_key TEXT NOT NULL,source_id TEXT NOT NULL,source_kind TEXT NOT NULL,action TEXT NOT NULL,instructions TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending',result TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(automation_id,source_key));
CREATE INDEX automation_runs_queue ON automation_runs(status,created_at);
CREATE INDEX automation_runs_workspace ON automation_runs(workspace_id,created_at);
UPDATE records SET payload=json_set(payload,'$.enabled',json('false')) WHERE kind='automations';
