# Email-CRM Integration Spec
## Gmail Integration for Bogen 2026 Operating Plan

### Overview
Integrate an "Email" component inside the CRM that behaves like an embedded Gmail client: connect to Gmail, sync messages, display and send email within the CRM, and attach messages to the correct client record.

---

## Assumptions
- CRM has authenticated users (agents/admins): Edmund, Dina, Samantha, Nicole
- Each CRM user may connect one or more Gmail accounts
- CRM has Client entities (sellers/buyers) and Deal/Transaction entities
- Goal includes:
  - Inbox/threads UI inside CRM
  - Read/search/filter
  - Compose/reply/forward
  - Logging emails to the right Client page automatically (plus manual override)

---

## High-Level Architecture

### Components

1. **Frontend (CRM UI)**
   - Email sidebar/tab (Inbox, Sent, Drafts, Client-linked, etc.)
   - Thread viewer
   - Composer (reply/forward/new)
   - Client "Email timeline" widget (embedded conversation history)

2. **Backend API (CRM Server)**
   - OAuth handshake + token storage
   - Gmail sync orchestration
   - Message parsing + normalization
   - Entity linking (email → client/deal)
   - Search endpoints (fast queries, filters)
   - Webhook / push notification receiver

3. **Sync Worker / Queue**
   - Pull or push-driven incremental sync
   - Attachment fetcher (on-demand or background)
   - Retry logic / rate limiting

4. **Database**
   - Normalized email tables (messages, threads, labels)
   - Link tables to clients/deals
   - Audit + permissions

---

## Authentication and Connection to Gmail

### OAuth Flow (per CRM user per Gmail account)
1. Frontend: user clicks "Connect Gmail"
2. Backend: redirects to Google OAuth consent screen with scopes
3. Backend: receives authorization code → exchanges for:
   - access_token (short-lived)
   - refresh_token (long-lived)
4. Backend stores tokens encrypted, keyed by crm_user_id + gmail_account_id

### Scope Selection
- Read-only: view + search + link
- Read/write: send email, create drafts, modify labels, archive
- Add scopes gradually to reduce friction

### Token Management
- Always use refresh flow server-side
- Store:
  - encrypted refresh token
  - token expiry timestamps
  - last sync checkpoint (historyId)

---

## Core Data Model

### GmailAccount
```
id
crm_user_id
email_address
provider = "gmail"
google_sub (stable account identifier)
status (connected/disconnected/error)
created_at, updated_at
```

### EmailThread
```
id (internal)
gmail_account_id
gmail_thread_id
subject_normalized
last_message_at
snippet
participants_cache (optional denormalized JSON)
created_at, updated_at
```

### EmailMessage
```
id (internal)
gmail_account_id
gmail_message_id
gmail_thread_id
thread_id (FK to EmailThread)
from_name, from_email
to[], cc[], bcc[] (JSON array)
sent_at (Date)
received_at (Date)
subject
snippet
body_text (optional)
body_html (optional)
headers_raw (optional)
is_outbound (bool)
has_attachments (bool)
size_estimate
created_at
```

### EmailAttachment
```
id
email_message_id
filename
mime_type
size
gmail_attachment_id
storage_url (if copied to storage)
created_at
```

### EmailClientLink (join)
```
email_message_id
client_id
confidence (0–100)
link_reason (enum: direct_address_match, domain_match, manual, ai_guess)
created_by (system/user)
created_at
```

---

## Linking Emails to Client Pages

### Primary Link Rule (Deterministic)
1. Extract all participant addresses from message headers (From, To, Cc, Reply-To)
2. For each address, attempt match to:
   - existing Client email fields (primary/secondary)
   - household member emails
3. If exactly one client matches → auto-link with high confidence

### Secondary Link Rules (Heuristics)
- Domain association (client's company domain)
- Past thread association: if thread already linked to a client, link new messages in same thread
- Subject keywords (property address, "St Andrews", listing IDs) to link to deal/listing

### Manual Override
- UI action: "Link to client…" search + attach
- UI action: "Unlink from client"
- Every manual action persists with created_by=user

---

## Gmail Sync Mechanics

### Mode A: Initial Import (Backfill)
- Pull messages by date range (e.g., last 90–365 days)
- Pagination in batches
- Fetch metadata first (fast), body on-demand or for recent messages only

### Mode B: Incremental Sync (Ongoing)
- Use checkpoint: historyId or last seen message timestamp
- Get changes since last checkpoint
- Fetch new/changed message IDs
- Upsert messages/threads/labels
- Update checkpoint

### Push Notifications (Preferred)
- Gmail supports push notifications via "watch" mechanism
- Backend registers watch per GmailAccount
- When webhook receives event: enqueue incremental sync job

---

## Frontend Components

### 1) Global Email View
- Left nav: Inbox, Sent, Drafts, Starred, Client-linked, Needs review
- Search bar: query + filters (date range, client, label)
- Message list: subject, snippet, participants, time, linked client badge
- Thread view: chronological messages, collapsible quoted text
- Action bar: reply, reply all, forward, archive, label, link/unlink client

### 2) Client Page Email Widget
- "Email" section shows:
  - Recent threads linked to this client
  - Last message snippet + timestamp
  - Quick reply composer
- "View all email" opens full thread view filtered to client
- Sorting: newest activity first

### 3) Compose / Reply Component
- Rich text editor (HTML)
- Templates/snippets
- Attachments: upload or pass-through to Gmail
- Outbound emails auto-link to currently selected client

---

## Sending Email (Outbound)

### Strategy: Send via Gmail API
1. Backend builds RFC 2822 MIME message
2. Calls Gmail send endpoint
3. Stores outbound message locally with "pending" status
4. Next sync confirms sent message ID + thread ID

### Outbound Linking Rules
- If sent from client context → force link to that client
- If sent from global composer → auto-link based on recipients; prompt if ambiguous

---

## MVP Scope (Build Order)

### MVP (usable fast)
1. Connect Gmail (OAuth)
2. Sync last 90 days: metadata + snippets
3. Thread list + thread viewer
4. Client auto-link by email match
5. Client page email widget (read-only)
6. Manual link/unlink
7. Compose + send (basic, no templates)
8. Attachment download on-demand

### V2 (team-grade)
- Push notifications + robust incremental sync
- Full-text body indexing
- Templates/snippets + tracking
- Shared visibility across team accounts
- Deal/listing linking by address
- Attachment storage + preview
- Analytics: response times, touchpoints, follow-up reminders

---

## API Endpoints (Illustrative)

```
POST /email/gmail/connect → starts OAuth
POST /email/gmail/callback → completes OAuth
POST /email/sync/start → enqueue backfill
GET /email/threads?label=INBOX&client_id=...&q=...
GET /email/threads/{thread_id}
POST /email/messages/{message_id}/link_client
DELETE /email/messages/{message_id}/link_client/{client_id}
POST /email/send (payload: from_account_id, to, subject, html, attachments[], client_id)
```

---

## Permissions and Multi-Agent Use

### Option A: Per-User Gmail Only (Simpler)
- Each CRM user sees only emails from accounts they connected
- Client page shows emails only from viewer's connected accounts

### Option B: Shared Client Email Visibility (Team)
- Multiple Gmail accounts can link emails to the same client
- Client email widget aggregates across accounts with permissions
- Must design confidentiality boundaries carefully

---

## Edge Cases to Handle
- Two clients share an email address (spouses/assistant) → support household entity or multi-link
- Clients email from different addresses → support multiple emails per client
- Forwarded emails → prioritize actual From/Reply-To
- Thread subject changes/splits → treat gmail_thread_id as authoritative
- Deleting/archiving → decide CRM-only vs modify Gmail labels
- Compliance/retention → define retention, encryption, audit logs
