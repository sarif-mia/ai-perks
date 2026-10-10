export const AUTH_RATE_SQL =
  "INSERT INTO auth_rates (id,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN auth_rates.reset_at<? THEN 1 ELSE auth_rates.attempts+1 END, reset_at=CASE WHEN auth_rates.reset_at<? THEN ? ELSE auth_rates.reset_at END RETURNING attempts";
