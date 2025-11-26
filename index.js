import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Import routers
import pairRouter from './pair.js';
import qrRouter from './qr.js';

const app = express();

// Resolve directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;

// Ensure sessions directory exists
if (!fs.existsSync('./sessions')) {
    fs.mkdirSync('./sessions', { recursive: true });
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

app.use('/pair', pairRouter);
app.use('/qr', qrRouter);

// Session status endpoint
app.get('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const sessionManager = new SessionManager(sessionId);
    
    if (sessionManager.isSessionValid()) {
        res.json({
            success: true,
            message: 'Session is valid',
            sessionData: sessionManager.getSessionData()
        });
    } else {
        res.json({
            success: false,
            message: 'Session not found or invalid'
        });
    }
});

app.listen(PORT, () => {
    console.log(`╔══════════════════════════════════╗`);
    console.log(`║    WALLYJAYTECH-MD SESSION      ║`);
    console.log(`║        GENERATOR SERVER         ║`);
    console.log(`╠══════════════════════════════════╣`);
    console.log(`║ 📞 WhatsApp: +2348144317152     ║`);
    console.log(`║ 📺 YouTube: @wallyjaytechy      ║`);
    console.log(`║ 📱 Telegram: @wallyjaytech      ║`);
    console.log(`║ 🚀 Server: http://localhost:${PORT} ║`);
    console.log(`╚══════════════════════════════════╝`);
});

export default app;
