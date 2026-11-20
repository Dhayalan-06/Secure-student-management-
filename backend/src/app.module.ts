import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { User } from './users/user.entity';
import { Student } from './students/student.entity';
import { Department } from './departments/department.entity';
import { FeeTransaction } from './fees/fee-transaction.entity';
import { FeesModule } from './fees/fees.module';
import { ResultsModule } from './results/results.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath:'.env',
      
     }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5432)),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE', 'postgres'),
        entities: [User, Student, Department, FeeTransaction],
        synchronize: false,
      }),
    }),
    UsersModule,
    AuthModule,
    StudentsModule,
    FeesModule,
    ResultsModule,
  ],
})
export class AppModule {}
