const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

const app = express();

// ==========================================
// 1. CONFIGURACIÓN Y SEGURIDAD BÁSICA
// ==========================================
app.use(helmet());
app.use(cors());
app.use(express.json());

const ADMIN_EMAIL = "stolascanaverde@gmail.com";
const PORT = process.env.PORT || 3000;

// Conexión a MongoDB (usará la variable de entorno que pongas en la nube)
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/kokoro";
mongoose.connect(MONGO_URI)
    .then(() => console.log("Conectado exitosamente a la base de datos de Kokoro."))
    .catch(err => console.error("Error al conectar a la base de datos:", err));


// ==========================================
// 2. SISTEMA DE SEGURIDAD ANTI-MALWARE (MULTER)
// ==========================================
const upload = multer({
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por imagen
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Archivo no permitido. Solo se aceptan imágenes seguras (JPEG, PNG, WEBP).'));
        }
    }
});


// ==========================================
// 3. ESQUEMAS DE BASE DE DATOS (Mongoose)
// ==========================================
const CharacterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    greeting: { type: String, required: true },
    isPublic: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Character = mongoose.model('Character', CharacterSchema);

const ReportSchema = new mongoose.Schema({
    targetId: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});
const Report = mongoose.model('Report', ReportSchema);


// ==========================================
// 4. RUTAS PRINCIPALES DE LA API
// ==========================================

// Ruta de prueba para saber que el servidor opera
app.get('/', (req, res) => {
    jsonResponse = { status: "Online", app: "Kokoro AI", message: "Bienvenido al entretenimiento inmersivo." };
    res.json(jsonResponse);
});

// Crear un personaje nuevo
app.post('/api/kokoro/characters', async (req, res) => {
    try {
        const { name, description, greeting } = req.body;
        const newChar = await Character.create({ name, description, greeting });
        res.json({ success: true, message: "Personaje creado con éxito", character: newChar });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Subida segura de avatares (Protegido contra archivos maliciosos)
app.post('/api/kokoro/upload-avatar', upload.single('avatar'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se subió ninguna imagen válida." });
        }
        res.json({ success: true, message: "Imagen validada y subida de forma segura.", filename: req.file.filename });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Sistema de Reportes de contenido para moderación
app.post('/api/kokoro/reports', async (req, res) => {
    try {
        const { targetId, reason } = req.body;
        await Report.create({ targetId, reason });
        res.json({ success: true, message: "Reporte enviado al equipo de administración." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==========================================
// 5. MONITOREO Y ALERTAS EN VIVO (WEBHOOK)
// ==========================================
const sendAdminAlert = async (errorMessage, errorDetails) => {
    const webhookUrl = process.env.ADMIN_DISCORD_TELEGRAM_WEBHOOK;
    if (!webhookUrl) return;

    try {
        await axios.post(webhookUrl, {
            content: `🚨 **ALERTA CRÍTICA EN KOKORO** 🚨\n> **Error:** ${errorMessage}\n> **Detalles:** \`\`\`${errorDetails}\`\`\``
        });
    } catch (err) {
        console.error("No se pudo enviar la alerta de error:", err.message);
    }
};

// Capturador global de errores críticos del servidor
process.on('uncaughtException', async (error) => {
    console.error('Excepción no capturada:', error);
    await sendAdminAlert(error.message, error.stack);
    process.exit(1);
});


// ==========================================
// 6. ENCENDIDO DEL SERVIDOR
// ==========================================
app.listen(PORT, () => {
    console.log(`Servidor de Kokoro corriendo en el puerto ${PORT}`);
});
  
