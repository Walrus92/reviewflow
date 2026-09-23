import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function getEmailFromCookie(req: NextRequest) {
  const token = req.cookies.get("reviewflow.session")?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    if (typeof decoded === "string" || typeof decoded.email !== "string") return null;
    return decoded.email;
  } catch {
    return null;
  }
}
