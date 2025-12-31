/**
 * Video Upload E2E Tests (Playwright)
 *
 * End-to-end tests for video upload functionality:
 * - Free user sees upgrade prompt
 * - Pro user can upload videos
 * - Pro user at storage limit sees error
 * - Video file size limit enforced
 * - Videos appear in feed after upload
 */

import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Helper to create mock video file
async function createMockVideo(page: Page, filename: string, sizeInMB: number) {
  // Create a temporary video file for testing
  const videoBuffer = Buffer.alloc(sizeInMB * 1024 * 1024, 'a')
  return {
    name: filename,
    mimeType: 'video/mp4',
    buffer: videoBuffer,
  }
}

test.describe('Video Upload - Free User', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for free user
    await page.route('**/api/upload-video', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            allowed: false,
            isProUser: false,
            currentStorageGB: 0,
            limitGB: 0,
            remainingGB: 0,
            reason:
              'Video uploads are a Pro feature. Upgrade to Pro to upload videos (10GB storage).',
          }),
        })
      }
    })
  })

  test('shows upgrade prompt for free users', async ({ page }) => {
    // Navigate to trip page (assuming trip-1 exists)
    await page.goto('/trips/trip-1')

    // Click on Feed tab or navigate to feed
    await page.click('text=Feed')

    // Wait for video upload component to load
    await page.waitForSelector('text=Video uploads are a Pro feature')

    // Verify upgrade prompt is displayed
    await expect(page.locator('text=Video uploads are a Pro feature')).toBeVisible()
    await expect(page.locator('text=Upgrade to Pro to upload videos (10GB storage)')).toBeVisible()
    await expect(page.locator('button:has-text("Upgrade Now")')).toBeVisible()
  })

  test('shows upgrade dialog when free user clicks Select Videos', async ({ page }) => {
    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    // Click "Upgrade to Pro" button (shown instead of "Select Videos" for free users)
    await page.click('button:has-text("Upgrade to Pro")')

    // Verify upgrade dialog appears
    await expect(page.locator('text=Upgrade to Pro for Video Uploads')).toBeVisible()
    await expect(page.locator('text=10GB video storage')).toBeVisible()
    await expect(page.locator('button:has-text("Upgrade to Pro"):last-of-type')).toBeVisible()
  })

  test('blocks free users from uploading videos', async ({ page }) => {
    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    // Verify file input is disabled for free users
    const fileInput = page.locator('input[type="file"][accept*="video"]')
    await expect(fileInput).toBeDisabled()
  })
})

test.describe('Video Upload - Pro User', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for Pro user with available storage
    await page.route('**/api/upload-video', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            allowed: true,
            isProUser: true,
            currentStorageGB: 2.5,
            limitGB: 10,
            remainingGB: 7.5,
          }),
        })
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            media: {
              id: 'media-1',
              type: 'video',
              url: 'https://storage.example.com/video.mp4',
            },
            storageInfo: {
              currentStorageGB: 2.55,
              limitGB: 10,
              remainingGB: 7.45,
            },
          }),
        })
      }
    })
  })

  test('shows storage usage for Pro users', async ({ page }) => {
    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    // Verify storage info is displayed
    await expect(page.locator('text=Video storage: 2.50 GB / 10 GB used')).toBeVisible()
    await expect(page.locator('text=7.50 GB remaining')).toBeVisible()
  })

  test('allows Pro users to select video files', async ({ page }) => {
    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    // Verify upload UI for Pro users
    await expect(page.locator('text=Drop videos here or click to upload')).toBeVisible()
    await expect(page.locator('button:has-text("Select Videos")')).toBeVisible()

    // Verify file input is enabled
    const fileInput = page.locator('input[type="file"][accept*="video"]')
    await expect(fileInput).not.toBeDisabled()
  })

  test('successfully uploads video', async ({ page }) => {
    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    // Select a video file
    const fileInput = page.locator('input[type="file"][accept*="video"]')

    // Create a mock video file (50MB)
    const videoFile = await createMockVideo(page, 'test-video.mp4', 50)

    await fileInput.setInputFiles({
      name: videoFile.name,
      mimeType: videoFile.mimeType,
      buffer: videoFile.buffer,
    })

    // Verify video preview appears
    await expect(page.locator('text=1 video(s) ready to upload')).toBeVisible()
    await expect(page.locator('text=test-video.mp4')).toBeVisible()
    await expect(page.locator('text=50.00 MB')).toBeVisible()

    // Add optional caption
    await page.fill('input[placeholder="Add caption (optional)"]', 'Amazing sunset')

    // Click upload button
    await page.click('button:has-text("Upload 1 Video")')

    // Verify upload progress
    await expect(page.locator('text=Uploading...')).toBeVisible()

    // Verify upload completes
    await expect(page.locator('text=Uploading...')).not.toBeVisible({ timeout: 10000 })

    // Verify storage usage updated
    await expect(page.locator('text=2.55 GB / 10 GB used')).toBeVisible()
  })

  test('displays uploaded video in feed', async ({ page }) => {
    // Mock media files API to include the uploaded video
    await page.route('**/api/media/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'media-1',
            type: 'video',
            url: 'https://storage.example.com/video.mp4',
            file_size_bytes: 50 * 1024 * 1024,
            caption: 'Amazing sunset',
            date_taken: '2025-01-15T10:00:00Z',
            user: {
              id: 'user-1',
              full_name: 'John Doe',
              avatar_url: null,
            },
          },
        ]),
      })
    })

    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    // Verify video appears in feed
    await expect(page.locator('video[src*="video.mp4"]')).toBeVisible()
    await expect(page.locator('text=Amazing sunset')).toBeVisible()
    await expect(page.locator('text=50.00 MB')).toBeVisible()

    // Verify video has controls
    const video = page.locator('video[src*="video.mp4"]')
    await expect(video).toHaveAttribute('controls', '')
  })

  test('allows multiple video uploads', async ({ page }) => {
    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    const fileInput = page.locator('input[type="file"][accept*="video"]')

    // Select multiple videos
    const video1 = await createMockVideo(page, 'video1.mp4', 30)
    const video2 = await createMockVideo(page, 'video2.webm', 40)

    await fileInput.setInputFiles([
      {
        name: video1.name,
        mimeType: video1.mimeType,
        buffer: video1.buffer,
      },
      {
        name: video2.name,
        mimeType: 'video/webm',
        buffer: video2.buffer,
      },
    ])

    // Verify both videos appear
    await expect(page.locator('text=2 video(s) ready to upload')).toBeVisible()
    await expect(page.locator('text=video1.mp4')).toBeVisible()
    await expect(page.locator('text=video2.webm')).toBeVisible()
  })
})

test.describe('Video Upload - Storage Limit Enforcement', () => {
  test('shows warning when storage is low (<1GB remaining)', async ({ page }) => {
    await page.route('**/api/upload-video', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            allowed: true,
            isProUser: true,
            currentStorageGB: 9.2,
            limitGB: 10,
            remainingGB: 0.8,
          }),
        })
      }
    })

    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    // Verify low storage warning
    await expect(page.locator('text=Running low on video storage')).toBeVisible()
    await expect(page.locator('text=0.80 GB remaining')).toBeVisible()
  })

  test('disables upload when Pro user reaches 10GB storage limit', async ({ page }) => {
    await page.route('**/api/upload-video', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            allowed: false,
            isProUser: true,
            currentStorageGB: 10,
            limitGB: 10,
            remainingGB: 0,
          }),
        })
      }
    })

    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    // Verify storage limit reached message
    await expect(page.locator('text=Video storage limit reached')).toBeVisible()
    await expect(page.locator("text=You've used all 10 GB of your Pro tier storage")).toBeVisible()

    // Verify upload is disabled
    const selectButton = page.locator('button:has-text("Select Videos")')
    await expect(selectButton).toBeDisabled()
  })

  test('shows error when uploading would exceed storage limit', async ({ page }) => {
    await page.route('**/api/upload-video', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            allowed: true,
            isProUser: true,
            currentStorageGB: 9.9,
            limitGB: 10,
            remainingGB: 0.1,
          }),
        })
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Video upload limit reached',
            message:
              "You've reached your 10GB video storage limit. Delete some videos or contact support.",
          }),
        })
      }
    })

    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    const fileInput = page.locator('input[type="file"][accept*="video"]')
    const largeVideo = await createMockVideo(page, 'large-video.mp4', 200) // 200MB

    await fileInput.setInputFiles({
      name: largeVideo.name,
      mimeType: largeVideo.mimeType,
      buffer: largeVideo.buffer,
    })

    await page.click('button:has-text("Upload 1 Video")')

    // Verify error message
    await expect(page.locator("text=You've reached your 10GB video storage limit")).toBeVisible()
  })
})

test.describe('Video Upload - File Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/upload-video', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            allowed: true,
            isProUser: true,
            currentStorageGB: 2.5,
            limitGB: 10,
            remainingGB: 7.5,
          }),
        })
      }
    })
  })

  test('rejects video files larger than 100MB', async ({ page }) => {
    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    const fileInput = page.locator('input[type="file"][accept*="video"]')
    const largeVideo = await createMockVideo(page, 'huge-video.mp4', 150) // 150MB

    await fileInput.setInputFiles({
      name: largeVideo.name,
      mimeType: largeVideo.mimeType,
      buffer: largeVideo.buffer,
    })

    // Verify error message
    await expect(page.locator('text=File size exceeds 100MB limit')).toBeVisible()
    await expect(page.locator('text=huge-video.mp4')).toBeVisible()
  })

  test('rejects invalid video formats', async ({ page }) => {
    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    const fileInput = page.locator('input[type="file"][accept*="video"]')
    const invalidVideo = await createMockVideo(page, 'invalid.avi', 50)

    await fileInput.setInputFiles({
      name: invalidVideo.name,
      mimeType: 'video/avi', // Invalid format
      buffer: invalidVideo.buffer,
    })

    // Verify error message
    await expect(page.locator('text=Invalid file type: invalid.avi')).toBeVisible()
    await expect(page.locator('text=Supported formats: MP4, WebM, MOV, QuickTime')).toBeVisible()
  })

  test('accepts valid video formats (MP4, WebM, MOV)', async ({ page }) => {
    await page.goto('/trips/trip-1')
    await page.click('text=Feed')

    const fileInput = page.locator('input[type="file"][accept*="video"]')

    // Test MP4
    const mp4Video = await createMockVideo(page, 'test.mp4', 50)
    await fileInput.setInputFiles({
      name: mp4Video.name,
      mimeType: 'video/mp4',
      buffer: mp4Video.buffer,
    })
    await expect(page.locator('text=test.mp4')).toBeVisible()

    // Clear and test WebM
    await page.reload()
    await page.click('text=Feed')
    const webmVideo = await createMockVideo(page, 'test.webm', 50)
    await page.locator('input[type="file"][accept*="video"]').setInputFiles({
      name: webmVideo.name,
      mimeType: 'video/webm',
      buffer: webmVideo.buffer,
    })
    await expect(page.locator('text=test.webm')).toBeVisible()
  })
})
