const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { OrdersService } = require('./dist/orders/orders.service');

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ordersService = app.get(OrdersService);
  
  console.log("Setting target to 700000...");
  const setRes = await ordersService.setRevenueTarget(2026, 700000);
  console.log("Set Result:", setRes);
  
  console.log("Getting target...");
  const getRes = await ordersService.getRevenueTarget(2026);
  console.log("Get Result:", getRes);
  
  await app.close();
}

test().catch(console.error);
