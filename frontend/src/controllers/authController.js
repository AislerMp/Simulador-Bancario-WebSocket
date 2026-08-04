import { sendSocketRequest } from "../services/socketClient.js";
import { COOKIE_NAME } from "../config/session.js";

function renderPage(res, page, data = {}) {
  return res.render(`pages/${page}`, {
    title: data.title || "Simulador Bancario",
    message: data.message || null,
    messageType: data.messageType || "error",
    values: data.values || {},
    user: data.user || null,
    mfa: data.mfa || null,
    showLogout: data.showLogout || false,
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function showHome(req, res) {
  return res.redirect(req.session.auth ? "/dashboard" : "/login");
}

export function showLogin(req, res) {
  if (req.session.auth) {
    return res.redirect("/dashboard");
  }

  const flash = req.session.flash || null;
  delete req.session.flash;

  return renderPage(res, "login", {
    title: "Iniciar sesión",
    message: flash?.message,
    messageType: flash?.type,
  });
}

export async function processLogin(req, res) {
  const correo = normalizeEmail(req.body.correo);
  const password = String(req.body.password || "");

  if (!correo || !password) {
    return renderPage(res, "login", {
      title: "Iniciar sesión",
      message: "Correo y contraseña son obligatorios",
      values: { correo },
    });
  }

  if (!isValidEmail(correo)) {
    return renderPage(res, "login", {
      title: "Iniciar sesión",
      message: "El correo electrónico no tiene un formato válido",
      values: { correo },
    });
  }

  try {
    const response = await sendSocketRequest("LOGIN", { correo, password });

    if (!response.success) {
      return renderPage(res, "login", {
        title: "Iniciar sesión",
        message: response.message,
        values: { correo },
      });
    }

    req.session.mfa = {
      idUsuario: response.data.id_usuario,
      correo,
      fechaExpiracion: response.data.fecha_expiracion,
    };

    return res.redirect("/mfa");
  } catch (error) {
    return renderPage(res, "login", {
      title: "Iniciar sesión",
      message: error.message,
      values: { correo },
    });
  }
}

export function showRegister(req, res) {
  if (req.session.auth) {
    return res.redirect("/dashboard");
  }

  return renderPage(res, "register", { title: "Crear cuenta" });
}

export async function processRegister(req, res) {
  const nombre = String(req.body.nombre || "").trim();
  const correo = normalizeEmail(req.body.correo);
  const password = String(req.body.password || "");
  const confirmacion = String(req.body.confirmacion || "");
  const values = { nombre, correo };

  if (!nombre || !correo || !password || !confirmacion) {
    return renderPage(res, "register", {
      title: "Crear cuenta",
      message: "Todos los campos son obligatorios",
      values,
    });
  }

  if (!isValidEmail(correo)) {
    return renderPage(res, "register", {
      title: "Crear cuenta",
      message: "El correo electrónico no tiene un formato válido",
      values,
    });
  }

  if (password.length < 8) {
    return renderPage(res, "register", {
      title: "Crear cuenta",
      message: "La contraseña debe tener al menos 8 caracteres",
      values,
    });
  }

  if (password !== confirmacion) {
    return renderPage(res, "register", {
      title: "Crear cuenta",
      message: "Las contraseñas no coinciden",
      values,
    });
  }

  try {
    const response = await sendSocketRequest("REGISTER", {
      nombre,
      correo,
      password,
    });

    if (!response.success) {
      return renderPage(res, "register", {
        title: "Crear cuenta",
        message: response.message,
        values,
      });
    }

    req.session.flash = {
      type: "success",
      message: "Cuenta creada correctamente. Ya puedes iniciar sesión.",
    };

    return res.redirect("/login");
  } catch (error) {
    return renderPage(res, "register", {
      title: "Crear cuenta",
      message: error.message,
      values,
    });
  }
}

export function showMfa(req, res) {
  if (req.session.auth) {
    return res.redirect("/dashboard");
  }

  if (!req.session.mfa) {
    return res.redirect("/login");
  }

  return renderPage(res, "mfa", {
    title: "Verificar código",
    mfa: req.session.mfa,
  });
}

export async function processMfa(req, res) {
  const mfa = req.session.mfa;

  if (!mfa) {
    return res.redirect("/login");
  }

  const codigoMfa = String(req.body.codigoMfa || "").trim();

  if (!/^\d{6}$/.test(codigoMfa)) {
    return renderPage(res, "mfa", {
      title: "Verificar código",
      message: "El código debe contener exactamente 6 números",
      mfa,
    });
  }

  try {
    const response = await sendSocketRequest("VERIFY_MFA", {
      idUsuario: mfa.idUsuario,
      codigoMfa,
    });

    if (!response.success) {
      return renderPage(res, "mfa", {
        title: "Verificar código",
        message: response.message,
        mfa,
      });
    }

    const authenticatedUser = response.data.user;
    const token = response.data.token;

    await regenerateSession(req);
    req.session.auth = { user: authenticatedUser, token };
    await saveSession(req);

    return res.redirect("/dashboard");
  } catch (error) {
    return renderPage(res, "mfa", {
      title: "Verificar código",
      message: error.message,
      mfa,
    });
  }
}

export function showForgotPassword(req, res) {
  if (req.session.auth) {
    return res.redirect("/dashboard");
  }

  return renderPage(res, "forgot-password", {
    title: "Recuperar contraseña",
  });
}

export async function processForgotPassword(req, res) {
  const correo = normalizeEmail(req.body.correo);

  if (!isValidEmail(correo)) {
    return renderPage(res, "forgot-password", {
      title: "Recuperar contraseña",
      message: "Ingrese un correo electrónico válido",
      values: { correo },
    });
  }

  try {
    const response = await sendSocketRequest("REQUEST_PASSWORD_RESET", {
      correo,
    });

    if (!response.success) {
      return renderPage(res, "forgot-password", {
        title: "Recuperar contraseña",
        message: response.message,
        values: { correo },
      });
    }

    req.session.passwordResetEmail = correo;
    req.session.flash = {
      type: "success",
      message: response.message,
    };

    return res.redirect("/restablecer-password");
  } catch (error) {
    return renderPage(res, "forgot-password", {
      title: "Recuperar contraseña",
      message: error.message,
      values: { correo },
    });
  }
}

export function showResetPassword(req, res) {
  if (req.session.auth) {
    return res.redirect("/dashboard");
  }

  const flash = req.session.flash || null;
  delete req.session.flash;

  return renderPage(res, "reset-password", {
    title: "Restablecer contraseña",
    message: flash?.message,
    messageType: flash?.type,
    values: {
      correo: req.session.passwordResetEmail || "",
    },
  });
}

export async function processResetPassword(req, res) {
  const correo = normalizeEmail(
    req.body.correo || req.session.passwordResetEmail,
  );
  const codigo = String(req.body.codigo || "").trim();
  const nuevaPassword = String(req.body.nuevaPassword || "");
  const confirmacion = String(req.body.confirmacion || "");
  const values = { correo };

  if (!isValidEmail(correo) || !/^\d{6}$/.test(codigo)) {
    return renderPage(res, "reset-password", {
      title: "Restablecer contraseña",
      message: "El correo o el código de recuperación no son válidos",
      values,
    });
  }

  if (nuevaPassword !== confirmacion) {
    return renderPage(res, "reset-password", {
      title: "Restablecer contraseña",
      message: "Las contraseñas no coinciden",
      values,
    });
  }

  try {
    const response = await sendSocketRequest("RESET_PASSWORD", {
      correo,
      codigo,
      nuevaPassword,
    });

    if (!response.success) {
      return renderPage(res, "reset-password", {
        title: "Restablecer contraseña",
        message: response.message,
        values,
      });
    }

    delete req.session.passwordResetEmail;
    req.session.flash = {
      type: "success",
      message: "Contraseña actualizada. Ya puede iniciar sesión.",
    };

    return res.redirect("/login");
  } catch (error) {
    return renderPage(res, "reset-password", {
      title: "Restablecer contraseña",
      message: error.message,
      values,
    });
  }
}

export function showDashboard(req, res) {
  if (!req.session.auth?.token || !req.session.auth?.user) {
    return res.redirect("/login");
  }

  const flash = req.session.flash || null;
  delete req.session.flash;

  return renderPage(res, "dashboard", {
    title: "Panel principal",
    user: req.session.auth.user,
    showLogout: true,
    message: flash?.message,
    messageType: flash?.type,
  });
}

export function logout(req, res) {
  req.session.destroy((error) => {
    if (error) {
      console.error("No se pudo cerrar la sesión:", error.message);
      return res.redirect("/dashboard");
    }

    res.clearCookie(COOKIE_NAME);
    return res.redirect("/login");
  });
}
