import express from 'express';
import QRCode from 'qrcode';
import { SessionManager } from './sessionManager.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const sessionId = `qr_${Date.now()}`;
    const sessionManager = new SessionManager(sessionId);
    
    let qrGenerated = false;
    let responseSent = false;

    try {
        const { sock } = await sessionManager.initializeConnection();
        
        return new Promise((resolve) => {
            const connectionHandler = async (update) => {
                const { connection, qr } = update;
                
                // Generate QR code
                if (qr && !qrGenerated) {
                    qrGenerated = true;
                    
                    try {
                        const qrImage = await QRCode.toDataURL(qr, {
                            errorCorrectionLevel: 'H',
                            margin: 2,
                            width: 300,
                            color: {
                                dark: '#000000',
                                light: '#FFFFFF'
                            }
                        });
                        
                        if (!responseSent) {
                            responseSent = true;
                            res.json({
                                success: true,
                                qr: qrImage,
                                message: 'Scan the QR code with WhatsApp',
                                instructions: [
                                    '1. Open WhatsApp on your phone',
                                    '2. Tap Menu → Linked Devices',
                                    '3. Tap "Link a Device"',
                                    '4. Scan the QR code above'
                                ],
                                sessionId: sessionId
                            });
                        }
                    } catch (qrError) {
                        console.error('QR generation error:', qrError);
                        if (!responseSent) {
                            responseSent = true;
                            res.status(500).json({
                                success: false,
                                message: 'Failed to generate QR code'
                            });
                            sessionManager.cleanup();
                            resolve();
                        }
                    }
                }
                
                // Handle successful connection
                if (connection === 'open') {
                    console.log('✅ WhatsApp connected via QR!');
                    
                    // Wait for credentials to save
                    await delay(5000);
                    
                    const sessionData = sessionManager.getSessionData();
                    
                    if (sessionData) {
                        console.log('📁 Session credentials saved successfully');
                        // Session is now ready to use
                    }
                    
                    // Don't cleanup immediately - session is now active
                    sock.ev.off('connection.update', connectionHandler);
                }
                
                // Handle connection close
                if (connection === 'close') {
                    console.log('❌ Connection closed');
                }
            };
            
            sock.ev.on('connection.update', connectionHandler);
            
            // Timeout after 2 minutes
            setTimeout(() => {
                if (!responseSent) {
                    responseSent = true;
                    res.status(408).json({
                        success: false,
                        message: 'QR generation timeout'
                    });
                    sessionManager.cleanup();
                    resolve();
                }
            }, 120000);
        });
        
    } catch (error) {
        console.error('QR session error:', error);
        if (!responseSent) {
            responseSent = true;
            res.status(500).json({
                success: false,
                message: 'Failed to initialize QR session'
            });
        }
        sessionManager.cleanup();
    }
});

export default router;
