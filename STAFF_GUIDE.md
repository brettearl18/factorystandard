# Staff User Guide - Factory Standards

Welcome to the Factory Standards production tracking system! This guide will help you navigate and use all the features available to staff members.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Runs](#managing-runs)
4. [Working with the Run Board](#working-with-the-run-board)
5. [Managing Guitars](#managing-guitars)
6. [Client Management](#client-management)
7. [Adding Notes and Photos](#adding-notes-and-photos)
8. [Settings](#settings)
9. [Tips and Best Practices](#tips-and-best-practices)

---

## Getting Started

### Logging In

1. Navigate to the login page
2. Enter your staff email and password
3. Click "Sign in as Admin" or use the staff login option
4. You'll be redirected to the Dashboard upon successful login

### Navigation

The sidebar on the left provides quick access to:
- **Dashboard** - Overview of production statistics
- **Runs** - View and manage all production runs
- **Clients** - Manage client accounts and view their guitars
- **Settings** - System configuration and user management

---

## Dashboard Overview

The Dashboard provides a real-time overview of your production status.

### Key Statistics

- **Total Guitars** - Count of all guitars in the system
- **Active Runs** - Number of currently active production runs
- **In Progress** - Guitars currently being built (not in final stage)
- **Completed** - Guitars that have reached the final stage

### Dashboard Sections

1. **Active Production Runs**
   - Quick view of all active runs
   - Shows thumbnail, name, and guitar count
   - Click any run to open its board

2. **Stage Distribution**
   - Visual breakdown of guitars by production stage
   - Helps identify bottlenecks

3. **Recent Guitars**
   - Table showing the 10 most recently created guitars
   - Includes model, finish, order number, customer, and current stage
   - Click "View" to see the guitar on its run board

---

## Managing Runs

### Creating a New Run

1. Navigate to **Runs** from the sidebar
2. Click the **"Create New Run"** button (or use the button on the Dashboard)
3. Fill in the run details:
   - **Name** - Descriptive name for the run (e.g., "Q1 2025 Custom Orders")
   - **Factory** - Select the factory location (currently "Perth")
   - **Start Date** - When production begins
   - **End Date** (optional) - Expected completion date
   - **Thumbnail** (optional) - Upload an image to represent the run
4. Click **"Create Run"**

### Editing a Run

1. Go to the **Runs** page
2. Find the run you want to edit
3. Click the **"Edit"** button on the run card
4. Modify any details
5. Click **"Save Changes"**

### Archiving a Run

- **To Archive**: Click the **"Archive"** button on a run card
- **To Unarchive**: Toggle "Show Archived" and click **"Unarchive"** on archived runs
- Archived runs are hidden by default but can be viewed when needed

### Viewing Runs

- **Active Runs**: Shown by default on the Runs page
- **Archived Runs**: Click "Show Archived" to view completed/archived runs
- Click any run card to open its **Run Board**

---

## Working with the Run Board

The Run Board is a Kanban-style interface for tracking guitars through production stages.

### Understanding the Board

- **Columns** represent production stages (e.g., "Design", "Body", "Neck", "Assembly", "Finishing")
- **Cards** represent individual guitars
- Each card shows:
  - Guitar model
  - Finish
  - Order number
  - Customer name
  - Thumbnail (if available)

### Moving Guitars Between Stages

**Method 1: Drag and Drop**
1. Click and hold a guitar card
2. Drag it to the target stage column
3. Release to drop
4. A note drawer will appear (see [Adding Notes and Photos](#adding-notes-and-photos))

**Method 2: Using the Guitar Detail Modal**
1. Click on a guitar card to open details
2. Use the stage selector to change stages
3. Add notes/photos if needed

### Adding Guitars to a Run

1. Open the Run Board for the desired run
2. Click the **"Add Guitar"** button (usually at the top or in the first stage)
3. Fill in guitar details:
   - **Model** - Guitar model name
   - **Finish** - Finish description
   - **Order Number** - Customer order reference
   - **Customer Name** - Client name
   - **Client** - Select from existing clients (optional)
   - **Initial Stage** - Starting production stage
   - **Reference Images** (optional) - Upload photos
4. Click **"Add Guitar"**

### Viewing Guitar Details

- Click any guitar card on the board to open the detail modal
- The modal shows:
  - Full guitar specifications
  - Production timeline
  - All notes and photos
  - Current stage information
  - Client information (if assigned)

---

## Managing Guitars

### Editing Guitar Information

1. Open the guitar detail modal (click the guitar card)
2. Click **"Edit Guitar"**
3. Modify any fields:
   - Model, finish, order number
   - Customer information
   - Client assignment
   - Reference images
4. Click **"Save Changes"**

### Archiving Guitars

1. Open the guitar detail modal
2. Click **"Archive Guitar"**
3. Confirm the action
4. Archived guitars are hidden from active views but can be restored

### Adding Notes to Guitars

See the [Adding Notes and Photos](#adding-notes-and-photos) section below.

---

## Client Management

### Viewing All Clients

1. Navigate to **Clients** from the sidebar
2. View clients in either:
   - **Table View** - Sortable table with all client and guitar information
   - **Card View** - Visual cards showing client summary

### Searching Clients

- Use the search bar to find clients by:
  - Name
  - Email
  - Phone number
  - Address
  - Guitar model/finish/order number

### Adding a New Client

1. Go to the **Clients** page
2. Click **"Add Client"**
3. Fill in client information:
   - **Email** - Client's email address (required)
   - **Display Name** - Client's full name
   - **Phone** - Contact number
   - **Shipping Address** - Complete address details
4. Click **"Create Client"**
5. The system will create a user account and send login credentials

### Viewing Client Details

1. Click on any client (in table or card view)
2. View:
   - Contact information
   - All guitars assigned to the client
   - Guitar build progress
   - Invoices and payments
   - Client activity history

### Managing Client Guitars

From the client detail page:
- View all guitars assigned to the client
- See current production stage for each guitar
- Access guitar details and notes
- Assign new guitars to the client

---

## Adding Notes and Photos

### When Moving Guitars Between Stages

When you drag and drop a guitar to a new stage, a note drawer automatically opens:

1. **Add a Message** (optional, unless stage requires notes):
   - Type your update message
   - Select note type: Update, Issue, Quality Check, or General

2. **Add Photos** (optional):
   - **Upload Files**: Click "Choose Files" and select images from your device
   - **Add Google Drive Links**: Paste Google Drive folder or file links
   - You can add multiple photos using both methods

3. **Visibility Settings**:
   - Check "Visible to Client" if the client should see this update
   - Uncheck for internal-only notes

4. **Submit**:
   - Click "Add Note" to save and move the guitar
   - Click "Skip" to move without adding a note (if allowed)

### Adding Notes Without Moving Stages

1. Open the guitar detail modal
2. Click **"Add Note"**
3. Fill in the note form (same as above)
4. The guitar stays in its current stage

### Note Types

- **Update** - General progress update
- **Issue** - Problem or concern that needs attention
- **Quality Check** - Quality inspection notes
- **General** - Any other type of note

### Photo Guidelines

- **File Uploads**: Supports common image formats (JPG, PNG, etc.)
- **Google Drive**: Paste full folder or file share links
- Photos are stored and accessible in the guitar's timeline
- Clients can view photos marked as "Visible to Client"

---

## Settings

### Accessing Settings

Navigate to **Settings** from the sidebar.

### Available Settings

1. **User Management** (Admin only)
   - View all users
   - Set user roles (staff, admin, client)
   - Manage user accounts

2. **System Configuration**
   - Company branding
   - Production stage templates
   - Notification settings

3. **Client Settings**
   - Default client configurations
   - Client notification preferences

---

## Tips and Best Practices

### Production Workflow

1. **Start with a Run**: Create a production run before adding guitars
2. **Add Guitars Early**: Add all guitars to a run at the start
3. **Update Regularly**: Move guitars and add notes as work progresses
4. **Use Photos**: Document progress with photos at each stage
5. **Client Communication**: Mark important updates as "Visible to Client"

### Stage Management

- Stages are defined per run, allowing flexibility
- Some stages can be marked to require notes when moving guitars
- Final stages typically indicate completion

### Client Visibility

- Use "Visible to Client" for updates clients should see
- Keep internal notes private for quality control or issues
- Clients receive notifications for visible updates

### Notifications

- Staff receive notifications when:
  - Guitars move between stages
  - Notes are added to guitars
  - Clients are assigned to guitars
- Notifications appear in the notification bell icon

### Keyboard Shortcuts

- **Escape** - Close modals and drawers
- **Click outside** - Close modals (where supported)

### Mobile Usage

- The system is responsive and works on tablets
- Use the mobile menu (hamburger icon) on smaller screens
- Drag and drop works on touch devices

### Troubleshooting

**Can't move a guitar?**
- Check if the stage requires a note (you may need to add one)
- Ensure you have proper permissions
- Try refreshing the page

**Photos not uploading?**
- Check file size (large files may take time)
- Verify internet connection
- Try using Google Drive links as an alternative

**Can't see a client's guitars?**
- Verify the guitar is assigned to the client
- Check if the guitar is archived
- Ensure you're viewing the correct client

---

## Quick Reference

### Common Tasks

| Task | Steps |
|------|-------|
| Create a new run | Runs → Create New Run → Fill details → Create |
| Add guitar to run | Open Run Board → Add Guitar → Fill details → Add |
| Move guitar stage | Drag card to new column OR Open details → Change stage |
| Add note with photo | Move guitar OR Open details → Add Note → Upload/Add link → Submit |
| View client guitars | Clients → Click client → View guitars section |
| Archive a run | Runs → Find run → Click Archive |
| Search clients | Clients → Use search bar → Filter results |

### Important Pages

- `/dashboard` - Production overview
- `/runs` - All production runs
- `/runs/[runId]/board` - Kanban board for a specific run
- `/clients` - Client management
- `/settings` - System settings

---

## Need Help?

If you encounter issues or have questions:
1. Check this guide first
2. Contact your system administrator
3. Review the notification center for system messages

---

**Last Updated**: 2025
**Version**: 1.0

