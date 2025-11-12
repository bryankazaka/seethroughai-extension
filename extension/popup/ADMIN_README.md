# Admin Dashboard

The SeeThroughAI Admin Dashboard provides system-wide analytics and user management for administrators.

## Access Requirements

To access the admin dashboard, users must have admin privileges set in Firebase. This requires:

1. Firebase custom claims set on the user account
2. Admin role in Firestore (`users/{userId}/role = 'admin'`)

## Features

### System Statistics
- **Total Users**: Count of all registered users
- **Total Detections**: All-time detection count
- **AI Percentage**: Percentage of content classified as AI
- **Active Users**: Users active in the last 30 days

### Data Visualization
- **Detection Trends Chart**: 30-day line chart showing daily detection volume
- **Classification Distribution**: Doughnut chart showing breakdown by classification type

### User Management
- **Recent Detections Table**: 
  - Paginated view of latest detections
  - Filter by classification type
  - View user details and image URLs
  
- **Top Users Table**:
  - Ranked by detection count
  - Shows user details and last activity
  - Quick access to user profiles

- **User Search**:
  - Search by email or user ID
  - Detailed user profile view
  - Detection history access

### Data Export
Export all dashboard data to JSON for external analysis or reporting.

## Usage

### Opening the Dashboard

**Option 1: Context Menu**
- Right-click anywhere on a page
- Select "SeeThroughAI Settings" → Navigate to admin section

**Option 2: Direct URL**
```
chrome-extension://[extension-id]/popup/admin.html
```

**Option 3: From Settings Page**
- Open Settings
- If admin user, admin link will be visible

### Navigation

The dashboard automatically refreshes stats every 30 seconds to show real-time data.

**Tabs and Sections:**
1. **System Overview**: Cards showing key metrics
2. **Charts**: Visual trends and distributions
3. **Recent Activity**: Latest detections with filtering
4. **Top Users**: Most active users
5. **Search**: Find specific users

### Setting Admin Privileges

To grant admin access, use Firebase Functions:

```javascript
// functions/index.js
const admin = require('firebase-admin');

exports.setAdminRole = functions.https.onCall(async (data, context) => {
  // Verify requester is already admin
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can grant admin privileges'
    );
  }
  
  const { email } = data;
  
  // Get user by email
  const user = await admin.auth().getUserByEmail(email);
  
  // Set custom claims
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  
  // Update Firestore
  await admin.firestore().collection('users').doc(user.uid).update({
    role: 'admin'
  });
  
  return { success: true };
});
```

## API Integration

The dashboard uses these admin service functions:

- `isAdmin(userId)` - Check admin status
- `getSystemStats()` - Retrieve system-wide metrics
- `getRecentDetections(limit, lastVisible, classification)` - Get recent activity
- `getTopUsers(limit)` - Get most active users
- `getDetectionTrends(days)` - Get daily detection counts
- `getClassificationDistribution()` - Get classification breakdown
- `getUserDetails(emailOrId)` - Get user profile and stats

## Security

The dashboard implements multiple security layers:

1. **Client-side check**: Verifies admin status before displaying content
2. **Firestore rules**: Enforces admin access at the database level
3. **Custom claims**: Firebase Auth custom claims for role verification

If a non-admin user attempts to access the dashboard, they see an "Access Denied" screen.

## Troubleshooting

### "Access Denied" Error
- Verify user has admin custom claims in Firebase Auth
- Check `users/{userId}/role` field in Firestore equals `'admin'`
- Sign out and sign back in to refresh token claims

### Dashboard Not Loading
- Check browser console for errors
- Verify Firebase connection (emulator or production)
- Ensure all admin-service.js functions are working

### Charts Not Rendering
- Verify Chart.js CDN is loaded (check Network tab)
- Check for JavaScript errors in console
- Ensure data is being fetched correctly

### Missing Data
- Verify Firebase indexes are created (firestore.indexes.json)
- Check Firestore security rules allow admin read access
- Ensure emulator is running (if in development)

## Development

To test the admin dashboard locally:

```bash
# Start Firebase emulators
npm run emulators

# In another terminal, seed test data
npm run seed-data

# Load unpacked extension in Chrome
# Navigate to chrome://extensions
# Load extension folder
```

The seed script creates test users including an admin user.

## Performance

- Dashboard auto-refreshes every 30 seconds
- Pagination limits: 20 items per page for detections
- Charts cache data for smooth rendering
- User search is debounced to prevent excessive queries

## Future Enhancements

Potential improvements:
- [ ] Date range selector for trends
- [ ] Export to CSV/Excel
- [ ] Advanced filtering options
- [ ] User suspension/ban functionality
- [ ] Bulk operations on detections
- [ ] Real-time updates with Firebase listeners
- [ ] Custom alert configuration
- [ ] Email reports

---

For more information, see the main [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md).
