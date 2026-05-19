/**
 * Seed de dev — cria um tenant default e um usuário admin para
 * permitir login imediato no painel.
 *
 * Uso: `pnpm --filter @vistoria/api prisma:seed`
 *
 * Idempotente: usa upsert em ambos os registros.
 */
import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TENANT_SLUG = "auxiliadora";
const ADMIN_EMAIL = "admin@auxiliadorapredial.com.br";
const ADMIN_PASSWORD = "admin123";

async function main(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    create: {
      slug: TENANT_SLUG,
      name: "Auxiliadora Predial",
    },
    update: {},
  });
  console.log(`[seed] tenant: ${tenant.slug} (${tenant.id})`);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: ADMIN_EMAIL },
    },
    create: {
      tenantId: tenant.id,
      email: ADMIN_EMAIL,
      name: "Administrador",
      passwordHash,
      roles: [Role.ADMIN, Role.GESTOR],
    },
    update: {
      passwordHash,
      roles: [Role.ADMIN, Role.GESTOR],
      active: true,
    },
  });
  console.log(`[seed] admin: ${admin.email} (senha: ${ADMIN_PASSWORD})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error("[seed] falhou:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
