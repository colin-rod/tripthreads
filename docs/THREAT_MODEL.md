# TripThreads Threat Model

**Last Updated:** December 23, 2025
**Version:** 1.0
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Assets & Data Classification](#assets--data-classification)
3. [Threat Actors](#threat-actors)
4. [Attack Surface](#attack-surface)
5. [Threat Analysis (STRIDE)](#threat-analysis-stride)
6. [Risk Assessment](#risk-assessment)
7. [Mitigations](#mitigations)
8. [Residual Risks](#residual-risks)

---

## Executive Summary

This document identifies and analyzes security threats to TripThreads using the STRIDE threat modeling methodology. The analysis covers all system components, data flows, and trust boundaries.

**Threat Model Scope:**

- Web application (Next.js)
- Mobile application (Expo - Phase 3)
- Database (Supabase PostgreSQL)
- Storage (Supabase Storage)
- External APIs (OpenAI, OpenExchangeRates, Stripe)
- Authentication (Supabase Auth)

**Risk Level:** **LOW to MEDIUM** (after mitigations)

---

## Assets & Data Classification

### High-Value Assets

| Asset                | Classification | Sensitivity | Impact if Compromised                  |
| -------------------- | -------------- | ----------- | -------------------------------------- |
| User credentials     | **Critical**   | High        | Account takeover, identity theft       |
| Payment information  | **Critical**   | High        | Financial fraud                        |
| Trip data            | **High**       | Medium      | Privacy violation, unauthorized access |
| Personal information | **High**       | Medium      | Identity theft, privacy violation      |
| Expense data         | **High**       | Medium      | Financial data exposure                |
| Photos/videos        | **High**       | Medium      | Privacy violation                      |
| Chat messages        | **Medium**     | Low-Medium  | Privacy violation                      |

### Data Classification

**Critical (Tier 1):**

- User passwords (hashed, never stored plaintext)
- Payment card data (tokenized, handled by Stripe)
- API keys (OPENAI_API_KEY, STRIPE_SECRET_KEY)
- Service role keys (SUPABASE_SERVICE_ROLE_KEY)

**High (Tier 2):**

- Email addresses
- User profiles (name, avatar)
- Trip details (name, dates, location)
- Expenses (amounts, descriptions)
- Photos/videos with EXIF data

**Medium (Tier 3):**

- Chat messages
- Itinerary items
- Invitations
- Notification preferences

**Low (Tier 4):**

- FX rates (public data)
- Analytics data (anonymized)

---

## Threat Actors

### External Threat Actors

#### 1. Opportunistic Attackers

**Profile:** Script kiddies, automated bots
**Motivation:** Financial gain, data harvesting
**Capability:** Low (automated tools, known exploits)
**Likelihood:** High

**Targets:**

- Authentication endpoints (credential stuffing)
- API endpoints (SQL injection, XSS)
- File upload endpoints (malware)

**Mitigations:**

- Rate limiting (100 requests/min)
- Input validation and sanitization
- CAPTCHA on registration (future)
- Automated vulnerability scanning

#### 2. Targeted Attackers

**Profile:** Skilled hackers, competitors
**Motivation:** Financial gain, espionage, sabotage
**Capability:** Medium-High (custom exploits, social engineering)
**Likelihood:** Low-Medium

**Targets:**

- User accounts (high-value users)
- Database (mass data exfiltration)
- Infrastructure (DDoS, service disruption)
- API keys (OpenAI, Stripe)

**Mitigations:**

- RLS policies (limit blast radius)
- Audit logging (detect suspicious activity)
- Sentry monitoring (detect anomalies)
- MFA (Phase 5)

#### 3. Nation-State Actors

**Profile:** Advanced Persistent Threats (APTs)
**Motivation:** Espionage, surveillance
**Capability:** Very High (zero-days, sophisticated attacks)
**Likelihood:** Very Low

**Mitigations:**

- Standard security practices
- Not a high-value target
- Defense-in-depth architecture

### Internal Threat Actors

#### 4. Malicious Insiders

**Profile:** Developers, employees with access
**Motivation:** Financial gain, revenge, negligence
**Capability:** High (system knowledge, access)
**Likelihood:** Very Low

**Targets:**

- Service role keys
- Production database
- User data

**Mitigations:**

- Audit logging (track all actions)
- Principle of least privilege
- Code reviews (catch backdoors)
- Separation of duties

#### 5. Compromised Accounts

**Profile:** Legitimate users with stolen credentials
**Motivation:** Varies (account takeover)
**Capability:** Low-Medium
**Likelihood:** Medium

**Targets:**

- Trip data
- Financial information
- Personal photos

**Mitigations:**

- Session timeout
- Unusual activity detection (future)
- Password reset flow
- MFA (Phase 5)

---

## Attack Surface

### External Attack Surface

```
Internet
    │
    ├─► Web App (Vercel)
    │   ├─► /api/parse-with-openai
    │   ├─► /api/upload-photo
    │   ├─► /api/access-requests/*
    │   └─► Server Actions
    │
    ├─► Supabase (Database + Auth + Storage)
    │   ├─► REST API
    │   ├─► Realtime subscriptions
    │   └─► Storage buckets
    │
    └─► External APIs
        ├─► OpenAI (parsing)
        ├─► OpenExchangeRates (FX)
        └─► Stripe (payments - Phase 3)
```

### Attack Vectors

| Vector             | Entry Point                | Impact   | Likelihood | Mitigation                    |
| ------------------ | -------------------------- | -------- | ---------- | ----------------------------- |
| SQL Injection      | API routes, server actions | High     | Low        | Parameterized queries, RLS    |
| XSS                | User input fields          | High     | Low        | CSP, React escaping           |
| CSRF               | State-changing operations  | Medium   | Low        | SameSite cookies, CSRF tokens |
| Broken Auth        | Login, password reset      | Critical | Low        | Supabase Auth, rate limiting  |
| Broken Access      | API endpoints              | High     | Low        | RLS policies, role checks     |
| Rate Limit Bypass  | All endpoints              | Medium   | Medium     | Database rate limiting        |
| File Upload Attack | Photo upload               | Medium   | Low        | Type validation, size limits  |
| Prompt Injection   | OpenAI parsing             | Low      | Low        | Structured prompts            |
| SSRF               | URL inputs                 | Low      | Very Low   | No server-side fetches        |
| DDoS               | All endpoints              | High     | Medium     | Vercel CDN, rate limiting     |

---

## Threat Analysis (STRIDE)

### S - Spoofing

#### Threat: User Impersonation

**Description:** Attacker gains access to another user's account
**Attack Scenarios:**

1. Credential stuffing (reused passwords)
2. Phishing (fake login page)
3. Session hijacking (stolen cookies)
4. Brute force (weak passwords)

**Impact:** **High** - Complete account takeover
**Likelihood:** **Medium**

**Mitigations:**

- ✅ Supabase Auth (bcrypt hashing)
- ✅ HttpOnly cookies (prevent XSS theft)
- ✅ Password strength validation (zxcvbn)
- ✅ Rate limiting on auth endpoints
- 📋 MFA (Phase 5)
- 📋 CAPTCHA on registration

**Residual Risk:** **Low**

---

### T - Tampering

#### Threat: Data Manipulation

**Description:** Attacker modifies data they shouldn't have access to
**Attack Scenarios:**

1. Parameter tampering (modify trip_id in request)
2. SQL injection (modify database directly)
3. Client-side validation bypass
4. Expense amount manipulation

**Impact:** **High** - Financial fraud, data corruption
**Likelihood:** **Low**

**Mitigations:**

- ✅ RLS policies (primary defense)
- ✅ Server-side validation (all inputs)
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Audit logging (detect tampering)
- ✅ Foreign key constraints (data integrity)

**Residual Risk:** **Very Low**

---

### R - Repudiation

#### Threat: Denial of Actions

**Description:** User denies performing an action they actually did
**Attack Scenarios:**

1. Delete expense, claim they didn't
2. Change participant role, claim unauthorized
3. Delete trip, blame another user

**Impact:** **Medium** - Trust issues, disputes
**Likelihood:** **Medium**

**Mitigations:**

- ✅ Audit logging (comprehensive trail)
- ✅ Triggers on sensitive operations
- ✅ Timestamp all actions
- ✅ IP address + user agent logging
- ✅ Non-repudiable records (user_id + timestamp)

**Residual Risk:** **Very Low**

---

### I - Information Disclosure

#### Threat: Unauthorized Data Access

**Description:** Attacker gains access to data they shouldn't see
**Attack Scenarios:**

1. Cross-trip data access (see other users' trips)
2. Partial joiner sees pre-join data
3. Viewer accesses edit-only data
4. SQL injection extracts database
5. Error messages leak schema information

**Impact:** **High** - Privacy violation, competitive disadvantage
**Likelihood:** **Low**

**Mitigations:**

- ✅ RLS policies (50+ policies)
- ✅ Partial joiner date-scoped visibility
- ✅ Role-based access (owner, participant, viewer)
- ✅ Generic error messages (no schema leakage)
- ✅ Server-side session (not client-stored)

**Residual Risk:** **Very Low**

---

### D - Denial of Service

#### Threat: Service Unavailability

**Description:** Attacker makes service unavailable to legitimate users
**Attack Scenarios:**

1. DDoS attack (volumetric)
2. Resource exhaustion (infinite loops, large files)
3. Rate limit exhaustion (prevent legitimate use)
4. Database connection exhaustion

**Impact:** **High** - Service unavailable, revenue loss
**Likelihood:** **Medium**

**Mitigations:**

- ✅ Vercel CDN (DDoS protection)
- ✅ Rate limiting (database-backed)
- ✅ File size limits (50MB max)
- ✅ Request timeouts (30 seconds)
- ✅ Connection pooling (Supabase)
- 📋 Auto-scaling (Vercel Pro)

**Residual Risk:** **Low-Medium**

---

### E - Elevation of Privilege

#### Threat: Unauthorized Access Escalation

**Description:** Attacker gains higher privileges than authorized
**Attack Scenarios:**

1. Viewer → Participant role escalation
2. Participant → Owner escalation
3. Non-member accesses trip
4. Service role key theft (escalate to admin)

**Impact:** **Critical** - Complete system compromise
**Likelihood:** **Very Low**

**Mitigations:**

- ✅ RLS policies enforce roles
- ✅ Server actions verify permissions
- ✅ Service role keys secret (never exposed)
- ✅ Audit logging (detect escalation attempts)
- ✅ Role changes logged automatically

**Residual Risk:** **Very Low**

---

## Risk Assessment

### High-Risk Scenarios

#### 1. Account Takeover

**Threat:** Credential stuffing + no MFA
**Impact:** High (privacy violation, financial fraud)
**Likelihood:** Medium
**Risk Score:** **High**

**Mitigations:**

- Rate limiting on auth endpoints
- Password strength validation
- Session monitoring
- Audit logging

**Recommended:**

- Add MFA (Phase 5)
- Add CAPTCHA on registration
- Implement unusual activity detection

---

#### 2. Cross-Trip Data Access

**Threat:** Authorization bypass
**Impact:** High (privacy violation)
**Likelihood:** Low
**Risk Score:** **Medium**

**Mitigations:**

- RLS policies (primary defense)
- Server action verification
- Integration tests
- Penetration testing

**Recommended:**

- Regular security testing
- Automated RLS policy testing

---

#### 3. Payment Data Theft

**Threat:** Stripe integration compromise
**Impact:** Critical (financial fraud, PCI compliance)
**Likelihood:** Very Low (Stripe handles data)
**Risk Score:** **Low**

**Mitigations:**

- Stripe handles card data (never stored)
- Webhook signature verification
- HTTPS only
- Minimal Stripe data stored

**Recommended:**

- Implement webhook HMAC validation
- Regular Stripe security updates

---

### Medium-Risk Scenarios

#### 4. Photo Upload Malware

**Threat:** Malicious file upload
**Impact:** Medium (XSS, server compromise)
**Likelihood:** Low
**Risk Score:** **Low-Medium**

**Mitigations:**

- File type validation (JPEG, PNG, WEBP only)
- File size limits (50MB)
- EXIF data stripped (GPS privacy)
- Supabase Storage (isolated)

**Recommended:**

- Add virus scanning (ClamAV integration)
- Content-type verification

---

#### 5. Rate Limit Bypass

**Threat:** Attacker bypasses rate limiting
**Impact:** Medium (API abuse, cost)
**Likelihood:** Medium
**Risk Score:** **Medium**

**Mitigations:**

- Database-backed rate limiting
- Multiple rate limit levels
- Atomic increment operations
- Fail-open on errors

**Recommended:**

- Monitor rate limit violations
- Add IP-based rate limiting
- Implement adaptive rate limiting

---

### Low-Risk Scenarios

#### 6. Prompt Injection (OpenAI)

**Threat:** Manipulate AI responses
**Impact:** Low (incorrect parsing)
**Likelihood:** Low
**Risk Score:** **Very Low**

**Mitigations:**

- Structured prompts (data not instructions)
- Input validation
- Timeout protection
- Security tests

---

#### 7. Information Disclosure (Error Messages)

**Threat:** Stack traces leak schema
**Impact:** Low (information gathering)
**Likelihood:** Low
**Risk Score:** **Very Low**

**Mitigations:**

- Generic error messages
- Sentry for detailed errors (not exposed)
- No stack traces in production

---

## Mitigations

### Implemented (✅)

| Threat               | Mitigation                    | Status | Effectiveness |
| -------------------- | ----------------------------- | ------ | ------------- |
| SQL Injection        | Parameterized queries + RLS   | ✅     | Very High     |
| XSS                  | CSP + React escaping          | ✅     | High          |
| Broken Auth          | Supabase Auth + rate limiting | ✅     | High          |
| Broken Access        | RLS policies (50+)            | ✅     | Very High     |
| CSRF                 | SameSite cookies              | ✅     | High          |
| Rate Limit Bypass    | Database rate limiting        | ✅     | Medium-High   |
| File Upload Attack   | Type validation + size limits | ✅     | Medium        |
| DDoS                 | Vercel CDN + rate limiting    | ✅     | Medium        |
| Privilege Escalation | RLS + audit logging           | ✅     | Very High     |
| Data Tampering       | RLS + server validation       | ✅     | Very High     |

### Planned (📋)

| Threat            | Mitigation              | Timeline | Priority |
| ----------------- | ----------------------- | -------- | -------- |
| Account Takeover  | MFA                     | Phase 5  | Medium   |
| Account Takeover  | CAPTCHA on registration | Phase 5  | Low      |
| Photo Malware     | Virus scanning          | Phase 5  | Low      |
| Rate Limit Bypass | IP-based rate limiting  | Phase 5  | Medium   |
| Payment Fraud     | Stripe webhook HMAC     | Phase 3  | High     |

---

## Residual Risks

### Accepted Risks

1. **No MFA (until Phase 5)**
   - Risk: Account takeover via credential stuffing
   - Mitigation: Rate limiting, password strength
   - Acceptance: Low priority for MVP, Phase 5 implementation

2. **No Virus Scanning on Uploads**
   - Risk: Malware upload (low impact, Supabase isolated)
   - Mitigation: File type validation, Supabase Storage isolation
   - Acceptance: Cost vs benefit, Phase 5 implementation

3. **Database Rate Limiting (not Redis)**
   - Risk: Slightly higher latency, potential bypass
   - Mitigation: Atomic operations, monitoring
   - Acceptance: MVP cost optimization

4. **No Certificate Pinning**
   - Risk: MITM attacks (very low likelihood)
   - Mitigation: TLS 1.2+, HSTS
   - Acceptance: Advanced feature, Phase 5

---

## Threat Model Maintenance

### Review Schedule

- **Quarterly:** Review threat model after major releases
- **Ad-hoc:** Review after security incidents
- **Annual:** Comprehensive threat modeling workshop

### Update Triggers

- New features added
- New third-party integrations
- Security incidents
- Regulatory changes
- Technology stack changes

---

## Conclusion

TripThreads has a **strong security posture** with comprehensive mitigations for high-risk threats. The RLS-first architecture provides defense-in-depth with multiple security layers.

**Overall Risk Level:** **LOW to MEDIUM** (acceptable for MVP launch)

**Critical Mitigations in Place:**

- ✅ RLS policies (primary defense)
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Security headers (XSS, clickjacking prevention)
- ✅ Rate limiting (abuse prevention)
- ✅ Audit logging (detection + compliance)

**Recommended Pre-Launch:**

- Penetration testing (OWASP ZAP scan)
- Manual security testing (15 test cases)
- Security sign-off

**Post-Launch Improvements (Phase 5):**

- MFA implementation
- CAPTCHA on registration
- Adaptive rate limiting
- Virus scanning on uploads

---

**Document Status:** ✅ Complete
**Next Review:** After Phase 3 launch
**Owner:** Colin Rodriguez
**Last Updated:** December 23, 2025
