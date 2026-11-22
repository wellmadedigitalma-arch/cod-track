import { IntegrationAdapter } from "../core/types";

export default class YouCanAdapter extends IntegrationAdapter {
  async getProducts(connection) {
    const { access_token } = connection.credentials || {};
    if (!access_token) throw new Error("Missing YouCan access_token");

    const res = await fetch("https://api.youcan.shop/products", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`YouCan API error: ${res.statusText}`);
    }

    const data = await res.json();
    const products = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

    return products.map(p => ({
      external_id: p.id,
      name: p.name || p.title,
      price: p.price || 0,
    }));
  }

  async getOrders(connection) {
    const { access_token } = connection.credentials || {};
    if (!access_token) throw new Error("Missing YouCan access_token");

    const res = await fetch("https://api.youcan.shop/orders", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`YouCan API error: ${res.statusText}`);
    }

    const data = await res.json();
    const orders = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

    return orders.map(o => ({
      external_id: o.id,
      customer: o.customer ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() : null,
      total: o.total_price || o.total || 0,
    }));
  }
}
