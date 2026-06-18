const jwt = require('jsonwebtoken');
const { db } = require('../db/postgres');
const { users, applicants } = require('../db/schema');
const { eq } = require('drizzle-orm');

const ACCESS_SECRET = () =>
  process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, ACCESS_SECRET());

    if (req.context) {
      return next();
    }

    let user = null;

    if (decoded.role === 'admin' || decoded.role === 'senior' || decoded.role === 'junior') {
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.id, decoded.id))
        .limit(1);
      user = row ?? null;
    } else if (decoded.role === 'applicant') {
      const [row] = await db
        .select()
        .from(applicants)
        .where(eq(applicants.id, decoded.id))
        .limit(1);
      if (row) {
        user = {
          ...row,
          _id: row.id,
          role: 'applicant',
          aiKey: row.ai_key,
          profile: row.profile_data,
          preferences: (row.state_data ?? {}).preferences ?? {},
        };
      }
    }

    if (!user) {
      return res.status(403).json({ message: 'Invalid or expired session' });
    }

    req.context = {
      firmId: decoded.firm_id ?? process.env.DEFAULT_FIRM_ID ?? '',
      userId: String(user.id),
      role: user.role || decoded.role,
    };

    req.user    = user;
    req.userId  = user.id;
    req.userRole = req.context.role;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('Auth middleware error:', error.message);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!['admin', 'senior', 'junior'].includes(req.userRole)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const requireApplicant = (req, res, next) => {
  if (req.userRole !== 'applicant') {
    return res.status(403).json({ message: 'Applicant access required' });
  }
  next();
};

module.exports = { authenticateToken, requireAdmin, requireApplicant };
