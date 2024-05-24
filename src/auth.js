import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY;

function generateToken(userId) {
  return jwt.sign({ userId }, SECRET_KEY, { expiresIn: "24h" });
}

const verifyToken = (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};

export { generateToken, verifyToken };
