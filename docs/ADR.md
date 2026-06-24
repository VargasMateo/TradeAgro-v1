# Architecture Decision Records — TradeAgro

Este documento registra las decisiones de arquitectura importantes del sistema TradeAgro.

---

## ADR-001: Link de Invitación Público para Órdenes de Trabajo

**Fecha**: 2026-06-24  
**Estado**: ✅ Implementado  
**Contexto**: Las órdenes de trabajo requieren autenticación JWT para ser accedidas. Necesitamos que personas externas (sin cuenta) puedan ver una orden vía link compartido por email o botón.

### Decisión

Usar **tokens HMAC-SHA256 stateless** derivados del UUID de la orden.

```
token = HMAC-SHA256(uuid, INVITE_SECRET).hex().substring(0, 16)
URL  = /order/{uuid}?token={token}
```

### Alternativas Consideradas

| Opción | Pros | Contras |
|---|---|---|
| **HMAC stateless (elegida)** | Sin DB extra, sin expiración, determinístico | No revocable individualmente |
| Token random en DB | Revocable, auditable | Requiere tabla nueva, migración |
| JWT firmado | Puede incluir expiry, metadata | Más complejo, URL más larga |
| UUID como "secreto" | Cero cambios | Inseguro — UUIDs son adivinables/secuenciales |

### Consecuencias

- ✅ Zero overhead en DB
- ✅ Simpleza de implementación
- ✅ Consistente: mismo UUID → mismo token siempre
- ⚠️ Para revocar un link individual se debería rotar el UUID de la orden (edge case poco probable)
- ⚠️ Para invalidar **todos** los links, rotar `INVITE_SECRET`
- La vista pública es **read-only** (no observaciones, no edición)
- Ruta pública separada: `/order/:uuid` vs autenticada `/work-orders/:uuid`

---
