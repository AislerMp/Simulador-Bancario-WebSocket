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
    const response = await sendSocketRequest("LOGIN", {
      correo,
      password,
    });

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
      fechaExpiracion: response.data.fechaExpiracion,
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

  return renderPage(res, "register", {
    title: "Crear cuenta",
  });
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

  if (password.length < 6) {
    return renderPage(res, "register", {
      title: "Crear cuenta",
      message: "La contraseña debe tener al menos 6 caracteres",
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

    req.session.auth = {
      user: response.data.user,
      token: response.data.token,
    };

    delete req.session.mfa;

    return res.redirect("/dashboard");
  } catch (error) {
    return renderPage(res, "mfa", {
      title: "Verificar código",
      message: error.message,
      mfa,
    });
  }
}

export function showDashboard(req, res) {
  if (!req.session.auth?.token || !req.session.auth?.user) {
    return res.redirect("/login");
  }

  return renderPage(res, "dashboard", {
    title: "Panel principal",
    user: req.session.auth.user,
    showLogout: true,
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
