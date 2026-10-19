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
        // (Note: Replace 'onboarding@resend.dev' with your verified domain once live)
        const firstName = fullName.split(' ')[0];
        
        await resend.emails.send({
            from: 'GLOWme <onboarding@resend.dev>',
            to: [email],
            subject: `Welcome to GLOWme, ${firstName} ✨ You're on the list.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #382216; background-color: #fbf8f5;">
                    <h2 style="color: #382216; margin-bottom: 5px;">GLOW<span style="font-weight: 300; color: #8c5b3e;">me</span></h2>
                    <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8c5b3e; margin-top: 0;">Own Your Glow</p>
                    
                    <p>Hi ${firstName},</p>
                    
                    <p>Thank you for joining the waitlist. You are officially in line for our upcoming release.</p>
                    
                    <p>Most skincare AI was built for lighter skin tones, missing how inflammation, dark marks, and scarring actually behave on melanin-rich skin. GLOWme is changing that from the foundation up.</p>
                    
                    <p>We will keep you updated as we get closer to rollout. In the meantime, get ready to <strong>Own Your Glow</strong>.</p>
                    
                    <br>
                    <p>Warmly,<br>
                    <strong>Muhammad Muhammad</strong><br>
                    <span style="font-size: 13px; color: #666;">Founder & ML Lead, GLOWme Technologies Ltd</span></p>
                    
                    <hr style="border: none; border-top: 1px solid #f4ede6; margin: 30px 0;">
                    <p style="font-size: 11px; color: #888; text-align: center;">
                        GLOWme Technologies Ltd · Kano, Nigeria<br>
                        You received this because you signed up for the GLOWme waitlist.
                    </p>
                </div>
            `
        });

        return res.status(201).json({ 
            success: true, 
            message: 'Successfully joined the waitlist and email sent!' 
        });

    } catch (err) {
        console.error('Server Error:', err);
        return res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`GLOWme backend running on port ${PORT}`));