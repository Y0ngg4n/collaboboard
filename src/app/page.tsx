import Image from "next/image";
import Whiteboard from "./whiteboard";
import { Provider } from "@/components/ui/provider";

export default function Home() {
  return (
    <div className="">
      <Whiteboard />
    </div>
  );
}
