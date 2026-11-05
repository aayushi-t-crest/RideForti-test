# Architecture rules
- Public waitlist submissions use the shared email-only registration payload in `src/lib/publicSms.ts`; this prevents competing public SMS consent collection.
- Public support links open the globally loaded LeadConnector widget through its documented `leadConnector.chatWidget.openWidget` API; the legacy support bubble is restricted to admin routes to preserve internal support workflows.
- `/privacy-policy` and `/privacy` render the same legal page to preserve existing links.