import { Router } from "express";
import {
  logout,
  processForgotPassword,
  processLogin,
  processMfa,
  processRegister,
  processResetPassword,
  showDashboard,
  showForgotPassword,
  showHome,
  showLogin,
  showMfa,
  showRegister,
  showResetPassword,
} from "../controllers/authController.js";
import {
  processAccountStatus,
  processCashDeposit,
  processCashWithdrawal,
  processConfirmedTransfer,
  processCreateAccount,
  processPayment,
  processReversal,
  processTransferConfirmation,
  showAccountAdministration,
  showAccountDetail,
  showAccounts,
  showAllAudit,
  showAudit,
  showPayment,
  showReceipt,
  showTransactions,
  showTransfer,
} from "../controllers/bankController.js";

import {
  showAccountRequests,
  processAccountRequest,
  showAdminAccountRequests,
  processApproveRequest,
  processRejectRequest,
} from "../controllers/accountRequestController.js";


const router = Router();

router.get("/", showHome);

router.get("/login", showLogin);
router.post("/login", processLogin);
router.get("/register", showRegister);
router.post("/register", processRegister);
router.get("/mfa", showMfa);
router.post("/mfa", processMfa);
router.get("/recuperar-password", showForgotPassword);
router.post("/recuperar-password", processForgotPassword);
router.get("/restablecer-password", showResetPassword);
router.post("/restablecer-password", processResetPassword);

router.get("/dashboard", showDashboard);
router.post("/logout", logout);

router.get("/cuentas", showAccounts);
router.get("/cuentas/:idCuenta", showAccountDetail);

router.get("/transferencias", showTransfer);
router.post("/transferencias/confirmar", processTransferConfirmation);
router.post("/transferencias/ejecutar", processConfirmedTransfer);

router.get("/pagos", showPayment);
router.post("/pagos", processPayment);

router.get("/transacciones", showTransactions);
router.post("/transacciones/revertir", processReversal);
router.get("/comprobante", showReceipt);

router.get("/bitacora", showAudit);
router.get("/admin/bitacora", showAllAudit);

router.get("/admin/cuentas", showAccountAdministration);
router.post("/admin/cuentas/crear", processCreateAccount);
router.post("/admin/cuentas/estado", processAccountStatus);
router.post("/admin/cuentas/deposito", processCashDeposit);
router.post("/admin/cuentas/retiro", processCashWithdrawal);

router.get("/solicitudes-cuenta", showAccountRequests);
router.post("/solicitudes-cuenta", processAccountRequest);
router.get("/admin/solicitudes-cuenta", showAdminAccountRequests);
router.post("/admin/solicitudes-cuenta/aprobar", processApproveRequest);
router.post("/admin/solicitudes-cuenta/rechazar", processRejectRequest);


export default router;
