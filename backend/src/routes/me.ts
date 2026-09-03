import { Hono } from "hono";
import { requireAuth } from "../middleware.js";
import { canReserve, canUseFavoritos } from "../config.js";

export const me = new Hono();

me.use("*", requireAuth);

// Campos del partner que traemos y editamos
const PARTNER_FIELDS = [
  "firstname", "lastname", "email", "phone", "mobile",
  "street", "city", "zip", "country_id", "state_id",
  "vat", "main_id_category_id", "main_id_number",
  "health_insurance", "health_insurance_number", "health_insurance_emergency_phone",
  "emergency_contact_name", "emergency_contact_relationship", "emergency_contact_phone",
  "birthdate_date", "image_small",
];

me.get("/", async (c) => {
  const user = c.get("user");
  const odoo = c.get("odoo");

  let partnerInfo: Record<string, unknown> = {};

  try {
    const userData = await odoo.callKw("res.users", "read", [
      [user.uid],
      ["partner_id"],
    ]) as Array<{ partner_id: [number, string] }>;

    if (userData?.[0]?.partner_id) {
      const partnerId = userData[0].partner_id[0];
      const partner = await odoo.callKw("res.partner", "read", [
        [partnerId],
        PARTNER_FIELDS,
      ]) as Array<Record<string, unknown>>;

      if (partner?.[0]) {
        const p = partner[0];
        const country = p.country_id as [number, string] | false;
        const state = p.state_id as [number, string] | false;
        const idCategory = p.main_id_category_id as [number, string] | false;
        partnerInfo = {
          firstname: (p.firstname as string) || undefined,
          lastname: (p.lastname as string) || undefined,
          phone: (p.phone as string) || undefined,
          mobile: (p.mobile as string) || undefined,
          street: (p.street as string) || undefined,
          city: (p.city as string) || undefined,
          zip: (p.zip as string) || undefined,
          country: country ? country[1] : undefined,
          countryId: country ? country[0] : undefined,
          state: state ? state[1] : undefined,
          stateId: state ? state[0] : undefined,
          vat: (p.vat as string) || undefined,
          idCategory: idCategory ? idCategory[1] : undefined,
          idCategoryId: idCategory ? idCategory[0] : undefined,
          idNumber: (p.main_id_number as string) || undefined,
          healthInsurance: (p.health_insurance as string) || undefined,
          healthInsuranceNumber: (p.health_insurance_number as string) || undefined,
          healthInsuranceEmergencyPhone: (p.health_insurance_emergency_phone as string) || undefined,
          emergencyContactName: (p.emergency_contact_name as string) || undefined,
          emergencyContactRelationship: (p.emergency_contact_relationship as string) || undefined,
          emergencyContactPhone: (p.emergency_contact_phone as string) || undefined,
          birthdate: (p.birthdate_date as string) || undefined,
          image: (p.image_small as string | false) || undefined,
        };
      }
    }
  } catch {
    // Si falla, devolver igual la info básica
  }

  return c.json({
    uid: user.uid,
    name: user.name,
    email: user.email,
    username: user.username,
    puedeReservar: canReserve(user.email),
    puedeUsarFavoritos: canUseFavoritos(user.email),
    ...partnerInfo,
  });
});

// GET /api/me/profile — datos completos del partner para editar
me.get("/profile", async (c) => {
  const user = c.get("user");
  const odoo = c.get("odoo");

  try {
    const userData = await odoo.callKw("res.users", "read", [
      [user.uid],
      ["partner_id"],
    ]) as Array<{ partner_id: [number, string] }>;

    if (!userData?.[0]?.partner_id) {
      return c.json({ error: "No se encontró el partner" }, 404);
    }

    const partnerId = userData[0].partner_id[0];
    const partner = await odoo.callKw("res.partner", "read", [
      [partnerId],
      PARTNER_FIELDS,
    ]) as Array<Record<string, unknown>>;

    if (!partner?.[0]) {
      return c.json({ error: "No se encontró el partner" }, 404);
    }

    const p = partner[0];
    const country = p.country_id as [number, string] | false;
    const state = p.state_id as [number, string] | false;
    const idCategory = p.main_id_category_id as [number, string] | false;

    return c.json({
      partnerId,
      firstname: (p.firstname as string) || "",
      lastname: (p.lastname as string) || "",
      email: (p.email as string) || "",
      phone: (p.phone as string) || "",
      mobile: (p.mobile as string) || "",
      street: (p.street as string) || "",
      city: (p.city as string) || "",
      zip: (p.zip as string) || "",
      countryId: country ? country[0] : null,
      country: country ? country[1] : "",
      stateId: state ? state[0] : null,
      state: state ? state[1] : "",
      vat: (p.vat as string) || "",
      idCategoryId: idCategory ? idCategory[0] : null,
      idCategory: idCategory ? idCategory[1] : "",
      idNumber: (p.main_id_number as string) || "",
      healthInsurance: (p.health_insurance as string) || "",
      healthInsuranceNumber: (p.health_insurance_number as string) || "",
      healthInsuranceEmergencyPhone: (p.health_insurance_emergency_phone as string) || "",
      emergencyContactName: (p.emergency_contact_name as string) || "",
      emergencyContactRelationship: (p.emergency_contact_relationship as string) || "",
      emergencyContactPhone: (p.emergency_contact_phone as string) || "",
      birthdate: (p.birthdate_date as string) || "",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al obtener perfil";
    return c.json({ error: msg }, 500);
  }
});

// PUT /api/me/profile — actualizar datos del partner vía POST a /my/account
me.put("/profile", async (c) => {
  const user = c.get("user");
  const odoo = c.get("odoo");
  const body = await c.req.json().catch(() => null);

  if (!body) {
    return c.json({ error: "Body requerido" }, 400);
  }

  try {
    // Obtener el partner_id del usuario actual
    const userData = await odoo.callKw("res.users", "read", [
      [user.uid],
      ["partner_id"],
    ]) as Array<{ partner_id: [number, string] }>;

    if (!userData?.[0]?.partner_id) {
      return c.json({ error: "No se encontró el partner" }, 404);
    }

    const partnerId = userData[0].partner_id[0];

    // Obtener CSRF token de /my/account
    const profileRes = await odoo.rawFetch("/my/account");
    const profileHtml = await profileRes.text();
    
    const csrfMatch = profileHtml.match(/name="csrf_token"\s+value="([^"]+)"/);
    if (!csrfMatch) throw new Error("No se pudo obtener CSRF token");
    const csrfToken = csrfMatch[1];

    // Construir el form solo con campos que tienen valor
    const formData: Record<string, string> = {
      csrf_token: csrfToken,
      commercial_partner_id: partnerId.toString(),
      redirect: "",
    };

    // Agregar solo los campos que tienen valor
    if (body.firstname) formData.firstname = body.firstname;
    if (body.lastname) formData.lastname = body.lastname;
    if (body.email) formData.email = body.email;
    if (body.phone) formData.phone = body.phone;
    if (body.street) formData.street = body.street;
    if (body.city) formData.city = body.city;
    if (body.zip) formData.zipcode = body.zip;
    if (body.countryId) formData.country_id = body.countryId.toString();
    if (body.stateId) formData.state_id = body.stateId.toString();
    if (body.vat) formData.vat = body.vat;
    if (body.idCategoryId) formData.main_id_category_id = body.idCategoryId.toString();
    if (body.idNumber) formData.main_id_number = body.idNumber;
    if (body.healthInsurance) formData.health_insurance = body.healthInsurance;
    if (body.healthInsuranceNumber) formData.health_insurance_number = body.healthInsuranceNumber;
    if (body.healthInsuranceEmergencyPhone) formData.health_insurance_emergency_phone = body.healthInsuranceEmergencyPhone;
    if (body.emergencyContactName) formData.emergency_contact_name = body.emergencyContactName;
    if (body.emergencyContactRelationship) formData.emergency_contact_relationship = body.emergencyContactRelationship;
    if (body.emergencyContactPhone) formData.emergency_contact_phone = body.emergencyContactPhone;
    if (body.birthdate) formData.birthdate_date = body.birthdate;

    const formBody = new URLSearchParams(formData);

    const updateRes = await odoo.rawFetch("/my/account", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });

    return c.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al actualizar";
    console.error("Profile update error:", msg);
    return c.json({ error: msg }, 500);
  }
});

// GET /api/me/countries — lista de países
me.get("/countries", async (c) => {
  const odoo = c.get("odoo");
  try {
    const countries = await odoo.callKw("res.country", "search_read", [
      [],
      ["name", "id"],
    ], { limit: 300 }) as Array<{ id: number; name: string }>;
    return c.json({ data: countries });
  } catch (err) {
    return c.json({ error: "Error al obtener países" }, 500);
  }
});

// GET /api/me/states?country_id=10 — provincias de un país
me.get("/states", async (c) => {
  const odoo = c.get("odoo");
  const countryId = Number(c.req.query("country_id"));
  if (!countryId) return c.json({ error: "country_id requerido" }, 400);

  try {
    const states = await odoo.callKw("res.country.state", "search_read", [
      [["country_id", "=", countryId]],
      ["name", "id", "code"],
    ], { limit: 100 }) as Array<{ id: number; name: string; code: string }>;
    return c.json({ data: states });
  } catch (err) {
    return c.json({ error: "Error al obtener provincias" }, 500);
  }
});
