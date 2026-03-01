# Andriod-server-upload
A Node.js Express server for uploading images and videos with support for single and multiple file uploads.

## Features

- Single file upload with folder selection
- Multiple file upload with individual folder destinations
- Support for images (JPEG, PNG, WebP) and videos (MP4, MPEG, QuickTime)
- File size limit: 100MB per file
- Organized storage in predefined folders: `her`, `him`, `withYou`

## API Endpoints

### 1. Upload Single File
**POST** `/upload`

Upload a single file to a specific folder.

**Form Data:**
- `file`: The file to upload
- `folder`: Target folder name (`her`, `him`, or `withYou`)

**Example using curl:**
```bash
curl -X POST http://localhost:8080/upload \
  -F "file=@/path/to/image.jpg" \
  -F "folder=her"
```

**Response:**
```json
{
  "message": "Upload successful",
  "folder": "her",
  "filename": "2026-03-02_10-30-45_image.jpg",
  "path": "/storage/emulated/0/scam/her/2026-03-02_10-30-45_image.jpg"
}
```

### 2. Upload Multiple Files
**POST** `/upload-multiple`

Upload multiple files at once, each with its own destination folder.

**Form Data:**
- `files`: Array of files to upload
- `folders`: JSON array specifying the target folder for each file (must match the number of files)

**Example using curl:**
```bash
curl -X POST http://localhost:8080/upload-multiple \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/video1.mp4" \
  -F "files=@/path/to/image2.png" \
  -F 'folders=["her", "him", "withYou"]'
```

**Example using JavaScript/Fetch:**
```javascript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
formData.append('files', file3);
formData.append('folders', JSON.stringify(['her', 'him', 'withYou']));

fetch('http://localhost:8080/upload-multiple', {
  method: 'POST',
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

**Response:**
```json
{
  "message": "Upload processed",
  "success": 3,
  "failed": 0,
  "results": [
    {
      "originalName": "image1.jpg",
      "filename": "2026-03-02_10-30-45_image1.jpg",
      "folder": "her",
      "path": "/storage/emulated/0/scam/her/2026-03-02_10-30-45_image1.jpg"
    },
    {
      "originalName": "video1.mp4",
      "filename": "2026-03-02_10-31-20_video1.mp4",
      "folder": "him",
      "path": "/storage/emulated/0/scam/him/2026-03-02_10-31-20_video1.mp4"
    },
    {
      "originalName": "image2.png",
      "filename": "2026-03-02_10-31-45_image2.png",
      "folder": "withYou",
      "path": "/storage/emulated/0/scam/withYou/2026-03-02_10-31-45_image2.png"
    }
  ]
}
```

### 3. Get All Files
**GET** `/files`

Retrieve a list of all uploaded files.

**Response:**
```json
[
  {
    "id": "2026-03-02_10-30-45_image1",
    "filename": "2026-03-02_10-30-45_image1.jpg",
    "folder": "her",
    "url": "/file/her/2026-03-02_10-30-45_image1"
  }
]
```

### 4. Get File
**GET** `/file/:folder/:id`

Retrieve a specific file by folder and ID.

**Example:**
```bash
curl http://localhost:8080/file/her/2026-03-02_10-30-45_image1
```

## Installation

```bash
npm install
```

## Running the Server

```bash
node index.js
```

Server will run on `http://localhost:8080`

## File Storage

Files are stored in `/storage/emulated/0/scam/` with the following structure:
```
/storage/emulated/0/scam/
├── her/
├── him/
└── withYou/
```