import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Crónicas de Eldmoor",
  description: "RPG pixel art 8-bit donde los NPC toman decisiones con Jev o Laya.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={pixelFont.variable}>
      <body>{children}</body>
    </html>
  );
}
