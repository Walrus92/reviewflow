import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function getEmailFromCookie(req: NextRequest) {
  const token =
    req.cookies.get("next-auth.session-token")?.value ??
    req.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!token) return null;

  try {
    const decoded: any = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    return decoded.email;
  } catch {
    return null;
  }
}
