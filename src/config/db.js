//Conexión a MongoDB Atlas
require('dotenv').config();
const dns = require('node:dns');
const { MongoClient } = require('mongodb');

// Forzar DNS de Google para evitar fallos SRV
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Idealmente la URI debe ir en el archivo .env
const uri = process.env.MONGO_URI 
const client = new MongoClient(uri);
let db;

async function connectDB() {
  if (db) return db; // Si ya está conectado, reutiliza la conexión

  try {
    await client.connect();
    console.log("¡Conexión exitosa a MongoDB Atlas!");
    db = client.db("fisiotraining");
    return db;
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
    process.exit(1); // Finaliza si no hay conexión a BD
  }
}

function getDB() {
  if (!db) {
    throw new Error("La base de datos no ha sido inicializada. Llama a connectDB primero.");
  }
  return db;
}

module.exports = { connectDB, getDB, client };