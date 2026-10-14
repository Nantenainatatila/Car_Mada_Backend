// Connexion à PostgreSQL
require('dotenv').config();
const { Pool, types } = require('pg');

// Par défaut, "pg" renvoie les BIGINT (prix, COUNT(*)...) sous forme de texte.
// Cette ligne les convertit en vrais nombres pour simplifier le code.
types.setTypeParser(20, (valeur) => parseInt(valeur, 10));

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL
 });

module.exports = pool;
