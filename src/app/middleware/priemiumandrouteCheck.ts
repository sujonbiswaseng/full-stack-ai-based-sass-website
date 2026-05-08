import { prisma } from "../lib/prisma";
import { createLimiter } from "./rateLimitWithBlock";

export const isPremium = async (req: any): Promise<boolean> => {
    const user=req.user
    if(!user){
        return false
    }
    const existuser=await prisma.user.findUnique({
        where:{
            email:user.email
        }
    })
    if(existuser?.role!=='ADMIN' && existuser?.plan=='FREE'){
        return false
    }
    return true
  };

  export const aiLimiter = createLimiter({
    windowMs: 10 * 60 * 1000,
    freeLimit: 10,
    premiumLimit: 40,
    message: "AI limit exceeded",
    premiumCheck: isPremium
  });

export const publicandprivateLimiter = createLimiter({
    windowMs: 1 * 60 * 1000,
    freeLimit: 20,
    message: "Too many requests on public route",
    premiumCheck: isPremium
  });

export const authLimiter = createLimiter({
    windowMs: 1 * 60 * 1000,
    freeLimit: 10,
    message: "Too many auth attempts",
    premiumLimit:20,
    premiumCheck: isPremium
  });