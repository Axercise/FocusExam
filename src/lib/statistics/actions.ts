"use server";
import { createClient } from "@/lib/supabase/server";
import { getStatisticsTracks } from "./data";
export async function loadStatisticsTracks(page:number,expectedOwnerId:string) {
  if(!Number.isSafeInteger(page)||page<0||page>40000) return null;
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user||user.id!==expectedOwnerId) return null;
  return getStatisticsTracks(user.id,page);
}

