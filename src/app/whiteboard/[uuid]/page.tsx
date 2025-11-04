"use client";

import { use } from "react";
import Whiteboard from "@/components/whiteboard";

interface PageProps {
  params: Promise<{ uuid: string }>;
}

export default function WhiteboardPage({ params }: PageProps) {
  const { uuid } = use(params);
  return <Whiteboard uuid={uuid} />;
}
