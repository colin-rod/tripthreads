/**
 * Expo Image Picker Mock for E2E Tests
 *
 * Purpose:
 * Detox cannot interact with native photo picker UI.
 * This mock simulates expo-image-picker behavior for E2E tests.
 *
 * Usage:
 * - Automatically returns a test image when launchImageLibraryAsync is called
 * - Simulates permission requests and grants
 * - Allows testing app behavior before/after image selection
 */

// Base64-encoded 1x1 red pixel (tiny test image)
const TEST_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/**
 * Mock successful image selection
 */
export const launchImageLibraryAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [
    {
      uri: 'file:///test-image.jpg',
      width: 1920,
      height: 1080,
      base64: TEST_IMAGE_BASE64,
      mimeType: 'image/jpeg',
      fileName: 'test-image.jpg',
      fileSize: 1024,
      type: 'image',
    },
  ],
})

/**
 * Mock camera launch (same as image library for testing)
 */
export const launchCameraAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [
    {
      uri: 'file:///test-camera-image.jpg',
      width: 1920,
      height: 1080,
      base64: TEST_IMAGE_BASE64,
      mimeType: 'image/jpeg',
      fileName: 'test-camera-image.jpg',
      fileSize: 1024,
      type: 'image',
    },
  ],
})

/**
 * Mock permission request - always grants permission
 */
export const requestMediaLibraryPermissionsAsync = jest.fn().mockResolvedValue({
  granted: true,
  status: 'granted',
  expires: 'never',
  canAskAgain: true,
})

/**
 * Mock camera permission request - always grants permission
 */
export const requestCameraPermissionsAsync = jest.fn().mockResolvedValue({
  granted: true,
  status: 'granted',
  expires: 'never',
  canAskAgain: true,
})

/**
 * Mock getting current permission status
 */
export const getMediaLibraryPermissionsAsync = jest.fn().mockResolvedValue({
  granted: true,
  status: 'granted',
  expires: 'never',
  canAskAgain: true,
})

/**
 * Mock getting camera permission status
 */
export const getCameraPermissionsAsync = jest.fn().mockResolvedValue({
  granted: true,
  status: 'granted',
  expires: 'never',
  canAskAgain: true,
})

/**
 * Mock MediaType constants
 */
export const MediaTypeOptions = {
  All: 'All',
  Images: 'Images',
  Videos: 'Videos',
}

/**
 * Mock UIImagePickerControllerQualityType constants
 */
export const UIImagePickerControllerQualityType = {
  High: 0,
  Medium: 1,
  Low: 2,
}

/**
 * Helper: Configure mock to simulate user canceling picker
 */
export function mockUserCancelsPicker() {
  launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: true,
    assets: [],
  })
}

/**
 * Helper: Configure mock to simulate permission denied
 */
export function mockPermissionDenied() {
  requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
    granted: false,
    status: 'denied',
    expires: 'never',
    canAskAgain: false,
  })

  getMediaLibraryPermissionsAsync.mockResolvedValueOnce({
    granted: false,
    status: 'denied',
    expires: 'never',
    canAskAgain: false,
  })
}

/**
 * Helper: Configure mock to return multiple images
 */
export function mockMultipleImages(count: number) {
  const assets = Array.from({ length: count }, (_, i) => ({
    uri: `file:///test-image-${i}.jpg`,
    width: 1920,
    height: 1080,
    base64: TEST_IMAGE_BASE64,
    mimeType: 'image/jpeg',
    fileName: `test-image-${i}.jpg`,
    fileSize: 1024,
    type: 'image',
  }))

  launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets,
  })
}

/**
 * Helper: Reset all mocks to default behavior
 */
export function resetImagePickerMocks() {
  launchImageLibraryAsync.mockReset()
  launchCameraAsync.mockReset()
  requestMediaLibraryPermissionsAsync.mockReset()
  requestCameraPermissionsAsync.mockReset()
  getMediaLibraryPermissionsAsync.mockReset()
  getCameraPermissionsAsync.mockReset()

  // Restore default implementations
  launchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///test-image.jpg',
        width: 1920,
        height: 1080,
        base64: TEST_IMAGE_BASE64,
        mimeType: 'image/jpeg',
        fileName: 'test-image.jpg',
        fileSize: 1024,
        type: 'image',
      },
    ],
  })

  requestMediaLibraryPermissionsAsync.mockResolvedValue({
    granted: true,
    status: 'granted',
    expires: 'never',
    canAskAgain: true,
  })

  getMediaLibraryPermissionsAsync.mockResolvedValue({
    granted: true,
    status: 'granted',
    expires: 'never',
    canAskAgain: true,
  })
}
