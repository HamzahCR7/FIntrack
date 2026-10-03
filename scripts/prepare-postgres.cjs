const fs = require('node:fs');
const path = require('node:path');
const prisma = path.resolve(__dirname, '../backend/prisma');
const schema = fs.readFileSync(path.join(prisma, 'schema.prisma'), 'utf8');
fs.writeFileSync(path.join(prisma, 'schema.postgresql.prisma'), schema.replace('provider = "sqlite"', 'provider = "postgresql"'));
