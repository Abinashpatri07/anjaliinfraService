import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { mail } from './Mail.js';





// ES6 module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for HTTPS protocol resolution
app.set('trust proxy', 1);

app.use(express.json())
// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads', 'company-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration with proper file extensions
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Preserve original file extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname); // Gets .jpg, .png, etc.
    const baseName = path.basename(file.originalname, fileExtension);
    
    // Generate: originalname-timestamp-random.extension
    const newFileName = baseName + '-' + uniqueSuffix + fileExtension;
    cb(null, newFileName);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/webp', 
    'image/gif'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed!'), false);
  }
};

// Configure multer
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Maximum 10 files
  },
  fileFilter: fileFilter
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload endpoint
app.post('/api/admin/company-images/upload', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const files = req.files;
    const totalCount = req.body.totalCount;
    const totalSize = req.body.totalSize;
    const uploadTimestamp = req.body.uploadTimestamp;
    
    // Parse file metadata if provided
    let fileMetadata = [];
    if (req.body.fileMetadata) {
      try {
        fileMetadata = JSON.parse(req.body.fileMetadata);
      } catch (e) {
        console.log('Could not parse fileMetadata:', e.message);
      }
    }

    console.log(`Successfully uploaded ${files.length} images`);

    // Prepare response with file information
    const uploadedFiles = files.map((file, index) => ({
      id: index + 1,
      filename: file.filename,           // New filename with extension
      originalname: file.originalname,   // Original filename
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      url: `${req.protocol}://${req.get('host')}/uploads/company-images/${file.filename}`, // Dynamic URL to access file
      relativePath: `/uploads/company-images/${file.filename}` // Relative path
    }));

    // Log for debugging
    console.log('Uploaded files info:');
    uploadedFiles.forEach(file => {
      console.log(`- ${file.originalname} -> ${file.filename} (${(file.size / 1024).toFixed(2)} KB)`);
    });

    res.json({
      success: true,
      message: `${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully`,
      data: {
        files: uploadedFiles,
        summary: {
          totalFiles: files.length,
          totalSize: files.reduce((sum, file) => sum + file.size, 0),
          uploadTimestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed: ' + error.message
    });
  }
});

// Get all uploaded images
app.get('/api/admin/company-images', (req, res) => {
  try {
    const imagesDir = path.join(__dirname, 'uploads', 'company-images');
    
    if (!fs.existsSync(imagesDir)) {
      return res.json({
        success: true,
        data: { files: [] }
      });
    }

    // Read all files from directory
    const files = fs.readdirSync(imagesDir);
    
    // Filter only image files and get their stats
    const imageFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map((filename, index) => {
        const filePath = path.join(imagesDir, filename);
        const stats = fs.statSync(filePath);
        
        return {
          id: index + 1,
          filename: filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `${req.protocol}://${req.get('host')}/uploads/company-images/${filename}`,
          relativePath: `/uploads/company-images/${filename}`
        };
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()); // Sort by newest first

    res.json({
      success: true,
      data: {
        files: imageFiles,
        total: imageFiles.length
      }
    });

  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch images: ' + error.message
    });
  }
});

// Delete a specific image
app.delete('/api/admin/company-images/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', 'company-images', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image: ' + error.message
    });
  }
});

// controllers/contactController.js
app.post("/api/contact-us",async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    // ✅ Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const fullMessage = `
      <strong>Name:</strong> ${name}<br/><br/>
      <strong>Message:</strong><br/>
      ${message}
    `;

    await mail(email, subject, fullMessage);

    res.json({
      success: true,
      message: "Form submitted successfully",
      data: { name, email, subject, message },
    });
    
  } catch (error) {
    console.error("Error handling contact form:", error);
    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
})



// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files per upload.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: error.message || 'An unknown error occurred'
  });
});



// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Upload directory: ${uploadDir}`);
  console.log(`Static files served at: http://localhost:${PORT}/uploads`);
});

export default app;