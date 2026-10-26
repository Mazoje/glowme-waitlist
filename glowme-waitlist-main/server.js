const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Supabase & Resend
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const resend = new Resend(process.env.RESEND_API_KEY);

// Health check endpoint
app.get('/', (req, res) => {
    res.send('GLOWme API is running smoothly.');
});

// Waitlist Signup Endpoint
app.post('/api/waitlist', async (req, res) => {
    try {
        const { fullName, email, phone, city, skinInterest } = req.body;

        // Basic validation
        if (!fullName || !email) {
            return res.status(400).json({ error: 'Name and email are required.' });
        }

        // 1. Insert into Supabase 'waitlist' table
        const { data, error } = await supabase
            .from('waitlist')
            .insert([
                { 
                    full_name: fullName, 
                    email: email, 
                    phone: phone || null, 
                    city: city || null, 
                    skin_interest: skinInterest || null 
                }
            ])
            .select();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'This email is already registered on the waitlist.' });
            }
            throw error;
        }

        // 2. Send Automated Welcome Email via Resend
        const firstName = fullName.split(' ')[0];
        
        await resend.emails.send({
            from: 'GLOWme <onboarding@resend.dev>', // Replace with your verified domain once added to Resend
            to: [email],
            subject: `Welcome to GLOWme, ${firstName} ✨ Your 1-Month Free Pass is locked in!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #411E16; background-color: #F9F1E8; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #435D26; margin: 0; font-size: 28px; font-weight: 800;">GLOW<span style="font-weight: 300; color: #DA7F2B;">me</span></h2>
                        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #435D26; margin-top: 4px; font-weight: 700;">Built for African Skin</p>
                    </div>

                    <div style="background-color: #DA7F2B; color: #FFFFFF; padding: 12px 18px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 20px;">
                        🎉 Special Perk Saved: 1 Month of FREE Premium Access
                    </div>
                    
                    <p>Hi ${firstName},</p>
                    
                    <p>Welcome to GLOWme! You are officially on our waitlist, and your spot for early access is locked in.</p>
                    
                    <p>Most skincare AI models were trained on lighter skin, missing how melanin-rich African skin actually behaves. GLOWme is built from the ground up specifically for skin like yours—delivering skin intelligence, local climate guidance (from Harmattan to humidity), and trusted dermatologist support.</p>
                    
                    <p>As a founding waitlist member, your <strong>1 Month Free Access</strong> will automatically activate as soon as we launch in Kano!</p>
                    
                    <p>We'll keep you posted with early progress updates. In the meantime, get ready to <strong>Own Your Glow</strong>.</p>
                    
                    <br>
                    <p>Warmly,<br>
                    <strong>Muhammad Muhammad</strong><br>
                    <span style="font-size: 13px; color: #777;">Founder & ML Lead, GLOWme Technologies Ltd</span></p>
                    
                    <hr style="border: none; border-top: 1px solid #EADBCE; margin: 30px 0;">
                    <p style="font-size: 11px; color: #888; text-align: center; line-height: 1.5;">
                        GLOWme Technologies Ltd · Kano, Nigeria<br>
                        NDPA 2023 Compliant · You received this because you registered for the GLOWme waitlist.
                    </p>
                </div>
            `
        });

        return res.status(201).json({ 
            success: true, 
            message: 'Successfully joined the waitlist and confirmation email sent!' 
        });

    } catch (err) {
        console.error('Server Error:', err);
        return res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }
});

// Resend Email Batch Endpoint (For existing database entries)
app.get('/api/resend-all', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('waitlist')
            .select('*');

        if (error) throw error;

        if (!users || users.length === 0) {
            return res.status(200).json({ message: 'No waitlist records found in Supabase database.' });
        }

        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            try {
                const firstName = user.full_name ? user.full_name.split(' ')[0] : 'Glow Friend';
                
                await resend.emails.send({
                    from: 'GLOWme <onboarding@resend.dev>',
                    to: [user.email],
                    subject: `Welcome to GLOWme, ${firstName} ✨ Your 1-Month Free Pass is locked in!`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #411E16; background-color: #F9F1E8; border-radius: 12px;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <h2 style="color: #435D26; margin: 0; font-size: 28px; font-weight: 800;">GLOW<span style="font-weight: 300; color: #DA7F2B;">me</span></h2>
                                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #435D26; margin-top: 4px; font-weight: 700;">Built for African Skin</p>
                            </div>

                            <div style="background-color: #DA7F2B; color: #FFFFFF; padding: 12px 18px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 20px;">
                                🎉 Special Perk Saved: 1 Month of FREE Premium Access
                            </div>
                            
                            <p>Hi ${firstName},</p>
                            
                            <p>Welcome to GLOWme! You are officially on our waitlist, and your spot for early access is locked in.</p>
                            
                            <p>Most skincare AI models were trained on lighter skin, missing how melanin-rich African skin actually behaves. GLOWme is built from the ground up specifically for skin like yours—delivering skin intelligence, local climate guidance (from Harmattan to humidity), and trusted dermatologist support.</p>
                            
                            <p>As a founding waitlist member, your <strong>1 Month Free Access</strong> will automatically activate as soon as we launch in Kano!</p>
                            
                            <p>We'll keep you posted with early progress updates. In the meantime, get ready to <strong>Own Your Glow</strong>.</p>
                            
                            <br>
                            <p>Warmly,<br>
                            <strong>Muhammad Muhammad</strong><br>
                            <span style="font-size: 13px; color: #777;">Founder & ML Lead, GLOWme Technologies Ltd</span></p>
                            
                            <hr style="border: none; border-top: 1px solid #EADBCE; margin: 30px 0;">
                            <p style="font-size: 11px; color: #888; text-align: center; line-height: 1.5;">
                                GLOWme Technologies Ltd · Kano, Nigeria<br>
                                NDPA 2023 Compliant · You received this because you registered for the GLOWme waitlist.
                            </p>
                        </div>
                    `
                });
                successCount++;
            } catch (emailErr) {
                console.error(`Failed sending to ${user.email}:`, emailErr.message);
                failCount++;
            }
        }

        return res.status(200).json({
            message: `Batch email execution completed!`,
            successCount,
            failCount,
            totalRecords: users.length
        });

    } catch (err) {
        console.error('Batch Resend Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`GLOWme backend running on port ${PORT}`));