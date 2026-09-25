# Auth and workspace

**Iteration:** iteration-1--foundation
**Depends on:** 01-shell
**Status:** not started

## UX

This spec makes the people real. After it, a company can create its Friction workspace, connect sign-in (its identity provider, or email invites), bring in its people, and choose its leaders (flow 1). An employee can open the Mac app and sign in with their work account (the sign-in part of flow 2). The shell's always-signed-in "Sam Okafor" is replaced by whoever actually signed in, and the initiative section of the sidebar shows only for people an admin made a leader. Everything else in the app keeps looking exactly as the shell built it.

Two audiences, two places:
- **Employees and leaders** only ever see the Mac app, plus one system sign-in sheet that hosts the web sign-in page.
- **Admins** (usually IT, sometimes the leader who bought Friction) set up the workspace in a web console served by the service at `/admin`. The Mac app links to it; it does not duplicate it. Rationale in Decisions.

Roles, in plain terms (these three words are the only role vocabulary in UI copy):
- **Employee**: everyone. Has the pill, Home, Ask, Q&A.
- **Leader**: an employee who can also declare initiatives and read insights and health. Sees the initiative section of the sidebar.
- **Admin**: an employee who can also manage the workspace in `/admin` (sign-in, people, roles). Admin does not imply leader. Roles combine: "Employee, leader, and admin" is valid.

Being an affected person or an owner of a specific initiative (InitiativeMember) is phase 05, not a role here.

### Mac app: signed out (flow 2, sign-in)

- On first launch, and whenever no one is signed in, the app shows the **Welcome window** instead of the pill. The pill is hidden while signed out, because a flag has nowhere to go without an account.
- Menu bar menu while signed out: **Sign in to Friction**, separator, **Debug** submenu (Debug builds only), **Quit**. "Open Friction", "Flag something" and "Pause screen context" are absent, not disabled.
- Welcome window: 440 by 520 pt, centered, not resizable, hidden title bar, app in the Dock while it is open (the shell's activation policy rule). Content top to bottom: app glyph at 64 pt; title "Welcome to Friction"; one line "Sign in with your work account to start."; primary button **Sign in** (Return triggers it); footnote "Your company sets up Friction first. If sign-in doesn't work, ask your IT team."
- Pressing **Sign in** opens the system sign-in sheet (ASWebAuthenticationSession) over the Welcome window, showing the web sign-in page below. The button shows a small spinner and the text "Finish signing in in the sign-in window" while the sheet is up.
- **Cancel** in the sheet, or closing it: back to the idle Welcome window with no error text. The person chose to stop.
- **Network error** before or during token exchange: an inline line under the button, "Couldn't reach Friction. Check your connection and try again." The button returns to **Sign in**.
- **Access ended** (the person was removed or deprovisioned since their last sign-in, or their session was revoked): the Welcome window opens with a line above the button: "You no longer have access to Acme Logistics. If this is a mistake, contact your admin." (organization name from the cached profile; if none is cached: "You no longer have access to this workspace.")
- **Session expired** (refresh token expired after long disuse): "Your session ended. Sign in again to continue."
- **Success**: the sheet closes, the Welcome window shows for one second "Signed in as Sam Okafor, Acme Logistics", then closes. The pill appears in its remembered position and the main window opens on Home. Phase 03 later inserts its permissions checklist between sign-in and the pill; this spec exposes the "did sign in" moment for it.

### Web sign-in page (inside the sheet, also reachable in a browser)

A centered card, 400 px wide, system font stack, follows light or dark from `prefers-color-scheme`, product glyph at the top, no navigation. Text wraps; nothing is ellipsized.

1. **Email step.** Title "Sign in to Friction". Field "Work email" (autofocus, `autocomplete="email"`). Button **Continue**.
2. The service routes by the email's domain:
   - **The domain belongs to a workspace with a verified identity provider**: the page immediately redirects to that provider (Okta, Entra ID, Google Workspace, any OIDC or SAML provider). The person signs in there as they do every morning. If the provider already has a session, this is one bounce with no typing.
   - **Otherwise**, if the address has an account or a pending invitation: step 3.
   - **No account, no invitation, no SSO domain**: "We couldn't find a Friction workspace for sam@gmail.com. Ask your admin to invite you, or create a workspace." with a link **Create a workspace** (to `/setup`). See Open decisions on account enumeration.
3. **Code step.** Title "Check your email". Text "We sent a 6-digit code to sam@acme.com. It expires in 10 minutes." Six-digit field (`autocomplete="one-time-code"`, paste fills it). Button **Sign in**. Link **Send a new code** (disabled for 30 seconds after each send, with "You can ask for a new code in 30 seconds" counting down). Link **Use a different email**.
   - Wrong code: "That code didn't match. Check the latest email from Friction." After 5 wrong attempts: "Too many attempts. Ask for a new code."
   - Expired code: "That code has expired. Ask for a new code."
4. **Identity provider errors** return to a card: "Sign-in didn't finish. Your identity provider said: {provider message}. Try again, or contact your IT team." with **Try again**.
5. **Directory says no** (workspace uses directory sync and the person is not active in it): "Your IT team hasn't given you access to Friction yet."
6. **Pending invitations** are accepted automatically at the first successful sign-in with the invited address. There is no separate "accept" screen: the admin's invite plus the person signing in is the consent.

### Workspace creation (flow 1, step 1): `/setup`

- Card titled "Create your Friction workspace". Fields: "Organization name" ("Acme Logistics"), "Your work email". Button **Continue**, then the same code step as sign-in, then the workspace exists.
- The creator becomes employee, leader, and admin (see Open decisions). They land on `/admin` with the setup checklist.
- If the email already belongs to a workspace: "sam@acme.com already belongs to Acme Logistics. Sign in instead." with a link to sign in.

### Admin console: `/admin` (flow 1)

A Linear-style web console: left navigation 220 px (**Setup**, **People**, **Sign-in**, **Directory sync**, **Workspace**), content column up to 880 px. Tables wrap cell text and scroll sideways when wider than the column; no cell is truncated. Signing in to `/admin` uses the same sign-in page; non-admins who reach it see "Only admins can manage Acme Logistics. Your admins are Priya Raman and Dan Cho." (every admin listed).

**Setup** (the first page, a checklist in flow 1 order; each row shows Done or a button):
1. "Workspace created" (Done, with the name and a **Rename** link).
2. "Connect sign-in": **Set up SSO** or **Use email invites**. Done when an identity provider is verified, or when the admin picked email invites.
3. "Bring in your people": **Connect directory sync** or **Invite people**. Done at the first provisioned or invited person.
4. "Choose your leaders": **Choose leaders** (opens People filtered to everyone). Done when at least one leader exists besides the creator, or the creator confirms "I'm the only leader for now".
5. "Share the Mac app": the download link with **Copy link**, and the line "People sign in with their work email. They see only what you set up here."

**People** (the people directory):
- Table columns: Name, Email, Access, Joined via, Status. Access is three chips: Employee (always on, not toggleable), **Leader** (toggle), **Admin** (toggle). Joined via: Invite, SSO, or Directory. Status: Invited (with the date sent), Active.
- **Invite people** button opens a panel: a large text area "Email addresses, one per line or separated by commas or spaces. You can paste a column from a spreadsheet."; checkbox "Give these people leader access"; button reads **Send 12 invites** with the live count of valid, new addresses. Result line: "12 invites sent. 2 skipped: sam@acme.com is already a member. not-an-email isn't an email address." Every skipped entry is listed, never summarized as "and 3 more".
- In a workspace with SSO, the same panel is how an admin pre-assigns leader access to someone who has not signed in yet; the email says to sign in with the company account.
- Invited rows: **Resend** ("Invite sent again to sam@acme.com.") and **Cancel invite** (no confirmation, reversible by inviting again).
- Toggling **Leader** takes effect on the person's next request: the Mac app shows or hides the initiative section within a minute (see Mac behavior below). The toggle shows "Saved" for 2 seconds.
- Toggling off the last **Admin**: the toggle is disabled with the text "Acme Logistics needs at least one admin."
- **Remove from workspace** (row menu), confirmation: "Sam Okafor loses access right away and is signed out on their Mac. Flags and questions they already sent stay in Acme Logistics' evidence, still without their name." Buttons **Remove** and **Cancel**. People managed by directory sync show instead: "Managed by your directory. Remove Sam Okafor in Okta and the change reaches Friction automatically."

**Sign-in** (SSO setup):
- Choice: **OpenID Connect** or **SAML**.
- OIDC form: "Issuer URL", "Client ID", "Client secret". A copy field "Redirect URI to register in your identity provider" with the exact URL.
- SAML form: copy fields "ACS URL" and "Entity ID", a **Download SP metadata** link, and either "Identity provider metadata URL" or a text area "Paste identity provider metadata XML".
- "Email domain" field ("acme.com"; several allowed, comma separated). After saving, a DNS box: "Add this TXT record to acme.com: Host `_better-auth-token-{providerId}`, Value `{token}`." Button **Verify domain**. States: Pending ("We couldn't find the TXT record yet. DNS changes can take up to 48 hours."), Verified ("acme.com verified. Everyone with an @acme.com address now signs in with Okta."), Failed with the resolver's reason.
- **Test sign-in** opens the SSO flow in a new tab and ends on a result page: "Sign-in works. Your identity provider returned sam@acme.com, Sam Okafor." or the provider's error text.
- Once a domain is verified, email codes are refused for that domain: the sign-in page always redirects those addresses to the provider. No email-code fallback for SSO domains, admins included.

**Directory sync** (SCIM):
- Explainer: "Directory sync keeps Friction's people list in step with your identity provider. People you assign to Friction there appear here; people you unassign lose access."
- **Generate SCIM token** shows the SCIM base URL and the token once: "Copy this token now. You won't see it again." Buttons **Rotate token** (the old one keeps working for 24 hours, stated in the UI) and **Revoke token** (confirmation: "Your identity provider stops syncing until you give it a new token.").
- Status line: "142 people synced from your directory."
- Leader access is still set by hand in People (see Open decisions on mapping IdP groups).

**Workspace**: organization name (editable), slug (read-only), created date, the list of admins.

### Invitation email (Resend)

- From "Friction", subject "Priya Raman invited you to Acme Logistics on Friction".
- Body: "Priya Raman invited you to join Acme Logistics on Friction. Friction lets you flag what gets in your way at work and get answers from your company's documents." Then "Sign in with this address: sam@acme.com" (SSO workspaces: "Sign in with your Acme Logistics account."). Button **Download Friction for Mac**. Footer: "If you weren't expecting this, you can ignore this email."
- Code email: subject "Your Friction sign-in code", body "Your code is 482913. It expires in 10 minutes. If you didn't try to sign in, you can ignore this email."
- No other email is ever sent to an employee by this spec. The product speaks only when spoken to; the invite is the admin speaking.

### Mac app: signed in

- Sidebar top shows the real organization name and the signed-in person's initials. Clicking the initials opens a menu: full name, email, the access line ("Employee", "Employee and leader", "Employee, leader, and admin"), separator, **Settings**, **Sign out**.
- **Initiative section gate**: Initiatives, Insights, and Health appear only when the profile says the person has leader access. The app refreshes the profile when the main window opens, when the app becomes active, and every 5 minutes while running. When leader access is removed while the person is in an initiative screen, the window moves to Home and shows a banner at the top of Home: "You no longer have leader access in Acme Logistics." with a close X. When it is granted, the section simply appears. No system notification either way.
- **Settings > Account** (the shell's inert row becomes real): Name, Email, Workspace, Access (the same access line). For admins, a row "Workspace settings live in your browser" with **Manage workspace**, which opens `/admin` in the default browser. Then **Sign out**.
- **Sign out**: confirmation "Sign out of Friction on this Mac?" with **Sign out** and **Cancel**. If the outbox (phase 04) holds unsent flags: "2 flags haven't sent yet. Signing out deletes them from this Mac." with **Delete and sign out** and **Cancel**. After sign-out: pill hidden, main window closed, Welcome window shown. The next **Sign in** always shows the email step (it does not silently reuse the web session).
- **Offline at launch**: the app stays signed in with the cached profile (name, organization, access). The pill works; phase 04's outbox holds flags. Nothing about sign-in is shown unless the service later rejects the account.
- **Access revoked mid-session**: the next request fails, the refresh fails, the app signs out and shows the Welcome window with the "no longer have access" line above.

### Debug

The Debug submenu gains **Data source: Live / Fixtures**. Live is the default once this spec lands. Fixtures restores the shell exactly: FixtureClient, the sample person always signed in, and the shell's leader toggle, with no network. Release builds have only Live.

### Out of scope

Initiative membership (affected, owner) and membership-scoped initiative lists (phase 05). Permissions onboarding after sign-in (phase 03). Leader mapping from identity provider groups. Multiple workspaces per person. Self-serve deletion of a workspace. Social sign-in (Google, Microsoft consumer accounts) and passwords. Distribution of the Mac app itself (the download link points at whatever `DOWNLOAD_URL` is). A Windows client.

## Technology

### Decisions

| Decision | Rationale | Rejected |
|---|---|---|
| better-auth 1.7.x (1.7.5 on npm, 24 Sep 2026) with `organization`, `@better-auth/sso`, `@better-auth/scim`, `emailOTP`, `jwt`, `@better-auth/oauth-provider` | Brief's Shared Decision (better-auth on the Worker). 1.7 is current; its SCIM is a rewrite (see below), so build on 1.7, never 1.6 docs | Clerk: no advantage (research Part 2, section 7). WorkOS: the documented swap, see below |
| The Mac app is a public OAuth 2.1 client of better-auth's own `oauthProvider`: authorization code with PKCE (S256), `offline_access` for a rotating refresh token, access token is a short JWT | This is RFC 8252's native-app pattern and it is how better-auth intends native clients to get access plus refresh tokens (Context7 `/better-auth/better-auth` v1.6.23 `oauth-provider.mdx`: grants `authorization_code` with PKCE, `refresh_token` with `offline_access`, "issues a new refresh token for every refresh request"; `/oauth2/revoke` for refresh tokens). Gives exactly "refresh token in Keychain, access token in memory" | `bearer()` plugin with the session token as the only credential: no access/refresh split, one long-lived secret on every request. A hand-rolled one-time-token handoff: reimplements PKCE. `@better-auth/electron`: its wire protocol is a JS client contract, not a documented API for Swift. See Open decisions (brief amendment) |
| Access token lifetime 1 hour (library default), refresh token 90 days, rotated on every use | Authorization is re-read from the database on every request (below), so a longer access token does not delay revocation | 15-minute tokens: more refresh traffic, no security gain given per-request membership checks |
| Roles are better-auth organization member roles `employee`, `leader`, `admin`, stored multi-valued (`"employee,leader"`), defined with `createAccessControl` extending `defaultStatements`; `admin` extends `adminAc` | Organization plugin supports multiple roles per member and custom roles (Context7, `organization.mdx`, changelog 1.2). Keeping the name `admin` means the SSO plugin's "owner or admin" requirement for `registerSSOProvider` works unchanged | A separate app-owned roles table: duplicates the plugin. Reusing `member` as employee: the product word is employee |
| Every `/v1` request loads the member row (organization, roles) from the database; the JWT carries identity only (`sub`, organization id) | Removing a member, toggling Leader, or a SCIM deactivation takes effect on the next request, not at token expiry. One indexed query | Roles as JWT claims: stale for up to an hour |
| Admin setup lives in a web console at `/admin`, served by the Worker as server-rendered Hono JSX with plain HTML forms | SSO and SCIM setup is IT work: copying ACS URLs, pasting metadata, DNS TXT records, SCIM tokens into Okta or Entra. IT admins often run Windows and should not install the employee app to do it; every comparable product (WorkOS Admin Portal, Linear, Slack) does this in a browser. Server-rendered forms calling `auth.api.*` server-side need no client framework | Setup inside the Mac app: forces IT to install it and rebuilds forms in SwiftUI. A SolidJS SPA: nothing on these pages needs client reactivity (YAGNI) |
| The sign-in page is the same Worker-hosted page for the Mac sheet and for `/admin` | One sign-in implementation; the OAuth authorize endpoint sends unauthenticated requests to it (`loginPage`) | Separate native email and code screens in Swift: SSO redirects need a browser anyway |
| Email codes (`emailOTP`) for workspaces without SSO; no passwords, no magic links | A code is typed into the same sheet that started sign-in. A magic link opens the default browser, outside the ASWebAuthenticationSession, and never reaches the app | Magic link: breaks the sheet. Passwords: support burden, no value for a B2B tool |
| Sign-up is closed: a `user.create.before` hook allows a new user only from `/setup`, a pending invitation for that address, SSO provisioning, or SCIM | Nobody gets an account in a workspace without an admin's decision | `disableSignUp: true` on emailOTP: also blocks invited people who have no user row yet |
| Keychain: the legacy file-based login keychain through `SecItem` (no `kSecUseDataProtectionKeychain`) | The data-protection keychain needs `keychain-access-groups` and `application-identifier`, which need a Developer ID provisioning profile and manual signing (research Part 3, section 9; TN3137). That changes the shell's `project.yml` signing from Automatic to Manual, which is not an additive change. The legacy keychain ties the item's access list to the app's designated requirement (Team `P62A3QS593` plus bundle id), which is stable across Developer ID builds, so no prompts | Data-protection keychain now: provisioning profile work for no user-visible gain. Swap when a profile is needed anyway (APNs, extensions), using `asc-profile.py` per the global CLAUDE.md |
| Custom scheme callback `frictiontelemetry://auth/callback` via `ASWebAuthenticationSession(url:callback: .customScheme("frictiontelemetry"))` | Apple API verified (Context7 `/websites/developer_apple_authenticationservices`, `customScheme(_:)`, macOS 14.4+). Research Part 3: `.https` callbacks need Associated Domains and have reported problems | Universal-link HTTPS callback |
| `prefersEphemeralWebBrowserSession = false`, plus `prompt=login` on the first sign-in after an explicit sign-out | Reuses the identity provider's SSO cookie (one bounce for SSO users) while making "Sign out" mean the next sign-in asks who you are | Always ephemeral: SSO users type their IdP password every time |
| Invitation emails sent by an Inngest function via Resend, idempotency key = invitation id; code emails sent inline with `waitUntil` | A paste of 500 addresses must not run 500 Resend calls inside one request; Inngest retries and throttles. Codes are latency-sensitive and single. Resend idempotency (Context7 `/resend/resend-node`, `idempotencyKey`), limit 1000 requests per minute | Sending invites inline: subrequest and latency limits. Resend batch API: loses per-invite retry |
| Local dev sends email to the Wrangler console (`EMAIL_TRANSPORT=console`) | Fixture addresses are `@acme.example`; codes must be readable without a mailbox | A shared test inbox |
| One organization per person in v1 | The Mac app shows one workspace; sessions get `activeOrganizationId` set at creation | Workspace switcher: no customer needs it yet |
| WorkOS is the documented swap, not built | If a first customer's IT insists on a self-serve admin portal for SAML and SCIM, WorkOS AuthKit replaces the SSO and SCIM plugins and `/admin/sign-in` and `/admin/directory` become links to the WorkOS Admin Portal. The Mac side does not change if WorkOS issues the OAuth tokens, because the Mac speaks standard OAuth with PKCE. The swap seam is `src/auth/` plus those two admin pages; `/v1` handlers only see `c.var.actor` | Building both now |

### Architecture (additions inside the shell's layout)

```
apps/api/src/auth/
  auth.ts                 createAuth(env, db): per-request betterAuth instance (Hyperdrive client is per request)
  auth.cli.ts             static config for `npx auth generate` (same plugins, no live DB)
  permissions.ts          ac, roles { employee, leader, admin }, roleLabel()
  actor.ts                requireActor middleware: verify JWT, load member row, set c.var.actor
  gates.ts                requireRole("leader" | "admin"), LEADER_ROUTES table
  signup-gate.ts          user.create.before hook (setup, invitation, SSO, SCIM only)
  invitations.ts          auto-accept pending invitations on session create; endMembership()
  scim.ts                 identity.reconcileUser: upsert or end membership, revoke refresh tokens
  email.ts                sendEmail() with Resend or console transport; renderInvitationEmail(), renderCodeEmail()
  jwks-cache.ts           module-scope JWKS from auth.api (10-minute TTL), jose createLocalJWKSet
apps/api/src/routes/me.ts                 GET /v1/me, GET /v1/people, GET /v1/client-config
apps/api/src/web/                         layout.tsx, styles.css, sign-in.tsx, setup.tsx,
                                          admin/{setup,people,sign-in,directory,workspace}.tsx
apps/api/src/inngest/functions/send-invitation-email.ts
apps/api/src/db/auth-schema.ts            generated by the better-auth CLI, committed, never hand-edited
apps/api/drizzle/0001_auth_tables.sql     generated from auth-schema.ts
apps/api/drizzle/0002_auth_foreign_keys.sql   custom migration (drizzle-kit generate --custom)
apps/api/scripts/create-oauth-client.ts   registers the Mac public client per environment
apps/api/scripts/seed-auth.ts             fixture organizations, people, members, dev SSO providers
apps/api/dev/idp/compose.yml              mock OIDC and SAML identity providers for local dev

packages/contracts/src/concepts/{organization,person,role,me}.ts, fixtures/{me,me-leader,organizations}.json

apps/mac/Friction/Auth/
  WelcomeWindow.swift, WelcomeView.swift
  OAuthClient.swift       PKCE, authorize URL, code exchange, refresh, revoke (URLSession, form-encoded)
  TokenStore.swift        actor: access token in memory, single-flight refresh, refresh token via KeychainStore
  KeychainStore.swift     SecItem generic password, service "systems.onc9.friction.refresh-token", account = API host
  SessionStore.swift      @Observable @MainActor: restoring | signedOut(reason) | signingIn | signedIn(Me) | fixtures
  ProfileCache.swift      last Me as JSON in Application Support (no secrets)
apps/mac/Friction/Main/Settings/AccountSection.swift   (replaces the inert Account row)
apps/mac/FrictionTests/Auth/                           TokenStore, SessionStore, callback parsing, Keychain, Me decoding
```

Shell files touched, all additively: `src/index.ts` (mount better-auth handler on `/api/auth/*` replacing the 501, mount `web/` routes, apply `requireActor` to `/v1/*` except `/v1/health` and `/v1/client-config`), `Sidebar.swift` (reads `SessionStore` instead of the sample person), `DebugMenu.swift` (data source toggle), `LiveClient.swift` (Authorization header from `TokenStore`, one refresh-and-retry on 401), `FrictionClient.swift` (adds `me()`), `FixtureClient.swift` (returns the fixture Me), `src/events.ts` (adds `ft/invitation.created`). `project.yml` is not touched: no new package, no entitlement, no signing change.

### Service configuration

- Packages: `better-auth`, `@better-auth/sso`, `@better-auth/scim`, `@better-auth/oauth-provider` (all 1.7.x, upgraded together), `resend` 6.x, `jose` 6.x. Worker keeps `nodejs_compat` (better-auth needs AsyncLocalStorage; Context7 `installation.mdx`, Cloudflare Workers).
- `createAuth(env, db)` per request, as the D1 example in the better-auth docs does inside `fetch` (Context7 `blogs/1-5.mdx`). Database: `drizzleAdapter(db, { provider: "pg", schema })` over the shell's per-request Hyperdrive client.
- Options: `baseURL: env.BETTER_AUTH_URL`, `secret: env.BETTER_AUTH_SECRET`, `advanced.database.generateId: "uuid"` (contracts say IDs are UUID strings; option verified in better-auth's own tests on main), `trustedOrigins: [env.BETTER_AUTH_URL, "frictiontelemetry://"]` (custom-scheme matching verified in `trusted-origins.ts` on main), rate limiting with database storage (in-memory counters are per isolate on Workers) **[1.7 option name unverified]**.
- `organization({ ac, roles, creatorRole: "admin", sendInvitationEmail })`: `sendInvitationEmail` does not send; it emits `ft/invitation.created { invitationId, organizationId }` to Inngest.
- `emailOTP({ otpLength: 6, expiresIn: 600, allowedAttempts: 5, sendVerificationOTP })` (option names verified in `email-otp/types.ts` on main). `sendVerificationOTP` calls `sendEmail` under `ctx.waitUntil`, as the type's doc comment advises for serverless.
- `sso({ organizationProvisioning: { disabled: false, defaultRole: "employee" }, domainVerification: { enabled: true }, resolveUser })`. `resolveUser`: when the provider's organization has a SCIM connection, link via `acquireActiveSCIMUserLink` or reject with `SCIM_USER_NOT_ACTIVE` (pattern verified on main, `plugins/scim/index.mdx`); otherwise continue (just-in-time membership as employee). Which IdP attribute becomes SCIM `externalId` versus the OIDC `sub` or SAML NameID differs per IdP (Okta user id; Entra `oid`) **[unverified per IdP; prove with the dev IdP and one real Okta tenant before a customer]**.
- `scim({ managedConnections, identity: { reconcileUser } })` in 1.7's plugin-managed runtime mode: `/admin/directory` calls `auth.api.createSCIMManagedConnection({ provisioningDomainId: organizationId, actorId, scopes: ["scim.users.read","scim.users.write"], ... })`, `rotateSCIMManagedCredential`, `revokeSCIMManagedCredential` (verified on main, `plugins/scim/reference.mdx`). 1.7 SCIM no longer depends on the organization plugin, so membership is ours: `reconcileUser({ userId, active }, { database })` upserts `member(organizationId = provisioningDomainId, role "employee")` when active and calls `endMembership` when not, inside the SCIM transaction. **[`managedConnections` option shape and the SCIM base path under `/api/auth` unverified; read the 1.7 reference at build.]**
- `jwt()` plus `oauthProvider({ loginPage: "/sign-in", consentPage: "/sign-in/consent" })`. The Mac client is created by `scripts/create-oauth-client.ts` through `auth.api.adminCreateOAuthClient` with `token_endpoint_auth_method: "none"`, `redirect_uris: ["frictiontelemetry://auth/callback"]`, `grant_types: ["authorization_code","refresh_token"]`, `skip_consent: true` (verified, `oauth-provider.mdx`), so the consent page never renders for it. The authorize request carries `resource={BETTER_AUTH_URL}/v1` so the access token is a JWT with that audience **[1.7 `resources` and `validAudiences` naming unverified; 1.7 guide lists "resources" as changed]**.
- `requireActor`: reads `Authorization: Bearer`, verifies with jose against the cached JWKS (`auth.api.getJwks` in process, no self-fetch; issuer and audience checked as `verifyJwsAccessToken` does on main), then `select member where user_id = sub and organization_id = active org`. No member row: 403 `{ error: "membership_ended" }`. Invalid or expired token: 401. Sets `c.var.actor = { userId, organizationId, roles }`. Every `/v1` query scopes by `actor.organizationId`.
- `requireRole("leader")` on: `POST /v1/initiatives`, `PATCH /v1/initiatives/:id`, `POST /v1/initiatives/:id/close`, `POST /v1/initiatives/:id/publish`, `POST /v1/initiatives/:id/documents`, `PUT /v1/documents/:id`, `DELETE /v1/documents/:id`, `GET /v1/documents/:id/status`, `GET /v1/initiatives/:id/insights`, `POST /v1/insights/:id/owner`, `GET /v1/initiatives/:id/health`. Failure: 403 `{ error: "role_required", role: "leader" }`. `GET /v1/initiatives` stays open to every actor (employees need their initiatives for Ask; phase 05 scopes it). `POST /v1/insights/:id/fix` and `/v1/qa/:id/*` are owner actions: session only here, phase 08 adds the owner check. Org-level leader is distinct from the shell's `InitiativeMember.role = leader`.
- Sign-in page handler: `POST /sign-in` with an email looks up a verified SSO provider by domain; if found, `auth.api.signInSSO` with `callbackURL` = the original authorize URL (kept in a hidden field), so the OAuth flow continues after the IdP. Else checks user or pending invitation, then `sendVerificationOTP`. Code submit calls `signInEmailOTP` with the request headers and redirects back to the authorize URL, which now has a session and redirects to `frictiontelemetry://auth/callback?code&state` **[whether 1.7 signs the authorize query that `loginPage` receives, and requires it back, is unverified; the redirect preserves the query verbatim]**. Hono's `csrf()` middleware guards every form POST under `/sign-in`, `/setup`, `/admin`.
- `databaseHooks.session.create.before` sets `activeOrganizationId` to the user's single membership; `after` auto-accepts pending invitations for the user's email and applies the invited roles.
- `endMembership(userId, organizationId)`: delete the member row, delete the user's OAuth refresh tokens and sessions for that organization, in one transaction. Used by Remove, SCIM deactivation, and SCIM delete.
- Last-admin guard: the People toggle and Remove both refuse (409 `{ error: "last_admin" }`) when the change would leave zero admins.
- Env: `BETTER_AUTH_SECRET` (local value `FRICTION_TELEMETRY__BETTER_AUTH_SECRET` in `~/.secrets/projects.env`, generated with `openssl rand -base64 32`; production in the Cloudflare dashboard), `BETTER_AUTH_URL`, `RESEND_API_KEY` (from `~/.secrets/master.env`, onc9 account), `EMAIL_FROM`, `EMAIL_TRANSPORT` (`resend` or `console`), `DOWNLOAD_URL`.

### Interfaces

Contracts (Zod 4, Swift mirrors, both decode the new fixtures):
- `Role`: `employee | leader | admin`.
- `Organization`: id, name, slug.
- `Person`: id, name, email.
- `Me`: person, organization, roles (array of Role, always includes `employee`), permissions `{ initiativeSurface: boolean, workspaceAdmin: boolean }`. `initiativeSurface` is true exactly when roles include `leader`; `workspaceAdmin` exactly when roles include `admin`. The Mac reads the permissions, never the role strings, so the rule lives in one place.

Routes (new or made real):
- `GET|POST /api/auth/*`: better-auth handler (was 501). Includes `/oauth2/authorize`, `/oauth2/token`, `/oauth2/revoke`, `/jwks`, SSO callbacks (`/sso/callback/{providerId}`, `/sso/saml2/callback/{providerId}`), SP metadata, SCIM `/scim/v2/*`.
- `GET /v1/client-config` (public): `{ oauthClientId, authorizeEndpoint, tokenEndpoint, revocationEndpoint, resource }`. The Mac reads this once per launch, so the client id is not a build setting and dev and production each keep their own.
- `GET /v1/me` (any actor): `Me`.
- `GET /v1/people?query=` (leader or admin): `Person[]` in the actor's organization, for phase 05's affected-people and owner pickers.
- Web: `GET|POST /sign-in`, `POST /sign-in/code`, `GET|POST /setup`, `GET /admin`, `GET|POST /admin/people`, `POST /admin/people/:memberId/roles`, `POST /admin/people/:memberId/remove`, `POST /admin/invitations`, `POST /admin/invitations/:id/resend|cancel`, `GET|POST /admin/sign-in`, `POST /admin/sign-in/verify-domain`, `GET /admin/sign-in/test`, `GET|POST /admin/directory`, `GET|POST /admin/workspace`, `GET /download` (302 to `DOWNLOAD_URL`).

Inngest: `ft/invitation.created { invitationId, organizationId }` added to the catalog. Function `send-invitation-email`: `triggers: { event: "ft/invitation.created" }`, `throttle: { limit: 10, period: "1s" }`, `retries: 5`; one `step.run("send")` that loads the invitation, skips when it is no longer pending, renders, and calls Resend with `idempotencyKey: invitationId` (Resend returns an error object rather than throwing, so the step throws on it to get a retry).

Schema (additive migrations, branch-first on a Neon branch `iteration-1/02-auth-workspace` from `dev`):
- `0001_auth_tables.sql`: generated. Run `npx auth generate --config src/auth/auth.cli.ts --output src/db/auth-schema.ts` (1.7 CLI; `@better-auth/cli` is deprecated per Context7 `blogs/1-5.mdx`), then `drizzle-kit generate`. Creates better-auth's user, session, account, verification, organization, member, invitation, SSO provider, SCIM, JWKS, and OAuth tables with whatever names the CLI emits.
- `0002_auth_foreign_keys.sql`: every domain table's `organization_id` references `organization(id) on delete restrict`; every user reference column the shell created (flag and question author, `initiative_member.user_id`, `qa_entry.approved_by_user_id`, `insight.owner_user_id`, `fix.recorded_by_user_id`, `notice.user_id`) references `user(id) on delete restrict`. Users are never hard-deleted (org-scoped SCIM delete keeps the global user, per `scim.mdx`), so restrict never blocks a normal flow.
- Type check before writing 0002: if the CLI emits `uuid` id columns while the shell's references are `text`, the FK needs matching types. Convert the shell columns with `alter column ... type uuid using ...::uuid` in 0002 and record it in Engineering Notes as the one permitted non-additive change (only fixture data exists). If the CLI emits `text`, no conversion.
- Dev data order: the shell's seed rows would violate the new FKs, so on the dev branch run `db:reset` (truncate domain tables), migrate, `seed-auth.ts` (organizations, users with fixture ids, members, dev SSO providers pre-marked verified), then the shell's domain seed. Production domain tables are empty, so migrations apply cleanly there.

### Key flows

**Mac sign-in.** (1) `GET /v1/client-config`. (2) Generate `code_verifier` (32 random bytes, base64url), `code_challenge` = S256, `state` (16 random bytes). (3) `NSApp.activate()`, present `ASWebAuthenticationSession(url: authorize?response_type=code&client_id&redirect_uri=frictiontelemetry://auth/callback&scope=openid profile email offline_access&code_challenge&code_challenge_method=S256&state&resource[&prompt=login])` anchored to the Welcome window. (4) Callback: parse `code` and `state`; state mismatch aborts with `AuthError.stateMismatch` and shows the generic "Couldn't finish signing in. Try again." (5) `POST /oauth2/token` form-encoded `grant_type=authorization_code, code, redirect_uri, code_verifier, client_id`. (6) Write the refresh token to the Keychain first, then hold the access token and its expiry in `TokenStore`. (7) `GET /v1/me`, cache it, state `signedIn`. Failure modes: user cancel (`ASWebAuthenticationSessionError.canceledLogin`) is silent; `invalid_grant` on exchange (code reused or expired) shows the generic retry line; network errors show the connection line.

**Launch restore.** Keychain has a refresh token: refresh, then `/v1/me`. Network error: `signedIn(cachedMe)` and retry with backoff (5 s, 30 s, 2 min, then every 5 min). `invalid_grant`: delete the Keychain item and cached profile, `signedOut(.sessionEnded)`. No Keychain item: `signedOut(nil)`.

**Refresh.** `TokenStore.validAccessToken()` refreshes when under 60 seconds remain. Concurrent callers share one in-flight refresh `Task`; this matters because rotation invalidates the old refresh token, so a second parallel refresh would fail and sign the person out. The new refresh token is written to the Keychain before the new access token is handed out. Known edge: if the app dies between the server rotating and the Keychain write, the stored token is dead and the next launch asks to sign in again; accepted as rare.

**Request with an expired or revoked grant.** `LiveClient` gets 401: one refresh and one retry. 403 `membership_ended`, or `invalid_grant` on refresh: sign out with `.accessEnded`. 403 `role_required`: refetch `/v1/me`; if leader access is gone, move to Home and show the banner.

**Sign-out.** `POST /oauth2/revoke` (`token` = refresh token, `token_type_hint=refresh_token`, `client_id`), best effort: a network failure does not block local sign-out. Delete the Keychain item, clear the access token, delete the cached profile, set `needsPromptLogin` so the next authorize adds `prompt=login` **[`prompt=login` support in oauthProvider unverified; fallback is ephemeral browser session for that one sign-in]**, call the outbox purge hook (phase 04 supplies it; returns 0 until then).

**Invite.** Admin submits addresses; each valid new address becomes `auth.api.createInvitation({ headers, body: { email, role, organizationId } })` with role `employee` or `employee,leader`; each emits `ft/invitation.created`; the function sends. Invitee signs in with a code (the signup gate allows it because an invitation is pending); the session hook accepts the invitation. Expired invitations (organization plugin default) show as "Invite expired" with **Resend**.

**SCIM deprovision.** IdP sends `PATCH active=false` or `DELETE`. `reconcileUser` runs `endMembership` in the SCIM transaction. The employee's next `/v1` call gets 403 `membership_ended`; their refresh fails; the Mac shows the access-ended Welcome.

**Domain verification.** `requestDomainVerification` issues a token; the admin adds the TXT record at `_better-auth-token-{providerId}`; **Verify domain** runs the check (verified on main, `sso.mdx`; `409 SSO_PROVIDER_CHANGED` if the provider changed meanwhile). **[DNS TXT resolution inside a Worker under `nodejs_compat` unverified; if it fails, verify with a DNS-over-HTTPS query to 1.1.1.1 from our route and mark the provider verified via the adapter.]**

### Dev and test story for SSO without a customer IdP

- `apps/api/dev/idp/compose.yml` (OrbStack's Docker is on this Mac): `ghcr.io/navikt/mock-oauth2-server` on port 8080 (OIDC; its interactive login form lets you type any subject and claims such as `email`) and `boxyhq/mock-saml` on port 4000 (SAML IdP that accepts any address). Browser redirects reach both from the sheet; the local Worker on 8787 reaches 8080 for token exchange.
- `seed-auth.ts` registers two fixture workspaces so tenancy is testable: "Acme Logistics", domain `acme.example`, OIDC via the mock (Sam Okafor employee; Priya Raman employee, leader, and admin), and "Globex Shipping", domain `globex.example`, SAML via mock-saml. Both providers are marked verified in dev.
- Before the first customer: one end-to-end pass against a free Okta developer tenant (OIDC, SAML, and SCIM to the deployed Worker) and a SCIM validator run **[availability of SCIM provisioning on Okta's free developer plan unverified]**.
- Automated tests use better-auth's `testUtils` plugin (`createUser`, `saveUser`, `login` returning headers and token, `getOTP` with `captureOTP: true`; Context7 `blogs/1-5.mdx`) against the Neon test branch, and a fake OIDC issuer built with jose (discovery, JWKS, token endpoint) behind the test runner's outbound fetch mock.

### Tests (each seen failing for the named mutation before it is trusted)

1. **Leader gate, table-driven over every route in `LEADER_ROUTES`.** An employee-only actor gets 403 `{ error: "role_required", role: "leader" }`; a leader gets past the gate (the shell's 501 or phase code). Mutations: drop one route from the table; make `requireRole` accept `employee`. Each fails naming the route.
2. **`/v1/me` permissions are exact.** Roles `employee` returns `{ initiativeSurface: false, workspaceAdmin: false }`; `employee,leader` returns `{ true, false }`; `employee,admin` returns `{ false, true }`, compared with `toStrictEqual`. Mutation: derive `initiativeSurface` from `admin`.
3. **Authorization is read per request.** Issue a leader's token, remove Leader in the database, call a leader route with the same unexpired token: 403. Mutation: read roles from JWT claims.
4. **Deprovision ends access.** SCIM `PATCH active=false` for Sam: `/v1/me` with his still-valid access token returns 403 `membership_ended`, and a refresh grant with his refresh token returns `invalid_grant`. Mutations: skip the refresh-token delete in `endMembership` (refresh assertion fails); skip the member delete (me assertion fails).
5. **Tenancy.** A Globex leader calling `/v1/people?query=sam` gets `[]`; an Acme leader gets exactly `[{ id, name: "Sam Okafor", email: "sam.okafor@acme.example" }]`. Mutation: remove the organization filter.
6. **Closed sign-up.** Email-code sign-in for an address with no invitation, no SSO domain, not via `/setup`: rejected, and no user row exists afterward. With a pending `employee,leader` invitation: signed in and the member row's roles equal `employee,leader`. Mutations: remove the signup gate; accept the invitation with the default role.
7. **SSO domain routing.** `POST /sign-in` with `sam.okafor@acme.example` responds with a redirect whose host is the mock issuer; with `x@unknown.example` it renders the no-workspace card. Mutation: compare the domain case-sensitively and submit `Sam.Okafor@ACME.example`.
8. **Last admin.** Demoting or removing the only admin returns 409 `last_admin` and the member still has `admin`. Mutation: delete the guard.
9. **Invitation email content.** `renderInvitationEmail({ inviter: "Priya Raman", organization: "Acme Logistics", email: "sam.okafor@acme.example", sso: false })` has the exact subject "Priya Raman invited you to Acme Logistics on Friction" and a body containing "Sign in with this address: sam.okafor@acme.example" and the `DOWNLOAD_URL`. Mutation: swap inviter and organization.
10. **Foreign keys exist.** Inserting a flag with a random `organization_id` fails with SQLSTATE 23503. Mutation: remove that table's line from 0002.
11. **Contracts.** `me.json` and `me-leader.json` parse in Zod and decode in Swift. Mutation: rename `initiativeSurface` in the Swift mirror.
12. **Swift TokenStore single flight.** Against a fake token endpoint that rotates and rejects a used refresh token, two concurrent `validAccessToken()` calls near expiry both return the same new access token and the session stays `signedIn`. Mutation: remove the shared in-flight `Task` (the second call reuses the old refresh token and the state becomes `signedOut`).
13. **Swift restore.** Refresh throwing `URLError(.notConnectedToInternet)` leaves `signedIn(cachedMe)`; `invalid_grant` gives `signedOut(.sessionEnded)` and the Keychain item is gone. Mutation: treat every refresh error as `invalid_grant`.
14. **Swift callback.** A callback URL whose `state` differs from the request's is rejected with `stateMismatch` and no token request is made to the fake server (asserted as the fake's received-requests list being empty, the only observable state). Mutation: skip the state comparison.
15. **Swift Keychain round trip.** Using a test-only service name: write, read back the same string, sign out, read returns nil. Mutation: skip the delete in sign-out.

### Rollout

1. Branch `iteration-1/02-auth-workspace` in its own worktree; Neon branch of the same name from `dev`; `neon diff` before commit.
2. Local: `~/.secrets/seed.sh friction-telemetry` for `DATABASE_URL`; add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:8787`, `EMAIL_TRANSPORT=console` to `.dev.vars`. `docker compose -f apps/api/dev/idp/compose.yml up -d`. `db:reset`, migrate, `seed-auth`, domain seed, `create-oauth-client`.
3. Andrés, one time: a verified sending domain in Resend and a Resend key for this app (the existing key is send-only and labeled for envoy; same onc9 account is fine); the production hostname on the Worker (Open decisions); Worker secrets `BETTER_AUTH_SECRET`, `RESEND_API_KEY` and vars `BETTER_AUTH_URL`, `EMAIL_FROM`, `EMAIL_TRANSPORT=resend`, `DOWNLOAD_URL` in the Cloudflare dashboard.
4. Merge to `main` deploys. Run migrations 0001 and 0002 against the production branch's direct URL, then `create-oauth-client` against production. Sync Inngest Cloud so `send-invitation-email` appears.
5. Create the first real workspace at `/setup` on production and invite one test address end to end.
6. Mac: Debug builds default to Live. Before this lands, anyone reviewing the shell uses Debug > Data source > Fixtures.

Rollback: revert the merge; migration 0002 is dropped by removing its constraints (auth tables can stay, unused). Mac builds fall back to Fixtures. No customer data exists yet.

### Open decisions

1. **OAuth provider instead of the `bearer` plugin (brief amendment).** The brief's Shared Decisions list `bearer`. Recommended default: `oauthProvider` plus `jwt` for the Mac, `bearer` not installed, because it is the framework's supported way to give a native app a refresh token and a short access token. If Andrés prefers `bearer`, the Mac stores the session token in the Keychain and there is no access/refresh split. Owner: Andrés; update the brief either way.
2. **Who may create a workspace.** Default: anyone at `/setup` with an email code. Alternative: only Andrés, through a script. Reversible.
3. **Sending address.** Default: `Friction <no-reply@onc9.com>` once onc9.com is verified in Resend. Alternative: a product domain when one exists.
4. **Production hostname.** Default: a custom domain on the Worker, `friction.onc9.com`, set before any customer configures SSO, because SAML ACS URLs and OIDC redirect URIs embed it and a later change breaks every customer's IdP setup.
5. **Leader access from IdP groups.** Default: no; admins grant Leader by hand. 1.7 SCIM can project Groups to roles (`projection.roles`, verified on main), so this is a later small change if IT asks.
6. **Creator's roles.** Default: employee, leader, and admin (the first customer's buyer is usually the leader).
7. **Account enumeration on the sign-in page.** Default: say plainly that no workspace exists for the address (as Linear and Slack do), with rate limiting. Alternative: the neutral "If this address has access, we sent a code", which strands invited people who mistype.
8. **Unsent flags at sign-out.** Default: confirm, then delete them from the Mac, because they must never send under another account. Alternative: keep them and send only if the same person signs back in.
9. **One workspace per person.** Default: yes in v1; an invite to someone already in another workspace is skipped with "sam@acme.com already belongs to another workspace."
10. **No email-code fallback for SSO domains.** Default: none, admins included; recovery from a broken IdP setup is an operator action in the database.

---

## Sessions

- 2026-09-24: Initial spec · `claude -r cf097e99-94f3-4cce-9596-642e0c0c18b8`
