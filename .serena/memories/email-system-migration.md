# Email System: SMTP → Azure Communication Services

## Migration Completed: March 31, 2026

### What Changed
- **Old**: nodemailer + SMTP (Office 365, smtp.office365.com:587)
- **New**: @azure/communication-email + Azure Communication Services SDK

### Key Files Modified
1. `backend/utils/emailService.js` - Complete rewrite
2. `backend/.env` - Removed SMTP*, added AZURE_* vars
3. `backend/README.md` - Updated setup instructions

### Environment Variables
**Remove**: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_FROM (with SMTP_PASS)
**Add**: AZURE_COMMUNICATION_CONNECTION_STRING, AZURE_EMAIL_FROM

### API Compatibility
✅ All 12 email functions maintain same signatures - no controller/route changes needed
✅ Response format unchanged: {sent:true} or {skipped:true/error}

### Setup Required
Get credentials from Azure Portal: Communication Services resource
- Connection string (Settings → Keys)
- Email from address (Email → Domains)

All email functions work without modification.
