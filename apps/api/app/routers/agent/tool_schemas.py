"""Claude tool (function-calling) schema definitions for the Palm AI agent."""


SHARED_TOOLS = [
    {
        "name": "list_clients",
        "description": "List the user's clients. Returns name, status, care level, diagnosis, phone, and city/state for each.",
        "input_schema": {
            "type": "object",
            "properties": {
                "search": {"type": "string", "description": "Search by name, phone, or diagnosis."},
                "status": {"type": "string", "description": "Filter: active, inactive, pending, discharged."},
                "limit": {"type": "integer", "description": "Max results (default 20)."},
            },
            "required": [],
        },
    },
    {
        "name": "get_client",
        "description": "Get full details for a specific client by name (partial match). Includes demographics, diagnosis, care level, emergency contacts, preferences.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Client name or partial name."},
            },
            "required": ["name"],
        },
    },
    {
        "name": "create_client",
        "description": "Add a new client to the roster. Required: full_name. Optional: date_of_birth, gender, phone, email, address, city, state, zip_code, primary_diagnosis, care_level (LOW/MODERATE/HIGH), emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, notes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "full_name": {"type": "string"},
                "date_of_birth": {"type": "string", "description": "YYYY-MM-DD format."},
                "gender": {"type": "string"},
                "phone": {"type": "string"},
                "email": {"type": "string"},
                "address": {"type": "string"},
                "city": {"type": "string"},
                "state": {"type": "string"},
                "zip_code": {"type": "string"},
                "primary_diagnosis": {"type": "string"},
                "care_level": {"type": "string", "enum": ["LOW", "MODERATE", "HIGH"]},
                "mobility_status": {"type": "string"},
                "cognitive_status": {"type": "string"},
                "living_situation": {"type": "string"},
                "emergency_contact_name": {"type": "string"},
                "emergency_contact_phone": {"type": "string"},
                "emergency_contact_relationship": {"type": "string"},
                "notes": {"type": "string"},
            },
            "required": ["full_name"],
        },
    },
    {
        "name": "update_client",
        "description": "Update a client's information. Specify the client name and any fields to change.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Client name to find (partial match)."},
                "updates": {
                    "type": "object",
                    "description": "Fields to update. Keys: full_name, phone, email, address, city, state, zip_code, primary_diagnosis, care_level, status, notes, mobility_status, cognitive_status, living_situation.",
                },
            },
            "required": ["name", "updates"],
        },
    },
    {
        "name": "list_visits",
        "description": "List assessments/visits. Shows visit date, client name, status, and pipeline state.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Filter by client name."},
                "status": {"type": "string", "description": "Filter: scheduled, in_progress, completed, cancelled."},
                "limit": {"type": "integer", "description": "Max results (default 10)."},
            },
            "required": [],
        },
    },
    {
        "name": "create_visit",
        "description": "Create a new assessment/visit for a client.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Client name (partial match)."},
                "visit_date": {"type": "string", "description": "YYYY-MM-DD format. Defaults to today."},
                "visit_type": {"type": "string", "description": "E.g. 'initial_assessment', 'follow_up', 'recertification'. Default: initial_assessment."},
                "notes": {"type": "string"},
            },
            "required": ["client_name"],
        },
    },
    {
        "name": "get_visit_status",
        "description": "Get the pipeline status for a visit — which steps are done (transcription, diarization, billing, note, contract).",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Client name to find the latest visit for."},
            },
            "required": ["client_name"],
        },
    },
    {
        "name": "get_billables",
        "description": "Get billable line items for a client's latest visit. Shows services, durations, amounts, and approval status.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Client name."},
            },
            "required": ["client_name"],
        },
    },
    {
        "name": "get_visit_note",
        "description": "Get the clinical note for a client's latest visit.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Client name."},
            },
            "required": ["client_name"],
        },
    },
    {
        "name": "get_contract",
        "description": "Get the latest contract for a client — care plan, schedule, services, and status.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Client name."},
            },
            "required": ["client_name"],
        },
    },
    {
        "name": "create_note",
        "description": "Create a smart note (with optional AI task extraction). Can be linked to a client.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "content": {"type": "string", "description": "Note text. AI will extract tasks and reminders if present."},
                "client_name": {"type": "string", "description": "Optional: link to a client."},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "Optional tags."},
                "pinned": {"type": "boolean"},
            },
            "required": ["title", "content"],
        },
    },
    {
        "name": "list_notes",
        "description": "List smart notes, optionally filtered by search term, tag, or client.",
        "input_schema": {
            "type": "object",
            "properties": {
                "search": {"type": "string"},
                "tag": {"type": "string"},
                "client_name": {"type": "string"},
                "limit": {"type": "integer"},
            },
            "required": [],
        },
    },
    {
        "name": "list_tasks",
        "description": "List tasks (from smart notes). Filter by status, priority, or due date.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "pending, in_progress, completed, cancelled."},
                "priority": {"type": "string", "description": "low, medium, high, urgent."},
            },
            "required": [],
        },
    },
    {
        "name": "complete_task",
        "description": "Mark a task as completed by its title (partial match).",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_title": {"type": "string"},
            },
            "required": ["task_title"],
        },
    },
    {
        "name": "list_caregivers",
        "description": "List caregivers. Filter by certification, status, or search by name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "search": {"type": "string"},
                "certification": {"type": "string", "description": "E.g. CNA, RN, LPN."},
                "status": {"type": "string", "description": "active, inactive, on_leave."},
                "limit": {"type": "integer"},
            },
            "required": [],
        },
    },
    {
        "name": "match_caregiver",
        "description": "Find the best caregiver match for a client based on care level, skills, and availability.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Client to match for."},
            },
            "required": ["client_name"],
        },
    },
    {
        "name": "get_reports_overview",
        "description": "Get overview report: assessments this week, total services, contracts generated, active clients.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_billing_report",
        "description": "Get billing report: total hours, amounts, and category breakdown for recent days.",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Number of days to look back (default 30)."},
            },
            "required": [],
        },
    },
    {
        "name": "get_calendar_events",
        "description": "Get upcoming calendar events (if Google Calendar is connected).",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Number of days ahead to look (default 7)."},
            },
            "required": [],
        },
    },
    {
        "name": "get_usage",
        "description": "Check assessment usage and plan limits — how many assessments used vs allowed.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "export_contract",
        "description": "Generate and return a downloadable contract document (PDF or DOCX) for a client. The user gets a download link.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Client name."},
                "format": {"type": "string", "enum": ["pdf", "docx"], "description": "Document format. Default: pdf."},
            },
            "required": ["client_name"],
        },
    },
    {
        "name": "export_note",
        "description": "Generate and return a downloadable visit note document (PDF or DOCX) for a client's latest visit.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Client name."},
                "format": {"type": "string", "enum": ["pdf", "docx"], "description": "Default: pdf."},
            },
            "required": ["client_name"],
        },
    },
    {
        "name": "export_timesheet",
        "description": "Generate and return a downloadable timesheet CSV for a client's latest visit billables.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string", "description": "Client name."},
            },
            "required": ["client_name"],
        },
    },
    {
        "name": "export_billing_report",
        "description": "Generate and return a downloadable billing report CSV for the user's recent activity.",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Number of days (default 30)."},
            },
            "required": [],
        },
    },
    {
        "name": "generate_document",
        "description": "Generate a custom document from scratch using AI. Creates professional PDFs for: letters, summaries, care plans, reports, memos, etc. Specify the type and what to include.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Document title."},
                "doc_type": {"type": "string", "description": "Type: letter, summary, care_plan, report, memo, custom."},
                "instructions": {"type": "string", "description": "What the document should contain. Be specific."},
                "client_name": {"type": "string", "description": "Optional: link to a client for context."},
            },
            "required": ["title", "doc_type", "instructions"],
        },
    },
    {
        "name": "email_document",
        "description": "Email a contract or note PDF to a specific email address for a client.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_name": {"type": "string"},
                "doc_type": {"type": "string", "enum": ["contract", "note"], "description": "Which document to email."},
                "recipient_email": {"type": "string"},
                "recipient_name": {"type": "string"},
                "message": {"type": "string", "description": "Optional message to include in the email."},
            },
            "required": ["client_name", "doc_type", "recipient_email"],
        },
    },
]


# ── Admin-Only Tools ─────────────────────────────────────────────────

ADMIN_TOOLS = [
    {
        "name": "get_outreach_stats",
        "description": "Get current outreach statistics: total leads, emails sent, calls made, investors contacted, callbacks pending.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_weekly_summary",
        "description": "Get a summary of the outreach week: emails sent/pending per day, calls made/pending, investor emails.",
        "input_schema": {
            "type": "object",
            "properties": {
                "week_offset": {"type": "integer", "description": "0=current week, 1=next. Default 0."},
            },
            "required": [],
        },
    },
    {
        "name": "batch_send_emails",
        "description": "Send all pending outreach emails. Types: 'agency' and/or 'investor'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "types": {"type": "array", "items": {"type": "string", "enum": ["agency", "investor"]}},
            },
            "required": ["types"],
        },
    },
    {
        "name": "mark_call_done",
        "description": "Mark a sales lead as called with optional notes and callback flag.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lead_name": {"type": "string"},
                "notes": {"type": "string"},
                "callback": {"type": "boolean"},
            },
            "required": ["lead_name"],
        },
    },
    {
        "name": "search_leads",
        "description": "Search sales leads (agencies) by name, state, or status.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "state": {"type": "string"},
                "status": {"type": "string"},
                "limit": {"type": "integer"},
            },
            "required": [],
        },
    },
    {
        "name": "search_investors",
        "description": "Search investor CRM by fund name, type, or focus area.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "has_email": {"type": "boolean"},
                "limit": {"type": "integer"},
            },
            "required": [],
        },
    },
    {
        "name": "get_callbacks",
        "description": "Get all leads marked for callback.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_pending_work",
        "description": "Get summary of all pending outreach work.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "send_single_email",
        "description": "Send an outreach email to a single agency or investor by name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "type": {"type": "string", "enum": ["agency", "investor"]},
            },
            "required": ["name", "type"],
        },
    },
    {
        "name": "assign_leads_to_team",
        "description": "Assign a batch of leads to a team member for calls or emails.",
        "input_schema": {
            "type": "object",
            "properties": {
                "team_member_email": {"type": "string"},
                "assign_type": {"type": "string", "enum": ["call", "email"]},
                "count": {"type": "integer"},
                "states": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["team_member_email", "assign_type"],
        },
    },
    {
        "name": "add_lead_notes",
        "description": "Add notes to a sales lead.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lead_name": {"type": "string"},
                "notes": {"type": "string"},
            },
            "required": ["lead_name", "notes"],
        },
    },
]


# ══════════════════════════════════════════════════════════════════════
#  TOOL IMPLEMENTATIONS
# ══════════════════════════════════════════════════════════════════════

