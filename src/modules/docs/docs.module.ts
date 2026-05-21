// Libraries
import { Module } from '@nestjs/common';

// Modules
import { HttpModule } from '@nestjs/axios';

// Controllers
import { DocsController } from './controllers/docs.controller';

// Services
import { PostmanCollectionService } from '../../common/postman/postman-collection.service';

@Module({
  imports: [
    HttpModule, // For HttpService to fetch OpenAPI spec
  ],
  controllers: [DocsController],
  providers: [PostmanCollectionService],
  exports: [PostmanCollectionService],
})
export class DocsModule {}
