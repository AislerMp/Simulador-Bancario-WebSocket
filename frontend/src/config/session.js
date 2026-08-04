import session from "express-session";

const COOKIE_NAME = "simulador.sid";
const ONE_HOUR = 60 * 60 * 1000;

export function createSessionMiddleware() {
  const isProduction = process.env.NODE_ENV === "production";
  const secret =
    process.env.SESSION_SECRET || "secreto-local-cambiar-en-env";

  if (!process.env.SESSION_SECRET) {
    console.warn(
      "Advertencia: SESSION_SECRET no está configurado. Se usará una clave solo para desarrollo.",
    );
  }

  return session({
    name: COOKIE_NAME,
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProduction ? "strict" : "lax",
      secure: isProduction,
      maxAge: ONE_HOUR,
      path: "/",
    },
  });
}

export { COOKIE_NAME };
