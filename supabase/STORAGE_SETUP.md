# Trip Media Storage Bucket Setup

Since storage policies require superuser permissions, we'll set up the `trip-media` bucket via the Supabase Dashboard UI.

## Step 1: Create the Bucket

1. Go to **Storage** in your Supabase Dashboard
2. Click **"New bucket"**
3. Configure:
   - **Name:** `trip-media`
   - **Public bucket:** ✅ Enabled (for easy image serving)
   - **File size limit:** 10 MB
   - **Allowed MIME types:**
     - `image/jpeg`
     - `image/png`
     - `image/webp`
     - `image/heic`
     - `image/heif`
     - `video/mp4`
     - `video/quicktime`

## Step 2: Set Up RLS Policies

Go to **Storage** → **Policies** → Select `trip-media` bucket → **New Policy**

### Policy 1: Trip participants can upload media

- **Policy name:** `Trip participants can upload media`
- **Allowed operation:** INSERT
- **Target roles:** authenticated
- **WITH CHECK expression:**

```sql
bucket_id = 'trip-media'
AND (storage.foldername(name))[1]::uuid IN (
  SELECT trip_id
  FROM public.trip_participants
  WHERE user_id = auth.uid()
)
```

### Policy 2: Trip participants can view media

- **Policy name:** `Trip participants can view media`
- **Allowed operation:** SELECT
- **Target roles:** authenticated
- **USING expression:**

```sql
bucket_id = 'trip-media'
AND (storage.foldername(name))[1]::uuid IN (
  SELECT trip_id
  FROM public.trip_participants
  WHERE user_id = auth.uid()
)
```

### Policy 3: Users can delete their own media or owners can delete any

- **Policy name:** `Users can delete their own media or owners can delete any`
- **Allowed operation:** DELETE
- **Target roles:** authenticated
- **USING expression:**

```sql
bucket_id = 'trip-media'
AND (
  owner = auth.uid()
  OR
  (storage.foldername(name))[1]::uuid IN (
    SELECT trip_id
    FROM public.trip_participants
    WHERE user_id = auth.uid()
    AND role = 'owner'
  )
)
```

### Policy 4: Users can update their own media

- **Policy name:** `Users can update their own media`
- **Allowed operation:** UPDATE
- **Target roles:** authenticated
- **USING expression:**

```sql
bucket_id = 'trip-media' AND owner = auth.uid()
```

- **WITH CHECK expression:**

```sql
bucket_id = 'trip-media' AND owner = auth.uid()
```

## File Storage Structure

Files will be stored in the following structure:

```
trip-media/
  {trip_id}/
    {user_id}/
      {timestamp}-{filename}.jpg          (full size)
      thumbnails/{timestamp}-{filename}.jpg  (thumbnail)
```

Example:

```
trip-media/
  550e8400-e29b-41d4-a716-446655440000/
    7c9e6679-7425-40de-944b-e07fc1f90ae7/
      1699564800000-beach-sunset.jpg
      thumbnails/1699564800000-beach-sunset.jpg
```

## Verification

After setup, verify the bucket and policies work:

1. Test upload via the Storage UI
2. Check that policies correctly restrict access
3. Verify file size limits are enforced
