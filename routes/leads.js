const express = require('express');
const { body } = require('express-validator');
const nodemailer = require('nodemailer');
const supabase = require('../lib/supabase');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

/**
 * POST /api/leads
 * Public endpoint — anyone can submit a contact form.
 * Body: { name, email, business?, requirements?, plan? }
 */
router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required.')
      .isLength({ max: 120 }).withMessage('Name must be under 120 characters.'),

    body('email')
      .trim()
      .notEmpty().withMessage('Email is required.')
      .isEmail().withMessage('Please enter a valid email address.')
      .normalizeEmail(),

    body('business')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 200 }).withMessage('Business name must be under 200 characters.'),

    body('requirements')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 2000 }).withMessage('Requirements must be under 2000 characters.'),

    body('plan')
      .optional({ checkFalsy: true })
      .isIn(['starter', 'growth', 'custom']).withMessage('Plan must be "starter", "growth", or "custom".'),

    handleValidationErrors,
  ],
  async (req, res) => {
    const { name, email, business, requirements, plan } = req.body;

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          name,
          email,
          business: business || null,
          requirements: requirements || null,
          plan: plan || null,
          status: 'new',
        },
      ])
      .select('id, created_at')
      .single();

    if (error) {
      console.error('[leads] Supabase insert error:', error.message);
      return res.status(500).json({ error: 'Failed to save your inquiry. Please try again.' });
    }

    // Try sending email (fire and forget, don't fail the request if email fails)
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 465,
          secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"Zenth Website" <${process.env.SMTP_USER}>`,
          to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
          subject: `New Lead: ${name} (${plan ? plan + ' plan' : 'General Inquiry'})`,
          text: `
You have received a new lead from the Zenth website!

Name: ${name}
Email: ${email}
Business: ${business || 'N/A'}
Plan Interest: ${plan || 'N/A'}

Requirements:
${requirements || 'N/A'}

Manage this lead in your dashboard: ${process.env.CLIENT_ORIGIN || 'https://zenthweb.dev'}/admin/login
          `,
        });
        console.log(`[leads] Email notification sent to contact@zenthweb.dev for lead ${data.id}`);
      } else {
        console.log('[leads] Email not sent: SMTP credentials missing in .env');
      }
    } catch (emailErr) {
      console.error('[leads] Failed to send email:', emailErr);
    }

    return res.status(201).json({
      message: 'Inquiry received! We will be in touch shortly.',
      id: data.id,
      created_at: data.created_at,
    });
  }
);

module.exports = router;
