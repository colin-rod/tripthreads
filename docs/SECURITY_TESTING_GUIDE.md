# Security Testing Guide

**Last Updated:** December 23, 2025
**Version:** 1.0
**Purpose:** Manual security testing procedures for TripThreads

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [OWASP ZAP Automated Scan](#owasp-zap-automated-scan)
4. [Manual API Security Testing](#manual-api-security-testing)
5. [Authentication Testing](#authentication-testing)
6. [Authorization Testing](#authorization-testing)
7. [Rate Limiting Testing](#rate-limiting-testing)
8. [CORS Testing](#cors-testing)
9. [File Upload Testing](#file-upload-testing)
10. [Security Headers Testing](#security-headers-testing)
11. [Reporting Findings](#reporting-findings)

---

## Overview

This guide provides step-by-step procedures for security testing TripThreads. Testing should be performed against the **staging environment** only, never production.

**Testing Environments:**

- **Staging**: `https://dev.tripthreads.app` (or Vercel preview deployment)
- **Local**: `http://localhost:3000` (for development testing only)

---

## Prerequisites

### Required Tools

1. **OWASP ZAP**

   ```bash
   # macOS
   brew install --cask owasp-zap

   # Or download from: https://www.zaproxy.org/download/
   ```

2. **curl** (for API testing)

   ```bash
   # Pre-installed on macOS/Linux
   curl --version
   ```

3. **Postman** (optional, for API testing)
   - Download: https://www.postman.com/downloads/

4. **Browser Developer Tools**
   - Chrome DevTools (F12)
   - Firefox Developer Tools (F12)

### Test Accounts

Create test accounts for different roles:

```
Owner Account:
  Email: security-test-owner@example.com
  Password: [Generate secure password]

Participant Account:
  Email: security-test-participant@example.com
  Password: [Generate secure password]

Viewer Account:
  Email: security-test-viewer@example.com
  Password: [Generate secure password]
```

### Test Trip Setup

1. Create a test trip with owner account
2. Invite participant and viewer accounts
3. Add test data: expenses, itinerary, chat messages
4. Note trip ID for testing: `TRIP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## OWASP ZAP Automated Scan

### Step 1: Configure ZAP

1. **Launch OWASP ZAP**

   ```bash
   /Applications/ZAP.app/Contents/MacOS/ZAP
   ```

2. **Set Target URL**
   - Mode: Standard Mode
   - Target: `https://dev.tripthreads.app`

3. **Configure Authentication** (if scanning authenticated pages)
   - Tools → Options → Authentication
   - Set up authentication with test account credentials

### Step 2: Run Spider Scan

**Purpose:** Discover all application URLs

```
1. Right-click target URL in Sites tree
2. Select "Attack" → "Spider"
3. Configure:
   - Max Depth: 5
   - Max Children: 10
   - User: security-test-owner@example.com
4. Click "Start Scan"
5. Wait for completion (~10-15 minutes)
```

**Expected Results:**

- Discovers authenticated routes (`/trips/*`)
- Maps API endpoints (`/api/*`)
- Identifies forms and parameters

### Step 3: Run Active Scan

**Purpose:** Test for vulnerabilities

```
1. Right-click target URL in Sites tree
2. Select "Attack" → "Active Scan"
3. Configure Policy:
   - Threshold: Medium
   - Strength: Medium
   - Enable: All scanners
4. Click "Start Scan"
5. Wait for completion (~30-60 minutes)
```

**⚠️ Warning:** Active scan sends attack payloads. Only run against staging!

### Step 4: Review Results

**Priority Order:**

1. **Critical** - Fix immediately
2. **High** - Fix before launch
3. **Medium** - Review and fix if applicable
4. **Low** - Document and defer
5. **Informational** - Review for improvements

**Common False Positives:**

- CSP header "unsafe-inline" (required for Tailwind CSS)
- Missing X-Content-Type-Options (may be added by Vercel)
- Cookie without SameSite (Supabase handles auth cookies)

### Step 5: Export Report

```
Report → Generate HTML Report
Save to: docs/security-audit/zap-scan-report-YYYY-MM-DD.html
```

---

## Manual API Security Testing

### Authentication Testing

#### Test 1: Unauthenticated API Access

**Purpose:** Verify all API routes require authentication

```bash
# Should return 401 Unauthorized
curl -X POST https://dev.tripthreads.app/api/parse-with-openai \
  -H "Content-Type: application/json" \
  -d '{"input": "50 EUR dinner", "parserType": "expense"}'

# Expected: {"error": "Authentication required"} (401)
```

**Pass Criteria:** All API routes return 401 without valid session

#### Test 2: Invalid Token

**Purpose:** Verify token validation

```bash
# Use invalid/expired token
curl -X POST https://dev.tripthreads.app/api/parse-with-openai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -d '{"input": "50 EUR dinner", "parserType": "expense"}'

# Expected: {"error": "Authentication required"} (401)
```

### Authorization Testing

#### Test 3: Cross-Trip Access (Critical)

**Purpose:** Verify users cannot access other users' trips

```bash
# 1. Get User A's trip ID (logged in as User A)
TRIP_A_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 2. Try to access Trip A as User B
# Log in as User B, get session cookie
# Attempt to fetch Trip A's data
curl https://dev.tripthreads.app/api/trips/${TRIP_A_ID} \
  -H "Cookie: sb-access-token=USER_B_TOKEN"

# Expected: 403 Forbidden or empty response (RLS blocks)
```

**Pass Criteria:** User B cannot see Trip A's data

#### Test 4: Viewer Role Restrictions

**Purpose:** Verify viewers cannot edit content

```bash
# Log in as viewer account
# Attempt to create expense
curl -X POST https://dev.tripthreads.app/api/expenses \
  -H "Cookie: sb-access-token=VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "'${TRIP_ID}'",
    "description": "Unauthorized expense",
    "amount": 1000,
    "currency": "EUR"
  }'

# Expected: 403 Forbidden
```

**Pass Criteria:** Viewers cannot create/edit expenses, itinerary, or media

#### Test 5: Participant Removal Authorization

**Purpose:** Verify only owners can remove participants

```bash
# Log in as participant account (not owner)
# Attempt to remove another participant
curl -X DELETE https://dev.tripthreads.app/api/participants/${PARTICIPANT_ID} \
  -H "Cookie: sb-access-token=PARTICIPANT_TOKEN"

# Expected: 403 Forbidden
```

**Pass Criteria:** Non-owners cannot remove participants

### Parameter Tampering

#### Test 6: Trip ID Tampering

**Purpose:** Verify trip_id parameter validation

```bash
# Attempt to modify trip_id in request
curl -X POST https://dev.tripthreads.app/api/expenses \
  -H "Cookie: sb-access-token=VALID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "00000000-0000-0000-0000-000000000000",
    "description": "Test",
    "amount": 100,
    "currency": "EUR"
  }'

# Expected: 403 Forbidden (not a participant of that trip)
```

**Pass Criteria:** Cannot create expenses for trips user doesn't belong to

#### Test 7: User ID Tampering

**Purpose:** Verify user context is server-derived

```bash
# Attempt to specify different user_id
curl -X POST https://dev.tripthreads.app/api/expenses \
  -H "Cookie: sb-access-token=VALID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "'${TRIP_ID}'",
    "userId": "OTHER_USER_ID",
    "description": "Test",
    "amount": 100,
    "currency": "EUR"
  }'

# Expected: Ignored or 400 Bad Request
# User ID should be derived from session, not client input
```

---

## Rate Limiting Testing

### Test 8: API Rate Limit

**Purpose:** Verify 100 requests/minute rate limit

```bash
# Script to test rate limiting
for i in {1..110}; do
  echo "Request $i"
  curl -X POST https://dev.tripthreads.app/api/parse-with-openai \
    -H "Cookie: sb-access-token=VALID_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"input": "test", "parserType": "expense"}' \
    -w "\nHTTP Status: %{http_code}\n" \
    -o /dev/null -s
  sleep 0.5
done
```

**Expected:**

- Requests 1-100: 200 OK
- Requests 101-110: 429 Too Many Requests
- Response includes `Retry-After` header
- Response includes `X-RateLimit-*` headers

**Pass Criteria:** Rate limit enforced at 100 requests/minute

### Test 9: Photo Upload Rate Limit

**Purpose:** Verify 10 uploads/hour rate limit

```bash
# Upload 11 photos in quick succession
for i in {1..11}; do
  echo "Upload $i"
  curl -X POST https://dev.tripthreads.app/api/upload-photo \
    -H "Cookie: sb-access-token=VALID_TOKEN" \
    -F "fullImage=@test-photo.jpg" \
    -F "thumbnail=@test-thumb.jpg" \
    -F "tripId=${TRIP_ID}" \
    -F "dateTaken=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -w "\nHTTP Status: %{http_code}\n"
  sleep 2
done
```

**Expected:**

- Uploads 1-10: 200 OK
- Upload 11: 429 Too Many Requests

---

## CORS Testing

### Test 10: CORS Configuration

**Purpose:** Verify CORS only allows same-origin requests

```bash
# Test from different origin
curl -X POST https://dev.tripthreads.app/api/parse-with-openai \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=VALID_TOKEN" \
  -d '{"input": "test", "parserType": "expense"}' \
  -v 2>&1 | grep -i "access-control"

# Expected: No Access-Control-Allow-Origin header
# or Access-Control-Allow-Origin: https://dev.tripthreads.app
```

**Pass Criteria:** CORS headers only allow same-origin or explicitly allowed origins

---

## File Upload Testing

### Test 11: File Type Validation

**Purpose:** Verify only images are accepted for photo upload

```bash
# Attempt to upload non-image file
curl -X POST https://dev.tripthreads.app/api/upload-photo \
  -H "Cookie: sb-access-token=VALID_TOKEN" \
  -F "fullImage=@malicious.php" \
  -F "thumbnail=@thumb.jpg" \
  -F "tripId=${TRIP_ID}" \
  -F "dateTaken=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Expected: 400 Bad Request (invalid file type)
```

**Pass Criteria:** Only image files (JPEG, PNG, WEBP) accepted

### Test 12: File Size Limit

**Purpose:** Verify file size limits enforced

```bash
# Create large file (>50MB)
dd if=/dev/zero of=large-file.jpg bs=1m count=51

# Attempt to upload
curl -X POST https://dev.tripthreads.app/api/upload-photo \
  -H "Cookie: sb-access-token=VALID_TOKEN" \
  -F "fullImage=@large-file.jpg" \
  -F "thumbnail=@thumb.jpg" \
  -F "tripId=${TRIP_ID}" \
  -F "dateTaken=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Expected: 413 Payload Too Large or 400 Bad Request
```

**Pass Criteria:** Files over limit rejected

---

## Security Headers Testing

### Test 13: Security Headers Presence

**Purpose:** Verify all security headers are present

```bash
# Check security headers
curl -I https://dev.tripthreads.app/ | grep -E "(Content-Security-Policy|Strict-Transport|X-Frame|X-Content-Type|Referrer-Policy|Permissions-Policy)"

# Expected headers:
# Content-Security-Policy: default-src 'self'; ...
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**Pass Criteria:** All 6 security headers present

### Test 14: CSP Violation Reporting

**Purpose:** Verify CSP blocks inline scripts

```html
<!-- Test in browser console -->
<script>
  // This should be blocked by CSP
  eval('alert("CSP Test")')
</script>
```

**Expected:** Console error: "Refused to execute inline script..."

**Pass Criteria:** CSP blocks unauthorized inline scripts

### Test 15: Test with securityheaders.com

**Purpose:** Get automated security headers score

1. Visit: https://securityheaders.com/
2. Enter: `https://dev.tripthreads.app`
3. Click "Scan"

**Expected Score:** A+ or A

**Pass Criteria:** Score ≥ A

---

## Reporting Findings

### Severity Classification

| Severity          | Description               | Example                                |
| ----------------- | ------------------------- | -------------------------------------- |
| **Critical**      | Immediate security risk   | Authentication bypass, SQL injection   |
| **High**          | Significant security risk | Authorization issues, XSS              |
| **Medium**        | Moderate security risk    | Missing security headers, weak session |
| **Low**           | Minor security concern    | Information disclosure                 |
| **Informational** | Best practice suggestion  | Security header improvements           |

### Finding Template

```markdown
## Finding: [Title]

**Severity:** [Critical/High/Medium/Low/Informational]
**Category:** [Authentication/Authorization/Injection/etc.]
**Status:** [New/Confirmed/Fixed/False Positive]

### Description

[Detailed description of the vulnerability]

### Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Impact

[Potential impact if exploited]

### Affected Endpoints

- `/api/endpoint1`
- `/api/endpoint2`

### Recommendation

[How to fix the issue]

### References

- OWASP: [Link]
- CWE: [Link]
```

### Report Location

Save findings to: `docs/security-audit/findings-YYYY-MM-DD.md`

---

## Testing Checklist

### Pre-Testing

- [ ] Staging environment deployed
- [ ] Test accounts created (owner, participant, viewer)
- [ ] Test trip created with sample data
- [ ] OWASP ZAP installed and configured
- [ ] curl and Postman installed

### OWASP ZAP Scan

- [ ] Spider scan completed
- [ ] Active scan completed
- [ ] Results reviewed and triaged
- [ ] HTML report exported
- [ ] False positives documented

### Manual Testing

- [ ] Test 1: Unauthenticated API access
- [ ] Test 2: Invalid token
- [ ] Test 3: Cross-trip access
- [ ] Test 4: Viewer role restrictions
- [ ] Test 5: Participant removal authorization
- [ ] Test 6: Trip ID tampering
- [ ] Test 7: User ID tampering
- [ ] Test 8: API rate limit
- [ ] Test 9: Photo upload rate limit
- [ ] Test 10: CORS configuration
- [ ] Test 11: File type validation
- [ ] Test 12: File size limit
- [ ] Test 13: Security headers presence
- [ ] Test 14: CSP violation reporting
- [ ] Test 15: securityheaders.com score

### Post-Testing

- [ ] All findings documented
- [ ] Critical/high findings fixed
- [ ] Medium findings reviewed
- [ ] Low findings documented for future
- [ ] Re-test fixed issues
- [ ] Final report created
- [ ] Security sign-off obtained

---

## Additional Resources

### Tools

- **OWASP ZAP**: https://www.zaproxy.org/
- **Burp Suite Community**: https://portswigger.net/burp/communitydownload
- **Postman**: https://www.postman.com/
- **Security Headers**: https://securityheaders.com/
- **SSL Labs**: https://www.ssllabs.com/ssltest/

### References

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP Testing Guide**: https://owasp.org/www-project-web-security-testing-guide/
- **OWASP API Security**: https://owasp.org/www-project-api-security/

---

**Document Status:** ✅ Complete
**Next Review:** After each major release
**Owner:** Colin Rodriguez
**Last Updated:** December 23, 2025
