# Bootloader + OTA (Future Roadmap)

Acest document centralizează ce urmează pentru securizarea dispozitivelor prin provisioning, serializare și update-uri OTA semnate.

## 1) Provisioning la flash (factory flow)

Scop: fiecare device primește un serial number stabil, legat de hardware ID-ul unic nRF.

### Flux propus
1. Tool-ul de factory citește HW ID (nRF FICR `DEVICEID`).
2. Tool-ul apelează API-ul de provisioning din AWS.
3. AWS caută `hw_id` în DB:
   - dacă există: returnează același serial;
   - dacă e nou: alocă serial nou secvențial.
4. Tool-ul scrie datele de provisioning pe device (serial + metadata/secret), apoi face flash.
5. Tool-ul face verify post-flash.

## 2) AWS backend (provisioning registry)

### Componente
- `API Gateway` + `Lambda` (`POST /provision`)
- `DynamoDB` cu mapare `hw_id -> serial`
- counter atomic pentru seriale secvențiale
- audit log pentru toate operațiile

### Structură minimă tabel
- `hw_id` (PK)
- `serial`
- `status` (`active`, `revoked`, `factory_only`)
- `created_at`, `updated_at`
- `device_secret_hash` (opțional dar recomandat)

## 3) Autentificare dispozitive (anti-device necunoscut)

Doar serial + HW ID NU oferă securitate suficientă.

Recomandare:
- Challenge-response bazat pe `device_secret` (sau cheie per device);
- Server validează semnătura și maparea `hw_id` + `serial`;
- Device neprovisionat sau invalid => acces respins.

## 4) Hardening necesar pentru OTA sigur

Pentru ca un OTA să nu poată elimina verificările de identitate:
- Secure boot activ;
- Signed images (MCUboot + image signing);
- Politică de reject pentru imagini nesemnate/necunoscute;
- Protecție debug/readout în producție (APPROTECT).

## 5) Ce NU facem acum (deferred)

- Nu activăm încă pipeline complet OTA în acest branch.
- Nu introducem încă rotație avansată de chei.
- Nu adăugăm încă cloud enrollment din aplicația mobilă.

## 6) Implementare incrementală recomandată

### Etapa A (Factory MVP)
- Script factory (Python): citește HW ID, cere serial, programează device.
- Endpoint AWS simplu cu idempotency pe `hw_id`.

### Etapa B (Runtime auth)
- Add challenge-response la conectare client/backend.
- Add status `revoked` în backend.

### Etapa C (OTA security)
- MCUboot + signed image rollout.
- Politică strictă de update și rollback controlat.

## 7) Note pentru integrarea firmware

- HW ID se citește doar din sursă hardware (FICR/hwinfo), nu din NVS.
- Serialul provisionat rămâne stabil pe device.
- La boot, firmware verifică consistența între HW ID local și binding-ul provisionat.

---
Status: plan de viitor (nu implementare activă în branch-ul curent).
