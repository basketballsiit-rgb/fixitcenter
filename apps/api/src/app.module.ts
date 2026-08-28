import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MissionsModule } from './missions/missions.module';
import { CentersModule } from './centers/centers.module';
import { CustomersModule } from './customers/customers.module';
import { RepairOrdersModule } from './repair-orders/repair-orders.module';
import { QueueModule } from './queue/queue.module';
import { WebSocketModule } from './websocket/websocket.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { CategoriesModule } from './categories/categories.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { VehicleLogsModule } from './vehicle-logs/vehicle-logs.module';

@Module({
  imports: [
    // Global config — reads from .env file
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Database
    PrismaModule,

    // Common utilities
    EncryptionModule,

    // Feature modules
    AuthModule,
    UsersModule,
    MissionsModule,
    CentersModule,
    CustomersModule,
    RepairOrdersModule,
    QueueModule,
    WebSocketModule,
    DashboardModule,
    NotificationsModule,
    CategoriesModule,
    KitchenModule,
    VehicleLogsModule,
  ],
})
export class AppModule {}
