const express = require('express');
const { body } = require('express-validator');
const supabase = require('../lib/supabase');
const { requireMemberAuth } = require('../middleware/memberAuth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

/**
 * GET /api/member/projects
 * Get all projects/leads belonging to the logged-in user.
 */
router.get('/projects', requireMemberAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[member/projects] Supabase select error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch projects.' });
  }

  // If user is an admin based on profile, they might see all projects 
  // (though the /api/admin/leads route is better for that).
  // This route is strictly for their own projects.

  return res.json({ projects: data, profile: req.profile });
});

/**
 * POST /api/member/projects
 * Submit a new project inquiry linked to the logged-in user.
 */
router.post(
  '/projects',
  requireMemberAuth,
  [
    body('name').notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email required.'),
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
          user_id: req.user.id, // Link to the logged in user
        },
      ])
      .select('id, created_at')
      .single();

    if (error) {
      console.error('[member/projects/create] error:', error.message);
      return res.status(500).json({ error: 'Failed to create project.' });
    }

    return res.status(201).json({ message: 'Project submitted successfully!', project: data });
  }
);

/**
 * GET /api/member/inquiries
 * Get all global inquiries.
 */
router.get('/inquiries', requireMemberAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[member/inquiries] Supabase select error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch inquiries.' });
  }

  return res.json({ inquiries: data });
});

module.exports = router;
