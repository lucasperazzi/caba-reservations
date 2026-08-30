import { Hono } from "hono";
import { requireAuth } from "../middleware.js";

export const me = new Hono();

me.use("*", requireAuth);

me.get("/", async (c) => {
  const user = c.get("user");
  const odoo = c.get("odoo");

  // Traer info extra del partner (teléfono, dirección, etc.)
  let partnerInfo: {
    phone?: string;
    mobile?: string;
    street?: string;
    city?: string;
    zip?: string;
    country?: string;
    vat?: string;
    image?: string | false;
  } = {};

  try {
    const userData = await odoo.callKw("res.users", "read", [
      [user.uid],
      ["partner_id"],
    ]) as Array<{ partner_id: [number, string] }>;

    if (userData?.[0]?.partner_id) {
      const partnerId = userData[0].partner_id[0];
      const partner = await odoo.callKw("res.partner", "read", [
        [partnerId],
        ["phone", "mobile", "street", "city", "zip", "country_id", "vat", "image_small"],
      ]) as Array<Record<string, unknown>>;

      if (partner?.[0]) {
        const p = partner[0];
        const country = p.country_id as [number, string] | false;
        partnerInfo = {
          phone: (p.phone as string) || undefined,
          mobile: (p.mobile as string) || undefined,
          street: (p.street as string) || undefined,
          city: (p.city as string) || undefined,
          zip: (p.zip as string) || undefined,
          country: country ? country[1] : undefined,
          vat: (p.vat as string) || undefined,
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
    ...partnerInfo,
  });
});
