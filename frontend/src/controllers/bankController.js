import { sendSocketRequest } from "../services/socketClient.js";

function renderPage(res, page, data = {}) {
  return res.render(`pages/${page}`, {
    title: data.title || "Simulador Bancario",
    message: data.message || null,
    messageType: data.messageType || "error",
    values: data.values || {},
    user: data.user || null,
    showLogout: true,
    accounts: data.accounts || [],
    account: data.account || null,
    transactions: data.transactions || [],
    movements: data.movements || [],
    selectedAccountId: data.selectedAccountId || null,
    users: data.users || [],
    adminAccounts: data.adminAccounts || [],
    transaction: data.transaction || null,
    pendingTransfer: data.pendingTransfer || null,
  });
}

function getAuth(req, res) {
  const auth = req.session.auth;

  if (!auth?.token || !auth?.user) {
    res.redirect("/login");
    return null;
  }

  return auth;
}

function takeFlash(req) {
  const flash = req.session.flash || null;
  delete req.session.flash;
  return flash;
}

function setFlash(req, message, type = "success") {
  req.session.flash = { message, type };
}

function toPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function toPositiveAmount(value) {
  const amount = Number(value);
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

function isAdministrator(user) {
  return user?.rol === "ADMINISTRADOR";
}

function normalizeIban(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

async function getUserAccounts(token) {
  const response = await sendSocketRequest(
    "GET_CUENTAS_USUARIO",
    {},
    token,
  );

  if (!response.success) {
    throw new Error(response.message);
  }

  return Array.isArray(response.data) ? response.data : [];
}

async function getAccountsForHistory(auth) {
  const type = isAdministrator(auth.user)
    ? "GET_TODAS_CUENTAS"
    : "GET_CUENTAS_USUARIO";
  const response = await sendSocketRequest(type, {}, auth.token);

  if (!response.success) {
    throw new Error(response.message);
  }

  return Array.isArray(response.data) ? response.data : [];
}

async function renderOperationPage(req, res, page, title, extra = {}) {
  const auth = getAuth(req, res);
  if (!auth) return;

  try {
    const accounts = await getUserAccounts(auth.token);
    const flash = takeFlash(req);

    return renderPage(res, page, {
      title,
      user: auth.user,
      accounts,
      message: extra.message || flash?.message,
      messageType: extra.messageType || flash?.type,
      values: extra.values,
    });
  } catch (error) {
    return renderPage(res, page, {
      title,
      user: auth.user,
      accounts: [],
      message: error.message,
      values: extra.values,
    });
  }
}

function saveReceiptAndRedirect(req, res, response) {
  req.session.lastReceipt = response.data;
  return res.redirect("/comprobante");
}

export async function showAccounts(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;
  const flash = takeFlash(req);

  try {
    const accounts = await getUserAccounts(auth.token);
    return renderPage(res, "accounts", {
      title: "Mis cuentas",
      user: auth.user,
      accounts,
      message: flash?.message,
      messageType: flash?.type,
    });
  } catch (error) {
    return renderPage(res, "accounts", {
      title: "Mis cuentas",
      user: auth.user,
      accounts: [],
      message: error.message,
    });
  }
}

export async function showAccountDetail(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  const idCuenta = toPositiveInteger(req.params.idCuenta);
  if (!idCuenta) {
    setFlash(req, "El identificador de la cuenta no es válido", "error");
    return res.redirect("/cuentas");
  }

  try {
    const response = await sendSocketRequest(
      "GET_CUENTA",
      { idCuenta },
      auth.token,
    );

    if (!response.success) {
      setFlash(req, response.message, "error");
      return res.redirect("/cuentas");
    }

    return renderPage(res, "account-detail", {
      title: "Detalle de cuenta",
      user: auth.user,
      account: response.data,
    });
  } catch (error) {
    setFlash(req, error.message, "error");
    return res.redirect("/cuentas");
  }
}

export function showTransfer(req, res) {
  delete req.session.pendingTransfer;
  return renderOperationPage(
    req,
    res,
    "transfer",
    "Realizar transferencia",
  );
}

export async function processTransferConfirmation(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  const idCuentaOrigen = toPositiveInteger(req.body.idCuentaOrigen);
  const numeroCuentaDestino = normalizeIban(req.body.numeroCuentaDestino);
  const monto = toPositiveAmount(req.body.monto);
  const values = {
    idCuentaOrigen: req.body.idCuentaOrigen,
    numeroCuentaDestino,
    monto: req.body.monto,
  };

  if (!idCuentaOrigen || !/^CR\d{20}$/.test(numeroCuentaDestino) || !monto) {
    return renderOperationPage(
      req,
      res,
      "transfer",
      "Realizar transferencia",
      {
        message: "Revise la cuenta origen, el IBAN destino y el monto",
        values,
      },
    );
  }

  try {
    const accounts = await getUserAccounts(auth.token);
    const origin = accounts.find(
      (item) => Number(item.id_cuenta) === idCuentaOrigen,
    );

    if (!origin) {
      return renderOperationPage(
        req,
        res,
        "transfer",
        "Realizar transferencia",
        {
          message: "La cuenta origen no pertenece al usuario autenticado",
          values,
        },
      );
    }

    const destinationResponse = await sendSocketRequest(
      "GET_CUENTA_POR_NUMERO",
      { numeroCuenta: numeroCuentaDestino },
      auth.token,
    );

    if (!destinationResponse.success) {
      return renderOperationPage(
        req,
        res,
        "transfer",
        "Realizar transferencia",
        { message: destinationResponse.message, values },
      );
    }

    const idCuentaDestino = toPositiveInteger(
      destinationResponse.data?.idCuenta,
    );

    if (!idCuentaDestino || idCuentaDestino === idCuentaOrigen) {
      return renderOperationPage(
        req,
        res,
        "transfer",
        "Realizar transferencia",
        {
          message: "La cuenta origen y destino no pueden ser iguales",
          values,
        },
      );
    }

    const pendingTransfer = {
      idCuentaOrigen,
      idCuentaDestino,
      numeroCuentaOrigen: origin.numero_cuenta,
      numeroCuentaDestino,
      nombreBeneficiario:
        destinationResponse.data?.nombreBeneficiario || "Beneficiario",
      monto,
      createdAt: Date.now(),
    };

    req.session.pendingTransfer = pendingTransfer;

    return renderPage(res, "transfer-confirm", {
      title: "Confirmar transferencia",
      user: auth.user,
      pendingTransfer,
    });
  } catch (error) {
    return renderOperationPage(
      req,
      res,
      "transfer",
      "Realizar transferencia",
      { message: error.message, values },
    );
  }
}

export async function processConfirmedTransfer(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  const pending = req.session.pendingTransfer;

  if (!pending || Date.now() - Number(pending.createdAt) > 10 * 60 * 1000) {
    delete req.session.pendingTransfer;
    setFlash(req, "La confirmación de transferencia expiró", "error");
    return res.redirect("/transferencias");
  }

  try {
    const response = await sendSocketRequest(
      "TRANSFERENCIA",
      {
        idCuentaOrigen: pending.idCuentaOrigen,
        idCuentaDestino: pending.idCuentaDestino,
        monto: pending.monto,
      },
      auth.token,
    );

    delete req.session.pendingTransfer;

    if (!response.success) {
      setFlash(req, response.message, "error");
      return res.redirect("/transferencias");
    }

    return saveReceiptAndRedirect(req, res, response);
  } catch (error) {
    delete req.session.pendingTransfer;
    setFlash(req, error.message, "error");
    return res.redirect("/transferencias");
  }
}

export function showPayment(req, res) {
  return renderOperationPage(req, res, "payment", "Pago de servicio");
}

export async function processPayment(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  const idCuentaOrigen = toPositiveInteger(req.body.idCuentaOrigen);
  const nombreServicio = String(req.body.nombreServicio || "").trim();
  const referenciaServicio = String(
    req.body.referenciaServicio || "",
  ).trim();
  const monto = toPositiveAmount(req.body.monto);
  const values = {
    idCuentaOrigen: req.body.idCuentaOrigen,
    nombreServicio,
    referenciaServicio,
    monto: req.body.monto,
  };

  if (!idCuentaOrigen || !nombreServicio || !referenciaServicio || !monto) {
    return renderOperationPage(req, res, "payment", "Pago de servicio", {
      message: "Todos los campos son obligatorios",
      values,
    });
  }

  try {
    const response = await sendSocketRequest(
      "PAGO_SERVICIO",
      { idCuentaOrigen, nombreServicio, referenciaServicio, monto },
      auth.token,
    );

    if (!response.success) {
      return renderOperationPage(req, res, "payment", "Pago de servicio", {
        message: response.message,
        values,
      });
    }

    return saveReceiptAndRedirect(req, res, response);
  } catch (error) {
    return renderOperationPage(req, res, "payment", "Pago de servicio", {
      message: error.message,
      values,
    });
  }
}

export async function showTransactions(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;
  const flash = takeFlash(req);

  try {
    const accounts = await getAccountsForHistory(auth);
    const requestedId = req.query.idCuenta
      ? toPositiveInteger(req.query.idCuenta)
      : null;

    if (req.query.idCuenta && !requestedId) {
      return renderPage(res, "transactions", {
        title: "Historial de transacciones",
        user: auth.user,
        accounts,
        message: "La cuenta seleccionada no es válida",
      });
    }

    const selectedAccountId =
      requestedId ||
      (accounts.length === 1 ? Number(accounts[0].id_cuenta) : null);

    if (!selectedAccountId) {
      return renderPage(res, "transactions", {
        title: "Historial de transacciones",
        user: auth.user,
        accounts,
        message: flash?.message,
        messageType: flash?.type,
      });
    }

    const allowed = accounts.some(
      (item) => Number(item.id_cuenta) === selectedAccountId,
    );

    if (!allowed) {
      return renderPage(res, "transactions", {
        title: "Historial de transacciones",
        user: auth.user,
        accounts,
        message: "No tiene permiso para consultar esa cuenta",
      });
    }

    const response = await sendSocketRequest(
      "GET_TRANSACCIONES_CUENTA",
      { idCuenta: selectedAccountId },
      auth.token,
    );

    return renderPage(res, "transactions", {
      title: "Historial de transacciones",
      user: auth.user,
      accounts,
      transactions:
        response.success && Array.isArray(response.data) ? response.data : [],
      selectedAccountId,
      message: response.success ? flash?.message : response.message,
      messageType: response.success ? flash?.type : "error",
    });
  } catch (error) {
    return renderPage(res, "transactions", {
      title: "Historial de transacciones",
      user: auth.user,
      accounts: [],
      message: error.message,
    });
  }
}

export async function processReversal(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  if (!isAdministrator(auth.user)) {
    setFlash(req, "Esta opción es exclusiva para administradores", "error");
    return res.redirect("/dashboard");
  }

  const idTransaccionOriginal = toPositiveInteger(
    req.body.idTransaccionOriginal,
  );
  const idCuenta = toPositiveInteger(req.body.idCuenta);

  if (!idTransaccionOriginal) {
    setFlash(req, "La transacción seleccionada no es válida", "error");
    return res.redirect("/transacciones");
  }

  try {
    const response = await sendSocketRequest(
      "REVERTIR_TRANSACCION",
      { idTransaccionOriginal },
      auth.token,
    );

    if (!response.success) {
      setFlash(req, response.message, "error");
      return res.redirect(
        idCuenta ? `/transacciones?idCuenta=${idCuenta}` : "/transacciones",
      );
    }

    return saveReceiptAndRedirect(req, res, response);
  } catch (error) {
    setFlash(req, error.message, "error");
    return res.redirect(
      idCuenta ? `/transacciones?idCuenta=${idCuenta}` : "/transacciones",
    );
  }
}

export function showReceipt(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  const transaction = req.session.lastReceipt;
  if (!transaction) {
    return res.redirect("/transacciones");
  }

  return renderPage(res, "receipt", {
    title: "Comprobante de operación",
    user: auth.user,
    transaction,
  });
}

export async function showAudit(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  try {
    const response = await sendSocketRequest(
      "GET_MOVIMIENTOSXUSUARIO",
      { idUsuario: auth.user.idUsuario },
      auth.token,
    );

    return renderPage(res, "audit", {
      title: "Mi bitácora",
      user: auth.user,
      movements:
        response.success && Array.isArray(response.data) ? response.data : [],
      message: response.success ? null : response.message,
    });
  } catch (error) {
    return renderPage(res, "audit", {
      title: "Mi bitácora",
      user: auth.user,
      movements: [],
      message: error.message,
    });
  }
}

export async function showAllAudit(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  if (!isAdministrator(auth.user)) {
    setFlash(req, "Esta opción es exclusiva para administradores", "error");
    return res.redirect("/dashboard");
  }

  try {
    const response = await sendSocketRequest(
      "GET_MOVIMIENTOS",
      {},
      auth.token,
    );

    return renderPage(res, "audit", {
      title: "Bitácora general",
      user: auth.user,
      movements:
        response.success && Array.isArray(response.data) ? response.data : [],
      message: response.success ? null : response.message,
    });
  } catch (error) {
    return renderPage(res, "audit", {
      title: "Bitácora general",
      user: auth.user,
      movements: [],
      message: error.message,
    });
  }
}

export async function showAccountAdministration(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  if (!isAdministrator(auth.user)) {
    setFlash(req, "Esta opción es exclusiva para administradores", "error");
    return res.redirect("/dashboard");
  }

  const flash = takeFlash(req);

  try {
    const [usersResponse, accountsResponse] = await Promise.all([
      sendSocketRequest("GET_USUARIOS", {}, auth.token),
      sendSocketRequest("GET_TODAS_CUENTAS", {}, auth.token),
    ]);

    return renderPage(res, "account-admin", {
      title: "Administrar cuentas",
      user: auth.user,
      users:
        usersResponse.success && Array.isArray(usersResponse.data)
          ? usersResponse.data
          : [],
      adminAccounts:
        accountsResponse.success && Array.isArray(accountsResponse.data)
          ? accountsResponse.data
          : [],
      message:
        flash?.message ||
        (!usersResponse.success
          ? usersResponse.message
          : !accountsResponse.success
            ? accountsResponse.message
            : null),
      messageType: flash?.type,
    });
  } catch (error) {
    return renderPage(res, "account-admin", {
      title: "Administrar cuentas",
      user: auth.user,
      users: [],
      adminAccounts: [],
      message: error.message,
    });
  }
}

export async function processCreateAccount(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  if (!isAdministrator(auth.user)) {
    setFlash(req, "Esta opción es exclusiva para administradores", "error");
    return res.redirect("/dashboard");
  }

  const idUsuario = toPositiveInteger(req.body.idUsuario);
  if (!idUsuario) {
    setFlash(req, "Seleccione un cliente válido", "error");
    return res.redirect("/admin/cuentas");
  }

  try {
    const response = await sendSocketRequest(
      "CREATE_CUENTA",
      { idUsuario },
      auth.token,
    );

    setFlash(
      req,
      response.message,
      response.success ? "success" : "error",
    );
    return res.redirect("/admin/cuentas");
  } catch (error) {
    setFlash(req, error.message, "error");
    return res.redirect("/admin/cuentas");
  }
}

export async function processAccountStatus(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  if (!isAdministrator(auth.user)) {
    setFlash(req, "Esta opción es exclusiva para administradores", "error");
    return res.redirect("/dashboard");
  }

  const [idCuentaValue, idUsuarioValue] = String(
    req.body.cuentaSeleccionada || "",
  ).split("|");
  const idCuenta = toPositiveInteger(idCuentaValue);
  const idUsuario = toPositiveInteger(idUsuarioValue);
  const estadoCuenta = String(req.body.estadoCuenta || "")
    .trim()
    .toUpperCase();

  if (
    !idCuenta ||
    !idUsuario ||
    !["ACTIVA", "INACTIVA", "BLOQUEADA"].includes(estadoCuenta)
  ) {
    setFlash(req, "Los datos para cambiar el estado no son válidos", "error");
    return res.redirect("/admin/cuentas");
  }

  try {
    const response = await sendSocketRequest(
      "UPDATE_ESTADO_CUENTA",
      { idCuenta, idUsuario, estadoCuenta },
      auth.token,
    );

    setFlash(
      req,
      response.message,
      response.success ? "success" : "error",
    );
    return res.redirect("/admin/cuentas");
  } catch (error) {
    setFlash(req, error.message, "error");
    return res.redirect("/admin/cuentas");
  }
}

export async function processCashDeposit(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  if (!isAdministrator(auth.user)) {
    setFlash(req, "Esta opción es exclusiva para administradores", "error");
    return res.redirect("/dashboard");
  }

  const [idCuentaValue] = String(req.body.cuentaDeposito || "").split("|");
  const idCuentaDestino = toPositiveInteger(idCuentaValue);
  const monto = toPositiveAmount(req.body.montoDeposito);

  if (!idCuentaDestino || !monto) {
    setFlash(req, "Seleccione una cuenta e ingrese un monto válido", "error");
    return res.redirect("/admin/cuentas");
  }

  try {
    const response = await sendSocketRequest(
      "DEPOSITO_EFECTIVO",
      { idCuentaDestino, monto },
      auth.token,
    );

    if (!response.success) {
      setFlash(req, response.message, "error");
      return res.redirect("/admin/cuentas");
    }

    return saveReceiptAndRedirect(req, res, response);
  } catch (error) {
    setFlash(req, error.message, "error");
    return res.redirect("/admin/cuentas");
  }
}

export async function processCashWithdrawal(req, res) {
  const auth = getAuth(req, res);
  if (!auth) return;

  if (!isAdministrator(auth.user)) {
    setFlash(req, "Esta opción es exclusiva para administradores", "error");
    return res.redirect("/dashboard");
  }

  const [idCuentaValue] = String(req.body.cuentaRetiro || "").split("|");
  const idCuentaOrigen = toPositiveInteger(idCuentaValue);
  const monto = toPositiveAmount(req.body.montoRetiro);

  if (!idCuentaOrigen || !monto) {
    setFlash(req, "Seleccione una cuenta e ingrese un monto válido", "error");
    return res.redirect("/admin/cuentas");
  }

  try {
    const response = await sendSocketRequest(
      "RETIRO_EFECTIVO",
      { idCuentaOrigen, monto },
      auth.token,
    );

    if (!response.success) {
      setFlash(req, response.message, "error");
      return res.redirect("/admin/cuentas");
    }

    return saveReceiptAndRedirect(req, res, response);
  } catch (error) {
    setFlash(req, error.message, "error");
    return res.redirect("/admin/cuentas");
  }
}
