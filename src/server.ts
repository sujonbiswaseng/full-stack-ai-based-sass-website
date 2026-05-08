import { Server } from "http";
import app from "./app"
import { envVars } from "./app/config/env";
import { redisService } from "./app/lib/redis";
import { logger } from "./app/lib/pino";
let server:Server
const port = 5000
const bootstrap = async() => {
    try {
       await redisService.connect().catch((error) => logger.error({ error }, "Failed to connect Redis"))
        server = app.listen(envVars.PORT, () => {
          logger.info("Server started on port 5000");
          logger.info(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        logger.error({ error }, "Failed to start server");
    }   
}

process.on("uncaughtException",(error)=>{
  logger.fatal({ error }, "Uncaught exception detected, shutting down server");
  if(server){
    server.close(()=>{
      process.exit(1)
    })
  }
    process.exit(1)
})

process.on("unhandledRejection",(error)=>{
  logger.error({ error }, "Unhandled rejection detected, shutting down server");
  if(server){
    server.close(()=>{
      process.exit(1)
    })
  }
})


process.on("SIGTERM",(error)=>{
  logger.warn({ error }, "SIGTERM detected, shutting down server");
  if(server){
    server.close(()=>{
      process.exit(1)
    })
  }
  process.exit(1)
})
bootstrap()