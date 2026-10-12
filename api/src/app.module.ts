import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DemoAuthGuard } from './auth/auth.js';
import { BookingsController } from './bookings/bookings.controller.js';
import { BookingsService } from './bookings/bookings.service.js';
import { DatabaseModule } from './db/database.module.js';
import { ResourcesController } from './resources/resources.controller.js';
import { ResourcesService } from './resources/resources.service.js';
import { MeController } from './users/me.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ResourcesController, BookingsController, MeController],
  providers: [ResourcesService, BookingsService, { provide: APP_GUARD, useClass: DemoAuthGuard }],
})
export class AppModule {}
