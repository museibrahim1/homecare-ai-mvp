# PalmCare AI — Voice Agent & Mobile App Development Plan

> **Created**: February 22, 2026
> **Status**: Planning Phase
> **Owner**: Palm Technologies, INC.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Voice Agent Plan](#voice-agent-plan)
3. [Mobile App Plan](#mobile-app-plan)
4. [Technical Architecture](#technical-architecture)
5. [Timeline & Milestones](#timeline--milestones)
6. [Resource Requirements](#resource-requirements)

---

## Executive Summary

PalmCare AI currently operates as a web-based SaaS platform with:
- **Existing Voice Capabilities**: Browser-based audio recording, Whisper speech-to-text, AI-powered diarization and transcript analysis
- **Existing Mobile Support**: Responsive web design, PWA manifest (no service worker), mobile-optimized UI components

This plan outlines the path to:
1. A **production-ready AI Voice Agent** that can conduct care assessments conversationally
2. A **native companion mobile app** (React Native) for caregivers and providers in the field

---

## Voice Agent Plan

### Vision
An AI voice agent that can:
- Conduct structured care assessments via phone or in-app voice
- Ask the right questions based on state-specific requirements
- Capture responses in real-time and generate documentation automatically
- Guide providers/caregivers through assessment forms conversationally

### Phase 1: Voice Assessment Agent (Core MVP)

**Goal**: An AI that can conduct a care assessment over the phone, asking questions conversationally and filling in the assessment form automatically.

#### Architecture
```
Caller → Voice Provider (Vapi/Bland/LiveKit) → WebSocket → PalmCare Voice Agent
                                                              ├── Real-time STT (Deepgram/Whisper)
                                                              ├── AI Conversation Engine (Claude/GPT-4)
                                                              ├── Assessment State Machine
                                                              └── Real-time TTS (ElevenLabs)
```

#### Components to Build

1. **Real-Time Speech-to-Text Pipeline**
   - Replace batch Whisper with streaming STT (Deepgram recommended for real-time)
   - WebSocket connection for audio streaming
   - Word-level timestamps for diarization
   - Interim results for faster response time
   - File: `apps/api/app/services/realtime_stt.py`

2. **Conversational Assessment Engine**
   - State machine tracking assessment progress
   - Uses state-specific assessment templates (NE, IA, all 50 states)
   - Generates contextual follow-up questions
   - Validates responses against expected domains
   - Handles interruptions, clarifications, and corrections
   - File: `apps/api/app/services/assessment_engine.py`

3. **Real-Time Text-to-Speech**
   - ElevenLabs streaming TTS (already have WaveSpeed API)
   - Natural-sounding voice for questions
   - Low-latency response (<500ms)
   - File: `apps/api/app/services/realtime_tts.py`

4. **Voice Provider Integration (Vapi, Bland AI, or LiveKit)**
   - WebSocket media streams for real-time audio
   - Two-party consent handling for recording states
   - Call status webhooks
   - Call recording and storage
   - Real-time audio streaming endpoint
   - File: `apps/api/app/services/voice_provider.py` (new)

5. **Assessment Progress UI**
   - Real-time dashboard showing assessment progress during call
   - Live transcript with speaker labels
   - Assessment fields filling in as the conversation progresses
   - Provider can intervene or add notes during the call
   - File: `apps/web/src/components/LiveAssessment.tsx`

#### Assessment Flow
```
1. Provider initiates assessment call (web UI or phone)
2. System calls the client (or provider starts in-person recording)
3. AI greets and explains the process, gets consent
4. AI asks assessment questions conversationally:
   - "Let's start with some basic information. Can you tell me your full name?"
   - "And your date of birth?"
   - "Do you have any medical conditions I should know about?"
   - "Let's talk about your daily activities. Can you bathe independently?"
5. AI adapts questions based on responses:
   - If client mentions pain → follows up with pain assessment
   - If client mentions falls → triggers fall risk screening
   - If client shows cognitive concerns → triggers SLUMS/MMSE
6. Assessment fills in real-time on provider's dashboard
7. When complete, AI summarizes and generates:
   - Completed assessment form
   - SOAP note
   - Service recommendations
   - Preliminary service agreement
```

### Phase 2: Voice Agent Enhancements

1. **Multi-Language Support**
   - Spanish (largest non-English population)
   - Translate questions and understand responses in target language

2. **Voiceprint Authentication**
   - Verify client identity via voice (already have voiceprint model)
   - Prevent fraud in recurring assessments

3. **Ambient Listening Mode**
   - Provider conducts assessment naturally
   - AI listens and fills in assessment form in background
   - Provider reviews and confirms at end

4. **Smart Scheduling Integration**
   - AI can schedule follow-up assessments
   - Calendar integration (Google Calendar already connected)
   - Automated reminders via voice call or SMS

### Phase 3: Autonomous Voice Agent

1. **Outbound Assessment Calls**
   - AI initiates scheduled reassessment calls
   - Checks on client well-being between visits
   - Escalates concerns to provider

2. **Care Coordination Calls**
   - AI facilitates calls between provider, client, and family
   - Takes notes and distributes action items

3. **24/7 Client Support Line**
   - AI answers client questions about their care plan
   - Routes urgent issues to on-call provider
   - Logs all interactions for compliance

---

## Mobile Companion App Plan

### Vision
A native companion app for caregivers and providers that enables:
- In-field voice assessments (tap to record, AI processes automatically)
- Real-time documentation during home visits
- ADL logging and check-ins
- Offline capability for areas with poor connectivity

### Technology Choice: React Native + Expo

**Rationale**:
- Share ~80% of code with existing React web components
- Single codebase for iOS and Android
- Expo for easier builds, OTA updates, and device API access
- React Native's audio recording capabilities are mature
- Can embed existing Tailwind-styled components via NativeWind

### Phase 1: Mobile MVP (Caregiver App)

**Goal**: A focused mobile app for caregivers to use during home visits.

#### Core Features

1. **Quick Assessment Recording**
   - Large "Record" button on home screen
   - Select client from list → tap to record → AI processes
   - Real-time transcription preview during recording
   - Upload to pipeline when connected

2. **ADL / Visit Check-In**
   - Quick checklist for common ADLs
   - One-tap logging: bathing, dressing, meals, medications, mobility
   - Photo capture for wound care documentation
   - GPS verification for EVV compliance

3. **Client Dashboard**
   - View assigned clients
   - See care plans, recent notes, upcoming visits
   - Contact information and emergency contacts

4. **Visit Documentation**
   - Start/end visit timestamps (EVV)
   - Voice-to-text notes during visit
   - Auto-generated visit summary

5. **Notifications**
   - Upcoming visit reminders
   - Certification expiry alerts
   - New client assignments
   - Assessment completion notifications

#### App Structure
```
/mobile/
├── app/                    # Expo Router (file-based routing)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── mfa.tsx
│   ├── (tabs)/
│   │   ├── index.tsx       # Home / Quick Actions
│   │   ├── clients.tsx     # Client List
│   │   ├── visits.tsx      # Visit Schedule
│   │   ├── record.tsx      # Record Assessment
│   │   └── profile.tsx     # Profile & Settings
│   └── visit/[id].tsx      # Visit Detail
├── components/
│   ├── AudioRecorder.tsx   # Recording with waveform
│   ├── ClientCard.tsx      # Client info card
│   ├── ADLChecklist.tsx    # Quick ADL logging
│   ├── VisitTimer.tsx      # Visit duration tracker
│   └── PipelineStatus.tsx  # Processing indicator
├── lib/
│   ├── api.ts             # Shared API client (from web)
│   ├── auth.ts            # Auth with secure storage
│   └── offline.ts         # Offline queue manager
├── app.json               # Expo config
├── package.json
└── tailwind.config.js     # NativeWind config
```

### Phase 2: Provider App (Agency Owner)

**Goal**: Extend the app for agency owners/administrators.

1. **Client Management**
   - Full client CRM on mobile
   - Add/edit clients
   - Status pipeline view

2. **Contract Management**
   - View and send contracts
   - E-signature capture (touch to sign)
   - PDF export and share

3. **Team Management**
   - View caregiver schedules
   - Assign visits
   - Review caregiver-submitted documentation

4. **Analytics Dashboard**
   - Revenue overview
   - Visit completion rates
   - Caregiver performance metrics

### Phase 3: Offline-First & Advanced Features

1. **Offline Mode**
   - Queue recordings and notes when offline
   - Sync when connection restored
   - Local SQLite for client data cache
   - Conflict resolution for concurrent edits

2. **Biometric Authentication**
   - Face ID / Touch ID login
   - Voiceprint verification

3. **Augmented Features**
   - Camera-based wound measurement
   - Medication barcode scanning
   - Fall detection (if configured as background service)

---

## Technical Architecture

### System Diagram
```
┌─────────────────────────────────────────────────────┐
│                    Client Devices                     │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Web App  │  │ iOS App  │  │    Android App     │ │
│  │ (Next.js)│  │  (Expo)  │  │      (Expo)        │ │
│  └────┬─────┘  └────┬─────┘  └────────┬───────────┘ │
└───────┼──────────────┼─────────────────┼─────────────┘
        │              │                 │
        └──────────────┼─────────────────┘
                       │
                ┌──────▼──────┐
                │   API GW    │
                │  (FastAPI)  │
                └──────┬──────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
  ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
  │  Auth &   │ │  Voice    │ │ Pipeline  │
  │  Users    │ │  Agent    │ │  Workers  │
  │           │ │           │ │ (Celery)  │
  └───────────┘ └─────┬─────┘ └───────────┘
                      │
              ┌───────┼───────┐
              │       │       │
        ┌─────▼─┐ ┌──▼───┐ ┌─▼──────┐
        │Voice  │ │Deep- │ │Eleven- │
        │Provider│ │gram  │ │Labs    │
        │       │ │(STT) │ │(TTS)   │
        └───────┘ └──────┘ └────────┘
```

### Key Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Mobile App | React Native + Expo | Code sharing with web, mature ecosystem |
| Real-time STT | Deepgram | Lowest latency streaming STT, HIPAA eligible |
| Real-time TTS | ElevenLabs (via WaveSpeed) | Already integrated, natural voice |
| Voice Calls | Vapi / Bland AI / LiveKit | Modern voice AI platform with WebSocket streams |
| Conversation AI | Claude 3.5 | Best reasoning for complex assessments |
| Offline Storage | SQLite (expo-sqlite) | Reliable local database |
| Push Notifications | Expo Notifications + FCM/APNs | Cross-platform push |
| E-Signature | react-native-signature-canvas | Touch-based signatures |
| EVV | GPS + timestamps | Compliant with 21st Century Cures Act |

### API Endpoints Needed (New)

#### Voice Agent
```
POST   /voice/session/start     — Start voice assessment session
WS     /voice/stream             — WebSocket for real-time audio
POST   /voice/session/end        — End session, trigger processing
GET    /voice/session/{id}       — Get session status and results
POST   /voice/tts                — Text-to-speech conversion
```

#### Mobile-Specific
```
POST   /mobile/visits/checkin    — EVV check-in with GPS
POST   /mobile/visits/checkout   — EVV check-out
POST   /mobile/adl/log           — Quick ADL logging
GET    /mobile/sync/pending      — Get pending sync items
POST   /mobile/sync/upload       — Upload offline queue
POST   /mobile/push/register     — Register push token
```

---

## Timeline & Milestones

### Voice Agent

| Phase | Milestone | Timeline | Dependencies |
|-------|-----------|----------|--------------|
| 1.1 | Deepgram streaming STT integration | Week 1-2 | Deepgram API key |
| 1.2 | Assessment conversation engine | Week 2-4 | State knowledge base |
| 1.3 | ElevenLabs streaming TTS | Week 3-4 | Already have API |
| 1.4 | Voice provider integration (Vapi/Bland/LiveKit) | Week 4-5 | Provider API key |
| 1.5 | Live assessment dashboard UI | Week 5-6 | Frontend work |
| 1.6 | Integration testing + pilot | Week 7-8 | Test accounts |
| 2.0 | Multi-language support | Week 9-12 | Translation services |
| 3.0 | Autonomous outbound calls | Week 13-16 | Legal review |

### Mobile App

| Phase | Milestone | Timeline | Dependencies |
|-------|-----------|----------|--------------|
| 1.1 | Expo project setup + auth | Week 1-2 | Apple/Google dev accounts |
| 1.2 | Client list + visit schedule | Week 2-3 | API already exists |
| 1.3 | Voice recording + upload | Week 3-4 | Audio permissions |
| 1.4 | ADL check-in + EVV | Week 4-5 | GPS permissions |
| 1.5 | Visit documentation | Week 5-6 | Camera permissions |
| 1.6 | Push notifications | Week 6-7 | FCM/APNs setup |
| 1.7 | Beta testing (TestFlight/Play) | Week 7-8 | Test users |
| 2.0 | Provider features | Week 9-12 | Phase 1 stable |
| 3.0 | Offline mode + advanced | Week 13-16 | SQLite + sync logic |

---

## Resource Requirements

### Development
- 1 Full-stack developer (voice agent + API)
- 1 React Native developer (mobile app)
- 1 AI/ML engineer (conversation engine tuning)
- Part-time: UX designer, QA tester

### Infrastructure
- Deepgram API account (streaming STT) — ~$0.0059/min
- ElevenLabs API (already have via WaveSpeed)
- Voice provider (Vapi/Bland/LiveKit) — ~$0.05-0.10/min for AI calls
- Apple Developer Program ($99/year)
- Google Play Developer ($25 one-time)
- Expo EAS Build (free tier may suffice initially)

### Estimated Costs (Monthly, at scale)
| Service | Cost/month (100 agencies) |
|---------|--------------------------|
| Deepgram STT | ~$200 |
| ElevenLabs TTS | ~$150 |
| Voice provider calls | ~$500 |
| Infrastructure | ~$200 |
| App store fees | ~$10 |
| **Total** | **~$860/month** |

---

## Next Steps (Immediate)

1. **Set up Expo project** in `/mobile/` directory
2. **Evaluate voice providers** (Vapi, Bland AI, LiveKit) and set up integration
3. **Prototype streaming STT** with Deepgram
4. **Build assessment state machine** using existing Iowa/Nebraska templates
5. **Design mobile app screens** in Figma or directly in code
6. **PWA service worker** as interim mobile solution (2-3 hour task)

---

*This plan will be updated as development progresses.*
