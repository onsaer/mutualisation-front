import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, Public } from '../auth/auth.js';
import { newResourceSchema, resourceQuerySchema } from '../common/schemas.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { NewResourceInput } from '../common/schemas.js';
import type { User } from '../domain/index.js';
import { ResourcesService } from './resources.service.js';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  /** `GET /api/resources?type=materiel&audience=particulier&ownerRole=pro` */
  @Public()
  @Get()
  list(
    @Query(new ZodPipe(resourceQuerySchema))
    query: ReturnType<typeof resourceQuerySchema.parse>,
  ) {
    return this.service.list(query);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post()
  create(
    @Body(new ZodPipe(newResourceSchema)) body: NewResourceInput,
    @CurrentUser() user: User,
  ) {
    return this.service.create(body, user);
  }
}
