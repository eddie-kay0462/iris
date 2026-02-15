#!/usr/bin/env npx tsx
/**
 * Seed Orders — Populate orders + related tables with dummy data
 *
 * Populates:
 *   - orders (10 orders across all statuses)
 *   - order_items (1-3 items per order, linked to real products/variants)
 *   - order_status_history (full timeline per order)
 *   - inventory_movements (sale records for paid/processing/shipped/delivered orders)
 *   - product_reviews (a few verified-purchase reviews on delivered orders)
 *
 * Run with:
 *   cd apps/frontend
 *   set -a && source .env.local && set +a && npx tsx scripts/seed-orders.ts
 *
 * Pass --clean to delete all seeded orders first (orders with IRD-0000xx numbers).
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CLEAN = process.argv.includes("--clean");

// ── Dummy data ───────────────────────────────────────────────────────────────

const CUSTOMER_NAMES = [
  "Kwame Asante",
  "Ama Serwaa",
  "Yaw Mensah",
  "Efua Owusu",
  "Kofi Boateng",
  "Abena Darko",
  "Nana Agyemang",
  "Akosua Frimpong",
  "Kwesi Appiah",
  "Adwoa Poku",
];

const CITIES = ["Accra", "Kumasi", "Tamale", "Cape Coast", "Takoradi"];
const REGIONS = ["Greater Accra", "Ashanti", "Northern", "Central", "Western"];

const STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "delivered",
  "processing",
  "shipped",
  "delivered",
] as const;

const REVIEW_TITLES = [
  "Love the quality!",
  "Great fit",
  "Exactly as pictured",
  "Worth every cedi",
  "My new favourite piece",
  "Runs a bit large but still fire",
];

const REVIEW_TEXTS = [
  "Material is premium and the stitching is solid. Will definitely buy more from IRIS.",
  "Wore this to church on Sunday and got so many compliments. The design is unique.",
  "Delivery was fast and the packaging was clean. Product matches what I saw online.",
  "Been looking for quality Ghanaian streetwear and this brand delivers. Literally.",
  "The fit is perfect for the oversized look I wanted. Colour hasn't faded after washing.",
  "Slightly bigger than expected but I still love it. The embroidery detail is top notch.",
];

function randomEl<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomPhone(): string {
  return `+233${Math.floor(200000000 + Math.random() * 800000000)}`;
}

function makeAddress(name: string) {
  const idx = Math.floor(Math.random() * CITIES.length);
  return {
    fullName: name,
    address: `${randomInt(1, 200)} ${randomEl(["Independence Ave", "Kwame Nkrumah Rd", "Liberation Rd", "Oxford St", "Ring Rd"])}`,
    city: CITIES[idx],
    region: REGIONS[idx],
    postalCode: `GA-${randomInt(100, 999)}`,
    phone: randomPhone(),
  };
}

// ── Clean ────────────────────────────────────────────────────────────────────

async function cleanExisting() {
  console.log("Cleaning existing seed data...");

  // Get seed order IDs
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number")
    .like("order_number", "IRD-%");

  if (!orders || orders.length === 0) {
    console.log("  No existing orders to clean.\n");
    return;
  }

  const orderIds = orders.map((o) => o.id);

  // Delete inventory_movements referencing these orders
  const { error: mvErr } = await supabase
    .from("inventory_movements")
    .delete()
    .in("reference_id", orderIds);
  if (mvErr) console.error("  ✗ inventory_movements:", mvErr.message);
  else console.log(`  ✓ Cleaned inventory_movements`);

  // Delete product_reviews referencing these orders
  const { error: rvErr } = await supabase
    .from("product_reviews")
    .delete()
    .in("order_id", orderIds);
  if (rvErr) console.error("  ✗ product_reviews:", rvErr.message);
  else console.log(`  ✓ Cleaned product_reviews`);

  // order_items and order_status_history cascade from orders
  const { error: ordErr } = await supabase
    .from("orders")
    .delete()
    .in("id", orderIds);
  if (ordErr) console.error("  ✗ orders:", ordErr.message);
  else console.log(`  ✓ Cleaned ${orders.length} orders (+ items + history via cascade)`);

  console.log("");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  IRIS — Order Seed Script");
  console.log("═══════════════════════════════════════\n");

  if (CLEAN) {
    await cleanExisting();
  }

  // 1. Get users
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, role")
    .order("created_at", { ascending: true })
    .limit(20);

  if (!profiles || profiles.length === 0) {
    console.error("No user profiles found. Create at least one user first.");
    process.exit(1);
  }

  const customers = profiles.filter((p) => p.role === "public");
  const admins = profiles.filter((p) =>
    ["admin", "manager", "staff"].includes(p.role),
  );

  // 2. Get real products + variants
  const { data: variants } = await supabase
    .from("product_variants")
    .select(
      "id, product_id, option1_value, option2_value, price, sku, inventory_quantity, products!inner(id, title, base_price)",
    )
    .gt("inventory_quantity", 0)
    .limit(50);

  const hasProducts = variants && variants.length > 0;

  if (!hasProducts) {
    console.log(
      "⚠ No products with stock found. Will use placeholder product names.\n",
    );
  }

  // 3. Find next order number
  const { data: maxOrder } = await supabase
    .from("orders")
    .select("order_number")
    .order("order_number", { ascending: false })
    .limit(1)
    .single();

  let orderSeq = 1;
  if (maxOrder?.order_number) {
    const num = parseInt(maxOrder.order_number.replace("IRD-", ""), 10);
    if (!isNaN(num)) orderSeq = num + 1;
  }

  // 4. Create orders
  const orderCount = 10;
  let created = 0;
  const deliveredOrders: {
    orderId: string;
    userId: string;
    items: { product_id: string | null; variant_id: string | null; product_name: string }[];
  }[] = [];

  console.log("Creating orders...\n");

  for (let i = 0; i < orderCount; i++) {
    const name = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];
    const user =
      customers.length > 0 ? randomEl(customers) : randomEl(profiles);
    const status = STATUSES[i % STATUSES.length];
    const orderNumber = `IRD-${String(orderSeq + i).padStart(6, "0")}`;
    const daysAgo = randomInt(1, 30);
    const createdAt = new Date(
      Date.now() - daysAgo * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Pick 1-3 random items
    const itemCount = randomInt(1, 3);
    const orderItems: {
      product_id: string | null;
      variant_id: string | null;
      product_name: string;
      variant_title: string | null;
      sku: string | null;
      quantity: number;
      unit_price: number;
      total_price: number;
    }[] = [];

    let subtotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const qty = randomInt(1, 3);

      if (hasProducts) {
        const v = randomEl(variants!);
        const product = (v as any).products;
        const price = v.price ?? product?.base_price ?? 150;
        const variantParts = [v.option1_value, v.option2_value].filter(Boolean);

        orderItems.push({
          product_id: v.product_id,
          variant_id: v.id,
          product_name: product?.title ?? "Unknown Product",
          variant_title:
            variantParts.length > 0 ? variantParts.join(" / ") : null,
          sku: v.sku,
          quantity: qty,
          unit_price: price,
          total_price: price * qty,
        });
        subtotal += price * qty;
      } else {
        const price = randomEl([85, 120, 150, 200, 250, 350]);
        const names = [
          "Camo Longsleeve Tee",
          "Psalm 52 Jersey",
          "INRI Essentials Sweats",
          "Betrayer's Kiss Jacket",
          "Divine Provision Tee",
          "Distressed Cap",
        ];
        orderItems.push({
          product_id: null,
          variant_id: null,
          product_name: randomEl(names),
          variant_title: randomEl(["S", "M", "L", "XL"]),
          sku: null,
          quantity: qty,
          unit_price: price,
          total_price: price * qty,
        });
        subtotal += price * qty;
      }
    }

    const shippingCost = randomEl([0, 40, 68]);
    const total = subtotal + shippingCost;
    const admin = admins.length > 0 ? randomEl(admins) : null;

    // ── Insert order ──

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        email: user.email,
        order_number: orderNumber,
        status,
        subtotal,
        shipping_cost: shippingCost,
        total,
        currency: "GHS",
        shipping_address: makeAddress(name),
        payment_provider: "paystack",
        payment_reference: `IRD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        payment_status: status === "pending" ? "pending" : "paid",
        created_at: createdAt,
        updated_at: createdAt,
        ...(status === "shipped" || status === "delivered"
          ? {
              tracking_number: `GH${randomInt(1000000000, 9999999999)}`,
              carrier: randomEl(["DHL", "FedEx", "Ghana Post", "Courier Plus"]),
              shipped_at: new Date(
                new Date(createdAt).getTime() + 2 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            }
          : {}),
        ...(status === "delivered"
          ? {
              delivered_at: new Date(
                new Date(createdAt).getTime() + 5 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            }
          : {}),
      })
      .select("id")
      .single();

    if (orderErr) {
      console.error(`  ✗ Order ${orderNumber}: ${orderErr.message}`);
      continue;
    }

    // ── Insert order items ──

    const items = orderItems.map((item) => ({
      ...item,
      order_id: order!.id,
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(items);

    if (itemsErr) {
      console.error(`  ✗ Items for ${orderNumber}: ${itemsErr.message}`);
      continue;
    }

    // ── Insert status history ──

    const history: {
      order_id: string;
      from_status: string | null;
      to_status: string;
      notes: string | null;
      changed_by: string | null;
      created_at: string;
    }[] = [];

    history.push({
      order_id: order!.id,
      from_status: null,
      to_status: "pending",
      notes: "Order placed",
      changed_by: null,
      created_at: createdAt,
    });

    const statusFlow = [
      "pending",
      "paid",
      "processing",
      "shipped",
      "delivered",
    ];
    const targetIdx = statusFlow.indexOf(status);

    if (status === "cancelled") {
      // Cancelled after being paid
      history.push({
        order_id: order!.id,
        from_status: "pending",
        to_status: "paid",
        notes: "Payment confirmed via Paystack",
        changed_by: null,
        created_at: new Date(
          new Date(createdAt).getTime() + 5 * 60 * 1000,
        ).toISOString(),
      });
      history.push({
        order_id: order!.id,
        from_status: "paid",
        to_status: "cancelled",
        notes: "Customer requested cancellation",
        changed_by: null,
        created_at: new Date(
          new Date(createdAt).getTime() + 60 * 60 * 1000,
        ).toISOString(),
      });
    } else {
      const statusNotes: Record<string, string> = {
        paid: "Payment confirmed via Paystack",
        processing: "Order is being prepared",
        shipped: "Package dispatched",
        delivered: "Package delivered to customer",
      };

      for (let s = 1; s <= targetIdx && s < statusFlow.length; s++) {
        history.push({
          order_id: order!.id,
          from_status: statusFlow[s - 1],
          to_status: statusFlow[s],
          notes: statusNotes[statusFlow[s]] || null,
          changed_by: s >= 2 && admin ? admin.id : null,
          created_at: new Date(
            new Date(createdAt).getTime() + s * 12 * 60 * 60 * 1000,
          ).toISOString(),
        });
      }
    }

    const { error: histErr } = await supabase
      .from("order_status_history")
      .insert(history);

    if (histErr) {
      console.error(`  ✗ History for ${orderNumber}: ${histErr.message}`);
    }

    // ── Insert inventory movements (for non-pending, non-cancelled orders) ──

    if (
      status !== "pending" &&
      status !== "cancelled" &&
      hasProducts
    ) {
      const movements = orderItems
        .filter((item) => item.variant_id)
        .map((item) => {
          // Find variant's current stock to compute before/after
          const variant = variants!.find((v) => v.id === item.variant_id);
          const qtyBefore = variant?.inventory_quantity ?? 50;
          const qtyAfter = Math.max(0, qtyBefore - item.quantity);

          return {
            variant_id: item.variant_id!,
            quantity_change: -item.quantity,
            quantity_before: qtyBefore,
            quantity_after: qtyAfter,
            movement_type: "sale",
            reference_id: order!.id,
            reference_type: "order",
            notes: `Order ${orderNumber}`,
            created_by: admin?.id || null,
            created_at: createdAt,
          };
        });

      if (movements.length > 0) {
        const { error: mvErr } = await supabase
          .from("inventory_movements")
          .insert(movements);

        if (mvErr) {
          console.error(`  ✗ Movements for ${orderNumber}: ${mvErr.message}`);
        }
      }
    }

    // Track delivered orders for reviews
    if (status === "delivered") {
      deliveredOrders.push({
        orderId: order!.id,
        userId: user.id,
        items: orderItems.map((it) => ({
          product_id: it.product_id,
          variant_id: it.variant_id,
          product_name: it.product_name,
        })),
      });
    }

    const itemSummary = orderItems
      .map((it) => `${it.product_name} x${it.quantity}`)
      .join(", ");
    console.log(
      `  ✓ ${orderNumber}  ${status.padEnd(11)}  GH₵${String(total).padStart(7)}  ${itemSummary}`,
    );
    created++;
  }

  console.log(`\n  Orders: ${created}/${orderCount} created`);

  // ── 5. Seed product reviews for delivered orders ──

  let reviewCount = 0;

  if (deliveredOrders.length > 0) {
    console.log("\nCreating product reviews for delivered orders...\n");

    for (const dOrder of deliveredOrders) {
      // Review ~60% of delivered order items
      for (const item of dOrder.items) {
        if (Math.random() > 0.6) continue;
        if (!item.product_id) continue;

        const rating = randomEl([4, 4, 5, 5, 5, 3]);
        const { error: revErr } = await supabase
          .from("product_reviews")
          .insert({
            product_id: item.product_id,
            variant_id: item.variant_id,
            user_id: dOrder.userId,
            name: randomEl(CUSTOMER_NAMES),
            rating,
            title: randomEl(REVIEW_TITLES),
            review_text: randomEl(REVIEW_TEXTS),
            is_verified_purchase: true,
            order_id: dOrder.orderId,
            is_approved: rating >= 4,
            approved_by: admins.length > 0 && rating >= 4 ? randomEl(admins).id : null,
            approved_at:
              rating >= 4 ? new Date().toISOString() : null,
          });

        if (revErr) {
          console.error(`  ✗ Review: ${revErr.message}`);
        } else {
          console.log(
            `  ✓ Review: ${item.product_name} — ${"★".repeat(rating)}${"☆".repeat(5 - rating)}`,
          );
          reviewCount++;
        }
      }
    }
  }

  // ── Summary ──

  console.log("\n═══════════════════════════════════════");
  console.log("  Summary");
  console.log("═══════════════════════════════════════");
  console.log(`  Orders created:          ${created}`);
  console.log(`  Order items:             (1-3 per order)`);
  console.log(`  Status history entries:  (full timeline per order)`);
  console.log(`  Inventory movements:     (sale records for paid+ orders)`);
  console.log(`  Product reviews:         ${reviewCount}`);
  console.log("═══════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
