import { Module } from '@nestjs/common';
import { MongoProvider } from './mongo.provider';

@Module({
  providers: [MongoProvider],
  exports: [MongoProvider],
})
export class MongoModule {}
