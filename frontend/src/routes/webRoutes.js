import { Router } from "express";
import {
  logout,
  processLogin,
  processMfa,
  processRegister,
  showDashboard,
  showHome,
  showLogin,
  showMfa,
  showRegister,
} from "../controllers/authController.js";

const router = Router();

router.get("/", showHome);

router.get("/login", showLogin);
router.post("/login", processLogin);

router.get("/register", showRegister);
router.post("/register", processRegister);

router.get("/mfa", showMfa);
router.post("/mfa", processMfa);

router.get("/dashboard", showDashboard);
router.post("/logout", logout);

export default router;
