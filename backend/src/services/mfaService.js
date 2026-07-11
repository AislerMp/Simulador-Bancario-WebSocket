import { randomInt } from "node:crypto";
import bcrypt from "bcrypt";
import { createCodigoMfaCode, getValidMfaChallenge, markMfaCodeAsUsed, invalidatePendingCodesByUserId } from '../repositories/mfaRepositorie.js';
import { createAuthError } from '../utils/authError.js';
import { getUserById } from '../repositories/authRepositorie.js';
import jwt from 'jsonwebtoken';

export async function generarCodigoMfa(idUsuario) {
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        throw createAuthError(
        "El usuario indicado no es válido",
        "USUARIO_INVALIDO"
        );
    }

    const codigo = randomInt(100000, 1000000).toString();
    console.log(`[MFA DESARROLLO] Código del usuario ${idUsuario}: ${codigo}`);
    const codigoMfahash = await bcrypt.hash(codigo, 10); // Aplicar hash al código

    const fechaExpiracion = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos a partir de ahora
    console.log(`Cantidad de codigos invalidados para el usuario ${idUsuario}: ${await invalidatePendingCodesByUserId(idUsuario)}`);

    const challenge = await createCodigoMfaCode({ idUsuario, codigoMfahash, fechaExpiracion });
    if (!challenge) {
        throw createAuthError(
            "No se pudo generar el código MFA",
            "GENERACION_CODIGO_FALLIDA"
        );
    }

    return challenge;
}

export async function validateMfaChallenge(idUsuario, codigoMfa) {

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        throw createAuthError(
            "El usuario indicado no es válido",
            "USUARIO_INVALIDO"
        );
    }

    const codigoNormalizado = String(codigoMfa ?? "").trim();

    if (!/^\d{6}$/.test(codigoNormalizado)) {
        throw createAuthError(
            "El código MFA proporcionado no es válido",
            "CODIGO_MFA_INVALIDO",
        );
    }

    const challenge = await getValidMfaChallenge(idUsuario);

    if (!challenge) {
        throw createAuthError(
            "No hay un desafío MFA válido para este usuario",
            "DESAFIO_MFA_NO_ENCONTRADO"
        );
    }

    const codigoValido = await bcrypt.compare(codigoNormalizado, challenge.codigo_hash);
    if (!codigoValido) {
        throw createAuthError(
            "El código MFA proporcionado no es válido",
            "CODIGO_MFA_INVALIDO"
        );
    }

    if(new Date() > new Date(challenge.fecha_expiracion)) {
        throw createAuthError(
            "El código MFA ha expirado",
            "CODIGO_MFA_EXPIRADO"
        );
    }

    const markAsUsedResult = await markMfaCodeAsUsed(challenge.id_codigo_mfa);
    if (!markAsUsedResult) {
        throw createAuthError(
            "No se pudo marcar el código MFA como utilizado",
            "MARCAR_CODIGO_FALLIDO"
        );
    }
    
    const user = await getUserById(idUsuario);
    const token = jwt.sign(
        {
          idUsuario: user.id_usuario,
          rol: user.rol,
          nombre: user.nombre,
          correo: user.correo,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        },
      );
      
    return { user, token }; // Si todo es válido, retornamos el usuario y el token
}