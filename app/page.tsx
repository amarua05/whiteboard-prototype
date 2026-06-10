import type {NextConfig} from "next";
import {redirect} from "next/navigation";

export default function Home() {
  redirect("/home");
  return null;
}

