const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).end();

  const result = await pool.query('SELECT data, mimetype FROM images WHERE id = $1', [id]);
  if (!result.rows[0]) return res.status(404).end();

  res.set('Content-Type', result.rows[0].mimetype);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(result.rows[0].data);
});

module.exports = router;