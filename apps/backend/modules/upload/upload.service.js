const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// ensure folder exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});

// limits: 10 MB per file, up to 20 files
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { upload, UPLOAD_DIR };
