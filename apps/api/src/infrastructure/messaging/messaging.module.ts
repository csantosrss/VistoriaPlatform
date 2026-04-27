import { Global, Module } from "@nestjs/common";
import { TypedConfigService } from "../../config/typed-config.service";
import { RmqPublisher } from "./rmq-publisher.service";

@Global()
@Module({
  providers: [TypedConfigService, RmqPublisher],
  exports: [RmqPublisher],
})
export class MessagingModule {}
