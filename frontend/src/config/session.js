import session from "express-session";

const COOKIE_NAME = "simulador.sid";
const ONE_HOUR = 60 * 60 * 1000;

/**
 * Configura las sesiones del servidor frontend.
 *
 * El navegador conserva únicamente una cookie con el ID de sesión.
 * Los datos del usuario, el desafío MFA y el JWT quedan guardados
 * en el servidor frontend dentro de req.session.
 */
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
      sameSite: "lax",
      secure: isProduction,
      maxAge: ONE_HOUR,
    },
  });
}

export { COOKIE_NAME };
