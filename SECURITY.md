# Security Policy

Agent V is a defensive portfolio project that demonstrates security controls for proposed AI-agent actions. It does not execute the submitted tool request.

## Supported Version

Security fixes are applied to the latest commit on the `main` branch. Older commits and third-party forks are not maintained by this project.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately by emailing **iamvasanth2k4@gmail.com** with:

- the affected route or component;
- clear reproduction steps;
- expected and observed behavior;
- impact and any safe proof-of-concept material.

Do not include real credentials, personal data, or destructive payloads. Please allow reasonable time to investigate before publishing details.

## Security Boundaries

- `/api/state` requires `Authorization: Bearer <AGENTSHIELD_ADMIN_TOKEN>` for reads and writes.
- The public dashboard never receives the administrative token. When the protected API is unavailable, demo events remain in that browser's local storage.
- `/api/analyze` validates the prompt, tool, and agent role and is rate-limited through a Cloudflare Workers binding.
- Viewer, Analyst, Responder, and Administrator roles enforce least-privilege tool policies. High-impact authorized actions can still require human review.
- Deterministic rules remain active if Groq is unconfigured or unavailable.
- Secrets belong in `.dev.vars` locally and Cloudflare secrets in production; neither should be committed.

## Threat Model

The current controls address direct prompt injection, credential or personal-data requests, unsafe tool use, approval bypass, persistent-memory poisoning, unsafe inter-agent delegation, resource-exhaustion prompts, untrusted dependencies, and common obfuscation bypasses.

Agent V is not a production-certified firewall, malware sandbox, identity provider, or tenant-isolation layer. Rule and model decisions can produce false positives or false negatives. A production deployment should add managed identity, per-user authorization, secret rotation, centralized monitoring, upstream abuse controls, dependency scanning, and independent penetration testing.

## Safe Research

Test only systems and data you own or are explicitly authorized to assess. Avoid denial of service, privacy violations, credential access, and any action that could affect other users.
