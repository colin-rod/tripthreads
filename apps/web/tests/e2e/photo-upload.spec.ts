/**
 * E2E tests for photo upload flow
 *
 * NOTE: These tests should run in CI/CD only, not locally
 * Local development should focus on unit and component tests
 */

import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Photo Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a trip
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')

    // Wait for redirect to trips page
    await page.waitForURL('/trips')

    // Click on first trip
    await page.click('[data-testid="trip-card"]:first-child')

    // Navigate to Feed tab
    await page.click('[data-testid="tab-feed"]')
  })

  test('should upload a photo with drag and drop', async ({ page }) => {
    const testImagePath = path.join(__dirname, '../fixtures/test-photo.jpg')

    // Create a file input
    const fileInput = page.locator('input[type="file"][accept="image/*"]')

    // Upload file
    await fileInput.setInputFiles(testImagePath)

    // Wait for preview to appear
    await expect(page.locator('[data-testid="photo-preview"]')).toBeVisible()
    await expect(page.getByText('test-photo.jpg')).toBeVisible()

    // Add caption
    await page.fill('[placeholder*="caption"]', 'Beautiful sunset at the beach')

    // Click upload button
    await page.click('button:has-text("Upload")')

    // Wait for upload to complete
    await expect(page.locator('text="Uploading"')).toBeVisible()
    await expect(page.locator('text="Uploading"')).not.toBeVisible({ timeout: 30000 })

    // Verify photo appears in gallery
    await expect(page.getByAltText('Beautiful sunset at the beach')).toBeVisible()
  })

  test('should upload multiple photos', async ({ page }) => {
    const testImages = [
      path.join(__dirname, '../fixtures/test-photo-1.jpg'),
      path.join(__dirname, '../fixtures/test-photo-2.jpg'),
      path.join(__dirname, '../fixtures/test-photo-3.jpg'),
    ]

    const fileInput = page.locator('input[type="file"][accept="image/*"]')
    await fileInput.setInputFiles(testImages)

    // Wait for all previews
    await expect(page.locator('[data-testid="photo-preview"]')).toHaveCount(3)

    // Upload all
    await page.click('button:has-text("Upload 3 Photos")')

    // Wait for completion
    await expect(page.locator('text="100%"')).toBeVisible({ timeout: 60000 })

    // Verify all photos in gallery
    await expect(page.locator('[role="img"]')).toHaveCount(3, { timeout: 10000 })
  })

  test('should show progress indicator during upload', async ({ page }) => {
    const testImagePath = path.join(__dirname, '../fixtures/large-photo.jpg')

    const fileInput = page.locator('input[type="file"][accept="image/*"]')
    await fileInput.setInputFiles(testImagePath)

    await page.click('button:has-text("Upload")')

    // Progress bar should be visible
    await expect(page.locator('[role="progressbar"]')).toBeVisible()

    // Should show percentage
    await expect(page.locator('text=/%/')).toBeVisible()

    // Wait for completion
    await expect(page.locator('[role="progressbar"]')).not.toBeVisible({ timeout: 30000 })
  })

  test('should validate file type', async ({ page }) => {
    const invalidFile = path.join(__dirname, '../fixtures/document.pdf')

    const fileInput = page.locator('input[type="file"][accept="image/*"]')
    await fileInput.setInputFiles(invalidFile)

    // Should show error
    await expect(page.getByText(/invalid file type/i)).toBeVisible()

    // Upload button should not appear
    await expect(page.locator('button:has-text("Upload")')).not.toBeVisible()
  })

  test('should validate file size (10MB limit)', async ({ page }) => {
    const largeFile = path.join(__dirname, '../fixtures/huge-photo.jpg') // >10MB

    const fileInput = page.locator('input[type="file"][accept="image/*"]')
    await fileInput.setInputFiles(largeFile)

    // Should show error
    await expect(page.getByText(/file size exceeds 10mb/i)).toBeVisible()
  })

  test('should remove photo from preview', async ({ page }) => {
    const testImagePath = path.join(__dirname, '../fixtures/test-photo.jpg')

    const fileInput = page.locator('input[type="file"][accept="image/*"]')
    await fileInput.setInputFiles(testImagePath)

    await expect(page.locator('[data-testid="photo-preview"]')).toBeVisible()

    // Click remove button
    await page.click('[aria-label*="Remove"]')

    // Preview should be gone
    await expect(page.locator('[data-testid="photo-preview"]')).not.toBeVisible()
  })

  test('should show free tier warning at 20/25 photos', async ({ page }) => {
    // Simulate user with 20 photos already uploaded
    // (This would require seeding the database with 20 photos)

    await page.goto('/api/upload-photo?tripId=test-trip-id')

    await expect(page.getByText(/5 photos remaining/i)).toBeVisible()
    await expect(page.getByText(/upgrade to pro/i)).toBeVisible()
  })

  test('should block uploads at 25/25 photos (free tier)', async ({ page }) => {
    // Simulate user with 25 photos already uploaded
    // (This would require seeding the database with 25 photos)

    await expect(page.getByText(/photo limit reached/i)).toBeVisible()
    await expect(page.getByText(/upgrade to pro/i)).toBeVisible()

    // Upload button should be disabled
    const uploadButton = page.locator('button:has-text("Upload Photo")')
    await expect(uploadButton).toBeDisabled()
  })

  test('should clear all photos from preview', async ({ page }) => {
    const testImages = [
      path.join(__dirname, '../fixtures/test-photo-1.jpg'),
      path.join(__dirname, '../fixtures/test-photo-2.jpg'),
    ]

    const fileInput = page.locator('input[type="file"][accept="image/*"]')
    await fileInput.setInputFiles(testImages)

    await expect(page.locator('[data-testid="photo-preview"]')).toHaveCount(2)

    // Click clear all
    await page.click('button:has-text("Clear All")')

    // All previews should be gone
    await expect(page.locator('[data-testid="photo-preview"]')).toHaveCount(0)
  })
})

test.describe('Photo Gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    await page.waitForURL('/trips')
    await page.click('[data-testid="trip-card"]:first-child')
    await page.click('[data-testid="tab-feed"]')
  })

  test('should display photos grouped by date', async ({ page }) => {
    // Assumes photos are already uploaded for this trip

    // Should show date headers
    await expect(page.locator('text=/Monday, January/')).toBeVisible()
    await expect(page.locator('text=/photos?/')).toBeVisible()
  })

  test('should open lightbox when photo clicked', async ({ page }) => {
    // Click on first photo
    await page.click('[data-testid="photo-card"]:first-child')

    // Lightbox should open
    await expect(page.locator('[data-testid="photo-lightbox"]')).toBeVisible()

    // Should show navigation controls
    await expect(page.locator('[aria-label="Previous photo"]')).toBeVisible()
    await expect(page.locator('[aria-label="Next photo"]')).toBeVisible()
    await expect(page.locator('[aria-label="Close"]')).toBeVisible()
  })

  test('should navigate photos with arrow keys', async ({ page }) => {
    await page.click('[data-testid="photo-card"]:first-child')

    // Should show 1 / N
    await expect(page.locator('text=/1 \\/ \\d+/')).toBeVisible()

    // Press right arrow
    await page.keyboard.press('ArrowRight')

    // Should show 2 / N
    await expect(page.locator('text=/2 \\/ \\d+/')).toBeVisible()

    // Press left arrow
    await page.keyboard.press('ArrowLeft')

    // Should show 1 / N
    await expect(page.locator('text=/1 \\/ \\d+/')).toBeVisible()
  })

  test('should close lightbox with Escape key', async ({ page }) => {
    await page.click('[data-testid="photo-card"]:first-child')
    await expect(page.locator('[data-testid="photo-lightbox"]')).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.locator('[data-testid="photo-lightbox"]')).not.toBeVisible()
  })

  test('should edit photo caption and date', async ({ page }) => {
    // Open lightbox
    await page.click('[data-testid="photo-card"]:first-child')

    // Click edit button
    await page.click('[aria-label*="Edit"]')

    // Edit caption
    const captionInput = page.locator('[placeholder*="caption"]')
    await captionInput.fill('Updated caption for the beach photo')

    // Change date
    const dateInput = page.locator('input[type="date"]')
    await dateInput.fill('2025-01-20')

    // Save
    await page.click('button:has-text("Save")')

    // Should show success feedback
    await expect(page.getByText('Updated caption for the beach photo')).toBeVisible()
  })

  test('should delete photo with confirmation', async ({ page }) => {
    await page.click('[data-testid="photo-card"]:first-child')

    // Get initial photo count
    const initialCount = await page.locator('[data-testid="photo-card"]').count()

    // Click delete
    await page.click('[aria-label*="Delete"]')

    // Confirm deletion
    await expect(page.getByText(/are you sure/i)).toBeVisible()
    await page.click('button:has-text("Delete")')

    // Photo should be removed
    await expect(page.locator('[data-testid="photo-card"]')).toHaveCount(initialCount - 1)
  })

  test('should show empty state when no photos', async ({ page }) => {
    // Navigate to a trip with no photos
    // (This would require creating a fresh trip with no photos)

    await expect(page.getByText(/no photos yet/i)).toBeVisible()
  })
})

test.describe('Chat to Gallery Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    await page.waitForURL('/trips')
    await page.click('[data-testid="trip-card"]:first-child')
    await page.click('[data-testid="tab-chat"]')
  })

  test('should add chat image to gallery', async ({ page }) => {
    // Upload an image in chat
    const testImagePath = path.join(__dirname, '../fixtures/chat-photo.jpg')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testImagePath)

    // Send message
    await page.click('[data-testid="send-message"]')

    // Wait for image to appear in chat
    await expect(page.locator('[data-testid="chat-attachment"]')).toBeVisible()

    // Click "Add to gallery" button
    await page.click('button:has-text("Add to gallery")')

    // Button should change to "Remove from gallery"
    await expect(page.getByText('Remove from gallery')).toBeVisible()

    // Image should have colored border
    const chatImage = page.locator('[data-testid="chat-attachment"] img')
    const className = await chatImage.getAttribute('class')
    expect(className).toContain('ring-2')
    expect(className).toContain('ring-primary')

    // Navigate to Feed tab
    await page.click('[data-testid="tab-feed"]')

    // Image should appear in gallery
    await expect(page.locator('[alt*="chat-photo"]')).toBeVisible()
  })

  test('should remove image from gallery', async ({ page }) => {
    // Assumes image is already in gallery
    await expect(page.getByText('Remove from gallery')).toBeVisible()

    // Click remove button
    await page.click('button:has-text("Remove from gallery")')

    // Button should change back
    await expect(page.getByText('Add to gallery')).toBeVisible()

    // Border should be removed
    const chatImage = page.locator('[data-testid="chat-attachment"] img')
    const className = await chatImage.getAttribute('class')
    expect(className).not.toContain('ring-2')

    // Navigate to Feed tab
    await page.click('[data-testid="tab-feed"]')

    // Image should not be in gallery
    await expect(page.locator('[alt*="chat-photo"]')).not.toBeVisible()
  })

  test('should show colored border for gallery images in chat', async ({ page }) => {
    // Assumes image is in gallery

    const chatImage = page.locator('[data-testid="chat-attachment"] img').first()
    const className = await chatImage.getAttribute('class')

    expect(className).toContain('ring-2')
    expect(className).toContain('ring-primary')
    expect(className).toContain('ring-offset-2')
  })
})
