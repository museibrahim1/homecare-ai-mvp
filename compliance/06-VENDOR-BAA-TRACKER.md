# PalmCare AI — Vendor BAA Tracker

**Last Updated:** February 22, 2026

---

## Vendor BAA Status Summary

| Vendor | Service | PHI Transmitted | BAA Available? | BAA Status | Action Required | Priority |
|--------|---------|----------------|----------------|------------|-----------------|----------|
| Railway | Cloud hosting | All ePHI | Yes (enterprise) | NOT SIGNED | Email solutions@railway.app | CRITICAL |
| OpenAI | Voice transcription + LLM | Voice recordings, transcripts | Yes (API) | NOT SIGNED | Email baa@openai.com | CRITICAL |
| Anthropic | LLM processing | Transcripts, documents | Yes (API) | NOT SIGNED | Contact sales via anthropic.com | CRITICAL |
| Twilio | Voice calls | Phone numbers, recordings | Yes (HIPAA Editions) | NOT SIGNED | Purchase HIPAA Editions | CRITICAL |
| Resend | Transactional email | Client names, contracts | **NO** | N/A | **SWITCH PROVIDER** | CRITICAL |
| Pyannote.ai | Speaker diarization | Voice recordings, voiceprints | Unknown | NOT SIGNED | Contact vendor | HIGH |
| Stirling-PDF | OCR processing | Contract templates | N/A (self-hosted) | N/A | None | N/A |
| Stripe | Payment processing | Business email only (no PHI) | Not required | N/A | None | N/A |
| Google | Calendar + OAuth | Visit schedules, client names | Yes (Workspace) | NOT SIGNED | Review Google BAA | MEDIUM |

---

## Detailed Action Items

### 1. OpenAI (CRITICAL - Do This First)
**Why it's easy:** Free to request, typically approved within days.

**Steps:**
1. Email `baa@openai.com` with:
   - Company name: PalmCare AI (PalmTai LLC)
   - Use case: Voice transcription (Whisper API) and contract generation (GPT API) for home care management software
   - Confirm you need zero-data-retention endpoints
2. Sign and return the BAA
3. Verify zero-data-retention is enabled on your API account
4. File signed BAA in this directory

**Estimated Time:** 2-5 business days
**Cost:** Free

---

### 2. Anthropic (CRITICAL - Do This First)
**Why it's easy:** Available for API customers.

**Steps:**
1. Visit https://www.anthropic.com/contact-sales or email sales
2. Request BAA for API usage
3. Describe use case: AI-powered document analysis and contract generation for HIPAA-covered home care agencies
4. Sign and return the BAA
5. Confirm zero-data-retention settings

**Estimated Time:** 3-7 business days
**Cost:** Free

---

### 3. Railway (CRITICAL)
**Steps:**
1. Email `solutions@railway.app`
2. Request enterprise plan with HIPAA BAA
3. Describe: SaaS platform processing ePHI for home care agencies
4. Discuss minimum spend requirements
5. If cost-prohibitive, evaluate migration to AWS (free BAA with any Business/Enterprise support plan)

**Estimated Time:** 1-2 weeks
**Cost:** May require enterprise pricing tier

**Alternative if Railway BAA is too expensive:**
- AWS: Free BAA with Business Support ($100/mo minimum)
- GCP: Free BAA available
- Azure: Free BAA with enterprise agreement

---

### 4. Twilio (CRITICAL)
**Steps:**
1. Contact Twilio sales for HIPAA Editions pricing
2. Purchase HIPAA-eligible account
3. Designate your project as HIPAA-eligible
4. Execute BAA
5. Enable HTTP Authentication for recordings

**Estimated Time:** 1-2 weeks
**Cost:** Premium over standard Twilio pricing

---

### 5. Email Provider (CRITICAL - Must Switch)
**Resend does NOT offer a BAA.** You must switch to a HIPAA-compliant email provider.

**Options:**

| Provider | BAA? | HIPAA? | Pricing | Best For |
|----------|------|--------|---------|----------|
| **Paubox Email API** | Yes | HITRUST certified | From $0 (free tier) | Easiest HIPAA email |
| **AWS SES** | Yes (with AWS BAA) | Yes | ~$0.10/1000 emails | Cheapest if on AWS |
| **Mailgun** | Yes | Yes | From $35/mo | Good API, easy migration |
| **Postmark** | Yes | Yes | From $15/mo | Best deliverability |

**Recommended:** Paubox (free tier available, purpose-built for healthcare) or AWS SES (cheapest at scale, free BAA if you're on AWS).

**Migration Steps:**
1. Choose replacement provider
2. Sign BAA with new provider
3. Update `RESEND_API_KEY` and email sending code
4. Test email delivery
5. Remove Resend integration

---

### 6. Pyannote.ai (HIGH)
**Steps:**
1. Contact Pyannote.ai to ask about BAA availability
2. If no BAA available, evaluate:
   - Self-hosting the Pyannote model (no BAA needed)
   - Alternative speaker diarization service with BAA
3. Document decision

---

## BAA Filing

All signed BAAs should be stored in:
```
compliance/baas/
  ├── openai-baa-signed.pdf
  ├── anthropic-baa-signed.pdf
  ├── railway-baa-signed.pdf
  ├── twilio-baa-signed.pdf
  ├── email-provider-baa-signed.pdf
  └── other-vendor-baa-signed.pdf
```

BAAs must be retained for 6 years after termination of the relationship.

---

## Review Schedule

- BAA inventory reviewed quarterly
- New vendor onboarding requires BAA assessment before PHI access
- Annual verification that all BAAs are current and accurate
