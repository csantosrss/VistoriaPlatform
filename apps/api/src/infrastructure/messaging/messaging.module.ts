import { Global, Module } from "@nestjs/common";
import { TypedConfigService } from "../../config/typed-config.service";
import { RmqPublisher } from "./rmq-publisher.service";
import { RmqSubscriber } from "./rmq-subscriber.service";

@Global()
@Module({
  providers: [TypedConfigService, RmqPublisher, RmqSubscriber],
  exports: [RmqPublisher, RmqSubscriber],
})
export class MessagingModule {}
