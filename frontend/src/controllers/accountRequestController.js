import {
  sendSocketRequest,
} from "../services/socketClient.js";

function getAuth(req, res) {
  const auth = req.session.auth;

  if (!auth?.token || !auth?.user) {
    res.redirect("/login");
    return null;
  }

  return auth;
}

function setFlash(
  req,
  message,
  type = "success",
) {
  req.session.flash = {
    message,
    type,
  };
}

function takeFlash(req) {
  const flash = req.session.flash || null;
  delete req.session.flash;
  return flash;
}

function isAdministrator(user) {
  return user?.rol === "ADMINISTRADOR";
}

export async function showAccountRequests(
  req,
  res,
) {
  const auth = getAuth(req, res);
  if (!auth) return;

  const flash = takeFlash(req);

  try {
    const response =
      await sendSocketRequest(
        "GET_MIS_SOLICITUDES",
        {},
        auth.token,
      );

    return res.render(
      "pages/account-requests",
      {
        title: "Solicitudes de cuenta",
        showLogout: true,
        user: auth.user,
        message:
          response.success
            ? flash?.message
            : response.message,
        messageType:
          response.success
            ? flash?.type
            : "error",
        solicitudes:
          response.success &&
          Array.isArray(response.data)
            ? response.data
            : [],
      },
    );
  } catch (error) {
    return res.render(
      "pages/account-requests",
      {
        title: "Solicitudes de cuenta",
        showLogout: true,
        user: auth.user,
        message: error.message,
        messageType: "error",
        solicitudes: [],
      },
    );
  }
}

export async function processAccountRequest(
  req,
  res,
) {
  const auth = getAuth(req, res);
  if (!auth) return;

  const tipoCuenta = String(
    req.body.tipoCuenta || "",
  )
    .trim()
    .toUpperCase();

  try {
    const response =
      await sendSocketRequest(
        "SOLICITAR_CUENTA",
        { tipoCuenta },
        auth.token,
      );

    setFlash(
      req,
      response.message,
      response.success
        ? "success"
        : "error",
    );
  } catch (error) {
    setFlash(
      req,
      error.message,
      "error",
    );
  }

  return res.redirect(
    "/solicitudes-cuenta",
  );
}

export async function showAdminAccountRequests(
  req,
  res,
) {
  const auth = getAuth(req, res);
  if (!auth) return;

  if (!isAdministrator(auth.user)) {
    setFlash(
      req,
      "Esta opción es exclusiva para administradores",
      "error",
    );

    return res.redirect("/dashboard");
  }

  const flash = takeFlash(req);

  try {
    const response =
      await sendSocketRequest(
        "GET_SOLICITUDES_PENDIENTES",
        {},
        auth.token,
      );

    return res.render(
      "pages/admin-account-requests",
      {
        title:
          "Solicitudes pendientes",
        showLogout: true,
        user: auth.user,
        message:
          response.success
            ? flash?.message
            : response.message,
        messageType:
          response.success
            ? flash?.type
            : "error",
        solicitudes:
          response.success &&
          Array.isArray(response.data)
            ? response.data
            : [],
      },
    );
  } catch (error) {
    return res.render(
      "pages/admin-account-requests",
      {
        title:
          "Solicitudes pendientes",
        showLogout: true,
        user: auth.user,
        message: error.message,
        messageType: "error",
        solicitudes: [],
      },
    );
  }
}

export async function processApproveRequest(
  req,
  res,
) {
  const auth = getAuth(req, res);
  if (!auth) return;

  try {
    const response =
      await sendSocketRequest(
        "APROBAR_SOLICITUD_CUENTA",
        {
          idSolicitud:
            Number(req.body.idSolicitud),
        },
        auth.token,
      );

    setFlash(
      req,
      response.message,
      response.success
        ? "success"
        : "error",
    );
  } catch (error) {
    setFlash(
      req,
      error.message,
      "error",
    );
  }

  return res.redirect(
    "/admin/solicitudes-cuenta",
  );
}

export async function processRejectRequest(
  req,
  res,
) {
  const auth = getAuth(req, res);
  if (!auth) return;

  try {
    const response =
      await sendSocketRequest(
        "RECHAZAR_SOLICITUD_CUENTA",
        {
          idSolicitud:
            Number(req.body.idSolicitud),

          observacion:
            String(
              req.body.observacion || "",
            ).trim(),
        },
        auth.token,
      );

    setFlash(
      req,
      response.message,
      response.success
        ? "success"
        : "error",
    );
  } catch (error) {
    setFlash(
      req,
      error.message,
      "error",
    );
  }

  return res.redirect(
    "/admin/solicitudes-cuenta",
  );
}