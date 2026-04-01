import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

type JwtPayload = {
  sub: string;
  login: string;
  iat?: number;
  exp?: number;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "JWT_SECRET não configurado" });
  }
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    if (!decoded.sub || !decoded.login) {
      return res.status(401).json({ error: "Token inválido" });
    }
    req.user = { id: decoded.sub, login: decoded.login };
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
