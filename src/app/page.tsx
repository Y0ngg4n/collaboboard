"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const newUuid = uuidv4();
    router.replace(`/whiteboard/${newUuid}`);
  }, [router]);

  return null; // or a loading spinner while redirecting
}
