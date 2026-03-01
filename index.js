const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 8080;

app.use(express.json());

const BASE_DIR = path.join(__dirname, "scam");
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

/* -----------------------
   Upload API
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