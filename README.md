Seiko DSR Dashboard
A complete sales data management system for Seiko stores with Excel file upload, duplicate detection, discrepancy tracking, and analytics dashboard.
Features
✅ File Upload
Drag-and-drop Excel file upload (XLSX format)
Automatic validation and parsing
Support for 26 Seiko stores across India
✅ Duplicate Detection
Smart detection based on: Store Code + Invoice # + Model + Serial Number
Distinguishes between exact duplicates and discrepancies
Logs all upload history
✅ Discrepancy Management
Identifies data changes in re-uploaded files
Row-by-row approval/rejection workflow
Bulk approve/reject functionality
Tracks who approved what and when
✅ Master Data Management
Single source of truth for all sales data
Automatic insertion of new entries
Change tracking for approved discrepancies
Complete audit trail
✅ Analytics Dashboard
Sales trends by family (King Seiko, Presage, Prospex, etc.)
Sales analysis by calibre (4R, 6R, etc.)
Discount trends over time
Sales breakdown by store and region
Date range filtering
✅ Authentication
Simple email/password login
Store-specific access control
User management per store
---
Tech Stack
Component	Technology	Version
Frontend	Next.js	14.0+
React	React	18.2+
Backend APIs	Node.js (Vercel Functions)	18.x
Database	PostgreSQL (Supabase)	14+
File Processing	Supabase Edge Functions	Deno
Version Control	GitHub	-
Hosting	Vercel	-
---
Quick Start
Prerequisites
Node.js 18+ and npm 9+
GitHub account with repo access
Supabase project (already created)
Vercel account
Local Development
```bash
# 1. Clone repo
git clone https://github.com/vivekatseiko/seiko-dsr-dashboard.git
cd seiko-dsr-dashboard

# 2. Install dependencies
npm install

# 3. Create .env.local (copy from template)
cp .env.local.template .env.local
# Edit .env.local with your Supabase credentials

# 4. Run development server
npm run dev

# 5. Open http://localhost:3000
# Login with your test credentials
```
Production Deployment
See DEPLOYMENT_GUIDE.md for step-by-step instructions.
---
Database Schema
Core Tables
store_master (26 stores)
Store code, name, city, region, channel, status
auth_users (user accounts)
Email, password hash, assigned store, is_active
sales_master (all approved entries)
Transaction details: invoice #, model, serial, quantity, price, discount, customer info, etc.
Unique constraint: store_code + invoice_number + model_number + serial_number
sales_uploads_log (upload history)
Upload metadata: store, user, timestamp, row counts, status
discrepancies (pending approvals)
Fields that changed: old value → new value
Status: Pending/Approved/Rejected
Tracks who approved and when
audit_trail (complete history)
All actions: login, upload, approval, rejection
Timestamp and user info
---
File Format Requirements
Expected Excel Columns
The system expects these columns in uploaded Excel files:
Column	Type	Required	Notes
Date	Number	✅	Excel date format (e.g., 46113)
System Invoice Number	Text	✅	e.g., "SSIL/26-27/1"
Model Number	Text	✅	e.g., "SRPL59K1"
Serial Number	Text	✅	e.g., "8289"
Qty	Number	✅	Quantity sold
MRP	Number	✅	Maximum Retail Price
Net Value (after discount)	Number	✅	Actual sale price
Discount Value	Number	✅	Discount amount
Discount %	Decimal	✅	Discount percentage
Sold By	Text	✅	Staff name
Family	Text	✅	Watch family (Presage, Prospex, etc.)
Calibre	Text	✅	Watch calibre (4R, 6R, etc.)
Cash	Number	⚠️	Payment mode: Cash amount
Card	Number	⚠️	Payment mode: Card amount
Other Payment	Number	⚠️	Payment mode: Other amount
Customers Name	Text	⚠️	Customer name
Mobile Number	Text	⚠️	Customer phone
Store E Warranty	Text	⚠️	Activation status
Customer E Warranty	Text	⚠️	Activation status
---
API Endpoints
Authentication
```
POST /api/auth
  body: { action: "login", email, password }
  returns: { sessionToken, email, storeCode }
```
File Upload
```
POST /api/upload
  body: { email, storeCode }
  returns: { uploadId, existingDataMap }
```
Discrepancies
```
GET /api/discrepancies?uploadId=123
  returns: { discrepancies: [] }

POST /api/discrepancies
  body: { action: "approve"|"reject", discrepancyIds: [], email }
  returns: { message: "..." }
```
Dashboard Data
```
GET /api/dashboard?metric=sales-by-family&storeCode=SWSPHPLUK&startDate=2024-04-01&endDate=2024-06-30
  metrics: "sales-by-family" | "sales-by-calibre" | "discount-trends" | "sales-by-store" | "sales-by-region" | "summary"
  returns: [ { family, qty, value }, ... ]
```
Upload History
```
GET /api/uploads-log?storeCode=SWSPHPLUK&limit=50&offset=0
  returns: { logs: [...], total, limit, offset }
```
---
Error Handling
Common Issues & Solutions
Login fails: Wrong password or user doesn't exist
Reset password in Supabase `auth_users` table
File upload hangs: Processing is taking too long
Check file size (max 10MB)
Check browser console for network errors
Discrepancies not showing: Edge Function didn't process
Check Supabase Functions → Logs
Verify file format matches expected columns
Dashboard shows no data: No sales data yet
Upload a file first with valid data
Check if upload marked as "Completed"
---
Performance Notes
Operation	Time	Notes
File upload (2MB)	10-15s	Includes parsing & validation
Discrepancy approval (100 rows)	2-3s	Batch update
Dashboard load	<2s	Cached results
Add new user	1s	Direct DB insert
Supabase limits:
Row Level Security policies enabled
100 requests/minute per IP (Vercel handles scaling)
Max file size: 10MB via Vercel
---
Security Features
✅ Email/password authentication (bcrypt hashing)
✅ Store-level access control
✅ Audit trail of all modifications
✅ Service role key isolated to backend only
✅ Public API key for frontend only (read-only where possible)
✅ HTTPS enforced (Vercel)
✅ Environment variables not committed to repo
---
Extending the Dashboard
Add a New Metric
Create a new API endpoint in `/api/dashboard.js`
Add the metric calculation logic
Add a card in `pages/dashboard.tsx` to display it
Add a New Store
Insert into `store_master` table in Supabase
Create user in `auth_users` table
User can now login and upload
Custom Validations
Edit `supabase_edge_function.ts`
Add validation in `normalizeRecord()` function
Return errors in `result.errors` array
---
Maintenance
Backup Data
```sql
-- Export sales_master table monthly
SELECT * FROM sales_master 
WHERE transaction_date >= '2024-04-01'
ORDER BY created_at DESC;
```
Monitor Uploads
```sql
-- Check upload status
SELECT store_code, uploaded_by, upload_timestamp, status, 
       new_entries_count, discrepancy_entries_count
FROM sales_uploads_log
ORDER BY upload_timestamp DESC
LIMIT 20;
```
Clean Old Data
```sql
-- Archive uploads older than 6 months
DELETE FROM sales_uploads_log
WHERE upload_timestamp < NOW() - INTERVAL '6 months'
AND status IN ('Completed', 'Failed');
```
---
Support & Contact
For issues or questions:
Check the DEPLOYMENT_GUIDE.md
Review Supabase logs
Check Vercel deployment logs
Contact your system administrator
---
Status: ✅ Production Ready  
Last Updated: June 2026  
Version: 1.0.0
