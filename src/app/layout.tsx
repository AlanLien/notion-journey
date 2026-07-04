import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import PasswordProtection from "@/components/PasswordProtection";

import { getTripData } from "@/lib/notion";

const appIcons = {
    icon: "/favicon.svg",
};

export async function generateMetadata(): Promise<Metadata> {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('journey_auth')?.value === 'true';

    if (!isAuthenticated) {
        return {
            title: "旅程準備中...",
            description: "Protected Journey View",
            icons: appIcons,
        };
    }

    try {
        const { metadata } = await getTripData();
        return {
            title: metadata.city ? `${metadata.title} - ${metadata.city}` : metadata.title,
            description: "基於 Notion 的動態旅遊看板渲染器",
            appleWebApp: {
                capable: true,
                statusBarStyle: "black-translucent",
            },
            icons: appIcons,
        };
    } catch {
        return {
            title: "旅遊行程看板",
            description: "基於 Notion 的動態旅遊看板渲染器",
            icons: appIcons,
        };
    }
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: "#a31b24",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const isAuthenticated = cookieStore.get('journey_auth')?.value === 'true';

    return (
        <html lang="zh-TW">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="apple-touch-icon" href="/favicon.svg" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet" />
            </head>
            <body>
                {isAuthenticated ? (
                    <div className="app-container">
                        {children}
                    </div>
                ) : (
                    <PasswordProtection />
                )}
            </body>
        </html>
    );
}
