import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "./generated-client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const products: Prisma.ProductCreateInput[] = [
  {
    name: "Wireless Noise-Cancelling Headphones",
    sku: "WNC-H100",
    description:
      "Premium over-ear headphones with 40h battery life, adaptive ANC, and Hi-Res Audio certification.",
    price: 12999,
    imageUrl: null,
  },
  {
    name: "Mechanical Keyboard TKL",
    sku: "MKB-TKL75",
    description:
      "Tenkeyless mechanical keyboard with hot-swap switches, per-key RGB, and aluminium top frame.",
    price: 8499,
    imageUrl: null,
  },
  {
    name: "27\" 4K IPS Monitor",
    sku: "MON-27K4",
    description:
      "27-inch 4K UHD IPS panel with 144Hz refresh rate, 1ms GTG response, and USB-C 90W PD.",
    price: 34999,
    imageUrl: null,
  },
  {
    name: "USB-C Docking Station",
    sku: "DOCK-UC12",
    description:
      "12-in-1 docking station: dual 4K HDMI, 100W PD, 3× USB-A, SD/microSD, Ethernet.",
    price: 5999,
    imageUrl: null,
  },
  {
    name: "Ergonomic Mesh Chair",
    sku: "CHR-ERG1",
    description:
      "Fully adjustable lumbar support, breathable mesh back, 4D armrests, and tilt lock mechanism.",
    price: 22500,
    imageUrl: null,
  },
  {
    name: "Portable SSD 2TB",
    sku: "SSD-P2TB",
    description:
      "USB 3.2 Gen 2 portable SSD with read speeds up to 1050 MB/s, ruggedised and water-resistant.",
    price: 9299,
    imageUrl: null,
  },
];

const warehouses: Prisma.WarehouseCreateInput[] = [
  { name: "Mumbai Central", location: "Mumbai, MH" },
  { name: "Bangalore Hub", location: "Bengaluru, KA" },
];

// Stock levels per product per warehouse [total, reserved]
const stockLevels: [number, number][][] = [
  // WNC-H100
  [
    [50, 3],
    [30, 1],
  ],
  // MKB-TKL75
  [
    [20, 5],
    [15, 2],
  ],
  // MON-27K4
  [
    [10, 0],
    [8, 1],
  ],
  // DOCK-UC12
  [
    [40, 4],
    [35, 0],
  ],
  // CHR-ERG1
  [
    [5, 2],  // intentionally tight stock — good for concurrency demo
    [3, 1],
  ],
  // SSD-P2TB
  [
    [60, 0],
    [45, 5],
  ],
];

async function main() {
  console.log("🌱 Seeding database…");

  // Idempotent: clear and reseed
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.idempotencyRecord.deleteMany();

  const createdWarehouses = await Promise.all(
    warehouses.map((w) => prisma.warehouse.create({ data: w }))
  );

  const createdProducts = await Promise.all(
    products.map((p) => prisma.product.create({ data: p }))
  );

  for (let pi = 0; pi < createdProducts.length; pi++) {
    for (let wi = 0; wi < createdWarehouses.length; wi++) {
      const [total, reserved] = stockLevels[pi][wi];
      await prisma.inventory.create({
        data: {
          productId: createdProducts[pi].id,
          warehouseId: createdWarehouses[wi].id,
          total,
          reserved,
        },
      });
    }
  }

  console.log(
    `✅ Seeded ${createdProducts.length} products × ${createdWarehouses.length} warehouses`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
