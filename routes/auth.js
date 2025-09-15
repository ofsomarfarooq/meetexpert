const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const authController = require('../controllers/auth');

const router = express.Router();

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname,'../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/png','image/jpeg','image/jpg','image/gif','image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid image type'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
});

// Register with single file upload (field name must be profile_picture)
router.post('/register', upload.single('profile_picture'), authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;