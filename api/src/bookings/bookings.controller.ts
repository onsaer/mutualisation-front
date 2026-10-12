import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/auth.js';
import {
  bookingListQuerySchema,
  newBookingSchema,
  statusChangeSchema,
  type NewBookingInput,
} from '../common/schemas.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { User } from '../domain/index.js';
import { BookingsService } from './bookings.service.js';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  /** `GET /api/bookings?as=requester` (mes demandes) ou `?as=owner` (demandes reçues). */
  @Get()
  list(
    @Query(new ZodPipe(bookingListQuerySchema)) query: { as: 'requester' | 'owner' },
    @CurrentUser() user: User,
  ) {
    return this.service.list(user, query.as);
  }

  @Post()
  create(@Body(new ZodPipe(newBookingSchema)) body: NewBookingInput, @CurrentUser() user: User) {
    return this.service.create(body, user);
  }

  /** `PATCH /api/bookings/:id/status` avec `{ "status": "confirmee" }`. */
  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body(new ZodPipe(statusChangeSchema)) body: ReturnType<typeof statusChangeSchema.parse>,
    @CurrentUser() user: User,
  ) {
    return this.service.changeStatus(id, body.status, user, body.comment);
  }
}
