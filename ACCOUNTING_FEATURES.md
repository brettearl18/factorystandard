# Accounting & Finance Portal

## Overview

The Accounting portal provides comprehensive financial management capabilities for the `accounting` user role. This portal allows accounting staff to view, manage, and report on all invoices and payments across all clients.

## Features

### 1. **Financial Dashboard**
- **Total Revenue**: Sum of all invoice amounts
- **Outstanding Balance**: Total unpaid/partial invoices
- **Total Paid**: Sum of all paid invoices
- **Overdue Count**: Number of invoices past due date
- Real-time updates as invoices and payments are recorded

### 2. **All Invoices View**
- View all invoices across all clients in one place
- See client information (name, email) for each invoice
- View invoice status, amounts, payments, and outstanding balances
- Sortable table with key financial information

### 3. **Advanced Filtering**
- **Search**: Search by invoice title, client name, client email, invoice ID, or description
- **Status Filter**: Filter by pending, paid, partial, or overdue
- **Date Range**: Filter invoices by creation date (from/to dates)
- All filters work together for precise data views

### 4. **Payment Recording**
- Record payments for any invoice from any client
- Support for multiple payment methods:
  - Bank Transfer
  - Credit Card
  - PayPal
  - Stripe
  - Cash
  - Check
  - Other
- Set custom payment dates (defaults to today)
- Add payment notes/references
- Automatic invoice status updates (paid/partial/pending)

### 5. **CSV Export**
- Export filtered invoice data to CSV
- Includes all key fields:
  - Invoice ID, Client UID, Client Name, Client Email
  - Title, Amount, Currency, Status
  - Due Date, Total Paid, Outstanding
  - Payment Count, Created Date
- Perfect for importing into accounting software or Excel

### 6. **Financial Reports**
The dashboard automatically calculates:
- Total revenue across all invoices
- Outstanding amounts (unpaid invoices)
- Total paid amounts
- Overdue invoice count
- Pending invoice count
- Paid invoice count

## User Role Setup

To grant accounting access to a user:

1. **Via Cloud Function** (recommended):
   ```bash
   # Use the setUserRole function from the admin panel
   # Or via Firebase Console → Authentication → Users → Set Custom Claims
   ```

2. **Via Script**:
   ```bash
   npx ts-node scripts/set-user-role.ts accounts@ormsbyguitars.com accounting
   ```

3. **User must sign out and sign back in** for the role to take effect.

## Access Control

- **Accounting Role**: Full access to accounting portal, can view all invoices and record payments
- **Admin Role**: Also has access to accounting portal
- **Other Roles**: No access to accounting portal

## Firestore Rules

The accounting role has been added to Firestore security rules:
- Can read all invoices across all clients
- Can write/update invoices (for payment recording)
- Uses collectionGroup queries to efficiently fetch all invoices

## Navigation

Accounting users are automatically redirected to `/accounting` when they log in.

The sidebar shows:
- **Accounting** link (main dashboard)

## Data Structure

### InvoiceWithClient
Extends `InvoiceRecord` with:
- `clientUid`: The client's Firebase UID
- `clientName`: Client's display name (if available)
- `clientEmail`: Client's email (if available)

### Collection Group Query
Uses Firestore's `collectionGroup` to query all invoices across all clients:
```
clients/{clientUid}/invoices/{invoiceId}
```

This allows efficient querying without needing to iterate through all clients.

## Future Enhancements

Potential additions:
- **Payment Reconciliation**: Match payments to invoices automatically
- **Aging Reports**: Show invoices by age (30, 60, 90+ days)
- **Client Financial Summaries**: Per-client financial overview
- **Tax Reports**: Generate tax-ready reports
- **Recurring Invoices**: Support for subscription/recurring billing
- **Payment Reminders**: Automated overdue invoice notifications
- **Multi-Currency Support**: Better handling of different currencies
- **Payment Method Analytics**: Track which payment methods are most used
- **Revenue Trends**: Charts showing revenue over time
- **Export to PDF**: Generate PDF reports

## Security Notes

- All invoice data is protected by Firestore security rules
- Only accounting and admin roles can access the accounting portal
- Payment recording requires authentication
- All actions are logged with user information

## Cost Optimization

- Uses collectionGroup queries (efficient for cross-client queries)
- Limits invoice queries to 500 most recent (configurable)
- Real-time subscriptions only when needed
- CSV export is client-side (no server processing)

---

**Last Updated**: November 23, 2025


