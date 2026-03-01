const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 8080;

app.use(express.json());

const BASE_DIR = "/storage/emulated/0/scam"; //for android
// const BASE_DIR = path.join(__dirname, "storage"); //for local testing
const ALLOWED_FOLDERS = ["her", "him", "withYou"];

/* -----------------------
   Ensure base folders exist
----------------------- */
function ensureBaseFolders() {
  if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR);
  }

  ALLOWED_FOLDERS.forEach((folder) => {
    const folderPath = path.join(BASE_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
  });
}

ensureBaseFolders();

/* -----------------------
   Multer Dynamic Storage
----------------------- */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = req.body.folder;
    console.log("Requested folder:", folder);

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return cb(new Error("Invalid folder"));
    }

    const uploadPath = path.join(BASE_DIR, folder);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const now = new Date();
    const dateTime = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const originalName = file.originalname;
    cb(null, `${dateTime}_${originalName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images & videos allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// Temporary storage for multi-file uploads
const tempStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempPath = path.join(BASE_DIR, "temp");
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
    cb(null, tempPath);
  },
  filename: function (req, file, cb) {
    const now = new Date();
    const dateTime = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const originalName = file.originalname;
    cb(null, `${dateTime}_${originalName}`);
  },
});

const uploadMultiple = multer({
  storage: tempStorage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

/* -----------------------
   Upload API (Single File)
----------------------- */
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    message: "Upload successful",
    folder: req.body.folder,
    filename: req.file.filename,
    path: req.file.path,
  });
});

/* -----------------------
   Upload API (Multiple Files)
   Body should include:
   - files: array of files
   - folders: JSON array/object mapping file indices to folder names
   Example: folders = ["her", "him", "withYou"]
----------------------- */
app.post("/upload-multiple", uploadMultiple.array("files", 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  try {
    // Parse folder mapping from request body
    let folderMapping;
    if (typeof req.body.folders === "string") {
      folderMapping = JSON.parse(req.body.folders);
    } else {
      folderMapping = req.body.folders;
    }

    if (!Array.isArray(folderMapping)) {
      throw new Error("folders must be an array");
    }

    if (folderMapping.length !== req.files.length) {
      throw new Error("Number of folders must match number of files");
    }

    const results = [];
    const errors = [];

    // Process each file
    req.files.forEach((file, index) => {
      const targetFolder = folderMapping[index];

      // Validate folder
      if (!ALLOWED_FOLDERS.includes(targetFolder)) {
        errors.push({
          filename: file.originalname,
          error: `Invalid folder: ${targetFolder}`,
        });
        // Delete temp file
        fs.unlinkSync(file.path);
        return;
      }

      // Move file to target folder
      const targetPath = path.join(BASE_DIR, targetFolder);
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      const finalPath = path.join(targetPath, file.filename);

      try {
        fs.renameSync(file.path, finalPath);
        results.push({
          originalName: file.originalname,
          filename: file.filename,
          folder: targetFolder,
          path: finalPath,
        });
      } catch (err) {
        errors.push({
          filename: file.originalname,
          error: err.message,
        });
      }
    });

    // Clean up temp directory if empty
    const tempPath = path.join(BASE_DIR, "temp");
    if (fs.existsSync(tempPath)) {
      const tempFiles = fs.readdirSync(tempPath);
      if (tempFiles.length === 0) {
        fs.rmdirSync(tempPath);
      }
    }

    res.json({
      message: "Upload processed",
      success: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    // Clean up temp files on error
    req.files.forEach((file) => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    res.status(400).json({ error: error.message });
  }
});

/* -----------------------
   Get All Files
----------------------- */
app.get("/files", (req, res) => {
  const result = [];

  ALLOWED_FOLDERS.forEach((folder) => {
    const folderPath = path.join(BASE_DIR, folder);
    const files = fs.readdirSync(folderPath);

    files.forEach((file) => {
      result.push({
        id: path.parse(file).name,
        filename: file,
        folder: folder,
        url: `/file/${folder}/${path.parse(file).name}`,
      });
    });
  });

  res.json(result);
});

/* -----------------------
   Get File By Folder + ID
----------------------- */
app.get("/file/:folder/:id", (req, res) => {
  const { folder, id } = req.params;

  if (!ALLOWED_FOLDERS.includes(folder)) {
    return res.status(400).json({ error: "Invalid folder" });
  }

  const folderPath = path.join(BASE_DIR, folder);
  const files = fs.readdirSync(folderPath);
  const file = files.find((f) => f.startsWith(id));

  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }

  res.sendFile(path.join(folderPath, file));
});

/* -----------------------
   Error Handler
----------------------- */
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});