Security Audit Checklist for Telegram Bot Configuration, Permissions, and Secrets
=======================================================================

Purpose
-------
This checklist is intended to guide a security audit of GovnoBot's Telegram integration, focusing on configuration, runtime permissions, secret management, and operational controls. Use each item as a yes/no checkpoint; where the answer is "no" record remediation steps and assign an owner.

1) Telegram Bot Token Handling
--------------------------------
- [ ] Token is not hard-coded in source files.
- [ ] Token is loaded from a secure environment variable (e.g., `TELEGRAM_GOVNOBOT_TOKEN`) or secret store.
- [ ] Tokens are excluded from logs, error messages, and crash dumps.
- [ ] Access to environment variables containing tokens is restricted to the service user/account only.
- [ ] Token presence is validated at startup with a clear error if missing.
- [ ] There is a documented and tested process to rotate/revoke the bot token (how to reconfigure and deploy).

2) Admin Credentials & Chat IDs
--------------------------------
- [ ] Admin chat IDs and admin username are stored separately from the bot token (e.g., `TELEGRAM_GOVNOBOT_ADMIN_CHATID`).
- [ ] Admin credentials are validated and access to admin-only commands requires explicit admin validation.
- [ ] Admin list changes are auditable (stored with timestamps) and require code review or signed config change.

3) Principle of Least Privilege (Telegram Permissions)
-----------------------------------------------------
- [ ] Bot only requests/uses Telegram permissions required for its features (no unnecessary elevated rights).
- [ ] Use polling instead of webhooks where webhook endpoints would expose an externally routable secret URL, unless webhooks are secured.
- [ ] If webhooks are used: webhook endpoint is HTTPS, uses a dedicated TLS certificate, and includes IP/referer restrictions or secret path.

4) Secret Storage and Access Controls
-------------------------------------
- [ ] Secrets (tokens, API keys) are stored in environment variables, OS secret manager, or an encrypted file with strict filesystem permissions.
- [ ] No secrets committed to Git or present in repository history.
- [ ] CI/CD pipelines have separate secrets with minimal scopes; pipeline logs do not reveal secrets.
- [ ] Backups that contain configuration or secret material are encrypted and access-restricted.

5) Filesystem and Process Permissions
------------------------------------
- [ ] The bot process runs under a dedicated, unprivileged system account.
- [ ] Files and directories under `data/`, `govnobot_data/`, and backups have minimal permissions (owner-only write where feasible).
- [ ] Log files do not contain plaintext secrets and are rotated and access-limited.

6) Configuration Management
---------------------------
- [ ] Config files are documented and validated on startup; invalid configs fail fast.
- [ ] Sensitive config values are referenced via environment variables or secrets rather than inline config files.
- [ ] Changes to configuration are reviewed and tracked (git or audit trail) and not applied ad-hoc on production servers.

7) CI/CD and Deployment Security
--------------------------------
- [ ] Deployment credentials (SSH keys, service tokens) are rotated and limited in scope.
- [ ] Build artifacts do not embed secrets; environment-specific secrets injected at deploy/runtime.
- [ ] Automated deploys authenticate to target hosts securely (avoid reusable plaintext credentials in scripts).

8) Audit Logging and Monitoring
-------------------------------
- [ ] Admin actions and potentially dangerous commands (e.g., `/sh`) are logged with timestamp, actor, and result, and logs are integrity-protected when possible.
- [ ] Suspicious authentication or API errors trigger alerts to admin and are retained for investigation.
- [ ] Rate-limiting events and repeated failures are logged for forensic analysis.

9) Secret Rotation & Incident Response
--------------------------------------
- [ ] There is a documented procedure to rotate the Telegram token and any downstream API keys.
- [ ] Procedure includes steps to update deployments and revoke old tokens.
- [ ] There is an incident response playbook for compromised tokens (revoke token, rotate, audit logs, notify users/admins).

10) Third-Party Integrations & Providers
----------------------------------------
- [ ] Remote LLM provider credentials (OpenAI, Ollama endpoints) are treated as secrets and scoped minimally.
- [ ] Fallback providers do not expose secrets in error responses or logs.

11) Local Development Hygiene
----------------------------
- [ ] Developer documentation requires use of local `.env` or secret injection and explicitly forbids committing secrets.
- [ ] Example config files use placeholders (e.g., `TELEGRAM_GOVNOBOT_TOKEN=REPLACE_ME`).

12) Recommended Automated Checks
--------------------------------
- [ ] Repository secret scanning is configured (pre-commit hook or CI check) to block accidental commits of tokens.
- [ ] CI fails if `TELEGRAM_GOVNOBOT_TOKEN` or other required secrets are missing (to catch misconfig in deploy pipelines).
- [ ] File permission and ownership checks run as part of a deployment health check.

Remediation Examples & Quick Commands
-------------------------------------
- Rotate Telegram token: 1) Revoke current token in BotFather; 2) Set new token in environment or secrets manager; 3) Restart service.
- Restrict file permissions (Linux): `chown govnobot:govnobot data/ -R ; chmod 700 data/` (adapt for Windows ACLs).
- Safer environment injection (example): use OS secret store or CI/CD secret injection rather than checked-in config.

Notes
-----
This checklist focuses on configuration, secrets, and permissions related to Telegram integration. It should be used alongside standard application security reviews (dependency checks, code review, threat modeling, and network-level protections).
