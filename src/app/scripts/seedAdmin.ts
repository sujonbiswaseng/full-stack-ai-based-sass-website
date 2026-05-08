import "dotenv/config";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/pino";

export const seedAdmin = async () => {
  const existingUser=await prisma.user.findUnique({where:{
    email:"admin1@gmail.com"
  }})
  if (existingUser) {
    throw new Error("Admin user already exists.");
  }
  try {
   const result= await auth.api.signUpEmail({
    body: {
      name: "admin12",
      email: "admin1@gmail.com", 
      password: "Admin12!@",
      emailVerified:true,
      image: "https://images.pexels.com/users/avatars/2159489466/sujon-biswas-288.jpg?auto=compress&fit=crop&h=140&w=140&dpr=1",
      phone: "01804935939",
      role:"ADMIN",
    },
  });
  if(!result){
    logger.error("Failed to create admin user");
  }
  return {success:true,message:"user created successfully",data:result}

  } catch (error) {
    logger.error({ error }, "Seed admin script failed");
  }
};

seedAdmin();
