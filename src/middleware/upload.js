const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(), // l'image reste en mémoire, pas sur le disque
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 Mo max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Seules les images sont acceptées'));
    cb(null, true);
  },
});

module.exports = upload;