# Onboarding Refactoring Test Plan

**Epic:** [#103](https://github.com/Cosmos-Find-me/cosmos-find-me/issues/103) - Onboarding Flow Refactoring
**Date:** 2026-01-30
**Scope:** Issues #95, #96, #97, #99, #100, #101

---

## Pre-requisites

### 1. Run Database Migration

Before testing, run the migration in your Supabase SQL Editor:

```sql
-- File: supabase/migrations/002_add_onboarding_fields.sql
-- Run the entire contents of this file
```

**Verify migration succeeded:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('profile_status', 'onboarding_completed_at');
```

Expected: Two rows showing `profile_status` (text) and `onboarding_completed_at` (timestamp with time zone).

### 2. Start Development Server

```bash
npm run dev
```

---

## Test Cases

### TC1: New User Onboarding Flow

**Scenario:** A brand new user logs in for the first time.

**Steps:**
1. Create a new user invitation from the admin panel
2. Accept the invitation and create account
3. Log in as the new user

**Expected:**
- [ ] User sees the DreamyFirstContact welcome screen (spark animation)
- [ ] Clicking the spark shows explosion animation
- [ ] User is taken to the file upload screen
- [ ] After uploading resume + career goals, company discovery runs
- [ ] User sees the graph explorer with discovered companies

**Verify in database:**
```sql
SELECT email, profile_status, onboarding_completed_at
FROM profiles
WHERE email = '<new-user-email>';
```
Expected: `profile_status = 'complete'`, `onboarding_completed_at` is set.

---

### TC2: Returning User (Already Completed Onboarding)

**Scenario:** An existing user who has already completed onboarding logs in.

**Steps:**
1. Log in as an existing user who has company data

**Expected:**
- [ ] User goes directly to the graph explorer (no onboarding)
- [ ] User's companies and preferences are loaded
- [ ] Works consistently regardless of browser/device (no localStorage dependency)

---

### TC3: Cross-Browser Consistency

**Scenario:** Verify onboarding state is consistent across browsers.

**Steps:**
1. Complete onboarding as a new user in Browser A (e.g., Chrome)
2. Log in as the same user in Browser B (e.g., Firefox or Safari)

**Expected:**
- [ ] User goes directly to graph explorer in Browser B
- [ ] No onboarding shown (state is in Supabase, not localStorage)

---

### TC4: Dev Reset via URL Parameter

**Scenario:** Developer wants to test onboarding flow again.

**Steps:**
1. Log in as any user who has completed onboarding
2. Navigate to `/?reset-onboarding=true`

**Expected:**
- [ ] Page reloads automatically
- [ ] User sees the onboarding flow (DreamyFirstContact)
- [ ] URL no longer contains `reset-onboarding` parameter

**Verify in database:**
```sql
SELECT email, profile_status, onboarding_completed_at
FROM profiles
WHERE email = '<your-email>';
```
Expected: `profile_status = 'pending'`, `onboarding_completed_at = NULL`.

---

### TC5: Admin Reset Onboarding Button

**Scenario:** Admin needs to reset onboarding for a user who is stuck.

**Steps:**
1. Log in as an admin user
2. Go to `/admin`
3. Find a user in the users list
4. Click the orange "Reset Onboarding" button (↻ icon)
5. Confirm the action in the dialog

**Expected:**
- [ ] Confirmation dialog appears with warning about data deletion
- [ ] Success message shows after reset
- [ ] User list refreshes

**Verify:**
- [ ] Target user's `profile_status` is now 'pending' in database
- [ ] Target user sees onboarding on next login

---

### TC6: Admin Import Sets Profile Complete

**Scenario:** Admin imports company data for a user.

**Steps:**
1. Log in as an admin user
2. Go to `/admin`
3. Click "Import Data" for a user
4. Upload a valid JSON file with company data
5. Click Import

**Expected:**
- [ ] Import succeeds
- [ ] User's `profile_status` is set to 'complete'
- [ ] User skips onboarding on next login

**Verify in database:**
```sql
SELECT email, profile_status, onboarding_completed_at
FROM profiles
WHERE id = '<imported-user-id>';
```

---

### TC7: Empty Cosmos State Removed

**Scenario:** User has 0 companies after onboarding.

**Steps:**
1. Complete onboarding but Perplexity returns no companies (or use reset + skip file upload)
2. Observe the resulting state

**Expected:**
- [ ] User sees the empty graph with the FAB (floating action button)
- [ ] No "EmptyCosmosState" upload screen appears
- [ ] User can add companies via FAB → "Add Company"

---

### TC8: Skip Intro for E2E Tests

**Scenario:** E2E tests need to bypass onboarding.

**Steps:**
1. Navigate to `/explorer?skip-intro=true`

**Expected:**
- [ ] Onboarding is skipped regardless of profile_status
- [ ] User goes to the graph explorer directly
- [ ] This allows E2E tests to function without onboarding

---

### TC9: View As User (Admin)

**Scenario:** Admin views another user's cosmos.

**Steps:**
1. Log in as admin
2. Click "View as User" button for a user in admin panel

**Expected:**
- [ ] New tab opens with the user's cosmos
- [ ] Purple banner shows "Viewing as: [user email]"
- [ ] User's companies and preferences are displayed

---

## Database Verification Queries

### Check all users' onboarding status
```sql
SELECT
  p.email,
  p.profile_status,
  p.onboarding_completed_at,
  CASE WHEN ucd.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_company_data
FROM profiles p
LEFT JOIN user_company_data ucd ON p.id = ucd.user_id
ORDER BY p.created_at DESC;
```

### Verify migration for existing users
```sql
-- All users with company data should have profile_status = 'complete'
SELECT p.email, p.profile_status
FROM profiles p
JOIN user_company_data ucd ON p.id = ucd.user_id
WHERE p.profile_status != 'complete';
```
Expected: No rows (all users with data should be 'complete').

---

## Rollback Plan

If issues are found, to rollback:

1. **Revert code changes** (git revert)
2. **Database columns can remain** - they won't affect the old code
3. **Or remove columns:**
```sql
ALTER TABLE profiles DROP COLUMN IF EXISTS profile_status;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_completed_at;
DROP INDEX IF EXISTS idx_profiles_profile_status;
```

---

## Sign-off

| Test Case | Tester | Date | Pass/Fail | Notes |
|-----------|--------|------|-----------|-------|
| TC1 | | | | |
| TC2 | | | | |
| TC3 | | | | |
| TC4 | | | | |
| TC5 | | | | |
| TC6 | | | | |
| TC7 | | | | |
| TC8 | | | | |
| TC9 | | | | |
