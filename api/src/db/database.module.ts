import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { DB, DB_HANDLE, type DatabaseHandle, openDatabase } from './database.js';

@Global()
@Module({
  providers: [
    { provide: DB_HANDLE, useFactory: () => openDatabase() },
    { provide: DB, inject: [DB_HANDLE], useFactory: (h: DatabaseHandle) => h.db },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DB_HANDLE) private readonly handle: DatabaseHandle) {}

  async onApplicationShutdown(): Promise<void> {
    await this.handle.close();
  }
}
