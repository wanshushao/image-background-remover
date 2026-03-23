import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "图像背景去除工具",
  description: "一键去除图片背景，快速简单",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
