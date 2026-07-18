const express = require('express');
const { body, param } = require('express-validator');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

/**
 * POST /api/admin/login
 * Verify hardcoded admin credentials and return JWT.
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required.'),
    body('password').notEmpty().withMessage('Password required.'),
    handleValidationErrors,
  ],
  (req, res) => {
    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // Create a token valid for 8 hours
      const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, {
        expiresIn: '8h',
      });
      return res.json({ token });
    }

    return res.status(401).json({ error: 'Invalid credentials.' });
  }
);

/**
 * POST /api/admin/logout
 * Since we use stateless JWTs, the client simply deletes the token.
 * We include this endpoint for completeness/future-proofing (e.g., token blacklisting).
 */
router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

/**
 * GET /api/admin/leads
 * Protected: list all leads, ordered by newest first.
 * Supports ?status= filter (new, contacted, closed).
 */
router.get('/leads', requireAuth, async (req, res) => {
  const { status } = req.query;

  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && ['new', 'contacted', 'closed'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[admin/leads] Supabase select error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch leads.' });
  }

  return res.json({ leads: data });
});

/**
 * PATCH /api/admin/leads/:id
 * Protected: Update the status of a specific lead.
 */
router.patch(
  '/leads/:id',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid lead ID format.'),
    body('status')
      .isIn(['new', 'contacted', 'closed'])
      .withMessage('Invalid status value.'),
    handleValidationErrors,
  ],
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      console.error(`[admin/leads/${id}] Supabase update error:`, error.message);
      return res.status(500).json({ error: 'Failed to update lead.' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    return res.json({ message: 'Status updated successfully.', lead: data });
  }
);

module.exports = router;
