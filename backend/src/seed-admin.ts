import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User, UserRole } from './users/user.entity';
import { Student } from './students/student.entity';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in .env');
  }
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'secure_student_db',
    entities: [User, Student],
    synchronize: true,
  });
  await ds.initialize();
  const repo = ds.getRepository(User);
  const existing = await repo.findOneBy({ email: email.toLowerCase() });
  if (existing) {
    console.log('Admin account already exists; no changes made.');
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await repo.save(repo.create({ email: email.toLowerCase(), passwordHash, role: UserRole.ADMIN }));
    console.log('Admin account created.');
  }
  await ds.destroy();
}
main().catch(err => { console.error(err); process.exit(1); });
