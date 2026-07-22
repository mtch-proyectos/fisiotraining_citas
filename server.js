require('dotenv').config(); // Carga variables de entorno si usas archivo .env
const app = require('./src/app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  // 1. Conectar a MongoDB primero
  await connectDB();

app.get('/', (req, res) => {
  res.send('¡Servidor de Fisiotraining activo y funcionando perfectamente! 🚀');
});
  
  // 2. Levantar el servidor HTTP
  app.listen(PORT, () => {
    console.log(` Servidor corriendo en el puerto ${PORT}`);
  });
}

startServer();
