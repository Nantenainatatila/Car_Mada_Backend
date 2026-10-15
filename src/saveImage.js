const pool = require('./db');

async function saveImage(file) {
  if (!file) return null; // image facultative
  const result = await pool.query('INSERT INTO images (data, mimetype) VALUES ($1, $2) RETURNING id', [
    file.buffer,
    file.mimetype,
  ]);
  return '/api/images/' + result.rows[0].id;
}

module.exports = saveImage;