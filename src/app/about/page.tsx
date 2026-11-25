import type { Metadata } from "next";
import { AboutView } from "./about-view";

export const metadata: Metadata = {
  title: "关于我",
};

export default function AboutPage() {
  return <AboutView />;
}
