// Supprime une image de la table "images" à partir de son adresse (ex : /api/images/12).
// Si l'adresse est vide ou ancienne (/uploads/...), on ne fait rien.
const pool = require('./db');

async function supprimerImage(adresse) {
  if (!adresse || !adresse.startsWith('/api/images/')) return;
  const id = Number(adresse.replace('/api/images/', ''));
  if (Number.isInteger(id)) {
    await pool.query('DELETE FROM images WHERE id = $1', [id]);
  }
}

module.exports = supprimerImage;