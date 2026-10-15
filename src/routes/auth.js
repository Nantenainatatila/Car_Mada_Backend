// Inscription, connexion et profil (avec photo de profil facultative)
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const upload = require('../middleware/upload');
const saveImage = require('../saveImage');
const supprimerImage = require('../deleteImage');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Crée un token valable 7 jours
function creerToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// On n'envoie jamais le mot de passe au frontend
function nettoyerUser(u) {
  return { id: u.id, name: u.name, email: u.email, avatar: u.avatar, role: u.role };
}

// POST /api/auth/register : créer un compte CLIENT (la photo est facultative)
router.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nom, email et mot de passe obligatoires' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mot de passe : 6 caractères minimum' });
    }

    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const hash = await bcrypt.hash(password, 10);
    const avatar = await saveImage(req.file); // null si aucune photo

    const resultat = await pool.query(
      `INSERT INTO users (name, email, password, avatar) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), email.trim().toLowerCase(), hash, avatar]
    );
    const user = resultat.rows[0];
    res.status(201).json({ token: creerToken(user), user: nettoyerUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const resultat = await pool.query('SELECT * FROM users WHERE email = $1', [
      String(email || '').trim().toLowerCase(),
    ]);
    const user = resultat.rows[0];
    if (!user) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    const ok = await bcrypt.compare(password || '', user.password);
    if (!ok) return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    res.json({ token: creerToken(user), user: nettoyerUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// GET /api/auth/me : mon profil
router.get('/me', authRequired, async (req, res) => {
  try {
    const resultat = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!resultat.rows[0]) return res.status(401).json({ message: 'Utilisateur introuvable' });
    res.json(nettoyerUser(resultat.rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

// PUT /api/auth/me : modifier mon profil
//  - name          : nouveau nom (facultatif)
//  - avatar        : nouvelle photo (facultatif)
//  - remove_avatar : "true" pour retirer ma photo (facultatif)
router.put('/me', authRequired, upload.single('avatar'), async (req, res) => {
  try {
    // 1) On lit l'ancienne photo
    const ancien = await pool.query('SELECT avatar FROM users WHERE id = $1', [req.user.id]);
    if (!ancien.rows[0]) return res.status(401).json({ message: 'Utilisateur introuvable' });
    const ancienAvatar = ancien.rows[0].avatar;

    // 2) On décide quelle sera la photo finale
    const nouvelle = await saveImage(req.file); // null si aucun fichier envoyé
    let avatar = ancienAvatar;                  // par défaut : on garde l'ancienne
    if (nouvelle) avatar = nouvelle;            // nouvelle photo choisie
    else if (req.body.remove_avatar === 'true') avatar = null; // photo retirée

    // 3) On met à jour (NULLIF + COALESCE : un nom vide garde l'ancien nom)
    const resultat = await pool.query(
      `UPDATE users SET name = COALESCE(NULLIF($1, ''), name), avatar = $2
       WHERE id = $3 RETURNING *`,
      [(req.body.name || '').trim(), avatar, req.user.id]
    );

    // 4) Si la photo a changé, on supprime l'ancienne de la table "images"
    if (ancienAvatar && avatar !== ancienAvatar) await supprimerImage(ancienAvatar);

    res.json(nettoyerUser(resultat.rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
});

module.exports = router;