"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/utils/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (getAuthToken()) {
      router.replace("/boards");
      return;
    }
    router.replace("/login");
  }, [router]);

  return null;
}
