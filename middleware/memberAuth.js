const supabase = require('../lib/supabase');

/**
 * Middleware: verifies the Supabase JWT token sent from the frontend.
 * The frontend uses Supabase Auth to log in, which generates an access token.
 * It sends this token in the Authorization header.
 * We use Supabase Admin Client to fetch the user matching that token.
 */
async function requireMemberAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.split(' ')[1];

  // We ask Supabase to verify the JWT and give us the user object
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  // Attach user to request
  req.user = user;
  
  // Optional: fetch their profile to attach role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  req.profile = profile || { role: 'client' };

  next();
}

module.exports = { requireMemberAuth };
