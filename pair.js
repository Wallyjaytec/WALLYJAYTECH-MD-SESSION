import express from 'express';
import { SessionManager } from './sessionManager.js';
import pn from 'awesome-phonenumber';

const router = express.Router();

router.get('/', async (req, res) => {
    let { number } = req.query;
    
    if (!number) {
        return res.status(400).json({ 
            success: false, 
            message: 'Phone number is required' 
        });
    }

    // Clean and validate phone number
    number = number.replace(/[^0-9]/g, '');
    const phone = pn('+' + number);
    
    if (!phone.isValid()) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid phone number format. Please use full international number without + (e.g., 2348144317152)' 
        });
    }

    const e164Number = phone.getNumber('e164').replace('+', '');
    const sessionManager = new SessionManager(`pair_${e164Number}`);
    
    try {
        const { sock, state } = await sessionManager.initializeConnection();
        
        if (!state.creds.registered) {
            await delay(2000);
            
            const pairingCode = await sock.requestPairingCode(e164Number);
            const formattedCode = pairingCode.match(/.{1,4}/g)?.join('-') || pairingCode;
            
            console.log(`📱 Pairing code requested for: ${e164Number}`);
            
            // Wait for connection and credentials
            return new Promise((resolve) => {
                const connectionHandler = async (update) => {
                    const { connection, qr } = update;
                    
                    if (connection === 'open') {
                        console.log(`✅ Successfully connected: ${e164Number}`);
                        sock.ev.off('connection.update', connectionHandler);
                        
                        // Wait a bit for credentials to save
                        await delay(3000);
                        
                        const sessionData = sessionManager.getSessionData();
                        
                        if (sessionData) {
                            res.json({
                                success: true,
                                message: 'Session created successfully!',
                                code: formattedCode,
                                sessionData: {
                                    clientId: sessionData.me?.id,
                                    platform: sessionData.me?.platform,
                                    registered: true
                                }
                            });
                        } else {
                            res.json({
                                success: true,
                                message: 'Pairing code generated! Check your WhatsApp.',
                                code: formattedCode,
                                sessionData: null
                            });
                        }
                        
                        // Don't cleanup immediately - let user use the session
                        setTimeout(() => sessionManager.cleanup(), 30000);
                        resolve();
                    }
                };
                
                sock.ev.on('connection.update', connectionHandler);
                
                // Timeout after 2 minutes
                setTimeout(() => {
                    sock.ev.off('connection.update', connectionHandler);
                    if (!res.headersSent) {
                        res.status(408).json({
                            success: false,
                            message: 'Pairing timeout. Please try again.'
                        });
                        sessionManager.cleanup();
                        resolve();
                    }
                }, 120000);
            });
        }
        
    } catch (error) {
        console.error('Pairing error:', error);
        sessionManager.cleanup();
        
        res.status(500).json({
            success: false,
            message: 'Failed to generate pairing code. Please try again.'
        });
    }
});

export default router;
