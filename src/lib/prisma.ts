import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // <-- pass an empty object

export default prisma;