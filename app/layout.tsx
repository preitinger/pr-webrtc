import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const APP_NAME = "pr-webrtc";
const APP_DEFAULT_TITLE = "pr-webrtc";
const APP_TITLE_TEMPLATE = "%s - pr-webrtc";
const APP_DESCRIPTION = "Chat and video calls";

export const metadata: Metadata = {

    applicationName: APP_NAME,
    title: {
        default: APP_DEFAULT_TITLE,
        template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: APP_DEFAULT_TITLE,
        // startUpImage: [],
    },
    formatDetection: {
        telephone: false,
    },
    // openGraph: {
    //     type: "website",
    //     siteName: APP_NAME,
    //     title: {
    //         default: APP_DEFAULT_TITLE,
    //         template: APP_TITLE_TEMPLATE,
    //     },
    //     description: APP_DESCRIPTION,
    // },
    // twitter: {
    //     card: "summary",
    //     title: {
    //         default: APP_DEFAULT_TITLE,
    //         template: APP_TITLE_TEMPLATE,
    //     },
    //     description: APP_DESCRIPTION,
    // },
}

export const viewport: Viewport = {
    themeColor: "#FFFFFF",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <noscript>
                    <div className='noscript'>
                        <div className='dlg'>
                            <strong>Please activate Javascript in your browser to use this Web App.</strong>
                        </div>
                    </div>
                </noscript>
                {children}
            </body>
        </html>
    )
}
