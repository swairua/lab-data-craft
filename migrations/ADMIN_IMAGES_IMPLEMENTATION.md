# Admin Images Implementation Guide

## Database Schema

Run the migration file `create_admin_images_table.sql` to create the necessary tables:
- `admin_images` - Stores metadata about uploaded images
- `admin_images_audit` - Tracks changes to admin images

## API Endpoint: POST /uploads

The frontend sends file uploads to `https://lab.wayrus.co.ke/uploads` with the following data:

### Request Format

**Method:** POST  
**Content-Type:** multipart/form-data

**Form Fields:**
- `file` (File) - The image file to upload
- `image_type` (string) - One of: `logo`, `contacts`, `stamp`

**Example:**
```
POST /uploads HTTP/1.1
Host: lab.wayrus.co.ke
Content-Type: multipart/form-data; boundary=----FormBoundary

------FormBoundary
Content-Disposition: form-data; name="file"; filename="logo.png"
Content-Type: image/png

[binary image data]
------FormBoundary
Content-Disposition: form-data; name="image_type"

logo
------FormBoundary--
```

### Expected Response

**Success (2xx status):**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "file_path": "/uploads/logo_20240101_abc123.png",
  "image_id": 42
}
```

**Error (4xx/5xx status):**
```json
{
  "success": false,
  "error": "Invalid image type"
}
```

## Backend Implementation Steps

### 1. Authentication
Ensure the user is authenticated (checked via session cookies with `credentials: "include"`)

### 2. Validation
- Verify `image_type` is one of: `logo`, `contacts`, `stamp`
- Validate file size (max 50MB recommended)
- Validate MIME type (must be image/*)
- Validate file is a valid image (check magic bytes)

### 3. File Storage
- Create directory structure: `/uploads/admin/{image_type}/`
- Generate unique filename with timestamp
- Store file in the uploads directory
- Optional: Validate image with image processing library

### 4. Database Entry
Insert a record in `admin_images` table:

```sql
INSERT INTO admin_images 
(image_type, file_path, original_filename, file_size, mime_type, uploaded_by)
VALUES 
(:image_type, :file_path, :original_filename, :file_size, :mime_type, :user_id)
```

### 5. Audit Logging (Optional)
If this is replacing an existing image (unique constraint on image_type), 
log the change in `admin_images_audit` table:

```sql
INSERT INTO admin_images_audit 
(admin_image_id, action, old_file_path, new_file_path, changed_by)
VALUES 
(:image_id, 'replace', :old_file_path, :new_file_path, :user_id)
```

## Image Type Specifications

### Logo
- Use case: Company/lab logo
- Recommended size: 500x500px (square)
- Formats: PNG, SVG, JPEG
- Max dimensions: 2000x2000px

### Contacts
- Use case: Contact information graphic/image
- Recommended size: 1200x400px
- Formats: JPEG, PNG
- Max dimensions: 2000x2000px

### Stamp
- Use case: Approval/certification stamp
- Recommended size: 300x300px (square)
- Formats: PNG (recommended for transparency), JPEG
- Max dimensions: 1000x1000px

## Retrieval Endpoints (Recommended)

### GET /uploads/admin/{image_type}
Retrieve current image for a given type

```sql
SELECT file_path FROM admin_images 
WHERE image_type = :image_type 
ORDER BY updated_at DESC 
LIMIT 1
```

### GET /api/admin/images
List all uploaded images (admin only)

```sql
SELECT id, image_type, file_path, original_filename, 
       file_size, uploaded_by, uploaded_at 
FROM admin_images 
ORDER BY uploaded_at DESC
```

## Frontend Requirements

The frontend component (`src/pages/Admin.tsx`) expects:
1. POST requests with multipart/form-data to `/uploads`
2. Session authentication via cookies (already implemented)
3. 2xx status code on success
4. Error response with proper status code on failure

## Security Considerations

1. **Authentication:** Verify user session is valid
2. **Authorization:** Consider restricting uploads to admin users only
   - Could check user role in `users` table
   - Or verify against `admin_users` whitelist table
3. **File Validation:** 
   - Check MIME type (don't trust client)
   - Validate actual file content (magic bytes)
   - Scan for malicious content
4. **Storage:**
   - Store files outside web root (execute protection)
   - Use unique filenames (prevent overwrites)
   - Implement access controls for file downloads
5. **Rate Limiting:**
   - Consider rate limiting uploads per user
   - Implement file size quota per user/day

## Example PHP Implementation

```php
<?php
// Check authentication
session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Validate input
if (!isset($_POST['image_type']) || !isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$image_type = $_POST['image_type'];
$allowed_types = ['logo', 'contacts', 'stamp'];

if (!in_array($image_type, $allowed_types)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid image type']);
    exit;
}

$file = $_FILES['file'];
if ($file['size'] > 50 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'File too large']);
    exit;
}

if (!strpos($file['type'], 'image/')) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type']);
    exit;
}

// Generate unique filename
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = $image_type . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$upload_dir = __DIR__ . '/uploads/admin/' . $image_type . '/';

// Create directory if it doesn't exist
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

$file_path = $upload_dir . $filename;

// Move uploaded file
if (move_uploaded_file($file['tmp_name'], $file_path)) {
    // Insert into database
    $pdo->prepare("
        INSERT INTO admin_images 
        (image_type, file_path, original_filename, file_size, mime_type, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ")->execute([
        $image_type,
        '/uploads/admin/' . $image_type . '/' . $filename,
        $file['name'],
        $file['size'],
        $file['type'],
        $_SESSION['user_id']
    ]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Image uploaded successfully',
        'file_path' => '/uploads/admin/' . $image_type . '/' . $filename
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to move uploaded file']);
}
?>
```

## Testing

### Test Upload with cURL

```bash
curl -X POST \
  -H "Cookie: PHPSESSID=your_session_id" \
  -F "image_type=logo" \
  -F "file=@/path/to/image.png" \
  https://lab.wayrus.co.ke/uploads
```

### Test with JavaScript Fetch

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('image_type', 'logo');

fetch('https://lab.wayrus.co.ke/uploads', {
  method: 'POST',
  body: formData,
  credentials: 'include'
})
.then(response => response.json())
.then(data => console.log(data));
```
