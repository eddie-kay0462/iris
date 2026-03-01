import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { ProductsModule } from '../products/products.module';

@Module({
    imports: [ProductsModule], // gives us ProductsService for resolving handles → full Product records
    controllers: [RecommendationsController],
    providers: [RecommendationsService],
})
export class RecommendationsModule { }
